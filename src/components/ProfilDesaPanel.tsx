'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Home,
  Hospital,
  School,
  UtensilsCrossed,
  Droplets,
  Building2,
  ChevronDown,
  GraduationCap,
  Map,
  Info,
} from 'lucide-react';

interface SusenasData {
  tersedia: boolean;
  pesan?: string;
  total_rt?: number | string;
  total_ind?: number | string;
  khawatir_makan_pct?: number | string | null;
  tidak_makan_sehat_pct?: number | string | null;
  sedikit_jenis_makanan_pct?: number | string | null;
  lewat_waktu_makan_pct?: number | string | null;
  makan_lebih_sedikit_pct?: number | string | null;
  kehabisan_makanan_pct?: number | string | null;
  lapar_tidak_makan_pct?: number | string | null;
  tidak_makan_seharian_pct?: number | string | null;
  rata_rumah_milik_sendiri_pct?: number | string | null;
  rata_lantai_rumah?: number | string | null;
  air_pdam_pct?: number | string | null;
  air_sumur_pct?: number | string | null;
  kekurangan_air_pct?: number | string | null;
  punya_toilet_pct?: number | string | null;
  listrik_pln_pct?: number | string | null;
  rata_umur?: number | string | null;
  laki_laki_pct?: number | string | null;
  perempuan_pct?: number | string | null;
  punya_nik_pct?: number | string | null;
  tidak_sekolah_pct?: number | string | null;
  sd_pct?: number | string | null;
  smp_pct?: number | string | null;
  sma_pct?: number | string | null;
  buta_huruf_pct?: number | string | null;
}

interface InfraData {
  tersedia: boolean;
  total: number;
  fasilitas: Record<string, { label: string; nama: string }[]>;
}

interface DesaData {
  jumlah_jiwa?: number | null;
  jumlah_rt?: number | null;
  luas_admin_ha?: number | null;
  luas_hektar?: number | null;
  ada_sd?: number | null;
  ada_smp?: number | null;
  ada_faskes?: number | null;
  iks?: number | null;
  ike?: number | null;
  ikl?: number | null;
  idm?: number | null;
  status_idm_computed?: string | null;
  podes2025_lat?: number | null;
  podes2025_lon?: number | null;
  hutan_alam_ha_2024?: number | null;
  lahan_kritis_status?: string | null;
  lahan_kritis_ha?: number | null;
  pct_air_bersih?: number | null;
  pct_pertanian?: number | null;
  pct_smp_plus?: number | null;
  pct_rumah_miskin?: number | null;
  target_air?: number | null;
  target_pertanian?: number | null;
  podes2021_status?: string | null;
  alamat_lengkap?: string | null;
  estimasi_biaya?: number | null;
}

function fmtPct(n: number | string | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `${num.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function fmtNum(n: number | string | null | undefined, d = 0): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function toNum(n: number | string | null | undefined): number | null {
  if (n == null) return null;
  const num = Number(n);
  return Number.isNaN(num) ? null : num;
}

type Status = 'baik' | 'perhatian' | 'masalah' | 'netral';

const statusDot: Record<Status, string> = {
  baik: 'bg-emerald-400',
  perhatian: 'bg-amber-400',
  masalah: 'bg-rose-400',
  netral: 'bg-white/20',
};

function pctStatus(n: number | null, opts: { goodMax?: number; warnMax?: number; inverted?: boolean }): Status {
  if (n == null) return 'netral';
  const { goodMax = 10, warnMax = 30, inverted = false } = opts;
  if (inverted) {
    if (n >= goodMax) return 'baik';
    if (n >= warnMax) return 'perhatian';
    return 'masalah';
  }
  if (n <= goodMax) return 'baik';
  if (n <= warnMax) return 'perhatian';
  return 'masalah';
}

function idmStatus(score: number | null): Status {
  if (score == null) return 'netral';
  if (score >= 0.7072) return 'baik';
  if (score >= 0.5989) return 'perhatian';
  return 'masalah';
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group/tip">
      <Info className="w-3 h-3 text-white/20 cursor-help group-hover/tip:text-white/50 transition-colors" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-[11px] text-white/70 leading-snug whitespace-normal w-48 opacity-0 group-hover/tip:opacity-100 transition-opacity z-50 shadow-xl">
        {text}
      </span>
    </span>
  );
}

// Bar tanpa deskripsi — bersih
function Bar({ label, pct, color, status }: {
  label: string;
  pct: number | string | null | undefined;
  color: string;
  status?: Status;
}) {
  const num = toNum(pct);
  const width = num == null ? 0 : Math.min(100, Math.max(0, num));
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-white/50">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {status && status !== 'netral' && (
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
          )}
          <span className="text-white/80 tabular-nums font-medium">{fmtPct(pct)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// Bar dengan catatan — hanya untuk yang butuh konteks
function BarNote({ label, pct, color, status, note }: {
  label: string;
  pct: number | string | null | undefined;
  color: string;
  status?: Status;
  note?: string;
}) {
  const num = toNum(pct);
  const width = num == null ? 0 : Math.min(100, Math.max(0, num));
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-white/50">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {status && status !== 'netral' && (
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
          )}
          <span className="text-white/80 tabular-nums font-medium">{fmtPct(pct)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      {note && <p className="text-[10px] text-white/25 italic">{note}</p>}
    </div>
  );
}

// Row tanpa deskripsi
function Row({ label, value, status }: {
  label: string;
  value: string;
  status?: Status;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-white/50">{label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {status && status !== 'netral' && (
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
        )}
        <span className="text-xs font-semibold text-white/80 tabular-nums">{value}</span>
      </div>
    </div>
  );
}

// Row dengan catatan
function RowNote({ label, value, status, note }: {
  label: string;
  value: string;
  status?: Status;
  note?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between py-1">
        <span className="text-xs text-white/50">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {status && status !== 'netral' && (
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[status]}`} />
          )}
          <span className="text-xs font-semibold text-white/80 tabular-nums">{value}</span>
        </div>
      </div>
      {note && <p className="text-[10px] text-white/25 italic">{note}</p>}
    </div>
  );
}

export default function ProfilDesaPanel({
  kodeBps, desa,
}: { kodeBps: string; desa: DesaData }) {
  const [susenas, setSusenas] = useState<SusenasData | null>(null);
  const [infra, setInfra] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openKategori, setOpenKategori] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/susenas/${kodeBps}`).then(r => r.json()).catch(() => ({ tersedia: false })),
      fetch(`/api/podes-infra/${kodeBps}`).then(r => r.json()).catch(() => ({ tersedia: false, total: 0, fasilitas: {} })),
    ]).then(([s, i]) => {
      if (!cancelled) { setSusenas(s); setInfra(i); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [kodeBps]);

  const jiwa = Number(desa.jumlah_jiwa ?? 0);
  const rt = Number(desa.jumlah_rt ?? 0);
  const luas = Number(desa.luas_admin_ha ?? 0);
  const hasSusenas = susenas?.tersedia;
  const hasInfra = infra?.tersedia;
  const s = susenas;

  return (
    <div className="space-y-4">
      {/* === DEMOGRAFI (tooltip) === */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Demografi</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/30 flex items-center gap-1">
              Jiwa <InfoTip text="Jumlah penduduk terdaftar di desa ini" />
            </div>
            <div className="text-lg font-bold text-white">{fmtNum(jiwa)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/30 flex items-center gap-1">
              Rumah tangga <InfoTip text="Jumlah kepala keluarga (KK) di desa" />
            </div>
            <div className="text-lg font-bold text-white">{fmtNum(rt)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-white/30 flex items-center gap-1">
              Luas (ha) <InfoTip text="Luas wilayah administratif desa dalam hektar" />
            </div>
            <div className="text-lg font-bold text-white">{fmtNum(luas, 1)}</div>
          </div>
          {hasSusenas && (
            <div>
              <div className="text-xs uppercase tracking-wide text-white/30 flex items-center gap-1">
                Rata-rata umur <InfoTip text="Rata-rata usia penduduk dari survei Susenas" />
              </div>
              <div className="text-lg font-bold text-white">{fmtNum(toNum(s?.rata_umur), 0)} thn</div>
            </div>
          )}
        </div>
        {hasSusenas && (
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-x-4">
            <Row label="Laki-laki" value={fmtPct(s?.laki_laki_pct)} />
            <Row label="Perempuan" value={fmtPct(s?.perempuan_pct)} />
            <Row
              label="Punya NIK"
              value={fmtPct(s?.punya_nik_pct)}
              status={pctStatus(toNum(s?.punya_nik_pct), { goodMax: 95, warnMax: 80, inverted: true })}
            />
          </div>
        )}
      </div>

      {/* === IDM (catatan hanya di pilar yang bermasalah) === */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Indeks Desa Membangun</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white tabular-nums">
              {desa.idm != null ? fmtNum(Number(desa.idm), 4) : '—'}
            </div>
            {desa.status_idm_computed && (
              <div className="text-xs text-white/40">{desa.status_idm_computed}</div>
            )}
          </div>
        </div>
        <p className="text-[10px] text-white/30">
          Skor 0–1: Mandiri ≥0,81 · Maju ≥0,71 · Berkembang ≥0,60 · Tertinggal ≥0,49
        </p>
        <div className="grid grid-cols-3 gap-4">
          <IDMBar label="Ketahanan Sosial" value={toNum(desa.iks)} color="bg-sky-500"
            desc="Kesehatan, pendidikan, dan modal sosial desa" />
          <IDMBar label="Ketahanan Ekonomi" value={toNum(desa.ike)} color="bg-amber-500"
            desc="Pendapatan, lapangan kerja, dan aset produktif" />
          <IDMBar label="Ketahanan Lingkungan" value={toNum(desa.ikl)} color="bg-emerald-500"
            desc="Infrastruktur, lingkungan, dan ketahanan bencana" />
        </div>
      </div>

      {/* === LINGKUNGAN & WILAYAH === */}
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Map className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Lingkungan &amp; Wilayah</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <Row label="Luas wilayah" value={`${fmtNum(toNum(desa.luas_hektar), 1)} ha`} />
          <Row label="Luas admin" value={`${fmtNum(toNum(desa.luas_admin_ha), 1)} ha`} />
          <Row label="Hutan alam" value={`${fmtNum(toNum(desa.hutan_alam_ha_2024), 2)} ha`} />
          <Row
            label="Lahan kritis"
            value={desa.lahan_kritis_status ?? '—'}
            status={desa.lahan_kritis_status === 'Lahan Kritis' ? 'masalah' : desa.lahan_kritis_status === 'Non Lahan Kritis' ? 'baik' : 'netral'}
          />
          {desa.lahan_kritis_ha != null && Number(desa.lahan_kritis_ha) > 0 && (
            <Row label="Luas lahan kritis" value={`${fmtNum(toNum(desa.lahan_kritis_ha), 2)} ha`} />
          )}
          {desa.podes2025_lat != null && desa.podes2025_lon != null && (
            <Row label="Koordinat" value={`${toNum(desa.podes2025_lat)?.toFixed(4) ?? '—'}, ${toNum(desa.podes2025_lon)?.toFixed(4) ?? '—'}`} />
          )}
        </div>
      </div>

      {/* === KOMPOSISI PENDUDUK === */}
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-sky-400" />
          <h3 className="text-sm font-semibold text-white">Komposisi Penduduk</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <BarNote label="Akses air bersih" pct={desa.pct_air_bersih} color="bg-sky-500"
            status={pctStatus(toNum(desa.pct_air_bersih), { goodMax: 80, warnMax: 50, inverted: true })}
            note="Persentase RT dengan akses air bersih memadai" />
          <BarNote label="Mata pencaharian pertanian" pct={desa.pct_pertanian} color="bg-emerald-500"
            note="Penduduk yang menggantungkan hidup dari pertanian" />
          <BarNote label="Pendidikan SMP+" pct={desa.pct_smp_plus} color="bg-violet-500"
            status={pctStatus(toNum(desa.pct_smp_plus), { goodMax: 50, warnMax: 30, inverted: true })}
            note="Penduduk yang tamat SMP atau lebih tinggi" />
          <BarNote label="Rumah miskin" pct={desa.pct_rumah_miskin} color="bg-rose-500"
            status={pctStatus(toNum(desa.pct_rumah_miskin), { goodMax: 20, warnMax: 40 })}
            note="Persentase rumah tangga dengan rumah tidak layak huni" />
        </div>
      </div>

      {/* === FASILITAS (tooltip) === */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white flex items-center gap-1">
              Fasilitas
              <InfoTip text="Ketersediaan fasilitas dasar. 'Belum ada' = desa tidak punya, butuh investasi." />
            </h3>
          </div>
          {hasInfra && <span className="text-xs text-white/30">{infra!.total} fasilitas</span>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
            <School className="w-4 h-4 text-violet-400 mx-auto mb-1" />
            <div className="text-xs text-white/40">SD</div>
            <div className={`text-sm font-semibold ${desa.ada_sd ? 'text-emerald-400' : 'text-rose-400'}`}>
              {desa.ada_sd ? 'Ada' : 'Belum'}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
            <School className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
            <div className="text-xs text-white/40">SMP</div>
            <div className={`text-sm font-semibold ${desa.ada_smp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {desa.ada_smp ? 'Ada' : 'Belum'}
            </div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
            <Hospital className="w-4 h-4 text-rose-400 mx-auto mb-1" />
            <div className="text-xs text-white/40">Faskes</div>
            <div className={`text-sm font-semibold ${desa.ada_faskes ? 'text-emerald-400' : 'text-rose-400'}`}>
              {desa.ada_faskes ? 'Ada' : 'Belum'}
            </div>
          </div>
        </div>
        {hasInfra && infra!.total > 0 && (
          <div className="space-y-1.5 mt-3">
            {Object.keys(infra!.fasilitas).sort().map((kat) => {
              const items = infra!.fasilitas[kat];
              const open = openKategori === kat;
              return (
                <div key={kat} className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
                  <button type="button" onClick={() => setOpenKategori(open ? null : kat)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/80">{kat}</span>
                      <span className="text-xs text-white/30">{items.length}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <ul className="px-3 pb-2 space-y-1 border-t border-white/5 pt-2">
                      {items.map((item, i) => (
                        <li key={i} className="text-xs text-white/50 flex gap-1.5">
                          <span className="text-white/40 shrink-0">{item.label}</span>
                          <span className="text-white/30">—</span>
                          <span>{item.nama}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === KETAHANAN PANGAN ===
          Catatan hanya di 3 baris pertama (yang paling penting).
          Sisanya cukup label — bar dan warna sudah menjelaskan. */}
      {hasSusenas && (
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-orange-400" />
              <h3 className="text-sm font-semibold text-white">Ketahanan Pangan</h3>
            </div>
            <span className="text-[10px] text-white/25">↑ tinggi = lebih buruk</span>
          </div>
          <BarNote label="Khawatir tidak cukup makan" pct={s?.khawatir_makan_pct} color="bg-orange-500"
            status={pctStatus(toNum(s?.khawatir_makan_pct), { goodMax: 10, warnMax: 30 })}
            note="Keluarga yang cemas kehabisan stok makanan tiap bulan" />
          <BarNote label="Tidak makan makanan sehat" pct={s?.tidak_makan_sehat_pct} color="bg-orange-500"
            status={pctStatus(toNum(s?.tidak_makan_sehat_pct), { goodMax: 10, warnMax: 30 })}
            note="Keluarga yang tidak mampu menyediakan makanan bergizi" />
          <BarNote label="Sedikit jenis makanan" pct={s?.sedikit_jenis_makanan_pct} color="bg-amber-500"
            status={pctStatus(toNum(s?.sedikit_jenis_makanan_pct), { goodMax: 10, warnMax: 30 })}
            note="Makanan sehari-hari terbatas jenisnya, kurang variasi gizi" />
          <BarNote label="Lewat waktu makan" pct={s?.lewat_waktu_makan_pct} color="bg-amber-500"
            status={pctStatus(toNum(s?.lewat_waktu_makan_pct), { goodMax: 5, warnMax: 15 })}
            note="Ada anggota keluarga yang melewatkan sarapan atau makan malam" />
          <BarNote label="Makan lebih sedikit" pct={s?.makan_lebih_sedikit_pct} color="bg-yellow-500"
            status={pctStatus(toNum(s?.makan_lebih_sedikit_pct), { goodMax: 5, warnMax: 15 })}
            note="Porsi makan dikurangi agar makanan cukup untuk semua" />
          <BarNote label="Kehabisan makanan" pct={s?.kehabisan_makanan_pct} color="bg-red-500"
            status={pctStatus(toNum(s?.kehabisan_makanan_pct), { goodMax: 3, warnMax: 10 })}
            note="Keluarga benar-benar kehabisan stok dan tidak mampu beli" />
          <BarNote label="Lapar tapi tidak makan" pct={s?.lapar_tidak_makan_pct} color="bg-red-500"
            status={pctStatus(toNum(s?.lapar_tidak_makan_pct), { goodMax: 2, warnMax: 8 })}
            note="Ada yang merasa lapar tapi tidak ada makanan di rumah" />
          <BarNote label="Tidak makan seharian" pct={s?.tidak_makan_seharian_pct} color="bg-rose-500"
            status={pctStatus(toNum(s?.tidak_makan_seharian_pct), { goodMax: 1, warnMax: 5 })}
            note="Ada anggota keluarga yang tidak makan seharian penuh" />
        </div>
      )}

      {/* === PERUMAHAN & AIR ===
          Catatan hanya di metric yang butuh konteks (luas lantai, air sumur). */}
      {hasSusenas && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-5 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-semibold text-white">Perumahan</h3>
            </div>
            <Row label="Rumah milik sendiri" value={fmtPct(s?.rata_rumah_milik_sendiri_pct)}
              status={pctStatus(toNum(s?.rata_rumah_milik_sendiri_pct), { goodMax: 80, warnMax: 50, inverted: true })} />
            <RowNote label="Luas lantai" value={`${fmtNum(toNum(s?.rata_lantai_rumah), 0)} m²`}
              status={(() => { const v = toNum(s?.rata_lantai_rumah); return v == null ? 'netral' : (v >= 60 ? 'baik' : v >= 30 ? 'perhatian' : 'masalah'); })()}
              note="Rata-rata luas rumah di desa ini. Layak huni minimal 30 m²" />
            <Row label="Punya toilet" value={fmtPct(s?.punya_toilet_pct)}
              status={pctStatus(toNum(s?.punya_toilet_pct), { goodMax: 90, warnMax: 70, inverted: true })} />
          </div>
          <div className="glass-card rounded-2xl p-5 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Droplets className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Air &amp; Energi</h3>
            </div>
            <Bar label="Air PDAM" pct={s?.air_pdam_pct} color="bg-emerald-500"
              status={pctStatus(toNum(s?.air_pdam_pct), { goodMax: 50, warnMax: 20, inverted: true })} />
            <BarNote label="Air sumur" pct={s?.air_sumur_pct} color="bg-sky-500"
              note="Keluarga yang mengandalkan air sumur, perlu cek kualitas" />
            <Bar label="Kekurangan air" pct={s?.kekurangan_air_pct} color="bg-amber-500"
              status={pctStatus(toNum(s?.kekurangan_air_pct), { goodMax: 5, warnMax: 15 })} />
            <Row label="Listrik PLN" value={fmtPct(s?.listrik_pln_pct)}
              status={pctStatus(toNum(s?.listrik_pln_pct), { goodMax: 95, warnMax: 80, inverted: true })} />
          </div>
        </div>
      )}

      {/* === PENDIDIKAN ===
          Section intro cukup, tidak perlu catatan per bar. */}
      {hasSusenas && (
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-semibold text-white">Pendidikan</h3>
          </div>
          <Bar label="Tidak pernah sekolah" pct={s?.tidak_sekolah_pct} color="bg-rose-500"
            status={pctStatus(toNum(s?.tidak_sekolah_pct), { goodMax: 3, warnMax: 10 })} />
          <Bar label="SD" pct={s?.sd_pct} color="bg-sky-500" />
          <Bar label="SMP" pct={s?.smp_pct} color="bg-amber-500" />
          <Bar label="SMA+" pct={s?.sma_pct} color="bg-emerald-500"
            status={pctStatus(toNum(s?.sma_pct), { goodMax: 20, warnMax: 10, inverted: true })} />
          <BarNote label="Buta huruf" pct={s?.buta_huruf_pct} color="bg-red-500"
            status={pctStatus(toNum(s?.buta_huruf_pct), { goodMax: 2, warnMax: 8 })}
            note="Warga yang tidak bisa membaca dan menulis huruf latin" />
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          <p className="text-xs text-white/30">Memuat data…</p>
        </div>
      )}

      <div className="flex items-center gap-4 text-[10px] text-white/25">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Baik</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Perhatian</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Masalah</span>
      </div>
    </div>
  );
}

function IDMBar({ label, value, color, desc }: {
  label: string; value: number | null; color: string; desc?: string;
}) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, value * 100));
  const st = idmStatus(value);
  const statusText = value == null ? '' :
    value >= 0.7072 ? 'Kondisi baik' :
    value >= 0.5989 ? 'Perlu penguatan' :
    'Butuh intervensi';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-white/50 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot[st]}`} />
          <span className="text-white/80 tabular-nums font-medium">{value != null ? value.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      {desc && <p className="text-[10px] text-white/25 italic">{desc}</p>}
      {statusText && <p className={`text-[10px] ${statusDot[st].replace('bg-', 'text-')}`}>{statusText}</p>}
    </div>
  );
}
