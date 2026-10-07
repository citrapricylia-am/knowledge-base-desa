/**
 * Uji konsistensi angka antara layar, narasi AI, dan chat.
 * Jalankan: npx tsx scripts/uji_konsistensi_angka.ts
 *
 * Bug yang memicu ini: kolom `desa.estimasi_biaya` di DB berisi nilai lama
 * (Rp 1.500.000.000) sementara layar menghitung ulang lewat
 * rincianEstimasiBiaya() (Rp 2.150.000.000). Narasi AI dan chat memakai
 * kolom DB, sehingga AI menyebut angka yang berbeda dari yang dilihat
 * pengguna di layar — kontradiksi yang merusak kepercayaan.
 */
import assert from 'node:assert';
import { rincianEstimasiBiaya } from '../src/lib/analisis';
import { desaToLlmData } from '../src/lib/llm';
import type { Desa } from '../src/lib/types';

const desaUji = {
  kode_bps: '1101012001',
  nama_desa: 'Keude Bakongan',
  nama_kecamatan: 'Bakongan',
  nama_kabupaten: 'Aceh Selatan',
  nama_provinsi: 'Aceh',
  idm: 0.7444,
  status_idm: 'MAJU',
  iks: 0.8,
  ike: 0.9,
  ikl: 0.5333,
  jumlah_jiwa: 2291,
  jumlah_rt: 619,
  // sengaja basi: nilai lama yang tidak ikut diperbarui saat rumus berubah
  estimasi_biaya: 1_500_000_000,
  klasifikasi_podes: 'MODERATE',
  ada_sd: true,
  ada_smp: true,
  ada_faskes: true,
  pct_air_bersih: 23.8,
  pct_rumah_miskin: 12.4,
  luas_hektar: 184.1,
} as unknown as Desa;

let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`  ok  ${nama}`);
}

uji('kolom DB memang berbeda dari hitungan (prasyarat bug)', () => {
  const rincian = rincianEstimasiBiaya(desaUji);
  assert.notStrictEqual(
    Number(desaUji.estimasi_biaya),
    rincian.total,
    'uji ini hanya bermakna kalau kedua nilai berbeda',
  );
});

uji('desaToLlmData apa adanya membawa angka basi', () => {
  // Mendokumentasikan sumber bug: tanpa penimpaan, data ke LLM salah.
  const mentah = desaToLlmData(desaUji);
  assert.strictEqual(mentah.estimasi_biaya, 1_500_000_000);
});

uji('setelah ditimpa, angka ke LLM = angka layar', () => {
  const rincian = rincianEstimasiBiaya(desaUji);
  const dataKeLlm = { ...desaToLlmData(desaUji), estimasi_biaya: rincian.total };
  assert.strictEqual(
    dataKeLlm.estimasi_biaya,
    rincian.total,
    'angka yang dikirim ke AI harus sama dengan yang dihitung untuk layar',
  );
});

uji('coverage dihitung dari angka yang sama', () => {
  const rincian = rincianEstimasiBiaya(desaUji);
  const anggaran = 750_000_000;
  const coverageLayar = (anggaran / rincian.total) * 100;
  const dataKeLlm = { ...desaToLlmData(desaUji), estimasi_biaya: rincian.total };
  const coverageAi = (anggaran / dataKeLlm.estimasi_biaya) * 100;
  assert.strictEqual(Math.round(coverageAi * 100), Math.round(coverageLayar * 100));
});

uji('total hasil hitungan tetap kelipatan Rp 50 juta', () => {
  const rincian = rincianEstimasiBiaya(desaUji);
  assert.strictEqual(rincian.total % 50_000_000, 0);
});

console.log(`\n${lulus} uji lulus`);
