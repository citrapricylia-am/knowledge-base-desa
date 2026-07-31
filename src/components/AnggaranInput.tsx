'use client';

import { useEffect, useState } from 'react';

interface AnggaranInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

const MAX_DEFAULT = 10_000_000_000;

export default function AnggaranInput({
  value,
  onChange,
  max = MAX_DEFAULT,
}: AnggaranInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value ? value.toLocaleString('id-ID') : '',
  );

  useEffect(() => {
    setDisplayValue(value ? value.toLocaleString('id-ID') : '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    if (rawVal === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }
    const num = parseInt(rawVal, 10);
    if (!Number.isNaN(num) && num <= max) {
      setDisplayValue(num.toLocaleString('id-ID'));
      onChange(num);
    }
  };

  const setPreset = (amount: number) => {
    const capped = Math.min(amount, max);
    setDisplayValue(capped.toLocaleString('id-ID'));
    onChange(capped);
  };

  const presets = [
    { label: '100 Jt', value: 100_000_000 },
    { label: '500 Jt', value: 500_000_000 },
    { label: '1 M', value: 1_000_000_000 },
    { label: '1,5 M', value: 1_500_000_000 },
    { label: '3 M', value: 3_000_000_000 },
    { label: '4,5 M', value: 4_500_000_000 },
  ];

  return (
    <div className="w-full space-y-3">
      <div className="relative flex items-center">
        <span className="absolute left-4 font-semibold text-slate-400">Rp</span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleInputChange}
          placeholder="0"
          className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl py-4 pl-14 pr-4 text-xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => setPreset(preset.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              value === preset.value
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800/50 text-slate-300 border-slate-700/50 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-500/30'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
