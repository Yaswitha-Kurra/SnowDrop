import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/injected.ts',
      formats: ['iife'],
      name: 'Injected',
      fileName: () => 'injected.js'
    },
    outDir: 'dist',
    rollupOptions: {
      output: {
        extend: true,
      }
    },
    emptyOutDir: false,
    target: 'esnext'
  }
});
