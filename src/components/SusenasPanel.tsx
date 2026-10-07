'use client';

import { useEffect, useState } from 'react';
import { UtensilsCrossed, Home, Droplets, GraduationCap } from 'lucide-react';

interface SusenasData {
  tersedia: boolean;
  pesan?: string;
  total_rt?: number;
  total_ind?: number;
  // Ketahanan pangan
  khawatir_makan_pct?: number | null;
  tidak_makan_sehat_pct?: number | null;
  sedikit_jenis_makanan_pct?: number | null;
  lewat_waktu_makan_pct?: number | null;
  makan_lebih_sedikit_pct?: number | null;
  kehabisan_makanan_pct?: number | null;
  lapar_tidak_makan_pct?: number | null;
  tidak_makan_seharian_pct?: number | null;
  // Perumahan
  rata_rumah_milik_sendiri_pct?: number | null;
  rata_lantai_rumah?: number | null;
  // Air
  air_pdam_pct?: number | null;
  air_sumur_pct?: number | null;
  kekurangan_air_pct?: number | null;
  // Sanitasi
  punya_toilet_pct?: number | null;
  // Energi
  listrik_pln_pct?: number | null;
  // Individu
  rata_umur?: number | null;
  laki_laki_pct?: number | null;
  perempuan_pct?: number | null;
  punya_nik_pct?: number | null;
  tidak_sekolah_pct?: number | null;
  sd_pct?: number | null;
  smp_pct?: number | null;
  sma_pct?: number | null;
  buta_huruf_pct?: number | null;
}

function fmtPct(n: number | string | null | undefined): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return `${num.toFixed(1)}%`;
}

function fmtNum(n: number | string | null | undefined, d = 1): string {
  if (n == null) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(d);
}

function StatRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-white/60">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${warn ? 'text-amber-400' : 'text-white/90'}`}>
        {value}
      </span>
    </div>
  );
}

function MiniBar({ label, pct, color }: { label: string; pct: number | string | null | undefined; color: string }) {
  const num = pct == null ? null : Number(pct);
  const width = num == null || Number.isNaN(num) ? 0 : Math.min(100, Math.max(0, num));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 tabular-nums">{fmtPct(pct)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function SusenasPanel({ kodeBps }: { kodeBps: string }) {
  const [data, setData] = useState<SusenasData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/susenas/${kodeBps}`)
      .then(async (r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ tersedia: false }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kodeBps]);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          <p className="text-sm text-white/40">Memuat data Susenas…</p>
        </div>
      </div>
    );
  }

  if (!data || !data.tersedia) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white/30" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Data Susenas 2025</h3>
            <p className="text-sm text-white/30">{data?.pesan ?? 'Data tidak tersedia untuk wilayah ini.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Data Susenas 2025</h3>
        <span className="text-xs text-white/30">
          {data.total_rt?.toLocaleString('id-ID') ?? '—'} rumah tangga · {data.total_ind?.toLocaleString('id-ID') ?? '—'} individu
        </span>
      </div>

      {/* Ketahanan Pangan */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <UtensilsCrossed className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-medium text-white/80">Ketahanan Pangan</h4>
        </div>
        <MiniBar label="Khawatir tidak cukup makan" pct={data.khawatir_makan_pct} color="bg-orange-500" />
        <MiniBar label="Tidak makan makanan sehat" pct={data.tidak_makan_sehat_pct} color="bg-orange-500" />
        <MiniBar label="Sedikit jenis makanan" pct={data.sedikit_jenis_makanan_pct} color="bg-amber-500" />
        <MiniBar label="Lewat waktu makan" pct={data.lewat_waktu_makan_pct} color="bg-amber-500" />
        <MiniBar label="Makan lebih sedikit" pct={data.makan_lebih_sedikit_pct} color="bg-yellow-500" />
        <MiniBar label="Kehabisan makanan" pct={data.kehabisan_makanan_pct} color="bg-red-500" />
        <MiniBar label="Lapar tapi tidak makan" pct={data.lapar_tidak_makan_pct} color="bg-red-500" />
        <MiniBar label="Tidak makan seharian" pct={data.tidak_makan_seharian_pct} color="bg-rose-500" />
      </div>

      {/* Perumahan & Sanitasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Home className="w-4 h-4 text-sky-400" />
            <h4 className="text-sm font-medium text-white/80">Perumahan</h4>
          </div>
          <StatRow label="Rumah milik sendiri" value={fmtPct(data.rata_rumah_milik_sendiri_pct)} />
          <StatRow label="Rata-rata luas lantai" value={`${fmtNum(data.rata_lantai_rumah)} m²`} />
          <StatRow label="Punya toilet" value={fmtPct(data.punya_toilet_pct)} />
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-medium text-white/80">Air & Energi</h4>
          </div>
          <MiniBar label="Sumber air PDAM" pct={data.air_pdam_pct} color="bg-emerald-500" />
          <MiniBar label="Sumber air sumur" pct={data.air_sumur_pct} color="bg-sky-500" />
          <MiniBar label="Kekurangan air minum" pct={data.kekurangan_air_pct} color="bg-amber-500" />
          <StatRow label="Penerangan PLN" value={fmtPct(data.listrik_pln_pct)} />
        </div>
      </div>

      {/* Demografi & Pendidikan */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="w-4 h-4 text-violet-400" />
          <h4 className="text-sm font-medium text-white/80">Demografi & Pendidikan</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <StatRow label="Rata-rata umur" value={`${fmtNum(data.rata_umur, 0)} thn`} />
          <StatRow label="Laki-laki" value={fmtPct(data.laki_laki_pct)} />
          <StatRow label="Perempuan" value={fmtPct(data.perempuan_pct)} />
          <StatRow label="Punya NIK" value={fmtPct(data.punya_nik_pct)} />
        </div>
        <div className="border-t border-white/5 pt-3 space-y-1">
          <MiniBar label="Tidak bersekolah" pct={data.tidak_sekolah_pct} color="bg-rose-500" />
          <MiniBar label="Pendidikan SD" pct={data.sd_pct} color="bg-sky-500" />
          <MiniBar label="Pendidikan SMP" pct={data.smp_pct} color="bg-amber-500" />
          <MiniBar label="Pendidikan SMA+" pct={data.sma_pct} color="bg-emerald-500" />
          <MiniBar label="Buta huruf" pct={data.buta_huruf_pct} color="bg-red-500" />
        </div>
      </div>

      <p className="text-xs text-white/25 leading-relaxed">
        Data Susenas 2025 bersifat sampel (survei), bukan sensus penuh. Agregasi dihitung per kabupaten/kota. Sumber: BPS Susenas Kor 2025.
      </p>
    </div>
  );
}
