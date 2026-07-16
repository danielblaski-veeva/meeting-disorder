import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative assets path for easy GitHub Pages hosting
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
