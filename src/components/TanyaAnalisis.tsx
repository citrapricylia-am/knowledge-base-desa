'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Square } from 'lucide-react';

interface Pesan {
  peran: 'user' | 'ai';
  teks: string;
}

interface TanyaAnalisisProps {
  kodeBps: string;
  anggaran: number;
  namaDesa: string;
  /** Narasi belum siap -> chat ikut menunggu supaya jawaban tidak tanpa konteks. */
  nonaktif?: boolean;
}

/** Pertanyaan pembuka — supaya pengguna tidak bingung harus mulai dari mana. */
const SARAN = [
  'Kenapa pilar lingkungan paling lemah?',
  'Apa yang harus dikerjakan lebih dulu?',
  'Kalau anggaran ditambah, apa bedanya?',
];

export default function TanyaAnalisis({
  kodeBps,
  anggaran,
  namaDesa,
  nonaktif,
}: TanyaAnalisisProps) {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [input, setInput] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const akhirRef = useRef<HTMLDivElement>(null);

  // Gulir ke bawah saat ada pesan baru / teks bertambah
  useEffect(() => {
    akhirRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [pesan]);

  // Batalkan permintaan yang masih jalan saat komponen dilepas
  useEffect(() => () => abortRef.current?.abort(), []);

  async function kirim(teks: string) {
    const bersih = teks.trim();
    if (!bersih || mengirim) return;

    setGalat(null);
    setInput('');
    const riwayat = pesan.slice(-8);
    setPesan((p) => [...p, { peran: 'user', teks: bersih }, { peran: 'ai', teks: '' }]);
    setMengirim(true);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kode_bps: kodeBps,
          anggaran,
          pesan: bersih,
          riwayat,
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? 'AI sedang tidak bisa dihubungi');
      }

      const { jawaban } = (await res.json()) as { jawaban?: string };
      if (!jawaban?.trim()) {
        throw new Error('AI tidak memberi jawaban. Coba ulangi pertanyaan.');
      }
      setPesan((p) => {
        const salin = [...p];
        salin[salin.length - 1] = { peran: 'ai', teks: jawaban };
        return salin;
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // dihentikan pengguna — biarkan teks yang sudah masuk
      } else {
        setGalat(err instanceof Error ? err.message : 'Gagal mengirim pertanyaan');
        // buang gelembung AI yang kosong
        setPesan((p) => (p[p.length - 1]?.teks === '' ? p.slice(0, -1) : p));
      }
    } finally {
      setMengirim(false);
      abortRef.current = null;
    }
  }

  if (nonaktif) {
    return (
      <div className="flex items-center gap-2.5 text-sm text-white/35">
        <span className="w-1.5 h-1.5 rounded-full bg-white/25" />
        Tanya AI aktif setelah analisis selesai disusun
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-white/40" />
        <h3 className="text-base font-semibold text-white">Tanya tentang analisis ini</h3>
      </div>

      {pesan.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-white/45 leading-relaxed">
            Tanyakan apa pun soal {namaDesa} — angka yang membingungkan, alasan
            sebuah rekomendasi, atau apa yang sebaiknya didahulukan.
          </p>
          <div className="flex flex-wrap gap-2">
            {SARAN.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => kirim(s)}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-white/60 hover:bg-white/[0.07] hover:text-white/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {pesan.length > 0 && (
        <div className="space-y-3 max-h-[26rem] overflow-y-auto pr-1">
          {pesan.map((m, i) => (
            <div
              key={i}
              className={m.peran === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div
                className={
                  m.peran === 'user'
                    ? 'max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.08] border border-white/10 px-4 py-2.5 text-sm text-white/85'
                    : 'max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.03] border border-white/5 px-4 py-3 text-sm text-white/75 leading-relaxed whitespace-pre-wrap'
                }
              >
                {m.teks || (
                  <span className="inline-flex items-center gap-1.5 text-white/40">
                    <span className="w-1 h-1 rounded-full bg-white/40 animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '0.15s' }} />
                    <span className="w-1 h-1 rounded-full bg-white/40 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={akhirRef} />
        </div>
      )}

      {galat && (
        <p className="text-xs text-amber-300/80" role="alert">
          {galat}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          kirim(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tulis pertanyaan…"
          maxLength={1000}
          disabled={mengirim}
          className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50"
          aria-label="Pertanyaan tentang analisis desa"
        />
        {mengirim ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white/60 hover:text-white/90 transition-colors"
            aria-label="Hentikan"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] p-2.5 text-white/60 hover:text-white/90 disabled:opacity-30 transition-colors"
            aria-label="Kirim pertanyaan"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </form>

      <p className="text-xs text-white/25 leading-relaxed">
        Jawaban disusun dari data Podes 2025, IDM 2024, dan Susenas 2025 yang
        dimuat untuk desa ini. AI bisa salah menafsirkan — periksa angka pada
        panel di atas sebelum dipakai untuk keputusan.
      </p>
    </div>
  );
}
