# ADR 0002: Configuración del repositorio objetivo por variables de entorno

- **Estado**: Aceptada
- **Fecha**: 2026-10-09

## Contexto

`owner`, `repo` y rama estaban hardcodeados en `GitModel.ts` (`antoniovazquezaraujo`, `gitScape-test`, `develop`), lo que obligaba a tocar código fuente para visualizar otro repositorio. Además, la carga de commits usaba páginas de 10 elementos cuando la API permite 100.

## Decisión

Leer `VITE_GITHUB_OWNER`, `VITE_GITHUB_REPO` y `VITE_GITHUB_BRANCH` de variables de entorno con fallbacks razonables. Cargar commits con `per_page` = 100.

## Consecuencias

- ✅ Cambiar de repositorio no requiere tocar código: basta con el `.env`.
- ✅ Menos peticiones en la carga inicial (÷10 en la paginación de commits).
- ➖ Las variables `VITE_*` quedan visibles en el navegador; asumido para el token (ver ADR 0004 para la solución de fondo).
