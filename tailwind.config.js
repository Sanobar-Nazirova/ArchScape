/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy sphera-* colors kept for backward compatibility
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
        // New neumorphic design tokens
        nm: {
          base: '#1e1e26',
          text: '#e0ddd8',
          muted: 'rgba(224,221,216,0.42)',
          accent: '#e07b3f',
          'accent-hover': '#c96928',
          teal: '#3bbfb5',
          danger: '#e05454',
        },
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'nm-up':    '6px 6px 14px rgba(0,0,0,.6), -4px -4px 10px rgba(255,255,255,.04)',
        'nm-up-lg': '10px 10px 24px rgba(0,0,0,.65), -6px -6px 16px rgba(255,255,255,.05)',
        'nm-in':    'inset 4px 4px 10px rgba(0,0,0,.6), inset -3px -3px 8px rgba(255,255,255,.04)',
        'nm-in-sm': 'inset 2px 2px 6px rgba(0,0,0,.55), inset -2px -2px 5px rgba(255,255,255,.04)',
        'nm-flat':  '2px 2px 6px rgba(0,0,0,.45), -1px -1px 4px rgba(255,255,255,.03)',
      },
      borderRadius: {
        nm:    '18px',
        'nm-sm': '11px',
        'nm-lg': '26px',
      },
    },
  },
  plugins: [],
}
