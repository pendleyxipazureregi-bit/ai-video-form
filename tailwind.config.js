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
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1e40af',
          700: '#1e3a8a',
          800: '#1e3a5f',
          900: '#0f172a',
        },
        accent: {
          gold: '#d4af37',
          coral: '#ff6b6b',
        }
      },
      fontFamily: {
        display: ['Noto Serif SC', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

