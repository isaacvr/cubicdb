import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";
import pkg from "./package.json" assert { type: "json" };
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
  plugins: [headerPlugin, /*basicSSL(),*/ sveltekit()],
  server: {
    host: true,
    port: 5432,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    proxy: {},
  },
  build: {
    minify: true,
  },
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
}));
