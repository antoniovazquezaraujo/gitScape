package main

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/go-github/v92/github"
)

// localSource implementa dataSource leyendo de un clon local mediante git.
// Devuelve los mismos tipos que go-github para que la API JSON no cambie.
type localSource struct {
	repoPath string
	logger   *slog.Logger
}

func newLocalSource(repoPath string, logger *slog.Logger) (*localSource, error) {
	if _, err := gitOutput(context.Background(), repoPath, "rev-parse", "--git-dir"); err != nil {
		return nil, fmt.Errorf("%s no parece un repositorio git: %w", repoPath, err)
	}
	return &localSource{repoPath: repoPath, logger: logger}, nil
}

// gitOutput ejecuta git -C <dir> <args...> y devuelve su stdout.
func gitOutput(ctx context.Context, dir string, args ...string) ([]byte, error) {
	cmd := exec.CommandContext(ctx, "git", append([]string{"-C", dir}, args...)...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("git %s: %w: %s", strings.Join(args, " "), err, strings.TrimSpace(stderr.String()))
	}
	return stdout.Bytes(), nil
}

// Registro por commit con separadores que no pueden aparecer en los datos:
// campos con NUL y commits con RS (0x1e).
const commitLogFormat = "%H%x00%aI%x00%aN%x00%aE%x00%B%x1e"

// ListCommits devuelve los commits en orden cronológico (igual que githubClient).
func (s *localSource) ListCommits(ctx context.Context, _, _, branch string) ([]*github.RepositoryCommit, error) {
	rev := branch
	if rev == "" {
		rev = "HEAD"
	}
	out, err := gitOutput(ctx, s.repoPath, "log", "--reverse", "--format="+commitLogFormat, rev)
	if err != nil {
		return nil, err
	}

	records := strings.Split(string(out), "\x1e")
	commits := make([]*github.RepositoryCommit, 0, len(records))
	for _, record := range records {
		record = strings.Trim(record, "\n")
		if record == "" {
			continue
		}
		fields := strings.SplitN(record, "\x00", 5)
		if len(fields) != 5 {
			continue
		}
		when, err := time.Parse(time.RFC3339, strings.TrimSpace(fields[1]))
		if err != nil {
			s.logger.Warn("fecha de commit no parseable", "sha", fields[0], "fecha", fields[1], "err", err)
		}
		sha, message, name, email := fields[0], strings.TrimRight(fields[4], "\n"), fields[2], fields[3]
		commits = append(commits, &github.RepositoryCommit{
			SHA: &sha,
			Commit: &github.Commit{
				Message: &message,
				Author: &github.CommitAuthor{
					Name:  &name,
					Email: &email,
					Date:  &github.Timestamp{Time: when},
				},
			},
		})
	}
	return commits, nil
}

// GetTree devuelve el árbol recursivo de blobs de un commit (formato GitHub).
// El frontend solo necesita las entradas de tipo blob; las carpetas las deduce
// de las rutas.
func (s *localSource) GetTree(ctx context.Context, _, _, sha string) (*github.Tree, error) {
	out, err := gitOutput(ctx, s.repoPath, "ls-tree", "-r", "-l", "-z", sha)
	if err != nil {
		return nil, err
	}

	tree := &github.Tree{SHA: &sha}
	for _, entry := range strings.Split(string(out), "\x00") {
		if entry == "" {
			continue
		}
		// Formato: "<mode> <type> <sha> <size>\t<path>"
		meta, path, found := strings.Cut(entry, "\t")
		if !found {
			continue
		}
		parts := strings.Fields(meta)
		if len(parts) != 4 {
			continue
		}
		size, _ := strconv.Atoi(parts[3])
		mode, typ, entrySHA := parts[0], parts[1], parts[2]
		tree.Entries = append(tree.Entries, &github.TreeEntry{
			Path: &path,
			Mode: &mode,
			Type: &typ,
			SHA:  &entrySHA,
			Size: &size,
		})
	}
	return tree, nil
}

// GetCommitFiles devuelve los ficheros afectados por un commit, replicando el
// comportamiento de la API de GitHub: contra el primer padre (también en merges).
func (s *localSource) GetCommitFiles(ctx context.Context, _, _, sha string) ([]*github.CommitFile, error) {
	parents, err := s.commitParents(ctx, sha)
	if err != nil {
		return nil, err
	}

	argsFor := func(flag string) []string {
		if len(parents) == 0 {
			// Commit raíz: mostramos su contenido como añadidos.
			return []string{"diff-tree", "--no-commit-id", "--root", "-r", flag, sha}
		}
		return []string{"diff-tree", "--no-commit-id", "-r", flag, parents[0], sha}
	}

	nameStatus, err := gitOutput(ctx, s.repoPath, argsFor("--name-status")...)
	if err != nil {
		return nil, err
	}
	numstat, err := gitOutput(ctx, s.repoPath, argsFor("--numstat")...)
	if err != nil {
		return nil, err
	}

	stats := make(map[string][2]int)
	for _, line := range strings.Split(string(numstat), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) != 3 {
			continue
		}
		add, _ := strconv.Atoi(parts[0]) // los binarios muestran "-"
		del, _ := strconv.Atoi(parts[1])
		stats[parts[2]] = [2]int{add, del}
	}

	files := make([]*github.CommitFile, 0)
	for _, line := range strings.Split(string(nameStatus), "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "\t", 3)
		if len(parts) < 2 {
			continue
		}
		file := &github.CommitFile{Status: github.Ptr(statusName(parts[0]))}
		filename := parts[1]
		if len(parts) == 3 {
			file.PreviousFilename = &filename
			filename = parts[2]
		}
		stat := stats[filename]
		changes := stat[0] + stat[1]
		file.Filename = &filename
		file.Additions = &stat[0]
		file.Deletions = &stat[1]
		file.Changes = &changes
		files = append(files, file)
	}
	return files, nil
}

func (s *localSource) commitParents(ctx context.Context, sha string) ([]string, error) {
	out, err := gitOutput(ctx, s.repoPath, "rev-list", "--parents", "-n", "1", sha)
	if err != nil {
		return nil, err
	}
	fields := strings.Fields(string(out))
	if len(fields) <= 1 {
		return nil, nil // commit raíz
	}
	return fields[1:], nil
}

func statusName(code string) string {
	if code == "" {
		return "modified"
	}
	switch code[0] {
	case 'A':
		return "added"
	case 'D':
		return "removed"
	case 'R':
		return "renamed"
	case 'C':
		return "copied"
	default: // M, T, U...
		return "modified"
	}
}

// Sin GitHub configurado no hay PRs: esa información solo existe en la API.
func (s *localSource) ListPullRequests(_ context.Context, _, _ string) ([]*github.PullRequest, error) {
	return nil, nil
}

func (s *localSource) PullRequestCommits(_ context.Context, _, _ string, _ []*github.PullRequest) (map[int][]string, error) {
	return map[int][]string{}, nil
}

// localWithPRs combina el clon local (commits, árboles y ficheros) con GitHub,
// que solo se usa para los pull requests.
type localWithPRs struct {
	*localSource
	gh    *githubClient
	owner string
	repo  string
}

func (s *localWithPRs) ListPullRequests(ctx context.Context, _, _ string) ([]*github.PullRequest, error) {
	return s.gh.ListPullRequests(ctx, s.owner, s.repo)
}

func (s *localWithPRs) PullRequestCommits(ctx context.Context, _, _ string, prs []*github.PullRequest) (map[int][]string, error) {
	return s.gh.PullRequestCommits(ctx, s.owner, s.repo, prs)
}

// buildDataSource decide la fuente según los flags: GitHub (por defecto) o un
// clon local, que además usa GitHub para PRs si hay token y remoto reconocible.
func buildDataSource(repoPath, token string, logger *slog.Logger) (dataSource, error) {
	if repoPath == "" {
		if token == "" {
			logger.Warn("GITHUB_TOKEN no definido: se usará la API de GitHub sin autenticar (límite 60 peticiones/hora)")
		}
		return newGitHubClient(token, logger)
	}

	local, err := newLocalSource(repoPath, logger)
	if err != nil {
		return nil, err
	}
	logger.Info("modo local: commits, árboles y ficheros se leen del clon", "repo", repoPath)

	if token == "" {
		logger.Info("sin GITHUB_TOKEN: los pull requests no estarán disponibles en modo local")
		return local, nil
	}
	remote, err := gitOutput(context.Background(), repoPath, "remote", "get-url", "origin")
	if err != nil {
		logger.Info("el clon no tiene remoto 'origin': los pull requests no estarán disponibles")
		return local, nil
	}
	owner, repo, ok := parseRemoteURL(string(remote))
	if !ok {
		logger.Info("el remoto no es de GitHub: los pull requests no estarán disponibles", "remote", strings.TrimSpace(string(remote)))
		return local, nil
	}
	gh, err := newGitHubClient(token, logger)
	if err != nil {
		return nil, err
	}
	logger.Info("pull requests vía API de GitHub", "owner", owner, "repo", repo)
	return &localWithPRs{localSource: local, gh: gh, owner: owner, repo: repo}, nil
}

var githubRemoteRe = regexp.MustCompile(`(?:https?://github\.com/|git@github\.com:)([^/]+)/([^/]+?)(?:\.git)?/?$`)

// parseRemoteURL extrae owner y repo de una URL remota de GitHub.
func parseRemoteURL(raw string) (owner, repo string, ok bool) {
	m := githubRemoteRe.FindStringSubmatch(strings.TrimSpace(raw))
	if m == nil {
		return "", "", false
	}
	return m[1], m[2], true
}
