'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calculator, Printer } from 'lucide-react';
import type { AnalisisResponse } from '@/lib/types';
import { TombolBagikan } from '@/components/TombolBagikan';
import SandboxAnggaran from '@/components/SandboxAnggaran';
import { formatPct } from '@/lib/format';

function AnggaranContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kodeBps = searchParams.get('kode_bps') ?? '';
  const anggaranParam = Number(searchParams.get('anggaran') ?? 0);

  const [data, setData] = useState<AnalisisResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!/^\d{10}$/.test(kodeBps) || !(anggaranParam > 0)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch('/api/analisis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // Halaman ini hanya butuh angka, bukan narasi AI.
      // cepat:true melewati LLM (30 detik -> 0,3 detik).
      body: JSON.stringify({ kode_bps: kodeBps, anggaran: anggaranParam, cepat: true }),
    })
      .then(async (res) => res.json())
      .then((json) => { if (!cancelled) setData(json); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [kodeBps, anggaranParam]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        <p className="text-white/50">Memuat data anggaran…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-lg mx-auto mt-16 glass-card rounded-3xl p-8 text-center">
        <p className="text-white/60">Data tidak tersedia.</p>
        <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium">
          Kembali
        </button>
      </div>
    );
  }

  const { desa, analisis } = data;
  const r = analisis.rincian_biaya;
  const defisit = analisis.estimasi_biaya_ideal - analisis.anggaran;
  const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const setelahMultiplier = r.sebelumPembulatan;
  const selisihPembulatan = r.total - setelahMultiplier;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-3 print-hide">
        <Link
          href={`/hasil?kode_bps=${kodeBps}&anggaran=${anggaranParam}`}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke analisis
        </Link>
        <div className="flex items-center gap-3">
          <TombolBagikan nama={desa.nama_desa} />
          <button
            type="button"
            onClick={() => window.print()}
            className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak
          </button>
        </div>
      </div>

      <header className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold text-white">Gambaran Anggaran</h1>
        </div>
        <p className="text-white/60 text-sm">
          {desa.nama_desa} · Kec. {desa.nama_kecamatan} · Kab. {desa.nama_kabupaten}
        </p>
      </header>

      <div className="glass-card rounded-3xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Komponen Biaya</h3>

        <div className="space-y-2">
          {r.komponen.map((k, i) => (
            <div key={i} className="border-b border-white/5 pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{k.label}</span>
                <span className="text-sm font-medium text-white/80 tabular-nums">{fmt(k.nilai)}</span>
              </div>
              <p className="text-[10px] text-white/30 mt-0.5">{k.dasar}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-sm text-white/50">Subtotal</span>
          <span className="text-sm font-semibold text-white/70 tabular-nums">{fmt(r.subtotal)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-white/30">Multiplier IDM</div>
            <div className="text-lg font-bold text-white">×{r.idmMultiplier.toFixed(1)}</div>
            <p className="text-[10px] text-white/25 mt-0.5">{r.idmLabel}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="text-[10px] uppercase tracking-wide text-white/30">Multiplier Podes</div>
            <div className="text-lg font-bold text-white">×{r.podesMultiplier.toFixed(1)}</div>
            <p className="text-[10px] text-white/25 mt-0.5">{r.podesLabel}</p>
          </div>
        </div>

        {/* Jembatan subtotal -> total, supaya angka tidak terlihat "ajaib" */}
        <div className="space-y-1 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              Setelah multiplier (×{(r.idmMultiplier * r.podesMultiplier).toFixed(2)})
            </span>
            <span className="text-xs text-white/60 tabular-nums">{fmt(setelahMultiplier)}</span>
          </div>
          {r.dibatasiMinMax && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Dibatasi rentang Rp 200 jt–10 M</span>
              <span className="text-xs text-white/60 tabular-nums">disesuaikan</span>
            </div>
          )}
          {selisihPembulatan !== 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Pembulatan ke Rp 50 jt terdekat</span>
              <span className="text-xs text-white/60 tabular-nums">
                {selisihPembulatan > 0 ? '+' : '−'}{fmt(Math.abs(selisihPembulatan)).replace('Rp ', 'Rp ')}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium text-white/70">Kebutuhan ideal</span>
            <span className="text-sm font-bold text-white tabular-nums">{fmt(r.total)}</span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-white">Ringkasan</h3>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-white/60">Kebutuhan ideal</span>
          <span className="text-lg font-bold text-white tabular-nums">{fmt(analisis.estimasi_biaya_ideal)}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-white/60">Anggaran Anda</span>
          <span className="text-lg font-bold text-white tabular-nums">{fmt(analisis.anggaran)}</span>
        </div>
        <div className="flex items-center justify-between py-1 pt-2 border-t border-white/5">
          <span className="text-sm font-medium text-white/70">{defisit > 0 ? 'Defisit' : 'Surplus'}</span>
          <span className={`text-lg font-bold tabular-nums ${defisit > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {fmt(Math.abs(defisit))}
          </span>
        </div>

        <div className="pt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/40">Cakupan anggaran</span>
            <span className="text-white/60 tabular-nums">{formatPct(analisis.coverage_pct)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.max(0, analisis.coverage_pct))}%` }} />
          </div>
        </div>
      </div>

      {/* Sandbox: coba skenario anggaran lain */}
      <div className="glass-card rounded-3xl p-5 md:p-6 print-hide">
        <SandboxAnggaran
          kodeBps={kodeBps}
          anggaranAsli={anggaranParam}
          kebutuhanIdeal={Number(analisis.estimasi_biaya_ideal)}
        />
      </div>

      <p className="text-xs text-white/25 leading-relaxed">
        Perhitungan bersifat estimasi berdasarkan data Podes 2025, IDM 2024, dan Susenas 2025.
        Angka aktual dapat bervariasi tergantung kondisi lapangan. Bukan nasihat investasi.
      </p>
    </main>
  );
}

export default function AnggaranPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-white/40">
          Memuat…
        </div>
      }
    >
      <AnggaranContent />
    </Suspense>
  );
}
