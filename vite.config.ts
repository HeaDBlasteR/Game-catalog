import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-csp',
      apply: 'serve',
      transformIndexHtml: html =>
        html
          .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
          .replace("connect-src 'self'", "connect-src 'self' ws://localhost:3000"),
    },
  ],
  root: path.resolve(__dirname, 'src'),
  base: './',
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});