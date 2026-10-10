# ADR 0004: Fuente de datos local (git) además de la API remota

- **Estado**: Aceptada e implementada (fase 2 del backend Go, ver ADR 0006)
- **Fecha**: 2026-10-09

## Contexto

La app lee todo a través de la API de GitHub: límite de peticiones, latencia, token expuesto en el cliente y dependencia de red, incluso cuando el usuario tiene el repositorio clonado en su máquina. El navegador no puede leer el disco ni ejecutar `git` (sandbox), pero el servidor de desarrollo de Vite sí.

## Opciones consideradas

1. **Middleware del servidor de Vite** (`vite.config.ts`): endpoints `/api/git/*` que ejecutan `git` (`log`, `ls-tree`, `diff-tree`) sobre un clon local. Cero infraestructura nueva; sólo válido en modo desarrollo.
2. **Backend local** (Node/Go) con caché: más potente (multi-repo, caché compartida, proxy de PRs y agregación), pero más trabajo y otra pieza que desplegar.
3. **App de escritorio** (Tauri/Electron): acceso completo al sistema y a `git`, pero es otro producto (se pierde el navegador).

## Decisión (propuesta)

Implementar la opción 1 como modo por defecto en local ("fuente local"), manteniendo la API remota para visualizar repositorios sin clonar. Los datos de PRs seguirían viniendo de la API (con caché), por ser información que sólo existe en GitHub.

## Consecuencias (esperadas)

- ✅ Carga casi instantánea para commits/árboles/diffs: sin cuota, sin token y con funcionamiento offline.
- ✅ No cambia el stack del cliente: sólo un adaptador de datos en `GitModel`.
- ➖ Sólo disponible cuando la app corre junto al clon (modo dev o app de escritorio).
- ➖ Los PRs siguen dependiendo de la API.
