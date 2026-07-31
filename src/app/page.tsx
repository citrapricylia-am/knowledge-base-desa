'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';
import SearchDesa from '@/components/SearchDesa';
import AnggaranInput from '@/components/AnggaranInput';
import DataSourceBadge from '@/components/DataSourceBadge';
import type { DesaSearchResult } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [selectedDesa, setSelectedDesa] = useState<DesaSearchResult | null>(null);
  const [anggaran, setAnggaran] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedDesa) {
      setError('Pilih desa dari hasil pencarian.');
      return;
    }
    if (anggaran <= 0) {
      setError('Masukkan anggaran lebih dari 0.');
      return;
    }
    setIsSubmitting(true);
    router.push(
      `/hasil?kode_bps=${selectedDesa.kode_bps}&anggaran=${anggaran}`,
    );
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-3xl z-10 animate-slide-up">
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <Database className="w-4 h-4" />
            <span>Podes 2025 + IDM 2024</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Knowledge Base{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 text-glow">
              Potensi Desa
            </span>
          </h1>
          <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Penyaringan investasi sosial berbasis data resmi — pilih desa, masukkan
            anggaran, dapatkan rekomendasi kegiatan yang deterministik dan narasi
            yang dapat diaudit.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10 text-slate-300 text-sm">
          <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/60">
            <Database className="w-4 h-4 text-sky-400" />
            <span className="font-medium">83.379 desa</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/60">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-medium">38 provinsi</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800/60">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-medium">Matriks + LLM format</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">
                Pilih desa / kelurahan
              </label>
              <SearchDesa onSelect={setSelectedDesa} selected={selectedDesa} />
              {selectedDesa && (
                <p className="text-xs text-emerald-400/90 ml-1">
                  Terpilih: {selectedDesa.nama_desa} · BPS {selectedDesa.kode_bps}
                  {' · '}
                  <Link
                    href={`/desa/${selectedDesa.kode_bps}`}
                    className="underline underline-offset-2 hover:text-emerald-300"
                  >
                    lihat profil
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">
                Rencana anggaran intervensi
              </label>
              <AnggaranInput value={anggaran} onChange={setAnggaran} />
            </div>

            {error && (
              <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!selectedDesa || anggaran <= 0 || isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
                !selectedDesa || anggaran <= 0 || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-[0_0_24px_rgba(16,185,129,0.35)] hover:scale-[1.01]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Membuka analisis…
                </>
              ) : (
                <>
                  Analisis potensi
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <DataSourceBadge />
        </div>
      </div>
    </main>
  );
}
