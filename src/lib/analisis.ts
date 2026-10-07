import { query } from './db';
import { desaToLlmData, generateNarasi, getTier, type SusenasData } from './llm';
import { getCachedNarasi, setCachedNarasi } from './cache';
import type { AnalisisPayload, Desa, Tier } from './types';

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

  const idm = Number(desa.idm ?? 0.7);
  let idmMultiplier = 1;
  let idmLabel = 'Maju/Mandiri';
  if (idm < 0.49) { idmMultiplier = 1.8; idmLabel = 'Sangat tertinggal'; }
  else if (idm < 0.6) { idmMultiplier = 1.5; idmLabel = 'Tertinggal'; }
  else if (idm < 0.71) { idmMultiplier = 1.2; idmLabel = 'Berkembang'; }

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

export async function resolveKegiatan(
  rekomendasiKeys: string[],
  tier: Tier,
): Promise<string[]> {
  if (!rekomendasiKeys.length) return [];

  try {
    const rows = await query<{ kegiatan: string }>(
      `SELECT kegiatan FROM kegiatan_config
       WHERE rekomendasi_key = ANY($1::text[]) AND tier = $2
       ORDER BY rekomendasi_key`,
      [rekomendasiKeys, tier],
    );
    if (rows.length) {
      return [...new Set(rows.map((r) => r.kegiatan))];
    }
  } catch (err) {
    console.warn('[analisis] kegiatan_config query failed, pakai fallback:', err);
  }

  const out: string[] = [];
  for (const key of rekomendasiKeys) {
    const items = FALLBACK_KEGIATAN[key]?.[tier];
    if (items) out.push(...items);
  }
  return [...new Set(out)];
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

  // Cek cache dulu
  try {
    const cached = await getCachedNarasi(desa.kode_bps, anggaran);
    if (cached) {
      const keys = parseRekomendasiKeys(desa);
      const kegiatan = podesTersedia
        ? await resolveKegiatan(keys, tier)
        : [];
      return {
        anggaran,
        estimasi_biaya_ideal: estimasi,
        coverage_pct: Math.round(coveragePct * 100) / 100,
        tier,
        kegiatan,
        rincian_biaya: rincian,
        narasi: cached.narasi,
        sumber_narasi: 'cache',
        tahun_data: 'Podes 2025, IDM 2024',
        podes_tersedia: podesTersedia,
      };
    }
  } catch (err) {
    console.warn('[analisis] cache read failed:', err);
  }

  const keys = parseRekomendasiKeys(desa);
  const kegiatan = podesTersedia ? await resolveKegiatan(keys, tier) : [];

  // Mode cepat: kembalikan angka + kegiatan tanpa menunggu LLM (20-35 detik).
  // Halaman hasil memakai ini untuk tampil <1 detik, lalu meminta narasi
  // via /api/narasi di belakang layar. JANGAN tulis cache di sini —
  // narasi masih kosong, nanti menimpa narasi asli.
  if (opsi.tanpaLlm) {
    return {
      anggaran,
      estimasi_biaya_ideal: estimasi,
      coverage_pct: Math.round(coveragePct * 100) / 100,
      tier,
      kegiatan,
      rincian_biaya: rincian,
      narasi: { konteks: '', posisi_anggaran: '', rekomendasi: [], disclaimer: '' },
      sumber_narasi: 'pending',
      tahun_data: 'Podes 2025, IDM 2024',
      podes_tersedia: podesTersedia,
    };
  }

  // Fetch Susenas data untuk konteks LLM
  let susenasData: SusenasData | null = null;
  try {
    const r101 = desa.kode_bps.substring(0, 2);
    const r102 = desa.kode_bps.substring(2, 4);
    const susenasRows = await query<{
      total_rt: number; khawatir_makan_pct: number | null;
      tidak_makan_sehat_pct: number | null; sedikit_jenis_makanan_pct: number | null;
      lewat_waktu_makan_pct: number | null; makan_lebih_sedikit_pct: number | null;
      kehabisan_makanan_pct: number | null; lapar_tidak_makan_pct: number | null;
      tidak_makan_seharian_pct: number | null; rata_rumah_milik_sendiri_pct: number | null;
      rata_lantai_rumah: number | null; air_pdam_pct: number | null; air_sumur_pct: number | null;
      kekurangan_air_pct: number | null; punya_toilet_pct: number | null; listrik_pln_pct: number | null;
      rata_umur: number | null; punya_nik_pct: number | null; tidak_sekolah_pct: number | null;
      sd_pct: number | null; smp_pct: number | null; sma_pct: number | null; buta_huruf_pct: number | null;
    }>(`SELECT
      count(*) as total_rt,
      count(*) FILTER (WHERE r1501 = 1)::float / NULLIF(count(*),0) * 100 as khawatir_makan_pct,
      count(*) FILTER (WHERE r1502 = 1)::float / NULLIF(count(*),0) * 100 as tidak_makan_sehat_pct,
      count(*) FILTER (WHERE r1503 = 1)::float / NULLIF(count(*),0) * 100 as sedikit_jenis_makanan_pct,
      count(*) FILTER (WHERE r1504 = 1)::float / NULLIF(count(*),0) * 100 as lewat_waktu_makan_pct,
      count(*) FILTER (WHERE r1505 = 1)::float / NULLIF(count(*),0) * 100 as makan_lebih_sedikit_pct,
      count(*) FILTER (WHERE r1506 = 1)::float / NULLIF(count(*),0) * 100 as kehabisan_makanan_pct,
      count(*) FILTER (WHERE r1507 = 1)::float / NULLIF(count(*),0) * 100 as lapar_tidak_makan_pct,
      count(*) FILTER (WHERE r1508 = 1)::float / NULLIF(count(*),0) * 100 as tidak_makan_seharian_pct,
      count(*) FILTER (WHERE r1602 = 1)::float / NULLIF(count(*),0) * 100 as rata_rumah_milik_sendiri_pct,
      avg(r1604) as rata_lantai_rumah,
      count(*) FILTER (WHERE r1610a = 1)::float / NULLIF(count(*),0) * 100 as air_pdam_pct,
      count(*) FILTER (WHERE r1610a = 2)::float / NULLIF(count(*),0) * 100 as air_sumur_pct,
      count(*) FILTER (WHERE r1612 = 1)::float / NULLIF(count(*),0) * 100 as kekurangan_air_pct,
      count(*) FILTER (WHERE r1609a = 1)::float / NULLIF(count(*),0) * 100 as punya_toilet_pct,
      count(*) FILTER (WHERE r1616 = 1)::float / NULLIF(count(*),0) * 100 as listrik_pln_pct,
      avg(r407) as rata_umur,
      count(*) FILTER (WHERE r505 = 1)::float / NULLIF(count(*),0) * 100 as punya_nik_pct,
      count(*) FILTER (WHERE r611 = 5)::float / NULLIF(count(*),0) * 100 as tidak_sekolah_pct,
      count(*) FILTER (WHERE r613 IN (1,2,3,4,5,6))::float / NULLIF(count(*),0) * 100 as sd_pct,
      count(*) FILTER (WHERE r613 IN (7,8,9,10,11,12))::float / NULLIF(count(*),0) * 100 as smp_pct,
      count(*) FILTER (WHERE r613 IN (13,14,15,16,17))::float / NULLIF(count(*),0) * 100 as sma_pct,
      count(*) FILTER (WHERE r608 = 5)::float / NULLIF(count(*),0) * 100 as buta_huruf_pct
    FROM susenas_rt rt
    LEFT JOIN susenas_ind ind ON rt.psu = ind.psu AND rt.urut = ind.urut
    WHERE rt.r101 = $1 AND rt.r102 = $2`, [r101, r102]);

    if (susenasRows.length > 0 && Number(susenasRows[0].total_rt) > 0) {
      susenasData = { tersedia: true, ...susenasRows[0] } as unknown as SusenasData;
    }
  } catch (err) {
    console.warn('[analisis] susenas fetch failed:', err);
  }

  // Kolom desa.estimasi_biaya di DB bisa basi (tidak ikut berubah saat
  // rumus diperbaiki). Layar & perhitungan memakai rincianEstimasiBiaya()
  // sebagai sumber tunggal — timpa di sini supaya narasi AI tidak
  // menyebut angka yang berbeda dari yang dilihat pengguna.
  const desaData = { ...desaToLlmData(desa), estimasi_biaya: estimasi };
  const { narasi, sumber } = await generateNarasi(desaData, anggaran, kegiatan, susenasData);

  try {
    await setCachedNarasi(desa.kode_bps, anggaran, narasi, sumber);
  } catch (err) {
    console.warn('[analisis] cache write failed:', err);
  }

  return {
    anggaran,
    estimasi_biaya_ideal: estimasi,
    coverage_pct: Math.round(coveragePct * 100) / 100,
    tier,
    kegiatan,
    rincian_biaya: rincian,
    narasi,
    sumber_narasi: sumber,
    tahun_data: 'Podes 2025, IDM 2024',
    podes_tersedia: podesTersedia,
  };
}
