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
  return `${Number(n).toFixed(digits)}%`;
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
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'MAJU':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'BERKEMBANG':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'TERTINGGAL':
      return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
    case 'SANGAT TERTINGGAL':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
}

export function podesColor(klasifikasi?: KlasifikasiPodes | string | null): string {
  switch ((klasifikasi ?? '').toUpperCase()) {
    case 'HIGH':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'MODERATE':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'LOW':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'CRITICAL':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
}

export function tierColor(tier?: string | null): string {
  switch (tier) {
    case 'FULL':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'MAJOR':
      return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
    case 'MEDIUM':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'SMALL':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'MICRO':
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    default:
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  }
}

export function labelIdm(score: number | null | undefined): StatusIdm | null {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const s = Number(score);
  if (s === 0) return null; // IDM 0 = data belum tersedia, bukan Sangat Tertinggal
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
