/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'monospace']
      },
      colors: {
        surface: {
          0: '#0a0a0a',
          1: '#111111',
          2: '#1a1a1a',
          3: '#222222',
          4: '#2a2a2a'
        },
        border: '#2a2a2a',
        muted: '#666666',
        accent: {
          DEFAULT: '#8b5cf6',
          hover: '#7c3aed',
          muted: 'rgba(139, 92, 246, 0.12)'
        }
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out'
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
}
