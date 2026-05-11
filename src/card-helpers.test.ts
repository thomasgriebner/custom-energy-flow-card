import { describe, expect, it } from 'vitest';
import { buildCardState } from './card-helpers';
import type { Config } from './config/types';
import type { HomeAssistant } from './ha/ha-types';

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
