import { defineConfig } from 'vite';

export default defineConfig({ server: { port: 3001, strictPort: true, fs: { allow: ['..'] } }, build: { chunkSizeWarningLimit: 700 } });
