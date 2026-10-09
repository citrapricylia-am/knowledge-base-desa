'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles, FileText, TrendingUp } from 'lucide-react';
import type { NarasiJson, AnalisisPayload } from '@/lib/types';
import { formatPct } from '@/lib/format';

interface NarasiPanelProps {
  narasi: NarasiJson;
  sumber: 'llm' | 'template' | 'cache' | string;
  kegiatan?: string[];
  analisis?: AnalisisPayload;
  idm?: number | string | null;
  iks?: number | string | null;
  ike?: number | string | null;
  ikl?: number | string | null;
  /** Narasi AI masih disusun di belakang layar — tampilkan skeleton. */
  sedangMenyusun?: boolean;
  /** Narasi gagal disusun — angka tetap tampil, narasi diberi pesan. */
  gagalMenyusun?: boolean;
}

/**
 * Panel analisis AI — dirancang ulang supaya tidak overwhelm:
 *
 * - Konteks dipisah jadi blok-blok pendek, bukan paragraf panjang
 * - Pilar IDM divisualisasikan sebagai bar horizontal (bukan teks)
 * - Coverage anggaran sebagai ring gauge
 * - Rekomendasi tetap collapsible tapi dengan struktur lebih jelas
 */

function pecahParagraf(teks: string): string[] {
  // Pecah paragraf panjang jadi blok pendek supaya tidak overwhelm.
  //
  // Titik desimal & ribuan JANGAN dianggap akhir kalimat — tanpa penjaga
  // ini "0.7444" terbelah jadi "0." + " 7444" dan angka tampil rusak.
  // Akhir kalimat sah = . ! ? yang TIDAK diapit angka di kedua sisi.
  if (!teks) return [''];

  const kalimat: string[] = [];
  let mulai = 0;
  for (let i = 0; i < teks.length; i++) {
    const c = teks[i];
    if (c !== '.' && c !== '!' && c !== '?') continue;
    // titik antar angka (0.7444 / 2.291) bukan akhir kalimat
    const sebelumAngka = /\d/.test(teks[i - 1] ?? '');
    const sesudahAngka = /\d/.test(teks[i + 1] ?? '');
    if (sebelumAngka && sesudahAngka) continue;
    // serap tanda baca berturut (?! ...)
    let j = i;
    while (j + 1 < teks.length && '.!?'.includes(teks[j + 1])) j++;
    kalimat.push(teks.slice(mulai, j + 1).trim());
    mulai = j + 1;
    i = j;
  }
  const ekor = teks.slice(mulai).trim();
  if (ekor) kalimat.push(ekor);

  const blok: string[] = [];
  let current = '';
  for (const k of kalimat) {
    current += (current ? ' ' : '') + k;
    if (current.length > 180) {
      blok.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) blok.push(current.trim());
  return blok.length ? blok : [teks];
}

function PilarBar({ label, value, isWeak }: { label: string; value: number | string | null; isWeak?: boolean }) {
  // Angka dari PostgreSQL (numeric) datang sebagai STRING lewat JSON.
  // Tanpa Number() di sini, .toFixed() melempar "is not a function".
  const num = value == null ? null : Number(value);
  const v = num != null && Number.isFinite(num) ? num : 0;
  const pct = Math.min(100, v * 100);
  const color = isWeak ? 'bg-rose-500' : v >= 0.71 ? 'bg-emerald-500' : v >= 0.6 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-white/50">{label}</span>
        <span className={`text-xs font-medium tabular-nums ${isWeak ? 'text-rose-400' : 'text-white/70'}`}>
          {num != null && Number.isFinite(num) ? num.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CoverageRing({ pct }: { pct: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, pct) / 100) * circumference;
  const color = pct >= 50 ? '#10b981' : pct >= 20 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 70 70">
        <circle cx="35" cy="35" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="35" cy="35" r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-white tabular-nums">{pct.toFixed(0)}%</span>
        <span className="text-[9px] text-white/40">cakupan</span>
      </div>
    </div>
  );
}

export default function NarasiPanel({ narasi, sumber, kegiatan, idm, iks, ike, ikl, analisis, sedangMenyusun, gagalMenyusun }: NarasiPanelProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const badge =
    sedangMenyusun
      ? { label: 'Menyusun…', className: 'bg-white/5 text-white/50 border-white/10', Icon: Sparkles }
      : gagalMenyusun
        ? { label: 'Narasi gagal', className: 'bg-amber-500/10 text-amber-300 border-amber-500/20', Icon: FileText }
        : sumber === 'llm'
          ? { label: 'Analisis AI', className: 'bg-violet-500/10 text-violet-300 border-violet-500/20', Icon: Sparkles }
          : sumber === 'cache'
            ? { label: 'Analisis AI', className: 'bg-sky-500/10 text-sky-300 border-sky-500/20', Icon: FileText }
            : { label: 'Template', className: 'bg-white/5 text-white/40 border-white/10', Icon: FileText };

  const Icon = badge.Icon;
  const konteksBlok = pecahParagraf(narasi.konteks);
  const posisiBlok = pecahParagraf(narasi.posisi_anggaran);
  const coverage = Number(analisis?.coverage_pct ?? 0) || 0;
  // Number() wajib: nilai numeric Postgres tiba sebagai string
  const nIks = iks == null ? null : Number(iks);
  const nIke = ike == null ? null : Number(ike);
  const nIkl = ikl == null ? null : Number(ikl);
  const pilarTerlemah = nIks != null && nIke != null && nIkl != null
    ? [{ v: nIks, l: 'Sosial' }, { v: nIke, l: 'Ekonomi' }, { v: nIkl, l: 'Lingkungan' }].sort((a, b) => a.v - b.v)[0]
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Analisis & Rekomendasi</h3>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${badge.className}`}>
          <Icon className="w-3.5 h-3.5" />
          {badge.label}
        </span>
      </div>

      {/* === RINGKASAN VISUAL === */}
      {(idm != null || coverage > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Pilar IDM */}
          {iks != null && ike != null && ikl != null && (
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs uppercase tracking-wide text-white/50">Pilar IDM</span>
              </div>
              <PilarBar label="Sosial" value={iks} isWeak={pilarTerlemah?.l === 'Sosial'} />
              <PilarBar label="Ekonomi" value={ike} isWeak={pilarTerlemah?.l === 'Ekonomi'} />
              <PilarBar label="Lingkungan" value={ikl} isWeak={pilarTerlemah?.l === 'Lingkungan'} />
            </div>
          )}

          {/* Coverage anggaran */}
          {coverage > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 flex items-center gap-4">
              <CoverageRing pct={coverage} />
              <div className="space-y-0.5">
                <div className="text-xs uppercase tracking-wide text-white/50">Anggaran</div>
                <div className="text-sm text-white/70 leading-tight">
                  {formatPct(coverage)} dari kebutuhan ideal
                </div>
                <div className="text-xs text-white/40">
                  {coverage >= 50 ? 'Mencukupi sebagian besar' : coverage >= 20 ? 'Cukup untuk non-fisik' : 'Sangat terbatas'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === KONTEKS DESA === */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
        <h4 className="text-xs uppercase tracking-wide text-white/50">Konteks desa</h4>
        {sedangMenyusun ? (
          <div className="space-y-2.5" aria-live="polite" aria-busy="true">
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '94%' }} />
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '88%' }} />
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '72%' }} />
            <p className="pt-1 text-xs text-white/35">AI sedang membaca data desa dan menyusun analisis…</p>
          </div>
        ) : gagalMenyusun ? (
          <p className="text-sm text-white/45">
            Narasi AI gagal disusun. Angka dan rekomendasi di bawah tetap valid —
            muat ulang halaman untuk mencoba lagi.
          </p>
        ) : (
          konteksBlok.map((blok, i) => (
            <p key={i} className="text-white/75 leading-relaxed text-sm">{blok}</p>
          ))
        )}
      </div>

      {/* === POSISI ANGGARAN === */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
        <h4 className="text-xs uppercase tracking-wide text-white/50">Posisi anggaran</h4>
        {sedangMenyusun ? (
          <div className="space-y-2.5">
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '90%' }} />
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '64%' }} />
          </div>
        ) : gagalMenyusun ? (
          <p className="text-sm text-white/45">Belum tersedia.</p>
        ) : (
          posisiBlok.map((blok, i) => (
            <p key={i} className="text-white/75 leading-relaxed text-sm">{blok}</p>
          ))
        )}
      </div>

      {/* === REKOMENDASI === */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white/70">Rekomendasi kegiatan</h4>
        {sedangMenyusun && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                <div className="h-3.5 rounded bg-white/[0.07] animate-pulse" style={{ width: `${70 - i * 12}%` }} />
              </div>
            ))}
          </div>
        )}
        {!sedangMenyusun && narasi.rekomendasi.map((item, idx) => {
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
                  className={`w-4 h-4 text-white/40 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && (
                <ul className="px-4 pb-4 space-y-2.5 border-t border-white/5 pt-3">
                  {item.poin.map((p, i) => (
                    <li key={i} className="text-sm text-white/60 flex gap-2.5">
                      <span className="text-white/30 mt-0.5 shrink-0">•</span>
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {kegiatan && kegiatan.length > 0 && (
        <p className="text-xs text-white/30">
          Matriks kegiatan: {kegiatan.length} item untuk tier ini.
        </p>
      )}

      <p className="text-xs text-white/30 border-t border-white/5 pt-3 leading-relaxed">
        {narasi.disclaimer}
      </p>
    </div>
  );
}
