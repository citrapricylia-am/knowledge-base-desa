'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, XCircle } from 'lucide-react';
import SmoothVideo from '@/components/SmoothVideo';

export default function Home() {
  const router = useRouter();
  const [sudahMasuk, setSudahMasuk] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateLoading, setGateLoading] = useState(false);

  useEffect(() => {
    fetch('/api/gate')
      .then((r) => setSudahMasuk(r.ok))
      .catch(() => setSudahMasuk(false));
  }, []);

  // Kalau sudah punya sesi valid, langsung lempar ke halaman analisis
  useEffect(() => {
    if (sudahMasuk === true) {
      router.push('/analisis');
    }
  }, [sudahMasuk, router]);

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
        // Login berhasil — pindah ke halaman analisis
        router.push('/analisis');
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

            {/* Gerbang email + Aero Hero pill button */}
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
                  disabled={gateLoading}
                  className="glass-input w-full sm:w-80 rounded-full px-5 py-3.5 text-sm text-white placeholder:text-white/30 outline-none"
                />
                <button
                  type="submit"
                  disabled={gateLoading}
                  className="group aero-pill flex cursor-pointer items-center justify-center gap-0 rounded-full border-none bg-transparent px-0 py-5 font-normal shadow-none hover:bg-transparent disabled:cursor-not-allowed"
                >
                  <span
                    className={`aero-pill-bg rounded-full px-7 py-3.5 text-base font-medium ${
                      gateLoading ? 'opacity-50' : ''
                    }`}
                  >
                    {gateLoading ? 'Memeriksa…' : 'Mulai Analisis'}
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
    </>
  );
}
