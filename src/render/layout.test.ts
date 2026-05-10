import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import type { Config } from '../config/types';

const baseConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [],
  ...over,
});

describe('computeLayout', () => {
  it('places single PV centered above home', () => {
    const c = baseConfig({ solar: [{ id: 'dach', power: 'sensor.s' }] });
    const l = computeLayout(c);
    const pv = l.nodes.find((n) => n.kind === 'pv' && n.id === 'dach');
    expect(pv).toBeDefined();
    expect(pv?.x).toBeCloseTo(360, 0);
  });

  it('places two PVs symmetrically', () => {
    const c = baseConfig({
      solar: [
        { id: 'dach', power: 'sensor.a' },
        { id: 'balkon', power: 'sensor.b' },
      ],
    });
    const l = computeLayout(c);
    const dach = l.nodes.find((n) => n.kind === 'pv' && n.id === 'dach');
    const balkon = l.nodes.find((n) => n.kind === 'pv' && n.id === 'balkon');
    expect(dach?.x).toBeLessThan(360);
    expect(balkon?.x).toBeGreaterThan(360);
  });

  it('places battery at same x as paired PV', () => {
    const c = baseConfig({
      solar: [
        { id: 'dach', power: 'sensor.a' },
        { id: 'balkon', power: 'sensor.b' },
      ],
      battery: [
        { id: 'b_dach', soc: 's.bs', power: 's.bp', charged_by: 'dach' },
        { id: 'b_balkon', soc: 's.bs2', power: 's.bp2', charged_by: 'balkon' },
      ],
    });
    const l = computeLayout(c);
    const pvDach = l.nodes.find((n) => n.kind === 'pv' && n.id === 'dach');
    const battDach = l.nodes.find((n) => n.kind === 'battery' && n.id === 'b_dach');
    expect(battDach?.x).toBeCloseTo(pvDach?.x ?? 0, 0);
  });

  it('always places grid left, home center, with grid x < home x', () => {
    const l = computeLayout(baseConfig());
    const grid = l.nodes.find((n) => n.kind === 'grid');
    const home = l.nodes.find((n) => n.kind === 'home');
    expect(grid).toBeDefined();
    expect(home).toBeDefined();
    expect(grid!.x).toBeLessThan(home!.x);
  });

  it('stacks consumers vertically on the right', () => {
    const c = baseConfig({
      consumers: [
        { name: 'A', power: 'sensor.a' },
        { name: 'B', power: 'sensor.b' },
        { name: 'C', power: 'sensor.c' },
      ],
    });
    const l = computeLayout(c);
    const cons = l.nodes.filter((n) => n.kind === 'consumer');
    expect(cons).toHaveLength(3);
    expect(cons.every((n) => n.x > 600)).toBe(true);
    const ys = cons.map((n) => n.y);
    expect(ys[0]).toBeLessThan(ys[1] ?? 0);
    expect(ys[1]).toBeLessThan(ys[2] ?? 0);
  });

  it('produces edge entries for all 16 flow paths in 2-PV/2-batt/3-cons setup', () => {
    const c = baseConfig({
      solar: [
        { id: 'dach', power: 's.d' },
        { id: 'balkon', power: 's.b' },
      ],
      battery: [
        { id: 'bd', soc: 's.bds', power: 's.bdp', charged_by: 'dach' },
        { id: 'bb', soc: 's.bbs', power: 's.bbp', charged_by: 'balkon' },
      ],
      consumers: [
        { name: 'A', power: 's.ca' },
        { name: 'B', power: 's.cb' },
        { name: 'C', power: 's.cc' },
      ],
    });
    const l = computeLayout(c);
    const kinds = l.edges.map((e) => e.kind);
    expect(kinds.filter((k) => k === 'pv-to-home').length).toBe(2);
    expect(kinds.filter((k) => k === 'pv-to-battery').length).toBe(2);
    expect(kinds.filter((k) => k === 'pv-to-grid').length).toBe(2);
    expect(kinds.filter((k) => k === 'battery-to-home').length).toBe(2);
    expect(kinds.filter((k) => k === 'battery-to-grid').length).toBe(2);
    expect(kinds.filter((k) => k === 'grid-to-home').length).toBe(1);
    expect(kinds.filter((k) => k === 'grid-to-battery').length).toBe(2); // Pairing-Defizit-Pfade
    expect(kinds.filter((k) => k === 'home-to-consumer').length).toBe(3);
    expect(l.edges).toHaveLength(16);
  });

  it('handles 0 PVs (config with only grid + consumers)', () => {
    const c = baseConfig({ consumers: [{ name: 'x', power: 's.x' }] });
    const l = computeLayout(c);
    expect(l.nodes.filter((n) => n.kind === 'pv')).toHaveLength(0);
    expect(l.edges.every((e) => !e.kind.startsWith('pv-'))).toBe(true);
  });

  it('handles 5 PVs distributed in the band', () => {
    const c = baseConfig({
      solar: Array.from({ length: 5 }, (_, i) => ({ id: `pv${i}`, power: `s.${i}` })),
    });
    const l = computeLayout(c);
    const pvs = l.nodes.filter((n) => n.kind === 'pv');
    expect(pvs).toHaveLength(5);
    const xs = pvs.map((n) => n.x);
    for (let i = 1; i < xs.length; i++) expect(xs[i] ?? 0).toBeGreaterThan(xs[i - 1] ?? 0);
  });

  it('handles split-grid form (import + export)', () => {
    const c: Config = {
      type: 'custom:custom-energy-flow-card',
      solar: [],
      battery: [],
      grid: { import: 'sensor.gi', export: 'sensor.ge' },
      consumers: [{ name: 'x', power: 's.x' }],
    };
    expect(() => computeLayout(c)).not.toThrow();
    expect(computeLayout(c).nodes.find((n) => n.kind === 'grid')).toBeDefined();
  });

  it('battery without paired PV in the layout still rendered (validation prevents it but defensive)', () => {
    // Validation würde dieses Setup ablehnen — Layout selbst ist trotzdem defensiv.
    const c = baseConfig({
      battery: [{ id: 'b_orphan', soc: 's.bs', power: 's.bp', charged_by: 'nonexistent' }],
    });
    expect(() => computeLayout(c)).not.toThrow();
  });
});
