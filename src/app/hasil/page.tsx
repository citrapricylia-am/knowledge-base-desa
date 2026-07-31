'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  Home,
  Map,
  Hospital,
  School,
  AlertTriangle,
} from 'lucide-react';
import ProfilIDM from '@/components/ProfilIDM';
import NarasiPanel from '@/components/NarasiPanel';
import DataSourceBadge from '@/components/DataSourceBadge';
import type { AnalisisResponse } from '@/lib/types';
import {
  formatNumber,
  formatPct,
  formatRp,
  podesColor,
  statusIdmColor,
  tierColor,
} from '@/lib/format';

function HasilContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const kodeBps = searchParams.get('kode_bps') ?? '';
  const anggaranParam = Number(searchParams.get('anggaran') ?? 0);

  const [data, setData] = useState<AnalisisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/^\d{10}$/.test(kodeBps) || !(anggaranParam > 0)) {
      setError('Parameter tidak valid. Kembali ke beranda dan isi form.');
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
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Gagal menganalisis');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [kodeBps, anggaranParam]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <p>Menyusun analisis anggaran…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto mt-16 glass-card rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <p className="text-slate-200">{error ?? 'Data tidak tersedia'}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
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
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Analisis baru
        </Link>
        <Link
          href={`/desa/${desa.kode_bps}`}
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          Profil lengkap →
        </Link>
      </div>

      {/* 1. Header desa */}
      <header className="glass-card rounded-2xl p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {desa.nama_desa}
            </h1>
            <p className="text-slate-400 mt-1">
              Kec. {desa.nama_kecamatan}
              <span className="text-slate-600"> · </span>
              Kab. {desa.nama_kabupaten}
              <span className="text-slate-600"> · </span>
              {desa.nama_provinsi}
            </p>
            <p className="text-xs text-slate-500 mt-1">BPS {desa.kode_bps}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {desa.status_idm_computed && (
              <span
                className={`px-2.5 py-1 rounded-md border text-xs font-medium ${statusIdmColor(desa.status_idm_computed)}`}
              >
                IDM {desa.status_idm_computed}
              </span>
            )}
            {desa.klasifikasi_podes ? (
              <span
                className={`px-2.5 py-1 rounded-md border text-xs font-medium ${podesColor(desa.klasifikasi_podes)}`}
              >
                Podes {desa.klasifikasi_podes}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md border text-xs font-medium bg-slate-500/15 text-slate-300 border-slate-500/30">
                Podes n/a
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-md border text-xs font-medium ${tierColor(analisis.tier)}`}
            >
              Tier {analisis.tier}
            </span>
          </div>
        </div>
      </header>

      {!analisis.podes_tersedia && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          Data skor Podes tidak tersedia untuk desa ini. Profil IDM 2024
          tersedia dan ditampilkan di bawah. Rekomendasi kegiatan tidak dapat
          dihasilkan tanpa data Podes.
        </div>
      )}

      {/* 2. InfoBar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <InfoChip
          icon={<Users className="w-4 h-4 text-sky-400" />}
          label="Jiwa"
          value={formatNumber(desa.jumlah_jiwa)}
        />
        <InfoChip
          icon={<Home className="w-4 h-4 text-amber-400" />}
          label="Rumah tangga"
          value={formatNumber(desa.jumlah_rt)}
        />
        <InfoChip
          icon={<Map className="w-4 h-4 text-emerald-400" />}
          label="Luas (ha)"
          value={formatNumber(desa.luas_hektar != null ? Number(desa.luas_hektar) : null, 1)}
        />
        <InfoChip
          icon={<Hospital className="w-4 h-4 text-rose-400" />}
          label="Faskes"
          value={desa.ada_faskes ? 'Ada' : 'Belum ada'}
        />
        <InfoChip
          icon={<School className="w-4 h-4 text-violet-400" />}
          label="SD"
          value={desa.ada_sd ? 'Ada' : 'Belum ada'}
        />
        <InfoChip
          icon={<School className="w-4 h-4 text-indigo-400" />}
          label="SMP"
          value={desa.ada_smp ? 'Ada' : 'Belum ada'}
        />
      </div>

      {/* 3. Chart IDM */}
      <ProfilIDM
        iks={desa.iks != null ? Number(desa.iks) : null}
        ike={desa.ike != null ? Number(desa.ike) : null}
        ikl={desa.ikl != null ? Number(desa.ikl) : null}
        idm={desa.idm != null ? Number(desa.idm) : null}
        status={desa.status_idm_computed}
      />

      {/* 4. Coverage bar */}
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium text-slate-300">Cakupan anggaran</h3>
            <p className="text-lg font-semibold text-white mt-1">
              {formatRp(analisis.anggaran)}
              <span className="text-slate-400 font-normal text-sm">
                {' '}
                = {formatPct(analisis.coverage_pct)} dari kebutuhan ideal{' '}
                {formatRp(analisis.estimasi_biaya_ideal)}
              </span>
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-md border text-xs ${tierColor(analisis.tier)}`}>
            {analisis.tier}
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
            style={{ width: `${coverageWidth}%` }}
          />
        </div>
      </div>

      {/* 5–6. Narasi + rekomendasi */}
      <div className="glass-card rounded-2xl p-5 md:p-6">
        <NarasiPanel
          narasi={analisis.narasi}
          sumber={analisis.sumber_narasi}
          kegiatan={analisis.kegiatan}
        />
      </div>

      {/* 7. Disclaimer */}
      <footer className="pt-2 pb-8 space-y-1">
        <DataSourceBadge />
        <p className="text-xs text-slate-600">
          Tahun data: {analisis.tahun_data} · Sumber narasi: {analisis.sumber_narasi}
        </p>
      </footer>
    </main>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 py-3 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-100">{value}</div>
      </div>
    </div>
  );
}

export default function HasilPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-slate-400">
          Memuat…
        </div>
      }
    >
      <HasilContent />
    </Suspense>
  );
}
