/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        semh: {
          primary: '#006a4e',
          'primary-dark': '#00513b',
          container: '#ccebdd',
          tint: '#e6f5ee',
          canvas: '#f8f9fa',
          sidebar: '#f1f5f3',
          subtle: '#e9efec',
          border: '#dfe5e1',
          ink: '#1b211e',
          secondary: '#59645e',
          muted: '#87938c',
        },
      },
    },
  },
  plugins: [],
};
