import { DE } from '../i18n/de';
import type { Config, DisplayConsumer } from './types';
import type { EngineWarning } from '../util/warning-types';

/**
 * Minimal HA-Registry-Shape, der für die Area-Gruppierung gebraucht wird.
 * Wir importieren `HomeAssistant` bewusst NICHT direkt aus `ha/ha-types`, damit
 * der ESLint-Layer-Boundary `config → ha` nicht verletzt wird (siehe ADR-0009).
 * Die Felder sind strukturell kompatibel mit `HomeAssistant` aus `ha/ha-types.ts`.
 */
export interface DeriveConsumersHassShape {
  entities?: Record<string, { area_id?: string | null; device_id?: string | null } | undefined>;
  devices?: Record<string, { area_id?: string | null } | undefined>;
  areas?: Record<string, { area_id: string; name: string; icon?: string } | undefined>;
}

const compareDe = (a: string, b: string): number =>
  a.localeCompare(b, 'de', { sensitivity: 'base' });

export function deriveDisplayConsumers(
  config: Config,
  hass: DeriveConsumersHassShape,
): { consumers: DisplayConsumer[]; warnings: EngineWarning[] } {
  const warnings: EngineWarning[] = [];
  const grouping = config.display?.consumer_grouping ?? 'none';

  if (grouping !== 'by_area' || !hass.entities) {
    if (grouping === 'by_area' && !hass.entities) {
      warnings.push({
        code: 'REGISTRY_UNAVAILABLE',
        detail: 'hass.entities missing; falling back to none-mode',
      });
    }
    return { consumers: mapNoneMode(config), warnings };
  }

  return groupByArea(config, hass, warnings);
}

function mapNoneMode(config: Config): DisplayConsumer[] {
  return config.consumers.map((c, i) => ({
    id: `c${i}`,
    name: c.name || `${DE.nodes.consumer} ${i + 1}`,
    icon: c.icon,
    members: [c.power],
    areaId: undefined,
  }));
}

function groupByArea(
  config: Config,
  hass: DeriveConsumersHassShape,
  warnings: EngineWarning[],
): { consumers: DisplayConsumer[]; warnings: EngineWarning[] } {
  const byArea = new Map<string, string[]>();

  for (const c of config.consumers) {
    const areaId = resolveAreaId(c.power, hass);
    const key = areaId ?? '__unassigned';
    const list = byArea.get(key) ?? [];
    list.push(c.power);
    byArea.set(key, list);
  }

  const seenMissingArea = new Set<string>();
  const groups: DisplayConsumer[] = [];

  for (const [key, members] of byArea) {
    if (key === '__unassigned') {
      groups.push({
        id: 'g_unassigned',
        name: undefined,
        members,
        areaId: undefined,
      });
      continue;
    }
    const areaEntry = hass.areas?.[key];
    let name: string;
    let icon: string | undefined;
    if (areaEntry) {
      name = areaEntry.name;
      icon = areaEntry.icon;
    } else {
      name = key;
      if (!seenMissingArea.has(key)) {
        warnings.push({
          code: 'AREA_NOT_FOUND',
          detail: `hass.areas['${key}'] missing — falling back to area_id as name`,
        });
        seenMissingArea.add(key);
      }
    }
    groups.push({
      id: `g_${key}`,
      name,
      icon,
      members,
      areaId: key,
    });
  }

  groups.sort((a, b) => {
    if (a.id === 'g_unassigned') return 1;
    if (b.id === 'g_unassigned') return -1;
    const byName = compareDe(a.name, b.name);
    return byName !== 0 ? byName : compareDe(a.id, b.id);
  });

  return { consumers: groups, warnings };
}

function resolveAreaId(entityId: string, hass: DeriveConsumersHassShape): string | undefined {
  const entity = hass.entities?.[entityId];
  if (!entity) return undefined;
  if (entity.area_id) return entity.area_id;
  if (entity.device_id) {
    const device = hass.devices?.[entity.device_id];
    if (device?.area_id) return device.area_id;
  }
  return undefined;
}
