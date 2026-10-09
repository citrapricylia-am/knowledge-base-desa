import { queryOne } from '@/lib/db';
import { desaToLlmData, buildUserPrompt, getTier } from '@/lib/llm';
import { rincianEstimasiBiaya, parseRekomendasiKeys, resolveKegiatan } from '@/lib/analisis';
import { getCachedNarasi } from '@/lib/cache';
import type { Desa } from '@/lib/types';
import { NextResponse } from 'next/server';
import { ipPemanggil, cekKuota, balasanTerlaluSering } from '@/lib/batas';

export const runtime = 'nodejs';

const SYSTEM_CHAT = `Kamu pendamping analisis desa untuk DesaLens. Kamu sudah memegang data satu desa (Podes 2025, IDM 2024, Susenas 2025) beserta hasil analisis anggarannya. Tugasmu menjawab pertanyaan pengguna tentang desa itu.

ATURAN WAJIB:
1. Jawab HANYA dari data yang diberikan di bawah. Dilarang mengarang angka, nama program, atau fakta.
2. Kalau data yang ditanya tidak ada, katakan terus terang: "Data itu tidak tersedia di sistem" — lalu sebutkan data terdekat yang ada.
3. Bahasa Indonesia, lugas, untuk orang non-teknis. Hindari singkatan mentah: tulis "Ketahanan Sosial" bukan "IKS".
4. Jawab pendek: 2-4 kalimat untuk pertanyaan sederhana, maksimal 8 kalimat untuk yang kompleks. Jangan menulis laporan ulang.
5. Kalau pengguna bertanya di luar topik desa ini, arahkan kembali dengan ramah.
6. Sebut angka apa adanya dari data (misal "0,5333" atau "2.291 jiwa"), jangan dibulatkan diam-diam.
7. Jangan pakai markdown heading atau bullet bertingkat. Teks biasa, paragraf pendek.`;

/** Maksimal pesan riwayat yang dikirim ulang ke model (hemat token, cukup untuk konteks). */
const MAKS_RIWAYAT = 8;

export async function POST(request: Request) {
  // Rate limit: chat juga memanggil LLM. 30 pesan per IP per 10 menit.
  const tunggu = cekKuota(`chat:${ipPemanggil(request)}`, 30, 600);
  if (tunggu !== null) return balasanTerlaluSering(tunggu);

  try {
    const body = (await request.json()) as {
      kode_bps?: string;
      anggaran?: number;
      pesan?: string;
      riwayat?: { peran: 'user' | 'ai'; teks: string }[];
    };

    const kode_bps = String(body.kode_bps ?? '').trim();
    const anggaran = Number(body.anggaran);
    const pesan = String(body.pesan ?? '').trim();

    if (!/^\d{10}$/.test(kode_bps)) {
      return NextResponse.json({ error: 'kode_bps wajib 10 digit' }, { status: 422 });
    }
    if (!Number.isFinite(anggaran) || anggaran <= 0) {
      return NextResponse.json({ error: 'anggaran harus lebih dari 0' }, { status: 422 });
    }
    if (!pesan) {
      return NextResponse.json({ error: 'pesan kosong' }, { status: 422 });
    }
    if (pesan.length > 1000) {
      return NextResponse.json({ error: 'pertanyaan terlalu panjang (maks 1000 karakter)' }, { status: 422 });
    }

    const desa = await queryOne<Desa>('SELECT * FROM desa WHERE kode_bps = $1', [kode_bps]);
    if (!desa) {
      return NextResponse.json({ error: 'Desa tidak ditemukan' }, { status: 404 });
    }

    // Susun konteks dari sumber yang sama dengan halaman hasil supaya
    // jawaban chat tidak pernah bertentangan dengan angka di layar.
    const rincian = rincianEstimasiBiaya(desa);
    const tier = getTier(rincian.total > 0 ? (anggaran / rincian.total) * 100 : 0);
    const kegiatan = desa.klasifikasi_podes != null
      ? await resolveKegiatan(parseRekomendasiKeys(desa), tier)
      : [];

    let konteks = buildUserPrompt(
      // estimasi_biaya dari kolom DB bisa basi; layar memakai
      // rincianEstimasiBiaya() sebagai sumber tunggal. Timpa di sini
      // supaya chat tidak menyebut angka berbeda dari yang dilihat user.
      { ...desaToLlmData(desa), estimasi_biaya: rincian.total },
      anggaran,
      kegiatan,
      null,
    );

    // Sertakan narasi yang sudah dibaca pengguna (kalau ada di cache),
    // supaya chat bisa merujuk "seperti disebut di analisis".
    try {
      const cached = await getCachedNarasi(desa.kode_bps, anggaran);
      if (cached) {
        konteks += `\n\nANALISIS YANG SUDAH DITAMPILKAN KE PENGGUNA:\n${cached.narasi.konteks}\n${cached.narasi.posisi_anggaran}`;
      }
    } catch {
      // cache opsional — tidak fatal
    }

    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'LLM belum dikonfigurasi' }, { status: 503 });
    }

    const baseUrl = process.env.LLM_BASE_URL ?? 'https://api.inferhub.dev/v1';
    const model = process.env.LLM_MODEL ?? 'deepseek-v4-flash';

    const riwayat = (body.riwayat ?? []).slice(-MAKS_RIWAYAT).map((m) => ({
      role: m.peran === 'ai' ? ('assistant' as const) : ('user' as const),
      content: String(m.teks ?? '').slice(0, 2000),
    }));

    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 900,
        temperature: 0.3,
        reasoning_effort: 'low',
        messages: [
          { role: 'system', content: `${SYSTEM_CHAT}\n\nDATA DESA:\n${konteks}` },
          ...riwayat,
          { role: 'user', content: pesan },
        ],
      }),
      signal: AbortSignal.timeout(Number(process.env.LLM_TIMEOUT_MS ?? 60000)),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      console.error('[chat] upstream gagal:', upstream.status, detail.slice(0, 200));
      return NextResponse.json({ error: 'AI sedang tidak bisa dihubungi' }, { status: 502 });
    }

    // Catatan: stream:true sudah dicoba dan TIDAK berguna di sini —
    // InferHub mengirim semua delta pada detik yang sama (rentang 0,0s),
    // jadi teks tidak pernah benar-benar mengalir. Respons biasa dipakai
    // supaya kode jauh lebih sederhana tanpa kehilangan apa pun.
    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const jawaban = (data.choices?.[0]?.message?.content ?? '').trim();

    if (!jawaban) {
      return NextResponse.json(
        { error: 'AI tidak memberi jawaban. Coba ulangi pertanyaan.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ jawaban });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses pertanyaan' },
      { status: 500 },
    );
  }
}
