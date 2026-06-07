import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the static build works when opened from any sub-path (e.g. file://, GitHub Pages later).
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
  },
});
