'use client';

import Link from 'next/link';
import type { DesaSearchResult, DesaPublic } from '@/lib/types';
import { podesColor, statusIdmColor, formatNumber } from '@/lib/format';

type DesaCardData = DesaSearchResult | DesaPublic;

interface DesaCardProps {
  desa: DesaCardData;
  href?: string;
  compact?: boolean;
}

export default function DesaCard({ desa, href, compact }: DesaCardProps) {
  const content = (
    <div
      className={`rounded-xl border border-slate-700/70 bg-slate-900/50 p-4 hover:border-emerald-500/40 transition-colors ${
        href ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{desa.nama_desa}</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            Kec. {desa.nama_kecamatan}
            <span className="text-slate-600"> · </span>
            Kab. {desa.nama_kabupaten}
            {'nama_provinsi' in desa && desa.nama_provinsi ? (
              <>
                <span className="text-slate-600"> · </span>
                {desa.nama_provinsi}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px]">
          {desa.status_idm_computed && (
            <span className={`px-2 py-0.5 rounded-md border ${statusIdmColor(desa.status_idm_computed)}`}>
              {desa.status_idm_computed}
            </span>
          )}
          {desa.klasifikasi_podes && (
            <span className={`px-2 py-0.5 rounded-md border ${podesColor(desa.klasifikasi_podes)}`}>
              Podes {desa.klasifikasi_podes}
            </span>
          )}
        </div>
      </div>
      {!compact && 'idm' in desa && (
        <p className="text-xs text-slate-500 mt-3">
          Kode BPS {desa.kode_bps}
          {desa.idm != null ? ` · IDM ${formatNumber(Number(desa.idm), 4)}` : ''}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
