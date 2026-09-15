import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '森映後台', template: '%s｜森映後台' },
  description: '森映 Headless 自助建站電商平台：森映官方後台與客戶自助建站後台。',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
