/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#060d09',
          900: '#0e2117',
          850: '#12291d',
          800: '#163324',
          700: '#1f4531',
          600: '#2c5840',
        },
        sage: {
          300: '#bef264',
          400: '#a3e635',
          500: '#8cb85c',
          600: '#65a30d',
          700: '#4d7c0f',
        },
        porcelain: {
          50: '#faf9f5',
          100: '#f5f4ef',
          200: '#eae7df',
          300: '#dedad0',
          800: '#232b26',
          900: '#151c17',
        },
        dark: {
          950: '#06080e',
          900: '#0a0e17',
          850: '#0f1624',
          800: '#151d30',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        }
      },
      fontFamily: {
        script: ['"Pinyon Script"', '"Alex Brush"', 'cursive'],
        editorial: ['"Playfair Display"', 'serif'],
        spartan: ['"League Spartan"', 'sans-serif'],
        jakarta: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'lofy-card': '0 20px 45px -15px rgba(20, 33, 23, 0.12)',
        'lofy-hover': '0 25px 50px -12px rgba(20, 33, 23, 0.22)',
        'framer-btn': '0 0 20px 2px rgba(6, 182, 212, 0.55)',
        'framer-card': '0 20px 80px rgba(0, 0, 0, 0.35)',
        'framer-modal': '0 12px 40px rgba(0, 0, 0, 0.48)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
