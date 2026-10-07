/**
 * Uji pemulihan JSON terpotong — dijalankan dengan: npx tsx scripts/uji_json_terpotong.ts
 *
 * Kasus nyata yang memicu ini: LLM kehabisan token di tengah string,
 * JSON.parse gagal "Unterminated string at position 4249", lalu narasi
 * jatuh ke template generik. Pemulihan menutup bracket supaya narasi
 * AI yang sudah jadi sebagian tetap terpakai.
 */
import assert from 'node:assert';

// Salinan logika dari src/lib/llm.ts (fungsi private, diuji terpisah)
function tutupJsonTerpotong(raw: string): string {
  let s = raw.replace(/,\s*$/, '');
  const kutipGanjil = (s.match(/(?<!\\)"/g)?.length ?? 0) % 2 === 1;
  if (kutipGanjil) s += '"';
  let dalamString = false;
  const tumpukan: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '"' && s[i - 1] !== '\\') dalamString = !dalamString;
    if (dalamString) continue;
    if (c === '{' || c === '[') tumpukan.push(c);
    else if (c === '}' || c === ']') tumpukan.pop();
  }
  while (tumpukan.length) s += tumpukan.pop() === '{' ? '}' : ']';
  return s;
}

let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`  ok  ${nama}`);
}

uji('string terpotong di tengah kalimat', () => {
  const rusak = '{"konteks":"Desa ini berstatus MAJU dengan IDM 0,74 dan tantangan uta';
  const hasil = JSON.parse(tutupJsonTerpotong(rusak));
  assert.ok(hasil.konteks.startsWith('Desa ini berstatus MAJU'));
});

uji('array rekomendasi terpotong', () => {
  const rusak = '{"konteks":"abc","rekomendasi":[{"judul":"Air bersih","poin":["alasan satu"';
  const hasil = JSON.parse(tutupJsonTerpotong(rusak));
  assert.strictEqual(hasil.rekomendasi[0].judul, 'Air bersih');
  assert.strictEqual(hasil.rekomendasi[0].poin[0], 'alasan satu');
});

uji('koma menggantung dibuang', () => {
  const rusak = '{"a":"satu","b":"dua",';
  const hasil = JSON.parse(tutupJsonTerpotong(rusak));
  assert.deepStrictEqual(hasil, { a: 'satu', b: 'dua' });
});

uji('objek bersarang dalam array', () => {
  const rusak = '{"rekomendasi":[{"judul":"A","poin":["x","y"]},{"judul":"B","poin":["z';
  const hasil = JSON.parse(tutupJsonTerpotong(rusak));
  assert.strictEqual(hasil.rekomendasi.length, 2);
  assert.strictEqual(hasil.rekomendasi[1].poin[0], 'z');
});

uji('kurung di dalam string tidak dihitung', () => {
  const rusak = '{"konteks":"anggaran (Rp 500 juta) hanya menutup 23% [sebagian]';
  const hasil = JSON.parse(tutupJsonTerpotong(rusak));
  assert.ok(hasil.konteks.includes('(Rp 500 juta)'));
  assert.ok(hasil.konteks.includes('[sebagian]'));
});

uji('JSON utuh tidak dirusak', () => {
  const utuh = '{"konteks":"lengkap","rekomendasi":[]}';
  assert.strictEqual(tutupJsonTerpotong(utuh), utuh);
});

uji('escape quote tidak membingungkan penghitung', () => {
  const rusak = '{"konteks":"desa \\"Suka Maju\\" berstatus MAJU dan masih';
  const hasil = JSON.parse(tutupJsonTerpotong(rusak));
  assert.ok(hasil.konteks.includes('"Suka Maju"'));
});

console.log(`\n${lulus} uji lulus`);
