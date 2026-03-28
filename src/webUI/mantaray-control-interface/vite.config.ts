import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      // Keep Vite cache in a writable location for this environment.
      cacheDir: path.resolve(rootDir, 'node_modules/vite-cache'),
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(rootDir, '.'),
        }
      },
      define: {
        global: 'window',
      },
      build: {
        commonjsOptions: {
          transformMixedEsModules: true, 
        }
      }
    };
});