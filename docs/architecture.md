# Arquitectura

## Visión general

gitScape es una SPA sin backend: todo el trabajo ocurre en el navegador.

```
┌──────────────────── Navegador ─────────────────────┐
│  main.ts                                           │
│    │                                               │
│  ControllerImpl ──► ModelImpl ──► GitModelImpl ──► api.github.com
│    │                   ▲                    (Octokit)
│    ▼                   │ notificaciones             │
│  ViewImpl ◄────────────┘                           │
│    │  (Three.js + troika + tween.js)               │
│    ▼                                               │
│  <canvas id="app">                                 │
└────────────────────────────────────────────────────┘
```

## Componentes

### Modelo (datos)

- **`GitModelImpl`** (`GitModel.ts`): puerta a la API de GitHub vía Octokit. Carga todos los commits de la rama configurada (paginado de 100 en 100), mapea commits ↔ PRs y devuelve árboles y archivos por commit.
- **`ModelImpl`** (`Model.ts`): estado de la aplicación (árbol actual, índice de commit) y patrón observador. Los eventos (`EventType`) son: `RepositoryChange`, `TreeNodeChange` y `CurrentCommitChange`.
- **`TreeNodeModel`**: jerarquía de nodos (nombre, visibilidad, hijos, padre) con utilidades de búsqueda, rutas y conteo de nodos visibles.

### Vista (render)

- **`ViewImpl`** (`View.ts`): escena Three.js. Pinta carpetas y archivos como paneles con etiquetas de troika, gestiona `OrbitControls` (cámara) e `InteractionManager` (clics). Precarga el astronauta (`assets/11070_astronaut_v4.obj`) y clona un "programador" por autor de commit durante la reproducción.
- **`MovingStrategy`**: calcula distancias y direcciones de crecimiento del layout 3D (teclas `H`/`J`/`K`/`L`).

### Controlador (coordinación)

- **`ControllerImpl`** (`Controller.ts`): orquesta la reproducción. `Espacio` activa `startSelected()`/`stopSelected()`; cada animación terminada encadena el siguiente commit mediante `commitAnimationFinished()`.

## Flujo

1. `main.ts` instancia y cablea los tres componentes.
2. `ControllerImpl.initialize()` → `GitModelImpl.initialize()`:
   - **modo directo**: descarga todos los commits de la rama (`VITE_GITHUB_BRANCH`), luego los PRs y sus commits (mapeo commit → PR);
   - **modo backend** (`VITE_API_URL`): pide el estado agregado a `GET /api/repos/{owner}/{repo}/state` (el backend hace ambas cosas en paralelo y con caché);
   - establece el primer commit como actual.
3. `ViewImpl` pinta el árbol del commit actual.
4. Slider o botones → `commitIndexChanged()` → recarga el árbol de ese commit (`GitModel.getTreeAtCommit`).
5. `Espacio` → reproducción: por cada commit se lanza `animateCommit()` (vuelo del programador, resaltado de archivos, altas y bajas en el árbol) y al terminar se encadena el siguiente.

## Backend Go (`server/`)

Opcional pero recomendado. Ver [ADR 0006](adr/0006-backend-go.md). En modo backend el coste de API desde el navegador baja a **1 petición agregada + 1 por cambio de commit** (y los árboles/ficheros repetidos los sirve la caché del servidor).

| Fase | Llamadas desde el navegador (modo backend) |
|---|---|
| Carga inicial | 1 (`/state`, cacheada) |
| Cambio de commit | 1 (`/tree/{sha}`, inmutable) |
| Reproducción | 1 por commit nuevo + ficheros cacheados |

## Coste de API (importante para repos grandes)

| Fase | Llamadas |
|---|---|
| Carga inicial | `commits/100 + 1 + nº de PRs` |
| Cambio de commit (manual) | 1 (árbol del commit) |
| Reproducción (por commit) | 2 + nº de archivos añadidos |

Consecuencia: los repos pequeños/medianos (decenas de PRs) cargan en segundos; los grandes pueden tardar minutos y agotar la cuota. Ver el roadmap del README.

## Decisiones

Las decisiones de arquitectura se registran en [`docs/adr/`](adr/).
