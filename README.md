# gitScape 🛰️

Visualización 3D interactiva de la historia de un repositorio de GitHub. Los commits, carpetas y archivos se convierten en un "paisaje" tridimensional que puedes orbitar, con reproducción animada de la historia: astronautas "programadores" vuelan hasta los archivos afectados por cada commit.

## ✨ Características

- **Árbol 3D del repositorio**: carpetas y archivos como paneles flotantes conectados, con etiquetas de texto en 3D.
- **Línea temporal**: slider + lista de commits (fecha, autor, mensaje) para navegar por la historia.
- **Reproducción animada**: pulsa `Espacio` y observa cómo el árbol crece commit a commit; cada "programador" (astronauta) trabaja sobre los archivos cambiados.
- **Carpetas plegables**: clic en una carpeta para contraer/expandir su contenido; doble clic para volar hasta ella.
- **Cámara cinematográfica**: encuadre suave de todo el árbol, foco en carpetas y seguimiento del astronauta activo durante la reproducción.
- **Detección de PRs**: identifica los pull requests asociados a cada commit.
- **Presentación configurable**: las teclas `H`, `J`, `K`, `L` cambian la dirección de crecimiento del árbol.

## 🧱 Stack

- [Vite 5](https://vitejs.dev/) + TypeScript
- [Three.js](https://threejs.org/) (+ `three.interactive`, `@tweenjs/tween.js`)
- [troika-three-text](https://github.com/protectwise/troika/tree/main/packages/troika-three-text) para texto en 3D
- [Octokit](https://github.com/octokit/octokit.js) para la API de GitHub

## 🚀 Puesta en marcha

Requisitos: **Node.js 18+** (probado con Node 22).

```bash
npm install
cp .env.example .env   # edita y añade tu token
npm run dev            # → http://localhost:5173/
```

### ⚡ Arranque rápido con `dev.sh`

Si tienes un clon local del repo que quieres visualizar, el script levanta backend (modo local) + frontend en un solo comando:

```bash
./dev.sh                          # ~/dev/letrain (rama develop)
./dev.sh ~/dev/mi-repo main       # otro clon y otra rama
```

Compila el backend Go, arranca Vite y te muestra la URL; `Ctrl+C` para ambos.

### Configuración (`.env`)

| Variable | Descripción | Por defecto |
|---|---|---|
| `VITE_GITHUB_TOKEN` | Token de GitHub. Opcional para repos públicos, recomendado para no agotar el límite anónimo (60 peticiones/hora) | — |
| `VITE_GITHUB_OWNER` | Usuario u organización del repositorio | `antoniovazquezaraujo` |
| `VITE_GITHUB_REPO` | Nombre del repositorio a visualizar | `gitScape` |
| `VITE_GITHUB_BRANCH` | Rama cuya historia se visualiza | `develop` |

> ⚠️ **Aviso de seguridad**: al ser una app 100 % cliente, cualquier variable `VITE_*` es visible en el navegador. Usa un token de solo lectura y nunca uno con permisos amplios. La solución de fondo es el [backend Go](#-backend-go-opcional-recomendado): el token se queda en el servidor.

## 🖥️ Backend Go (opcional, recomendado)

La app puede funcionar sola (llamando a la API de GitHub desde el navegador) o con el backend local que agrupa, paraleliza y cachea los datos — recomendable para repositorios medianos/grandes y para no exponer el token.

```bash
cd server
GITHUB_TOKEN=tu_token go run . -addr :8080
```

Y en el `.env` del frontend:

```
VITE_API_URL=/   # mismo origen: en dev, Vite redirige /api al backend (ver vite.config.ts)
```

Para el **modo local** (fase 2), arranca el backend apuntando a un clon:

```bash
cd server
GITHUB_TOKEN=tu_token go run . --repo-path ~/dev/mi-repo
```

> Los commits, árboles y ficheros se leen **del disco con `git`**: instantáneo, offline y sin gastar cuota. Si hay token y el clon tiene remoto de GitHub, los PRs se traen de la API una sola vez. El frontend no cambia: ajusta `VITE_GITHUB_BRANCH` a la rama local y abre la app.

| Modo | Cuándo usarlo | Cómo |
|---|---|---|
| Directo | Repos pequeños, sin backend | Sin `VITE_API_URL` (Octokit en el navegador) |
| **Backend Go** | Repos medianos/grandes, cualquier repo de GitHub, caché, token seguro | `go run .` + `VITE_API_URL=/` |
| **Backend Go + clon local** ⭐ | Tus clones: instantáneo, offline, sin cuota | `go run . --repo-path ~/dev/mi-repo` |

Medidas reales: repos de 506 commits/75 PRs → frío ~6 s, caliente ~15 ms; en modo local, 1.807 commits leídos del disco al instante (solo los PRs van a la API, una vez). Detalles y fases en el [ADR 0006](docs/adr/0006-backend-go.md).

## 🕹️ Controles

| Acción | Control |
|---|---|
| Orbitar la cámara | Arrastrar con el ratón |
| Navegar por la historia | Slider o botones `‹` `›` |
| Reproducir/pausar la historia | `Espacio` |
| Centrar la vista (encuadrar todo el árbol) | Botón `Centrar` o `C` |
| Volver a la vista general | `Esc` |
| Enfocar una carpeta y su contenido | Doble clic sobre la carpeta |
| Plegar/desplegar una carpeta | Clic sobre la carpeta |
| Seguir/dejar de seguir al astronauta activo | `F` (se activa al reproducir; arrastrar sale) |
| Mostrar/ocultar la lista de commits | Botón `Toggle Commits` |
| Cambiar la orientación del árbol | `H` `J` `K` `L` (y con `Shift`) |

## 📁 Estructura del proyecto

```
src/
├── main.ts            # Punto de entrada: cablea modelo, vista y controlador
├── Model.ts           # Modelo: estado del repositorio y observadores
├── GitModel.ts        # Datos: Octokit directo o adaptador del backend Go
├── TreeNodeModel.ts   # Nodos del árbol (visibilidad, rutas, jerarquía)
├── View.ts            # Vista 3D: escena Three.js, animaciones, UI
├── Controller.ts      # Controlador: reproducción y coordinación
└── MovingStrategy.ts  # Estrategia de posicionamiento del layout 3D

server/                # Backend Go (opcional): proxy + caché + agregación
├── main.go            # Configuración, servidor HTTP y middlewares
├── source.go          # Interfaz dataSource (GitHub o clon local)
├── github.go          # Fuente GitHub (paginación + concurrencia)
├── gitlocal.go        # Fuente local (git) + PRs opcionales de GitHub
├── handlers.go        # Endpoints de la API
└── cache.go           # Caché en memoria con TTL
```

## 🧪 Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Typecheck (`tsc`) + build de producción |
| `npm run preview` | Sirve el build de producción |
| `npm test` | Tests unitarios del frontend (Vitest) |
| `cd server && go test ./...` | Tests del backend Go |

## 🗺️ Roadmap

- [x] **Backend Go (fase 0)**: proxy + caché + agregación; token fuera del navegador (ver [`docs/adr/0006`](docs/adr/0006-backend-go.md)).
- [x] **Modo local (fase 2)**: `--repo-path` lee del clon con git; instantáneo, offline y sin cuota (cubre [`docs/adr/0004`](docs/adr/0004-fuente-de-datos-local.md)).
- [ ] Backend fase 1: caché en disco y prefetch de la reproducción.
- [ ] Backend fase 3: streaming (SSE) y despliegue público.
- [ ] Reducir el tamaño del chunk (code-splitting de Three.js).

## 📚 Documentación

- [Arquitectura](docs/architecture.md)
- [Decisiones de arquitectura (ADRs)](docs/adr/)
