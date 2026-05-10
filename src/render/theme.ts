import { resolveColor, type ColorRole } from '../util/resolve-color';

export interface ThemeContext {
  colorOverrides?: Partial<Record<ColorRole, string>>;
}

export function colorFor(role: ColorRole, ctx: ThemeContext = {}): string {
  return resolveColor(role, ctx.colorOverrides);
}

export const HA_CSS_VARS = {
  cardBackground: 'var(--ha-card-background, var(--card-background-color, #fff))',
  primaryText: 'var(--primary-text-color, #0f172a)',
  secondaryText: 'var(--secondary-text-color, #64748b)',
  divider: 'var(--divider-color, #e2e8f0)',
  cardPadding: 'var(--ha-card-padding, 16px)',
} as const;
