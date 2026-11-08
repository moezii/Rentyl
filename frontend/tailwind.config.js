/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4d82ff',
          DEFAULT: '#0057FF', // Blue color from the image
          dark: '#0042cc',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '50': '12.5rem', // 200px
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}