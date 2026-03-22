/**
 * Stitch Design System — "The Digital Atelier"
 *
 * Tailwind config object exported as a string for inline injection.
 * Extracted from stitch mockups + nimbus_admin/DESIGN.md.
 */
export const TAILWIND_CONFIG = `{
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'background':                '#f7f9fb',
        'surface-container-low':     '#f2f4f6',
        'surface-container-lowest':  '#ffffff',
        'surface-container-high':    '#e6e8ea',
        'surface-container-highest': '#e0e3e5',
        'surface-dim':               '#d8dadc',
        'primary':                   '#000000',
        'primary-container':         '#00174b',
        'on-primary':                '#ffffff',
        'on-primary-container':      '#497cff',
        'secondary':                 '#505f76',
        'secondary-container':       '#d0e1fb',
        'on-secondary':              '#ffffff',
        'on-secondary-container':    '#54647a',
        'tertiary':                  '#000000',
        'on-tertiary':               '#ffffff',
        'on-tertiary-container':     '#008cc7',
        'error':                     '#ba1a1a',
        'on-error':                  '#ffffff',
        'error-container':           '#fef2f2',
        'on-surface':                '#191c1e',
        'on-surface-variant':        '#45464d',
        'outline':                   '#76777d',
        'outline-variant':           '#c6c6cd',
      },
      fontFamily: {
        headline: ['Manrope', 'system-ui', 'sans-serif'],
        body:     ['Inter', 'system-ui', 'sans-serif'],
        label:    ['Inter', 'system-ui', 'sans-serif'],
        mono:     ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        'headline-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'headline-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'headline-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'title-lg':    ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600' }],
        'title-md':    ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body-lg':     ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-md':     ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'body-sm':     ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'label-lg':    ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label-md':    ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
        'label-sm':    ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '500' }],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg:      '0.25rem',
        xl:      '0.5rem',
        '2xl':   '0.75rem',
        full:    '9999px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'editorial': '0px 12px 32px rgba(25, 28, 30, 0.04)',
        'editorial-lg': '0px 12px 32px rgba(25, 28, 30, 0.06)',
        'float': '0px 8px 24px rgba(25, 28, 30, 0.08)',
      },
    },
  },
}`;
