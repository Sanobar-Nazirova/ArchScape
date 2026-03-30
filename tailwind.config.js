/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sphera: {
          bg: '#0c0e16',
          panel: '#13151f',
          surface: '#1a1d2e',
          border: '#252840',
          accent: '#4f7cff',
          'accent-hover': '#6b93ff',
          hover: '#1f2235',
          text: '#c8cce0',
          muted: '#6b7094',
        },
      },
    },
  },
  plugins: [],
}
