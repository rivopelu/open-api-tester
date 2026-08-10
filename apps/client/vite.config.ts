import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(import.meta.dirname, '../..'),
  build: {
    outDir: path.resolve(import.meta.dirname, '../../dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@modern-api-studio/types': path.resolve(import.meta.dirname, '../../packages/types/index.ts'),
      '@modern-api-studio/utils': path.resolve(import.meta.dirname, '../../packages/utils/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8888', changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ['js-yaml', 'uuid'],
  },
});
