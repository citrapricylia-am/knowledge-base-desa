/**
 * Uji mesin diagnosis — npx tsx scripts/uji_diagnosis.ts
 *
 * Yang dijaga: alokasi program selalu berjumlah persis = anggaran,
 * prioritas mengikuti keparahan temuan, jarak ke status IDM berikutnya
 * benar, dan angka di diagnosis cocok dengan rumus estimasi biaya.
 */
import assert from 'node:assert/strict';
import { diagnosaDesa, posisiIdm, kumpulkanTemuan } from '../src/lib/diagnosis';
import { rincianEstimasiBiaya } from '../src/lib/analisis';
import { getTier, buildTemplateNarasi, desaToLlmData, ringkasDiagnosis } from '../src/lib/llm';
import type { Desa } from '../src/lib/types';

let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`  ok  ${nama}`);
}

// Angka dari Postgres numeric datang sebagai string — sengaja dicampur.
const desa = {
  kode_bps: '1101012001',
  nama_desa: 'Keude Bakongan',
  nama_kecamatan: 'Bakongan',
  nama_kabupaten: 'Aceh Selatan',
  nama_provinsi: 'Aceh',
  idm: '0.6512',
  iks: '0.7600',
  ike: '0.6600',
  ikl: '0.5333',
  jumlah_jiwa: 2291,
  jumlah_rt: 619,
  klasifikasi_podes: 'MODERATE',
  ada_sd: 1,
  ada_smp: 0,
  ada_faskes: 0,
  pct_air_bersih: '23.80',
  pct_rumah_miskin: '12.40',
  pct_smp_plus: '45.00',
  pct_pertanian: '70.00',
  luas_admin_ha: '184.1',
  lahan_kritis_ha: '40',
} as unknown as Desa;

const kegiatanPerKey = {
  community_governance: ['Pelatihan aparatur desa, sistem informasi desa digital'],
  water_system: ['Pengadaan pompa, filter, tangki penampung komunal'],
  health_infrastructure: ['Pengadaan peralatan medis standar, kendaraan operasional'],
  monitoring: ['Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'],
};

const estimasi = rincianEstimasiBiaya(desa).total;

uji('posisi IDM: status, selisih ke berikutnya, dan pilar terlemah benar', () => {
  const p = posisiIdm(desa)!;
  assert.equal(p.status, 'BERKEMBANG');
  assert.equal(p.statusBerikut, 'MAJU');
  assert.ok(Math.abs(p.selisihKeBerikut - (0.7072 - 0.6512)) < 1e-9);
  assert.equal(p.pilarTerlemah, 'ikl');
  // Hanya pilar terlemah yang naik → butuh 3× selisih IDM
  assert.ok(Math.abs((p.kenaikanPilarTerlemah ?? 0) - 3 * (0.7072 - 0.6512)) < 1e-9);
  assert.match(p.penjelasan, /0,0560/);
});

uji('posisi IDM: kenaikan mustahil di satu pilar → null, bukan angka > 1', () => {
  const p = posisiIdm({ ...desa, idm: 0.2, iks: 0.9, ike: 0.1, ikl: 0.1 } as unknown as Desa)!;
  assert.equal(p.statusBerikut, 'TERTINGGAL');
  // 3 × (0,4907 − 0,2) = 0,87 ≤ 1 − 0,1 → masih mungkin
  assert.notEqual(p.kenaikanPilarTerlemah, null);
  const q = posisiIdm({ ...desa, idm: 0.1, iks: 0.1, ike: 0.1, ikl: 0.1 } as unknown as Desa)!;
  // 3 × 0,3907 = 1,17 > 0,9 → tidak bisa lewat satu pilar
  assert.equal(q.kenaikanPilarTerlemah, null);
});

uji('temuan: masalah diurut paling parah dulu, kekuatan di belakang', () => {
  const t = kumpulkanTemuan(desa, posisiIdm(desa));
  const iPertamaKekuatan = t.findIndex((x) => x.jenis === 'kekuatan');
  assert.ok(t.slice(0, iPertamaKekuatan).every((x) => x.jenis === 'masalah'));
  assert.equal(t[0].tingkat, 'kritis'); // air bersih 23,8%
  assert.equal(t[0].id, 'air');
  assert.ok(t.some((x) => x.id === 'faskes'));
  assert.ok(t.some((x) => x.id === 'lahan_kritis')); // 40/184 ha ≈ 21,7%
  assert.ok(t.some((x) => x.id === 'pilar_iks' && x.jenis === 'kekuatan'));
});

for (const anggaran of [37_000_000, 100_000_000, 999_999_999, 4_321_000_123]) {
  uji(`alokasi berjumlah persis = anggaran (Rp ${anggaran.toLocaleString('id-ID')})`, () => {
    const tier = getTier((anggaran / estimasi) * 100);
    const d = diagnosaDesa(desa, anggaran, estimasi, tier, kegiatanPerKey);
    const total = d.program.reduce((a, p) => a + p.alokasi, 0);
    assert.equal(total, anggaran);
    assert.ok(d.program.every((p) => p.alokasi >= 0));
  });
}

uji('prioritas: air bersih (kritis) di atas tata kelola; monitoring selalu terakhir', () => {
  const d = diagnosaDesa(desa, 500_000_000, estimasi, 'MEDIUM', kegiatanPerKey);
  assert.equal(d.program[0].key, 'water_system');
  assert.equal(d.program[0].urgensi, 'mendesak');
  assert.equal(d.program.at(-1)!.key, 'monitoring');
  assert.deepEqual(d.program.map((p) => p.prioritas), [1, 2, 3, 4]);
  // alokasi terbesar untuk prioritas #1
  assert.ok(d.program[0].alokasi >= d.program[1].alokasi);
});

uji('tier fisik: jangkauan air memakai biaya satuan yang sama dengan rumus estimasi', () => {
  const d = diagnosaDesa(desa, 3_000_000_000, estimasi, 'MAJOR', kegiatanPerKey);
  const air = d.program.find((p) => p.key === 'water_system')!;
  const rtTanpa = Math.round(619 * (1 - 23.8 / 100));
  const sambungan = Math.min(rtTanpa, Math.floor(air.alokasi / 5_000_000));
  assert.ok(air.jangkauan?.includes(sambungan.toLocaleString('id-ID')), air.jangkauan ?? '');
  assert.equal(air.langkah[0].startsWith('Survei sumber air'), true);
});

uji('tanpa Podes: tidak ada program/tahapan, tapi temuan & catatan data tetap ada', () => {
  const tanpa = { ...desa, klasifikasi_podes: null } as unknown as Desa;
  const d = diagnosaDesa(tanpa, 100_000_000, estimasi, 'SMALL', {});
  assert.equal(d.program.length, 0);
  assert.equal(d.tahapan.length, 0);
  assert.ok(d.temuan.length > 0);
  assert.ok(d.catatanData.some((c) => c.includes('Skor Podes')));
});

uji('template fallback memakai diagnosis: spesifik, tidak generik', () => {
  const d = diagnosaDesa(desa, 500_000_000, estimasi, 'MEDIUM', kegiatanPerKey);
  const n = buildTemplateNarasi(
    { ...desaToLlmData(desa), estimasi_biaya: estimasi },
    500_000_000,
    Object.values(kegiatanPerKey).flat(),
    d,
  );
  assert.equal(n.rekomendasi.length, d.program.length);
  assert.equal(n.rekomendasi[0].judul, d.program[0].bidang);
  assert.ok(!n.rekomendasi[0].poin.some((p) => p.includes('Sesuaikan detail pelaksanaan')));
  assert.match(n.posisi_anggaran, /Air bersih & sanitasi Rp/);
});

uji('ringkasan diagnosis untuk prompt memuat program & alokasi', () => {
  const d = diagnosaDesa(desa, 500_000_000, estimasi, 'MEDIUM', kegiatanPerKey);
  const teks = ringkasDiagnosis(d);
  assert.match(teks, /PROGRAM BERPRIORITAS/);
  assert.match(teks, /1\. Air bersih & sanitasi — alokasi Rp/);
  assert.ok(!/\d\.\d{4}/.test(teks), 'angka desimal harus koma, bukan titik');
});

console.log(`\n${lulus} uji lulus`);
