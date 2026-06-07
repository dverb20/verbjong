import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Suit colors used across tiles and the UI.
        bam: '#1f9d55',
        crak: '#d64545',
        dot: '#2b6cb0',
        felt: '#0f5132',
        'felt-dark': '#0b3a26',
      },
      fontFamily: {
        tile: ['"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 1px 2px rgba(0,0,0,0.25), inset 0 -2px 0 rgba(0,0,0,0.12)',
        'tile-lifted': '0 6px 14px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
} satisfies Config;
