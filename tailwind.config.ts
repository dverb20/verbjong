import type { Config } from 'tailwindcss';

// A soft "Japanese garden" palette: washi-paper creams, cherry-blossom pinks,
// matcha greens, warm koi orange, and a calm indigo — gentle and warm, never
// harsh white (easy on the eyes at night).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        washi: { soft: '#fbf7ef', DEFAULT: '#f3ead9', deep: '#e7d8bf' },
        sakura: { soft: '#f8dde7', DEFAULT: '#eca4bf', deep: '#d97a9c' },
        matcha: { soft: '#d7e4c5', DEFAULT: '#8aa86f', deep: '#5f7d4a' },
        koi: { DEFAULT: '#e08b4f', deep: '#c46a30' },
        sora: { soft: '#cdd9ec', DEFAULT: '#7790b6', deep: '#52688f' },
        sumi: { soft: '#6f6358', DEFAULT: '#4a4039', deep: '#332c27' },
        // Softened, garden-friendly suit colours for the tiles.
        bam: '#5f8a4f',
        crak: '#bf5a50',
        dot: '#4f6f9c',
      },
      fontFamily: {
        display: ['"Hiragino Sans"', '"Yu Gothic"', 'system-ui', 'sans-serif'],
        body: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        tile: '0 2px 4px rgba(74,64,57,0.18), inset 0 -2px 0 rgba(74,64,57,0.08)',
        'tile-lifted': '0 8px 18px rgba(74,64,57,0.28)',
        soft: '0 6px 20px rgba(74,64,57,0.12)',
        petal: '0 2px 10px rgba(217,122,156,0.25)',
      },
      backgroundImage: {
        'washi-grain':
          'radial-gradient(circle at 1px 1px, rgba(74,64,57,0.05) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
} satisfies Config;
