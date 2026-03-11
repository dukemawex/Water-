/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          900: '#0F2A4A',
          800: '#1a3a5c',
          700: '#2a4f75',
          600: '#3a648e',
        },
        water: {
          500: '#0EA5E9',
          400: '#38bdf8',
          300: '#7dd3fc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
