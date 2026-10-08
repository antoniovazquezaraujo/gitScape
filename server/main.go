package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	addr := flag.String("addr", ":8080", "dirección de escucha del servidor")
	cacheTTL := flag.Duration("cache-ttl", 5*time.Minute, "TTL de la caché para datos mutables (commits y PRs)")
	flag.Parse()

	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	token := os.Getenv("GITHUB_TOKEN")
	if token == "" {
		logger.Warn("GITHUB_TOKEN no definido: se usará la API de GitHub sin autenticar (límite 60 peticiones/hora)")
	}

	client, err := newGitHubClient(token, logger)
	if err != nil {
		logger.Error("creando cliente de GitHub", "err", err)
		os.Exit(1)
	}
	h := newHandlers(client, *cacheTTL, logger)

	mux := http.NewServeMux()
	h.routes(mux)

	srv := &http.Server{
		Addr:              *addr,
		Handler:           corsMiddleware(logRequests(logger, mux)),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("GitScape backend escuchando", "addr", *addr, "autenticado", token != "")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("error del servidor", "err", err)
			os.Exit(1)
		}
	}()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("apagando servidor", "err", err)
	}
	logger.Info("servidor detenido")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func logRequests(logger *slog.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"query", r.URL.RawQuery,
			"dur", time.Since(start).Round(time.Millisecond).String(),
		)
	})
}
