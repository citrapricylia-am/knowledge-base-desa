'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database } from 'lucide-react';
import DataSourceBadge from '@/components/DataSourceBadge';
import type { CakupanStats } from '@/lib/types';
import { formatNumber, formatPct } from '@/lib/format';

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
          Ringkasan cakupan Podes 2025 dan IDM 2024 yang dimuat ke sistem.
          Data bersifat survei (statis), bukan real-time.
        </p>
      </header>

      {loading && (
        <div className="py-16 text-center text-slate-400">Memuat statistik…</div>
      )}

      {error && (
        <div className="glass-card rounded-xl p-6 text-rose-300 text-sm space-y-2">
          <p>{error}</p>
          <p className="text-slate-500">
            Pastikan Postgres sudah di-init (`scripts/init_db.sql`) dan data
            sudah di-sync (`scripts/sync.py`).
          </p>
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Total desa" value={formatNumber(stats.total_desa)} />
            <Metric
              label="Dengan Podes"
              value={formatNumber(stats.dengan_podes)}
              sub={
                stats.total_desa
                  ? formatPct((stats.dengan_podes / stats.total_desa) * 100)
                  : undefined
              }
            />
            <Metric
              label="Tanpa Podes"
              value={formatNumber(stats.tanpa_podes)}
              sub="IDM tetap bisa ditampilkan"
            />
            <Metric
              label="Status IDM computed"
              value={formatNumber(stats.dengan_status_idm)}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <DistTable
              title="Per status IDM"
              rows={stats.per_status_idm.map((r) => ({
                label: r.status,
                count: r.count,
              }))}
              total={stats.total_desa}
            />
            <DistTable
              title="Per klasifikasi Podes"
              rows={stats.per_klasifikasi.map((r) => ({
                label: r.klasifikasi,
                count: r.count,
              }))}
              total={stats.total_desa}
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">
              Top 15 provinsi (jumlah desa)
            </h3>
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
        </>
      )}

      <DataSourceBadge className="pt-4" />
    </main>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function DistTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; count: number }[];
  total: number;
}) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex justify-between text-sm border-b border-slate-800/60 pb-1.5 last:border-0"
          >
            <span className="text-slate-300">{r.label}</span>
            <span className="text-slate-400 tabular-nums">
              {formatNumber(r.count)}
              {total > 0 && (
                <span className="text-slate-600 ml-2">
                  ({formatPct((r.count / total) * 100)})
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
