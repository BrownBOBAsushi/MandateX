/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'sol-purple': '#9945FF',
        'sol-green': '#14F195',
        'sol-red': '#FF4444',
        'sol-yellow': '#F5A623',
      },
    },
  },
  plugins: [],
}
