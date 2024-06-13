import eslintPluginSvelte from "eslint-plugin-svelte";

export default [
  ...eslintPluginSvelte.configs["flat/recommended"],
  {
    rules: {},
  },
];
