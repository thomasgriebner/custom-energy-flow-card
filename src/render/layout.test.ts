import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';
import type { Config, DisplayConsumer } from '../config/types';

const baseConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [],
  ...over,
});

const mkDisplayConsumers = (n: number): DisplayConsumer[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${i}`,
    name: `C${i}`,
    members: [`sensor.c${i}`],
  }));

describe('computeLayout — viewBox + grid', () => {
  it('returns 820×540 viewBox', () => {
    const layout = computeLayout(baseConfig(), []);
    expect(layout.width).toBe(820);
    expect(layout.height).toBe(540);
  });

  it('places home at (380, 270)', () => {
    const layout = computeLayout(baseConfig(), []);
    const home = layout.nodes.find((n) => n.kind === 'home');
    expect(home).toMatchObject({ x: 380, y: 270, r: 50 });
  });

  it('places grid at (60, 270)', () => {
    const layout = computeLayout(baseConfig(), []);
    const grid = layout.nodes.find((n) => n.kind === 'grid');
    expect(grid).toMatchObject({ x: 60, y: 270, r: 32 });
  });
});

describe('computeLayout — sources cluster (PV x-positions)', () => {
  it.each([
    [1, [180]],
    [2, [180, 440]],
    [3, [130, 290, 440]],
    [4, [130, 230, 330, 440]],
    [5, [130, 207.5, 285, 362.5, 440]],
    [6, [130, 192, 254, 316, 378, 440]],
  ] as const)('PV count %d → x-positions %o', (count, expected) => {
    const config = baseConfig({
      solar: Array.from({ length: count }, (_, i) => ({ id: `pv${i}`, power: `sensor.pv${i}` })),
    });
    const layout = computeLayout(config, []);
    const pvXs = layout.nodes.filter((n) => n.kind === 'pv').map((n) => n.x);
    expected.forEach((x, i) => {
      expect(pvXs[i]).toBeCloseTo(x, 0);
    });
  });
});

describe('computeLayout — battery x follows paired PV (ADR-0006)', () => {
  it('battery aligns to paired PV x', () => {
    const config = baseConfig({
      solar: [
        { id: 'pv1', power: 'sensor.pv1' },
        { id: 'pv2', power: 'sensor.pv2' },
      ],
      battery: [{ id: 'b1', soc: 'sensor.b1soc', power: 'sensor.b1', charged_by: 'pv2' }],
    });
    const layout = computeLayout(config, []);
    const pv2 = layout.nodes.find((n) => n.kind === 'pv' && n.id === 'pv2');
    const b1 = layout.nodes.find((n) => n.kind === 'battery' && n.id === 'b1');
    expect(b1?.x).toBe(pv2?.x);
    expect(b1?.y).toBe(460);
  });
});

describe('computeLayout — consumer arc', () => {
  it('N=1: single consumer right of home, no arc', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(1));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    expect(consumers).toHaveLength(1);
    expect(consumers[0]).toMatchObject({ x: 380 + 275, y: 270 });
  });

  it.each([2, 3, 4, 6, 7, 8])(
    'N=%d: consumer y-positions stay clear of PV (y≥130) and battery (y≤410)',
    (n) => {
      const layout = computeLayout(baseConfig(), mkDisplayConsumers(n));
      const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
      expect(consumers).toHaveLength(n);
      for (const c of consumers) {
        // PV at y=80 with r=32 → consumer top must clear y=112; consumer r=24 → center y > 112+24 = 136
        // Battery at y=460 with r=32 → consumer bottom < 428; consumer r=24 → center y < 428-24 = 404
        expect(c.y).toBeGreaterThan(130);
        expect(c.y).toBeLessThan(410);
      }
    },
  );

  it('N=8 hits the α=25° cap', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(8));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    // α = min(25°, (N-1)·14°/2). N=8 → 49° → capped at 25°.
    // outermost y = 270 ± 275·sin(25°) ≈ 270 ± 116.2
    const alphaRad = (25 * Math.PI) / 180;
    const dy = 275 * Math.sin(alphaRad);
    expect(consumers[0]?.y).toBeCloseTo(270 - dy, 0);
    expect(consumers[7]?.y).toBeCloseTo(270 + dy, 0);
  });
});

describe('computeLayout — edges', () => {
  it('builds correct edge count for full config', () => {
    const config = baseConfig({
      solar: [{ id: 'pv1', power: 'sensor.pv1' }],
      battery: [{ id: 'b1', soc: 'sensor.b1soc', power: 'sensor.b1', charged_by: 'pv1' }],
    });
    const consumers = mkDisplayConsumers(3);
    const layout = computeLayout(config, consumers);
    // Expected edges: pv-to-home, pv-to-grid, pv-to-battery, battery-to-home,
    // battery-to-grid, grid-to-home, grid-to-battery, 3× home-to-consumer = 10
    expect(layout.edges).toHaveLength(10);
  });

  it('home-to-consumer edge id matches consumer id', () => {
    const consumers: DisplayConsumer[] = [{ id: 'g_kueche', name: 'Küche', members: ['sensor.a'] }];
    const layout = computeLayout(baseConfig(), consumers);
    expect(layout.edges.find((e) => e.kind === 'home-to-consumer')?.id).toBe('home-to-g_kueche');
  });
});
