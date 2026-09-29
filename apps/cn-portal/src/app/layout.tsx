import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '选品平台',
  description: '中国卖家上架选品系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-surface-secondary text-gray-900">{children}</body>
    </html>
  );
}
