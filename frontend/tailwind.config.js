/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    borderRadius: { none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0', '4xl': '0', full: '9999px' },
    extend: {
      colors: {
        blue: { 50: '#edf5ff', 100: '#d0e2ff', 200: '#a6c8ff', 300: '#78a9ff', 400: '#4589ff', 500: '#0f62fe', 600: '#0f62fe', 700: '#0043ce', 800: '#002d9c', 900: '#001d6c' },
        // Compatibility aliases for existing views, mapped to Carbon grays.
        nude: {
          50: '#ffffff',
          100: '#f4f4f4',
          150: '#e8e8e8',
          200: '#e0e0e0',
          300: '#c6c6c6',
          400: '#a8a8a8',
          500: '#6f6f6f',
          600: '#525252',
          700: '#525252',
          800: '#393939',
          900: '#262626',
        },
        rose: {
          50: '#fff1f1',
          100: '#fff1f1',
          200: '#ffd7d9',
          300: '#ffb3b8',
          400: '#fa4d56',
          500: '#da1e28',
          600: '#b81921',
        },
        espresso: {
          700: '#525252',
          800: '#393939',
          900: '#161616',
          950: '#161616',
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        serif: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        small: ['0.875rem', { lineHeight: '1.25rem' }],
        body: ['1rem', { lineHeight: '1.5rem' }],
        h4: ['1.125rem', { lineHeight: '1.5rem' }],
        h3: ['1.25rem', { lineHeight: '1.75rem' }],
        h2: ['2rem', { lineHeight: '2.5rem' }],
        h1: ['2.625rem', { lineHeight: '3.125rem' }],
        display: ['3.375rem', { lineHeight: '4.0625rem' }],
      },
      boxShadow: { card: 'none', soft: 'none', lifted: '0 2px 6px rgba(0,0,0,0.3)', inner: 'none' },
      spacing: {
        section: '5rem',
        'section-lg': '7rem',
      },
      transitionTimingFunction: {
        luxury: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
      },
      transitionDuration: {
        250: '240ms',
      },
    },
  },
  plugins: [],
};