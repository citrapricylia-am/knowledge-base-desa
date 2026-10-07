/**
 * Uji mandiri rumus estimasi biaya.
 * Jalankan: npx tsx scripts/uji_estimasi.ts
 *
 * Tujuan utama: breakdown yang ditampilkan ke user HARUS bisa
 * direkonstruksi jadi total. Bug 7 Okt: subtotal×multiplier = 2.154.240.000
 * tapi UI menulis "Kebutuhan ideal 2.150.000.000" tanpa menjelaskan
 * pembulatan 50jt -> user melihat angka yang tidak nyambung.
 */
import assert from 'node:assert/strict';
import { rincianEstimasiBiaya, hitungEstimasiBiaya } from '../src/lib/analisis';
import type { Desa } from '../src/lib/types';

function desa(over: Partial<Desa> = {}): Desa {
  return {
    kode_bps: '1101012001',
    nama_desa: 'Uji',
    jumlah_jiwa: 2291,
    jumlah_rt: 619,
    ada_sd: 1,
    ada_smp: 1,
    ada_faskes: 1,
    pct_air_bersih: 97,
    pct_rumah_miskin: 67,
    idm: 0.7444,
    klasifikasi_podes: 'MODERATE',
    ...over,
  } as unknown as Desa;
}

let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`  OK  ${nama}`);
}

console.log('Uji rumus estimasi biaya\n');

uji('komponen dijumlah = subtotal', () => {
  const r = rincianEstimasiBiaya(desa());
  const jml = r.komponen.reduce((a, k) => a + k.nilai, 0);
  assert.equal(jml, r.subtotal);
});

uji('subtotal x multiplier = sebelumPembulatan', () => {
  const r = rincianEstimasiBiaya(desa());
  assert.equal(
    Math.round(r.subtotal * r.idmMultiplier * r.podesMultiplier),
    r.sebelumPembulatan,
  );
});

uji('total adalah kelipatan 50 juta', () => {
  const r = rincianEstimasiBiaya(desa());
  assert.equal(r.total % 50_000_000, 0);
});

uji('total selalu dalam rentang 200jt - 10M', () => {
  for (const jiwa of [0, 1, 500, 100_000, 5_000_000]) {
    const r = rincianEstimasiBiaya(desa({ jumlah_jiwa: jiwa }));
    assert.ok(r.total >= 200_000_000, `terlalu kecil: ${r.total}`);
    assert.ok(r.total <= 10_000_000_000, `terlalu besar: ${r.total}`);
  }
});

uji('hitungEstimasiBiaya == rincian.total (satu sumber kebenaran)', () => {
  for (const idm of [0.3, 0.55, 0.65, 0.9]) {
    const d = desa({ idm });
    assert.equal(hitungEstimasiBiaya(d), rincianEstimasiBiaya(d).total);
  }
});

uji('fasilitas hilang menaikkan biaya', () => {
  const lengkap = rincianEstimasiBiaya(desa()).total;
  const tanpaSd = rincianEstimasiBiaya(desa({ ada_sd: 0 })).total;
  assert.ok(tanpaSd > lengkap, `tanpa SD (${tanpaSd}) harus > lengkap (${lengkap})`);
});

uji('IDM lebih rendah -> biaya lebih tinggi', () => {
  const maju = rincianEstimasiBiaya(desa({ idm: 0.9 })).total;
  const tertinggal = rincianEstimasiBiaya(desa({ idm: 0.4 })).total;
  assert.ok(tertinggal > maju, `tertinggal (${tertinggal}) harus > maju (${maju})`);
});

uji('data null tidak bikin NaN', () => {
  const r = rincianEstimasiBiaya(desa({
    jumlah_jiwa: null, jumlah_rt: null, pct_air_bersih: null,
    pct_rumah_miskin: null, idm: null, klasifikasi_podes: null,
  } as Partial<Desa>));
  assert.ok(Number.isFinite(r.total), `total bukan angka: ${r.total}`);
  assert.ok(Number.isFinite(r.subtotal));
  for (const k of r.komponen) assert.ok(Number.isFinite(k.nilai), `${k.label} NaN`);
});

uji('komponen bernilai 0 tidak ditampilkan (kecuali baseline)', () => {
  const r = rincianEstimasiBiaya(desa({ pct_air_bersih: 100, pct_rumah_miskin: 0 }));
  const nol = r.komponen.filter((k) => k.nilai === 0 && k.label !== 'Baseline demografi');
  assert.equal(nol.length, 0, `ada komponen 0: ${nol.map((k) => k.label).join(', ')}`);
});

console.log(`\n${lulus} uji lulus.`);
