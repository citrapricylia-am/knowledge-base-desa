'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles, FileText } from 'lucide-react';
import type { NarasiItem, NarasiJson } from '@/lib/types';

interface NarasiPanelProps {
  narasi: NarasiJson;
  sumber: 'llm' | 'template' | 'cache' | string;
  /**
   * Rekomendasi AI yang judulnya TIDAK cocok dengan bidang program mana pun.
   * Yang cocok sudah ditempel di kartu Rencana Aksi; sisanya tampil di sini
   * supaya tidak ada analisis yang hilang.
   */
  rekomendasiLain?: NarasiItem[];
  /** Narasi AI masih disusun di belakang layar — tampilkan skeleton. */
  sedangMenyusun?: boolean;
  /** Narasi gagal disusun — angka tetap tampil, narasi diberi pesan. */
  gagalMenyusun?: boolean;
  /** Narasi template: paragrafnya duplikat panel diagnosis, jadi hanya rekomendasiLain yang tampil. */
  sembunyikanParagraf?: boolean;
}

/**
 * Panel analisis naratif AI: konteks desa dan posisi anggaran, dipecah
 * jadi blok pendek. Visual pilar & cakupan ada di panel Posisi IDM dan
 * Ringkasan; rekomendasi per program ada di Rencana Aksi.
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

export default function NarasiPanel({ narasi, sumber, rekomendasiLain = [], sedangMenyusun, gagalMenyusun, sembunyikanParagraf }: NarasiPanelProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Interpretasi analis AI</h2>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${badge.className}`}>
          <Icon className="w-3.5 h-3.5" />
          {badge.label}
        </span>
      </div>

      {!sembunyikanParagraf && (<>
      {/* === KONTEKS DESA === */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
        <h4 className="text-xs uppercase tracking-wide text-white/50">Mengapa kondisi desa seperti ini</h4>
        {sedangMenyusun ? (
          <div className="space-y-2.5" aria-live="polite" aria-busy="true">
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '94%' }} />
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '88%' }} />
            <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: '72%' }} />
            <p className="pt-1 text-xs text-white/35">AI sedang membaca data desa dan menyusun analisis…</p>
          </div>
        ) : gagalMenyusun ? (
          <p className="text-sm text-white/45">
            Narasi AI gagal disusun. Angka, temuan, dan rencana aksi tetap valid
            karena dihitung langsung dari data — muat ulang halaman untuk mencoba lagi.
          </p>
        ) : (
          konteksBlok.map((blok, i) => (
            <p key={i} className="text-white/75 leading-relaxed text-sm">{blok}</p>
          ))
        )}
      </div>

      {/* === POSISI ANGGARAN === */}
      <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5 space-y-3">
        <h4 className="text-xs uppercase tracking-wide text-white/50">Strategi anggaran</h4>
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

      </>)}

      {/* === REKOMENDASI === */}
      {!sedangMenyusun && rekomendasiLain.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white/70">Catatan rekomendasi lain dari AI</h4>
          {rekomendasiLain.map((item, idx) => {
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
      )}

      <p className="text-xs text-white/30 border-t border-white/5 pt-3 leading-relaxed">
        {narasi.disclaimer}
      </p>
    </div>
  );
}
