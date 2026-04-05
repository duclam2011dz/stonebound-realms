import { defineConfig } from 'vite';
import { resolve } from 'path';

const clientRoot = resolve(__dirname, 'client');

export default defineConfig({
  root: clientRoot,
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(clientRoot, 'index.html'),
        menu: resolve(clientRoot, 'pages/menu.html'),
        createWorld: resolve(clientRoot, 'pages/create-world.html'),
        game: resolve(clientRoot, 'pages/game.html')
      }
    }
  }
});
