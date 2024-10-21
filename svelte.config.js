import adapter from "@sveltejs/adapter-netlify";
// import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({
    postcss: true,
  }),

  compilerOptions: {
    css: "external",
  },

  kit: {
    // For Electron
    // adapter: adapter({ fallback: "index.html" }),

    // For Netlify
    adapter: adapter(),

    alias: {
      "@icons": "./node_modules/svelte-material-icons",
      "@components": "./src/lib/components",
      "@classes": "./src/lib/classes",
      "@helpers": "./src/lib/helpers",
      "@material": "./src/lib/components/material",
      "@constants": "./src/lib/constants/index.ts",
      "@cstimer": "./src/lib/cstimer",
      "@interfaces": "./src/lib/interfaces/index.ts",
      "@stores": "./src/lib/stores",
      "@storage": "./src/lib/storage",
      "@workers": "./src/lib/workers",
      "@lang": "./src/lib/lang",
      "@pages": "./src/lib/pages",
    },
  },
};

export default config;
