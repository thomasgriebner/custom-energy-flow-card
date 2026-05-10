export interface FormatOpts {
  format?: 'standard' | 'grouped';
  signed?: boolean;
  locale?: string;
}

function defaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'de-DE';
}

export function formatPowerW(value: number, opts: FormatOpts = {}): string {
  if (!Number.isFinite(value)) return '— W';
  const rounded = Math.round(value);
  if (rounded === 0) return '0 W'; // also handles -0 (would otherwise render '−0 W')
  const abs = Math.abs(rounded);
  const grouped = opts.format === 'grouped';
  const locale = opts.locale ?? defaultLocale();
  const formatted = grouped
    ? new Intl.NumberFormat(locale, { useGrouping: true }).format(abs)
    : String(abs);
  if (rounded > 0) return opts.signed ? `+${formatted} W` : `${formatted} W`;
  return `−${formatted} W`;
}
