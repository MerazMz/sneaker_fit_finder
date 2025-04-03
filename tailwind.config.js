module.exports = {
  purge: [
    './templates/**/*.html',
    './static/**/*.js',
  ],
  darkMode: 'class', // or 'media'
  theme: {
    extend: {
      colors: {
        // Charcoal black
        'charcoal': {
          50: '#f5f5f6',
          100: '#e6e7e8',
          200: '#c5c7ca',
          300: '#9fa3a9',
          400: '#777d86',
          500: '#5d636d',
          600: '#434952',
          700: '#333840',
          800: '#1f232a',
          900: '#111419',
        },
        // Metallic silver
        'metallic': {
          50: '#f7f7f8',
          100: '#eeeef1',
          200: '#d5d6dd',
          300: '#b3b5c2',
          400: '#8c8fa3',
          500: '#6e7186',
          600: '#585b6d',
          700: '#454857',
          800: '#2e303b',
          900: '#1a1b22',
        },
        // Sneaker-inspired accent colors
        'sneaker-blue': '#3b82f6',
        'sneaker-purple': '#8b5cf6',
        'sneaker-pink': '#ec4899',
      },
      animation: {
        'bounce-once': 'bounce 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'sneaker': '0 4px 14px 0 rgba(59, 130, 246, 0.3)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {
      opacity: ['disabled'],
      cursor: ['disabled'],
      backgroundColor: ['active', 'disabled'],
      textColor: ['active', 'disabled'],
    },
  },
  plugins: [],
}