import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n/client';
import { getLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Admin - Creator Commerce',
  description: 'Creator Commerce Admin Dashboard',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale === 'zh' ? 'zh-CN' : 'en'}>
      <body className="bg-surface-secondary text-gray-900">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
