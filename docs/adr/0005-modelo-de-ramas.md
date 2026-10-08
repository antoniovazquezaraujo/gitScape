# ADR 0005: Modelo de ramas

- **Estado**: Aceptada
- **Fecha**: 2026-10-09

## Contexto

La divergencia histórica entre `main` y `develop` (ver ADR 0001) provocó que meses de trabajo quedaran huérfanos y que `main` mostrara una versión obsoleta del proyecto. Hacía falta una política explícita para no repetirlo.

## Decisión

Adoptar un flujo trunk-based con PRs:

- `main` es la única rama canónica; todo cambio entra por PR.
- Las ramas de trabajo (`feat/*`, `fix/*`, `chore/*`) se eliminan —local y remotamente— tras el merge.
- No se mantienen ramas `develop` de larga vida.

## Consecuencias

- ✅ Se evita repetir la divergencia de 2023.
- ✅ El repositorio queda limpio: sólo `main` (remotas y locales).
- ➖ Los cambios grandes deben trocearse en PRs revisables; las integraciones excepcionales (como el PR #14) se documentan en un ADR.
