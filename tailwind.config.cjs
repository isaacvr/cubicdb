/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}",
  ],
  darkMode: "class",
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        "cubicdb.themes.default": {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#3b82f6",
          secondary: "#16a34a",
          accent: "#ea580c",
          neutral: "#2f3a55",
          // "primary-content": "#d1d5db",
          "base-100": "#082A52",
          "base-200": "#0A1B33",
          "base-300": "#040C17",
          "base-content": "#d1d5db",
          // --------------------------
          // primary: "#3b82f6",
          // "primary-content": "#ffffff",
          // "primary-content": "#010615",
          // secondary: "#9333ea",
          // "secondary-content": "#000a02",
          // accent: "#d97706",
          // "accent-content": "#140b16",
          // neutral: "#0e0a3a",
          // "neutral-content": "#ced0d3",
          // "base-100": "#082A52",
          // "base-200": "#062346",
          // "base-300": "#041c3b",
          // "base-content": "#c9d1db",
          // info: "#2563eb",
          // "info-content": "#cfdefb",
          // success: "#15803d",
          // "success-content": "#d4e5d6",
          // warning: "#ca8a04",
          // "warning-content": "#0f0700",
          // error: "#b91c1c",
          // "error-content": "#f7d5d1",
        },
      },
    ],
  },
};
