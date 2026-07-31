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
      ? { label: 'Narasi LLM', className: 'bg-violet-500/15 text-violet-300 border-violet-500/30', Icon: Sparkles }
      : sumber === 'cache'
        ? { label: 'Cache', className: 'bg-sky-500/15 text-sky-300 border-sky-500/30', Icon: FileText }
        : { label: 'Template', className: 'bg-slate-500/15 text-slate-300 border-slate-500/30', Icon: FileText };

  const Icon = badge.Icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">Narasi Analisis</h3>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${badge.className}`}>
          <Icon className="w-3.5 h-3.5" />
          {badge.label}
        </span>
      </div>

      <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-5 space-y-4">
        <section>
          <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Konteks desa</h4>
          <p className="text-slate-200 leading-relaxed text-sm">{narasi.konteks}</p>
        </section>
        <section>
          <h4 className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">Posisi anggaran</h4>
          <p className="text-slate-200 leading-relaxed text-sm">{narasi.posisi_anggaran}</p>
        </section>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-300">Rekomendasi kegiatan</h4>
        {narasi.rekomendasi.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <div
              key={`${item.judul}-${idx}`}
              className="rounded-xl border border-slate-700/70 bg-slate-900/40 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : idx)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
              >
                <span className="font-medium text-slate-100 text-sm">{item.judul}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <ul className="px-4 pb-4 space-y-2 border-t border-slate-800/80 pt-3">
                  {item.poin.map((p, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-emerald-400 mt-0.5">•</span>
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
        <p className="text-xs text-slate-500">
          Matriks kegiatan deterministik: {kegiatan.length} item untuk tier ini.
        </p>
      )}

      <p className="text-xs text-slate-500 border-t border-slate-800 pt-3 leading-relaxed">
        {narasi.disclaimer}
      </p>
    </div>
  );
}
