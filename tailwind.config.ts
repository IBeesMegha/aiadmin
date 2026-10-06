import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        theme: {
          primary: 'var(--primary-color)',
          secondary: 'var(--secondary-color)',
          accent: 'var(--accent-color)',
          success: 'var(--success-color)',
          warning: 'var(--warning-color)',
          error: 'var(--error-color)',
          bg: 'var(--background-color)',
          card: 'var(--card-background-color)',
          sidebar: 'var(--sidebar-background-color)',
          header: 'var(--header-background-color)',
          text: 'var(--text-color)',
          border: 'var(--border-color)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
