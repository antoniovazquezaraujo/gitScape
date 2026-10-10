package main

import (
	"context"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"testing"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	// Identidad y configuración aisladas del entorno del usuario.
	cmd.Env = append(os.Environ(),
		"GIT_AUTHOR_NAME=Test", "GIT_AUTHOR_EMAIL=test@example.com",
		"GIT_COMMITTER_NAME=Test", "GIT_COMMITTER_EMAIL=test@example.com",
		"GIT_CONFIG_GLOBAL=/dev/null", "GIT_CONFIG_SYSTEM=/dev/null",
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v\n%s", args, err, out)
	}
}

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

// initTestRepo crea un repo con tres commits:
//  1. añade README.md
//  2. añade src/main.go y modifica README.md
//  3. elimina src/main.go
func initTestRepo(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	runGit(t, dir, "init", "-b", "main")
	writeFile(t, dir, "README.md", "hola\n")
	runGit(t, dir, "add", ".")
	runGit(t, dir, "commit", "-m", "primer commit")
	writeFile(t, dir, "README.md", "hola mundo\n")
	writeFile(t, dir, "src/main.go", "package main\n")
	runGit(t, dir, "add", ".")
	runGit(t, dir, "commit", "-m", "añade src/main.go")
	runGit(t, dir, "rm", "src/main.go")
	runGit(t, dir, "commit", "-m", "elimina src/main.go")
	return dir
}

func TestLocalSourceListCommits(t *testing.T) {
	dir := initTestRepo(t)
	src, err := newLocalSource(dir, testLogger())
	if err != nil {
		t.Fatal(err)
	}

	commits, err := src.ListCommits(context.Background(), "", "", "main")
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 3 {
		t.Fatalf("commits = %d; quiero 3", len(commits))
	}
	// Orden cronológico: el primero es el más antiguo.
	if got := commits[0].GetCommit().GetMessage(); got != "primer commit" {
		t.Errorf("primer mensaje = %q", got)
	}
	if got := commits[2].GetCommit().GetMessage(); got != "elimina src/main.go" {
		t.Errorf("último mensaje = %q", got)
	}
	if got := commits[0].GetCommit().GetAuthor().GetEmail(); got != "test@example.com" {
		t.Errorf("email = %q", got)
	}
	if commits[0].GetCommit().GetAuthor().GetDate().IsZero() {
		t.Error("la fecha del commit no debería ser cero")
	}
	if commits[0].GetSHA() == "" {
		t.Error("el SHA no debería estar vacío")
	}
}

func TestLocalSourceGetTree(t *testing.T) {
	dir := initTestRepo(t)
	src, _ := newLocalSource(dir, testLogger())
	commits, _ := src.ListCommits(context.Background(), "", "", "main")

	// Árbol del segundo commit: README.md + src/main.go
	tree, err := src.GetTree(context.Background(), "", "", commits[1].GetSHA())
	if err != nil {
		t.Fatal(err)
	}
	paths := map[string]string{}
	for _, entry := range tree.Entries {
		paths[entry.GetPath()] = entry.GetType()
	}
	if paths["README.md"] != "blob" || paths["src/main.go"] != "blob" {
		t.Fatalf("entradas inesperadas: %v", paths)
	}
	if len(tree.Entries) != 2 {
		t.Fatalf("entradas = %d; quiero 2", len(tree.Entries))
	}
}

func TestLocalSourceGetCommitFiles(t *testing.T) {
	dir := initTestRepo(t)
	src, _ := newLocalSource(dir, testLogger())
	commits, _ := src.ListCommits(context.Background(), "", "", "main")

	// Segundo commit: README modificado (+1 -1) y src/main.go añadido (+1 -0).
	files, err := src.GetCommitFiles(context.Background(), "", "", commits[1].GetSHA())
	if err != nil {
		t.Fatal(err)
	}
	byName := map[string][4]string{}
	for _, f := range files {
		byName[f.GetFilename()] = [4]string{
			f.GetStatus(),
			strconv.Itoa(f.GetAdditions()),
			strconv.Itoa(f.GetDeletions()),
			strconv.Itoa(f.GetChanges()),
		}
	}
	if got := byName["src/main.go"]; got != [4]string{"added", "1", "0", "1"} {
		t.Errorf("src/main.go = %v", got)
	}
	if got := byName["README.md"]; got != [4]string{"modified", "1", "1", "2"} {
		t.Errorf("README.md = %v", got)
	}

	// Tercer commit: src/main.go eliminado.
	files3, err := src.GetCommitFiles(context.Background(), "", "", commits[2].GetSHA())
	if err != nil {
		t.Fatal(err)
	}
	if len(files3) != 1 || files3[0].GetFilename() != "src/main.go" || files3[0].GetStatus() != "removed" {
		t.Fatalf("ficheros del tercer commit inesperados: %+v", files3)
	}
}

func TestLocalSourceNotAGitRepo(t *testing.T) {
	dir := t.TempDir() // carpeta normal, sin .git
	if _, err := newLocalSource(dir, testLogger()); err == nil {
		t.Fatal("se esperaba un error con una carpeta que no es un repo git")
	}
}

func TestParseRemoteURL(t *testing.T) {
	casos := []struct {
		in    string
		owner string
		repo  string
		ok    bool
	}{
		{"https://github.com/antoniovazquezaraujo/gitScape.git", "antoniovazquezaraujo", "gitScape", true},
		{"https://github.com/antoniovazquezaraujo/gitScape", "antoniovazquezaraujo", "gitScape", true},
		{"git@github.com:antoniovazquezaraujo/LeTrain.git", "antoniovazquezaraujo", "LeTrain", true},
		{"https://gitlab.com/alguien/repo.git", "", "", false},
		{"", "", "", false},
	}
	for _, caso := range casos {
		owner, repo, ok := parseRemoteURL(caso.in)
		if ok != caso.ok || owner != caso.owner || repo != caso.repo {
			t.Errorf("parseRemoteURL(%q) = (%q, %q, %v); quiero (%q, %q, %v)",
				caso.in, owner, repo, ok, caso.owner, caso.repo, caso.ok)
		}
	}
}
