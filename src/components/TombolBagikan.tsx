'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Check, Link2, Mail, MessageCircle, Send } from 'lucide-react';

/**
 * Menu bagikan lintas platform.
 *
 * KENAPA TIDAK ANDALKAN navigator.share:
 * Web Share API tidak ada di Chrome Linux (hanya Windows 10+, macOS,
 * dan mobile). Jadi di Linux tombol apa pun yang hanya memanggil
 * navigator.share akan terlihat mati. Menu ini selalu muncul;
 * share native dipakai sebagai jalur cepat kalau tersedia.
 */
export function TombolBagikan({ nama }: { nama: string }) {
  const [buka, setBuka] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Tutup saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!buka) return;
    const klikLuar = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setBuka(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBuka(false);
    };
    document.addEventListener('mousedown', klikLuar);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', klikLuar);
      document.removeEventListener('keydown', esc);
    };
  }, [buka]);

  const url = typeof window !== 'undefined' ? window.location.href : '';
  const judul = `Analisis Desa ${nama} — DesaLens`;

  async function salinLink() {
    try {
      await navigator.clipboard.writeText(url);
      setTersalin(true);
    } catch {
      // Fallback: textarea + execCommand (kalau clipboard API diblokir)
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setTersalin(true);
      } catch {
        setTersalin(false);
      }
    }
    setTimeout(() => {
      setTersalin(false);
      setBuka(false);
    }, 1400);
  }

  async function klikUtama() {
    // Jalur cepat: share native kalau OS mendukung (mobile, Windows, macOS)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: judul, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    setBuka((v) => !v);
  }

  const opsi = [
    {
      label: 'WhatsApp',
      Icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${judul}\n${url}`)}`,
    },
    {
      label: 'Telegram',
      Icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(judul)}`,
    },
    {
      label: 'Email',
      Icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(judul)}&body=${encodeURIComponent(`${judul}\n\n${url}`)}`,
    },
  ];

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={klikUtama}
        aria-haspopup="menu"
        aria-expanded={buka}
        className="text-sm text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
      >
        <Share2 className="w-3.5 h-3.5" />
        Bagikan
      </button>

      {buka && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2.5 w-52 z-50 rounded-xl overflow-hidden animate-fade-in"
          style={{
            // Isian harus JELAS lebih terang dari card di belakangnya.
            // Diukur: isian #1c2128 hanya +3.6 luminansi vs card -> menyatu.
            // #2a3140 memberi jarak yang terbaca.
            background: '#2a3140',
            border: '1px solid rgba(255,255,255,0.22)',
            boxShadow: '0 14px 36px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {opsi.map(({ label, Icon, href }) => (
            <a
              key={label}
              role="menuitem"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setBuka(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </a>
          ))}

          <button
            type="button"
            role="menuitem"
            onClick={salinLink}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
          >
            {tersalin ? (
              <>
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="text-emerald-400">Link tersalin</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 shrink-0" />
                Salin link
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
