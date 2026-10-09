import type { KlasifikasiPodes, StatusIdm } from '@/lib/types';

export function formatRp(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `Rp ${Number(n).toLocaleString('id-ID')}`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return `${formatNumber(Number(n), digits)}%`;
}

export function desaFullName(parts: {
  nama_desa: string;
  nama_kecamatan: string;
  nama_kabupaten: string;
  nama_provinsi?: string;
}): string {
  const base = `${parts.nama_desa}, Kec. ${parts.nama_kecamatan}, Kab. ${parts.nama_kabupaten}`;
  return parts.nama_provinsi ? `${base}, ${parts.nama_provinsi}` : base;
}

export function statusIdmColor(status?: string | null): string {
  switch ((status ?? '').toUpperCase()) {
    case 'MANDIRI':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'MAJU':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'BERKEMBANG':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'TERTINGGAL':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'SANGAT TERTINGGAL':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-white/5 text-white/50 border-white/10';
  }
}

export function podesColor(klasifikasi?: KlasifikasiPodes | string | null): string {
  switch ((klasifikasi ?? '').toUpperCase()) {
    case 'HIGH':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'MODERATE':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'LOW':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'CRITICAL':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    default:
      return 'bg-white/5 text-white/50 border-white/10';
  }
}

export function podesLabel(klasifikasi?: KlasifikasiPodes | string | null): string {
  switch ((klasifikasi ?? '').toUpperCase()) {
    case 'HIGH': return 'Potensi tinggi';
    case 'MODERATE': return 'Potensi sedang';
    case 'LOW': return 'Potensi rendah';
    case 'CRITICAL': return 'Potensi sangat rendah';
    default: return klasifikasi ?? '—';
  }
}

export function tierLabel(tier?: string | null): string {
  switch (tier) {
    case 'FULL': return 'Anggaran memenuhi kebutuhan';
    case 'MAJOR': return 'Anggaran memenuhi sebagian besar';
    case 'MEDIUM': return 'Anggaran terbatas';
    case 'SMALL': return 'Anggaran minim';
    case 'MICRO': return 'Anggaran sangat minim';
    default: return tier ?? '—';
  }
}

export function tierDesc(tier?: string | null): string {
  switch (tier) {
    case 'FULL': return 'Anggaran Anda lebih dari cukup untuk seluruh kebutuhan ideal desa. Bisa melaksanakan intervensi menyeluruh tanpa pengurangan.';
    case 'MAJOR': return 'Anggaran Anda cukup untuk sebagian besar kebutuhan. Masih bisa bangun infrastruktur fisik, tapi perlu pilih yang paling mendesak.';
    case 'MEDIUM': return 'Anggaran Anda tidak cukup untuk bangun infrastruktur fisik. Lebih efektif dipakai untuk kegiatan penunjang — pelatihan, penguatan layanan, dan pendampingan.';
    case 'SMALL': return 'Anggaran Anda sangat terbatas dibanding kebutuhan desa. Fokuskan pada pelatihan dan penguatan kapasitas warga, bukan pembangunan fisik.';
    case 'MICRO': return 'Anggaran Anda jauh di bawah kebutuhan desa. Hanya cukup untuk edukasi, sosialisasi, dan penjangkauan langsung ke warga.';
    default: return '';
  }
}

export function tierColor(tier?: string | null): string {
  switch (tier) {
    case 'FULL':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'MAJOR':
      return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    case 'MEDIUM':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'SMALL':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'MICRO':
      return 'bg-white/5 text-white/50 border-white/10';
    default:
      return 'bg-white/5 text-white/50 border-white/10';
  }
}

export function labelIdm(score: number | null | undefined): StatusIdm | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const s = Number(score);
  if (s >= 0.8155) return 'MANDIRI';
  if (s >= 0.7072) return 'MAJU';
  if (s >= 0.5989) return 'BERKEMBANG';
  if (s >= 0.4907) return 'TERTINGGAL';
  return 'SANGAT TERTINGGAL';
}

const TANTANGAN_MAP: Record<string, string> = {
  water_stress: 'Kekurangan air bersih',
  livelihood_dependency: 'Ketergantungan mata pencaharian',
  subsistence_poverty: 'Kemiskinan subsisten',
  limited_health_access: 'Akses kesehatan terbatas',
  limited_education_access: 'Akses pendidikan terbatas',
  minimal: 'Tantangan minimal',
};

const PODES2021_MAP: Record<string, string> = {
  'Podes 2021': 'Termasuk Podes 2021',
  'Bukan Podes 2021': 'Tidak termasuk Podes 2021',
};

export function translatePodes2021Status(val: string | null | undefined): string {
  if (!val) return '—';
  return PODES2021_MAP[val.trim()] ?? val.trim();
}

export function translateTantangan(val: string | null | undefined): string {
  if (!val) return '—';
  return val
    .split(',')
    .map((v) => TANTANGAN_MAP[v.trim()] ?? v.trim())
    .join(', ');
}

const REKOMENDASI_MAP: Record<string, string> = {
  water_system: 'Sistem air bersih',
  health_infrastructure: 'Infrastruktur kesehatan',
  education_infrastructure: 'Infrastruktur pendidikan',
  livelihood_diversification: 'Diversifikasi mata pencaharian',
  community_governance: 'Tata kelola masyarakat',
  monitoring: 'Monitoring dan pendampingan',
};

export function translateRekomendasi(val: string | null | undefined): string {
  if (!val) return '—';
  return val
    .split(',')
    .map((v) => REKOMENDASI_MAP[v.trim()] ?? v.trim())
    .join(', ');
}
