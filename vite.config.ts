import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        menu: resolve(__dirname, 'menu.html'),
        createWorld: resolve(__dirname, 'create-world.html'),
        game: resolve(__dirname, 'game.html')
      }
    }
  }
});
