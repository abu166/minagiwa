import { defineConfig } from 'vite';

// Relative base so the build works from a GitHub Pages sub-path.
export default defineConfig({ base: './', build: { target: 'es2022', chunkSizeWarningLimit: 900 } });
