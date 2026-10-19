import Link from 'next/link';
import { Calculator, ClipboardList } from 'lucide-react';
import type { AnalisisPayload } from '@/lib/types';
import { formatNumber, formatPct, statusIdmColor, tierColor, tierLabel } from '@/lib/format';
import { rupiahRingkas } from '@/lib/diagnosis';

/**
 * Ringkasan eksekutif — jawaban 30 detik untuk pengambil keputusan:
 * di mana posisi desa, apa masalah terbesarnya, cukupkah anggarannya,
 * dan ke mana uang pertama sebaiknya pergi.
 */
export default function RingkasanEksekutif({ analisis, kodeBps }: { analisis: AnalisisPayload; kodeBps: string }) {
  const { diagnosis } = analisis;
  const posisi = diagnosis.posisiIdm;
  const jumlahMasalah = diagnosis.temuan.filter(
    (t) => t.jenis === 'masalah' && !t.id.startsWith('pilar_') && (t.tingkat === 'kritis' || t.tingkat === 'tinggi'),
  ).length;
  const lebarCakupan = Math.min(100, Math.max(0, analisis.coverage_pct));

  const tiles: { label: string; nilai: React.ReactNode; ket: string }[] = [
    {
      label: 'Status IDM',
      nilai: posisi ? (
        <span className={`inline-block px-2 py-0.5 rounded-md border text-sm ${statusIdmColor(posisi.status)}`}>
          {posisi.status}
        </span>
      ) : '—',
      ket: posisi ? `Skor ${formatNumber(posisi.skor, 4)}` : 'Data IDM tidak tersedia',
    },
    {
      label: 'Jarak ke status berikut',
      nilai: posisi?.statusBerikut ? `+${formatNumber(posisi.selisihKeBerikut, 4)}` : posisi ? 'Puncak' : '—',
      ket: posisi?.statusBerikut ? `poin IDM untuk naik ke ${posisi.statusBerikut}` : 'Sudah MANDIRI',
    },
    {
      label: 'Cakupan anggaran',
      nilai: formatPct(analisis.coverage_pct),
      ket: `${rupiahRingkas(analisis.anggaran)} dari ${rupiahRingkas(analisis.estimasi_biaya_ideal)}`,
    },
    {
      label: 'Masalah serius',
      nilai: String(jumlahMasalah),
      ket: 'temuan tingkat kritis & tinggi',
    },
  ];

  return (
    <section id="ringkasan" className="glass-card rounded-3xl p-5 md:p-6 space-y-5 scroll-mt-24">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="text-base font-semibold text-white">Ringkasan eksekutif</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 space-y-1.5">
            <div className="text-[11px] uppercase tracking-wide text-white/40">{t.label}</div>
            <div className="text-xl font-bold text-white tabular-nums leading-tight">{t.nilai}</div>
            <div className="text-xs text-white/45 leading-snug">{t.ket}</div>
            {t.label === 'Cakupan anggaran' && (
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-white" style={{ width: `${lebarCakupan}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`px-2.5 py-1 rounded-md border text-xs ${tierColor(analisis.tier)}`}>
          {tierLabel(analisis.tier)}
        </span>
        <Link
          href={`/hasil/anggaran?kode_bps=${kodeBps}&anggaran=${analisis.anggaran}`}
          className="print-hide inline-flex items-center gap-1.5 text-xs text-amber-300/90 hover:text-amber-200 transition-colors"
        >
          <Calculator className="w-3.5 h-3.5" />
          Rincian perhitungan & simulasi anggaran →
        </Link>
      </div>

      <ol className="space-y-2.5">
        {diagnosis.ringkasan.map((kalimat, i) => (
          <li key={i} className="flex gap-3 text-sm text-white/80 leading-relaxed">
            <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-white/70 flex items-center justify-center">
              {i + 1}
            </span>
            <span>{kalimat}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
