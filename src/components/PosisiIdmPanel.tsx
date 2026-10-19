import { TrendingUp } from 'lucide-react';
import type { PosisiIdm } from '@/lib/types';
import { formatNumber, tingkatColor, tingkatLabel } from '@/lib/format';
import { AMBANG_IDM } from '@/lib/diagnosis';

const AMBANG_MAJU = 0.7072;

const warnaBar: Record<string, string> = {
  kritis: 'bg-rose-500',
  tinggi: 'bg-orange-500',
  sedang: 'bg-amber-400',
  baik: 'bg-emerald-500',
};

/**
 * Posisi desa di tangga IDM + tiga pilar dengan garis ambang MAJU,
 * supaya pengguna langsung melihat pilar mana yang menahan desa.
 */
export default function PosisiIdmPanel({ posisi }: { posisi: PosisiIdm }) {
  const tangga = [...AMBANG_IDM].reverse();

  return (
    <section id="posisi-idm" className="glass-card rounded-3xl p-5 md:p-6 space-y-5 scroll-mt-24">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-sky-400" />
        <h2 className="text-base font-semibold text-white">Posisi Indeks Desa Membangun (IDM)</h2>
      </div>

      {/* Tangga status */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-1">
          {tangga.map((a) => {
            const aktif = a.status === posisi.status;
            const target = a.status === posisi.statusBerikut;
            return (
              <div
                key={a.status}
                className={`min-w-0 rounded-lg border px-0.5 md:px-1.5 py-2 text-center ${
                  aktif
                    ? 'border-white/40 bg-white/10'
                    : target
                      ? 'border-dashed border-white/25 bg-white/[0.02]'
                      : 'border-white/5 bg-white/[0.02]'
                }`}
              >
                <div className={`text-[10px] md:text-[11px] font-semibold leading-tight ${aktif ? 'text-white' : 'text-white/45'}`}>
                  {/* Huruf kapital penuh terlalu lebar untuk 5 kolom di ponsel */}
                  <span className="md:hidden capitalize">{a.status.toLowerCase()}</span>
                  <span className="hidden md:inline">{a.status}</span>
                </div>
                <div className="text-[9px] md:text-[10px] text-white/30 tabular-nums mt-0.5">≥{formatNumber(a.min, 4)}</div>
                {aktif && <div className="text-[10px] text-[var(--accent)] mt-0.5">posisi kini</div>}
                {target && <div className="text-[10px] text-white/50 mt-0.5">target</div>}
              </div>
            );
          })}
        </div>
        <p className="text-sm text-white/75 leading-relaxed">{posisi.penjelasan}</p>
      </div>

      {/* Pilar */}
      <div className="space-y-4">
        {posisi.pilar.map((p) => {
          const terlemah = p.kode === posisi.pilarTerlemah;
          return (
            <div key={p.kode} className="space-y-1.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/85">{p.label}</span>
                  {terlemah && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-rose-500/30 text-rose-300">
                      terlemah
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tingkatColor(p.tingkat)}`}>
                    {tingkatLabel(p.tingkat)}
                  </span>
                  <span className="text-sm font-semibold text-white tabular-nums">{formatNumber(p.nilai, 4)}</span>
                </div>
              </div>
              <div className="relative h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${warnaBar[p.tingkat]} transition-all duration-700`}
                  style={{ width: `${Math.min(100, p.nilai * 100)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px bg-white/60"
                  style={{ left: `${AMBANG_MAJU * 100}%` }}
                  aria-hidden
                />
              </div>
              <p className="text-xs text-white/40 leading-snug">
                Mencakup {p.cakupan}.
                {p.selisihKeMaju > 0 && ` Kurang ${formatNumber(p.selisihKeMaju, 4)} poin dari ambang MAJU.`}
              </p>
            </div>
          );
        })}
        <p className="text-[11px] text-white/30 flex items-center gap-1.5">
          <span className="inline-block w-px h-3 bg-white/60" /> garis = ambang status MAJU (0,7072). IDM = rata-rata tiga pilar.
        </p>
      </div>
    </section>
  );
}
