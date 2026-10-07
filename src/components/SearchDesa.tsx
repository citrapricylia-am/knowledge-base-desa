"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";
import type { DesaSearchResult } from "@/lib/types";
import { podesColor, statusIdmColor } from "@/lib/format";

interface SearchDesaProps {
  onSelect: (desa: DesaSearchResult) => void;
  selected?: DesaSearchResult | null;
}

export default function SearchDesa({ onSelect, selected }: SearchDesaProps) {
  const [query, setQuery] = useState(
    selected ? `${selected.nama_desa}, Kec. ${selected.nama_kecamatan}` : "",
  );
  const [results, setResults] = useState<DesaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (debouncedQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/desa/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal mencari");
        return data as DesaSearchResult[];
      })
      .then((data) => {
        if (cancelled) return;
        setResults(Array.isArray(data) ? data : []);
        setIsOpen(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setResults([]);
        setError(err instanceof Error ? err.message : "Gagal mencari");
        setIsOpen(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="relative w-full z-50">
      <div className="glass-input relative flex items-center rounded-xl">
        <Search className="absolute left-4 w-5 h-5 text-white/30 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Cari desa, kecamatan, atau kabupaten (min. 2 karakter)"
          className="w-full bg-transparent border-none rounded-xl py-4 pl-12 pr-12 text-white placeholder-white/30 focus:outline-none transition-all"
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-4 w-4 h-4 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
        )}
      </div>

      {isOpen &&
        (results.length > 0 ||
          error ||
          (!loading && debouncedQuery.length >= 2)) && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-xl max-h-80 overflow-y-auto z-50 border border-white/10 backdrop-blur-2xl bg-[#0a0b0f]/90 shadow-2xl divide-y divide-white/5">
            {error && <div className="p-4 text-sm text-rose-300">{error}</div>}
            {!error && results.length === 0 && !loading && (
              <div className="p-4 text-center text-white/30 text-sm">
                Desa tidak ditemukan
              </div>
            )}
            {results.map((desa) => (
              <button
                key={desa.kode_bps}
                type="button"
                onClick={() => {
                  skipNextSearch.current = true;
                  setQuery(
                    `${desa.nama_desa}, Kec. ${desa.nama_kecamatan}, Kab. ${desa.nama_kabupaten}`,
                  );
                  setIsOpen(false);
                  onSelect(desa);
                }}
                className="w-full text-left px-5 py-4 hover:bg-white/[0.04] transition-colors flex flex-col gap-2 group"
              >
                <div className="flex justify-between items-start gap-3">
                  <span className="font-semibold text-white group-hover:text-white/80 transition-colors">
                    {desa.nama_desa}
                  </span>
                  <div className="flex flex-wrap gap-1.5 justify-end text-[11px]">
                    {desa.status_idm_computed && (
                      <span
                        className={`px-2 py-0.5 rounded-md border ${statusIdmColor(desa.status_idm_computed)}`}
                      >
                        {desa.status_idm_computed}
                      </span>
                    )}
                    {desa.klasifikasi_podes && (
                      <span
                        className={`px-2 py-0.5 rounded-md border ${podesColor(desa.klasifikasi_podes)}`}
                      >
                        {desa.klasifikasi_podes}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm text-white/40">
                  Kec. {desa.nama_kecamatan}
                  <span className="text-white/20"> · </span>
                  Kab. {desa.nama_kabupaten}
                  <span className="text-white/20"> · </span>
                  {desa.nama_provinsi}
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
