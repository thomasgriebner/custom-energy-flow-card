import { describe, expect, it } from 'vitest';
import { buildSystemState, validateConfig } from './schema';
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
});
