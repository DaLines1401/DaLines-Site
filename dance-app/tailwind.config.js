/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body: ['var(--font-body)', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        cyber: {
          bg: '#0a0a0c',
          card: 'rgba(18, 20, 26, 0.75)',
          border: 'rgba(255, 255, 255, 0.12)',
        }
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      },
      animation: {
        blink: 'blink 1s step-end infinite',
        float: 'float 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
