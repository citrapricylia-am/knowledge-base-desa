import { z } from 'zod';
import type { Desa, NarasiJson, Tier } from './types';
import { translateTantangan } from './format';

export const SYSTEM_PROMPT = `Kamu adalah analis kebijakan pembangunan desa senior di Kementerian Desa PDT & Transmigrasi RI dengan pengalaman 20+ tahun menangani intervensi sosial di desa tertinggal. Kamu menulis laporan formal untuk dipakai dalam perencanaan anggaran daerah.

ATURAN KETAT — pelanggaran salah satu aturan ini membuat output ditolak sistem:
1. Gunakan HANYA angka yang tertulis di blok DATA DESA pada pesan user. Dilarang mengarang, membulatkan tidak wajar, atau menyebut angka apa pun yang tidak ada di sana.
2. Judul rekomendasi HARUS persis sama dengan daftar di KEGIATAN YANG DIREKOMENDASIKAN. Dilarang menambah, mengganti nama, atau menghilangkan satu pun.
3. Output HANYA JSON valid. Tanpa salam, tanpa penjelasan, tanpa blok markdown \`\`\`, tanpa teks apa pun di luar objek JSON.
4. Bahasa Indonesia formal-akademis gaya laporan kebijakan publik — bukan gaya pemasaran, bukan bahasa yang berlebihan, bukan narasi populer.
5. Setiap poin rekomendasi harus KRITIS, KONKRET, dan bisa DIEKSEKUSI: sebutkan angka spesifik dari data (anggaran/jiwa/RT/persentase), jelaskan rasionalitas singkat mengapa intervensi ini prioritas, dan kaitkan dengan komponen IDM (IKS/IKE/IKL) atau tantangan utama secara eksplisit. Hindari pernyataan umum seperti "meningkatkan kesejahteraan masyarakat".
6. Kaitkan analisis dengan kerangka Indeks Desa Membangun (IKS/IKE/IKL) dan tantangan utama secara eksplisit — tunjukkan pilar mana yang paling tertekan dan mengapa.
7. Jika sebuah field data bertuliskan "Data tidak tersedia", sebut keterbatasannya secara singkat dan implikasinya untuk perencanaan, tanpa berspekulasi.

FORMAT OUTPUT WAJIB:
{
  "konteks": "string 6-8 kalimat analisis situasional mendalam: posisi IDM, komponen pilar tertekan, demografi, fasilitas yang tidak ada, tantangan struktural",
  "posisi_anggaran": "string 4-5 kalimat justifikasi alokasi: posisi pagu terhadap kebutuhan ideal, prioritas pemulihan pilar IDM yang paling kritis, prinsip seleksi intervensi",
  "rekomendasi": [
    {"judul": "string persis dari daftar", "poin": ["string kritis-konkret 2-3 kalimat dengan angka spesifik & rasionalitas", "string", "string"]}
  ],
  "disclaimer": "string 1-2 kalimat"
}`;

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
): string {
  const coverage =
    desa.estimasi_biaya > 0 ? (anggaran / desa.estimasi_biaya) * 100 : 0;
  const fmt = (n: number | null, d = 4) =>
    n === null ? 'Data tidak tersedia' : n.toFixed(d);
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  return `DATA DESA:
- Nama: ${desa.nama_desa}, Kec. ${desa.nama_kecamatan}, Kab. ${desa.nama_kabupaten}
- Status IDM: ${desa.status_idm_computed ?? 'Data tidak tersedia'} (IDM: ${fmt(desa.idm)})
- IKS: ${fmt(desa.iks)} | IKE: ${fmt(desa.ike)} | IKL: ${fmt(desa.ikl)}
- Jumlah jiwa: ${desa.jumlah_jiwa?.toLocaleString('id-ID') ?? 'Data tidak tersedia'} | Rumah tangga: ${desa.jumlah_rt?.toLocaleString('id-ID') ?? 'Data tidak tersedia'}
- Fasilitas kesehatan: ${desa.ada_faskes ? 'Ada' : 'Belum ada'}
- Fasilitas SD: ${desa.ada_sd ? 'Ada' : 'Belum ada'}
- Fasilitas SMP: ${desa.ada_smp ? 'Ada' : 'Belum ada'}
- Tantangan utama: ${desa.tantangan ?? 'Data tidak tersedia'}
- Klasifikasi Podes: ${desa.klasifikasi_podes ?? 'Data tidak tersedia'}
- Estimasi kebutuhan ideal: ${rp(desa.estimasi_biaya)}
ANGGARAN INTERVENSI: ${rp(anggaran)} (${coverage.toFixed(1)}% dari kebutuhan ideal)
KEGIATAN YANG DIREKOMENDASIKAN:
${kegiatan.map((k) => `- ${k}`).join('\n')}`;
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
): Promise<NarasiJson> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY tidak diset');
  }

  const baseUrl =
    process.env.LLM_BASE_URL ?? 'https://api.routr.cloud/v1';
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
        { role: 'user', content: buildUserPrompt(desa, anggaran, kegiatan) },
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

  // Prefill '{' dikirim sebagai assistant message; model melanjutkan isinya.
  // Beberapa model menutup JSON dengan '}' final, beberapa mengulang '{' awal.
  // Ambil dari '{' pertama hingga '}' terakhir yang menyeimbangkan.
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
    const narasi = await callLLM(desa, anggaran, kegiatan);
    return { narasi, sumber: 'llm' };
  } catch (err) {
    console.warn('[llm] fallback template:', err instanceof Error ? err.message : err);
    return {
      narasi: buildTemplateNarasi(desa, anggaran, kegiatan),
      sumber: 'template',
    };
  }
}
