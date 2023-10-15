/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'red',
        background: '#212121',
        backgroundLv1: '#333',
        backgroundLv2: '#444',
      }
    },
  },
  plugins: [],
}
