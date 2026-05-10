import { describe, expect, it } from 'vitest';
import { formatPowerW } from './format-power';

describe('formatPowerW', () => {
  it.each([
    [0, { format: 'standard' as const }, '0 W'],
    [1900, { format: 'standard' as const }, '1900 W'],
    [1900, { format: 'grouped' as const, locale: 'de-DE' }, '1.900 W'],
    [1900, { format: 'grouped' as const, locale: 'en-US' }, '1,900 W'],
    [-450, { format: 'standard' as const, signed: true }, '−450 W'],
    [800, { format: 'standard' as const, signed: true }, '+800 W'],
    [0, { format: 'standard' as const, signed: true }, '0 W'],
    [12500, { format: 'grouped' as const, locale: 'de-DE' }, '12.500 W'],
  ])('formats %d with %o → %s', (input, opts, expected) => {
    expect(formatPowerW(input, opts)).toBe(expected);
  });

  it('rounds to integer Watts', () => {
    expect(formatPowerW(1234.7, { format: 'standard' })).toBe('1235 W');
  });

  it('handles NaN gracefully', () => {
    expect(formatPowerW(Number.NaN)).toBe('— W');
  });

  it('renders -0 as 0 W (no minus sign)', () => {
    expect(formatPowerW(-0, { signed: true })).toBe('0 W');
    expect(formatPowerW(-0.4, { signed: true })).toBe('0 W'); // rounds to 0
  });
});
