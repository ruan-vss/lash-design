/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        nude: {
          50: '#FAF7F5',
          100: '#F3ECE7',
          150: '#EDE2DA',
          200: '#E6D7CE',
          300: '#D5BCAE',
          400: '#C29D8B',
          500: '#AF826D',
          600: '#966956',
          700: '#7B5446',
          800: '#65463B',
          900: '#533B33',
        },
        rose: {
          50: '#FDF8F8',
          100: '#F9ECEC',
          200: '#F2D8D9',
          300: '#E7B8BA',
          400: '#D88F94',
          500: '#C66B73',
          600: '#B0525B',
        },
        espresso: {
          700: '#4E3A32',
          800: '#3A2A24',
          900: '#261B17',
          950: '#1A120F',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.02em' }], // 12px (mínimo acessível)
        small: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.01em' }],  // 14px
        body: ['1rem', { lineHeight: '1.625rem', letterSpacing: '0em' }],          // 16px
        h4: ['1.125rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],      // 18px (Plus Jakarta)
        h3: ['1.375rem', { lineHeight: '1.75rem', letterSpacing: '-0.015em' }],    // 22px
        h2: ['2rem', { lineHeight: '2.375rem', letterSpacing: '-0.02em' }],        // 32px (Cormorant)
        h1: ['2.5rem', { lineHeight: '2.875rem', letterSpacing: '-0.025em' }],     // 40px (Cormorant)
        display: ['3.25rem', { lineHeight: '3.5rem', letterSpacing: '-0.03em' }],  // 52px (Cormorant)
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(38, 27, 23, 0.04), 0 1px 2px -1px rgba(38, 27, 23, 0.03)',
        soft: '0 10px 30px -5px rgba(38, 27, 23, 0.06), 0 4px 12px -2px rgba(38, 27, 23, 0.04)',
        lifted: '0 20px 40px -10px rgba(38, 27, 23, 0.12), 0 8px 16px -4px rgba(38, 27, 23, 0.06)',
        inner: 'inset 0 1px 2px 0 rgba(38, 27, 23, 0.05)',
      },
      spacing: {
        section: '5rem',
        'section-lg': '7rem',
      },
      transitionTimingFunction: {
        luxury: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        250: '250ms',
      },
    },
  },
  plugins: [],
};