'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, XCircle } from 'lucide-react';
import SearchDesa from '@/components/SearchDesa';
import AnggaranInput from '@/components/AnggaranInput';
import SmoothVideo from '@/components/SmoothVideo';
import type { DesaSearchResult } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [selectedDesa, setSelectedDesa] = useState<DesaSearchResult | null>(null);
  const [anggaran, setAnggaran] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // === Gerbang email @madaniberkelanjutan.id ===
  const [sudahMasuk, setSudahMasuk] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(false);

  useEffect(() => {
    fetch('/api/gate')
      .then((r) => setSudahMasuk(r.ok))
      .catch(() => setSudahMasuk(false));
  }, []);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setGateError(null);
    if (!email.trim()) {
      setGateError('Masukkan email Anda dulu.');
      return;
    }
    setGateLoading(true);
    try {
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSudahMasuk(true);
        setEmail('');
      } else {
        const j = await res.json().catch(() => ({}));
        setGateError(j.detail ?? j.error ?? 'Email ditolak');
      }
    } catch {
      setGateError('Koneksi bermasalah — coba lagi.');
    } finally {
      setGateLoading(false);
    }
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
    <>
      {/* ===== CINEMA HERO — full-bleed video + overlay ===== */}
      <section className="relative min-h-screen w-full overflow-hidden bg-neutral-900">
        {/* Video background — slow motion (0.5x) with smooth loop.
            URL dari env supaya file 9.8MB tidak perlu masuk git.
            Kalau NEXT_PUBLIC_HERO_VIDEO_URL kosong, SmoothVideo
            otomatis pakai poster saja (tetap tampil, tanpa video). */}
        <SmoothVideo
          src={process.env.NEXT_PUBLIC_HERO_VIDEO_URL ?? ''}
          poster={process.env.NEXT_PUBLIC_HERO_POSTER_URL ?? '/hero-poster.jpg'}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Gradient overlay — dark at bottom, transparent at top */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-neutral-950/20" />

        {/* Content centered */}
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="max-w-3xl space-y-8 animate-slide-up">
            <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl leading-[1.1]">
              Knowledge Base
              <br />
              <span className="text-white/60">Potensi Desa</span>
            </h1>

            <p className="mx-auto max-w-xl text-base text-white/70 md:text-lg lg:text-xl leading-relaxed font-light">
              Penyaringan investasi sosial berbasis data resmi untuk 83.379
              desa di 38 provinsi. Pilih desa, masukkan anggaran, dapatkan
              rekomendasi yang dapat diaudit.
            </p>

            {/* Stats — clean horizontal row */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-white/80">
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-white">83.379</span>
                <span className="text-xs uppercase tracking-wide text-white/50">Desa</span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-white">38</span>
                <span className="text-xs uppercase tracking-wide text-white/50">Provinsi</span>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-white">Podes 2025</span>
                <span className="text-xs uppercase tracking-wide text-white/50">Data resmi</span>
              </div>
            </div>

            {/* Gerbang + Aero Hero pill button */}
            <div className="space-y-4">
              <form
                onSubmit={masuk}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (gateError) setGateError(null);
                  }}
                  placeholder="email@madaniberkelanjutan.id"
                  aria-label="Email untuk akses analisis"
                  disabled={sudahMasuk === true}
                  className="glass-input w-full sm:w-80 rounded-full px-5 py-3.5 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={gateLoading || sudahMasuk === true}
                  className="group aero-pill flex cursor-pointer items-center justify-center gap-0 rounded-full border-none bg-transparent px-0 py-5 font-normal shadow-none hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <span
                    className={`aero-pill-bg rounded-full px-7 py-3.5 text-base font-medium ${
                      gateLoading || sudahMasuk === true ? 'opacity-50' : ''
                    }`}
                  >
                    {gateLoading ? 'Memeriksa…' : sudahMasuk === true ? 'Sudah masuk' : 'Mulai Analisis'}
                  </span>
                  <div className="aero-pill-bg relative flex h-fit cursor-pointer items-center overflow-hidden rounded-full p-5">
                    <ArrowUpRight className="arrow-slide-in absolute h-5 w-5" />
                    <ArrowUpRight className="arrow-slide-out absolute h-5 w-5" />
                  </div>
                </button>
              </form>

              {/* Alert email ditolak */}
              {gateError && (
                <div
                  role="alert"
                  className="mx-auto flex max-w-md items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-left animate-fade-in"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <div>
                    <p className="text-sm font-medium text-rose-300">Email ditolak</p>
                    <p className="text-xs text-rose-300/70 leading-relaxed mt-0.5">
                      {gateError}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
          <div className="flex flex-col items-center gap-1 text-white/40">
            <span className="text-xs">Scroll</span>
            <div className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* ===== FORM SECTION ===== */}
      <section ref={formRef} className="py-20 md:py-28">
        <div className="mx-auto max-w-2xl px-4">
          <div className="mb-10 space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Pilih desa & masukkan anggaran
            </h2>
            <p className="text-white/50 text-base">
              Cari desa/kelurahan, tentukan anggaran intervensi, lalu jalankan analisis.
            </p>
          </div>

          {sudahMasuk === null ? (
            <div className="glass-card rounded-3xl p-8 text-center text-white/40">
              Memeriksa sesi login…
            </div>
          ) : sudahMasuk === false ? (
            <div className="glass-card rounded-3xl p-8 space-y-3 text-center">
              <p className="text-white/70 font-medium">
                Form analisis hanya untuk anggota Madani Berkelanjutan
              </p>
              <p className="text-white/40 text-sm">
                Masukkan email @madaniberkelanjutan.id di kolom paling atas
                untuk membuka akses.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-sm text-white/60 underline underline-offset-4 hover:text-white transition-colors"
              >
                Kembali ke form login
              </button>
            </div>
          ) : (
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
          )}

          <p className="mt-6 text-center text-xs text-white/30 leading-relaxed">
            Sumber: Podes 2025 · IDM 2024 · BPS Indonesia. Bukan nasihat investasi — untuk penyaringan awal dan perencanaan indikatif.
          </p>
        </div>
      </section>
    </>
  );
}
