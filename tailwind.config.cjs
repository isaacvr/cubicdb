/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
  ],
  darkMode: "class",
  plugins: [require("daisyui")],
  theme: {
    extend: {
      colors: {
        move: "oklch(var(--move) / <alpha-value>)",
        operator: "oklch(var(--operator) / <alpha-value>)",
        comment: "oklch(var(--comment) / <alpha-value>)",
        current: "oklch(var(--current) / <alpha-value>)",
      },
    },
  },
  daisyui: {
    themes: [
      {
        "cubicdb.themes.default": {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#3b82f6",
          secondary: "#16a34a",
          accent: "#ea580c",
          neutral: "#2f3a55",
          "base-100": "#082A52",
          "base-200": "#0A1B33",
          "base-300": "#040C17",
          "base-content": "#d1d5db",
          "--move": "98% 0.09 114.13",
          "--operator": "75% 0.2 341.59",
          "--comment": "77% 0.19 143.39",
          "--current": "100% 0 0",
        },
      },
    ],
  },
};
