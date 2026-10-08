# ADR 0001: Recuperar la línea `develop`/`show-pull-requests` como `main` canónica

- **Estado**: Aceptada
- **Fecha**: 2026-10-09

## Contexto

Tras el PR #5 (dic-2023), `main` quedó congelada con una versión simplificada del proyecto, mientras la evolución real continuó en `develop` (PRs #8–#13: slider temporal, animaciones, plegado de carpetas, detección de PRs) y después en `show-pull-requests` (botones ‹ ›, lista de commits). Ninguna de esas mejoras llegó nunca a `main`, que quedó huérfana durante más de dos años.

## Decisión

Integrar en `main`, mediante PR #14, la rama `show-pull-requests` (que contiene también `develop`), incluyendo los arreglos de build, lockfile y configuración. A partir de ahora `main` es la única rama canónica y las ramas de trabajo se eliminan tras el merge (ver ADR 0005).

## Consecuencias

- ✅ `main` refleja el estado más avanzado del proyecto.
- ✅ Historial preservado (merge commit, sin squash): los PRs #8–#13 siguen siendo trazables.
- ➖ Se descarta el commit de refresh de lockfile de `develop`, sustituido por el lockfile saneado de esta integración (ver ADR 0003).
