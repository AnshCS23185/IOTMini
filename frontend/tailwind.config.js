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
        background: 'var(--background)',
        surface: 'var(--surface)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        border: 'var(--border)',
        
        // PanelIQ Final Palette
        'deep-brown': '#3B2823',
        'solar-orange': '#D59D80',
        peach: '#F1C6B3',
        lavender: '#C6C0D0',
        'deep-teal': '#104C64',
        'sage-teal': '#6C8F8A',

        // Status Colors
        status: {
          healthy: '#6C8F8A', // Using Sage Teal
          attention: '#D59D80', // Using Solar Orange
          underperforming: '#F1C6B3', // Using Peach
          offline: '#3B2823', // Using Deep Brown
          error: '#ef4444', 
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Nohemi', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        small: ['0.875rem', { lineHeight: '1.25rem' }],
        medium: ['1rem', { lineHeight: '1.5rem' }],
        large: ['1.5rem', { lineHeight: '2rem' }],
      }
    },
  },
  plugins: [],
}
