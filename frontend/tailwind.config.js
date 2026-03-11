/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Copernicus/ESA colour palette
        esa: {
          blue: '#003F8A',
          accent: '#0066CC',
          data: '#00A8E0',
        },
        surface: {
          bg: '#F2F4F7',
          card: '#FFFFFF',
        },
        status: {
          success: '#1A7A4A',
          warning: '#B45309',
          critical: '#B91C1C',
        },
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          caption: '#6B7280',
          data: '#1E3A5F',
        },
        border: {
          DEFAULT: '#D1D5DB',
        },
        // Grade colours — colour-blind safe
        grade: {
          excellent: '#1A7A4A',
          good: '#2D9D5C',
          fair: '#B45309',
          poor: '#C2410C',
          critical: '#B91C1C',
          unknown: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Source Sans Pro"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      fontSize: {
        'page-title': ['22px', { lineHeight: '28px', fontWeight: '600' }],
        'section-heading': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'data-value': ['15px', { lineHeight: '20px', fontWeight: '700' }],
        caption: ['12px', { lineHeight: '16px', fontWeight: '400' }],
        label: ['11px', { lineHeight: '16px', fontWeight: '600' }],
      },
      maxWidth: {
        content: '1440px',
      },
      width: {
        sidebar: '240px',
      },
      height: {
        topbar: '56px',
      },
      spacing: {
        card: '20px',
        section: '24px',
      },
      borderRadius: {
        // Max 6px per spec
        DEFAULT: '4px',
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '6px',
        '2xl': '6px',
        full: '9999px',
      },
      boxShadow: {
        // No shadows — use borders only
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
      },
    },
  },
  plugins: [],
};

