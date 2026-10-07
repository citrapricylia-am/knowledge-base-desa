import { NextRequest, NextResponse } from 'next/server';

/**
 * Gerbang akses DesaLens.
 *
 * Aturan: hanya email dengan domain madaniberkelanjutan.id yang boleh
 * masuk. Ini gerbang keanggotaan organisasi, BUKAN autentikasi identitas
 * (siapa pun yang punya email di domain itu bisa masuk — tidak ada
 * verifikasi kepemilikan mailbox). Untuk kebutuhan citra@madaniberkelanjutan.id
 * ini memang cukup; kalau nanti butlu verifikasi nyata, upgrade ke magic link.
 *
 * Sesi: token HMAC signed cookie, httpOnly, 30 hari.
 */

const DOMAIN_DIIZINKAN = 'madaniberkelanjutan.id';
const NAMA_COOKIE = 'dl_gate';
const MASA_SESI_DETIK = 60 * 60 * 24 * 30; // 30 hari

function rahasia(): string {
  // Kunci penandatanganan token. Kalau env tidak diset, turunkan dari
  // nilai tetap + peringatkan lewat console (sesi tetap valid antar restart
  // karena nilainya deterministik — penting supaya user tidak dilogout
  // mendadak saat Vercel redeploy).
  const r = process.env.GATE_SECRET;
  if (r) return r;
  console.warn(
    '[gate] GATE_SECRET tidak diset — memakai kunci default. Set GATE_SECRET di Vercel untuk keamanan sesi.',
  );
  return 'desalens-gate-default-2026';
}

async function tanda(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(rahasia()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buatToken(email: string): Promise<string> {
  const isi = `${email}.${Date.now() + MASA_SESI_DETIK * 1000}`;
  return `${btoa(isi)}.${await tanda(isi)}`;
}

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
  const tandaDiharapkan = await tanda(isi);
  if (tandaDiharapkan !== bag[1]) return false;
  const kedaluwarsa = Number(isi.split('.').pop());
  return Number.isFinite(kedaluwarsa) && Date.now() < kedaluwarsa;
}

function emailValidDanDiizinkan(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  // Validasi format sederhana tanpa regex berat
  if (!email.includes('@') || email.length < 6 || email.length > 254) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  if (!/^[a-z0-9._%+-]+$/i.test(local)) return null;
  if (domain !== DOMAIN_DIIZINKAN) return null;
  return email;
}

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid' }, { status: 400 });
  }

  const email = emailValidDanDiizinkan(String(body.email ?? ''));

  if (!email) {
    // Jeda kecil supaya tidak bisa dipakai enumerasi email secara cepat
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json(
      {
        error: 'Email ditolak',
        detail:
          'Akses hanya untuk email @madaniberkelanjutan.id. Hubungi admin bila Anda anggota Madani Berkelanjutan.',
      },
      { status: 403 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NAMA_COOKIE, await buatToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MASA_SESI_DETIK,
  });
  return res;
}

export async function GET(req: NextRequest) {
  // Cek status sesi untuk client (hero menanyakan: user sudah login?)
  const valid = await tokenValid(req.cookies.get(NAMA_COOKIE)?.value);
  if (valid) return NextResponse.json({ terbuka: true });
  return NextResponse.json({ terbuka: false }, { status: 401 });
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(NAMA_COOKIE);
  return res;
}

// Re-export util untuk middleware (Next 16 middleware tidak bisa impor dari
// route handler bawaan, jadi logika duplikat ringan di middleware.ts)
export { tokenValid, NAMA_COOKIE };
