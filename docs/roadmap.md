# Roadmap

> **Visión**: que la use alguien. gitScape no es solo una herramienta personal: el objetivo es que **cualquier persona** pueda entender la historia de un repositorio de un vistazo.

## Estado actual (2026-10)

- ✅ Visualización 3D del árbol, navegación cómoda (centrar, foco en carpetas), cámara over-the-shoulder siguiendo al astronauta.
- ✅ Timeline de commits con reproducción animada; **rayos por estado** (verde añadido / rojo borrado / ámbar) y glow fiable del fichero tocado.
- ✅ Backend Go con **dos fuentes**: GitHub (caché + agregación) y **clon local** (`--repo-path`, instantáneo); PRs opcionales vía API.
- ✅ Calidad: README, ADRs, tests (Go + Vitest), CI, `dev.sh`, ramas limpias.

## Direcciones acordadas (sesión 2026-10-10)

1. **Objetivo: adopción.** MVP público orientado a repositorios públicos, sin fricción (sin instalar nada).
2. **PRs primero.** Las issues quedan aparcadas; quizá no hagan falta.
3. **El "plano doble" no se implementa sin validar antes con maquetas** (`mockups/two-planes.html`).

## Fases

| # | Fase | Estado | Notas |
|---|---|---|---|
| A | Rayos por estado + glow fiable del fichero tocado | ✅ PR #23 | 4 causas raíz corregidas |
| M | **Maquetas del plano doble** | ✅ este PR | 3 variantes en `mockups/`; recomendación de UI: **V2 apilado vertical** |
| B | **PRs → ficheros**: seleccionar una PR y ver líneas hasta sus ficheros (+ panel de PRs) | ⏳ siguiente | Solo PRs; backend: endpoint de ficheros de PR con caché |
| C | **MVP público**: selector de repo en la UI + deploy + pulido (carga, errores) | ⏳ | "Que la use alguien"; repos públicos |
| D | **Seguir a un programador**: historia individual, playback filtrado, resaltado | ⏳ | Datos ya disponibles (autor en cada commit) |
| E | **Plano doble** (issues/PRs + ficheros, astronautas entre planos) | ⏳ condicionada a M | Candidata V2; V3 como experimento previo barato; V1 solo con presupuesto de escaparate |

## Ideas aparcadas

- **Issues → PRs → ficheros** (arqueología de ingeniería): requiere timeline de GitHub; aparcada por decisión de producto.
- Fase 1 del backend (caché en disco) y fase 3 (streaming SSE) — ver [ADR 0006](adr/0006-backend-go.md).
- Cuentas de usuario / OAuth para repos privados.

## Cómo trabajamos

- Todo por **rama + PR** ([ADR 0005](adr/0005-modelo-de-ramas.md)), CI verde obligatoria y ramas borradas tras el merge.
- Las decisiones gordas se registran como **ADR** en `docs/adr/`.
- Cada fase debe terminar en un estado **usable y bonito**, nunca a medias.
