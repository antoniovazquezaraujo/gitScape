# ADR 0003: Registro público en el lockfile

- **Estado**: Aceptada
- **Fecha**: 2026-10-09

## Contexto

El `package-lock.json` contenía URLs del registro corporativo (`inditex.jfrog.io/inditex/api/npm/node-public/`), que bloqueaba paquetes (p. ej. `meshoptimizer`, dependencia de `three`) y rompía `npm install`/`npm ci` fuera de la red corporativa. En un repositorio público, además, filtra infraestructura interna.

## Decisión

Sustituir todas las URLs del registro corporativo por `registry.npmjs.org` en los lockfiles. No volver a commitear URLs de registros privados.

## Consecuencias

- ✅ La instalación funciona en cualquier entorno.
- ✅ El repositorio no expone infraestructura corporativa.
