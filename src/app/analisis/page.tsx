'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, LogOut } from 'lucide-react';
import SearchDesa from '@/components/SearchDesa';
import AnggaranInput from '@/components/AnggaranInput';
import type { DesaSearchResult } from '@/lib/types';

export default function AnalisisPage() {
  const router = useRouter();
  const [selectedDesa, setSelectedDesa] = useState<DesaSearchResult | null>(null);
  const [anggaran, setAnggaran] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cekSesi, setCekSesi] = useState(true);

  // Pastikan user sudah login — kalau tidak, lempar ke beranda
  useEffect(() => {
    fetch('/api/gate')
      .then((r) => {
        if (!r.ok) router.push('/?gate=perlu-login');
        else setCekSesi(false);
      })
      .catch(() => router.push('/?gate=perlu-login'));
  }, [router]);

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

  if (cekSesi) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white animate-spin" />
        <p className="text-white/40 text-sm">Memeriksa sesi login…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 print-hide">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Beranda
        </Link>
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/gate', { method: 'DELETE' });
            router.push('/');
          }}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar
        </button>
      </div>

      {/* Judul + deskripsi */}
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Pilih desa & masukkan anggaran
        </h1>
        <p className="text-white/50 text-base leading-relaxed">
          Cari desa atau kelurahan, tentukan anggaran intervensi, lalu
          jalankan analisis. Sistem akan menyatukan data Podes, IDM, dan
          Susenas lalu menyusun rekomendasi dengan AI.
        </p>
      </header>

      {/* Form */}
      <div className="glass-card rounded-3xl p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">
              Pilih desa / kelurahan
            </label>
            <SearchDesa onSelect={setSelectedDesa} selected={selectedDesa} />
            {selectedDesa && (
              <p className="text-xs text-white/40 ml-1">
                Terpilih: {selectedDesa.nama_desa} · BPS {selectedDesa.kode_bps}
                {' · '}
                <Link
                  href={`/desa/${selectedDesa.kode_bps}`}
                  className="underline underline-offset-2 hover:text-white"
                >
                  lihat profil
                </Link>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">
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
            className={`w-full py-4 rounded-xl font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2 ${
              !selectedDesa || anggaran <= 0 || isSubmitting
                ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                : 'bg-white text-black hover:bg-white/90 hover:scale-[1.01] shadow-lg'
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

      <p className="text-center text-xs text-white/30 leading-relaxed">
        Sumber: Podes 2025 · IDM 2024 · BPS Indonesia. Bukan nasihat investasi —
        untuk penyaringan awal dan perencanaan indikatif.
      </p>
    </main>
  );
}
