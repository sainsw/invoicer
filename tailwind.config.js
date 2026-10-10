/** @type {import('tailwindcss').Config} */

// Colours are CSS variables (RGB triplets, see globals.css) so light/dark follows the system
// without per-class dark: variants.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'media',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        sheet: token('sheet'),
        well: token('well'),
        field: token('field'),
        ink: {
          DEFAULT: token('ink'),
          2: token('ink-2'),
          3: token('ink-3'),
        },
        rule: {
          DEFAULT: token('rule'),
          strong: token('rule-strong'),
        },
        edge: token('edge'),
        accent: {
          DEFAULT: token('accent'),
          ink: token('accent-ink'),
          soft: token('accent-soft'),
        },
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
        },
        warn: {
          ink: token('warn-ink'),
          soft: token('warn-soft'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // A sheet of paper resting on the desk: tight contact shadow plus a soft lift.
        sheet: '0 1px 0 rgb(var(--shadow) / 0.06), 0 1px 2px rgb(var(--shadow) / 0.08), 0 12px 32px -12px rgb(var(--shadow) / 0.18)',
        lift: '0 2px 4px rgb(var(--shadow) / 0.10), 0 18px 40px -16px rgb(var(--shadow) / 0.30)',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(110%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(110%)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        // Opens a grid wrapper from zero height; the child needs min-h-0 + overflow-hidden.
        'expand-in': {
          '0%': { gridTemplateRows: '0fr', opacity: '0' },
          '100%': { gridTemplateRows: '1fr', opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'digit-roll': {
          '0%': { opacity: '0', transform: 'translateY(0.55em)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        stamp: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(0.95) rotate(-0.6deg)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.25, 0.9, 0.3, 1.1) forwards',
        'slide-out-right': 'slide-out-right 0.25s cubic-bezier(0.5, 0, 0.75, 0.75) forwards',
        'fade-in': 'fade-in 0.2s ease-out forwards',
        'fade-out': 'fade-out 0.2s ease-in forwards',
        'expand-in': 'expand-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'pop-in': 'pop-in 0.16s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'rise-in': 'rise-in 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'digit-roll': 'digit-roll 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both',
        stamp: 'stamp 0.28s ease-out',
      },
    },
  },
  plugins: [],
};
