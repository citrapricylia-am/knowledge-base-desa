import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  const { kode } = await params;

  if (!/^\d{10}$/.test(kode)) {
    return NextResponse.json({ error: 'Kode BPS tidak valid' }, { status: 400 });
  }

  const r101 = kode.substring(0, 2);
  const r102 = kode.substring(2, 4);

  try {
    // Agregasi Susenas RT per kabupaten
    const rows = await query<{
      total_rt: number;
      avg_luas_rumah: number | null;
      khawatir_makan_pct: number | null;
      tidak_makan_sehat_pct: number | null;
      sedikit_jenis_makanan_pct: number | null;
      lewat_waktu_makan_pct: number | null;
      makan_lebih_sedikit_pct: number | null;
      kehabisan_makanan_pct: number | null;
      lapar_tidak_makan_pct: number | null;
      tidak_makan_seharian_pct: number | null;
      // Perumahan
      rata_rumah_milik_sendiri_pct: number | null;
      rata_lantai_rumah: number | null;
      // Air minum
      air_berlabel_pct: number | null;
      air_sumur_pct: number | null;
      air_pdam_pct: number | null;
      kekurangan_air_pct: number | null;
      // Sanitasi
      punya_toilet_pct: number | null;
      kloset_leher_angsa_pct: number | null;
      // Penerangan
      listrik_pln_pct: number | null;
      // Individu
      total_ind: number;
      rata_umur: number | null;
      laki_laki_pct: number | null;
      perempuan_pct: number | null;
      punya_nik_pct: number | null;
      tidak_sekolah_pct: number | null;
      sd_pct: number | null;
      smp_pct: number | null;
      sma_pct: number | null;
      buta_huruf_pct: number | null;
    }>(`
      WITH rt_agg AS (
        SELECT
          count(*) as total_rt,
          avg(r1604) as avg_luas_rumah,
          count(*) FILTER (WHERE r1501 = 1)::float / NULLIF(count(*),0) * 100 as khawatir_makan_pct,
          count(*) FILTER (WHERE r1502 = 1)::float / NULLIF(count(*),0) * 100 as tidak_makan_sehat_pct,
          count(*) FILTER (WHERE r1503 = 1)::float / NULLIF(count(*),0) * 100 as sedikit_jenis_makanan_pct,
          count(*) FILTER (WHERE r1504 = 1)::float / NULLIF(count(*),0) * 100 as lewat_waktu_makan_pct,
          count(*) FILTER (WHERE r1505 = 1)::float / NULLIF(count(*),0) * 100 as makan_lebih_sedikit_pct,
          count(*) FILTER (WHERE r1506 = 1)::float / NULLIF(count(*),0) * 100 as kehabisan_makanan_pct,
          count(*) FILTER (WHERE r1507 = 1)::float / NULLIF(count(*),0) * 100 as lapar_tidak_makan_pct,
          count(*) FILTER (WHERE r1508 = 1)::float / NULLIF(count(*),0) * 100 as tidak_makan_seharian_pct,
          count(*) FILTER (WHERE r1602 = 1)::float / NULLIF(count(*),0) * 100 as rata_rumah_milik_sendiri_pct,
          count(*) FILTER (WHERE r1610a = 2)::float / NULLIF(count(*),0) * 100 as air_sumur_pct,
          count(*) FILTER (WHERE r1610a = 1)::float / NULLIF(count(*),0) * 100 as air_pdam_pct,
          count(*) FILTER (WHERE r1612 = 1)::float / NULLIF(count(*),0) * 100 as kekurangan_air_pct,
          count(*) FILTER (WHERE r1609a = 1)::float / NULLIF(count(*),0) * 100 as punya_toilet_pct,
          count(*) FILTER (WHERE r1609b = 1)::float / NULLIF(count(*),0) * 100 as kloset_leher_angsa_pct,
          count(*) FILTER (WHERE r1616 = 1)::float / NULLIF(count(*),0) * 100 as listrik_pln_pct
        FROM susenas_rt
        WHERE r101 = $1 AND r102 = $2
      ),
      ind_agg AS (
        SELECT
          count(*) as total_ind,
          avg(r407) as rata_umur,
          count(*) FILTER (WHERE r405 = 1)::float / NULLIF(count(*),0) * 100 as laki_laki_pct,
          count(*) FILTER (WHERE r405 = 2)::float / NULLIF(count(*),0) * 100 as perempuan_pct,
          count(*) FILTER (WHERE r505 = 1)::float / NULLIF(count(*),0) * 100 as punya_nik_pct,
          count(*) FILTER (WHERE r611 = 5)::float / NULLIF(count(*),0) * 100 as tidak_sekolah_pct,
          count(*) FILTER (WHERE r613 IN (1,2,3,4,5,6))::float / NULLIF(count(*),0) * 100 as sd_pct,
          count(*) FILTER (WHERE r613 IN (7,8,9,10,11,12))::float / NULLIF(count(*),0) * 100 as smp_pct,
          count(*) FILTER (WHERE r613 IN (13,14,15,16,17))::float / NULLIF(count(*),0) * 100 as sma_pct,
          count(*) FILTER (WHERE r608 = 5)::float / NULLIF(count(*),0) * 100 as buta_huruf_pct
        FROM susenas_ind
        WHERE r101 = $1 AND r102 = $2
      )
      SELECT * FROM rt_agg, ind_agg
    `, [r101, r102]);

    // PENTING: pg mengirim count() sebagai STRING ("0"), jadi
    // `rows[0].total_rt === 0` selalu false. Harus Number().
    if (!rows.length || Number(rows[0].total_rt) === 0) {
      return NextResponse.json({
        tersedia: false,
        pesan: 'Data Susenas tidak tersedia untuk wilayah ini.',
      });
    }

    return NextResponse.json({
      tersedia: true,
      r101,
      r102,
      ...rows[0],
    });
  } catch (err) {
    console.error('[api/susenas] error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data Susenas' },
      { status: 500 },
    );
  }
}
