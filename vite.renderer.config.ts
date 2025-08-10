import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true
      }
    }
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    include: ['cubing/scramble']
  }
});
