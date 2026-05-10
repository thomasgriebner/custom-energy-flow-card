import { describe, expect, it } from 'vitest';
import { compute } from './energy-engine';
import type { SystemState } from './types';

const empty = (): SystemState => ({
  pv: [],
  battery: [],
  grid: { powerW: 0 },
  consumer: [],
  home: {},
});

describe('Engine — Decomposition + Home (steps 1+2)', () => {
  it('Edge case 1: all zero', () => {
    const r = compute(empty());
    expect(r.homeW).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it('home_override is honored', () => {
    const s = empty();
    s.home.powerOverrideW = 1500;
    expect(compute(s).homeW).toBe(1500);
  });

  it('home computed via balance: PV + import = home', () => {
    const s = empty();
    s.pv = [{ id: 'dach', powerW: 1000 }];
    s.grid = { powerW: 500 };
    expect(compute(s).homeW).toBe(1500);
  });

  it('home computed: PV − export = home', () => {
    const s = empty();
    s.pv = [{ id: 'dach', powerW: 1000 }];
    s.grid = { powerW: -300 };
    expect(compute(s).homeW).toBe(700);
  });

  it('Edge case 7: negative PV gets clamped, warning fired', () => {
    const s = empty();
    s.pv = [{ id: 'dach', powerW: -50 }];
    const r = compute(s);
    expect(r.homeW).toBe(0);
    expect(r.warnings.some((w) => w.code === 'NEGATIVE_PV')).toBe(true);
  });

  it('Edge case 15: P_home_calculated < 0 clamped + warning', () => {
    const s = empty();
    s.battery = [{ id: 'b1', pairedPvId: 'p1', powerW: 1000, socPct: 50 }];
    s.grid = { powerW: -2000 };
    const r = compute(s);
    expect(r.homeW).toBe(0);
    expect(r.warnings.some((w) => w.code === 'BALANCE_DRIFT')).toBe(true);
  });
});
