import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import './globals.css';

export const metadata: Metadata = {
  title: t('app.title'),
  description: t('app.description'),
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
