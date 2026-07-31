import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { DesaSearchResult } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? '').trim();
    const provinsi = searchParams.get('provinsi')?.trim();
    const limitParam = searchParams.get('limit');

    if (q.length < 2) {
      return NextResponse.json(
        { error: 'Query "q" minimal 2 karakter' },
        { status: 400 },
      );
    }

    const limit = Math.min(
      Math.max(parseInt(limitParam ?? '10', 10) || 10, 1),
      20,
    );

    const params: unknown[] = [q];
    let sql = `
      SELECT
        kode_bps,
        nama_desa,
        nama_kecamatan,
        nama_kabupaten,
        nama_provinsi,
        status_idm_computed,
        idm,
        klasifikasi_podes
      FROM desa
      WHERE (
        to_tsvector('simple', nama_desa || ' ' || nama_kecamatan || ' ' || nama_kabupaten)
          @@ plainto_tsquery('simple', $1)
        OR nama_desa ILIKE '%' || $1 || '%'
        OR nama_kecamatan ILIKE '%' || $1 || '%'
        OR nama_kabupaten ILIKE '%' || $1 || '%'
      )
    `;

    if (provinsi) {
      params.push(provinsi);
      sql += ` AND nama_provinsi ILIKE $${params.length}`;
    }

    params.push(limit);
    sql += `
      ORDER BY
        CASE WHEN lower(nama_desa) = lower($1) THEN 0
             WHEN lower(nama_desa) LIKE lower($1) || '%' THEN 1
             ELSE 2 END,
        nama_desa
      LIMIT $${params.length}
    `;

    const results = await query<DesaSearchResult>(sql, params);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
