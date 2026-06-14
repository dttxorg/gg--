import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'giffgaff 代理资料库',
  description: '内部资料库 · 文案 / 配图 / 平台话术',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
