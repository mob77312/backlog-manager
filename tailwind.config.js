/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#ffffff',
          surface: '#ffffff',
          elevated: '#ffffff',
          column: '#fafafa',
          tint: '#fdf2f3',
        },
        border: {
          subtle: 'rgba(15,23,42,0.06)',
          DEFAULT: 'rgba(15,23,42,0.1)',
          strong: 'rgba(15,23,42,0.16)',
        },
        pertamina: {
          red: '#E31E24',
          'red-dark': '#B6171C',
          'red-50': '#FDF2F3',
          'red-100': '#FCE3E5',
          'red-200': '#F8C0C4',
          'red-700': '#9F1019',
          blue: '#002F6C',
          green: '#009A4E',
        },
        accent: {
          primary: '#E31E24',
          'primary-dark': '#B6171C',
          secondary: '#002F6C',
          info: '#0ea5e9',
          success: '#059669',
          warning: '#d97706',
          danger: '#E31E24',
          orange: '#ea580c',
        },
        ink: {
          primary: '#0f172a',
          secondary: '#475569',
          tertiary: '#64748b',
          muted: '#94a3b8',
          'on-red': '#ffffff',
        },
        priority: {
          critical: '#E31E24',
          high: '#ea580c',
          medium: '#d97706',
          low: '#059669',
        },
        status: {
          backlog: '#64748b',
          in_progress: '#2563eb',
          review: '#d97706',
          done: '#059669',
          operate: '#0891b2',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 14px rgba(227,30,36,0.30)',
        'glow-danger': '0 0 10px rgba(227,30,36,0.45)',
        'glow-success': '0 0 10px rgba(5,150,105,0.30)',
        card: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.06)',
        'card-hover': '0 6px 18px rgba(15,23,42,0.10), 0 16px 36px rgba(15,23,42,0.10)',
        modal: '0 24px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)',
        'inset-soft': 'inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'slide-in-right': 'slide-in-right 240ms ease-out',
        'slide-out-right': 'slide-out-right 200ms ease-in',
        'fade-in': 'fade-in 180ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'bounce-subtle': 'bounce-subtle 600ms ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: 1 },
          '100%': { transform: 'translateX(20px)', opacity: 0 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.96)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'bounce-subtle': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
