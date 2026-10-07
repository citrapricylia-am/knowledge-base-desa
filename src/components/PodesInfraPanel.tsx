'use client';

import { useEffect, useState } from 'react';
import { Building2, ChevronDown } from 'lucide-react';

interface InfraData {
  tersedia: boolean;
  total: number;
  fasilitas: Record<string, { label: string; nama: string }[]>;
}

const KATEGORI_ORDER = ['PAUD', 'SD', 'SMP', 'SMA', 'SMK', 'Pendidikan', 'Kesehatan', 'Energi', 'Komunikasi'];

export default function PodesInfraPanel({ kodeBps }: { kodeBps: string }) {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openKategori, setOpenKategori] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/podes-infra/${kodeBps}`)
      .then(async (r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ tersedia: false, total: 0, fasilitas: {} }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kodeBps]);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/50 animate-spin" />
          <p className="text-sm text-white/40">Memuat data infrastruktur…</p>
        </div>
      </div>
    );
  }

  if (!data || !data.tersedia) {
    return (
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white/30" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Infrastruktur Podes 2025</h3>
            <p className="text-sm text-white/30">Tidak ada data infrastruktur untuk desa ini.</p>
          </div>
        </div>
      </div>
    );
  }

  const kategoris = Object.keys(data.fasilitas).sort((a, b) => {
    const ia = KATEGORI_ORDER.indexOf(a);
    const ib = KATEGORI_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">Infrastruktur Podes 2025</h3>
        <span className="text-xs text-white/30">{data.total} fasilitas</span>
      </div>

      <div className="space-y-2">
        {kategoris.map((kat) => {
          const items = data.fasilitas[kat];
          const open = openKategori === kat;
          return (
            <div key={kat} className="rounded-xl border border-white/5 bg-white/[0.03] overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenKategori(open ? null : kat)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-white text-sm">{kat}</span>
                  <span className="text-xs text-white/30">{items.length} fasilitas</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <ul className="px-4 pb-3 space-y-1.5 border-t border-white/5 pt-3">
                  {items.map((item, i) => (
                    <li key={i} className="text-sm text-white/60 flex gap-2">
                      <span className="text-white/40 mt-0.5 shrink-0">{item.label}</span>
                      <span className="text-white/50">—</span>
                      <span>{item.nama}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-white/25 leading-relaxed">
        Data infrastruktur dari Podes 2025. Setiap fasilitas terdaftar dengan nama resmi.
      </p>
    </div>
  );
}
