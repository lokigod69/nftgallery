import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // This tells Vite to treat the "public" folder as the place for static assets
  publicDir: 'public',

  build: {
    // This tells Vite to place the production build in a folder called "dist"
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        room0: resolve(__dirname, 'room0.html'),
        room1: resolve(__dirname, 'room1.html'),
        room2: resolve(__dirname, 'room2.html'),
        room3: resolve(__dirname, 'room3.html'),
        room4: resolve(__dirname, 'room4.html'),
        room5: resolve(__dirname, 'room5.html'),
        room6: resolve(__dirname, 'room6.html'),
        room7: resolve(__dirname, 'room7.html')
      }
    }
  }
});
