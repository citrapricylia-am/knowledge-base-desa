import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { toPublicDesa } from '@/lib/analisis';
import type { Desa } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kode: string }> },
) {
  try {
    const { kode } = await params;

    if (!kode || !/^\d{10}$/.test(kode)) {
      return NextResponse.json(
        { error: 'kode_bps harus 10 digit' },
        { status: 400 },
      );
    }

    const desa = await queryOne<Desa>(
      'SELECT * FROM desa WHERE kode_bps = $1',
      [kode],
    );

    if (!desa) {
      return NextResponse.json(
        { error: 'Desa tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json(toPublicDesa(desa));
  } catch (error) {
    console.error('Desa by kode error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
