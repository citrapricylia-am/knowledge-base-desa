/**
 * Uji pemecah paragraf narasi — npx tsx scripts/uji_pecah_paragraf.ts
 *
 * Bug yang memicu ini: regex lama /[^.!?]+[.!?]+/ menganggap titik
 * desimal sebagai akhir kalimat, sehingga "IDM 0.7444" tampil sebagai
 * "IDM 0." lalu blok baru " 7444" — angka rusak di layar.
 */
import assert from 'node:assert';

function pecahParagraf(teks: string): string[] {
  if (!teks) return [''];
  const kalimat: string[] = [];
  let mulai = 0;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (c !== '.' && c !== '!' && c !== '?') continue;
    const sebelumAngka = /\d/.test(teks[i - 1] ?? '');
    const sesudahAngka = /\d/.test(teks[i + 1] ?? '');
    if (sebelumAngka && sesudahAngka) continue;
    let j = i;
    while (j + 1 < teks.length && '.!?'.includes(teks[j + 1])) j++;
    kalimat.push(teks.slice(mulai, j + 1).trim());
    mulai = j + 1;
    i = j;
  }
  const ekor = teks.slice(mulai).trim();
  if (ekor) kalimat.push(ekor);

  const blok: string[] = [];
  let current = '';
  for (const k of kalimat) {
    current += (current ? ' ' : '') + k;
    if (current.length > 180) {
      blok.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) blok.push(current.trim());
  return blok.length ? blok : [teks];
}

let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`  ok  ${nama}`);
}

uji('skor IDM desimal tidak terbelah', () => {
  const hasil = pecahParagraf('Desa ini berstatus MAJU dengan skor IDM 0.7444 pada tahun 2024.');
  assert.ok(hasil.join(' ').includes('0.7444'), `terbelah: ${JSON.stringify(hasil)}`);
});

uji('beberapa desimal dalam satu kalimat', () => {
  const t = 'Pilar lingkungan 0.5333 lebih rendah dari sosial 0.8000 dan ekonomi 0.9000.';
  const hasil = pecahParagraf(t);
  for (const n of ['0.5333', '0.8000', '0.9000']) {
    assert.ok(hasil.join(' ').includes(n), `${n} terbelah`);
  }
});

uji('angka ribuan dengan titik tetap utuh', () => {
  const hasil = pecahParagraf('Jumlah penduduk 2.291 jiwa dalam 619 rumah tangga.');
  assert.ok(hasil.join(' ').includes('2.291'));
});

uji('kalimat normal tetap dipecah di batas panjang', () => {
  const t = 'A'.repeat(100) + '. ' + 'B'.repeat(100) + '. ' + 'C'.repeat(100) + '.';
  const hasil = pecahParagraf(t);
  assert.ok(hasil.length >= 2, 'paragraf panjang harus pecah jadi beberapa blok');
});

uji('kalimat pendek tidak dipecah', () => {
  const hasil = pecahParagraf('Desa ini kecil.');
  assert.strictEqual(hasil.length, 1);
});

uji('teks kosong tidak melempar error', () => {
  assert.deepStrictEqual(pecahParagraf(''), ['']);
});

uji('batas kalimat sebelum kurung tetap dikenali', () => {
  const t = 'Skor rendah. (Data Podes 2025 mencatat hal serupa.)';
  const hasil = pecahParagraf(t);
  assert.ok(hasil.join(' ').includes('Podes 2025'));
});

uji('tidak ada teks yang hilang', () => {
  const t = 'Desa Keude Bakongan berstatus MAJU dengan skor 0.7444. Pilar lingkungan 0.5333 paling lemah. Penduduk 2.291 jiwa.';
  const gabung = pecahParagraf(t).join(' ').replace(/\s+/g, ' ');
  assert.strictEqual(gabung, t.replace(/\s+/g, ' '));
});

console.log(`\n${lulus} uji lulus`);
