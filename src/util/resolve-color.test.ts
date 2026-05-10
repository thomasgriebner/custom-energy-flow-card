import { describe, expect, it } from 'vitest';
import { COLOR_DEFAULTS, resolveColor } from './resolve-color';

describe('resolveColor', () => {
  it('returns default for known role without override', () => {
    expect(resolveColor('solar')).toBe(COLOR_DEFAULTS.solar);
    expect(resolveColor('battery')).toBe(COLOR_DEFAULTS.battery);
    expect(resolveColor('grid_import')).toBe(COLOR_DEFAULTS.grid_import);
    expect(resolveColor('grid_export')).toBe(COLOR_DEFAULTS.grid_export);
    expect(resolveColor('home')).toBe(COLOR_DEFAULTS.home);
    expect(resolveColor('consumer')).toBe(COLOR_DEFAULTS.consumer);
    expect(resolveColor('warning')).toBe('#eab308');
  });

  it('uses override when provided', () => {
    expect(resolveColor('solar', { solar: '#abcdef' })).toBe('#abcdef');
  });

  it('falls back to default if override missing for that role', () => {
    expect(resolveColor('battery', { solar: '#abcdef' })).toBe(COLOR_DEFAULTS.battery);
  });
});
