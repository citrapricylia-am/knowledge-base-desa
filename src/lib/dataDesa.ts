import { query } from './db';
import type { InfraDesa, SusenasKabupaten } from './types';

/**
 * Data pelengkap desa (Susenas per kabupaten + fasilitas Podes 2025).
 *
 * Satu sumber untuk API /api/susenas, /api/podes-infra, analisis, dan chat.
 * Sebelumnya analisis punya query Susenas sendiri yang JOIN rt×individu,
 * sehingga persentase rumah tangga terhitung per individu dan angka yang
 * dibaca AI berbeda dari angka di layar.
 */

export const JENIS_INFRA: Record<string, { kategori: string; label: string }> = {
  r701ak2: { kategori: 'PAUD', label: 'Kelompok Bermain' },
  r701ak3: { kategori: 'PAUD', label: 'TK' },
  r701bk2: { kategori: 'PAUD', label: 'RA' },
  r701bk3: { kategori: 'PAUD', label: 'Bustanul Atfal' },
  r701ck2: { kategori: 'SD', label: 'SD' },
  r701ck3: { kategori: 'SD', label: 'MI' },
  r701dk2: { kategori: 'SMP', label: 'SMP' },
  r701dk3: { kategori: 'SMP', label: 'MTs' },
  r701ek2: { kategori: 'SMA', label: 'SMA' },
  r701ek3: { kategori: 'SMA', label: 'MA' },
  r701fk2: { kategori: 'SMK', label: 'SMK' },
  r701fk3: { kategori: 'SMK', label: 'MAK' },
  r701gk2: { kategori: 'Pendidikan', label: 'Pondok Pesantren' },
  r701hk2: { kategori: 'Pendidikan', label: 'Akademi' },
  r701ik2: { kategori: 'Pendidikan', label: 'Universitas' },
  r701ik3: { kategori: 'Pendidikan', label: 'PTKI' },
  r701jk2: { kategori: 'Pendidikan', label: 'Kursus' },
  r701jk3: { kategori: 'Pendidikan', label: 'Kursus Keagamaan' },
  r702ak2: { kategori: 'Kesehatan', label: 'Rumah Sakit' },
  r702bk2: { kategori: 'Kesehatan', label: 'Puskesmas' },
  r702ck2: { kategori: 'Kesehatan', label: 'Puskesmas Pembantu' },
  r702dk2: { kategori: 'Kesehatan', label: 'Polindes' },
  r702ek2: { kategori: 'Kesehatan', label: 'Klinik' },
  r702fk2: { kategori: 'Kesehatan', label: 'Puskesdes' },
  r702gk2: { kategori: 'Kesehatan', label: 'Apotek' },
  r702hk2: { kategori: 'Kesehatan', label: 'Toko Obat' },
  r702ik2: { kategori: 'Kesehatan', label: 'Praktik Bidan' },
  r702jk2: { kategori: 'Kesehatan', label: 'Praktik Dokter' },
  r702kk2: { kategori: 'Kesehatan', label: 'Balai Pengobatan' },
  r702lk2: { kategori: 'Kesehatan', label: 'Posyandu' },
  r902a1: { kategori: 'Energi', label: 'Pembangkit Listrik' },
  r902a2: { kategori: 'Energi', label: 'Trafo Listrik' },
  r902a3: { kategori: 'Energi', label: 'Genset' },
  r905ak2: { kategori: 'Komunikasi', label: 'Menara Seluler' },
  r905bk2: { kategori: 'Komunikasi', label: 'Kantor Pos' },
  r905ck2: { kategori: 'Komunikasi', label: 'Warnet' },
  r905dk2: { kategori: 'Komunikasi', label: 'Kantor Telepon' },
  r905ek2: { kategori: 'Komunikasi', label: 'UMKM' },
  r905hk2: { kategori: 'Komunikasi', label: 'Jasa Internet' },
};

export function kelompokkanInfra(rows: { jenis: string; nama: string }[]): InfraDesa {
  const fasilitas: InfraDesa['fasilitas'] = {};
  const jumlah: InfraDesa['jumlah'] = {};
  for (const row of rows) {
    const map = JENIS_INFRA[row.jenis] ?? { kategori: 'Lainnya', label: row.jenis };
    (fasilitas[map.kategori] ??= []).push({ label: map.label, nama: row.nama || map.label });
    jumlah[map.label] = (jumlah[map.label] ?? 0) + 1;
  }
  return { tersedia: rows.length > 0, total: rows.length, fasilitas, jumlah };
}

export async function ambilInfra(kodeBps: string): Promise<InfraDesa> {
  const rows = await query<{ jenis: string; nama: string }>(
    'SELECT jenis, nama FROM podes2025_infra WHERE kode_bps = $1 ORDER BY jenis, nama',
    [kodeBps],
  );
  return kelompokkanInfra(rows);
}

// Susenas statis per rilis — cache per kabupaten di memori proses supaya
// sandbox anggaran (memanggil analisis berkali-kali) tidak mengulang agregasi.
const cacheSusenas = new Map<string, SusenasKabupaten>();

export async function ambilSusenas(kodeBps: string): Promise<SusenasKabupaten> {
  const r101 = kodeBps.substring(0, 2);
  const r102 = kodeBps.substring(2, 4);
  const kunci = r101 + r102;
  const tersimpan = cacheSusenas.get(kunci);
  if (tersimpan) return tersimpan;

  const rows = await query<Record<string, number | string | null>>(`
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
        avg(r1604) as rata_lantai_rumah,
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

  // PENTING: pg mengirim count() sebagai STRING ("0"), jadi wajib Number().
  const hasil: SusenasKabupaten =
    !rows.length || Number(rows[0].total_rt) === 0
      ? { tersedia: false, pesan: 'Data Susenas tidak tersedia untuk wilayah ini.' }
      : { tersedia: true, r101, r102, ...rows[0] };
  cacheSusenas.set(kunci, hasil);
  return hasil;
}
