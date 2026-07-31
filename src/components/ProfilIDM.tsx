'use client';

import { formatNumber } from '@/lib/format';

interface ProfilIDMProps {
  iks?: number | null;
  ike?: number | null;
  ikl?: number | null;
  idm?: number | null;
  status?: string | null;
}

function Bar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null | undefined;
  color: string;
}) {
  const n = value == null ? null : Number(value);
  const pct = n == null ? 0 : Math.max(0, Math.min(100, n * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-slate-400 tabular-nums">
          {n == null ? '—' : formatNumber(n, 4)}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProfilIDM({ iks, ike, ikl, idm, status }: ProfilIDMProps) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">Indeks Desa Membangun 2024</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-300 tabular-nums">
            {idm == null ? '—' : formatNumber(Number(idm), 4)}
          </div>
          {status && (
            <div className="text-xs text-slate-400 mt-0.5">{status}</div>
          )}
        </div>
      </div>
      <Bar label="IKS — Ketahanan Sosial" value={iks} color="bg-sky-400" />
      <Bar label="IKE — Ketahanan Ekonomi" value={ike} color="bg-amber-400" />
      <Bar label="IKL — Ketahanan Lingkungan" value={ikl} color="bg-emerald-400" />
    </div>
  );
}
