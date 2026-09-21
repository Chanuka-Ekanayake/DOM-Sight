import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Build 2 of 2: the content script as one IIFE file (content scripts cannot use ES module imports). */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    minify: false,
    target: 'es2022',
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      name: 'DomTracker',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
    rollupOptions: { output: { extend: true } },
  },
});
