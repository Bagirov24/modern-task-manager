/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#38bdf8', dark: '#0ea5e9' },
        surface: '#334155',
      },
    },
  },
  plugins: [],
}
