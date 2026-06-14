import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // 复用 giffgaff 销售页的设计 token
        bg: '#faf6ee',
        'bg-2': '#f0e9dc',
        paper: '#ffffff',
        'paper-2': '#fdf8f0',
        soft: '#ffefe0',
        'soft-2': '#fff7eb',
        ink: '#1a1530',
        'ink-2': '#2d2647',
        muted: '#6b5f7d',
        line: '#e8dfd0',
        'line-2': '#d9cdb8',
        primary: { DEFAULT: '#4338ca', dark: '#3730a3', deep: '#1e1b4b' },
        accent: { DEFAULT: '#ea580c', 2: '#fb923c', 3: '#f59e0b' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 4px 18px rgba(30, 27, 75, 0.08)',
        DEFAULT: '0 18px 54px rgba(30, 27, 75, 0.16)',
        lg: '0 28px 80px rgba(30, 27, 75, 0.24)',
        warm: '0 18px 48px rgba(234, 88, 12, 0.18)',
      },
      borderRadius: { sm: '12px', DEFAULT: '18px', lg: '22px' },
    },
  },
  plugins: [],
};
export default config;
