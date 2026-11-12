import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CSP aplicada apenas no build: o servidor de dev do Vite injeta scripts inline.
// Ideal: enviar também como header HTTP no host (inclui frame-ancestors).
const cspPlugin = () => ({
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml: () => [{
    tag: 'meta',
    attrs: {
      'http-equiv': 'Content-Security-Policy',
      content: [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    },
    injectTo: 'head-prepend',
  }],
});

export default defineConfig({
  plugins: [react(), cspPlugin()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          ui: ['lucide-react', 'react-day-picker', 'date-fns'],
        },
      },
    },
  },
});