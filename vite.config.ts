import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

// import basicSSL from '@vitejs/plugin-basic-ssl';

export default defineConfig((env) => ({
  plugins: [ svelte(), /*basicSSL()*/ ],
  publicDir: 'public',
  base: env.mode === 'production' ? './' : '',
  server: {
    host: true,
    port: 5432
  },
  build: {
    rollupOptions: { output: { dir: "./dist" } },
    minify: true
  },
  resolve: {
    alias: {
      "@icons": "svelte-material-icons",
      "@components": resolve(__dirname, "./src/components"),
      "@classes": resolve(__dirname, "./src/classes"),
      "@helpers": resolve(__dirname, './src/helpers'),
      "@material": resolve(__dirname, './src/components/material'),
      "@constants": resolve(__dirname, './src/constants/index.ts'),
      "@cstimer": resolve(__dirname, './src/cstimer'),
      "@interfaces": resolve(__dirname, './src/interfaces/index.ts'),
      "@stores": resolve(__dirname, './src/stores'),
      "@storage": resolve(__dirname, './src/storage'),
      "@workers": resolve(__dirname, './src/workers'),
      "@lang": resolve(__dirname, './src/lang'),
      "@public": resolve(__dirname, './public'),
      
      // PREMIUM
      "@pcomponents": resolve(__dirname, "./src/cubedb-premium/components"),
      "@pclasses": resolve(__dirname, "./src/cubedb-premium/classes"),
    },
    // dedupe: ["three"]
  }
}));
