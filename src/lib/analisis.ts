import { query } from './db';
import { desaToLlmData, generateNarasi, getTier, type SusenasData } from './llm';
import { ambilInfra, ambilSusenas } from './dataDesa';
import { getCachedNarasi, setCachedNarasi } from './cache';
import { diagnosaDesa } from './diagnosis';
import { labelIdm } from './format';
import type { AnalisisPayload, Desa, InfraDesa, SusenasKabupaten, Tier } from './types';

/**
 * Hitung estimasi kebutuhan ideal berbasis data nyata desa.
 *
 * Komponen biaya:
 * 1. Demografi: jumlah jiwa × Rp 200.000/orang (baseline infrastruktur dasar)
 * 2. Fasilitas hilang: +Rp 500jt per fasilitas yang tidak ada (SD, SMP, faskes)
 * 3. Rumah tangga tanpa akses: jumlah RT × Rp 5jt (air bersih, sanitasi)
 * 4. Skor IDM rendah: multiplier berdasarkan status IDM (semakin rendah semakin tinggi)
 * 5. Skor Podes: multiplier berdasarkan klasifikasi
 *
 * Hasil: estimasi biaya total untuk mencapai standar minimal desa mandiri.
 */
export interface RincianBiaya {
  komponen: { label: string; nilai: number; dasar: string }[];
  subtotal: number;
  idmMultiplier: number;
  idmLabel: string;
  podesMultiplier: number;
  podesLabel: string;
  sebelumPembulatan: number;
  dibatasiMinMax: boolean;
  total: number;
}

/**
 * Satu sumber kebenaran untuk estimasi + rinciannya.
 * UI WAJIB pakai ini, jangan duplikat rumus — pernah bikin breakdown
 * tidak cocok dengan total (pembulatan 50jt tidak terlihat).
 */
export function rincianEstimasiBiaya(desa: Desa): RincianBiaya {
  const jiwa = Number(desa.jumlah_jiwa ?? 0);
  const rt = Number(desa.jumlah_rt ?? 0);
  const komponen: RincianBiaya['komponen'] = [];

  komponen.push({
    label: 'Baseline demografi',
    nilai: jiwa * 200_000,
    dasar: `${jiwa.toLocaleString('id-ID')} jiwa × Rp 200.000`,
  });

  if (!desa.ada_sd) komponen.push({ label: 'Pembangunan SD', nilai: 500_000_000, dasar: 'Desa belum punya SD' });
  if (!desa.ada_smp) komponen.push({ label: 'Pembangunan SMP', nilai: 500_000_000, dasar: 'Desa belum punya SMP' });
  if (!desa.ada_faskes) komponen.push({ label: 'Pembangunan faskes', nilai: 750_000_000, dasar: 'Desa belum punya fasilitas kesehatan' });

  const pctAir = Number(desa.pct_air_bersih ?? 100);
  const rtTanpaAir = Math.round(rt * (1 - pctAir / 100));
  if (rtTanpaAir > 0) {
    komponen.push({
      label: 'Air bersih & sanitasi',
      nilai: rtTanpaAir * 5_000_000,
      dasar: `${rtTanpaAir.toLocaleString('id-ID')} RT tanpa akses air × Rp 5 jt`,
    });
  }

  const pctMiskin = Number(desa.pct_rumah_miskin ?? 0);
  const rtMiskin = Math.round((rt * pctMiskin) / 100);
  if (rtMiskin > 0) {
    komponen.push({
      label: 'Rumah tidak layak huni',
      nilai: rtMiskin * 3_000_000,
      dasar: `${rtMiskin.toLocaleString('id-ID')} RT rumah miskin × Rp 3 jt`,
    });
  }

  const subtotal = komponen.reduce((a, k) => a + k.nilai, 0);

  // Ambang pakai labelIdm() (ambang resmi IDM) supaya label multiplier
  // tidak bertentangan dengan badge status di layar. IDM kosong → 0,7
  // (perilaku lama, setara Berkembang).
  let idmMultiplier = 1;
  let idmLabel = 'Maju/Mandiri';
  switch (labelIdm(desa.idm ?? 0.7)) {
    case 'SANGAT TERTINGGAL': idmMultiplier = 1.8; idmLabel = 'Sangat tertinggal'; break;
    case 'TERTINGGAL': idmMultiplier = 1.5; idmLabel = 'Tertinggal'; break;
    case 'BERKEMBANG': idmMultiplier = 1.2; idmLabel = 'Berkembang'; break;
  }

  let podesMultiplier = 1;
  let podesLabel = 'Potensi tinggi';
  switch (desa.klasifikasi_podes) {
    case 'CRITICAL': podesMultiplier = 1.8; podesLabel = 'Potensi sangat rendah'; break;
    case 'LOW': podesMultiplier = 1.5; podesLabel = 'Potensi rendah'; break;
    case 'MODERATE': podesMultiplier = 1.2; podesLabel = 'Potensi sedang'; break;
    case 'HIGH': podesMultiplier = 1.0; podesLabel = 'Potensi tinggi'; break;
  }

  const sebelumPembulatan = Math.round(subtotal * idmMultiplier * podesMultiplier);
  const dibatasi = Math.max(200_000_000, Math.min(10_000_000_000, sebelumPembulatan));
  const total = Math.round(dibatasi / 50_000_000) * 50_000_000;

  return {
    komponen,
    subtotal,
    idmMultiplier,
    idmLabel,
    podesMultiplier,
    podesLabel,
    sebelumPembulatan,
    dibatasiMinMax: dibatasi !== sebelumPembulatan,
    total,
  };
}

export function hitungEstimasiBiaya(desa: Desa): number {
  return rincianEstimasiBiaya(desa).total;
}
const FALLBACK_KEGIATAN: Record<string, Record<Tier, string[]>> = {
  health_infrastructure: {
    FULL: ['Pembangunan gedung Puskesmas Pembantu / Poskesdes baru'],
    MAJOR: ['Renovasi dan perluasan fasilitas kesehatan yang ada'],
    MEDIUM: ['Pengadaan peralatan medis standar, kendaraan operasional'],
    SMALL: ['Pengadaan alat kesehatan dasar, PMT stunting, pelatihan kader'],
    MICRO: ['Edukasi kesehatan, pelatihan kader posyandu'],
  },
  education_infrastructure: {
    FULL: ['Pembangunan gedung sekolah baru'],
    MAJOR: ['Renovasi dan perluasan ruang kelas'],
    MEDIUM: ['Pengadaan mebel, alat peraga, buku teks'],
    SMALL: ['Beasiswa lokal, pelatihan guru, pojok baca'],
    MICRO: ['Literasi digital, pelatihan kader pendidikan'],
  },
  water_system: {
    FULL: ['Pembangunan sistem air bersih terpusat (reservoir + perpipaan)'],
    MAJOR: ['Perluasan jaringan pipa ke dusun terpencil'],
    MEDIUM: ['Pengadaan pompa, filter, tangki penampung komunal'],
    SMALL: ['Sumur bor, perbaikan sumur existing, edukasi sanitasi'],
    MICRO: ['Distribusi filter air portabel, sosialisasi PHBS air'],
  },
  livelihood_diversification: {
    FULL: ['Pembangunan fasilitas produksi / cold chain / gudang'],
    MAJOR: ['Pengadaan alat pertanian modern, perahu motor nelayan'],
    MEDIUM: ['Pelatihan keahlian vokasional + modal usaha kelompok'],
    SMALL: ['Pelatihan UMKM, fasilitasi akses kredit'],
    MICRO: ['Penyuluhan pertanian, pembentukan kelompok tani'],
  },
  community_governance: {
    FULL: ['Pembangunan kantor desa / balai pertemuan'],
    MAJOR: ['Renovasi kantor desa, pengadaan sistem IT administrasi'],
    MEDIUM: ['Pelatihan aparatur desa, sistem informasi desa digital'],
    SMALL: ['Pelatihan BUMDes, fasilitasi musrenbang'],
    MICRO: ['Sosialisasi regulasi desa, pendampingan tata kelola'],
  },
  monitoring: {
    FULL: ['Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'],
    MAJOR: ['Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'],
    MEDIUM: ['Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'],
    SMALL: ['Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'],
    MICRO: ['Kunjungan monitoring, pendampingan perencanaan desa, fasilitasi pelaporan dana desa'],
  },
};

export function parseRekomendasiKeys(desa: Desa): string[] {
  if (desa.rekomendasi_arr?.length) {
    return desa.rekomendasi_arr.map((x) => x.trim()).filter(Boolean);
  }
  if (desa.rekomendasi) {
    return desa.rekomendasi
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/** Kegiatan per kunci rekomendasi, urutan kunci mengikuti data desa. */
export async function resolveKegiatanPerKey(
  rekomendasiKeys: string[],
  tier: Tier,
): Promise<Record<string, string[]>> {
  if (!rekomendasiKeys.length) return {};

  const out: Record<string, string[]> = {};
  try {
    const rows = await query<{ rekomendasi_key: string; kegiatan: string }>(
      `SELECT rekomendasi_key, kegiatan FROM kegiatan_config
       WHERE rekomendasi_key = ANY($1::text[]) AND tier = $2
       ORDER BY rekomendasi_key`,
      [rekomendasiKeys, tier],
    );
    if (rows.length) {
      for (const key of rekomendasiKeys) {
        const items = [...new Set(rows.filter((r) => r.rekomendasi_key === key).map((r) => r.kegiatan))];
        if (items.length) out[key] = items;
      }
      return out;
    }
  } catch (err) {
    console.warn('[analisis] kegiatan_config query failed, pakai fallback:', err);
  }

  for (const key of rekomendasiKeys) {
    const items = FALLBACK_KEGIATAN[key]?.[tier];
    if (items) out[key] = [...items];
  }
  return out;
}

export async function resolveKegiatan(
  rekomendasiKeys: string[],
  tier: Tier,
): Promise<string[]> {
  const perKey = await resolveKegiatanPerKey(rekomendasiKeys, tier);
  return [...new Set(Object.values(perKey).flat())];
}

export function toPublicDesa(desa: Desa) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { village_id, komponen_0, komponen_1, komponen_2, ...pub } = desa;
  return pub;
}

/**
 * Inti analisis: coverage → tier → kegiatan deterministik → narasi (LLM/template).
 */
export async function analyzeAnggaran(
  desa: Desa,
  anggaran: number,
  opsi: { tanpaLlm?: boolean } = {},
): Promise<AnalisisPayload> {
  const rincian = rincianEstimasiBiaya(desa);
  const estimasi = rincian.total;
  const coveragePct = estimasi > 0 ? (anggaran / estimasi) * 100 : 0;
  const tier = getTier(coveragePct);
  const podesTersedia = desa.klasifikasi_podes != null;

  const kegiatanPerKey = podesTersedia
    ? await resolveKegiatanPerKey(parseRekomendasiKeys(desa), tier)
    : {};
  const kegiatan = [...new Set(Object.values(kegiatanPerKey).flat())];
  const { susenas, infra } = await ambilDataTambahan(desa.kode_bps);
  const diagnosis = diagnosaDesa(desa, anggaran, estimasi, tier, kegiatanPerKey, { susenas, infra });

  const dasar = {
    anggaran,
    estimasi_biaya_ideal: estimasi,
    coverage_pct: Math.round(coveragePct * 100) / 100,
    tier,
    kegiatan,
    rincian_biaya: rincian,
    diagnosis,
    susenas,
    infra,
    tahun_data: 'Podes 2025, IDM 2024, Susenas 2025',
    podes_tersedia: podesTersedia,
  };

  // Cek cache dulu
  try {
    const cached = await getCachedNarasi(desa.kode_bps, anggaran);
    if (cached) {
      // Narasi template di cache tetap dilabeli template — UI menyembunyikannya
      // karena isinya sudah tampil di panel diagnosis.
      return {
        ...dasar,
        narasi: cached.narasi,
        sumber_narasi: cached.sumber === 'template' ? 'template' : 'cache',
      };
    }
  } catch (err) {
    console.warn('[analisis] cache read failed:', err);
  }

  // Mode cepat: kembalikan angka + diagnosis tanpa menunggu LLM (20-35 detik).
  // Halaman hasil memakai ini untuk tampil <1 detik, lalu meminta narasi
  // via /api/narasi di belakang layar. JANGAN tulis cache di sini —
  // narasi masih kosong, nanti menimpa narasi asli.
  if (opsi.tanpaLlm) {
    return {
      ...dasar,
      narasi: { konteks: '', posisi_anggaran: '', rekomendasi: [], disclaimer: '' },
      sumber_narasi: 'pending',
    };
  }

  const susenasData = susenas?.tersedia ? (susenas as unknown as SusenasData) : null;

  // Kolom desa.estimasi_biaya di DB bisa basi (tidak ikut berubah saat
  // rumus diperbaiki). Layar & perhitungan memakai rincianEstimasiBiaya()
  // sebagai sumber tunggal — timpa di sini supaya narasi AI tidak
  // menyebut angka yang berbeda dari yang dilihat pengguna.
  const desaData = { ...desaToLlmData(desa), estimasi_biaya: estimasi };
  const { narasi, sumber } = await generateNarasi(desaData, anggaran, kegiatan, susenasData, diagnosis);

  try {
    await setCachedNarasi(desa.kode_bps, anggaran, narasi, sumber);
  } catch (err) {
    console.warn('[analisis] cache write failed:', err);
  }

  return { ...dasar, narasi, sumber_narasi: sumber };
}

/** Susenas + fasilitas Podes; gagal salah satu → null, analisis tetap jalan. */
export async function ambilDataTambahan(
  kodeBps: string,
): Promise<{ susenas: SusenasKabupaten | null; infra: InfraDesa | null }> {
  const [susenas, infra] = await Promise.all([
    ambilSusenas(kodeBps).catch((err) => {
      console.warn('[analisis] susenas gagal:', err);
      return null;
    }),
    ambilInfra(kodeBps).catch((err) => {
      console.warn('[analisis] infra gagal:', err);
      return null;
    }),
  ]);
  return { susenas, infra };
}
