import { readSensorW, type ReadSensorHassShape } from '../util/read-sensor';
import { deriveDisplayConsumers, type DeriveConsumersHassShape } from './derive-display-consumers';
import type {
  BatteryConfig,
  BatteryConfigSigned,
  BatteryConfigSplit,
  Config,
  DisplayConsumer,
  GridConfig,
  SolarConfig,
} from './types';
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

const ENTITY_RE = /^[a-z_][a-z0-9_]*\.[a-z0-9_]+$/i;

/**
 * The HA card-picker calls `setConfig` with `getStubConfig()` (empty grid.power +
 * all lists empty) before the user has filled anything in. We accept this
 * marker config as valid so the card shows a friendly hint instead of crashing.
 */
function isStubShape(c: Partial<Config>): boolean {
  if (c.type !== 'custom:custom-energy-flow-card') return false;
  const gridStub = !!c.grid && 'power' in c.grid && c.grid.power === '';
  const listsEmpty =
    (c.solar?.length ?? 0) === 0 &&
    (c.battery?.length ?? 0) === 0 &&
    (c.consumers?.length ?? 0) === 0;
  return gridStub && listsEmpty;
}

export function validateConfig(input: unknown): Config {
  if (!isObject(input)) throw new Error('Config must be an object');
  const c = input as Partial<Config>;

  if (c.type !== 'custom:custom-energy-flow-card') {
    throw new Error('Config "type" must be "custom:custom-energy-flow-card"');
  }

  // Stub-Config aus getStubConfig() ist absichtlich gültig — Card rendert dann
  // den "Konfiguriere PV/Akku/Verbraucher"-Hinweis (UX-Zustand "Stub").
  if (isStubShape(c)) {
    return {
      type: 'custom:custom-energy-flow-card',
      version: 1,
      solar: [],
      battery: [],
      grid: c.grid as GridConfig,
      consumers: [],
    };
  }

  if (c.version !== undefined && c.version !== 1) {
    throw new Error(`Config "version" ${c.version} not supported (only 1)`);
  }

  const solar = (c.solar ?? []) as SolarConfig[];
  const battery = (c.battery ?? []) as BatteryConfig[];
  const consumers = (c.consumers ?? []) as Config['consumers'];

  validateUniqueIds(
    solar.map((s) => s.id),
    'solar',
  );
  validateUniqueIds(
    battery.map((b) => b.id),
    'battery',
  );

  for (const s of solar) {
    if (!s.id) throw new Error('solar[].id required');
    if (!s.power || !ENTITY_RE.test(s.power)) {
      throw new Error(`solar[${s.id}].power must be a valid entity_id`);
    }
  }

  const solarIds = new Set(solar.map((s) => s.id));
  const pairedPvCounts = new Map<string, number>();
  for (const b of battery) {
    if (!b.id) throw new Error('battery[].id required');
    if (!b.charged_by) throw new Error(`battery[${b.id}].charged_by required`);
    if (!solarIds.has(b.charged_by)) {
      throw new Error(`battery[${b.id}].charged_by "${b.charged_by}" not in solar`);
    }
    pairedPvCounts.set(b.charged_by, (pairedPvCounts.get(b.charged_by) ?? 0) + 1);
    if (!b.soc || !ENTITY_RE.test(b.soc)) {
      throw new Error(`battery[${b.id}].soc must be a valid entity_id`);
    }
    validateBatteryPower(b);
  }
  for (const [pvId, count] of pairedPvCounts) {
    if (count > 1) {
      throw new Error(`Solar ${pvId} is paired to ${count} batteries; only 1:1 allowed`);
    }
  }

  if (!c.grid) throw new Error('grid is required');
  validateGrid(c.grid);

  for (const cons of consumers) {
    if (!cons.name) throw new Error('consumers[].name required');
    if (!cons.power || !ENTITY_RE.test(cons.power)) {
      throw new Error(`consumers[${cons.name}].power must be a valid entity_id`);
    }
  }

  if (solar.length === 0 && battery.length === 0 && consumers.length === 0) {
    throw new Error('Config must have at least one of solar, battery, or consumers');
  }

  if (c.home?.power !== undefined && !ENTITY_RE.test(c.home.power)) {
    throw new Error('home.power must be a valid entity_id');
  }

  if (c.display?.consumer_grouping !== undefined) {
    const cg = c.display.consumer_grouping;
    if (cg !== 'none' && cg !== 'by_area') {
      throw new Error(`display.consumer_grouping must be 'none' or 'by_area', got '${cg}'`);
    }
  }

  return {
    type: 'custom:custom-energy-flow-card',
    version: c.version ?? 1,
    title: c.title,
    solar,
    battery,
    grid: c.grid,
    home: c.home,
    consumers,
    display: c.display,
  };
}

function validateBatteryPower(b: BatteryConfig): void {
  const hasPower = 'power' in b && typeof b.power === 'string';
  const hasSplit =
    'charge_power' in b &&
    typeof (b as Partial<BatteryConfigSplit>).charge_power === 'string' &&
    'discharge_power' in b &&
    typeof (b as Partial<BatteryConfigSplit>).discharge_power === 'string';
  if (hasPower && hasSplit) {
    throw new Error(
      `battery[${b.id}] must have either "power" or both "charge_power"+"discharge_power", not both`,
    );
  }
  if (!hasPower && !hasSplit) {
    throw new Error(`battery[${b.id}].power required (or both "charge_power"+"discharge_power")`);
  }
  if (hasPower) {
    const signed = b as BatteryConfigSigned;
    if (!signed.power || !ENTITY_RE.test(signed.power)) {
      throw new Error(`battery[${b.id}].power must be a valid entity_id`);
    }
  } else {
    const split = b as BatteryConfigSplit;
    if (!split.charge_power || !ENTITY_RE.test(split.charge_power)) {
      throw new Error(`battery[${b.id}].charge_power must be a valid entity_id`);
    }
    if (!split.discharge_power || !ENTITY_RE.test(split.discharge_power)) {
      throw new Error(`battery[${b.id}].discharge_power must be a valid entity_id`);
    }
  }
}

function validateGrid(grid: GridConfig): void {
  const hasPower = 'power' in grid && typeof grid.power === 'string';
  const hasImportExport = 'import' in grid && 'export' in grid;
  if (hasPower === hasImportExport) {
    throw new Error(
      'grid must have either "power" or both "import"+"export", not both, not neither',
    );
  }
  if (hasPower) {
    if (!ENTITY_RE.test((grid as { power: string }).power)) {
      throw new Error('grid.power must be a valid entity_id');
    }
  } else {
    const g = grid as { import: string; export: string };
    if (!ENTITY_RE.test(g.import) || !ENTITY_RE.test(g.export)) {
      throw new Error('grid.import and grid.export must be valid entity_ids');
    }
  }
}

function validateUniqueIds(ids: string[], scope: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new Error(`Duplicate ${scope}.id "${id}"`);
    }
    seen.add(id);
  }
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
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
