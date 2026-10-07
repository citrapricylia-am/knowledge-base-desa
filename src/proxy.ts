import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Gerbang akses DesaLens (Next 16: middleware -> proxy).
 *
 * Hanya pemegang cookie sesi valid (login email @madaniberkelanjutan.id)
 * yang boleh membuka halaman selain beranda. Beranda selalu terbuka
 * supaya orang bisa melihat intro dulu; form analisis (section 2) tetap
 * butuh login — dikuasai client-side di page.tsx.
 *
 * CATATAN KEAMANAN: proxy bisa dilewati lewat manipulasi client-side;
 * API analisis TIDAK dilindungi di sini (dipakai halaman hasil lewat
 * browser user). Kalau butuh keamanan sungguhan, verifikasi cookie juga
 * di dalam tiap route handler — pola yang direkomendasikan dokuen Next.
 * Untuk sekarang: gerbang UI sudah sesuai kebutuhan klien.
 */

const NAMA_COOKIE = 'dl_gate';
// Halaman yang terbuka tanpa login: beranda + cakupan data + endpoint gerbang
const RUTE_TERBUKA = ['/', '/cakupan', '/api/gate'];

async function tokenValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const bag = token.split('.');
  if (bag.length !== 2) return false;
  let isi: string;
  try {
    isi = atob(bag[0]);
  } catch {
    return false;
  }
  const rahasia =
    process.env.GATE_SECRET ?? 'desalens-gate-default-2026';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(rahasia),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(isi));
  const tanda = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (tanda !== bag[1]) return false;
  const kedaluwarsa = Number(isi.split('.').pop());
  return Number.isFinite(kedaluwarsa) && Date.now() < kedaluwarsa;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Halaman terbuka: beranda + endpoint gerbang sendiri
  if (RUTE_TERBUKA.some((r) => pathname === r)) {
    return NextResponse.next();
  }

  // Sudah login? Lewat.
  if (await tokenValid(request.cookies.get(NAMA_COOKIE)?.value)) {
    return NextResponse.next();
  }

  // Aset statis jangan diblokir (hero-poster, dll) — biarkan 404 alami
  // daripada redirect yang merusak.
  if (pathname.startsWith('/_next') || pathname.startsWith('/hero-poster')) {
    return NextResponse.next();
  }

  // API cakupan terbuka untuk publik (dipakai halaman /cakupan)
  if (pathname === '/api/cakupan') {
    return NextResponse.next();
  }

  // API lain: balas 401 (jangan redirect — bukan HTML)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Akses ditolak — login dulu' }, { status: 401 });
  }

  // Halaman lain: tolak, kembali ke beranda.
  // Pakai cookie sementara (bukan URL param) supaya URL tetap bersih
  // dan user mendapat notifikasi di beranda.
  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.set('dl_notice', 'perlu-login', {
    httpOnly: false,
    path: '/',
    maxAge: 30, // cukup untuk halaman dimuat, lalu hilang sendiri
  });
  return res;
}

export const config = {
  // Jalankan untuk semua rute KECUALI aset statis internal
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
