export type ColorRole =
  | 'solar'
  | 'battery'
  | 'grid_import'
  | 'grid_export'
  | 'home'
  | 'consumer'
  | 'warning';

export const COLOR_DEFAULTS: Record<ColorRole, string> = {
  solar: '#f59e0b',
  battery: '#10b981',
  grid_import: '#6b7280',
  grid_export: '#16a34a',
  home: '#ef4444',
  consumer: '#db2777',
  warning: '#eab308',
};

export function resolveColor(
  role: ColorRole,
  overrides?: Partial<Record<ColorRole, string>>,
): string {
  return overrides?.[role] ?? COLOR_DEFAULTS[role];
}
