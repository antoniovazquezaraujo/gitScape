package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/go-github/v92/github"
	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/singleflight"
)

// stateResponse es la respuesta agregada que consume el frontend:
// todos los commits de la rama, todos los PRs y el mapeo commit -> PR.
type stateResponse struct {
	Owner               string                     `json:"owner"`
	Repo                string                     `json:"repo"`
	Branch              string                     `json:"branch"`
	Commits             []*github.RepositoryCommit `json:"commits"`
	PullRequests        []*github.PullRequest      `json:"pullRequests"`
	CommitToPullRequest map[string]int             `json:"commitToPullRequest"`
}

type handlers struct {
	gh       githubAPI
	cache    *cache
	sf       singleflight.Group
	stateTTL time.Duration
	logger   *slog.Logger
}

func newHandlers(gh githubAPI, stateTTL time.Duration, logger *slog.Logger) *handlers {
	return &handlers{
		gh:       gh,
		cache:    newCache(),
		stateTTL: stateTTL,
		logger:   logger,
	}
}

func (h *handlers) routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", h.handleHealth)
	mux.HandleFunc("GET /api/repos/{owner}/{repo}/state", h.handleState)
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

// fetchState obtiene commits y PRs en paralelo y construye el mapeo commit -> PR.
func (h *handlers) fetchState(ctx context.Context, owner, repo, branch string) (*stateResponse, error) {
	var (
		commits []*github.RepositoryCommit
		prs     []*github.PullRequest
	)

	eg, gctx := errgroup.WithContext(ctx)
	eg.Go(func() error {
		var err error
		commits, err = h.gh.ListCommits(gctx, owner, repo, branch)
		return err
	})
	eg.Go(func() error {
		var err error
		prs, err = h.gh.ListPullRequests(gctx, owner, repo)
		return err
	})
	if err := eg.Wait(); err != nil {
		return nil, err
	}

	// Ojo: el contexto derivado de errgroup queda cancelado tras Wait,
	// así que la fase de PRs usa el contexto original.
	prCommits, err := h.gh.PullRequestCommits(ctx, owner, repo, prs)
	if err != nil {
		h.logger.Warn("mapeo de PRs incompleto", "owner", owner, "repo", repo, "err", err)
	}
	mapping := make(map[string]int, len(prs))
	for number, shas := range prCommits {
		for _, sha := range shas {
			mapping[sha] = number
		}
	}

	return &stateResponse{
		Owner:               owner,
		Repo:                repo,
		Branch:              branch,
		Commits:             commits,
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
		tree, err := h.gh.GetTree(r.Context(), owner, repo, sha)
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
		files, err := h.gh.GetCommitFiles(r.Context(), owner, repo, sha)
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
