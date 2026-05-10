import type { EngineWarning } from './warning-types';

export interface ReadSensorHassShape {
  states: Record<string, { state: string; attributes?: Record<string, unknown> } | undefined>;
}

export interface SensorReadOpts {
  invertSign?: boolean;
  treatUnavailableAsZero?: boolean;
  expectedUnit?: 'W' | '%';
}

export interface SensorReadResult {
  value: number;
  warning?: EngineWarning;
}

const UNIT_TO_W: Record<string, number> = {
  w: 1,
  watt: 1,
  watts: 1,
  kw: 1000,
  kilowatt: 1000,
  kilowatts: 1000,
  mw: 0.001,
  milliwatt: 0.001,
  milliwatts: 0.001,
  va: 1,
};

const UNAVAILABLE_STATES = new Set(['unavailable', 'unknown', '', 'none']);

export function readSensorW(
  hass: ReadSensorHassShape,
  entityId: string,
  opts: SensorReadOpts = {},
): SensorReadResult {
  const entity = hass.states[entityId];
  if (!entity) {
    return {
      value: 0,
      warning: {
        code: 'SENSOR_UNAVAILABLE',
        detail: `Entity ${entityId} not in hass.states`,
        entityId,
      },
    };
  }
  const stateRaw = (entity.state ?? '').trim();
  if (UNAVAILABLE_STATES.has(stateRaw.toLowerCase())) {
    return {
      value: 0,
      warning: {
        code: 'SENSOR_UNAVAILABLE',
        detail: `${entityId} is ${stateRaw || 'empty'}`,
        entityId,
      },
    };
  }
  const num = Number(stateRaw);
  if (!Number.isFinite(num)) {
    return {
      value: 0,
      warning: {
        code: 'SENSOR_UNAVAILABLE',
        detail: `${entityId} state '${stateRaw}' is not numeric`,
        entityId,
      },
    };
  }

  if (opts.expectedUnit === '%') {
    return { value: num };
  }

  const unitRaw = (entity.attributes?.['unit_of_measurement'] as string | undefined) ?? '';
  const unit = unitRaw.toLowerCase().trim();
  let factor = 1;
  let warning: EngineWarning | undefined;
  if (unit === '') {
    factor = 1;
  } else if (unit in UNIT_TO_W) {
    factor = UNIT_TO_W[unit] ?? 1;
  } else {
    warning = {
      code: 'UNIT_UNKNOWN',
      detail: `${entityId} unit '${unitRaw}' unknown, treating as W`,
      entityId,
    };
    factor = 1;
  }

  let value = num * factor;
  if (opts.invertSign) value = -value;
  return warning ? { value, warning } : { value };
}
