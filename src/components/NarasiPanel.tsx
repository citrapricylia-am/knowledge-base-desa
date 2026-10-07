'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles, FileText } from 'lucide-react';
import type { NarasiJson } from '@/lib/types';

interface NarasiPanelProps {
  narasi: NarasiJson;
  sumber: 'llm' | 'template' | 'cache' | string;
  kegiatan?: string[];
}

export default function NarasiPanel({ narasi, sumber, kegiatan }: NarasiPanelProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const badge =
    sumber === 'llm'
      ? { label: 'Analisis AI', className: 'bg-violet-500/10 text-violet-300 border-violet-500/20', Icon: Sparkles }
      : sumber === 'cache'
        ? { label: 'Analisis AI (cache)', className: 'bg-sky-500/10 text-sky-300 border-sky-500/20', Icon: FileText }
        : { label: 'Template', className: 'bg-white/5 text-white/40 border-white/10', Icon: FileText };

  const Icon = badge.Icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Analisis & Rekomendasi</h3>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${badge.className}`}>
          <Icon className="w-3.5 h-3.5" />
          {badge.label}
        </span>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-4">
        <section>
          <h4 className="text-xs uppercase tracking-wide text-white/50 mb-1.5">Konteks desa</h4>
          <p className="text-white/80 leading-relaxed text-sm">{narasi.konteks}</p>
        </section>
        <section>
          <h4 className="text-xs uppercase tracking-wide text-white/50 mb-1.5">Posisi anggaran</h4>
          <p className="text-white/80 leading-relaxed text-sm">{narasi.posisi_anggaran}</p>
        </section>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/70">Rekomendasi kegiatan</h4>
        {narasi.rekomendasi.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <div
              key={`${item.judul}-${idx}`}
              className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : idx)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                <span className="font-medium text-white text-sm">{item.judul}</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <ul className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                  {item.poin.map((p, i) => (
                    <li key={i} className="text-sm text-white/60 flex gap-2">
                      <span className="text-white/90 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {kegiatan && kegiatan.length > 0 && (
        <p className="text-xs text-white/40">
          Matriks kegiatan deterministik: {kegiatan.length} item untuk tier ini.
        </p>
      )}

      <p className="text-xs text-white/40 border-t border-white/5 pt-3 leading-relaxed">
        {narasi.disclaimer}
      </p>
    </div>
  );
}
