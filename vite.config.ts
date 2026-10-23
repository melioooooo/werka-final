import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pollinations rejects browser Origin headers (Turnstile), so the browser calls /api/bouquet and we forward server-side.
// ponytail: dev/preview only; a static deploy needs the same route as a serverless function.
const bouquetProxy = {
  '/api/bouquet': {
    target: 'https://image.pollinations.ai',
    changeOrigin: true,
    rewrite: (path: string) => {
      const q = new URL(path, 'http://x').searchParams;
      return `/prompt/${encodeURIComponent(q.get('prompt') ?? '')}?width=512&height=512&nologo=true&seed=${q.get('seed')}`;
    },
    configure: (proxy: any) => proxy.on('proxyReq', (req: any) => { req.removeHeader('origin'); req.removeHeader('referer'); }),
  },
};

export default defineConfig(() => {
  return {
    base: './', // Relative paths for GitHub Pages deployment
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: bouquetProxy,
    },
    preview: { proxy: bouquetProxy },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
