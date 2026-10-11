package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/go-github/v92/github"
	"golang.org/x/sync/singleflight"
)

// stateResponse devuelve los commits de la rama (rápido: en modo local sale del
// disco). Los PRs van aparte en pullsResponse para no bloquear el primer pintado.
type stateResponse struct {
	Owner   string                     `json:"owner"`
	Repo    string                     `json:"repo"`
	Branch  string                     `json:"branch"`
	Commits []*github.RepositoryCommit `json:"commits"`
}

// pullsResponse es la respuesta de los pull requests y su mapeo commit -> PR.
type pullsResponse struct {
	Owner               string                `json:"owner"`
	Repo                string                `json:"repo"`
	PullRequests        []*github.PullRequest `json:"pullRequests"`
	CommitToPullRequest map[string]int        `json:"commitToPullRequest"`
}

type handlers struct {
	source   dataSource
	cache    *cache
	sf       singleflight.Group
	stateTTL time.Duration
	logger   *slog.Logger
}

func newHandlers(source dataSource, stateTTL time.Duration, logger *slog.Logger) *handlers {
	return &handlers{
		source:   source,
		cache:    newCache(),
		stateTTL: stateTTL,
		logger:   logger,
	}
}

func (h *handlers) routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", h.handleHealth)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/state", h.handleState)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/pulls", h.handlePulls)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/tree/{sha}", h.handleTree)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/commits/{sha}/files", h.handleCommitFiles)
}

func (h *handlers) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *handlers) handleState(w http.ResponseWriter, r *http.Request) {
	owner := r.PathValue("owner")
	repo := r.PathValue("repo")
	branch := r.URL.Query().Get("branch")
	key := "state:" + owner + "/" + repo + ":" + branch

	if v, ok := h.cache.Get(key); ok {
		writeJSON(w, http.StatusOK, v)
		return
	}

	v, err, _ := h.sf.Do(key, func() (any, error) {
		// Doble comprobación: otra petición pudo rellenar la caché mientras esperábamos.
		if v, ok := h.cache.Get(key); ok {
			return v, nil
		}
		state, err := h.fetchState(r.Context(), owner, repo, branch)
		if err != nil {
			return nil, err
		}
		h.cache.Set(key, state, h.stateTTL)
		return state, nil
	})
	if err != nil {
		h.logger.Error("cargando estado", "owner", owner, "repo", repo, "err", err)
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, v)
}

// fetchState obtiene los commits de la rama. Los PRs NO se tocan aquí: van por
// /pulls para que el modo local responda al instante.
func (h *handlers) fetchState(ctx context.Context, owner, repo, branch string) (*stateResponse, error) {
	commits, err := h.source.ListCommits(ctx, owner, repo, branch)
	if err != nil {
		return nil, err
	}
	return &stateResponse{
		Owner:   owner,
		Repo:    repo,
		Branch:  branch,
		Commits: commits,
	}, nil
}

func (h *handlers) handlePulls(w http.ResponseWriter, r *http.Request) {
	owner := r.PathValue("owner")
	repo := r.PathValue("repo")
	key := "pulls:" + owner + "/" + repo

	if v, ok := h.cache.Get(key); ok {
		writeJSON(w, http.StatusOK, v)
		return
	}

	v, err, _ := h.sf.Do(key, func() (any, error) {
		// Doble comprobación: otra petición pudo rellenar la caché mientras esperábamos.
		if v, ok := h.cache.Get(key); ok {
			return v, nil
		}
		pulls, err := h.fetchPulls(r.Context(), owner, repo)
		if err != nil {
			return nil, err
		}
		h.cache.Set(key, pulls, h.stateTTL)
		return pulls, nil
	})
	if err != nil {
		h.logger.Error("cargando pull requests", "owner", owner, "repo", repo, "err", err)
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, v)
}

// fetchPulls obtiene todos los PRs y construye el mapeo commit -> PR.
func (h *handlers) fetchPulls(ctx context.Context, owner, repo string) (*pullsResponse, error) {
	prs, err := h.source.ListPullRequests(ctx, owner, repo)
	if err != nil {
		return nil, err
	}
	prCommits, err := h.source.PullRequestCommits(ctx, owner, repo, prs)
	if err != nil {
		h.logger.Warn("mapeo de PRs incompleto", "owner", owner, "repo", repo, "err", err)
	}
	mapping := make(map[string]int, len(prs))
	for number, shas := range prCommits {
		for _, sha := range shas {
			mapping[sha] = number
		}
	}
	return &pullsResponse{
		Owner:               owner,
		Repo:                repo,
		PullRequests:        prs,
		CommitToPullRequest: mapping,
	}, nil
}

func (h *handlers) handleTree(w http.ResponseWriter, r *http.Request) {
	owner := r.PathValue("owner")
	repo := r.PathValue("repo")
	sha := r.PathValue("sha")
	key := "tree:" + owner + "/" + repo + ":" + sha

	if v, ok := h.cache.Get(key); ok {
		writeJSON(w, http.StatusOK, v)
		return
	}
	v, err, _ := h.sf.Do(key, func() (any, error) {
		if v, ok := h.cache.Get(key); ok {
			return v, nil
		}
		tree, err := h.source.GetTree(r.Context(), owner, repo, sha)
		if err != nil {
			return nil, err
		}
		// Un árbol por SHA es inmutable: caché sin caducidad.
		h.cache.Set(key, tree, 0)
		return tree, nil
	})
	if err != nil {
		h.logger.Error("cargando árbol", "owner", owner, "repo", repo, "sha", sha, "err", err)
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (h *handlers) handleCommitFiles(w http.ResponseWriter, r *http.Request) {
	owner := r.PathValue("owner")
	repo := r.PathValue("repo")
	sha := r.PathValue("sha")
	key := "files:" + owner + "/" + repo + ":" + sha

	if v, ok := h.cache.Get(key); ok {
		writeJSON(w, http.StatusOK, v)
		return
	}
	v, err, _ := h.sf.Do(key, func() (any, error) {
		if v, ok := h.cache.Get(key); ok {
			return v, nil
		}
		files, err := h.source.GetCommitFiles(r.Context(), owner, repo, sha)
		if err != nil {
			return nil, err
		}
		// Los ficheros de un commit también son inmutables.
		h.cache.Set(key, files, 0)
		return files, nil
	})
	if err != nil {
		h.logger.Error("cargando ficheros", "owner", owner, "repo", repo, "sha", sha, "err", err)
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil && !errors.Is(err, http.ErrHandlerTimeout) {
		slog.Error("escribiendo respuesta JSON", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
