/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Mono"', 'monospace'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      colors: {
        // Dark industrial base
        void:    '#0a0c0f',
        surface: '#111318',
        panel:   '#181c22',
        border:  '#252a33',
        muted:   '#3a404d',

        // Text
        text: {
          primary:   '#e8eaf0',
          secondary: '#8b92a5',
          dim:       '#555d6e',
        },

        // Accent — amber/amber-orange (risk/fragility theme)
        amber: {
          DEFAULT: '#f59e0b',
          dim:     '#92600a',
          glow:    '#fbbf24',
        },

        // Status colors
        critical: '#ef4444',
        warning:  '#f97316',
        stable:   '#22c55e',
        info:     '#3b82f6',

        // SFI score bands
        risk: {
          low:    '#22c55e',
          medium: '#f59e0b',
          high:   '#ef4444',
        },
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(37,42,51,0.4) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37,42,51,0.4) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid-sm': '24px 24px',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.5s ease forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'score-fill': 'scoreFill 1.2s ease forwards',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scoreFill: { from: { strokeDashoffset: '283' }, to: {} },
      },
      boxShadow: {
        'amber-glow': '0 0 20px rgba(245,158,11,0.15)',
        'panel':      '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(37,42,51,0.6)',
      },
    },
  },
  plugins: [],
}
