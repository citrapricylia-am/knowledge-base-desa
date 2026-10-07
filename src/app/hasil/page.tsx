'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Calculator, Printer } from 'lucide-react';
import ProfilDesaPanel from '@/components/ProfilDesaPanel';
import NarasiPanel from '@/components/NarasiPanel';
import { TombolBagikan } from '@/components/TombolBagikan';
import type { AnalisisResponse } from '@/lib/types';
import { formatPct, formatRp, podesColor, podesLabel, statusIdmColor, tierColor, tierLabel, tierDesc } from '@/lib/format';

function HasilContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kodeBps = searchParams.get('kode_bps') ?? '';
  const anggaranParam = Number(searchParams.get('anggaran') ?? 0);

  const [data, setData] = useState<AnalisisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paramsReady, setParamsReady] = useState(false);

  // Tunggu satu siklus render supaya useSearchParams siap
  // (return kosong di render pertama — bug Next 16 + Suspense)
  useEffect(() => {
    setParamsReady(true);
  }, []);

  useEffect(() => {
    if (!paramsReady) return;

    if (!kodeBps || !/^\d{10}$/.test(kodeBps) || !(anggaranParam > 0)) {
      setError('Parameter tidak valid. Silakan ulangi dari halaman analisis.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/analisis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kode_bps: kodeBps, anggaran: anggaranParam }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal menganalisis');
        return json as AnalisisResponse;
      })
      .then((json) => { if (!cancelled) setData(json); })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal menganalisis');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [paramsReady, kodeBps, anggaranParam]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          <p className="text-white/50">Sedang menganalisis data desa…</p>
          <p className="text-xs text-white/30">Mengumpulkan data Podes, Susenas, dan menyusun rekomendasi</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto mt-16 glass-card rounded-3xl p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-white/80">{error ?? 'Data tidak tersedia'}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Kembali ke beranda
        </button>
      </div>
    );
  }

  const { desa, analisis } = data;
  const coverageWidth = Math.min(100, Math.max(0, analisis.coverage_pct));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 print-hide">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Analisis baru
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

      {/* Nama desa + badges */}
      <header className="glass-card rounded-3xl p-6 space-y-3 print-header">
        <div className="print-only" style={{ display: 'none' }}>
          <h1 style={{ fontSize: '20pt', fontWeight: 'bold', marginBottom: '4px' }}>
            Laporan Analisis Desa — DesaLens
          </h1>
          <p style={{ fontSize: '11pt', color: '#5a5a5a', marginBottom: '16px' }}>
            Dicetak pada {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">{desa.nama_desa}</h1>
            <p className="text-white/60 mt-1">
              Kec. {desa.nama_kecamatan}
              <span className="text-white/30"> · </span>
              Kab. {desa.nama_kabupaten}
              <span className="text-white/30"> · </span>
              {desa.nama_provinsi}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {desa.status_idm_computed && (
              <span className={`px-2.5 py-1 rounded-md border text-xs font-medium ${statusIdmColor(desa.status_idm_computed)}`}>
                {desa.status_idm_computed}
              </span>
            )}
            {desa.klasifikasi_podes && (
              <span className={`px-2.5 py-1 rounded-md border text-xs font-medium ${podesColor(desa.klasifikasi_podes)}`}>
                {podesLabel(desa.klasifikasi_podes)}
              </span>
            )}
            <span className={`px-2.5 py-1 rounded-md border text-xs font-medium ${tierColor(analisis.tier)}`}>
              {tierLabel(analisis.tier)}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-white/30 italic mt-2">
          {tierDesc(analisis.tier)}
        </p>
      </header>

      {/* Cakupan anggaran */}
      <div className="glass-card rounded-3xl p-5 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-white/60">Cakupan anggaran</h3>
            <p className="text-lg font-semibold text-white mt-1">
              {formatRp(analisis.anggaran)}
              <span className="text-white/50 font-normal text-sm">
                {' '}= {formatPct(analisis.coverage_pct)} dari kebutuhan{' '}
                {formatRp(analisis.estimasi_biaya_ideal)}
              </span>
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-md border text-xs ${tierColor(analisis.tier)}`}>
            {tierLabel(analisis.tier)}
          </span>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${coverageWidth}%` }}
          />
        </div>
      </div>

      {/* Tombol detail anggaran */}
      <Link
        href={`/hasil/anggaran?kode_bps=${desa.kode_bps}&anggaran=${analisis.anggaran}`}
        className="glass-card print-hide rounded-2xl p-4 flex items-center justify-between hover:border-white/15 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Calculator className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-sm font-semibold text-white">Detail Anggaran</div>
            <div className="text-xs text-white/40">Lihat breakdown perhitungan kebutuhan ideal</div>
          </div>
        </div>
        <span className="text-sm text-white/40">→</span>
      </Link>

      {/* Profil desa — semua data menyatu */}
      <div className="glass-card rounded-3xl p-5 md:p-6">
        <ProfilDesaPanel kodeBps={desa.kode_bps} desa={desa} />
      </div>

      {/* Narasi + rekomendasi */}
      <div className="glass-card rounded-3xl p-5 md:p-6">
        <NarasiPanel
          narasi={analisis.narasi}
          sumber={analisis.sumber_narasi}
          kegiatan={analisis.kegiatan}
          analisis={analisis}
          idm={desa.idm ?? null}
          iks={desa.iks ?? null}
          ike={desa.ike ?? null}
          ikl={desa.ikl ?? null}
        />
      </div>

      {/* Disclaimer */}
      <footer className="pt-2 pb-8">
        <p className="text-xs text-white/25 leading-relaxed">
          Estimasi kebutuhan dihitung dari data demografi, fasilitas, IDM, dan akses dasar.
          Bukan nasihat investasi — untuk penyaringan awal dan perencanaan indikatif.
        </p>
      </footer>
    </main>
  );
}

export default function HasilPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-white/40">
          Memuat…
        </div>
      }
    >
      <HasilContent />
    </Suspense>
  );
}
