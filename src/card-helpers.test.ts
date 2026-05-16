import { describe, expect, it } from 'vitest';
import {
  buildCardState,
  hassRelevantSensorsChanged,
  renderSkeleton,
  resolveEntityId,
} from './card-helpers';
import { resolveT } from './i18n';
import type { Config, DisplayConsumer } from './config/types';
import type { HomeAssistant } from './ha/ha-types';

const baseConfig = (over: Partial<Config> = {}): Config => ({
  type: 'custom:custom-energy-flow-card',
  solar: [{ id: 'pv1', power: 'sensor.pv' }],
  battery: [],
  grid: { power: 'sensor.grid' },
  consumers: [{ name: 'TV', power: 'sensor.tv' }],
  ...over,
});

describe('buildCardState', () => {
  it('returns build + flow with merged warnings', () => {
    const config: Config = {
      type: 'custom:custom-energy-flow-card',
      solar: [{ id: 'pv', power: 'sensor.pv' }],
      battery: [],
      grid: { power: 'sensor.grid' },
      consumers: [{ name: 'TV', power: 'sensor.tv' }],
    };
    const hass: HomeAssistant = {
      states: {
        'sensor.pv': { state: '1000', attributes: { unit_of_measurement: 'W' } },
        'sensor.grid': { state: '0', attributes: {} },
        'sensor.tv': { state: '50', attributes: { unit_of_measurement: 'W' } },
      },
    };
    const result = buildCardState(config, hass);
    expect(result.build.state.pv[0]?.powerW).toBe(1000);
    expect(result.flow.homeW).toBeGreaterThan(0);
    expect(result.flow.warnings).toEqual(expect.arrayContaining(result.build.warnings));
  });
});

describe('hassRelevantSensorsChanged', () => {
  it('returns true when prev is undefined', () => {
    expect(hassRelevantSensorsChanged(undefined, { states: {} }, baseConfig())).toBe(true);
  });

  it('returns true when a sensor state changed', () => {
    const prev: HomeAssistant = { states: { 'sensor.pv': { state: '100', attributes: {} } } };
    const next: HomeAssistant = { states: { 'sensor.pv': { state: '200', attributes: {} } } };
    expect(hassRelevantSensorsChanged(prev, next, baseConfig())).toBe(true);
  });

  it('returns false when nothing relevant changed', () => {
    const hass: HomeAssistant = { states: { 'sensor.pv': { state: '100', attributes: {} } } };
    expect(hassRelevantSensorsChanged(hass, hass, baseConfig())).toBe(false);
  });

  it('returns true in by_area mode when entities ref changed', () => {
    const config = baseConfig({ display: { consumer_grouping: 'by_area' } });
    const prev: HomeAssistant = { states: {}, entities: {} };
    const next: HomeAssistant = { states: {}, entities: {} }; // different reference
    expect(hassRelevantSensorsChanged(prev, next, config)).toBe(true);
  });

  it('ignores entities ref change in none mode', () => {
    const prev: HomeAssistant = { states: {}, entities: {} };
    const next: HomeAssistant = { states: {}, entities: {} };
    expect(hassRelevantSensorsChanged(prev, next, baseConfig())).toBe(false);
  });
});

describe('resolveEntityId', () => {
  const dc: ReadonlyMap<string, DisplayConsumer> = new Map([
    ['c0', { id: 'c0', name: 'TV', members: ['sensor.tv'] }],
    [
      'g_kueche',
      {
        id: 'g_kueche',
        name: 'Küche',
        members: ['sensor.herd', 'sensor.spueler'],
        areaId: 'kueche',
      },
    ],
  ]);

  it('resolves solar id to power sensor', () => {
    expect(resolveEntityId(baseConfig(), 'pv1', dc)).toBe('sensor.pv');
  });

  it('resolves c0 to first consumer power', () => {
    expect(resolveEntityId(baseConfig(), 'c0', dc)).toBe('sensor.tv');
  });

  it('resolves group id to first member', () => {
    expect(resolveEntityId(baseConfig(), 'g_kueche', dc)).toBe('sensor.herd');
  });

  it('resolves __grid to grid sensor', () => {
    expect(resolveEntityId(baseConfig(), '__grid', dc)).toBe('sensor.grid');
  });

  it('returns undefined for unknown id', () => {
    expect(resolveEntityId(baseConfig(), 'g_nonsense', dc)).toBeUndefined();
  });
});

describe('renderSkeleton — Sprach-Branching', () => {
  it.each(['de', 'en'] as const)('rendert Loading-Text in %s', (lang) => {
    const T = resolveT(lang);
    const result = renderSkeleton(T);
    expect(JSON.stringify(result)).toContain(T.states.loading);
  });
});
