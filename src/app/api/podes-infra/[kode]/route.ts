import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const JENIS_MAP: Record<string, { kategori: string; label: string }> = {
  'r701ak2': { kategori: 'PAUD', label: 'Kelompok Bermain' },
  'r701ak3': { kategori: 'PAUD', label: 'TK' },
  'r701bk2': { kategori: 'PAUD', label: 'RA' },
  'r701bk3': { kategori: 'PAUD', label: 'Bustanul Atfal' },
  'r701ck2': { kategori: 'SD', label: 'SD' },
  'r701ck3': { kategori: 'SD', label: 'MI' },
  'r701dk2': { kategori: 'SMP', label: 'SMP' },
  'r701dk3': { kategori: 'SMP', label: 'MTs' },
  'r701ek2': { kategori: 'SMA', label: 'SMA' },
  'r701ek3': { kategori: 'SMA', label: 'MA' },
  'r701fk2': { kategori: 'SMK', label: 'SMK' },
  'r701fk3': { kategori: 'SMK', label: 'MAK' },
  'r701gk2': { kategori: 'Pendidikan', label: 'Pondok Pesantren' },
  'r701hk2': { kategori: 'Pendidikan', label: 'Akademi' },
  'r701ik2': { kategori: 'Pendidikan', label: 'Universitas' },
  'r701ik3': { kategori: 'Pendidikan', label: 'PTKI' },
  'r701jk2': { kategori: 'Pendidikan', label: 'Kursus' },
  'r701jk3': { kategori: 'Pendidikan', label: 'Kursus Keagamaan' },
  'r702ak2': { kategori: 'Kesehatan', label: 'Rumah Sakit' },
  'r702bk2': { kategori: 'Kesehatan', label: 'Puskesmas' },
  'r702ck2': { kategori: 'Kesehatan', label: 'Puskesmas Pembantu' },
  'r702dk2': { kategori: 'Kesehatan', label: 'Polindes' },
  'r702ek2': { kategori: 'Kesehatan', label: 'Klinik' },
  'r702fk2': { kategori: 'Kesehatan', label: 'Puskesdes' },
  'r702gk2': { kategori: 'Kesehatan', label: 'Apotek' },
  'r702hk2': { kategori: 'Kesehatan', label: 'Toko Obat' },
  'r702ik2': { kategori: 'Kesehatan', label: 'Praktik Bidan' },
  'r702jk2': { kategori: 'Kesehatan', label: 'Praktik Dokter' },
  'r702kk2': { kategori: 'Kesehatan', label: 'Balai Pengobatan' },
  'r702lk2': { kategori: 'Kesehatan', label: 'Posyandu' },
  'r902a1': { kategori: 'Energi', label: 'Pembangkit Listrik' },
  'r902a2': { kategori: 'Energi', label: 'Trafo Listrik' },
  'r902a3': { kategori: 'Energi', label: 'Genset' },
  'r905ak2': { kategori: 'Komunikasi', label: 'Menara Seluler' },
  'r905bk2': { kategori: 'Komunikasi', label: 'Kantor Pos' },
  'r905ck2': { kategori: 'Komunikasi', label: 'Warnet' },
  'r905dk2': { kategori: 'Komunikasi', label: 'Kantor Telepon' },
  'r905ek2': { kategori: 'Komunikasi', label: 'UMKM' },
  'r905hk2': { kategori: 'Komunikasi', label: 'Jasa Internet' },
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ kode: string }> },
) {
  const { kode } = await params;

  if (!/^\d{10}$/.test(kode)) {
    return NextResponse.json({ error: 'Kode BPS tidak valid' }, { status: 400 });
  }

  try {
    const rows = await query<{ jenis: string; nama: string }>(`
      SELECT jenis, nama FROM podes2025_infra WHERE kode_bps = $1 ORDER BY jenis, nama
    `, [kode]);

    // Group by kategori
    const grouped: Record<string, { label: string; nama: string }[]> = {};

    for (const row of rows) {
      const map = JENIS_MAP[row.jenis] ?? { kategori: 'Lainnya', label: row.jenis };
      if (!grouped[map.kategori]) {
        grouped[map.kategori] = [];
      }
      grouped[map.kategori].push({
        label: map.label,
        nama: row.nama || map.label,
      });
    }

    return NextResponse.json({
      tersedia: rows.length > 0,
      total: rows.length,
      fasilitas: grouped,
    });
  } catch (err) {
    console.error('[api/podes-infra] error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data infrastruktur' },
      { status: 500 },
    );
  }
}
