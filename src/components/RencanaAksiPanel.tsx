'use client';

import { useState } from 'react';
import {
  ChevronDown,
  Target,
  ListChecks,
  Gauge,
  Handshake,
  ShieldAlert,
  Wallet,
  Sparkles,
  CalendarRange,
  CircleAlert,
} from 'lucide-react';
import type { NarasiItem, ProgramRekomendasi, TahapanPelaksanaan, Temuan } from '@/lib/types';
import { formatPct, formatRp, urgensiColor } from '@/lib/format';

const WARNA_PROGRAM = ['bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-teal-400'];
const WARNA_MONITORING = 'bg-white/30';

function warna(p: ProgramRekomendasi, i: number) {
  return p.key === 'monitoring' ? WARNA_MONITORING : WARNA_PROGRAM[i % WARNA_PROGRAM.length];
}

function Bagian({ icon: Icon, judul, children }: { icon: typeof Target; judul: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h5 className="text-[11px] uppercase tracking-wide text-white/45 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {judul}
      </h5>
      {children}
    </div>
  );
}

function KartuProgram({
  p,
  i,
  terbuka,
  onToggle,
  catatanAi,
  sedangMenyusun,
}: {
  p: ProgramRekomendasi;
  i: number;
  terbuka: boolean;
  onToggle: () => void;
  catatanAi?: NarasiItem;
  sedangMenyusun?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={terbuka}
        className="w-full text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className={`shrink-0 w-7 h-7 rounded-lg ${warna(p, i)} text-black text-sm font-bold flex items-center justify-center`}>
            {p.prioritas}
          </span>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-white">{p.bidang}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${urgensiColor(p.urgensi)}`}>{p.urgensi}</span>
            </div>
            <p className="text-xs text-white/55 leading-snug">{p.kegiatan.join(' · ')}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-bold text-white tabular-nums">{formatRp(p.alokasi)}</div>
            <div className="text-[11px] text-white/40 tabular-nums">{formatPct(p.porsiPct)} anggaran</div>
          </div>
          <ChevronDown className={`w-4 h-4 mt-1.5 text-white/40 shrink-0 transition-transform print-hide ${terbuka ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <div className={`${terbuka ? '' : 'hidden print:block'} border-t border-white/5 px-4 py-4 space-y-5`}>
        <p className="text-sm text-white/75 leading-relaxed">{p.tujuan}</p>

        <div className="grid md:grid-cols-2 gap-5">
          <Bagian icon={Target} judul="Mengapa diprioritaskan">
            {p.alasan.length ? (
              <ul className="space-y-1.5">
                {p.alasan.map((a) => (
                  <li key={a} className="text-sm text-white/70 leading-snug flex gap-2">
                    <span className="text-white/30">•</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/60">Pendukung lintas pilar agar program lain berjalan dan terukur.</p>
            )}
          </Bagian>

          <Bagian icon={Wallet} judul="Sasaran & jangkauan">
            <p className="text-sm text-white/75 leading-snug">{p.sasaran}</p>
            {p.jangkauan && <p className="text-xs text-white/50 leading-snug">{p.jangkauan}</p>}
            <p className="text-xs text-white/40">Perkiraan durasi: {p.durasi}</p>
          </Bagian>
        </div>

        <Bagian icon={ListChecks} judul="Langkah pelaksanaan">
          <ol className="space-y-2">
            {p.langkah.map((l, k) => (
              <li key={l} className="text-sm text-white/70 leading-snug flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-white/8 text-[11px] text-white/60 flex items-center justify-center">
                  {k + 1}
                </span>
                <span>{l}</span>
              </li>
            ))}
          </ol>
        </Bagian>

        <div className="grid md:grid-cols-2 gap-5">
          <Bagian icon={Gauge} judul="Indikator keberhasilan">
            <ul className="space-y-1.5">
              {p.indikator.map((x) => (
                <li key={x} className="text-sm text-white/70 leading-snug flex gap-2">
                  <span className="text-emerald-400/70">✓</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Bagian>

          <Bagian icon={Handshake} judul="Mitra & sumber dana pelengkap">
            <div className="flex flex-wrap gap-1.5">
              {p.mitra.map((m) => (
                <span key={m} className="text-[11px] px-2 py-0.5 rounded-md border border-white/10 text-white/65">{m}</span>
              ))}
            </div>
            {p.danaPelengkap.length > 0 && (
              <p className="text-xs text-white/50 leading-snug">Dana pelengkap: {p.danaPelengkap.join(', ')}.</p>
            )}
          </Bagian>
        </div>

        {p.risiko.length > 0 && (
          <Bagian icon={ShieldAlert} judul="Risiko & mitigasi">
            <ul className="space-y-1.5">
              {p.risiko.map((r) => (
                <li key={r.risiko} className="text-sm leading-snug">
                  <span className="text-white/80">{r.risiko}</span>
                  <span className="text-white/35"> → </span>
                  <span className="text-white/60">{r.mitigasi}</span>
                </li>
              ))}
            </ul>
          </Bagian>
        )}

        {(catatanAi || sedangMenyusun) && (
          <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.05] p-3.5 space-y-2">
            <h5 className="text-[11px] uppercase tracking-wide text-violet-300/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Catatan analis AI untuk desa ini
            </h5>
            {sedangMenyusun ? (
              <div className="space-y-2" aria-busy="true">
                <div className="h-2.5 rounded bg-white/[0.07] animate-pulse w-11/12" />
                <div className="h-2.5 rounded bg-white/[0.07] animate-pulse w-3/4" />
              </div>
            ) : (
              <ul className="space-y-1.5">
                {catatanAi!.poin.map((x) => (
                  <li key={x} className="text-sm text-white/70 leading-relaxed">{x}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Rencana aksi: alokasi anggaran per program (bar bertumpuk), kartu program
 * berprioritas, dan tahapan pelaksanaan. Data dari diagnosis deterministik;
 * catatan AI ditempel per program bila judulnya cocok dengan bidang.
 */
export default function RencanaAksiPanel({
  program,
  tahapan,
  anggaran,
  tidakTercakup,
  catatanAi,
  sedangMenyusun,
}: {
  program: ProgramRekomendasi[];
  tahapan: TahapanPelaksanaan[];
  anggaran: number;
  /** Masalah serius yang tidak ditangani program mana pun di paket ini */
  tidakTercakup: Temuan[];
  catatanAi: Record<string, NarasiItem>;
  sedangMenyusun?: boolean;
}) {
  const [terbuka, setTerbuka] = useState<number | null>(0);

  return (
    <section id="rencana" className="glass-card rounded-3xl p-5 md:p-6 space-y-5 scroll-mt-24">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-emerald-400" />
          <h2 className="text-base font-semibold text-white">Rencana aksi & alokasi anggaran</h2>
        </div>
        <p className="text-xs text-white/45">
          Urutan prioritas ditentukan dari tingkat keparahan temuan yang mendasari tiap program.
          Alokasi proporsional terhadap prioritas; 7% disisihkan untuk monitoring.
        </p>
      </div>

      {/* Bar alokasi bertumpuk */}
      <div className="space-y-2.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/45">Total anggaran</span>
          <span className="text-white/80 font-semibold tabular-nums">{formatRp(anggaran)}</span>
        </div>
        <div className="alokasi-bar flex h-4 rounded-full overflow-hidden bg-white/5 gap-px">
          {program.map((p, i) => (
            <div
              key={p.key}
              className={`alokasi-seg ${warna(p, i)} h-full`}
              style={{ width: `${p.porsiPct}%` }}
              title={`${p.bidang}: ${formatRp(p.alokasi)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {program.map((p, i) => (
            <span key={p.key} className="text-xs text-white/60 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${warna(p, i)}`} />
              {p.bidang} <span className="text-white/35 tabular-nums">{formatPct(p.porsiPct, 0)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {program.map((p, i) => (
          <KartuProgram
            key={p.key}
            p={p}
            i={i}
            terbuka={terbuka === i}
            onToggle={() => setTerbuka(terbuka === i ? null : i)}
            catatanAi={catatanAi[p.bidang]}
            sedangMenyusun={sedangMenyusun}
          />
        ))}
      </div>

      {tidakTercakup.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 space-y-2">
          <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-1.5">
            <CircleAlert className="w-4 h-4" />
            Masalah serius di luar paket ini
          </h3>
          <p className="text-xs text-white/55 leading-relaxed">
            Paket kegiatan mengikuti rekomendasi Podes, sehingga masalah berikut belum tersentuh. Usulkan lewat
            musrenbang, Dana Desa, atau program dinas terkait.
          </p>
          <ul className="space-y-1.5">
            {tidakTercakup.map((t) => (
              <li key={t.id} className="text-sm text-white/75 leading-snug">
                <span className="font-medium">{t.judul}</span>
                <span className="text-white/45"> — {t.saran}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tahapan.length > 0 && (
        <div className="space-y-3 pt-1">
          <h3 className="text-xs uppercase tracking-wide text-white/45 flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5" />
            Tahapan pelaksanaan
          </h3>
          <ol className="grid md:grid-cols-3 gap-3">
            {tahapan.map((t, i) => (
              <li key={t.fase} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-white">
                    {i + 1}. {t.fase}
                  </span>
                  <span className="text-[11px] text-white/40 shrink-0">{t.waktu}</span>
                </div>
                <ul className="space-y-1">
                  {t.kegiatan.map((k) => (
                    <li key={k} className="text-xs text-white/60 leading-snug flex gap-1.5">
                      <span className="text-white/25">–</span>
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
