import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Both hosts render the same Planner; Pages only needs the browser bundle.
export default defineConfig({
  root: fileURLToPath(new URL('./github-pages', import.meta.url)),
  base: process.env.PAGES_BASE_PATH || '/pionierka/',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [react()],
  resolve: {alias: {'@': fileURLToPath(new URL('./', import.meta.url))}},
  css: {postcss: fileURLToPath(new URL('./', import.meta.url))},
  build: {
    outDir: fileURLToPath(new URL('./dist-pages', import.meta.url)),
    emptyOutDir: true,
  },
});
