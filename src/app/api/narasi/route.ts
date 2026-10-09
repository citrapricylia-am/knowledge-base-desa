import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { analyzeAnggaran } from '@/lib/analisis';
import type { Desa } from '@/lib/types';
import { ipPemanggil, cekKuota, balasanTerlaluSering } from '@/lib/batas';

export const runtime = 'nodejs';

/**
 * Endpoint khusus narasi AI.
 *
 * Dipisah dari /api/analisis supaya halaman hasil bisa tampil cepat:
 * - /api/analisis {cepat:true} -> angka + kegiatan, ~1 detik
 * - /api/narasi (endpoint ini) -> narasi LLM, 20-35 detik, jalan di belakang layar
 *
 * Narasi hasil panggilan ini ditulis ke cache oleh analyzeAnggaran,
 * jadi kunjungan berikutnya untuk desa+anggaran yang sama langsung instan.
 */
export async function POST(request: Request) {
  // Rate limit: tiap panggilan = satu permintaan ke LLM yang dibayar.
  // 20 narasi per IP per 10 menit cukup untuk pemakaian wajar.
  const tunggu = cekKuota(`narasi:${ipPemanggil(request)}`, 20, 600);
  if (tunggu !== null) return balasanTerlaluSering(tunggu);

  try {
    const body = (await request.json()) as {
      kode_bps?: string;
      anggaran?: number;
    };
    const kode_bps = String(body.kode_bps ?? '').trim();
    const anggaran = Number(body.anggaran);

    if (!/^\d{10}$/.test(kode_bps)) {
      return NextResponse.json(
        { error: 'kode_bps wajib 10 digit' },
        { status: 422 },
      );
    }

    if (!Number.isFinite(anggaran) || anggaran <= 0) {
      return NextResponse.json(
        { error: 'anggaran harus lebih dari 0' },
        { status: 422 },
      );
    }

    if (anggaran > 10_000_000_000) {
      return NextResponse.json(
        { error: 'anggaran maksimum Rp 10.000.000.000' },
        { status: 422 },
      );
    }

    const desa = await queryOne<Desa>(
      'SELECT * FROM desa WHERE kode_bps = $1',
      [kode_bps],
    );

    if (!desa) {
      return NextResponse.json(
        { error: 'Desa tidak ditemukan' },
        { status: 404 },
      );
    }

    // Jalur penuh (dengan LLM). Cache dicek di dalam analyzeAnggaran.
    const analisis = await analyzeAnggaran(desa, Math.floor(anggaran));

    return NextResponse.json({
      narasi: analisis.narasi,
      sumber_narasi: analisis.sumber_narasi,
    });
  } catch (error) {
    console.error('Narasi error:', error);
    return NextResponse.json(
      {
        error: 'Gagal menyusun narasi',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
