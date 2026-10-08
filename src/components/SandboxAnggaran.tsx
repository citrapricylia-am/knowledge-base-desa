'use client';

import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { formatRp, formatPct, tierLabel } from '@/lib/format';
import type { AnalisisResponse } from '@/lib/types';

interface SandboxAnggaranProps {
  kodeBps: string;
  /** Anggaran yang sedang dipakai di halaman hasil — jadi titik awal & pembanding. */
  anggaranAsli: number;
  kebutuhanIdeal: number;
}

const MAKS = 10_000_000_000;
const MIN = 50_000_000;

/**
 * Warna TEKS saja untuk tingkat intervensi.
 *
 * tierColor() dari lib/format dirancang untuk badge (bg + border + text).
 * Dipakai di kotak metrik, latarnya menutupi seluruh kotak dan membuat
 * satu metrik tampak berbeda dari dua lainnya.
 */
function warnaTeksTier(tier?: string | null): string {
  switch (tier) {
    case 'FULL':
      return 'text-emerald-300/90';
    case 'MAJOR':
      return 'text-teal-300/90';
    case 'MEDIUM':
      return 'text-sky-300/90';
    case 'SMALL':
      return 'text-amber-300/90';
    default:
      return 'text-white/70';
  }
}

/**
 * Sandbox: ruang coba anggaran.
 *
 * Pengguna menggeser angka dan langsung melihat dampaknya pada cakupan,
 * tingkat intervensi, dan daftar kegiatan yang layak. Tidak menyimpan apa pun
 * dan tidak memanggil LLM — memakai /api/analisis {cepat:true} (~0,2 detik),
 * jadi aman digeser berkali-kali.
 *
 * ponytail: tanpa simpan/bagikan skenario (butuh tabel + auth per-user).
 * Tambahkan kalau pengguna mulai minta membandingkan hasil lintas sesi.
 */
export default function SandboxAnggaran({
  kodeBps,
  anggaranAsli,
  kebutuhanIdeal,
}: SandboxAnggaranProps) {
  const [nilai, setNilai] = useState(anggaranAsli);
  const [hasil, setHasil] = useState<AnalisisResponse['analisis'] | null>(null);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState(false);
  const acRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Batas atas slider: 1,5x kebutuhan ideal supaya pergerakan terasa
  // bermakna (bukan 0-10 miliar yang membuat desa kecil mentok di ujung kiri).
  const batasAtas = Math.min(MAKS, Math.max(kebutuhanIdeal * 1.5, MIN * 4));

  useEffect(() => {
    // Debounce: slider memicu banyak perubahan, jangan kirim semuanya.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      acRef.current?.abort();
      const ac = new AbortController();
      acRef.current = ac;
      setMemuat(true);
      setGalat(false);

      fetch('/api/analisis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kode_bps: kodeBps, anggaran: nilai, cepat: true }),
        signal: ac.signal,
      })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? 'gagal');
          return j as AnalisisResponse;
        })
        .then((j) => setHasil(j.analisis))
        .catch((e) => {
          if (e instanceof Error && e.name === 'AbortError') return;
          setGalat(true);
        })
        .finally(() => setMemuat(false));
    }, 250);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [kodeBps, nilai]);

  useEffect(() => () => acRef.current?.abort(), []);

  const selisih = nilai - anggaranAsli;
  const berubah = Math.abs(selisih) >= 1;
  // Sisa dana yang belum tertutup pada skenario ini
  const kurang = Math.max(0, kebutuhanIdeal - nilai);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-white/40" />
            <h3 className="text-base font-semibold text-white">Coba skenario anggaran</h3>
          </div>
          <p className="text-sm text-white/45 leading-relaxed">
            Geser untuk melihat dampak anggaran lain. Tidak mengubah hasil
            analisis — hanya percobaan.
          </p>
        </div>
        {berubah && (
          <button
            type="button"
            onClick={() => setNilai(anggaranAsli)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/55 hover:text-white/85 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Kembali ke semula
          </button>
        )}
      </div>

      {/* Angka + slider */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-2xl font-semibold text-white tabular-nums">
            {formatRp(nilai)}
          </span>
          {berubah && (
            <span
              className={`text-xs tabular-nums ${selisih > 0 ? 'text-emerald-300/80' : 'text-amber-300/80'}`}
            >
              {selisih > 0 ? '+' : '−'}
              {formatRp(Math.abs(selisih))} dari semula
            </span>
          )}
        </div>

        <input
          type="range"
          min={MIN}
          max={batasAtas}
          step={50_000_000}
          value={Math.min(nilai, batasAtas)}
          onChange={(e) => setNilai(Number(e.target.value))}
          className="w-full accent-white/80 cursor-pointer"
          aria-label="Simulasi besaran anggaran"
        />

        <div className="flex justify-between text-xs text-white/45 tabular-nums">
          <span>{formatRp(MIN)}</span>
          <span>{formatRp(batasAtas)}</span>
        </div>
      </div>

      {/* Dampak */}
      {galat ? (
        <p className="text-sm text-white/45">
          Gagal menghitung skenario. Geser ulang untuk mencoba lagi.
        </p>
      ) : (
        <div
          className={`grid grid-cols-3 gap-3 transition-opacity ${memuat ? 'opacity-50' : 'opacity-100'}`}
        >
          <Kotak
            label="Cakupan"
            nilai={hasil ? formatPct(Number(hasil.coverage_pct)) : '—'}
          />
          <Kotak
            label="Tingkat intervensi"
            nilai={hasil ? tierLabel(hasil.tier) : '—'}
            kelas={hasil ? warnaTeksTier(hasil.tier) : undefined}
          />
          <Kotak
            label={kurang > 0 ? 'Masih kurang' : 'Selisih'}
            nilai={
              hasil
                ? kurang > 0
                  ? formatRp(kurang)
                  : 'Terpenuhi'
                : '—'
            }
            kelas={
              hasil
                ? kurang > 0
                  ? 'text-amber-300/90'
                  : 'text-emerald-300/90'
                : undefined
            }
          />
        </div>
      )}

      {/* Kegiatan pada skenario ini */}
      {hasil && hasil.kegiatan.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wide text-white/40">
            Kegiatan yang layak pada anggaran ini
          </h4>
          <ul className="space-y-1.5">
            {hasil.kegiatan.map((k) => (
              <li key={k} className="flex items-baseline gap-2 text-sm text-white/70">
                <span className="w-1 h-1 rounded-full bg-white/30 shrink-0 translate-y-[-2px]" />
                {k}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasil && hasil.kegiatan.length === 0 && (
        <p className="text-sm text-white/45">
          Pada anggaran ini belum ada kegiatan yang memenuhi ambang kelayakan.
        </p>
      )}

      <p className="text-xs text-white/25 leading-relaxed">
        Narasi AI di atas tetap mengacu pada anggaran semula
        ({formatRp(anggaranAsli)}). Untuk analisis penuh pada angka baru,
        jalankan analisis ulang dari halaman analisis.
      </p>
    </div>
  );
}

function Kotak({
  label,
  nilai,
  kelas,
}: {
  label: string;
  nilai: string;
  kelas?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 space-y-1">
      <div className="text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className={`text-sm font-medium tabular-nums ${kelas ?? 'text-white/85'}`}>
        {nilai}
      </div>
    </div>
  );
}
