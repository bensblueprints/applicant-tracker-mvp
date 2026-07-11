import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'client',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  server: {
    port: 6354,
    proxy: {
      '/api': 'http://localhost:5354',
      '/careers': 'http://localhost:5354',
      '/apply': 'http://localhost:5354'
    }
  }
});
