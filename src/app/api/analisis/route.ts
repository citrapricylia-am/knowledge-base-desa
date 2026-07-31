import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { analyzeAnggaran, toPublicDesa } from '@/lib/analisis';
import type { Desa } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
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

    const analisis = await analyzeAnggaran(desa, Math.floor(anggaran));

    return NextResponse.json({
      desa: toPublicDesa(desa),
      analisis,
    });
  } catch (error) {
    console.error('Analisis error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
