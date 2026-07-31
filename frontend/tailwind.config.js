/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5ceacc',
          400: '#2dd4b5',
          500: '#14b89c',
          600: '#0d947f',
          700: '#0f7667',
          800: '#115e53',
          900: '#134e45',
        },
        income: '#10b981',
        expense: '#f43f5e',
        pending: '#f59e0b',
      },
    },
  },
  plugins: [],
}
