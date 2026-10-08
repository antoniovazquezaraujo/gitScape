# ADR 0006: Backend Go (proxy, caché y agregación)

- **Estado**: Aceptada
- **Fecha**: 2026-10-09
- **Relacionada con**: ADR 0002 (configuración por entorno), ADR 0004 (fuente de datos local), ADR 0005 (modelo de ramas)

## Contexto

La app hablaba directamente con la API de GitHub desde el navegador: cientos de peticiones secuenciales (una por PR y por commit), sin caché, con el token expuesto en el bundle y consumiendo la cuota del usuario en cada recarga. Medido con un repositorio de 506 commits y 75 PRs, la carga completa rondaba los 16-30 s.

## Decisión

Introducir un backend en Go (`server/`) que:

- Expone una API REST agregada, compatible con lo que espera el frontend:
  - `GET /api/health`
  - `GET /api/repos/{owner}/{repo}/state?branch=` → commits (orden cronológico) + PRs + mapeo commit → PR
  - `GET /api/repos/{owner}/{repo}/tree/{sha}`
  - `GET /api/repos/{owner}/{repo}/commits/{sha}/files`
- Consulta GitHub con `go-github`, paginando de 100 en 100.
- Paraleliza el mapeo de PRs con `errgroup` (máx. 8 peticiones simultáneas).
- Cachea en memoria: TTL configurable (`-cache-ttl`, 5 min por defecto) para datos mutables; sin caducidad para datos inmutables por SHA (árboles y ficheros de commits).
- Deduplica peticiones concurrentes con `singleflight`.
- Mantiene el token en el servidor (`GITHUB_TOKEN`), nunca en el navegador.

El frontend usa el backend cuando `VITE_API_URL` está definido (adaptador en `GitModel`); sin él mantiene el modo directo con Octokit. En desarrollo, el proxy de Vite redirige `/api` a `http://localhost:8080`.

## Consecuencias

- ✅ Carga en frío (moderanger): ~16 s → **~6 s**; en caliente: **~15 ms** (medido).
- ✅ Token fuera del bundle y una única cuota compartida por todos los usuarios.
- ✅ La misma API servirá al modo local (fase 2) y al modo hosted (fase 3).
- ➖ Nueva pieza que mantener (Go), con sus propios tests (`go test ./...`).

## Fases

0. **Esta PR**: proxy + caché + agregación + adaptador del frontend. ✅
1. Caché en disco (persistente entre reinicios) y prefetch para la reproducción.
2. Modo local: flag `--repo-path` para leer del clon con `git` (cubre el ADR 0004).
3. Streaming (SSE) para la reproducción y despliegue público.
