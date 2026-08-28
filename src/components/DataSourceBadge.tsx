interface DataSourceBadgeProps {
  className?: string;
  podes2025Tersedia?: boolean | null;
}

export default function DataSourceBadge({
  className = '',
  podes2025Tersedia,
}: DataSourceBadgeProps) {
  const hasPodes = podes2025Tersedia === true;
  const noPodes = podes2025Tersedia === false;

  return (
    <p className={`text-xs text-slate-500 leading-relaxed ${className}`}>
      {hasPodes ? (
        <>Sumber: Podes 2025 · IDM 2024 · BPS Indonesia</>
      ) : noPodes ? (
        <>Sumber: IDM 2024 · BPS Indonesia (data Podes 2025 tidak tersedia untuk desa ini)</>
      ) : (
        <>Sumber: Podes 2025 · IDM 2024 · BPS Indonesia</>
      )}
      <br />
      Bukan nasihat investasi. Untuk penyaringan awal dan perencanaan indikatif.
    </p>
  );
}
