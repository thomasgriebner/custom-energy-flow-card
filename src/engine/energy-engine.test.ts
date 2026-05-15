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

describe('Engine — Pairing (step 3)', () => {
  it('PV charges paired battery up to its charge rate', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 1000 }],
      battery: [{ id: 'b_dach', pairedPvId: 'dach', powerW: 600, socPct: 50 }],
      grid: { powerW: 0 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToBattery).toEqual([{ sourceId: 'dach', powerW: 600 }]);
  });

  it('Edge case 5: pairing deficit (PV 200 W, charge 500 W) — grid-to-battery flow visible', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 200 }],
      battery: [{ id: 'b_dach', pairedPvId: 'dach', powerW: 500, socPct: 50 }],
      grid: { powerW: 300 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToBattery).toEqual([{ sourceId: 'dach', powerW: 200 }]);
    expect(r.pairingDeficit).toEqual([{ batteryId: 'b_dach', deficitW: 300 }]);
    expect(r.flows.gridToBattery).toEqual([{ sourceId: 'b_dach', powerW: 300 }]);
    expect(r.warnings.some((w) => w.code === 'PAIRING_DEFICIT')).toBe(true);
  });

  it('Edge case 13: PV without paired battery → no PV-to-battery flow', () => {
    const s: SystemState = {
      pv: [{ id: 'standalone', powerW: 800 }],
      battery: [],
      grid: { powerW: -800 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToBattery).toEqual([]);
  });

  it('Edge case 12: no batteries — pvToBattery is empty', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 500 }],
      battery: [],
      grid: { powerW: -500 },
      consumer: [],
      home: {},
    };
    expect(compute(s).flows.pvToBattery).toEqual([]);
  });
});

describe('Engine — Source attribution + Reconcile (steps 4–7)', () => {
  it('Edge case 2: sunny day, batteries charging, surplus to grid', () => {
    const s: SystemState = {
      pv: [
        { id: 'dach', powerW: 2000 },
        { id: 'balkon', powerW: 600 },
      ],
      battery: [
        { id: 'b_dach', pairedPvId: 'dach', powerW: 600, socPct: 75 },
        { id: 'b_balkon', pairedPvId: 'balkon', powerW: 200, socPct: 42 },
      ],
      grid: { powerW: -600 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeW).toBe(1200);
    expect(r.flows.pvToHome.reduce((s, f) => s + f.powerW, 0)).toBeCloseTo(1200, 1);
    expect(r.flows.pvToGrid.reduce((s, f) => s + f.powerW, 0)).toBeCloseTo(600, 1);
    expect(r.flows.batteryToHome.every((f) => f.powerW === 0)).toBe(true);
  });

  it('Edge case 3: evening, batteries supply home + grid, no PV', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 0 }],
      battery: [
        { id: 'b_dach', pairedPvId: 'dach', powerW: -1100, socPct: 68 },
        { id: 'b_balkon', pairedPvId: 'balkon', powerW: -400, socPct: 38 },
      ],
      grid: { powerW: -300 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeW).toBe(1200);
    expect(r.flows.pvToHome).toEqual([{ sourceId: 'dach', powerW: 0 }]);
    const bToHome = r.flows.batteryToHome.reduce((s, f) => s + f.powerW, 0);
    const bToGrid = r.flows.batteryToGrid.reduce((s, f) => s + f.powerW, 0);
    expect(bToHome).toBeCloseTo(1200, 1);
    expect(bToGrid).toBeCloseTo(300, 1);
  });

  it('Edge case 4: night — pure grid import covers home', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 500 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeW).toBe(500);
    expect(r.flows.gridToHome).toBe(500);
  });

  it('Edge case 9: untracked_export — sensor exports but no source has excess', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: -200 },
      consumer: [],
      home: { powerOverrideW: 0 },
    };
    const r = compute(s);
    expect(r.flows.pvToGrid).toEqual([]);
    expect(r.flows.batteryToGrid).toEqual([]);
    expect(r.warnings.some((w) => w.code === 'EXPORT_INCONSISTENT')).toBe(true);
  });

  it('Edge case 10: phantom_export — calc shows export but sensor reads 0', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 1000 }],
      battery: [],
      grid: { powerW: 0 },
      consumer: [],
      home: { powerOverrideW: 500 },
    };
    const r = compute(s);
    expect(r.flows.pvToGrid.every((f) => f.powerW === 0)).toBe(true);
    expect(r.warnings.some((w) => w.code === 'EXPORT_INCONSISTENT')).toBe(true);
  });

  it('proportional split when 2 PVs export', () => {
    const s: SystemState = {
      pv: [
        { id: 'dach', powerW: 1500 },
        { id: 'balkon', powerW: 500 },
      ],
      battery: [],
      grid: { powerW: -2000 },
      consumer: [],
      home: { powerOverrideW: 0 },
    };
    const r = compute(s);
    const dachToGrid = r.flows.pvToGrid.find((f) => f.sourceId === 'dach')?.powerW ?? 0;
    const balkonToGrid = r.flows.pvToGrid.find((f) => f.sourceId === 'balkon')?.powerW ?? 0;
    expect(dachToGrid).toBeCloseTo(1500, 1);
    expect(balkonToGrid).toBeCloseTo(500, 1);
  });

  it('Edge case 8: Reconcile Fall 1 — calc_export ≠ export triggers scaling + warning', () => {
    // PV produces 2000W, no battery, home_override 0 → calc_export = 2000W
    // Sensor says export = 1500W → scale = 0.75 → warning required
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 2000 }],
      battery: [],
      grid: { powerW: -1500 },
      consumer: [],
      home: { powerOverrideW: 0 },
    };
    const r = compute(s);
    const totalPvToGrid = r.flows.pvToGrid.reduce((s, f) => s + f.powerW, 0);
    expect(totalPvToGrid).toBeCloseTo(1500, 0);
    expect(r.warnings.some((w) => w.code === 'EXPORT_INCONSISTENT')).toBe(true);
  });
});

describe('Engine — Consumer + Home-Attribution (steps 8 + ring)', () => {
  it('home-to-consumer mirrors consumer power', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 2000 }],
      battery: [],
      grid: { powerW: -500 },
      consumer: [
        { id: 'wp', powerW: 400 },
        { id: 'wb', powerW: 1100 },
      ],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.homeToConsumer).toEqual([
      { sourceId: 'wp', powerW: 400 },
      { sourceId: 'wb', powerW: 1100 },
    ]);
  });

  it('Edge case 14: Σ consumers > home triggers BALANCE_DRIFT', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 100 },
      consumer: [{ id: 'wp', powerW: 500 }],
      home: {},
    };
    const r = compute(s);
    expect(r.warnings.some((w) => w.code === 'BALANCE_DRIFT')).toBe(true);
  });

  it('home attribution shares sum to ~1 when home > 0', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 1000 }],
      battery: [],
      grid: { powerW: 500 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    const total = r.homeAttribution.shares.reduce((s, x) => s + x.share, 0);
    expect(total).toBeCloseTo(1, 3);
  });

  it('home attribution all zero when home is 0', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 0 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.homeAttribution.shares.every((s) => s.share === 0)).toBe(true);
  });

  it('Edge case 6: home_override skips balance', () => {
    const s: SystemState = {
      pv: [{ id: 'dach', powerW: 5000 }],
      battery: [],
      grid: { powerW: 0 },
      consumer: [],
      home: { powerOverrideW: 800 },
    };
    expect(compute(s).homeW).toBe(800);
  });

  it('Edge case 11: no PVs', () => {
    const s: SystemState = {
      pv: [],
      battery: [],
      grid: { powerW: 300 },
      consumer: [],
      home: {},
    };
    const r = compute(s);
    expect(r.flows.pvToHome).toEqual([]);
    expect(r.flows.gridToHome).toBe(300);
  });

  it('Edge case 16: 5 PV + 5 batteries stress test, completes < 5 ms', () => {
    const s: SystemState = {
      pv: Array.from({ length: 5 }, (_, i) => ({ id: `pv${i}`, powerW: 500 + i * 100 })),
      battery: Array.from({ length: 5 }, (_, i) => ({
        id: `b${i}`,
        pairedPvId: `pv${i}`,
        powerW: 100 + i * 50,
        socPct: 50,
      })),
      grid: { powerW: -200 },
      consumer: Array.from({ length: 3 }, (_, i) => ({ id: `c${i}`, powerW: 100 })),
      home: {},
    };
    const start = performance.now();
    const r = compute(s);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(20);
    expect(r.flows.pvToHome).toHaveLength(5);
    expect(r.flows.batteryToHome).toHaveLength(5);
    expect(r.flows.homeToConsumer).toHaveLength(3);
  });
});
