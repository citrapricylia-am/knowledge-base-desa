'use client';

import { useState } from 'react';
import { AlertTriangle, ThumbsUp, Lightbulb, Link2 } from 'lucide-react';
import type { Keterkaitan, Temuan } from '@/lib/types';
import { tingkatColor, tingkatLabel } from '@/lib/format';

const TAMPIL_AWAL = 6;
const PILAR = ['Ketahanan Sosial', 'Ketahanan Ekonomi', 'Ketahanan Lingkungan'] as const;

function KartuTemuan({ t }: { t: Temuan }) {
  return (
    <div className="h-full rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-2.5">
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

/**
 * Temuan diagnosis: keterkaitan antar-temuan, lalu masalah (paling parah
 * dulu, bisa difilter per pilar) dan kekuatan desa. Skor pilar IDM sendiri
 * tidak diulang di sini — sudah ada di panel Posisi IDM.
 */
export default function TemuanPanel({ temuan, keterkaitan }: { temuan: Temuan[]; keterkaitan: Keterkaitan[] }) {
  const [semua, setSemua] = useState(false);
  const [pilar, setPilar] = useState<string | null>(null);

  const bukanSkorPilar = temuan.filter((t) => !t.id.startsWith('pilar_'));
  const masalahSemua = bukanSkorPilar.filter((t) => t.jenis === 'masalah');
  const masalah = pilar ? masalahSemua.filter((t) => t.pilar === pilar) : masalahSemua;
  const kekuatan = bukanSkorPilar.filter((t) => t.jenis === 'kekuatan');
  const dipotong = !semua && !pilar;
  const tersembunyi = masalah.length - TAMPIL_AWAL;

  return (
    <section id="temuan" className="glass-card rounded-3xl p-5 md:p-6 space-y-5 scroll-mt-24">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <h2 className="text-base font-semibold text-white">Temuan utama</h2>
        </div>
        <p className="text-xs text-white/45">
          Dianalisis dari Podes (indikator & daftar fasilitas), data lahan KLHK, dan Susenas kabupaten. Tiap temuan
          dibandingkan dengan standar, dijelaskan dampaknya, dan diberi saran.
        </p>
      </div>

      {keterkaitan.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs uppercase tracking-wide text-white/45 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            Keterkaitan antar-temuan ({keterkaitan.length})
          </h3>
          <ul className="space-y-2.5">
            {keterkaitan.map((k) => (
              <li key={k.judul} className="rounded-xl border border-sky-500/15 bg-sky-500/[0.05] p-4 space-y-1.5">
                <div className="text-sm font-semibold text-white">{k.judul}</div>
                <p className="text-sm text-white/70 leading-relaxed">{k.isi}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {masalahSemua.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 print-hide">
            {[null, ...PILAR].map((p) => {
              const n = p ? masalahSemua.filter((t) => t.pilar === p).length : masalahSemua.length;
              if (p && !n) return null;
              const aktif = pilar === p;
              return (
                <button
                  key={p ?? 'semua'}
                  type="button"
                  onClick={() => setPilar(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                    aktif ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-white/55 hover:text-white'
                  }`}
                >
                  {p ? p.replace('Ketahanan ', '') : 'Semua masalah'} <span className="text-white/40">{n}</span>
                </button>
              );
            })}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {masalah.map((t, i) => (
              <div key={t.id} className={dipotong && i >= TAMPIL_AWAL ? 'hidden print:block' : ''}>
                <KartuTemuan t={t} />
              </div>
            ))}
          </div>
          {dipotong && tersembunyi > 0 && (
            <button
              type="button"
              onClick={() => setSemua(true)}
              className="print-hide text-xs text-white/60 hover:text-white transition-colors"
            >
              Tampilkan {tersembunyi} temuan lainnya
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
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-sm font-medium text-white/90">{t.judul}</span>
                  <span className="text-xs font-semibold text-emerald-300 tabular-nums">{t.nilai}</span>
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
