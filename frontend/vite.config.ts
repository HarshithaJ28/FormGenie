import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // Environment variables are handled automatically by Vite with VITE_ prefix
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['pdfjs-dist']
      },
      build: {
        rollupOptions: {
          external: [],
          output: {
            manualChunks: {
              'pdfjs': ['pdfjs-dist']
            }
          }
        }
      }
    };
});
