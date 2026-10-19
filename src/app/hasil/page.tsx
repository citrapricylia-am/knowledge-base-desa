'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Calculator, Printer, Database, Info } from 'lucide-react';
import ProfilDesaPanel from '@/components/ProfilDesaPanel';
import NarasiPanel from '@/components/NarasiPanel';
import TanyaAnalisis from '@/components/TanyaAnalisis';
import RingkasanEksekutif from '@/components/RingkasanEksekutif';
import PosisiIdmPanel from '@/components/PosisiIdmPanel';
import TemuanPanel from '@/components/TemuanPanel';
import RencanaAksiPanel from '@/components/RencanaAksiPanel';
import { TombolBagikan } from '@/components/TombolBagikan';
import type { AnalisisResponse, NarasiItem } from '@/lib/types';
import { formatPct, formatRp, podesColor, podesLabel, statusIdmColor, tierColor, tierLabel, tierDesc } from '@/lib/format';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Pasangkan rekomendasi AI ke kartu program. Judul AI seharusnya = bidang;
 * kalau AI menulis nama kegiatan, tetap dicocokkan ke bidang pemiliknya.
 * Yang tidak cocok dikembalikan supaya tetap tampil di panel narasi.
 */
function pasangkanCatatanAi(
  analisis: AnalisisResponse['analisis'],
): { perBidang: Record<string, NarasiItem>; lain: NarasiItem[] } {
  const perBidang: Record<string, NarasiItem> = {};
  const lain: NarasiItem[] = [];
  for (const item of analisis.narasi.rekomendasi) {
    const j = norm(item.judul);
    const program = analisis.diagnosis.program.find(
      (p) => norm(p.bidang) === j || p.kegiatan.some((k) => norm(k) === j),
    );
    if (program && !perBidang[program.bidang]) perBidang[program.bidang] = item;
    else lain.push(item);
  }
  return { perBidang, lain };
}

const NAV = [
  { href: '#ringkasan', label: 'Ringkasan' },
  { href: '#posisi-idm', label: 'Posisi IDM' },
  { href: '#temuan', label: 'Temuan' },
  { href: '#rencana', label: 'Rencana aksi' },
  { href: '#narasi', label: 'Narasi' },
  { href: '#data', label: 'Data desa' },
];

function HasilContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kodeBps = searchParams.get('kode_bps') ?? '';
  const anggaranParam = Number(searchParams.get('anggaran') ?? 0);

  const [data, setData] = useState<AnalisisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paramsReady, setParamsReady] = useState(false);
  const [narasiLoading, setNarasiLoading] = useState(false);
  const [narasiError, setNarasiError] = useState(false);

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

    // TAHAP 1 (cepat, ~1 detik): angka, kegiatan, rincian biaya.
    // Halaman langsung tampil — tidak menunggu LLM 20-35 detik.
    fetch('/api/analisis', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kode_bps: kodeBps, anggaran: anggaranParam, cepat: true }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Gagal menganalisis');
        return json as AnalisisResponse;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);

        // TAHAP 2 (lambat, di belakang layar): narasi AI.
        // Kalau cache sudah ada, tahap 1 sudah membawa narasinya —
        // tidak perlu panggil lagi.
        if (json.analisis.sumber_narasi !== 'pending') return;

        setNarasiLoading(true);
        fetch('/api/narasi', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kode_bps: kodeBps, anggaran: anggaranParam }),
        })
          .then(async (res) => {
            const nj = await res.json();
            if (!res.ok) throw new Error(nj.error || 'Gagal menyusun narasi');
            return nj as { narasi: AnalisisResponse['analisis']['narasi']; sumber_narasi: AnalisisResponse['analisis']['sumber_narasi'] };
          })
          .then((nj) => {
            if (cancelled) return;
            setData((prev) =>
              prev
                ? { ...prev, analisis: { ...prev.analisis, narasi: nj.narasi, sumber_narasi: nj.sumber_narasi } }
                : prev,
            );
          })
          .catch(() => {
            // Narasi gagal bukan alasan menghapus angka yang sudah tampil.
            if (!cancelled) setNarasiError(true);
          })
          .finally(() => { if (!cancelled) setNarasiLoading(false); });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal menganalisis');
          setLoading(false);
        }
      });

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
  const { diagnosis } = analisis;
  const { perBidang, lain } = pasangkanCatatanAi(analisis);
  const nav = NAV.filter((n) =>
    (n.href !== '#posisi-idm' || diagnosis.posisiIdm) && (n.href !== '#rencana' || diagnosis.program.length),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-slide-up">
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
      <header className="glass-card rounded-3xl p-6 space-y-4 print-header">
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
          </div>
        </div>

        {/* Cakupan anggaran */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-white/45">Cakupan anggaran</h3>
              <p className="text-lg font-semibold text-white mt-1">
                {formatRp(analisis.anggaran)}
                <span className="text-white/50 font-normal text-sm">
                  {' '}= {formatPct(analisis.coverage_pct)} dari kebutuhan ideal{' '}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/50 leading-relaxed max-w-2xl">{tierDesc(analisis.tier)}</p>
            <Link
              href={`/hasil/anggaran?kode_bps=${desa.kode_bps}&anggaran=${analisis.anggaran}`}
              className="print-hide inline-flex items-center gap-1.5 text-xs text-amber-300/90 hover:text-amber-200 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              Rincian perhitungan & simulasi anggaran →
            </Link>
          </div>
        </div>
      </header>

      {/* Navigasi bagian */}
      <nav
        aria-label="Bagian laporan"
        className="print-hide sticky top-2 z-30 glass-card rounded-2xl px-2 py-1.5 flex gap-1 overflow-x-auto"
      >
        {nav.map((n) => (
          <a
            key={n.href}
            href={n.href}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            {n.label}
          </a>
        ))}
      </nav>

      <RingkasanEksekutif analisis={analisis} />

      {diagnosis.posisiIdm && <PosisiIdmPanel posisi={diagnosis.posisiIdm} />}

      <TemuanPanel temuan={diagnosis.temuan} />

      {diagnosis.program.length > 0 ? (
        <RencanaAksiPanel
          program={diagnosis.program}
          tahapan={diagnosis.tahapan}
          anggaran={analisis.anggaran}
          catatanAi={perBidang}
          sedangMenyusun={narasiLoading}
        />
      ) : (
        <div className="glass-card rounded-3xl p-5 flex gap-3 border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-white">Paket kegiatan belum dapat dipetakan</h2>
            <p className="text-sm text-white/60 leading-relaxed">
              Skor Podes untuk desa ini tidak tersedia, jadi sistem tidak menyusun alokasi per program.
              Gunakan temuan di atas sebagai arah prioritas awal dan validasi kebutuhan bersama aparat desa.
            </p>
          </div>
        </div>
      )}

      {/* Narasi AI */}
      <section id="narasi" className="glass-card rounded-3xl p-5 md:p-6 scroll-mt-24">
        <NarasiPanel
          narasi={analisis.narasi}
          sumber={analisis.sumber_narasi}
          rekomendasiLain={lain}
          sedangMenyusun={narasiLoading}
          gagalMenyusun={narasiError}
        />
      </section>

      {/* Data pendukung */}
      <section id="data" className="glass-card rounded-3xl p-5 md:p-6 space-y-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-white/50" />
          <h2 className="text-base font-semibold text-white">Data pendukung desa</h2>
        </div>
        <ProfilDesaPanel kodeBps={desa.kode_bps} desa={desa} />
      </section>

      {/* Tanya AI tentang analisis ini */}
      <div className="glass-card rounded-3xl p-5 md:p-6 print-hide">
        <TanyaAnalisis
          kodeBps={kodeBps}
          anggaran={anggaranParam}
          namaDesa={desa.nama_desa}
          nonaktif={narasiLoading}
        />
      </div>

      {/* Catatan data & metodologi */}
      <footer className="glass-card rounded-3xl p-5 space-y-2.5">
        <h2 className="text-xs uppercase tracking-wide text-white/45 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Catatan data & metodologi
        </h2>
        <ul className="space-y-1.5">
          {diagnosis.catatanData.map((c) => (
            <li key={c} className="text-xs text-white/45 leading-relaxed flex gap-2">
              <span className="text-white/25">•</span>
              <span>{c}</span>
            </li>
          ))}
          <li className="text-xs text-white/45 leading-relaxed flex gap-2">
            <span className="text-white/25">•</span>
            <span>
              Prioritas & alokasi dihitung otomatis dari data ({analisis.tahun_data}); narasi AI hanya menjelaskan,
              tidak menentukan kegiatan. Bukan nasihat investasi — untuk penyaringan awal dan perencanaan indikatif.
            </span>
          </li>
        </ul>
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
