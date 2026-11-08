import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';

const nodeBuiltins = builtinModules.flatMap((name) => [name, `node:${name}`]);

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/main/index.js'),
      formats: ['cjs'],
      fileName: () => 'index.cjs'
    },
    outDir: 'dist/main',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', ...nodeBuiltins]
    },
    target: 'node22',
    minify: false,
    sourcemap: false
  }
});
