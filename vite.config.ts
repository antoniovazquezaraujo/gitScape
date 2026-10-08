import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // En desarrollo, las llamadas a /api se redirigen al backend Go local.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
