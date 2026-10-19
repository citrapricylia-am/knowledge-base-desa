import { NextRequest, NextResponse } from 'next/server';
import { ambilSusenas } from '@/lib/dataDesa';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  const { kode } = await params;

  if (!/^\d{10}$/.test(kode)) {
    return NextResponse.json({ error: 'Kode BPS tidak valid' }, { status: 400 });
  }

  try {
    // Agregasi Susenas per kabupaten (lihat lib/dataDesa.ts)
    return NextResponse.json(await ambilSusenas(kode));
  } catch (err) {
    console.error('[api/susenas] error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data Susenas' },
      { status: 500 },
    );
  }
}
