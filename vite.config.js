import { defineConfig } from 'vite';

export default defineConfig({
  // Treat public/ as project root so index.html and src/ live together
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Forward socket.io WebSocket + HTTP to the Express/Socket.io server
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
