import { readSensorW, type ReadSensorHassShape } from '../util/read-sensor';
import { deriveDisplayConsumers, type DeriveConsumersHassShape } from './derive-display-consumers';
import type { Config, DisplayConsumer } from './types';
import type { SystemState } from '../engine/types';
import type { EngineWarning } from '../util/warning-types';

export interface BuildResult {
  state: SystemState;
  warnings: EngineWarning[];
  unavailableEntities: Set<string>;
  /** Pro-Akku SoC (%); fehlt, wenn der zugehörige soc-Sensor unavailable ist. */
  batterySoc: Map<string, number>;
  /** Display-Consumers (resolved by deriveDisplayConsumers). */
  displayConsumers: DisplayConsumer[];
  /** Group-IDs deren ALLE members unavailable sind. */
  unavailableGroups: Set<string>;
}

export function buildSystemState(
  config: Config,
  hass: ReadSensorHassShape & DeriveConsumersHassShape,
): BuildResult {
  const warnings: EngineWarning[] = [];
  const unavailable = new Set<string>();

  const read = (entityId: string, opts?: Parameters<typeof readSensorW>[2]): number => {
    const r = readSensorW(hass, entityId, opts);
    if (r.warning) {
      warnings.push(r.warning);
      if (r.warning.code === 'SENSOR_UNAVAILABLE') unavailable.add(entityId);
    }
    return r.value;
  };

  const pv = config.solar.map((s) => ({ id: s.id, powerW: read(s.power) }));

  const battery = config.battery.map((b) => {
    let powerW: number;
    if ('power' in b) {
      powerW = read(b.power, { invertSign: b.power_invert });
    } else {
      const charge = read(b.charge_power);
      const discharge = read(b.discharge_power);
      powerW = charge - discharge;
    }
    return {
      id: b.id,
      pairedPvId: b.charged_by,
      powerW,
      socPct: read(b.soc, { expectedUnit: '%' }),
    };
  });

  let gridPowerW = 0;
  if ('power' in config.grid) {
    gridPowerW = read(config.grid.power, { invertSign: config.grid.power_invert });
  } else {
    const imp = read(config.grid.import);
    const exp = read(config.grid.export);
    gridPowerW = imp - exp;
  }

  const derived = deriveDisplayConsumers(config, hass);
  warnings.push(...derived.warnings);

  const consumer = derived.consumers.map((g) => {
    const powerW = g.members.reduce((sum, m) => sum + read(m), 0);
    return { id: g.id, powerW };
  });

  const unavailableGroups = new Set<string>();
  for (const g of derived.consumers) {
    if (g.members.every((m) => unavailable.has(m))) {
      unavailableGroups.add(g.id);
    }
  }

  const home: SystemState['home'] = {};
  if (config.home?.power) home.powerOverrideW = read(config.home.power);

  const batterySoc = new Map<string, number>();
  for (const b of config.battery) {
    if (unavailable.has(b.soc)) continue;
    const s = battery.find((x) => x.id === b.id);
    if (s && Number.isFinite(s.socPct)) batterySoc.set(b.id, s.socPct);
  }

  return {
    state: { pv, battery, grid: { powerW: gridPowerW }, consumer, home },
    warnings,
    unavailableEntities: unavailable,
    batterySoc,
    displayConsumers: derived.consumers,
    unavailableGroups,
  };
}
