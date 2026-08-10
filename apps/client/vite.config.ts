import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(import.meta.dirname, '../..'),
  resolve: {
    alias: {
      '@modern-api-studio/types': path.resolve(import.meta.dirname, '../../packages/types/index.ts'),
      '@modern-api-studio/utils': path.resolve(import.meta.dirname, '../../packages/utils/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['js-yaml', 'uuid'],
  },
});
