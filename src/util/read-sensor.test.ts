import { describe, expect, it } from 'vitest';
import { readSensorW, type ReadSensorHassShape } from './read-sensor';

const buildHass = (
  states: Record<string, { state: string; attributes?: Record<string, unknown> }>,
): ReadSensorHassShape => ({ states });

describe('readSensorW', () => {
  it('reads W sensor as-is', () => {
    const hass = buildHass({
      'sensor.pv': { state: '1500', attributes: { unit_of_measurement: 'W' } },
    });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(1500);
  });

  it('converts kW to W', () => {
    const hass = buildHass({
      'sensor.pv': { state: '2.5', attributes: { unit_of_measurement: 'kW' } },
    });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(2500);
  });

  it('converts mW to W', () => {
    const hass = buildHass({
      'sensor.pv': { state: '500', attributes: { unit_of_measurement: 'mW' } },
    });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(0.5);
  });

  it('treats missing unit as W', () => {
    const hass = buildHass({ 'sensor.pv': { state: '900' } });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(900);
  });

  it('warns for unknown unit but uses raw', () => {
    const hass = buildHass({
      'sensor.pv': { state: '50', attributes: { unit_of_measurement: 'foo' } },
    });
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(50);
    expect(r.warning?.code).toBe('UNIT_UNKNOWN');
  });

  it('returns 0 + warning for unavailable state', () => {
    const hass = buildHass({ 'sensor.pv': { state: 'unavailable' } });
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
  });

  it('returns 0 + warning when entity missing', () => {
    const r = readSensorW(buildHass({}), 'sensor.missing');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
  });

  it('returns 0 + warning for non-numeric state', () => {
    const hass = buildHass({ 'sensor.pv': { state: 'foo' } });
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
  });

  it('inverts sign when invertSign=true', () => {
    const hass = buildHass({
      'sensor.batt': { state: '500', attributes: { unit_of_measurement: 'W' } },
    });
    expect(readSensorW(hass, 'sensor.batt', { invertSign: true }).value).toBe(-500);
  });

  it('handles percentage with expectedUnit=%', () => {
    const hass = buildHass({
      'sensor.soc': { state: '75', attributes: { unit_of_measurement: '%' } },
    });
    expect(readSensorW(hass, 'sensor.soc', { expectedUnit: '%' }).value).toBe(75);
  });

  it('treats undefined state as unavailable (covers state ?? "" fallback)', () => {
    // Test-boundary cast: simulate HA returning an entity object whose
    // `state` field is undefined (off-spec but seen in the wild during
    // entity-restart races).
    const hass: ReadSensorHassShape = {
      states: {
        'sensor.pv': { state: undefined as unknown as string },
      },
    };
    const r = readSensorW(hass, 'sensor.pv');
    expect(r.value).toBe(0);
    expect(r.warning?.code).toBe('SENSOR_UNAVAILABLE');
    // covers `${entityId} is ${stateRaw || 'empty'}` → 'empty' arm
    expect(r.warning?.detail).toContain('empty');
  });

  it('skips unit conversion when expectedUnit="%" (early-return path)', () => {
    // Even with a unit attribute that would normally trigger UNIT_UNKNOWN
    // or kW conversion, expectedUnit='%' must short-circuit and return raw.
    const hass = buildHass({
      'sensor.soc': { state: '42', attributes: { unit_of_measurement: 'kW' } },
    });
    const r = readSensorW(hass, 'sensor.soc', { expectedUnit: '%' });
    expect(r.value).toBe(42);
    expect(r.warning).toBeUndefined();
  });

  it('trims whitespace from state before parsing', () => {
    const hass = buildHass({
      'sensor.pv': { state: '  1500  ', attributes: { unit_of_measurement: 'W' } },
    });
    expect(readSensorW(hass, 'sensor.pv').value).toBe(1500);
  });
});
