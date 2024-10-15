import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://kit.svelte.dev/docs/integrations#preprocessors
  // for more information about preprocessors
  preprocess: vitePreprocess({
    postcss: true,
  }),

  compilerOptions: {
    css: "external",
  },

  kit: {
    // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
    // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
    // See https://kit.svelte.dev/docs/adapters for more information about adapters.
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
