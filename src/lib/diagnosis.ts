import { labelIdm } from './format';
import type {
  Desa,
  Diagnosis,
  InfraDesa,
  Keterkaitan,
  SusenasKabupaten,
  PilarAnalisis,
  PosisiIdm,
  ProgramRekomendasi,
  TahapanPelaksanaan,
  Temuan,
  TingkatTemuan,
  Tier,
} from './types';

/**
 * Mesin diagnosis desa — deterministik, tanpa LLM, tanpa DB.
 *
 * Mengubah angka mentah (IDM, Podes) menjadi:
 * - posisi IDM: seberapa jauh dari status berikutnya, pilar mana yang menahan
 * - temuan: masalah & kekuatan, masing-masing dengan pembanding dan saran
 * - program: rekomendasi berprioritas lengkap dengan alokasi rupiah,
 *   sasaran, langkah, indikator keberhasilan, mitra, dan risiko
 *
 * Semua angka di sini dihitung dari data desa yang sama dengan layar,
 * jadi narasi AI (yang diberi hasil ini) tidak bisa menyebut angka lain.
 */

/** Ambang resmi status IDM — sama dengan labelIdm() di format.ts. */
export const AMBANG_IDM: { status: string; min: number }[] = [
  { status: 'MANDIRI', min: 0.8155 },
  { status: 'MAJU', min: 0.7072 },
  { status: 'BERKEMBANG', min: 0.5989 },
  { status: 'TERTINGGAL', min: 0.4907 },
  { status: 'SANGAT TERTINGGAL', min: 0 },
];

/** Biaya satuan — SAMA dengan rincianEstimasiBiaya(), jangan dibedakan. */
const BIAYA_AIR_PER_RT = 5_000_000;
const BIAYA_RUMAH_PER_RT = 3_000_000;

const BOBOT_TINGKAT: Record<TingkatTemuan, number> = {
  kritis: 3,
  tinggi: 2,
  sedang: 1,
  baik: 0,
};

const TIER_FISIK: Tier[] = ['FULL', 'MAJOR'];

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const fmtSkor = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtPct = (n: number) =>
  `${n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const fmtAngka = (n: number) => Math.round(n).toLocaleString('id-ID');

/** Huruf kecil di awal untuk dipakai di tengah kalimat — akronim & nama pilar dibiarkan. */
const kecilAwal = (s: string) => (/^(Ketahanan|[A-Z]{2,})/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const besarAwal = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "judul (nilai)" untuk kalimat; nilai yang sudah berkurung tidak dibungkus lagi. */
function sebutTemuan(t: Temuan): string {
  const j = kecilAwal(t.judul);
  if (t.nilai === 'Tidak ada') return j;
  return t.nilai.includes('(') ? `${j}, ${t.nilai}` : `${j} (${t.nilai})`;
}
export const fmtRupiah = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/** Rp ringkas untuk kalimat: "Rp 1,25 miliar", "Rp 350 juta". */
export function rupiahRingkas(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) {
    return `Rp ${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} miliar`;
  }
  if (abs >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} juta`;
  }
  return fmtRupiah(n);
}

function tingkatSkorPilar(v: number): TingkatTemuan {
  if (v < 0.4907) return 'kritis';
  if (v < 0.5989) return 'tinggi';
  if (v < 0.7072) return 'sedang';
  return 'baik';
}

// ─── Posisi IDM ──────────────────────────────────────────────────────

const PILAR_INFO: Record<PilarAnalisis['kode'], { label: string; isi: string }> = {
  iks: {
    label: 'Ketahanan Sosial',
    isi: 'kesehatan, pendidikan, modal sosial, dan permukiman',
  },
  ike: {
    label: 'Ketahanan Ekonomi',
    isi: 'keragaman produksi, akses pasar, lembaga keuangan, dan keterbukaan wilayah',
  },
  ikl: {
    label: 'Ketahanan Lingkungan',
    isi: 'kualitas lingkungan, potensi dan tanggap bencana',
  },
};

export function posisiIdm(desa: Desa): PosisiIdm | null {
  const idm = num(desa.idm);
  if (idm == null) return null;

  const status = labelIdm(idm) ?? 'SANGAT TERTINGGAL';
  const idx = AMBANG_IDM.findIndex((a) => a.status === status);
  const berikut = idx > 0 ? AMBANG_IDM[idx - 1] : null;
  const selisih = berikut ? Math.max(0, berikut.min - idm) : 0;

  const pilar: PilarAnalisis[] = (['iks', 'ike', 'ikl'] as const)
    .map((kode) => ({ kode, nilai: num(desa[kode]) }))
    .filter((p): p is { kode: PilarAnalisis['kode']; nilai: number } => p.nilai != null)
    .map(({ kode, nilai }) => {
      const tingkat = tingkatSkorPilar(nilai);
      const info = PILAR_INFO[kode];
      return {
        kode,
        label: info.label,
        nilai,
        tingkat,
        cakupan: info.isi,
        selisihKeMaju: Math.max(0, 0.7072 - nilai),
      };
    });

  const terlemah = pilar.length ? [...pilar].sort((a, b) => a.nilai - b.nilai)[0] : null;

  // IDM = rata-rata tiga pilar. Kalau hanya pilar terlemah yang dinaikkan,
  // kenaikan yang dibutuhkan pilar itu = 3 × selisih IDM.
  // Kalau kenaikan itu melampaui skor maksimum 1, satu pilar saja tidak cukup.
  const kenaikanMentah = berikut && terlemah ? selisih * 3 : null;
  const kenaikanPilar =
    kenaikanMentah != null && terlemah && kenaikanMentah <= 1 - terlemah.nilai ? kenaikanMentah : null;

  let penjelasan: string;
  if (!berikut) {
    penjelasan =
      `Desa sudah berstatus MANDIRI (IDM ${fmtSkor(idm)}). Fokus intervensi adalah menjaga capaian ` +
      `dan memperkuat pilar yang masih di bawah rata-rata.`;
  } else if (terlemah && kenaikanPilar != null) {
    penjelasan =
      `Untuk naik ke status ${berikut.status}, IDM perlu bertambah ${fmtSkor(selisih)} poin ` +
      `(dari ${fmtSkor(idm)} ke ${fmtSkor(berikut.min)}). Karena IDM adalah rata-rata tiga pilar, ` +
      `jika hanya ${terlemah.label} yang diperbaiki, pilar ini perlu naik ${fmtSkor(kenaikanPilar)} poin ` +
      `(dari ${fmtSkor(terlemah.nilai)} ke ${fmtSkor(terlemah.nilai + kenaikanPilar)}).`;
  } else {
    penjelasan =
      `Untuk naik ke status ${berikut.status}, IDM perlu bertambah ${fmtSkor(selisih)} poin ` +
      `(dari ${fmtSkor(idm)} ke ${fmtSkor(berikut.min)}) — perlu perbaikan di lebih dari satu pilar sekaligus.`;
  }

  return {
    skor: idm,
    status,
    statusBerikut: berikut?.status ?? null,
    ambangBerikut: berikut?.min ?? null,
    selisihKeBerikut: selisih,
    pilar,
    pilarTerlemah: terlemah?.kode ?? null,
    kenaikanPilarTerlemah: kenaikanPilar,
    penjelasan,
  };
}

// ─── Temuan ──────────────────────────────────────────────────────────

/**
 * Ambang mengikuti status-dot di ProfilDesaPanel supaya warna di profil
 * dan tingkat temuan di analisis tidak saling bertentangan.
 */
export interface DataTambahan {
  susenas?: SusenasKabupaten | null;
  infra?: InfraDesa | null;
}

export function kumpulkanTemuan(desa: Desa, posisi: PosisiIdm | null, tambahan: DataTambahan = {}): Temuan[] {
  const out: Temuan[] = [];
  const rt = num(desa.jumlah_rt) ?? 0;
  const jiwa = num(desa.jumlah_jiwa) ?? 0;

  // Pilar IDM
  for (const p of posisi?.pilar ?? []) {
    const sumbu = p.tingkat === 'baik' ? 'kekuatan' : 'masalah';
    out.push({
      id: `pilar_${p.kode}`,
      jenis: sumbu,
      tingkat: p.tingkat,
      pilar: p.label,
      judul:
        sumbu === 'kekuatan'
          ? `${p.label} sudah kuat`
          : `${p.label} ${p.tingkat === 'kritis' ? 'sangat lemah' : p.tingkat === 'tinggi' ? 'lemah' : 'belum optimal'}`,
      nilai: fmtSkor(p.nilai),
      pembanding: 'Ambang status MAJU: 0,7072',
      penjelasan:
        sumbu === 'kekuatan'
          ? `Skor ${p.label} (${fmtSkor(p.nilai)}) sudah di atas ambang desa maju. Pilar ini mencakup ${p.cakupan}.`
          : `Skor ${p.label} ${fmtSkor(p.nilai)}, kurang ${fmtSkor(p.selisihKeMaju)} poin dari ambang desa maju. ` +
            `Pilar ini mencakup ${p.cakupan}.`,
      saran:
        sumbu === 'kekuatan'
          ? 'Pertahankan; jadikan modal untuk mendukung pilar lain.'
          : `Prioritaskan kegiatan yang langsung menyentuh ${p.cakupan.split(',')[0]}.`,
      sumber: 'IDM 2024',
    });
  }

  // Air bersih
  const air = num(desa.pct_air_bersih);
  if (air != null) {
    const tingkat: TingkatTemuan = air < 50 ? 'kritis' : air < 80 ? 'tinggi' : air < 95 ? 'sedang' : 'baik';
    const rtTanpa = Math.round(rt * (1 - air / 100));
    out.push({
      id: 'air',
      jenis: tingkat === 'baik' ? 'kekuatan' : 'masalah',
      tingkat,
      pilar: 'Ketahanan Lingkungan',
      judul: tingkat === 'baik' ? 'Akses air bersih hampir merata' : 'Akses air bersih belum merata',
      nilai: fmtPct(air),
      pembanding: 'Target SDGs 6.1: 100% rumah tangga',
      penjelasan:
        tingkat === 'baik'
          ? `${fmtPct(air)} rumah tangga sudah punya akses air bersih.`
          : `Sekitar ${fmtAngka(rtTanpa)} dari ${fmtAngka(rt)} rumah tangga belum punya akses air bersih memadai. ` +
            `Kekurangan air berdampak langsung pada kesehatan (diare, stunting) dan waktu kerja perempuan.`,
      saran:
        tingkat === 'baik'
          ? 'Fokus pada pemeliharaan jaringan dan kualitas air.'
          : `Petakan dusun/RT yang belum terlayani; perkiraan kebutuhan ${rupiahRingkas(rtTanpa * BIAYA_AIR_PER_RT)} untuk sambungan baru.`,
      sumber: 'Podes',
    });
  }

  // Rumah tidak layak huni
  const miskin = num(desa.pct_rumah_miskin);
  if (miskin != null) {
    const tingkat: TingkatTemuan = miskin > 40 ? 'kritis' : miskin > 20 ? 'tinggi' : miskin > 10 ? 'sedang' : 'baik';
    const rtMiskin = Math.round((rt * miskin) / 100);
    out.push({
      id: 'miskin',
      jenis: tingkat === 'baik' ? 'kekuatan' : 'masalah',
      tingkat,
      pilar: 'Ketahanan Sosial',
      judul: tingkat === 'baik' ? 'Rumah tidak layak huni relatif sedikit' : 'Banyak rumah tidak layak huni',
      nilai: fmtPct(miskin),
      pembanding: 'Batas wajar: ≤ 20% rumah tangga',
      penjelasan:
        `Sekitar ${fmtAngka(rtMiskin)} rumah tangga tinggal di rumah tidak layak huni — indikator kemiskinan ` +
        `yang kasatmata dan berkaitan dengan sanitasi serta kesehatan keluarga.`,
      saran:
        tingkat === 'baik'
          ? 'Cukup ditangani lewat program reguler (RTLH kabupaten).'
          : `Sinkronkan dengan data DTKS/P3KE; perkiraan bedah rumah ${rupiahRingkas(rtMiskin * BIAYA_RUMAH_PER_RT)}.`,
      sumber: 'Podes',
    });
  }

  // Pendidikan SMP+
  const smpPlus = num(desa.pct_smp_plus);
  if (smpPlus != null) {
    const tingkat: TingkatTemuan = smpPlus < 30 ? 'kritis' : smpPlus < 50 ? 'tinggi' : smpPlus < 70 ? 'sedang' : 'baik';
    out.push({
      id: 'smp_plus',
      jenis: tingkat === 'baik' ? 'kekuatan' : 'masalah',
      tingkat,
      pilar: 'Ketahanan Sosial',
      judul: tingkat === 'baik' ? 'Tingkat pendidikan penduduk baik' : 'Tingkat pendidikan penduduk rendah',
      nilai: fmtPct(smpPlus),
      pembanding: 'Wajib belajar 9 tahun: idealnya ≥ 70% tamat SMP',
      penjelasan:
        `${fmtPct(smpPlus)} penduduk tamat SMP atau lebih tinggi. ` +
        (tingkat === 'baik'
          ? 'Modal SDM ini memudahkan pelatihan keterampilan dan adopsi teknologi.'
          : 'Pendidikan rendah membatasi akses ke pekerjaan bergaji layak dan menyulitkan pelatihan berbasis teks.'),
      saran:
        tingkat === 'baik'
          ? 'Manfaatkan untuk program vokasi dan digitalisasi usaha.'
          : 'Rancang pelatihan berbasis praktik/visual; dukung Paket B/C dan beasiswa transisi SD→SMP.',
      sumber: 'Podes',
    });
  }

  // Ketergantungan pertanian
  const tani = num(desa.pct_pertanian);
  if (tani != null) {
    const tingkat: TingkatTemuan = tani > 85 ? 'tinggi' : tani > 65 ? 'sedang' : 'baik';
    out.push({
      id: 'pertanian',
      jenis: tingkat === 'baik' ? 'kekuatan' : 'masalah',
      tingkat,
      pilar: 'Ketahanan Ekonomi',
      judul:
        tingkat === 'baik' ? 'Sumber penghasilan cukup beragam' : 'Penghasilan bergantung pada pertanian',
      nilai: fmtPct(tani),
      pembanding: 'Ketergantungan > 65% dinilai rentan',
      penjelasan:
        tingkat === 'baik'
          ? `${fmtPct(tani)} penduduk bergantung pada pertanian — ekonomi desa tidak bertumpu pada satu sektor.`
          : `${fmtPct(tani)} penduduk bergantung pada pertanian. Gagal panen, harga jatuh, atau cuaca ekstrem ` +
            `langsung memukul pendapatan sebagian besar keluarga.`,
      saran:
        tingkat === 'baik'
          ? 'Kembangkan rantai nilai sektor yang sudah ada.'
          : 'Tambah nilai hasil tani (pengolahan, pemasaran bersama) dan buka usaha non-pertanian lewat BUMDes.',
      sumber: 'Podes',
    });
  }

  // Fasilitas — pakai daftar fasilitas Podes 2025 (per jenjang/jenis) bila ada;
  // kalau tidak, jatuh ke flag ada_sd/ada_smp/ada_faskes.
  const infra = tambahan.infra?.tersedia ? tambahan.infra : null;
  const hitung = (labels: string[]) => labels.reduce((a, l) => a + (infra?.jumlah[l] ?? 0), 0);
  const rincian = (labels: string[]) =>
    labels.filter((l) => infra?.jumlah[l]).map((l) => `${infra!.jumlah[l]} ${l}`).join(', ');
  const tidakAda = (id: string, tingkat: TingkatTemuan, nama: string, pilar: string, penjelasan: string, saran: string) =>
    out.push({
      id,
      jenis: 'masalah',
      tingkat,
      pilar,
      judul: `Belum ada ${nama} di desa`,
      nilai: 'Tidak ada',
      pembanding: 'Standar pelayanan minimal: tersedia di desa/terjangkau',
      penjelasan,
      saran,
      sumber: infra ? 'Podes 2025 (daftar fasilitas)' : 'Podes',
    });

  const LABEL_FASKES = ['Rumah Sakit', 'Puskesmas', 'Puskesmas Pembantu', 'Polindes', 'Puskesdes', 'Klinik', 'Praktik Bidan', 'Praktik Dokter', 'Balai Pengobatan'];
  const nFaskes = infra ? hitung(LABEL_FASKES) : Number(desa.ada_faskes ?? 0);
  if (!nFaskes) {
    tidakAda('faskes', 'tinggi', 'fasilitas kesehatan', 'Ketahanan Sosial',
      `${fmtAngka(jiwa)} jiwa harus keluar desa untuk layanan kesehatan dasar, termasuk ibu hamil dan balita.`,
      'Pastikan minimal Poskesdes/Pustu dengan bidan desa; sementara itu jadwalkan Puskesmas keliling rutin.');
  }
  if (infra) {
    const nPosyandu = hitung(['Posyandu']);
    if (!nPosyandu) {
      tidakAda('posyandu', 'tinggi', 'posyandu', 'Ketahanan Sosial',
        'Tanpa posyandu, pemantauan tumbuh kembang balita, imunisasi, dan deteksi stunting tidak berjalan rutin.',
        'Bentuk posyandu per dusun dengan kader terlatih; ini intervensi stunting paling murah.');
    }
    if (nFaskes || nPosyandu) {
      out.push({
        id: 'faskes_ada',
        jenis: 'kekuatan',
        tingkat: 'baik',
        pilar: 'Ketahanan Sosial',
        judul: 'Layanan kesehatan dasar tersedia',
        nilai: rincian([...LABEL_FASKES, 'Posyandu']),
        pembanding: 'Podes 2025',
        penjelasan: 'Fasilitas ini bisa menjadi titik layanan untuk program kesehatan dan gizi.',
        saran: 'Perkuat yang sudah ada (alat, kader, jadwal) sebelum membangun baru.',
        sumber: 'Podes 2025 (daftar fasilitas)',
      });
    }
  }

  const nPaud = infra ? hitung(['Kelompok Bermain', 'TK', 'RA', 'Bustanul Atfal']) : null;
  const nSd = infra ? hitung(['SD', 'MI']) : Number(desa.ada_sd ?? 0);
  const nSmp = infra ? hitung(['SMP', 'MTs']) : Number(desa.ada_smp ?? 0);
  const nSma = infra ? hitung(['SMA', 'MA', 'SMK', 'MAK']) : null;
  if (nPaud === 0) {
    tidakAda('paud', 'sedang', 'PAUD (KB/TK/RA)', 'Ketahanan Sosial',
      'Anak usia 3–6 tahun kehilangan stimulasi dini; kesiapan masuk SD dan deteksi gangguan tumbuh kembang terlambat.',
      'Buka PAUD berbasis komunitas (bisa memakai balai desa/rumah warga) dengan bunda PAUD terlatih.');
  }
  if (!nSd) {
    tidakAda('sd', 'tinggi', 'SD/MI', 'Ketahanan Sosial',
      'Anak usia 7–12 tahun harus menempuh perjalanan ke desa lain; risiko putus sekolah lebih tinggi.',
      'Koordinasi dengan Dinas Pendidikan untuk SD kecil/kelas jauh atau bantuan transportasi siswa.');
  }
  if (!nSmp) {
    tidakAda('smp', 'sedang', 'SMP/MTs', 'Ketahanan Sosial',
      'Transisi SD→SMP rawan putus karena jarak dan biaya transportasi.',
      'Pertimbangkan SMP satu atap, asrama, atau subsidi transportasi siswa.');
  } else if (nSma === 0) {
    tidakAda('sma', 'sedang', 'SMA/MA/SMK', 'Ketahanan Sosial',
      'Lulusan SMP harus keluar desa untuk melanjutkan; banyak yang berhenti dan langsung bekerja.',
      'Beasiswa dan bantuan transportasi/asrama untuk lulusan SMP; jalin kerja sama dengan SMK terdekat.');
  }
  if (infra && nSd && nSmp && nSma) {
    out.push({
      id: 'sekolah_ada',
      jenis: 'kekuatan',
      tingkat: 'baik',
      pilar: 'Ketahanan Sosial',
      judul: 'Sekolah tersedia hingga jenjang menengah',
      nilai: rincian(['Kelompok Bermain', 'TK', 'RA', 'SD', 'MI', 'SMP', 'MTs', 'SMA', 'MA', 'SMK', 'MAK']),
      pembanding: 'Podes 2025',
      penjelasan: 'Akses sekolah di desa sudah lengkap; tantangan beralih ke mutu dan keberlanjutan belajar.',
      saran: 'Fokus pada mutu (guru, buku, literasi) dan mencegah putus sekolah, bukan gedung baru.',
      sumber: 'Podes 2025 (daftar fasilitas)',
    });
  }

  // Telekomunikasi — akses pasar, informasi, dan layanan digital
  if (infra && !hitung(['Menara Seluler', 'Jasa Internet', 'Warnet'])) {
    out.push({
      id: 'digital',
      jenis: 'masalah',
      tingkat: 'sedang',
      pilar: 'Ketahanan Ekonomi',
      judul: 'Tidak tercatat menara seluler/penyedia internet',
      nilai: 'Tidak ada',
      pembanding: 'Podes 2025: menara seluler, jasa internet, warnet',
      penjelasan:
        'Tanpa infrastruktur telekomunikasi di desa, pemasaran daring, layanan administrasi digital, dan informasi harga sulit dijangkau. ' +
        '(Sinyal mungkin masih dari menara desa tetangga — perlu dicek di lapangan.)',
      saran: 'Petakan titik sinyal; usulkan BTS/akses internet desa ke Kominfo (BAKTI) atau pasang internet desa via BUMDes.',
      sumber: 'Podes 2025 (daftar fasilitas)',
    });
  }

  // Lahan kritis & hutan (luas wilayah sebagai penyebut)
  const luas = num(desa.luas_admin_ha) ?? num(desa.luas_hektar);
  const kritis = num(desa.lahan_kritis_ha);
  if (kritis != null && kritis > 0 && luas && luas > 0) {
    const pct = (kritis / luas) * 100;
    const tingkat: TingkatTemuan = pct > 20 ? 'tinggi' : pct > 5 ? 'sedang' : 'baik';
    if (tingkat !== 'baik') {
      out.push({
        id: 'lahan_kritis',
        jenis: 'masalah',
        tingkat,
        pilar: 'Ketahanan Lingkungan',
        judul: 'Ada lahan kritis yang luas',
        nilai: `${kritis.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ha (${fmtPct(pct)})`,
        pembanding: 'Porsi > 5% wilayah perlu rehabilitasi',
        penjelasan:
          'Lahan kritis menurunkan daya serap air dan produktivitas, serta menaikkan risiko longsor/banjir.',
        saran:
          'Usulkan rehabilitasi lahan (agroforestri, penanaman pohon produktif) lewat BPDAS/Dinas Lingkungan Hidup — di luar anggaran ini.',
        sumber: 'KLHK (lahan kritis)',
      });
    }
  }
  const hutan = num(desa.hutan_alam_ha_2024);
  if (hutan != null && hutan > 0 && luas && luas > 0) {
    const pct = (hutan / luas) * 100;
    if (pct >= 20) {
      out.push({
        id: 'hutan',
        jenis: 'kekuatan',
        tingkat: 'baik',
        pilar: 'Ketahanan Lingkungan',
        judul: 'Tutupan hutan alam masih luas',
        nilai: `${hutan.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ha (${fmtPct(pct)})`,
        pembanding: '≥ 20% wilayah berhutan alam',
        penjelasan:
          'Hutan alam adalah aset: sumber air, hasil hutan bukan kayu, dan peluang skema perhutanan sosial.',
        saran:
          'Jaga lewat Perhutanan Sosial/hutan desa; kembangkan HHBK (madu, rotan, kopi bawah tegakan) dan ekowisata.',
        sumber: 'KLHK (hutan alam)',
      });
    }
  }

  if (!out.some((t) => t.id === 'lahan_kritis') && desa.lahan_kritis_status === 'Lahan Kritis' && !(kritis && kritis > 0)) {
    out.push({
      id: 'lahan_kritis',
      jenis: 'masalah',
      tingkat: 'sedang',
      pilar: 'Ketahanan Lingkungan',
      judul: 'Desa berstatus lahan kritis',
      nilai: 'Lahan Kritis',
      pembanding: 'Status KLHK',
      penjelasan: 'Sebagian wilayah desa tergolong lahan kritis, tetapi luasnya tidak tercatat.',
      saran: 'Verifikasi luas & lokasi di lapangan; usulkan rehabilitasi lewat BPDAS/Dinas Lingkungan Hidup.',
      sumber: 'KLHK (lahan kritis)',
    });
  }

  // Susenas — agregat KABUPATEN, jadi tingkatnya dibatasi "tinggi"
  // dan judulnya selalu menyebut kabupaten supaya tidak dibaca sebagai data desa.
  const s = tambahan.susenas?.tersedia ? tambahan.susenas : null;
  if (s) {
    const ind: {
      id: string; kolom: string; arah: 'naik_buruk' | 'turun_buruk'; tinggi: number; sedang: number;
      pilar: string; judul: string; pembanding: string; penjelasan: string; saran: string;
    }[] = [
      {
        id: 'pangan', kolom: 'khawatir_makan_pct', arah: 'naik_buruk', tinggi: 30, sedang: 15,
        pilar: 'Ketahanan Sosial', judul: 'Rawan pangan di tingkat kabupaten',
        pembanding: 'Waspada bila > 15% RT khawatir tidak cukup makan',
        penjelasan: 'rumah tangga di kabupaten ini khawatir tidak cukup makan dalam setahun terakhir — tanda kerawanan pangan yang berkaitan dengan stunting.',
        saran: 'Kaitkan program dengan pekarangan pangan lestari, PMT lokal, dan lumbung pangan desa.',
      },
      {
        id: 'sanitasi', kolom: 'punya_toilet_pct', arah: 'turun_buruk', tinggi: 70, sedang: 90,
        pilar: 'Ketahanan Lingkungan', judul: 'Kepemilikan jamban rendah di kabupaten',
        pembanding: 'Target STBM: 100% RT punya jamban sehat',
        penjelasan: 'rumah tangga di kabupaten ini punya fasilitas buang air sendiri; sisanya berisiko BAB sembarangan yang mencemari sumber air.',
        saran: 'Padukan program air bersih dengan pemicuan STBM dan jamban sehat keluarga.',
      },
      {
        id: 'kekurangan_air', kolom: 'kekurangan_air_pct', arah: 'naik_buruk', tinggi: 20, sedang: 10,
        pilar: 'Ketahanan Lingkungan', judul: 'Sering kekurangan air minum di kabupaten',
        pembanding: 'Waspada bila > 10% RT pernah kekurangan air',
        penjelasan: 'rumah tangga di kabupaten ini pernah kekurangan air minum — menunjukkan masalah ketersediaan, bukan hanya akses.',
        saran: 'Utamakan penampungan dan konservasi sumber air, bukan hanya jaringan pipa.',
      },
      {
        id: 'listrik', kolom: 'listrik_pln_pct', arah: 'turun_buruk', tinggi: 80, sedang: 95,
        pilar: 'Ketahanan Ekonomi', judul: 'Akses listrik PLN belum merata di kabupaten',
        pembanding: 'Target rasio elektrifikasi: 100%',
        penjelasan: 'rumah tangga di kabupaten ini memakai listrik PLN; sisanya bergantung pada genset/tenaga surya atau belum berlistrik.',
        saran: 'Pastikan sarana yang dibangun (pompa, cold storage) punya sumber energi; pertimbangkan PLTS komunal.',
      },
      {
        id: 'buta_huruf', kolom: 'buta_huruf_pct', arah: 'naik_buruk', tinggi: 10, sedang: 5,
        pilar: 'Ketahanan Sosial', judul: 'Angka buta huruf tinggi di kabupaten',
        pembanding: 'Waspada bila > 5% penduduk',
        penjelasan: 'penduduk di kabupaten ini tidak bisa membaca-menulis — materi pelatihan berbasis teks tidak akan efektif.',
        saran: 'Gunakan pelatihan praktik/visual dan sisipkan keaksaraan fungsional.',
      },
    ];
    for (const x of ind) {
      const v = num(s[x.kolom]);
      if (v == null) continue;
      const tingkat: TingkatTemuan =
        x.arah === 'naik_buruk'
          ? v > x.tinggi ? 'tinggi' : v > x.sedang ? 'sedang' : 'baik'
          : v < x.tinggi ? 'tinggi' : v < x.sedang ? 'sedang' : 'baik';
      if (tingkat === 'baik') continue;
      out.push({
        id: x.id,
        jenis: 'masalah',
        tingkat,
        pilar: x.pilar,
        judul: x.judul,
        nilai: fmtPct(v),
        pembanding: x.pembanding,
        penjelasan: `${fmtPct(v)} ${x.penjelasan}`,
        saran: x.saran,
        sumber: 'Susenas 2025 (tingkat kabupaten)',
      });
    }
  }

  // Urut: masalah dulu (paling parah di atas), lalu kekuatan
  return out.sort((a, b) => {
    if (a.jenis !== b.jenis) return a.jenis === 'masalah' ? -1 : 1;
    return BOBOT_TINGKAT[b.tingkat] - BOBOT_TINGKAT[a.tingkat];
  });
}

// ─── Program rekomendasi ─────────────────────────────────────────────

interface ProgramInfo {
  bidang: string;
  pilar: string;
  /** id temuan yang menjadi dasar program ini */
  dasar: string[];
  tujuan: string;
  langkahFisik: string[];
  langkahNonFisik: string[];
  mitra: string[];
  danaPelengkap: string[];
  risiko: { risiko: string; mitigasi: string }[];
}

const PROGRAM: Record<string, ProgramInfo> = {
  water_system: {
    bidang: 'Air bersih & sanitasi',
    pilar: 'Ketahanan Lingkungan',
    dasar: ['air', 'kekurangan_air', 'sanitasi', 'pilar_ikl'],
    tujuan: 'Memperluas akses air bersih yang aman dan berkelanjutan bagi rumah tangga yang belum terlayani.',
    langkahFisik: [
      'Survei sumber air (debit, kualitas) dan peta RT yang belum terlayani bersama perangkat dusun.',
      'Susun DED (desain teknis) dan RAB; pilih skema: perpipaan gravitasi, sumur bor, atau penampungan air hujan.',
      'Bentuk/aktifkan KP-SPAMS (kelompok pengelola) dan sepakati iuran pemeliharaan sebelum konstruksi.',
      'Konstruksi dengan pola padat karya tunai desa; uji kualitas air sebelum serah terima.',
    ],
    langkahNonFisik: [
      'Petakan RT tanpa akses air dan sumber air alternatif yang ada.',
      'Perbaiki sumur/penampungan existing dan distribusikan filter air rumah tangga ke RT prioritas.',
      'Edukasi PHBS: cuci tangan pakai sabun, pengolahan air minum rumah tangga, jamban sehat.',
      'Siapkan proposal SPAM ke Dinas PUPR/Pamsimas sebagai tahap lanjutan.',
    ],
    mitra: ['Dinas PUPR kabupaten', 'Perumda Air Minum (PDAM)', 'Puskesmas (sanitarian)', 'KP-SPAMS / BUMDes'],
    danaPelengkap: ['Dana Desa (prioritas air bersih)', 'DAK Air Minum', 'Program Pamsimas', 'CSR perusahaan sekitar'],
    risiko: [
      { risiko: 'Sumber air menyusut saat kemarau', mitigasi: 'Ukur debit di musim kemarau, sediakan bak penampung cadangan.' },
      { risiko: 'Sarana rusak tanpa pemeliharaan', mitigasi: 'Iuran warga dan KP-SPAMS ditetapkan sebelum konstruksi.' },
    ],
  },
  health_infrastructure: {
    bidang: 'Layanan kesehatan',
    pilar: 'Ketahanan Sosial',
    dasar: ['faskes', 'posyandu', 'pangan', 'pilar_iks'],
    tujuan: 'Mendekatkan layanan kesehatan dasar dan menurunkan risiko stunting serta kematian ibu–anak.',
    langkahFisik: [
      'Tetapkan lokasi Poskesdes/Pustu di titik yang terjangkau mayoritas dusun; pastikan status lahan jelas.',
      'Koordinasikan penempatan bidan/perawat desa dengan Dinas Kesehatan SEBELUM membangun gedung.',
      'Bangun/renovasi sesuai standar Kemenkes, lengkapi alat kesehatan dasar dan air bersih.',
      'Integrasikan dengan jadwal posyandu dan rujukan ke Puskesmas induk.',
    ],
    langkahNonFisik: [
      'Data ulang balita, ibu hamil, dan lansia per dusun sebagai baseline.',
      'Latih dan beri insentif kader posyandu; lengkapi timbangan, alat ukur tinggi, dan KMS.',
      'Jalankan PMT (pemberian makanan tambahan) berbahan pangan lokal untuk balita berisiko stunting.',
      'Jadwalkan Puskesmas keliling bulanan untuk dusun terjauh.',
    ],
    mitra: ['Puskesmas induk kecamatan', 'Dinas Kesehatan kabupaten', 'Kader posyandu & PKK', 'Bidan desa'],
    danaPelengkap: ['Dana Desa (pencegahan stunting)', 'DAK Kesehatan', 'BOK Puskesmas', 'CSR'],
    risiko: [
      { risiko: 'Gedung jadi tapi tidak ada tenaga kesehatan', mitigasi: 'Kunci komitmen penempatan tenaga dari Dinkes sejak perencanaan.' },
      { risiko: 'Partisipasi posyandu rendah', mitigasi: 'Libatkan tokoh agama/adat dan PKK untuk penggerakan.' },
    ],
  },
  education_infrastructure: {
    bidang: 'Pendidikan',
    pilar: 'Ketahanan Sosial',
    dasar: ['paud', 'sd', 'smp', 'sma', 'smp_plus', 'buta_huruf'],
    tujuan: 'Menjaga anak tetap bersekolah hingga tamat SMP dan menaikkan kualitas belajar.',
    langkahFisik: [
      'Verifikasi data siswa & sekolah di Dapodik; pastikan kebutuhan ruang kelas nyata, bukan perkiraan.',
      'Koordinasikan dengan Dinas Pendidikan soal status sekolah dan penempatan guru.',
      'Bangun/renovasi ruang kelas, sanitasi sekolah, dan akses air.',
      'Lengkapi mebel, buku, dan alat peraga setelah konstruksi selesai.',
    ],
    langkahNonFisik: [
      'Data anak usia sekolah yang tidak/putus sekolah per dusun.',
      'Beri beasiswa/bantuan transportasi untuk transisi SD→SMP.',
      'Buka pojok baca/taman bacaan desa dan kelas literasi-numerasi.',
      'Fasilitasi Paket B/C bagi remaja dan dewasa yang belum tamat SMP.',
    ],
    mitra: ['Dinas Pendidikan kabupaten', 'Kepala sekolah & komite sekolah', 'PKBM setempat', 'Perpustakaan daerah'],
    danaPelengkap: ['DAK Pendidikan', 'BOS sekolah', 'Program Indonesia Pintar (PIP)', 'CSR pendidikan'],
    risiko: [
      { risiko: 'Kekurangan guru setelah ruang kelas jadi', mitigasi: 'Pastikan rencana penempatan guru dari Dinas Pendidikan.' },
      { risiko: 'Anak tetap putus sekolah karena bekerja', mitigasi: 'Gabungkan beasiswa dengan pendampingan keluarga.' },
    ],
  },
  livelihood_diversification: {
    bidang: 'Ekonomi & mata pencaharian',
    pilar: 'Ketahanan Ekonomi',
    dasar: ['pertanian', 'miskin', 'pangan', 'lahan_kritis', 'digital', 'pilar_ike'],
    tujuan: 'Menaikkan dan menstabilkan pendapatan keluarga lewat nilai tambah produk dan usaha baru.',
    langkahFisik: [
      'Pilih 1–2 komoditas unggulan berdasarkan volume produksi dan permintaan pasar.',
      'Bangun sarana pascapanen/pengolahan (gudang, pengering, cold storage) yang dikelola BUMDes/koperasi.',
      'Siapkan perjanjian pasokan dengan pembeli (offtaker) sebelum sarana beroperasi.',
      'Latih pengelola soal manajemen usaha, pembukuan, dan perawatan alat.',
    ],
    langkahNonFisik: [
      'Petakan komoditas, harga jual, dan tengkulak/rantai pasok saat ini.',
      'Bentuk/perkuat kelompok tani/usaha; latih pengolahan produk dan pemasaran digital.',
      'Fasilitasi akses KUR/kredit mikro dan legalitas usaha (NIB, PIRT, halal).',
      'Prioritaskan rumah tangga miskin dan perempuan sebagai peserta.',
    ],
    mitra: ['Dinas Pertanian & Koperasi-UMKM', 'Penyuluh pertanian (PPL)', 'BUMDes / koperasi', 'Bank penyalur KUR'],
    danaPelengkap: ['Dana Desa (ketahanan pangan, penyertaan modal BUMDes)', 'KUR', 'Program kementerian sektor', 'CSR'],
    risiko: [
      { risiko: 'Produk tidak terserap pasar', mitigasi: 'Amankan pembeli/offtaker sebelum produksi diperbesar.' },
      { risiko: 'Modal usaha habis untuk konsumsi', mitigasi: 'Salurkan bertahap lewat kelompok dengan pendampingan.' },
    ],
  },
  community_governance: {
    bidang: 'Tata kelola desa',
    pilar: 'Lintas pilar',
    // Sengaja kosong: tata kelola menopang semua pilar, jadi menghitung
    // pilar di sini membuatnya terhitung ganda dan menyalip program sektor.
    dasar: [],
    tujuan: 'Memperkuat kapasitas pemerintah desa merencanakan, menganggarkan, dan melaporkan pembangunan.',
    langkahFisik: [
      'Nilai kebutuhan ruang layanan publik (kantor desa/balai) bersama BPD.',
      'Bangun/renovasi dengan ruang pelayanan, arsip, dan akses internet.',
      'Pasang sistem informasi desa (SID) dan data kependudukan terpadu.',
      'Latih operator desa untuk pemutakhiran data berkala.',
    ],
    langkahNonFisik: [
      'Latih aparatur dan BPD soal perencanaan berbasis data (RPJMDes/RKPDes) dan pengadaan.',
      'Fasilitasi musyawarah desa yang inklusif (perempuan, pemuda, kelompok miskin).',
      'Perkuat BUMDes: rencana usaha, pembukuan, dan laporan pertanggungjawaban.',
      'Publikasikan APBDes di papan informasi dan kanal digital desa.',
    ],
    mitra: ['DPMD kabupaten', 'Pendamping desa (P3MD)', 'Camat', 'BPD'],
    danaPelengkap: ['Alokasi Dana Desa (ADD)', 'Dana Desa (operasional)', 'Program peningkatan kapasitas kabupaten'],
    risiko: [
      { risiko: 'Pelatihan tidak berlanjut karena rotasi aparatur', mitigasi: 'Dokumentasikan SOP dan latih lebih dari satu orang.' },
    ],
  },
  monitoring: {
    bidang: 'Monitoring & pendampingan',
    pilar: 'Lintas pilar',
    dasar: [],
    tujuan: 'Memastikan setiap rupiah tercatat, kegiatan tepat sasaran, dan dampak terukur.',
    langkahFisik: [],
    langkahNonFisik: [
      'Kumpulkan data baseline untuk setiap indikator sebelum kegiatan dimulai.',
      'Kunjungan lapangan berkala (minimal per triwulan) dan rapat evaluasi dengan aparat desa.',
      'Laporan keuangan dan foto dokumentasi per tahap pencairan.',
      'Evaluasi akhir: bandingkan indikator dengan baseline dan rumuskan pelajaran.',
    ],
    mitra: ['Pendamping desa (P3MD)', 'Inspektorat kabupaten', 'BPD'],
    danaPelengkap: [],
    risiko: [
      { risiko: 'Data baseline tidak dikumpulkan sehingga dampak tak terukur', mitigasi: 'Jadikan baseline syarat pencairan tahap pertama.' },
    ],
  },
};

/** Porsi tetap untuk monitoring & pendampingan. */
const PORSI_MONITORING = 0.07;

function sasaranDanIndikator(
  key: string,
  desa: Desa,
  alokasi: number,
  tier: Tier,
): { sasaran: string; indikator: string[]; jangkauan: string | null } {
  const rt = num(desa.jumlah_rt) ?? 0;
  const jiwa = num(desa.jumlah_jiwa) ?? 0;
  const fisik = TIER_FISIK.includes(tier);

  switch (key) {
    case 'water_system': {
      const air = num(desa.pct_air_bersih);
      if (air == null) {
        return {
          sasaran: `${fmtAngka(rt)} rumah tangga (data akses air belum tersedia)`,
          indikator: ['Persentase RT dengan akses air bersih (ukur baseline saat survei)', 'Jumlah sarana air berfungsi'],
          jangkauan: null,
        };
      }
      const rtTanpa = Math.round(rt * (1 - air / 100));
      const terlayani = Math.min(rtTanpa, Math.floor(alokasi / BIAYA_AIR_PER_RT));
      const target = rt > 0 ? Math.min(100, air + (terlayani / rt) * 100) : air;
      return {
        sasaran: `${fmtAngka(rtTanpa)} rumah tangga yang belum punya akses air bersih`,
        indikator: fisik
          ? [
              `Akses air bersih naik dari ${fmtPct(air)} menjadi ±${fmtPct(target)} rumah tangga`,
              `±${fmtAngka(terlayani)} sambungan/titik layanan baru berfungsi`,
              'KP-SPAMS aktif dengan iuran pemeliharaan berjalan',
            ]
          : [
              `${fmtAngka(rtTanpa)} RT sasaran menerima filter/edukasi PHBS air`,
              'Jumlah sarana air existing yang diperbaiki dan berfungsi',
              'Proposal SPAM diajukan ke Dinas PUPR/Pamsimas',
            ],
        jangkauan: fisik
          ? `Dengan biaya satuan model ${rupiahRingkas(BIAYA_AIR_PER_RT)}/RT, alokasi ini setara ±${fmtAngka(terlayani)} sambungan baru.`
          : null,
      };
    }
    case 'health_infrastructure':
      return {
        sasaran: `${fmtAngka(jiwa)} jiwa, prioritas ibu hamil, balita, dan lansia`,
        indikator: [
          fisik ? 'Poskesdes/Pustu beroperasi dengan tenaga kesehatan tetap' : 'Seluruh posyandu aktif dengan kader terlatih',
          'Persentase balita ditimbang dan diukur tiap bulan (laporan posyandu)',
          'Jumlah balita stunting turun dibanding baseline (data e-PPGBM)',
        ],
        jangkauan: null,
      };
    case 'education_infrastructure': {
      const smp = num(desa.pct_smp_plus);
      return {
        sasaran: 'Anak usia sekolah 7–15 tahun dan remaja/dewasa yang belum tamat SMP',
        indikator: [
          'Angka putus sekolah SD/SMP turun (data Dapodik/sekolah)',
          smp != null
            ? `Penduduk tamat SMP+ naik dari ${fmtPct(smp)} (jangka panjang, lewat Paket B/C dan transisi SD→SMP)`
            : 'Jumlah peserta Paket B/C yang lulus',
          fisik ? 'Ruang kelas layak bertambah sesuai kebutuhan Dapodik' : 'Jumlah penerima beasiswa/bantuan transportasi',
        ],
        jangkauan: null,
      };
    }
    case 'livelihood_diversification': {
      const miskin = num(desa.pct_rumah_miskin);
      const rtMiskin = miskin != null ? Math.round((rt * miskin) / 100) : null;
      return {
        sasaran:
          rtMiskin != null && rtMiskin > 0
            ? `${fmtAngka(rtMiskin)} rumah tangga miskin dan kelompok tani/usaha desa`
            : 'Kelompok tani/usaha desa dan rumah tangga berpendapatan rendah',
        indikator: [
          'Pendapatan rata-rata peserta naik dibanding baseline (survei sebelum–sesudah)',
          'Jumlah produk olahan/usaha baru yang berjalan ≥ 6 bulan',
          'Omzet dan laba BUMDes/kelompok tercatat dalam pembukuan',
        ],
        jangkauan: null,
      };
    }
    case 'community_governance':
      return {
        sasaran: 'Aparatur desa, BPD, pengurus BUMDes, dan perwakilan warga',
        indikator: [
          'RKPDes/APBDes disusun berbasis data dan dipublikasikan',
          'Laporan realisasi Dana Desa tepat waktu tanpa temuan',
          'Kehadiran perempuan & kelompok miskin di musyawarah desa',
        ],
        jangkauan: null,
      };
    default:
      return {
        sasaran: 'Seluruh kegiatan dalam paket intervensi ini',
        indikator: [
          'Baseline tersedia untuk semua indikator sebelum pelaksanaan',
          'Laporan kemajuan per triwulan diterima tepat waktu',
          'Evaluasi akhir dibandingkan dengan baseline',
        ],
        jangkauan: null,
      };
  }
}

function durasi(tier: Tier): string {
  switch (tier) {
    case 'FULL':
    case 'MAJOR':
      return '12–18 bulan';
    case 'MEDIUM':
      return '6–12 bulan';
    default:
      return '3–6 bulan';
  }
}

/** Bulatkan alokasi ke Rp 1 juta tanpa mengubah total (selisih masuk ke prioritas 1). */
function bagiAnggaran(anggaran: number, bobot: number[]): number[] {
  const total = bobot.reduce((a, b) => a + b, 0);
  if (total <= 0 || anggaran <= 0) return bobot.map(() => 0);
  const satuan = anggaran >= 50_000_000 ? 1_000_000 : 1;
  const hasil = bobot.map((b) => Math.floor(((anggaran * b) / total) / satuan) * satuan);
  const sisa = anggaran - hasil.reduce((a, b) => a + b, 0);
  const iMaks = bobot.indexOf(Math.max(...bobot));
  hasil[iMaks] += sisa;
  return hasil;
}

export function susunProgram(
  desa: Desa,
  anggaran: number,
  tier: Tier,
  kegiatanPerKey: Record<string, string[]>,
  temuan: Temuan[],
): ProgramRekomendasi[] {
  const keys = Object.keys(kegiatanPerKey).filter((k) => kegiatanPerKey[k]?.length);
  if (!keys.length) return [];

  const temuanById = new Map(temuan.map((t) => [t.id, t]));
  const inti = keys.filter((k) => k !== 'monitoring');
  const adaMonitoring = keys.includes('monitoring');

  const skor = (k: string) => {
    const info = PROGRAM[k];
    if (!info) return 1;
    return 1 + info.dasar.reduce((a, id) => {
      const t = temuanById.get(id);
      return a + (t && t.jenis === 'masalah' ? BOBOT_TINGKAT[t.tingkat] : 0);
    }, 0);
  };

  // Urut prioritas: skor keparahan tertinggi dulu; seri → urutan dari data Podes
  const urut = [...inti].sort((a, b) => skor(b) - skor(a));

  const satuan = anggaran >= 50_000_000 ? 1_000_000 : 1;
  const danaMonitoring = !adaMonitoring
    ? 0
    : inti.length
      ? Math.round((anggaran * PORSI_MONITORING) / satuan) * satuan
      : anggaran;
  const danaInti = anggaran - danaMonitoring;
  const alokasiInti = bagiAnggaran(danaInti, urut.map(skor));

  const daftar = [...urut, ...(adaMonitoring ? ['monitoring'] : [])];
  const alokasi = [...alokasiInti, ...(adaMonitoring ? [danaMonitoring] : [])];
  const fisik = TIER_FISIK.includes(tier);

  return daftar.map((key, i) => {
    const info = PROGRAM[key] ?? {
      bidang: key,
      pilar: 'Lintas pilar',
      dasar: [],
      tujuan: '',
      langkahFisik: [],
      langkahNonFisik: [],
      mitra: [],
      danaPelengkap: [],
      risiko: [],
    };
    const alasan = info.dasar
      .map((id) => temuanById.get(id))
      .filter((t): t is Temuan => !!t && t.jenis === 'masalah')
      .map((t) => `${t.judul} — ${t.nilai} (${t.pembanding})`);
    const { sasaran, indikator, jangkauan } = sasaranDanIndikator(key, desa, alokasi[i], tier);
    const s = skor(key);
    return {
      key,
      prioritas: i + 1,
      urgensi: key === 'monitoring' ? 'pendukung' : s >= 5 ? 'mendesak' : s >= 3 ? 'penting' : 'pendukung',
      bidang: info.bidang,
      pilar: info.pilar,
      kegiatan: kegiatanPerKey[key],
      tujuan: info.tujuan,
      alasan,
      alokasi: alokasi[i],
      porsiPct: anggaran > 0 ? (alokasi[i] / anggaran) * 100 : 0,
      sasaran,
      jangkauan,
      langkah: fisik && info.langkahFisik.length ? info.langkahFisik : info.langkahNonFisik,
      indikator,
      mitra: info.mitra,
      danaPelengkap: info.danaPelengkap,
      risiko: info.risiko,
      durasi: durasi(tier),
    } satisfies ProgramRekomendasi;
  });
}

// ─── Tahapan & ringkasan ─────────────────────────────────────────────

function susunTahapan(tier: Tier): TahapanPelaksanaan[] {
  const fisik = TIER_FISIK.includes(tier);
  return [
    {
      fase: 'Persiapan',
      waktu: fisik ? 'Bulan 1–2' : 'Bulan 1',
      kegiatan: [
        'Validasi data lapangan & kumpulkan baseline indikator',
        'Musyawarah desa: sepakati prioritas, lokasi, dan penerima manfaat',
        'Bentuk tim pelaksana (TPK) dan kelompok pengelola',
      ],
    },
    {
      fase: 'Pelaksanaan',
      waktu: fisik ? 'Bulan 3–12' : tier === 'MEDIUM' ? 'Bulan 2–8' : 'Bulan 2–4',
      kegiatan: fisik
        ? ['Desain teknis & pengadaan', 'Konstruksi padat karya bertahap', 'Pelatihan pengelola & pengguna']
        : ['Pelatihan dan pendampingan kelompok', 'Pengadaan alat/bahan pendukung', 'Edukasi warga per dusun'],
    },
    {
      fase: 'Serah terima & evaluasi',
      waktu: fisik ? 'Bulan 13–18' : tier === 'MEDIUM' ? 'Bulan 9–12' : 'Bulan 5–6',
      kegiatan: [
        'Serah terima aset/hasil kegiatan ke desa',
        'Ukur ulang indikator dan bandingkan dengan baseline',
        'Rencana keberlanjutan: siapa merawat, dari dana apa',
      ],
    },
  ];
}

const TIER_MAKNA: Record<Tier, string> = {
  FULL: 'cukup untuk intervensi menyeluruh, termasuk pembangunan fisik',
  MAJOR: 'cukup untuk pembangunan fisik pada 1–2 prioritas teratas',
  MEDIUM: 'belum cukup untuk pembangunan fisik besar; paling efektif untuk pengadaan peralatan, pelatihan, dan penguatan layanan',
  SMALL: 'paling efektif untuk penguatan kapasitas warga dan perbaikan skala kecil',
  MICRO: 'hanya cukup untuk edukasi, sosialisasi, dan penjangkauan langsung',
};

// ─── Keterkaitan antar-temuan ────────────────────────────────────────

/**
 * Aturan sebab-akibat sederhana: temuan yang muncul bersamaan dan saling
 * memperparah. Inilah "analisis" yang tidak terlihat dari angka satu per satu.
 */
export function analisisKeterkaitan(temuan: Temuan[]): Keterkaitan[] {
  const m = new Map(temuan.filter((t) => t.jenis === 'masalah').map((t) => [t.id, t]));
  const k = new Map(temuan.filter((t) => t.jenis === 'kekuatan').map((t) => [t.id, t]));
  const ada = (...ids: string[]) => ids.filter((id) => m.has(id));
  const sebut = (ids: string[]) => ids.map((id) => sebutTemuan((m.get(id) ?? k.get(id))!)).join(', ');
  const out: Keterkaitan[] = [];

  const lingkungan = ada('air', 'sanitasi', 'kekurangan_air');
  const kesehatan = ada('faskes', 'posyandu', 'pangan');
  if (lingkungan.length && kesehatan.length) {
    out.push({
      judul: 'Air, sanitasi, dan kesehatan saling memperparah',
      isi:
        `Kondisi ${sebut(lingkungan)} memicu diare berulang yang menghambat penyerapan gizi anak, ` +
        `sementara ${sebut(kesehatan)} membuat masalah itu terlambat terdeteksi. Kombinasi ini adalah jalur klasik stunting — ` +
        'program air bersih dan kesehatan sebaiknya menyasar dusun yang sama dan dijalankan bersamaan.',
      temuan: [...lingkungan, ...kesehatan],
    });
  }

  const lahan = ada('lahan_kritis', 'kekurangan_air');
  if (m.has('pertanian') && lahan.length) {
    out.push({
      judul: 'Mata pencaharian bergantung pada lahan yang menurun',
      isi:
        `Sebagian besar warga hidup dari pertanian, padahal ${sebut(lahan)}. ` +
        'Tanpa pemulihan lahan dan air, pendapatan akan terus tertekan — program ekonomi perlu disertai konservasi (agroforestri, embung, terasering).',
      temuan: ['pertanian', ...lahan],
    });
  }

  const sdm = ada('smp_plus', 'buta_huruf');
  const ekonomi = ada('pertanian', 'miskin', 'pilar_ike');
  if (sdm.length && ekonomi.length) {
    out.push({
      judul: 'Pelatihan ekonomi harus menyesuaikan tingkat pendidikan',
      isi:
        `Dengan ${sebut(sdm)}, pelatihan berbasis modul tertulis akan sulit diserap. ` +
        'Pakai metode praktik langsung, demplot, dan pendampingan per kelompok kecil.',
      temuan: [...sdm, ...ekonomi.slice(0, 1)],
    });
  }

  const sekolah = ada('paud', 'sd', 'smp', 'sma');
  if (sekolah.length && m.has('smp_plus')) {
    out.push({
      judul: 'Rendahnya pendidikan berkaitan dengan sekolah yang tidak tersedia',
      isi:
        `${besarAwal(sebut(['smp_plus']))} sejalan dengan ${sebut(sekolah)}. ` +
        'Biaya dan jarak ke sekolah lanjutan di luar desa menjadi penghambat; bantuan transportasi/asrama sering lebih cepat berdampak daripada membangun gedung.',
      temuan: ['smp_plus', ...sekolah],
    });
  }

  if (m.has('miskin') && m.has('pangan')) {
    out.push({
      judul: 'Kemiskinan dan kerawanan pangan bertumpuk',
      isi:
        `${besarAwal(sebut(['miskin', 'pangan']))}. Rumah tangga di rumah tidak layak huni kemungkinan besar juga rawan pangan — ` +
        'gunakan data yang sama (DTKS/P3KE) untuk menyasar bantuan pangan dan perbaikan rumah ke keluarga yang sama.',
      temuan: ['miskin', 'pangan'],
    });
  }

  const ekonomiLemah = ada('pilar_ike', 'pertanian', 'miskin');
  if (k.has('hutan') && ekonomiLemah.length) {
    out.push({
      judul: 'Hutan bisa menjadi sumber penghasilan alternatif',
      isi:
        `Desa memiliki ${sebut(['hutan'])} sementara ${sebut(ekonomiLemah.slice(0, 1))}. ` +
        'Skema Perhutanan Sosial dan hasil hutan bukan kayu dapat menambah pendapatan tanpa merusak hutan.',
      temuan: ['hutan', ...ekonomiLemah.slice(0, 1)],
    });
  }

  if (m.has('digital') && ada('pertanian', 'pilar_ike').length) {
    out.push({
      judul: 'Akses pasar terhambat oleh keterbatasan telekomunikasi',
      isi:
        'Tanpa sinyal/internet yang memadai, petani dan pelaku usaha sulit memantau harga dan menjual langsung ke pembeli, ' +
        'sehingga bergantung pada tengkulak. Pemasaran bersama lewat BUMDes dapat menjadi jembatan.',
      temuan: ['digital', ...ada('pertanian', 'pilar_ike').slice(0, 1)],
    });
  }

  // Tampilkan hanya pola yang melibatkan masalah serius (atau peluang dari
  // kekuatan desa), maksimal 4 — lebih dari itu justru mengaburkan prioritas.
  const serius = (id: string) => ['kritis', 'tinggi'].includes(m.get(id)?.tingkat ?? '');
  return out
    .filter((x) => x.temuan.some((id) => serius(id) || k.has(id)))
    .sort((a, b) => b.temuan.filter(serius).length - a.temuan.filter(serius).length)
    .slice(0, 4);
}

export function diagnosaDesa(
  desa: Desa,
  anggaran: number,
  estimasi: number,
  tier: Tier,
  kegiatanPerKey: Record<string, string[]>,
  tambahan: DataTambahan = {},
): Diagnosis {
  const posisi = posisiIdm(desa);
  const temuan = kumpulkanTemuan(desa, posisi, tambahan);
  const program = susunProgram(desa, anggaran, tier, kegiatanPerKey, temuan);
  const keterkaitan = analisisKeterkaitan(temuan);

  const masalah = temuan.filter((t) => t.jenis === 'masalah');
  const kekuatan = temuan.filter((t) => t.jenis === 'kekuatan');

  // Masalah serius yang tidak tersentuh program mana pun di paket ini —
  // harus disebut terang supaya pengguna tahu perlu sumber dana lain.
  const tercakup = new Set(program.flatMap((p) => PROGRAM[p.key]?.dasar ?? []));
  const tidakTercakup = program.length
    ? masalah
        .filter((t) => !t.id.startsWith('pilar_') && (t.tingkat === 'kritis' || t.tingkat === 'tinggi'))
        .filter((t) => !tercakup.has(t.id))
        .map((t) => t.id)
    : [];

  // Ringkasan sengaja TIDAK mengulang skor IDM/cakupan — keduanya sudah ada
  // di kartu angka di atasnya. Isinya kesimpulan, bukan angka ulang.
  const ringkasan: string[] = [];
  const mendesak = masalah.filter((t) => !t.id.startsWith('pilar_')).slice(0, 3);
  if (mendesak.length) {
    ringkasan.push(
      `Masalah paling mendesak: ${mendesak.map(sebutTemuan).join('; ')}.`,
    );
  }
  if (keterkaitan.length) {
    ringkasan.push(`Pola utama: ${kecilAwal(keterkaitan[0].judul)} — lihat bagian Temuan.`);
  }
  const kurang = Math.max(0, estimasi - anggaran);
  ringkasan.push(
    (kurang > 0 ? `Masih kurang ${rupiahRingkas(kurang)} dari kebutuhan ideal, jadi anggaran ini ` : 'Anggaran ini ') +
      `${TIER_MAKNA[tier]}.`,
  );
  const utama = program[0];
  if (utama && utama.key !== 'monitoring') {
    ringkasan.push(
      `Prioritas #1: ${utama.bidang} — ${rupiahRingkas(utama.alokasi)} ` +
        `untuk ${utama.kegiatan[0].charAt(0).toLowerCase()}${utama.kegiatan[0].slice(1)}.`,
    );
  }
  if (tidakTercakup.length) {
    const judul = tidakTercakup.map((id) => kecilAwal(temuan.find((t) => t.id === id)!.judul));
    ringkasan.push(`Belum tertangani paket ini: ${judul.join('; ')} — perlu diusulkan lewat sumber dana lain.`);
  }
  if (kekuatan.length) {
    ringkasan.push(`Modal yang bisa dimanfaatkan: ${kekuatan.slice(0, 2).map((t) => kecilAwal(t.judul)).join('; ')}.`);
  }

  const catatanData: string[] = [];
  if (desa.klasifikasi_podes == null) {
    catatanData.push('Skor Podes tidak tersedia untuk desa ini, sehingga paket kegiatan tidak dapat dipetakan otomatis.');
  }
  if (num(desa.pct_air_bersih) == null) catatanData.push('Data akses air bersih tidak tersedia.');
  if (num(desa.jumlah_rt) == null) catatanData.push('Jumlah rumah tangga tidak tersedia; sasaran per RT tidak dapat dihitung.');
  if (num(desa.idm) == null) catatanData.push('Skor IDM 2024 tidak tersedia.');
  if (!tambahan.infra?.tersedia) {
    catatanData.push('Daftar fasilitas Podes 2025 tidak tersedia; ketersediaan sekolah/faskes memakai indikator ringkas (ada/tidak).');
  }
  if (tambahan.susenas?.tersedia) {
    catatanData.push('Indikator Susenas (pangan, sanitasi, listrik, buta huruf, kekurangan air) adalah rata-rata KABUPATEN, bukan angka desa ini.');
  } else {
    catatanData.push('Data Susenas tidak tersedia untuk kabupaten ini; analisis pangan dan sanitasi tidak disertakan.');
  }
  catatanData.push(
    'Biaya satuan (air Rp 5 jt/RT, rumah Rp 3 jt/RT, SD/SMP Rp 500 jt, faskes Rp 750 jt) dan ambang tingkat keparahan adalah asumsi model — perlu dikoreksi dengan kondisi lokal.',
  );

  return {
    ringkasan,
    keterkaitan,
    tidakTercakup,
    posisiIdm: posisi,
    temuan,
    program,
    tahapan: program.length ? susunTahapan(tier) : [],
    catatanData,
  };
}
