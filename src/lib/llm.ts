import { z } from 'zod';
import type { Desa, NarasiJson, Tier } from './types';
import { translateTantangan } from './format';

export const SYSTEM_PROMPT = `Kamu adalah analis kebijakan pembangunan desa senior di Kementerian Desa PDT & Transmigrasi RI dengan pengalaman 20+ tahun menangani intervensi sosial di desa tertinggal. Kamu menulis laporan analisis untuk dipakai dalam perencanaan anggaran daerah.

TUGAS KAMU:
Berdasarkan data yang diberikan (Podes 2025, IDM 2024, dan Susenas 2025), tulis analisis mendalam tentang kondisi desa dan rekomendasi kegiatan yang sesuai dengan anggaran yang dialokasikan.

STRUKTUR OUTPUT WAJIB (JSON valid, tanpa teks di luar JSON):
{
  "konteks": "Analisis situasi desa 8-12 kalimat. Jelaskan: posisi IDM dan apa artinya untuk desa ini, pilar IDM mana yang paling lemah dan mengapa, kondisi demografi yang menonjol (jumlah jiwa, RT, fasilitas yang ada/tidak ada), tantangan utama dari data Podes, kondisi ketahanan pangan/perumahan/air dari Susenas jika tersedia, dan kondisi lingkungan/wilayah (luas wilayah, hutan alam, lahan kritis — jika lahan kritis luas atau hutan tersisa sedikit, kaitkan langsung dengan pilar Ketahanan Lingkungan). Hubungkan data antar sumber — misal jika IKL rendah dan lahan kritis luas, jelaskan kaitannya.",
  "posisi_anggaran": "Analisis posisi anggaran 5-8 kalimat. Jelaskan: berapa anggaran vs kebutuhan ideal, persentase cakupan, apa yang bisa dan tidak bisa dilakukan dengan anggaran ini, prioritas intervensi yang paling mendesak berdasarkan kondisi desa, dan trade-off yang perlu dipertimbangkan.",
  "rekomendasi": [
    {
      "judul": "Nama kegiatan (dari daftar yang diberikan)",
      "poin": [
        "Alasan mengapa kegiatan ini diprioritaskan untuk desa ini (kaitkan dengan data spesifik — angka IDM, tantangan, fasilitas yang kurang)",
        "Detail pelaksanaan yang konkret (lokasi, target penerima, metode)",
        "Dampak yang diharapkan pada pilar IDM mana (IKS/IKE/IKL) dan bagaimana mengukurnya"
      ]
    }
  ],
  "disclaimer": "1-2 kalimat batasan analisis"
}

ATURAN:
1. Gunakan HANYA angka dari data yang diberikan. Dilarang mengarang angka.
2. Setiap rekomendasi HARUS punya judul yang persis sama dengan daftar kegiatan yang diberikan.
3. Bahasa Indonesia formal tapi mudah dibaca — gaya laporan analisis kebijakan, bukan template.
4. Kaitkan analisis dengan kerangka IDM secara eksplisit — tunjukkan pilar mana yang paling tertekan.
5. Jika data Susenas tersedia, gunakan untuk memperkaya analisis (misal: "39% rumah tangga khawatir kehabisan makan, mengindikasikan tekanan pada pilar sosial").
6. Output HANYA JSON valid. Tanpa salam, tanpa markdown, tanpa teks di luar JSON.`;

export interface DesaData {
  nama_desa: string;
  nama_kecamatan: string;
  nama_kabupaten: string;
  status_idm_computed: string | null;
  idm: number | null;
  iks: number | null;
  ike: number | null;
  ikl: number | null;
  jumlah_jiwa: number | null;
  jumlah_rt: number | null;
  ada_faskes: number;
  ada_sd: number;
  ada_smp: number;
  tantangan: string | null;
  klasifikasi_podes: string | null;
  estimasi_biaya: number;
  // Lingkungan & wilayah — penting agar LLM bisa menganalisis pilar IKL
  // dengan data nyata (hutan, lahan kritis, luas), bukan tebakan.
  luas_wilayah_ha?: number | null;
  hutan_alam_ha?: number | null;
  lahan_kritis_status?: string | null;
  lahan_kritis_ha?: number | null;
}

export interface SusenasData {
  tersedia: boolean;
  total_rt?: number;
  khawatir_makan_pct?: number | null;
  tidak_makan_sehat_pct?: number | null;
  sedikit_jenis_makanan_pct?: number | null;
  lewat_waktu_makan_pct?: number | null;
  makan_lebih_sedikit_pct?: number | null;
  kehabisan_makanan_pct?: number | null;
  lapar_tidak_makan_pct?: number | null;
  tidak_makan_seharian_pct?: number | null;
  rata_rumah_milik_sendiri_pct?: number | null;
  rata_lantai_rumah?: number | null;
  air_pdam_pct?: number | null;
  air_sumur_pct?: number | null;
  kekurangan_air_pct?: number | null;
  punya_toilet_pct?: number | null;
  listrik_pln_pct?: number | null;
  rata_umur?: number | null;
  punya_nik_pct?: number | null;
  tidak_sekolah_pct?: number | null;
  sd_pct?: number | null;
  smp_pct?: number | null;
  sma_pct?: number | null;
  buta_huruf_pct?: number | null;
}

export function desaToLlmData(desa: Desa): DesaData {
  return {
    nama_desa: desa.nama_desa,
    nama_kecamatan: desa.nama_kecamatan,
    nama_kabupaten: desa.nama_kabupaten,
    status_idm_computed: desa.status_idm_computed ?? null,
    idm: numOrNull(desa.idm),
    iks: numOrNull(desa.iks),
    ike: numOrNull(desa.ike),
    ikl: numOrNull(desa.ikl),
    jumlah_jiwa: numOrNull(desa.jumlah_jiwa),
    jumlah_rt: numOrNull(desa.jumlah_rt),
    ada_faskes: Number(desa.ada_faskes ?? 0),
    ada_sd: Number(desa.ada_sd ?? 0),
    ada_smp: Number(desa.ada_smp ?? 0),
    tantangan: translateTantangan(desa.tantangan),
    klasifikasi_podes: desa.klasifikasi_podes ?? null,
    estimasi_biaya: Number(desa.estimasi_biaya ?? 0),
    luas_wilayah_ha: numOrNull(desa.luas_admin_ha ?? desa.luas_hektar),
    hutan_alam_ha: numOrNull(desa.hutan_alam_ha_2024),
    lahan_kritis_status: desa.lahan_kritis_status ?? null,
    lahan_kritis_ha: numOrNull(desa.lahan_kritis_ha),
  };
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function buildUserPrompt(
  desa: DesaData,
  anggaran: number,
  kegiatan: string[],
  susenas?: SusenasData | null,
): string {
  const coverage =
    desa.estimasi_biaya > 0 ? (anggaran / desa.estimasi_biaya) * 100 : 0;
  const fmt = (n: number | string | null | undefined, d = 4): string => {
    if (n == null) return 'Data tidak tersedia';
    const num = Number(n);
    if (Number.isNaN(num)) return 'Data tidak tersedia';
    return num.toFixed(d);
  };
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  let prompt = `DATA DESA:
- Nama: ${desa.nama_desa}, Kec. ${desa.nama_kecamatan}, Kab. ${desa.nama_kabupaten}
- Status IDM: ${desa.status_idm_computed ?? 'Data tidak tersedia'} (IDM: ${fmt(desa.idm)})
- Ketahanan Sosial: ${fmt(desa.iks)} | Ketahanan Ekonomi: ${fmt(desa.ike)} | Ketahanan Lingkungan: ${fmt(desa.ikl)}
- Jumlah jiwa: ${desa.jumlah_jiwa?.toLocaleString('id-ID') ?? 'Data tidak tersedia'} | Rumah tangga: ${desa.jumlah_rt?.toLocaleString('id-ID') ?? 'Data tidak tersedia'}
- Fasilitas kesehatan: ${desa.ada_faskes ? 'Ada' : 'Belum ada'}
- Fasilitas SD: ${desa.ada_sd ? 'Ada' : 'Belum ada'}
- Fasilitas SMP: ${desa.ada_smp ? 'Ada' : 'Belum ada'}
- Tantangan utama: ${desa.tantangan ?? 'Data tidak tersedia'}
- Klasifikasi Podes: ${desa.klasifikasi_podes ?? 'Data tidak tersedia'}
- Estimasi kebutuhan ideal: ${rp(desa.estimasi_biaya)}
LINGKUNGAN & WILAYAH (Podes 2025):
- Luas wilayah: ${desa.luas_wilayah_ha != null ? fmt(desa.luas_wilayah_ha, 1) + ' ha' : 'Data tidak tersedia'}
- Hutan alam: ${desa.hutan_alam_ha != null ? fmt(desa.hutan_alam_ha, 1) + ' ha' + (desa.luas_wilayah_ha ? ` (${((Number(desa.hutan_alam_ha) / Number(desa.luas_wilayah_ha)) * 100).toFixed(1)}% dari wilayah)` : '') : 'Data tidak tersedia'}
- Lahan kritis: ${desa.lahan_kritis_ha != null ? fmt(desa.lahan_kritis_ha, 1) + ' ha' + (desa.luas_wilayah_ha ? ` (${((Number(desa.lahan_kritis_ha) / Number(desa.luas_wilayah_ha)) * 100).toFixed(1)}% dari wilayah)` : '') : 'Data tidak tersedia'} | Status: ${desa.lahan_kritis_status ?? 'Data tidak tersedia'}
ANGGARAN INTERVENSI: ${rp(anggaran)} (${coverage.toFixed(1)}% dari kebutuhan ideal)
KEGIATAN YANG DIREKOMENDASIKAN:
${kegiatan.map((k) => `- ${k}`).join('\n')}`;

  if (susenas?.tersedia) {
    prompt += `

DATA SUSENAS 2025 (agregasi per kabupaten, ${susenas.total_rt ?? 0} rumah tangga sampel):
KETAHANAN PANGAN:
- Khawatir tidak cukup makan: ${fmt(susenas.khawatir_makan_pct, 1)}%
- Tidak makan makanan sehat: ${fmt(susenas.tidak_makan_sehat_pct, 1)}%
- Sedikit jenis makanan: ${fmt(susenas.sedikit_jenis_makanan_pct, 1)}%
- Lewat waktu makan: ${fmt(susenas.lewat_waktu_makan_pct, 1)}%
- Makan lebih sedikit: ${fmt(susenas.makan_lebih_sedikit_pct, 1)}%
- Kehabisan makanan: ${fmt(susenas.kehabisan_makanan_pct, 1)}%
- Lapar tapi tidak makan: ${fmt(susenas.lapar_tidak_makan_pct, 1)}%
- Tidak makan seharian: ${fmt(susenas.tidak_makan_seharian_pct, 1)}%
PERUMAHAN:
- Rumah milik sendiri: ${fmt(susenas.rata_rumah_milik_sendiri_pct, 1)}%
- Rata-rata luas lantai: ${fmt(susenas.rata_lantai_rumah, 0)} m²
- Punya toilet: ${fmt(susenas.punya_toilet_pct, 1)}%
AIR & ENERGI:
- Sumber air PDAM: ${fmt(susenas.air_pdam_pct, 1)}%
- Sumber air sumur: ${fmt(susenas.air_sumur_pct, 1)}%
- Kekurangan air minum: ${fmt(susenas.kekurangan_air_pct, 1)}%
- Listrik PLN: ${fmt(susenas.listrik_pln_pct, 1)}%
PENDIDIKAN:
- Tidak pernah sekolah: ${fmt(susenas.tidak_sekolah_pct, 1)}%
- SD: ${fmt(susenas.sd_pct, 1)}%
- SMP: ${fmt(susenas.smp_pct, 1)}%
- SMA+: ${fmt(susenas.sma_pct, 1)}%
- Buta huruf: ${fmt(susenas.buta_huruf_pct, 1)}%`;
  }

  return prompt;
}

const NarasiSchema = z.object({
  konteks: z.string().min(1),
  posisi_anggaran: z.string().min(1),
  rekomendasi: z
    .array(
      z.object({
        judul: z.string().min(1),
        poin: z.array(z.string()).min(1),
      }),
    )
    .min(1),
  disclaimer: z.string().min(1),
});

const TIER_LABEL: Record<Tier, string> = {
  FULL: 'mencukupi untuk intervensi penuh',
  MAJOR: 'mencukupi untuk intervensi parsial',
  MEDIUM: 'cukup untuk kegiatan non-fisik dan penunjang',
  SMALL: 'paling efektif untuk layanan kapasitas masyarakat',
  MICRO: 'paling tepat untuk kegiatan edukasi dan penjangkauan',
};

export function getTier(coverage: number): Tier {
  if (coverage >= 100) return 'FULL';
  if (coverage >= 50) return 'MAJOR';
  if (coverage >= 20) return 'MEDIUM';
  if (coverage >= 5) return 'SMALL';
  return 'MICRO';
}

export function buildTemplateNarasi(
  desa: DesaData,
  anggaran: number,
  kegiatan: string[],
): NarasiJson {
  const coverage =
    desa.estimasi_biaya > 0 ? (anggaran / desa.estimasi_biaya) * 100 : 0;
  const tier = getTier(coverage);
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return {
    konteks:
      `${desa.nama_desa} di Kecamatan ${desa.nama_kecamatan}, ` +
      `Kabupaten ${desa.nama_kabupaten} berstatus ${desa.status_idm_computed ?? 'tidak diketahui'} ` +
      `dengan IDM 2024 sebesar ${desa.idm?.toFixed(4) ?? 'tidak tersedia'}. ` +
      `Desa ini memiliki ${desa.jumlah_jiwa?.toLocaleString('id-ID') ?? '?'} jiwa ` +
      `(${desa.jumlah_rt?.toLocaleString('id-ID') ?? '?'} rumah tangga). ` +
      `Tantangan utama yang teridentifikasi: ${desa.tantangan ?? 'tidak tersedia'}.`,
    posisi_anggaran:
      `Dengan anggaran ${rp(anggaran)} (${coverage.toFixed(1)}% dari estimasi kebutuhan ideal ` +
      `${rp(desa.estimasi_biaya)}), alokasi ini ${TIER_LABEL[tier]}.`,
    rekomendasi: kegiatan.map((k) => ({
      judul: k,
      poin: [
        'Sesuaikan detail pelaksanaan dengan kondisi lapangan desa.',
        'Libatkan aparat desa dan tokoh masyarakat dalam perencanaan.',
        'Dokumentasikan baseline indikator sebelum dan sesudah kegiatan.',
      ],
    })),
    disclaimer:
      'Rekomendasi ini bersifat indikatif berdasarkan data Podes 2025 dan IDM 2024. ' +
      'Validasi lapangan dan konsultasi dengan aparat desa tetap diperlukan sebelum pelaksanaan.',
  };
}

export async function callLLM(
  desa: DesaData,
  anggaran: number,
  kegiatan: string[],
  susenas?: SusenasData | null,
): Promise<NarasiJson> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY tidak diset');
  }

  const baseUrl =
    process.env.LLM_BASE_URL ?? 'https://api.inferhub.dev/v1';
  const model = process.env.LLM_MODEL ?? 'deepseek-v4-pro';
  const timeoutMs = Number(process.env.LLM_TIMEOUT_MS ?? 180000);
  const maxTokens = Number(process.env.LLM_MAX_TOKENS ?? 8000);
  const reasoningEffort =
    (process.env.LLM_REASONING_EFFORT ?? 'high') as
    | 'low' | 'medium' | 'high'
    | undefined;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.4,
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(desa, anggaran, kegiatan, susenas) },
        { role: 'assistant', content: '{' },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`LLM HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? '';

  const start = text.indexOf('{');
  const raw = start === -1 ? `{${text}` : text.slice(start);
  const parsed = JSON.parse(raw);
  return NarasiSchema.parse(parsed);
}

/** Coba LLM; jika gagal/timeout → template. Tidak retry. */
export async function generateNarasi(
  desa: DesaData,
  anggaran: number,
  kegiatan: string[],
  susenas?: SusenasData | null,
): Promise<{ narasi: NarasiJson; sumber: 'llm' | 'template' }> {
  if (!kegiatan.length) {
    return {
      narasi: {
        konteks:
          `${desa.nama_desa}, Kec. ${desa.nama_kecamatan}, Kab. ${desa.nama_kabupaten}. ` +
          'Data skor Podes tidak tersedia sehingga rekomendasi kegiatan tidak dapat dihasilkan.',
        posisi_anggaran: `Anggaran Rp ${anggaran.toLocaleString('id-ID')} dicatat, namun tanpa matriks Podes kegiatan tidak dapat dipetakan.`,
        rekomendasi: [
          {
            judul: 'Lengkapi data Podes',
            poin: [
              'Gunakan profil IDM sebagai acuan awal.',
              'Validasi kebutuhan di lapangan bersama aparat desa.',
            ],
          },
        ],
        disclaimer:
          'Rekomendasi terbatas karena data skor Podes tidak tersedia untuk desa ini.',
      },
      sumber: 'template',
    };
  }

  try {
    const narasi = await callLLM(desa, anggaran, kegiatan, susenas);
    return { narasi, sumber: 'llm' };
  } catch (err) {
    console.warn('[llm] fallback template:', err instanceof Error ? err.message : err);
    return {
      narasi: buildTemplateNarasi(desa, anggaran, kegiatan),
      sumber: 'template',
    };
  }
}
