package main

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/google/go-github/v92/github"
	"golang.org/x/sync/errgroup"
)

// githubAPI es la superficie del cliente de GitHub que consumen los handlers.
// Permite sustituirlo por un doble en los tests.
type githubAPI interface {
	ListCommits(ctx context.Context, owner, repo, branch string) ([]*github.RepositoryCommit, error)
	ListPullRequests(ctx context.Context, owner, repo string) ([]*github.PullRequest, error)
	PullRequestCommits(ctx context.Context, owner, repo string, prs []*github.PullRequest) (map[int][]string, error)
	GetTree(ctx context.Context, owner, repo, sha string) (*github.Tree, error)
	GetCommitFiles(ctx context.Context, owner, repo, sha string) ([]*github.CommitFile, error)
}

type githubClient struct {
	api    *github.Client
	logger *slog.Logger
}

func newGitHubClient(token string, logger *slog.Logger) (*githubClient, error) {
	var (
		client *github.Client
		err    error
	)
	if token != "" {
		client, err = github.NewClient(github.WithAuthToken(token))
	} else {
		client, err = github.NewClient()
	}
	if err != nil {
		return nil, fmt.Errorf("creando cliente de GitHub: %w", err)
	}
	return &githubClient{api: client, logger: logger}, nil
}

// ListCommits devuelve todos los commits de una rama en orden cronológico
// (del más antiguo al más nuevo), que es el orden que espera la vista.
func (g *githubClient) ListCommits(ctx context.Context, owner, repo, branch string) ([]*github.RepositoryCommit, error) {
	var all []*github.RepositoryCommit
	opts := &github.CommitsListOptions{
		SHA:         branch,
		ListOptions: github.ListOptions{PerPage: 100},
	}
	for {
		commits, resp, err := g.api.Repositories.ListCommits(ctx, owner, repo, opts)
		if err != nil {
			return nil, fmt.Errorf("listando commits: %w", err)
		}
		all = append(all, commits...)
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	// GitHub devuelve del más nuevo al más antiguo; invertimos la lista.
	for i, j := 0, len(all)-1; i < j; i, j = i+1, j-1 {
		all[i], all[j] = all[j], all[i]
	}
	return all, nil
}

// ListPullRequests devuelve todos los pull requests del repositorio (cualquier estado).
func (g *githubClient) ListPullRequests(ctx context.Context, owner, repo string) ([]*github.PullRequest, error) {
	var all []*github.PullRequest
	opts := &github.PullRequestListOptions{
		State:       "all",
		ListOptions: github.ListOptions{PerPage: 100},
	}
	for {
		prs, resp, err := g.api.PullRequests.List(ctx, owner, repo, opts)
		if err != nil {
			return nil, fmt.Errorf("listando pull requests: %w", err)
		}
		all = append(all, prs...)
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	return all, nil
}

// PullRequestCommits devuelve, para cada PR, los SHAs de sus commits.
// Las consultas se hacen en paralelo (máximo 8 simultáneas). Los errores
// parciales se registran y no abortan el resultado (mapeo best-effort).
func (g *githubClient) PullRequestCommits(ctx context.Context, owner, repo string, prs []*github.PullRequest) (map[int][]string, error) {
	shas := make(map[int][]string, len(prs))
	var mu sync.Mutex

	eg, ctx := errgroup.WithContext(ctx)
	eg.SetLimit(8)
	for _, pr := range prs {
		pr := pr
		eg.Go(func() error {
			commits, err := g.listPRCommits(ctx, owner, repo, pr.GetNumber())
			if err != nil {
				g.logger.Warn("no se pudieron obtener los commits del PR", "pr", pr.GetNumber(), "err", err)
				return nil
			}
			mu.Lock()
			shas[pr.GetNumber()] = commits
			mu.Unlock()
			return nil
		})
	}
	_ = eg.Wait()
	return shas, nil
}

func (g *githubClient) listPRCommits(ctx context.Context, owner, repo string, number int) ([]string, error) {
	var shas []string
	opts := &github.ListOptions{PerPage: 100}
	for {
		commits, resp, err := g.api.PullRequests.ListCommits(ctx, owner, repo, number, opts)
		if err != nil {
			return nil, err
		}
		for _, commit := range commits {
			shas = append(shas, commit.GetSHA())
		}
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}
	return shas, nil
}

// GetTree devuelve el árbol recursivo de un commit.
func (g *githubClient) GetTree(ctx context.Context, owner, repo, sha string) (*github.Tree, error) {
	tree, _, err := g.api.Git.GetTree(ctx, owner, repo, sha, true)
	if err != nil {
		return nil, fmt.Errorf("obteniendo árbol %s: %w", sha, err)
	}
	return tree, nil
}

// GetCommitFiles devuelve los ficheros afectados por un commit.
func (g *githubClient) GetCommitFiles(ctx context.Context, owner, repo, sha string) ([]*github.CommitFile, error) {
	commit, _, err := g.api.Repositories.GetCommit(ctx, owner, repo, sha, nil)
	if err != nil {
		return nil, fmt.Errorf("obteniendo commit %s: %w", sha, err)
	}
	return commit.Files, nil
}
