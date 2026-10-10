package main

import (
	"context"

	"github.com/google/go-github/v92/github"
)

// dataSource es la fuente de datos del backend. Tiene dos implementaciones:
//   - githubClient: API de GitHub (o cualquier otra instancia compatible).
//   - localSource:  un clon local leído con git (opcionalmente + GitHub para PRs).
//
// Los handlers solo conocen esta interfaz.
type dataSource interface {
	ListCommits(ctx context.Context, owner, repo, branch string) ([]*github.RepositoryCommit, error)
	ListPullRequests(ctx context.Context, owner, repo string) ([]*github.PullRequest, error)
	PullRequestCommits(ctx context.Context, owner, repo string, prs []*github.PullRequest) (map[int][]string, error)
	GetTree(ctx context.Context, owner, repo, sha string) (*github.Tree, error)
	GetCommitFiles(ctx context.Context, owner, repo, sha string) ([]*github.CommitFile, error)
}
