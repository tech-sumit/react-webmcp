import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #2563EB)',
        'primary-dark': 'var(--color-primary-dark, #1D4ED8)',
        'primary-light': 'var(--color-primary-light, #3B82F6)',
        accent: 'var(--color-accent, #F59E0B)',
        surface: 'var(--color-surface, #FFFFFF)',
        'surface-dark': 'var(--color-surface-dark, #111827)',
        muted: 'var(--color-muted, #6B7280)',
      },
      fontFamily: {
        heading: ['var(--font-heading, "Inter")', 'system-ui', 'sans-serif'],
        body: ['var(--font-body, "Inter")', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
