import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { queryOne } from '@/lib/db';
import { toPublicDesa } from '@/lib/analisis';
import ProfilIDM from '@/components/ProfilIDM';
import DataSourceBadge from '@/components/DataSourceBadge';
import type { Desa } from '@/lib/types';
import {
  formatNumber,
  formatPct,
  formatRp,
  podesColor,
  statusIdmColor,
} from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ kode: string }>;
}

export default async function DesaProfilPage({ params }: PageProps) {
  const { kode } = await params;
  if (!/^\d{10}$/.test(kode)) notFound();

  let desa: ReturnType<typeof toPublicDesa> | null = null;
  let dbError: string | null = null;

  try {
    const row = await queryOne<Desa>('SELECT * FROM desa WHERE kode_bps = $1', [kode]);
    if (!row) notFound();
    desa = toPublicDesa(row);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  if (dbError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <p className="text-rose-300">Gagal memuat data: {dbError}</p>
        <p className="text-sm text-slate-500">
          Pastikan DATABASE_URL diset dan skema sudah diinisialisasi.
        </p>
        <Link href="/" className="text-emerald-400 text-sm">
          ← Beranda
        </Link>
      </main>
    );
  }

  if (!desa) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-slide-up">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Beranda
      </Link>

      <header className="glass-card rounded-2xl p-6 space-y-2">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white">{desa.nama_desa}</h1>
            <p className="text-slate-400 mt-1">
              Kec. {desa.nama_kecamatan} · Kab. {desa.nama_kabupaten} ·{' '}
              {desa.nama_provinsi}
            </p>
            <p className="text-xs text-slate-500 mt-1">Kode BPS {desa.kode_bps}</p>
          </div>
          <div className="flex flex-wrap gap-2 h-fit">
            {desa.status_idm_computed && (
              <span className={`px-2.5 py-1 rounded-md border text-xs ${statusIdmColor(desa.status_idm_computed)}`}>
                {desa.status_idm_computed}
              </span>
            )}
            {desa.klasifikasi_podes ? (
              <span className={`px-2.5 py-1 rounded-md border text-xs ${podesColor(desa.klasifikasi_podes)}`}>
                Podes {desa.klasifikasi_podes}
              </span>
            ) : null}
          </div>
        </div>
        {desa.alamat_lengkap && (
          <p className="text-sm text-slate-500 pt-2 border-t border-slate-800">
            {desa.alamat_lengkap}
          </p>
        )}
      </header>

      {!desa.klasifikasi_podes && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          Data skor Podes tidak tersedia untuk desa ini. Profil IDM 2024 tersedia.
        </div>
      )}

      <ProfilIDM
        iks={desa.iks != null ? Number(desa.iks) : null}
        ike={desa.ike != null ? Number(desa.ike) : null}
        ikl={desa.ikl != null ? Number(desa.ikl) : null}
        idm={desa.idm != null ? Number(desa.idm) : null}
        status={desa.status_idm_computed}
      />

      <section className="grid md:grid-cols-2 gap-4">
        <StatBlock title="Demografi & wilayah">
          <Row label="Jumlah jiwa" value={formatNumber(desa.jumlah_jiwa)} />
          <Row label="Rumah tangga" value={formatNumber(desa.jumlah_rt)} />
          <Row
            label="Luas"
            value={
              desa.luas_hektar != null
                ? `${formatNumber(Number(desa.luas_hektar), 2)} ha`
                : '—'
            }
          />
        </StatBlock>

        <StatBlock title="Fasilitas">
          <Row label="SD" value={desa.ada_sd ? 'Ada' : 'Belum ada'} />
          <Row label="SMP" value={desa.ada_smp ? 'Ada' : 'Belum ada'} />
          <Row label="Faskes" value={desa.ada_faskes ? 'Ada' : 'Belum ada'} />
        </StatBlock>

        <StatBlock title="Indikator Podes">
          <Row label="Skor overall" value={formatNumber(desa.skor_overall != null ? Number(desa.skor_overall) : null, 1)} />
          <Row label="% air bersih" value={formatPct(desa.pct_air_bersih != null ? Number(desa.pct_air_bersih) : null)} />
          <Row label="% pertanian" value={formatPct(desa.pct_pertanian != null ? Number(desa.pct_pertanian) : null)} />
          <Row label="% SMP+" value={formatPct(desa.pct_smp_plus != null ? Number(desa.pct_smp_plus) : null)} />
          <Row label="% rumah miskin" value={formatPct(desa.pct_rumah_miskin != null ? Number(desa.pct_rumah_miskin) : null)} />
        </StatBlock>

        <StatBlock title="Rekomendasi & biaya ideal">
          <Row
            label="Estimasi biaya ideal"
            value={formatRp(desa.estimasi_biaya != null ? Number(desa.estimasi_biaya) : 0)}
          />
          <Row label="Tantangan" value={desa.tantangan ?? '—'} />
          <Row label="Rekomendasi (raw)" value={desa.rekomendasi ?? '—'} />
        </StatBlock>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/?prefill=${desa.kode_bps}`}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
        >
          Analisis anggaran untuk desa ini
        </Link>
        <Link
          href={`/hasil?kode_bps=${desa.kode_bps}&anggaran=100000000`}
          className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-200 text-sm hover:border-emerald-500/40 transition-colors"
        >
          Coba dengan Rp 100 juta
        </Link>
      </div>

      <DataSourceBadge className="pt-4" />
    </main>
  );
}

function StatBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-4 space-y-2">
      <h3 className="text-sm font-semibold text-slate-200 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm py-1 border-b border-slate-800/50 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 text-right break-words">{value}</span>
    </div>
  );
}
