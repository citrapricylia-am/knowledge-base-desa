import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Knowledge Base Potensi Desa',
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
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md sticky top-0 z-40">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
            <Link href="/" className="font-semibold text-slate-100 tracking-tight">
              KB <span className="text-emerald-400">Potensi Desa</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-400">
              <Link href="/" className="hover:text-emerald-300 transition-colors">
                Analisis
              </Link>
              <Link href="/cakupan" className="hover:text-emerald-300 transition-colors">
                Cakupan data
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
