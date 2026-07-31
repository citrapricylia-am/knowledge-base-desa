import { query } from './db';
import { desaToLlmData, generateNarasi, getTier } from './llm';
import { getCachedNarasi, setCachedNarasi } from './cache';
import type { AnalisisPayload, Desa, Tier } from './types';

/** Fallback kegiatan jika tabel kegiatan_config kosong / key tidak ketemu */
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

function parseRekomendasiKeys(desa: Desa): string[] {
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
): Promise<AnalisisPayload> {
  const estimasi = Number(desa.estimasi_biaya ?? 0);
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
  const desaData = desaToLlmData(desa);
  const { narasi, sumber } = await generateNarasi(desaData, anggaran, kegiatan);

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
    narasi,
    sumber_narasi: sumber,
    tahun_data: 'Podes 2025, IDM 2024',
    podes_tersedia: podesTersedia,
  };
}
