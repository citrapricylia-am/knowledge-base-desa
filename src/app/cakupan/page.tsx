'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Info } from 'lucide-react';
import DataSourceBadge from '@/components/DataSourceBadge';
import type { CakupanStats } from '@/lib/types';
import { formatNumber, formatPct } from '@/lib/format';

/**
 * Halaman transparansi data.
 *
 * Prinsip UI Citra: penjelasan normatif + inline italic, tooltip ⓘ
 * untuk detail teknis, tanpa kode teknis (MODERATE -> "sedang"),
 * tanpa AI slop.
 */

const TIER_INFO: Record<string, string> = {
  HIGH: 'Potensi desa tinggi — infrastruktur dan layanan relatif lengkap',
  MODERATE: 'Potensi sedang — ada layanan dasar tapi masih ada celah',
  LOW: 'Potensi rendah — layanan dasar banyak yang belum tersedia',
  CRITICAL: 'Potensi paling rendah — prioritas intervensi paling kuat',
  NULL: 'Belum punya data skor Podes — analisis kegiatan memakai IDM saja',
};

const STATUS_IDM_INFO: Record<string, string> = {
  MANDIRI: 'Skor 0,81 ke atas — desa sudah berdikari, intervensi cukup pada pemeliharaan',
  MAJU: 'Skor 0,71–0,80 — fondasi kuat, tinggal pilar tertentu yang perlu dikuatkan',
  BERKEMBANG: 'Skor 0,60–0,70 — beberapa pilar tertinggal, perlu program bertahap',
  TERTINGGAL: 'Skor 0,49–0,59 — intervensi menyeluruh pada layanan dasar',
  'SANGAT TERTINGGAL': 'Skor di bawah 0,49 — prioritas tertinggi untuk investasi sosial',
};

export default function CakupanPage() {
  const [stats, setStats] = useState<CakupanStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cakupan')
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.detail || json.error || 'Gagal memuat');
        return json as CakupanStats;
      })
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, []);

  const pctPodes = stats?.total_desa
    ? (stats.dengan_podes2025 / stats.total_desa) * 100
    : 0;
  const pctKoordinat = stats?.total_desa
    ? (stats.dengan_koordinat / stats.total_desa) * 100
    : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-slide-up">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Beranda
      </Link>

      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-emerald-400 text-sm">
          <Database className="w-4 h-4" />
          Transparansi data
        </div>
        <h1 className="text-3xl font-bold text-white">Cakupan dataset</h1>
        <p className="text-slate-400 max-w-2xl">
          Halaman ini menjelaskan data apa saja yang dipakai DesaLens, dari mana
          asalnya, dan seberapa lengkap — supaya setiap hasil analisis bisa
          ditelusuri ke sumbernya.
        </p>
      </header>

      {loading && (
        <div className="py-16 text-center text-slate-400">Memuat statistik…</div>
      )}

      {error && (
        <div className="glass-card rounded-xl p-6 text-rose-300 text-sm space-y-2">
          <p>{error}</p>
          <p className="text-slate-500">
            Pastikan database terhubung dan data sudah diimpor.
          </p>
        </div>
      )}

      {stats && (
        <>
          {/* === SUMBER DATA === */}
          <section className="glass-card rounded-2xl p-5 md:p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">
              Tiga sumber data resmi
            </h2>
            <div className="space-y-4">
              <SumberItem
                judul="Podes 2025 — Sensus Potensi Desa"
                lembaga="BPS Indonesia"
                isi="Data wilayah dan fasilitas tiap desa: luas wilayah, keberadaan sekolah dan fasilitas kesehatan, titik koordinat, hutan alam, hingga lahan kritis. Ini tulang punggung analisis kegiatan — tanpa skor Podes, rekomendasi kegiatan tidak bisa dipetakan."
                cakupan={`${formatNumber(stats.dengan_podes2025)} desa (${formatPct(pctPodes)})`}
              />
              <SumberItem
                judul="IDM 2024 — Indeks Desa Membangun"
                lembaga="Kemendesa PDT & Transmigrasi"
                isi="Skor ketahanan desa pada tiga pilar: sosial, ekonomi, dan lingkungan. Menentukan prioritas intervensi — pilar terendah jadi fokus rekomendasi. Lengkap untuk semua desa di sistem."
                cakupan={`${formatNumber(stats.dengan_status_idm)} desa (100%)`}
              />
              <SumberItem
                judul="Susenas 2025 — Survei Sosial Ekonomi Nasional"
                lembaga="BPS Indonesia"
                isi="Kondisi rumah tangga: ketahanan pangan, perumahan, air minum, sanitasi, pendidikan. Dikonsumsi oleh analisis AI untuk memperkaya narasi. Karena Sampel Susenas bersifat kabupaten, angkanya mewakili kabupaten — bukan desa spesifik — dan selalu ditandai demikian di halaman hasil."
                cakupan="514 kabupaten/kota · 343.460 rumah tangga · 1,17 juta individu"
              />
            </div>
          </section>

          {/* === KELENGKAPAN === */}
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold text-white">
                Kelengkapan per jenis data
              </h2>
            </div>
            <p className="text-sm text-slate-400 italic">
              Tidak semua desa punya data lengkap — bar di bawah menunjukkan
              seberapa banyak yang punya. Kolom kosong di halaman hasil berarti
              data memang belum tersedia untuk desa itu, bukan kesalahan sistem.
            </p>
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <KelengkapanBar
                label="Data IDM (status + skor)"
                punya={stats.dengan_status_idm}
                total={stats.total_desa}
                keterangan="Lengkap — setiap desa yang bisa dicari selalu punya status IDM."
              />
              <KelengkapanBar
                label="Skor Podes 2025 (untuk rekomendasi kegiatan)"
                punya={stats.dengan_podes}
                total={stats.total_desa}
                keterangan="Desa tanpa skor Podes hanya dianalisis lewat profil IDM — rekomendasi kegiatan spesifik tidak bisa dipetakan."
              />
              <KelengkapanBar
                label="Data wilayah Podes 2025 (luas, fasilitas, koordinat)"
                punya={stats.dengan_podes2025}
                total={stats.total_desa}
                keterangan="Mencakup luas wilayah, hutan, lahan kritis, dan titik koordinat."
              />
              <KelengkapanBar
                label="Titik koordinat (peta lokasi)"
                punya={stats.dengan_koordinat}
                total={stats.total_desa}
                keterangan={`${formatPct(100 - pctKoordinat)} desa belum memiliki koordinat tercatat.`}
              />
              <KelengkapanBar
                label="Data hutan alam 2024"
                punya={stats.dengan_hutan}
                total={stats.total_desa}
                keterangan="Data hutan penting untuk analisis pilar lingkungan di desa kawasan hutan."
              />
              <KelengkapanBar
                label="Data lahan kritis"
                punya={stats.dengan_lahan_kritis}
                total={stats.total_desa}
                keterangan="Lahan kritis luas menaikkan urgensi rekomendasi pemulihan lingkungan."
              />
            </div>
          </section>

          {/* === DISTRIBUSI === */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">
              Sebaran desa di sistem
            </h2>
            <p className="text-sm text-slate-400 italic">
              Distribusi ini menunjukkan profil seluruh desa yang bisa
              dianalisis. Tekan ⓘ untuk penjelasan tiap kategori.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <DistTable
                title="Per status IDM (kondisi desa)"
                rows={stats.per_status_idm.map((r) => ({
                  label: r.status,
                  count: r.count,
                  info: STATUS_IDM_INFO[r.status],
                }))}
                total={stats.total_desa}
              />
              <DistTable
                title="Per potensi Podes (skor layanan)"
                rows={stats.per_klasifikasi.map((r) => ({
                  label:
                    r.klasifikasi === 'NULL'
                      ? 'Tanpa skor Podes'
                      : r.klasifikasi,
                  count: r.count,
                  info: TIER_INFO[r.klasifikasi] ?? '',
                }))}
                total={stats.total_desa}
              />
            </div>
          </section>

          {/* === PROVINSI === */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-white">
              15 provinsi dengan desa terbanyak
            </h2>
            <p className="text-sm text-slate-400 italic">
              Jumlah desa mempengaruhi statistik nasional — Jawa Tengah dan
              Jawa Timur bersama mencakup lebih dari seperenam desa di
              Indonesia.
            </p>
            <div className="glass-card rounded-2xl p-5">
              <div className="space-y-2">
                {stats.per_provinsi_top.map((r) => {
                  const pct = stats.total_desa
                    ? (r.count / stats.total_desa) * 100
                    : 0;
                  return (
                    <div key={r.nama_provinsi} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{r.nama_provinsi}</span>
                        <span className="text-slate-400 tabular-nums">
                          {formatNumber(r.count)}
                          <span className="text-slate-600 ml-2">
                            {formatPct(pct)}
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/70 rounded-full"
                          style={{ width: `${Math.min(100, pct * 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* === METODOLOGI === */}
          <section className="glass-card rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">
                Cara membaca angka-angka ini
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-300 leading-relaxed list-disc pl-5">
              <li>
                Semua data bersifat <strong>survei statis</strong> hasil sensus
                dan survei resmi (Podes 2025, IDM 2024, Susenas 2025) — bukan
                kondisi real-time. Kondisi desa bisa berubah setelah data
                dikumpulkan.
              </li>
              <li>
                Data Susenas adalah <strong>agregasi tingkat kabupaten</strong>.
                Ketika halaman hasil menampilkan angka Susenas, yang diwakili
                adalah kondisi rumah tangga di kabupaten sekitar desa tersebut,
                bukan desa itu sendiri.
              </li>
              <li>
                Podes mencatat keberadaan fasilitas <strong>di wilayah desa</strong>{' '}
                — warga bisa saja menjangkau sekolah atau klinik di desa tetangga
                yang lebih dekat dari fasilitas di desanya sendiri.
              </li>
              <li>
                Klasifikasi potensi Podes dihitung dari skor layanan dan
                infrastruktur. Lengkapnya tabel 874.798 baris data fasilitas
                per kecamatan (7.245 kecamatan) menjadi dasar rekomendasi
                kegiatan.
              </li>
              <li>
                Estimasi kebutuhan biaya bersifat <strong>indikatif</strong>{' '}
                — dihitung dari formula demografi, fasilitas, dan multipler
                IDM. Bukan penawaran harga riil; rinciannya bisa dilihat di
                halaman Detail Anggaran pada tiap hasil.
              </li>
            </ul>
          </section>
        </>
      )}

      <DataSourceBadge className="pt-4" />
    </main>
  );
}

function SumberItem({
  judul,
  lembaga,
  isi,
  cakupan,
}: {
  judul: string;
  lembaga: string;
  isi: string;
  cakupan: string;
}) {
  return (
    <div className="border-b border-slate-800/60 pb-4 last:border-0 last:pb-0 space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-white">{judul}</span>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">
          {lembaga}
        </span>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{isi}</p>
      <p className="text-xs text-emerald-400/80">Cakupan: {cakupan}</p>
    </div>
  );
}

function KelengkapanBar({
  label,
  punya,
  total,
  keterangan,
}: {
  label: string;
  punya: number;
  total: number;
  keterangan: string;
}) {
  const pct = total ? (punya / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm text-slate-400 tabular-nums shrink-0">
          {formatNumber(punya)}
          <span className="text-slate-600">
            {' '}
            / {formatNumber(total)} ({formatPct(pct)})
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-500/80' : pct >= 60 ? 'bg-amber-500/70' : 'bg-rose-500/70'}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 italic">{keterangan}</p>
    </div>
  );
}

function DistTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number; info?: string }[];
  total: number;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.label}
            className="border-b border-slate-800/60 pb-2 last:border-0 last:pb-0"
          >
            <div className="flex justify-between text-sm">
              <span className="text-slate-300 flex items-center gap-1.5">
                {r.label}
                {r.info && <InfoHint text={r.info} />}
              </span>
              <span className="text-slate-400 tabular-nums">
                {formatNumber(r.count)}
                {total > 0 && (
                  <span className="text-slate-600 ml-2">
                    ({formatPct((r.count / total) * 100)})
                  </span>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex items-center cursor-help">
      <Info className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 rounded-lg border border-white/10 bg-[#2a3140] p-2.5 text-xs text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 leading-relaxed"
        style={{
          boxShadow: '0 12px 32px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)',
        }}
      >
        {text}
      </span>
    </span>
  );
}
