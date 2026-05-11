import { describe, expect, it } from 'vitest';
import { deriveDisplayConsumers, type DeriveConsumersHassShape } from './derive-display-consumers';
import type { Config } from './types';

const baseConfig = (consumers: Array<{ power: string; name?: string }>): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: consumers.map((c) => ({ name: c.name ?? '', power: c.power })),
});

const emptyHass: DeriveConsumersHassShape = {};

describe('deriveDisplayConsumers — none mode (default)', () => {
  it('returns 1:1 mapping in user order with c0, c1, … ids', () => {
    const config = baseConfig([{ power: 'sensor.a', name: 'A' }, { power: 'sensor.b' }]);
    const { consumers, warnings } = deriveDisplayConsumers(config, emptyHass);
    expect(consumers).toHaveLength(2);
    expect(consumers[0]).toMatchObject({ id: 'c0', name: 'A', members: ['sensor.a'] });
    expect(consumers[1]).toMatchObject({ id: 'c1', members: ['sensor.b'] });
    expect(consumers[1]?.name).toMatch(/Verbraucher/);
    expect(warnings).toEqual([]);
  });

  it('uses default name when consumer.name is missing', () => {
    const config = baseConfig([{ power: 'sensor.x' }]);
    const { consumers } = deriveDisplayConsumers(config, emptyHass);
    expect(consumers[0]?.name).toBe('Verbraucher 1');
  });
});

describe('deriveDisplayConsumers — by_area mode', () => {
  it('groups 3 sensors of same area into 1 group', () => {
    const config: Config = {
      ...baseConfig([
        { power: 'sensor.herd' },
        { power: 'sensor.spueler' },
        { power: 'sensor.mikrowelle' },
      ]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: {
        'sensor.herd': { area_id: 'kueche' },
        'sensor.spueler': { area_id: 'kueche' },
        'sensor.mikrowelle': { area_id: 'kueche' },
      },
      areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
    };
    const { consumers, warnings } = deriveDisplayConsumers(config, hass);
    expect(consumers).toHaveLength(1);
    expect(consumers[0]).toMatchObject({
      id: 'g_kueche',
      name: 'Küche',
      areaId: 'kueche',
      members: ['sensor.herd', 'sensor.spueler', 'sensor.mikrowelle'],
    });
    expect(warnings).toEqual([]);
  });

  it('splits sensors into separate groups sorted alphabetically by name', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.pc' }, { power: 'sensor.herd' }, { power: 'sensor.tv' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: {
        'sensor.pc': { area_id: 'buero' },
        'sensor.herd': { area_id: 'kueche' },
        'sensor.tv': { area_id: 'wohnzimmer' },
      },
      areas: {
        buero: { area_id: 'buero', name: 'Büro' },
        kueche: { area_id: 'kueche', name: 'Küche' },
        wohnzimmer: { area_id: 'wohnzimmer', name: 'Wohnzimmer' },
      },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers.map((c) => c.name)).toEqual(['Büro', 'Küche', 'Wohnzimmer']);
  });

  it('falls back to device.area_id when entity.area_id is missing', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.x' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: { 'sensor.x': { device_id: 'dev1' } },
      devices: { dev1: { area_id: 'garage' } },
      areas: { garage: { area_id: 'garage', name: 'Garage' } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]).toMatchObject({ id: 'g_garage', name: 'Garage' });
  });

  it('puts sensors without any area into g_unassigned at the end', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.lost' }, { power: 'sensor.tv' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: { 'sensor.tv': { area_id: 'wz' } },
      areas: { wz: { area_id: 'wz', name: 'Wohnzimmer' } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers.map((c) => c.id)).toEqual(['g_wz', 'g_unassigned']);
    expect(consumers[1]?.name).toBe('Sonstige');
  });

  it('emits AREA_NOT_FOUND when area_id has no areas entry', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.x' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: { 'sensor.x': { area_id: 'ghost' } },
      areas: {},
    };
    const { consumers, warnings } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]).toMatchObject({ id: 'g_ghost', name: 'ghost' });
    expect(warnings.some((w) => w.code === 'AREA_NOT_FOUND')).toBe(true);
  });

  it('falls back to none-mode + REGISTRY_UNAVAILABLE when hass.entities is missing', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.x' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const { consumers, warnings } = deriveDisplayConsumers(config, emptyHass);
    expect(consumers[0]?.id).toBe('c0');
    expect(warnings.some((w) => w.code === 'REGISTRY_UNAVAILABLE')).toBe(true);
  });

  it('uses id as tiebreaker for areas with identical display names', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.a' }, { power: 'sensor.b' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: {
        'sensor.a': { area_id: 'beta' },
        'sensor.b': { area_id: 'alpha' },
      },
      areas: {
        alpha: { area_id: 'alpha', name: 'Doppelt' },
        beta: { area_id: 'beta', name: 'Doppelt' },
      },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers.map((c) => c.areaId)).toEqual(['alpha', 'beta']);
  });

  it('treats area_id: null exactly like undefined', () => {
    const config: Config = {
      ...baseConfig([{ power: 'sensor.n' }]),
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: { 'sensor.n': { area_id: null, device_id: null } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]?.id).toBe('g_unassigned');
  });

  it('ignores consumer.name in by_area mode (area-name wins)', () => {
    const config: Config = {
      type: 'custom:custom-energy-flow-card',
      solar: [],
      battery: [],
      grid: { power: 'sensor.grid' },
      consumers: [{ name: 'Mein eigener Name', power: 'sensor.x' }],
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: { 'sensor.x': { area_id: 'kueche' } },
      areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]?.name).toBe('Küche');
    expect(consumers[0]?.name).not.toBe('Mein eigener Name');
  });

  it('uses area.icon and ignores consumer.icon in by_area mode', () => {
    const config: Config = {
      type: 'custom:custom-energy-flow-card',
      solar: [],
      battery: [],
      grid: { power: 'sensor.grid' },
      consumers: [{ name: 'X', power: 'sensor.x', icon: 'mdi:wrong-icon' }],
      display: { consumer_grouping: 'by_area' },
    };
    const hass: DeriveConsumersHassShape = {
      entities: { 'sensor.x': { area_id: 'kueche' } },
      areas: { kueche: { area_id: 'kueche', name: 'Küche', icon: 'mdi:stove' } },
    };
    const { consumers } = deriveDisplayConsumers(config, hass);
    expect(consumers[0]?.icon).toBe('mdi:stove');
    expect(consumers[0]?.icon).not.toBe('mdi:wrong-icon');
  });
});
