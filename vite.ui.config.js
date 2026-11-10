import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [solid()],
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/ui/main.jsx'),
      formats: ['iife'],
      name: 'AimlockrMenu',
      fileName: () => 'menu.js'
    },
    outDir: 'dist/ui',
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
    sourcemap: false
  }
});
