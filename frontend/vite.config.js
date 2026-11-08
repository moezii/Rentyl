import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Remove proxy configuration since nginx handles API proxying in unified container
  server: {
    port: 5173,
    host: true,
  },
});
