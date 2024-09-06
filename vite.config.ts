import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
// import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

// import basicSSL from "@vitejs/plugin-basic-ssl";

const headerPlugin = {
  name: "p",
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      next();
    });
  },
};

export default defineConfig(env => ({
  plugins: [
    headerPlugin,
    svelte(), //basicSSL(),
    //   VitePWA({
    //   manifest: {
    //     name: "CubeDB",
    //     start_url: ".",
    //     display: "standalone",
    //     display_override: ['fullscreen', 'standalone'],
    //     background_color: "#080a16",
    //     description: "The definitive app for Speedcubing",
    //     theme_color: "#080a16",
    //     categories: [
    //       "education",
    //       "entertainment",
    //       "games",
    //       "sports"
    //     ],
    //     icons: [
    //       {
    //         src: "/assets/logo-100.png",
    //         sizes: "100x100",
    //         type: "image/png",
    //         purpose: "any maskable"
    //       },
    //       {
    //         src: "/assets/logo-200.png",
    //         sizes: "200x200",
    //         type: "image/png",
    //         purpose: "any maskable"
    //       },
    //       {
    //         src: "/assets/logo-500.png",
    //         sizes: "500x500",
    //         type: "image/png",
    //         purpose: "any maskable"
    //       },
    //       {
    //         src: "/assets/logo-512.png",
    //         sizes: "512x512",
    //         type: "image/png",
    //         purpose: "any maskable"
    //       },
    //       {
    //         src: "/assets/logo-1000.png",
    //         sizes: "1000x1000",
    //         type: "image/png",
    //         purpose: "any maskable"
    //       }
    //     ]
    //   },
    //   workbox: {
    //     maximumFileSizeToCacheInBytes: 3145728, // 3 MiB
    //   }
    // })
  ],
  publicDir: "public",
  base: env.mode === "production" ? "/" : "",
  server: {
    host: true,
    port: 5432,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    rollupOptions: { output: { dir: "./dist" } },
    minify: true,
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  resolve: {
    alias: {
      "@icons": "svelte-material-icons",
      "@components": resolve(__dirname, "./src/components"),
      "@classes": resolve(__dirname, "./src/classes"),
      "@helpers": resolve(__dirname, "./src/helpers"),
      "@material": resolve(__dirname, "./src/components/material"),
      "@constants": resolve(__dirname, "./src/constants/index.ts"),
      "@cstimer": resolve(__dirname, "./src/cstimer"),
      "@interfaces": resolve(__dirname, "./src/interfaces/index.ts"),
      "@stores": resolve(__dirname, "./src/stores"),
      "@storage": resolve(__dirname, "./src/storage"),
      "@workers": resolve(__dirname, "./src/workers"),
      "@lang": resolve(__dirname, "./src/lang"),
      "@public": resolve(__dirname, "./public"),

      // PREMIUM
      "@pcomponents": resolve(__dirname, "./src/cubedb-premium/components"),
      "@pclasses": resolve(__dirname, "./src/cubedb-premium/classes"),
    },
    // dedupe: ["three"]
  },
}));
