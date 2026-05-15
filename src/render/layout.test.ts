import { describe, expect, it } from 'vitest';
import { computeLayout, NODE_R_MEDIUM } from './layout';
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
  it('returns 960×540 viewBox', () => {
    const layout = computeLayout(baseConfig(), []);
    expect(layout.width).toBe(960);
    expect(layout.height).toBe(540);
  });

  it('places home at (480, 270)', () => {
    const layout = computeLayout(baseConfig(), []);
    const home = layout.nodes.find((n) => n.kind === 'home');
    expect(home).toMatchObject({ x: 480, y: 270, r: 50 });
  });

  it('places grid at (60, 270)', () => {
    const layout = computeLayout(baseConfig(), []);
    const grid = layout.nodes.find((n) => n.kind === 'grid');
    expect(grid).toMatchObject({ x: 60, y: 270, r: 40 });
  });
});

describe('computeLayout — sources cluster (PV x-positions)', () => {
  it.each([
    [1, [280]],
    [2, [250, 560]],
    [3, [200, 380, 560]],
    [4, [200, 320, 440, 560]],
    [5, [200, 290, 380, 470, 560]],
    [6, [200, 272, 344, 416, 488, 560]],
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
    expect(consumers[0]).toMatchObject({ x: 480 + 350, y: 270 });
  });

  it.each([2, 3, 4, 6, 7, 8])(
    'N=%d: consumers stay within viewBox + clear of PV/Akku circles',
    (n) => {
      const layout = computeLayout(baseConfig(), mkDisplayConsumers(n));
      const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
      expect(consumers).toHaveLength(n);
      for (const c of consumers) {
        // ViewBox bounds: consumer (r=NODE_R_CONSUMER) must stay fully visible
        expect(c.y - c.r).toBeGreaterThanOrEqual(0);
        expect(c.y + c.r).toBeLessThanOrEqual(540);
        // No physical circle overlap with PV (x=250/560, y=80, r=NODE_R_MEDIUM)
        // or Akku (x=250/560, y=460, r=NODE_R_MEDIUM) — consumers are far right (x>740).
        for (const cx of [250, 560]) {
          for (const cy of [80, 460]) {
            const d = Math.hypot(c.x - cx, c.y - cy);
            expect(d).toBeGreaterThan(c.r + NODE_R_MEDIUM + 4); // 4px breathing
          }
        }
      }
    },
  );

  it('N=7 hits the α=42° cap exactly', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(7));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    // α = min(42°, (N-1)·14°/2). N=7 → 42° (exactly at cap).
    const alphaRad = (42 * Math.PI) / 180;
    const dy = 350 * Math.sin(alphaRad);
    expect(consumers[0]?.y).toBeCloseTo(270 - dy, 0);
    expect(consumers[6]?.y).toBeCloseTo(270 + dy, 0);
  });

  it.each([2, 4, 6, 8])('N=%d: consumers stay clear of each other (min gap 4 px)', (n) => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(n));
    const consumers = layout.nodes.filter((c) => c.kind === 'consumer');
    for (let i = 0; i < consumers.length; i++) {
      for (let j = i + 1; j < consumers.length; j++) {
        const d = Math.hypot(consumers[i].x - consumers[j].x, consumers[i].y - consumers[j].y);
        expect(d).toBeGreaterThan(consumers[i].r * 2 + 4); // 4 px breathing
      }
    }
  });

  it('N=8: adjacent consumer gap ≥ 15 px clearance (post-r=28 update)', () => {
    const layout = computeLayout(baseConfig(), mkDisplayConsumers(8));
    const consumers = layout.nodes.filter((n) => n.kind === 'consumer');
    expect(consumers).toHaveLength(8);
    // noUncheckedIndexedAccess: explizite Non-Null-Assertion erlaubt in *.test.ts
    // (.eslintrc.cjs:55-60 override). toHaveLength garantiert die Existenz semantisch.
    const c0 = consumers[0]!;
    const c1 = consumers[1]!;
    const adjGap = Math.hypot(c0.x - c1.x, c0.y - c1.y) - 2 * c0.r;
    expect(adjGap).toBeGreaterThanOrEqual(15);
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
