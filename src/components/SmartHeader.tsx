'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SmartHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  if (isHome) {
    return (
      <header className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-white tracking-tight">
            <span className="text-lg">DesaLens</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-white/60">
            <Link href="/cakupan" className="hover:text-white transition-colors">
              Cakupan data
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="print-hide sticky top-0 z-50 border-b border-white/5"
      style={{
        background: 'rgba(10, 11, 15, 0.7)',
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
      }}
    >
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-semibold text-white tracking-tight">
          <span className="text-lg">DesaLens</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm text-white/50">
          <Link href="/cakupan" className="hover:text-white transition-colors">
            Cakupan data
          </Link>
        </nav>
      </div>
    </header>
  );
}
