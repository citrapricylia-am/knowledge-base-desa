import { NextRequest, NextResponse } from 'next/server';
import { ambilInfra } from '@/lib/dataDesa';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  const { kode } = await params;

  if (!/^\d{10}$/.test(kode)) {
    return NextResponse.json({ error: 'Kode BPS tidak valid' }, { status: 400 });
  }

  try {
    return NextResponse.json(await ambilInfra(kode));
  } catch (err) {
    console.error('[api/podes-infra] error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data infrastruktur' },
      { status: 500 },
    );
  }
}
