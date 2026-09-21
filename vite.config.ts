import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Multi-entry build for a Manifest V3 extension.
 * - content / background are IIFE-style single files (no code splitting, no ESM imports at runtime).
 * - popup / options are HTML pages with their own scripts.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
    target: 'es2022',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        options: resolve(__dirname, 'src/options/options.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
        // Keep content + background self-contained: no shared chunks.
        manualChunks: () => undefined,
        inlineDynamicImports: false,
      },
      preserveEntrySignatures: false,
    },
  },
  plugins: [
    {
      name: 'copy-manifest-and-icons',
      closeBundle() {
        mkdirSync('dist/icons', { recursive: true });
        copyFileSync('manifest.json', 'dist/manifest.json');
        for (const s of [16, 32, 48, 128]) copyFileSync(`icons/icon${s}.png`, `dist/icons/icon${s}.png`);
      },
    },
  ],
});
