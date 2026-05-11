import { buildSystemState, type BuildResult } from './config/schema';
import { compute } from './engine/energy-engine';
import type { Config } from './config/types';
import type { FlowResult } from './engine/types';
import type { HomeAssistant } from './ha/ha-types';

export interface CardState {
  build: BuildResult;
  flow: FlowResult;
}

export function buildCardState(config: Config, hass: HomeAssistant): CardState {
  const build = buildSystemState(config, hass);
  const engineResult = compute(build.state);
  return {
    build,
    flow: {
      ...engineResult,
      warnings: [...build.warnings, ...engineResult.warnings],
    },
  };
}

export function isStubConfig(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false;
  const c = config as Partial<Config>;
  if (c.type !== 'custom:custom-energy-flow-card') return false;
  const gridEmpty = !c.grid || ('power' in c.grid && c.grid.power === '');
  const empty =
    (c.solar?.length ?? 0) === 0 &&
    (c.battery?.length ?? 0) === 0 &&
    (c.consumers?.length ?? 0) === 0;
  return gridEmpty && empty;
}

export function relevantSensorIds(config: Config): string[] {
  const ids: string[] = [];
  for (const s of config.solar) ids.push(s.power);
  for (const b of config.battery) {
    ids.push(b.soc);
    if ('power' in b) ids.push(b.power);
    else ids.push(b.charge_power, b.discharge_power);
  }
  if ('power' in config.grid) ids.push(config.grid.power);
  else ids.push(config.grid.import, config.grid.export);
  for (const c of config.consumers) ids.push(c.power);
  if (config.home?.power) ids.push(config.home.power);
  return ids;
}

export function hassRelevantSensorsChanged(
  prev: HomeAssistant | undefined,
  next: HomeAssistant | undefined,
  config: Config | undefined,
): boolean {
  if (!prev || !next || !config) return true;
  for (const id of relevantSensorIds(config)) {
    const a = prev.states[id]?.state;
    const b = next.states[id]?.state;
    if (a !== b) return true;
  }
  return false;
}

export function resolveEntityId(config: Config | undefined, nodeId: string): string | undefined {
  if (!config) return undefined;
  const solar = config.solar.find((s) => s.id === nodeId);
  if (solar) return solar.power;
  const battery = config.battery.find((b) => b.id === nodeId);
  if (battery) return 'power' in battery ? battery.power : battery.charge_power;
  if (nodeId === '__grid') return 'power' in config.grid ? config.grid.power : config.grid.import;
  if (nodeId === '__home') return config.home?.power;
  if (nodeId.startsWith('c')) {
    const idx = Number.parseInt(nodeId.slice(1), 10);
    return config.consumers[idx]?.power;
  }
  return undefined;
}
