/**
 * Dua pengaman gerbang DesaLens:
 *   1. Daftar email yang diizinkan (bukan cuma cek domain)
 *   2. Rate limit per IP untuk endpoint mahal (gerbang + LLM)
 *
 * ponytail: rate limit disimpan di memori instance, bukan Redis. Di Vercel
 * tiap instance punya hitungan sendiri, jadi penyerang dengan banyak koneksi
 * paralel bisa dapat kuota berkali-kali. Ini tetap menghentikan loop curl
 * sederhana (kasus nyata: pengurasan tagihan LLM). Upgrade ke Upstash Redis
 * kalau situs mulai dapat trafik serius atau ada serangan terdistribusi.
 */

// ── 1. Daftar email ────────────────────────────────────────────────────

const DOMAIN_DIIZINKAN = 'madaniberkelanjutan.id';

/** Email yang boleh masuk, dari env EMAIL_DIIZINKAN (pisah koma). */
function daftarEmail(): string[] {
  return (process.env.EMAIL_DIIZINKAN ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Kembalikan email yang sudah dinormalkan kalau diizinkan, null kalau tidak.
 *
 * Kalau EMAIL_DIIZINKAN diset, HANYA email di daftar itu yang lolos — email
 * karangan di domain yang sama ditolak. Kalau env belum diset, jatuh kembali
 * ke cek domain supaya situs tidak mati mendadak, tapi teriak di log.
 */
export function emailDiizinkan(raw: string): string | null {
  const email = raw.trim().toLowerCase();

  // Validasi bentuk dasar dulu
  if (!email.includes('@') || email.length < 6 || email.length > 254) return null;
  const [local, domain] = email.split('@');
  if (!local || !domain) return null;
  if (!/^[a-z0-9._%+-]+$/i.test(local)) return null;

  const daftar = daftarEmail();
  if (daftar.length === 0) {
    console.warn(
      '[gate] EMAIL_DIIZINKAN belum diset — gerbang jatuh ke cek domain saja, ' +
        'siapa pun bisa mengarang alamat di domain itu. Set EMAIL_DIIZINKAN di Vercel.',
    );
    return domain === DOMAIN_DIIZINKAN ? email : null;
  }

  return daftar.includes(email) ? email : null;
}

// ── 2. Rate limit ──────────────────────────────────────────────────────

type Jejak = { hitung: number; resetPada: number };
const jejak = new Map<string, Jejak>();

/** Buang entri kedaluwarsa supaya Map tidak tumbuh tanpa batas. */
function bersihkan(sekarang: number) {
  if (jejak.size < 5000) return;
  for (const [k, v] of jejak) if (v.resetPada <= sekarang) jejak.delete(k);
}

/** IP pemanggil. Vercel selalu mengisi x-forwarded-for. */
export function ipPemanggil(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'tanpa-ip';
}

/**
 * Catat satu panggilan. Kembalikan null kalau masih dalam kuota, atau
 * jumlah detik yang harus ditunggu kalau sudah lewat batas.
 */
export function cekKuota(
  kunci: string,
  maks: number,
  jendelaDetik: number,
): number | null {
  const sekarang = Date.now();
  bersihkan(sekarang);

  const lama = jejak.get(kunci);
  if (!lama || lama.resetPada <= sekarang) {
    jejak.set(kunci, { hitung: 1, resetPada: sekarang + jendelaDetik * 1000 });
    return null;
  }

  if (lama.hitung >= maks) {
    return Math.ceil((lama.resetPada - sekarang) / 1000);
  }

  lama.hitung += 1;
  return null;
}

/** Balasan 429 seragam, lengkap dengan header Retry-After. */
export function balasanTerlaluSering(detik: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Terlalu banyak permintaan',
      detail: `Coba lagi dalam ${detik} detik.`,
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(detik),
      },
    },
  );
}
