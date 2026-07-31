import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import type { CakupanStats } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const totals = await queryOne<{
      total_desa: string;
      dengan_podes: string;
      tanpa_podes: string;
      dengan_status_idm: string;
      tanpa_status_idm: string;
    }>(`
      SELECT
        COUNT(*)::text AS total_desa,
        COUNT(*) FILTER (WHERE klasifikasi_podes IS NOT NULL)::text AS dengan_podes,
        COUNT(*) FILTER (WHERE klasifikasi_podes IS NULL)::text AS tanpa_podes,
        COUNT(*) FILTER (WHERE status_idm_computed IS NOT NULL)::text AS dengan_status_idm,
        COUNT(*) FILTER (WHERE status_idm_computed IS NULL)::text AS tanpa_status_idm
      FROM desa
    `);

    const perStatus = await query<{ status: string; count: string }>(`
      SELECT COALESCE(status_idm_computed, 'NULL') AS status, COUNT(*)::text AS count
      FROM desa
      GROUP BY 1
      ORDER BY COUNT(*) DESC
    `);

    const perKlasifikasi = await query<{ klasifikasi: string; count: string }>(`
      SELECT COALESCE(klasifikasi_podes, 'NULL') AS klasifikasi, COUNT(*)::text AS count
      FROM desa
      GROUP BY 1
      ORDER BY COUNT(*) DESC
    `);

    const perProvinsi = await query<{ nama_provinsi: string; count: string }>(`
      SELECT nama_provinsi, COUNT(*)::text AS count
      FROM desa
      GROUP BY nama_provinsi
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `);

    const stats: CakupanStats = {
      total_desa: Number(totals?.total_desa ?? 0),
      dengan_podes: Number(totals?.dengan_podes ?? 0),
      tanpa_podes: Number(totals?.tanpa_podes ?? 0),
      dengan_status_idm: Number(totals?.dengan_status_idm ?? 0),
      tanpa_status_idm: Number(totals?.tanpa_status_idm ?? 0),
      per_status_idm: perStatus.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      per_klasifikasi: perKlasifikasi.map((r) => ({
        klasifikasi: r.klasifikasi,
        count: Number(r.count),
      })),
      per_provinsi_top: perProvinsi.map((r) => ({
        nama_provinsi: r.nama_provinsi,
        count: Number(r.count),
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Cakupan error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
