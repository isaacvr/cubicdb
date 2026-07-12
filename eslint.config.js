import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ["**/*.svelte.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: 2020,
      },
    },
  },
  {
    ignores: [
      "build/",
      ".svelte-kit/",
      "android/",
      "ios/",
      "cache/",
      "release/",
      "dist/",
      ".netlify/",
      "**/*.cjs",
      "static/",
      "src/electron/",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "no-unused-vars": "off",
      "prefer-const": "off",
      "no-var": "off",
      "no-case-declarations": "off",
      "no-empty": "off",
      "no-empty-pattern": "off",
      "svelte/no-navigation-without-resolve": "off",
      "svelte/no-at-html-tags": "off",
      "svelte/require-each-key": "off",
      "svelte/prefer-svelte-reactivity": "off",
      "svelte/prefer-writable-derived": "off",
      "svelte/no-unused-svelte-ignore": "off",
    },
  },
  {
    files: [
      "src/lib/events/timer/**/*.ts",
      "src/lib/timer/devices/**/*.ts",
      "src/lib/timer/handlers/**/*.ts",
      "src/lib/timer/repositories/**/*.ts",
      "src/lib/timer/services/**/*.ts",
      "src/lib/timer/usecases/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "prefer-const": "error",
    },
  }
);
