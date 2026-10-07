import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SmartHeader } from '@/components/SmartHeader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DesaLens — Knowledge Base Potensi Desa',
  description:
    'Sistem penyaringan investasi sosial berbasis data Podes 2025 dan IDM 2024 untuk 83.379 desa/kelurahan Indonesia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-neutral-900">
        <SmartHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
