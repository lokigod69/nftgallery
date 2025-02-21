import { defineConfig } from 'vite';

export default defineConfig({
  // This tells Vite to treat the "public" folder as the place for static assets
  publicDir: 'public',

  build: {
    // This tells Vite to place the production build in a folder called "dist"
    outDir: 'dist'
  }
});
