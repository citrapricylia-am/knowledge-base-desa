/**
 * Uji gerbang email + rate limit.
 * Jalankan: npx tsx scripts/uji_batas.ts
 */
import assert from 'node:assert/strict';

async function jalan() {
  // ── Daftar email ────────────────────────────────────────────────────
  process.env.EMAIL_DIIZINKAN =
    'citra@madaniberkelanjutan.id, Admin@Madaniberkelanjutan.id';
  // Import setelah env diset — modul membaca env saat fungsi dipanggil,
  // tapi urutan ini tetap paling aman kalau nanti di-cache.
  const { emailDiizinkan, cekKuota } = await import('../src/lib/batas');

  assert.equal(
    emailDiizinkan('citra@madaniberkelanjutan.id'),
    'citra@madaniberkelanjutan.id',
    'email di daftar harus lolos',
  );
  assert.equal(
    emailDiizinkan('  CITRA@Madaniberkelanjutan.ID  '),
    'citra@madaniberkelanjutan.id',
    'spasi dan huruf besar harus dinormalkan',
  );
  assert.equal(
    emailDiizinkan('admin@madaniberkelanjutan.id'),
    'admin@madaniberkelanjutan.id',
    'entri daftar berhuruf besar harus tetap cocok',
  );
  // Inti perbaikan: email karangan di domain yang sama HARUS ditolak.
  assert.equal(
    emailDiizinkan('orang.asing.random.xyz123@madaniberkelanjutan.id'),
    null,
    'email karangan di domain yang diizinkan harus ditolak',
  );
  assert.equal(emailDiizinkan('citra@gmail.com'), null, 'domain luar ditolak');
  assert.equal(emailDiizinkan('bukan-email'), null, 'tanpa @ ditolak');
  assert.equal(emailDiizinkan(''), null, 'kosong ditolak');
  assert.equal(emailDiizinkan('a@b'), null, 'terlalu pendek ditolak');
  console.log('  ok  daftar email: hanya alamat terdaftar yang lolos');

  // Env kosong = jatuh ke cek domain (jangan sampai situs mati total)
  process.env.EMAIL_DIIZINKAN = '';
  assert.equal(
    emailDiizinkan('siapa.saja@madaniberkelanjutan.id'),
    'siapa.saja@madaniberkelanjutan.id',
    'tanpa env, cek domain tetap jalan',
  );
  assert.equal(emailDiizinkan('siapa.saja@gmail.com'), null);
  console.log('  ok  tanpa env, gerbang jatuh ke cek domain (tidak mati)');

  // ── Rate limit ──────────────────────────────────────────────────────
  for (let i = 1; i <= 3; i++) {
    assert.equal(cekKuota('uji:a', 3, 60), null, `panggilan ke-${i} harus lolos`);
  }
  const ditolak = cekKuota('uji:a', 3, 60);
  assert.ok(
    typeof ditolak === 'number' && ditolak > 0,
    'panggilan ke-4 harus ditolak dengan sisa detik',
  );
  assert.ok(ditolak <= 60, 'sisa tunggu tidak boleh lebih dari jendela');
  console.log('  ok  rate limit memblokir setelah kuota habis');

  // IP lain tidak terpengaruh
  assert.equal(cekKuota('uji:b', 3, 60), null, 'kunci lain punya kuota sendiri');
  console.log('  ok  kuota dihitung per kunci (per IP), tidak global');

  // Jendela habis = kuota pulih
  assert.equal(cekKuota('uji:c', 1, 1), null);
  assert.ok(cekKuota('uji:c', 1, 1) !== null, 'harus terblokir dulu');
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(cekKuota('uji:c', 1, 1), null, 'kuota pulih setelah jendela habis');
  console.log('  ok  kuota pulih sendiri setelah jendela waktu lewat');

  console.log('\n6 uji lulus');
}

jalan().catch((err) => {
  console.error('GAGAL:', err.message);
  process.exit(1);
});
