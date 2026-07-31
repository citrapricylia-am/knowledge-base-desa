export default function DataSourceBadge({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-500 leading-relaxed ${className}`}>
      Sumber: Podes 2025 · IDM 2024 · BPS Indonesia
      <br />
      Bukan nasihat investasi. Untuk penyaringan awal dan perencanaan indikatif.
    </p>
  );
}
