import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5000
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      // cache: false,
      output: {
        sourcemap: false,
        format: "esm",
        dir: "dist",
      }
    }
  },
  resolve: {
    alias: {
      "@icons": "svelte-material-icons",
      "@components": path.resolve(__dirname, "./src/components"),
      "@classes": path.resolve(__dirname, "./src/classes"),
      "@helpers": path.resolve(__dirname, './src/helpers'),
      "@material": path.resolve(__dirname, './src/components/material'),
      "@constants": path.resolve(__dirname, './src/constants/index.ts'),
      "@cstimer": path.resolve(__dirname, './src/cstimer'),
      "@interfaces": path.resolve(__dirname, './src/interfaces/index.ts'),
      "@stores": path.resolve(__dirname, './src/stores'),
      "@workers": path.resolve(__dirname, './src/workers'),
    },
    dedupe: ["three"]
  }
})
