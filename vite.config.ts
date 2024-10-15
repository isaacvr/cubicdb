import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
// import { VitePWA } from "vite-plugin-pwa";

// import basicSSL from "@vitejs/plugin-basic-ssl";

const headerPlugin = {
  name: "p",
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      next();
    });
  },
};

export default defineConfig(env => ({
  plugins: [
    headerPlugin,
    sveltekit(), //basicSSL(),
    //   VitePWA({
    //   manifest: {
    //     name: "CubicDB",
    //     start_url: ".",
    //     display: "standalone",
    //     display_override: ['fullscreen', 'standalone'],
    //     background_color: "#080a16",
    //     description: "Cubing with fun",
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
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
}));
