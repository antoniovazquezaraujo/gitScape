package main

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/google/go-github/v92/github"
)

type fakeGitHub struct {
	mu           sync.Mutex
	commitsCalls int
	prsCalls     int
	prCommCalls  int
	treeCalls    int
	filesCalls   int
}

func (f *fakeGitHub) ListCommits(_ context.Context, _, _, _ string) ([]*github.RepositoryCommit, error) {
	f.mu.Lock()
	f.commitsCalls++
	f.mu.Unlock()
	date := github.Timestamp{Time: time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)}
	return []*github.RepositoryCommit{
		{
			SHA: github.Ptr("aaa111"),
			Commit: &github.Commit{
				Message: github.Ptr("primer commit"),
				Author:  &github.CommitAuthor{Date: &date, Email: github.Ptr("dev@example.com")},
			},
		},
		{
			SHA:    github.Ptr("bbb222"),
			Commit: &github.Commit{Message: github.Ptr("segundo commit")},
		},
	}, nil
}

func (f *fakeGitHub) ListPullRequests(_ context.Context, _, _ string) ([]*github.PullRequest, error) {
	f.mu.Lock()
	f.prsCalls++
	f.mu.Unlock()
	return []*github.PullRequest{{Number: github.Ptr(7), Title: github.Ptr("un PR")}}, nil
}

func (f *fakeGitHub) PullRequestCommits(_ context.Context, _, _ string, prs []*github.PullRequest) (map[int][]string, error) {
	f.mu.Lock()
	f.prCommCalls++
	f.mu.Unlock()
	result := make(map[int][]string, len(prs))
	for _, pr := range prs {
		result[pr.GetNumber()] = []string{"bbb222"}
	}
	return result, nil
}

func (f *fakeGitHub) GetTree(_ context.Context, _, _, sha string) (*github.Tree, error) {
	f.mu.Lock()
	f.treeCalls++
	f.mu.Unlock()
	return &github.Tree{
		SHA: github.Ptr(sha),
		Entries: []*github.TreeEntry{
			{Path: github.Ptr("README.md"), Type: github.Ptr("blob")},
			{Path: github.Ptr("src"), Type: github.Ptr("tree")},
		},
	}, nil
}

func (f *fakeGitHub) GetCommitFiles(_ context.Context, _, _, _ string) ([]*github.CommitFile, error) {
	f.mu.Lock()
	f.filesCalls++
	f.mu.Unlock()
	return []*github.CommitFile{
		{
			Filename:  github.Ptr("README.md"),
			Status:    github.Ptr("modified"),
			Additions: github.Ptr(1),
			Deletions: github.Ptr(0),
			Changes:   github.Ptr(1),
		},
	}, nil
}

func newTestServer(f dataSource) *httptest.Server {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := newHandlers(f, time.Minute, logger)
	mux := http.NewServeMux()
	h.routes(mux)
	return httptest.NewServer(mux)
}

func getJSON(t *testing.T, url string, v any) {
	t.Helper()
	res, err := http.Get(url)
	if err != nil {
		t.Fatalf("GET %s: %v", url, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("GET %s: status %d", url, res.StatusCode)
	}
	if err := json.NewDecoder(res.Body).Decode(v); err != nil {
		t.Fatalf("decodificando %s: %v", url, err)
	}
}

func TestHealth(t *testing.T) {
	f := &fakeGitHub{}
	srv := newTestServer(f)
	defer srv.Close()

	var body map[string]string
	getJSON(t, srv.URL+"/api/health", &body)
	if body["status"] != "ok" {
		t.Fatalf("status inesperado: %v", body)
	}
}

func TestStateAndCache(t *testing.T) {
	f := &fakeGitHub{}
	srv := newTestServer(f)
	defer srv.Close()

	url := srv.URL + "/api/repos/owner/repo/state?branch=main"

	var state stateResponse
	getJSON(t, url, &state)
	if len(state.Commits) != 2 {
		t.Fatalf("se esperaban 2 commits, hay %d", len(state.Commits))
	}
	if len(state.PullRequests) != 1 {
		t.Fatalf("se esperaba 1 PR, hay %d", len(state.PullRequests))
	}
	if got := state.CommitToPullRequest["bbb222"]; got != 7 {
		t.Fatalf("mapeo del commit bbb222 = %d, se esperaba 7", got)
	}
	if state.Branch != "main" {
		t.Fatalf("branch = %q, se esperaba main", state.Branch)
	}

	// Segunda llamada: debe servirse de caché sin volver a consultar GitHub.
	getJSON(t, url, &state)
	if f.commitsCalls != 1 {
		t.Fatalf("ListCommits llamado %d veces, se esperaba 1 (caché)", f.commitsCalls)
	}
	if f.prsCalls != 1 {
		t.Fatalf("ListPullRequests llamado %d veces, se esperaba 1 (caché)", f.prsCalls)
	}
	if f.prCommCalls != 1 {
		t.Fatalf("PullRequestCommits llamado %d veces, se esperaba 1 (caché)", f.prCommCalls)
	}
}

func TestTreeImmutableCache(t *testing.T) {
	f := &fakeGitHub{}
	srv := newTestServer(f)
	defer srv.Close()

	url := srv.URL + "/api/repos/owner/repo/tree/abc123"

	var tree github.Tree
	getJSON(t, url, &tree)
	if len(tree.Entries) != 2 {
		t.Fatalf("se esperaban 2 entradas, hay %d", len(tree.Entries))
	}
	if tree.Entries[0].GetPath() != "README.md" || tree.Entries[0].GetType() != "blob" {
		t.Fatalf("entrada inesperada: %+v", tree.Entries[0])
	}

	getJSON(t, url, &tree)
	if f.treeCalls != 1 {
		t.Fatalf("GetTree llamado %d veces, se esperaba 1 (caché inmutable)", f.treeCalls)
	}
}

func TestCommitFiles(t *testing.T) {
	f := &fakeGitHub{}
	srv := newTestServer(f)
	defer srv.Close()

	url := srv.URL + "/api/repos/owner/repo/commits/abc123/files"

	var files []github.CommitFile
	getJSON(t, url, &files)
	if len(files) != 1 || files[0].GetFilename() != "README.md" {
		t.Fatalf("ficheros inesperados: %+v", files)
	}
	if files[0].GetStatus() != "modified" || files[0].GetAdditions() != 1 {
		t.Fatalf("metadatos del fichero inesperados: %+v", files[0])
	}
}
