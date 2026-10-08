/**
 * Uji logika sandbox anggaran — npx tsx scripts/uji_sandbox.ts
 *
 * Sandbox menampilkan cakupan, tingkat intervensi, dan sisa kekurangan
 * saat pengguna menggeser anggaran. Yang diuji di sini: ambang tier
 * konsisten dengan cakupan, batas slider masuk akal, dan hitungan
 * "masih kurang" tidak pernah negatif.
 */
import assert from 'node:assert';
import { getTier } from '../src/lib/llm';

const MIN = 50_000_000;
const MAKS = 10_000_000_000;

/** Batas atas slider — disalin dari SandboxAnggaran.tsx */
function batasAtasSlider(kebutuhanIdeal: number): number {
  return Math.min(MAKS, Math.max(kebutuhanIdeal * 1.5, MIN * 4));
}

/** Sisa kekurangan — disalin dari SandboxAnggaran.tsx */
function kekurangan(kebutuhanIdeal: number, anggaran: number): number {
  return Math.max(0, kebutuhanIdeal - anggaran);
}

function cakupan(anggaran: number, ideal: number): number {
  return ideal > 0 ? (anggaran / ideal) * 100 : 0;
}

let lulus = 0;
function uji(nama: string, fn: () => void) {
  fn();
  lulus++;
  console.log(`  ok  ${nama}`);
}

const IDEAL = 2_150_000_000;

uji('cakupan naik saat anggaran digeser naik', () => {
  const urut = [100_000_000, 500_000_000, 1_000_000_000, 2_150_000_000, 3_000_000_000];
  const nilai = urut.map((a) => cakupan(a, IDEAL));
  for (let i = 1; i < nilai.length; i++) {
    assert.ok(nilai[i] > nilai[i - 1], `cakupan harus naik di langkah ${i}`);
  }
});

uji('tingkat intervensi ikut berubah, bukan statis', () => {
  const tiers = [100_000_000, 500_000_000, 2_150_000_000].map((a) =>
    getTier(cakupan(a, IDEAL)),
  );
  assert.strictEqual(new Set(tiers).size, 3, `tier harus berbeda: ${tiers.join(',')}`);
});

uji('anggaran = kebutuhan ideal menghasilkan cakupan 100% dan tier tertinggi', () => {
  assert.strictEqual(cakupan(IDEAL, IDEAL), 100);
  assert.strictEqual(getTier(100), 'FULL');
});

uji('cakupan di atas 100% tetap FULL (tidak melempar / tidak kosong)', () => {
  assert.strictEqual(getTier(cakupan(3_000_000_000, IDEAL)), 'FULL');
});

uji('kekurangan nol saat anggaran menutup kebutuhan', () => {
  assert.strictEqual(kekurangan(IDEAL, IDEAL), 0);
  assert.strictEqual(kekurangan(IDEAL, IDEAL + 500_000_000), 0, 'tidak boleh negatif');
});

uji('kekurangan benar saat anggaran di bawah kebutuhan', () => {
  assert.strictEqual(kekurangan(IDEAL, 750_000_000), 1_400_000_000);
});

uji('batas slider memberi ruang di atas kebutuhan ideal', () => {
  const batas = batasAtasSlider(IDEAL);
  assert.ok(batas > IDEAL, 'pengguna harus bisa menggeser melewati kebutuhan ideal');
  assert.ok(batas <= MAKS);
});

uji('desa dengan kebutuhan sangat kecil tetap punya slider yang bisa digeser', () => {
  const batas = batasAtasSlider(60_000_000);
  assert.ok(batas >= MIN * 4, 'slider tidak boleh mentok di titik awal');
  assert.ok(batas > MIN);
});

uji('kebutuhan ideal sangat besar tidak melampaui batas maksimum', () => {
  assert.strictEqual(batasAtasSlider(50_000_000_000), MAKS);
});

uji('kebutuhan ideal nol tidak membuat cakupan NaN', () => {
  const c = cakupan(500_000_000, 0);
  assert.ok(Number.isFinite(c), 'cakupan harus angka terhingga');
  assert.strictEqual(c, 0);
});

console.log(`\n${lulus} uji lulus`);
