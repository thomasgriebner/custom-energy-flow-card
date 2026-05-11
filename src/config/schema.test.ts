import { describe, expect, it } from 'vitest';
import { buildSystemState, validateConfig } from './schema';
import type { DeriveConsumersHassShape } from './derive-display-consumers';
import type { Config } from './types';
import type { ReadSensorHassShape } from '../util/read-sensor';

const minimalConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [{ name: 'X', power: 'sensor.x' }],
  ...over,
});

describe('validateConfig', () => {
  it('passes valid minimal config', () => {
    expect(() => validateConfig(minimalConfig())).not.toThrow();
  });

  it('throws on missing type', () => {
    expect(() => validateConfig({ ...minimalConfig(), type: undefined as never })).toThrow(/type/);
  });

  it('throws on duplicate solar IDs', () => {
    const c = minimalConfig({
      solar: [
        { id: 'dach', power: 's.a' },
        { id: 'dach', power: 's.b' },
      ],
    });
    expect(() => validateConfig(c)).toThrow(/solar.*id.*dach/i);
  });

  it('throws on battery referencing non-existent solar id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 's.a' }],
      battery: [{ id: 'b', soc: 's.b_soc', power: 's.b_p', charged_by: 'balkon' }],
    });
    expect(() => validateConfig(c)).toThrow(/charged_by.*balkon/i);
  });

  it('throws on PV paired with two batteries', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 's.a' }],
      battery: [
        { id: 'b1', soc: 's.b1_soc', power: 's.b1_p', charged_by: 'dach' },
        { id: 'b2', soc: 's.b2_soc', power: 's.b2_p', charged_by: 'dach' },
      ],
    });
    expect(() => validateConfig(c)).toThrow(/dach.*paired/i);
  });

  it('throws on grid neither power nor import/export', () => {
    const c = { ...minimalConfig(), grid: {} as never };
    expect(() => validateConfig(c)).toThrow(/grid/i);
  });

  it('accepts grid with import + export', () => {
    const c = minimalConfig({ grid: { import: 's.i', export: 's.e' } });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('throws when all of solar/battery/consumers are empty', () => {
    const c = minimalConfig({ consumers: [] });
    expect(() => validateConfig(c)).toThrow(/at least one/i);
  });

  it('throws on bad version', () => {
    const c = { ...minimalConfig(), version: 99 as never };
    expect(() => validateConfig(c)).toThrow(/version/i);
  });

  it('throws on bad entity_id format', () => {
    const c = minimalConfig({ solar: [{ id: 'd', power: 'not_a_sensor' }] });
    expect(() => validateConfig(c)).toThrow(/entity/i);
  });

  it('throws on bad home.power entity_id', () => {
    const c = minimalConfig({ home: { power: 'not_an_entity' } });
    expect(() => validateConfig(c)).toThrow(/home\.power/i);
  });

  it('accepts the HA stub-config (empty grid.power + empty lists)', () => {
    const stub = {
      type: 'custom:custom-energy-flow-card' as const,
      grid: { power: '' },
      solar: [],
      battery: [],
      consumers: [],
    };
    expect(() => validateConfig(stub)).not.toThrow();
  });
});

describe('buildSystemState', () => {
  const buildHass = (
    states: Record<string, { state: string; attributes?: Record<string, unknown> }>,
  ): ReadSensorHassShape => ({ states });

  it('maps charged_by to pairedPvId', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s_dach' }],
      battery: [{ id: 'b_dach', soc: 'sensor.b_soc', power: 'sensor.b_p', charged_by: 'dach' }],
    });
    const hass = buildHass({
      'sensor.s_dach': { state: '1500', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '50', attributes: { unit_of_measurement: '%' } },
      'sensor.b_p': { state: '300', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.x': { state: '50', attributes: { unit_of_measurement: 'W' } },
    });
    const r = buildSystemState(config, hass);
    expect(r.state.battery[0]?.pairedPvId).toBe('dach');
    expect(r.state.pv[0]?.powerW).toBe(1500);
    expect(r.warnings).toEqual([]);
    expect(r.unavailableEntities.size).toBe(0);
  });

  it('inverts battery sign when power_invert: true', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          power: 'sensor.b_p',
          power_invert: true,
          charged_by: 'dach',
        },
      ],
    });
    const hass = buildHass({
      'sensor.s': { state: '1000', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '50', attributes: { unit_of_measurement: '%' } },
      'sensor.b_p': { state: '500', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.battery[0]?.powerW).toBe(-500);
  });

  it('combines import + export grid sensors into signed powerW', () => {
    const config = minimalConfig({ grid: { import: 'sensor.gi', export: 'sensor.ge' } });
    const hass = buildHass({
      'sensor.gi': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.ge': { state: '300', attributes: { unit_of_measurement: 'W' } },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.grid.powerW).toBe(-300);
  });

  it('collects warnings + tracks unavailable entities', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s_dach' }],
    });
    const hass = buildHass({
      'sensor.s_dach': { state: 'unavailable' },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    const r = buildSystemState(config, hass);
    expect(r.warnings.some((w) => w.code === 'SENSOR_UNAVAILABLE')).toBe(true);
    expect(r.unavailableEntities.has('sensor.s_dach')).toBe(true);
  });

  it('exposes batterySoc map for available SoC sensors', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s_dach' }],
      battery: [{ id: 'b_dach', soc: 'sensor.b_soc', power: 'sensor.b_p', charged_by: 'dach' }],
    });
    const hass = buildHass({
      'sensor.s_dach': { state: '1500', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '73', attributes: { unit_of_measurement: '%' } },
      'sensor.b_p': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.x': { state: '0' },
    });
    const r = buildSystemState(config, hass);
    expect(r.batterySoc.get('b_dach')).toBe(73);
  });

  it('omits battery from batterySoc map when soc sensor is unavailable', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s_dach' }],
      battery: [{ id: 'b_dach', soc: 'sensor.b_soc', power: 'sensor.b_p', charged_by: 'dach' }],
    });
    const hass = buildHass({
      'sensor.s_dach': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: 'unavailable' },
      'sensor.b_p': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.x': { state: '0' },
    });
    const r = buildSystemState(config, hass);
    expect(r.batterySoc.has('b_dach')).toBe(false);
    expect(r.unavailableEntities.has('sensor.b_soc')).toBe(true);
  });

  it('exposes displayConsumers + unavailableGroups (none mode)', () => {
    const config = minimalConfig({
      consumers: [{ name: 'TV', power: 'sensor.tv' }],
    });
    const hass = buildHass({
      'sensor.tv': { state: '100', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    const r = buildSystemState(config, hass);
    expect(r.displayConsumers).toHaveLength(1);
    expect(r.displayConsumers[0]).toMatchObject({ id: 'c0', members: ['sensor.tv'] });
    expect(r.unavailableGroups.size).toBe(0);
  });

  it('marks group as unavailable when ALL members are unavailable', () => {
    const config = minimalConfig({
      consumers: [
        { name: 'A', power: 'sensor.a' },
        { name: 'B', power: 'sensor.b' },
      ],
      display: { consumer_grouping: 'by_area' },
    });
    const hass: ReadSensorHassShape & DeriveConsumersHassShape = {
      states: {
        'sensor.a': { state: 'unavailable' },
        'sensor.b': { state: 'unavailable' },
        'sensor.grid': { state: '0' },
        'sensor.x': { state: '0' },
      },
      entities: {
        'sensor.a': { area_id: 'kueche' },
        'sensor.b': { area_id: 'kueche' },
      },
      areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
    };
    const r = buildSystemState(config, hass);
    expect(r.displayConsumers[0]?.id).toBe('g_kueche');
    expect(r.unavailableGroups.has('g_kueche')).toBe(true);
  });

  it('keeps group available if at least one member is available', () => {
    const config = minimalConfig({
      consumers: [
        { name: 'A', power: 'sensor.a' },
        { name: 'B', power: 'sensor.b' },
      ],
      display: { consumer_grouping: 'by_area' },
    });
    const hass: ReadSensorHassShape & DeriveConsumersHassShape = {
      states: {
        'sensor.a': { state: 'unavailable' },
        'sensor.b': { state: '50', attributes: { unit_of_measurement: 'W' } },
        'sensor.grid': { state: '0' },
        'sensor.x': { state: '0' },
      },
      entities: {
        'sensor.a': { area_id: 'kueche' },
        'sensor.b': { area_id: 'kueche' },
      },
      areas: { kueche: { area_id: 'kueche', name: 'Küche' } },
    };
    const r = buildSystemState(config, hass);
    expect(r.unavailableGroups.has('g_kueche')).toBe(false);
    expect(r.state.consumer[0]?.powerW).toBe(50);
  });
});

describe('validateConfig (negative paths)', () => {
  it('throws when input is null', () => {
    expect(() => validateConfig(null)).toThrow(/object/i);
  });

  it('throws when input is a number', () => {
    expect(() => validateConfig(123)).toThrow(/object/i);
  });

  it('throws on missing battery[].id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        // intentionally omit id — test-boundary cast
        {
          soc: 'sensor.b_soc',
          power: 'sensor.b_p',
          charged_by: 'dach',
        } as unknown as Config['battery'][number],
      ],
    });
    expect(() => validateConfig(c)).toThrow(/id required/i);
  });

  it('throws on empty battery[].charged_by', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [{ id: 'b', soc: 'sensor.b_soc', power: 'sensor.b_p', charged_by: '' }],
    });
    expect(() => validateConfig(c)).toThrow(/charged_by required/i);
  });

  it('throws on bad battery[].soc entity_id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [{ id: 'b', soc: 'not_an_entity', power: 'sensor.b_p', charged_by: 'dach' }],
    });
    expect(() => validateConfig(c)).toThrow(/soc.*entity/i);
  });

  it('throws on bad battery[].power entity_id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [{ id: 'b', soc: 'sensor.b_soc', power: 'not_an_entity', charged_by: 'dach' }],
    });
    expect(() => validateConfig(c)).toThrow(/battery.*power.*entity/i);
  });

  it('throws on missing consumers[].name', () => {
    const c = minimalConfig({
      consumers: [
        // intentionally omit name — test-boundary cast
        { power: 'sensor.x' } as unknown as Config['consumers'][number],
      ],
    });
    expect(() => validateConfig(c)).toThrow(/name required/i);
  });

  it('throws on bad consumers[].power entity_id', () => {
    const c = minimalConfig({ consumers: [{ name: 'X', power: 'not_an_entity' }] });
    expect(() => validateConfig(c)).toThrow(/consumers.*entity/i);
  });

  it('throws on missing solar[].id', () => {
    const c = minimalConfig({
      // intentionally omit id — test-boundary cast
      solar: [{ power: 'sensor.s' } as unknown as Config['solar'][number]],
    });
    expect(() => validateConfig(c)).toThrow(/solar.*id required/i);
  });

  it('throws on bad grid.power entity_id', () => {
    const c = minimalConfig({ grid: { power: 'foo' } });
    expect(() => validateConfig(c)).toThrow(/grid\.power/i);
  });

  it('throws on bad grid.import / grid.export entity_ids', () => {
    const c = minimalConfig({ grid: { import: 's.i', export: 'x' } });
    expect(() => validateConfig(c)).toThrow(/import.*export.*entity/i);
  });
});

describe('BatteryConfig split charge/discharge', () => {
  const buildHass = (
    states: Record<string, { state: string; attributes?: Record<string, unknown> }>,
  ): ReadSensorHassShape => ({ states });

  it('validateConfig accepts split variant (charge_power + discharge_power)', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charge_power: 'sensor.b_chg',
          discharge_power: 'sensor.b_dch',
          charged_by: 'dach',
        },
      ],
    });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('validateConfig throws when both "power" AND "charge_power" are set', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          power: 'sensor.b_p',
          charge_power: 'sensor.b_chg',
          discharge_power: 'sensor.b_dch',
          charged_by: 'dach',
        } as unknown as Config['battery'][number],
      ],
    });
    expect(() => validateConfig(c)).toThrow(/battery.*both|either/i);
  });

  it('validateConfig throws when neither "power" nor split sensors are set', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charged_by: 'dach',
        } as unknown as Config['battery'][number],
      ],
    });
    expect(() => validateConfig(c)).toThrow(/battery.*power.*required/i);
  });

  it('validateConfig throws on bad charge_power entity_id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charge_power: 'not_an_entity',
          discharge_power: 'sensor.b_dch',
          charged_by: 'dach',
        },
      ],
    });
    expect(() => validateConfig(c)).toThrow(/charge_power.*entity/i);
  });

  it('validateConfig throws on bad discharge_power entity_id', () => {
    const c = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charge_power: 'sensor.b_chg',
          discharge_power: 'not_an_entity',
          charged_by: 'dach',
        },
      ],
    });
    expect(() => validateConfig(c)).toThrow(/discharge_power.*entity/i);
  });

  it('buildSystemState aggregates split variant: charging only → +powerW', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charge_power: 'sensor.b_chg',
          discharge_power: 'sensor.b_dch',
          charged_by: 'dach',
        },
      ],
    });
    const hass = buildHass({
      'sensor.s': { state: '1000', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '50', attributes: { unit_of_measurement: '%' } },
      'sensor.b_chg': { state: '600', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_dch': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.battery[0]?.powerW).toBe(600);
  });

  it('buildSystemState aggregates split variant: discharging only → −powerW', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charge_power: 'sensor.b_chg',
          discharge_power: 'sensor.b_dch',
          charged_by: 'dach',
        },
      ],
    });
    const hass = buildHass({
      'sensor.s': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '40', attributes: { unit_of_measurement: '%' } },
      'sensor.b_chg': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_dch': { state: '400', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.battery[0]?.powerW).toBe(-400);
  });

  it('buildSystemState aggregates split variant: both 0 → 0', () => {
    const config = minimalConfig({
      solar: [{ id: 'dach', power: 'sensor.s' }],
      battery: [
        {
          id: 'b',
          soc: 'sensor.b_soc',
          charge_power: 'sensor.b_chg',
          discharge_power: 'sensor.b_dch',
          charged_by: 'dach',
        },
      ],
    });
    const hass = buildHass({
      'sensor.s': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_soc': { state: '30', attributes: { unit_of_measurement: '%' } },
      'sensor.b_chg': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.b_dch': { state: '0', attributes: { unit_of_measurement: 'W' } },
      'sensor.grid': { state: '0' },
      'sensor.x': { state: '0' },
    });
    expect(buildSystemState(config, hass).state.battery[0]?.powerW).toBe(0);
  });
});

describe('validateConfig consumer_grouping', () => {
  it('accepts consumer_grouping: none', () => {
    const c = minimalConfig({ display: { consumer_grouping: 'none' } });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('accepts consumer_grouping: by_area', () => {
    const c = minimalConfig({ display: { consumer_grouping: 'by_area' } });
    expect(() => validateConfig(c)).not.toThrow();
  });

  it('throws on invalid consumer_grouping value', () => {
    const c = minimalConfig({ display: { consumer_grouping: 'invalid' as unknown as 'none' } });
    expect(() => validateConfig(c)).toThrow(/consumer_grouping/);
  });
});
