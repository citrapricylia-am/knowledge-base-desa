'use client';

import { useState } from 'react';
import { AlertTriangle, ThumbsUp, Lightbulb } from 'lucide-react';
import type { Temuan } from '@/lib/types';
import { tingkatColor, tingkatLabel } from '@/lib/format';

const TAMPIL_AWAL = 4;

function KartuTemuan({ t }: { t: Temuan }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-white">{t.judul}</div>
          <div className="text-[11px] text-white/35">
            {t.pilar} · {t.sumber}
          </div>
        </div>
        <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-md border ${tingkatColor(t.tingkat)}`}>
          {tingkatLabel(t.tingkat)}
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-lg font-bold text-white tabular-nums">{t.nilai}</span>
        <span className="text-xs text-white/40">{t.pembanding}</span>
      </div>

      <p className="text-sm text-white/65 leading-relaxed">{t.penjelasan}</p>

      <p className="text-xs text-white/70 leading-relaxed flex gap-2 border-t border-white/5 pt-2.5">
        <Lightbulb className="w-3.5 h-3.5 text-amber-300/80 shrink-0 mt-0.5" />
        <span>{t.saran}</span>
      </p>
    </div>
  );
}

/** Temuan diagnosis: masalah (paling parah dulu) lalu kekuatan desa. */
export default function TemuanPanel({ temuan }: { temuan: Temuan[] }) {
  const [semua, setSemua] = useState(false);
  const masalah = temuan.filter((t) => t.jenis === 'masalah');
  const kekuatan = temuan.filter((t) => t.jenis === 'kekuatan');
  const tersembunyi = masalah.length - TAMPIL_AWAL;

  return (
    <section id="temuan" className="glass-card rounded-3xl p-5 md:p-6 space-y-5 scroll-mt-24">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <h2 className="text-base font-semibold text-white">Temuan utama</h2>
        </div>
        <p className="text-xs text-white/45">
          Setiap temuan dibandingkan dengan ambang/standar, dijelaskan dampaknya, dan diberi saran tindak lanjut.
        </p>
      </div>

      {masalah.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wide text-white/45">Masalah ({masalah.length})</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {masalah.map((t, i) => (
              <div key={t.id} className={!semua && i >= TAMPIL_AWAL ? 'hidden print:block' : ''}>
                <KartuTemuan t={t} />
              </div>
            ))}
          </div>
          {tersembunyi > 0 && (
            <button
              type="button"
              onClick={() => setSemua((v) => !v)}
              className="print-hide text-xs text-white/60 hover:text-white transition-colors"
            >
              {semua ? 'Tampilkan lebih sedikit' : `Tampilkan ${tersembunyi} temuan lainnya`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/55">Tidak ada masalah menonjol dari indikator yang tersedia.</p>
      )}

      {kekuatan.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wide text-white/45 flex items-center gap-1.5">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
            Kekuatan yang bisa dimanfaatkan ({kekuatan.length})
          </h3>
          <ul className="grid md:grid-cols-2 gap-3">
            {kekuatan.map((t) => (
              <li key={t.id} className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] p-3.5 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-white/90">{t.judul}</span>
                  <span className="text-sm font-semibold text-emerald-300 tabular-nums shrink-0">{t.nilai}</span>
                </div>
                <p className="text-xs text-white/55 leading-relaxed">{t.saran}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
