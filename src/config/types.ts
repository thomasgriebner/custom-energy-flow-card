import type { ColorRole } from '../util/resolve-color';

export interface Config {
  type: 'custom:custom-energy-flow-card';
  version?: 1;
  title?: string;
  solar: SolarConfig[];
  battery: BatteryConfig[];
  grid: GridConfig;
  home?: HomeConfig;
  consumers: ConsumerConfig[];
  display?: DisplayConfig;
}

export interface SolarConfig {
  id: string;
  name?: string;
  power: string;
  icon?: string;
}

export interface BatteryConfigBase {
  id: string;
  name?: string;
  soc: string;
  charged_by: string;
  icon?: string;
}

/** Signed-Sensor-Variante: ein power-Sensor liefert +laden / −entladen. */
export type BatteryConfigSigned = BatteryConfigBase & {
  power: string;
  power_invert?: boolean;
};

/** Split-Sensor-Variante: zwei separate Sensoren, beide ≥ 0. */
export type BatteryConfigSplit = BatteryConfigBase & {
  charge_power: string;
  discharge_power: string;
};

export type BatteryConfig = BatteryConfigSigned | BatteryConfigSplit;

export type GridConfig =
  | { power: string; power_invert?: boolean }
  | { import: string; export: string };

export interface HomeConfig {
  name?: string;
  power?: string;
  icon?: string;
}

export interface ConsumerConfig {
  name: string;
  power: string;
  icon?: string;
}

export interface DisplayConfig {
  active_threshold_w?: number;
  number_format?: 'standard' | 'grouped';
  show_inactive_paths?: boolean;
  animation?: AnimationConfig;
  colors?: Partial<Record<ColorRole, string>>;
  consumer_grouping?: 'none' | 'by_area';
  /** Wenn true: ausführliches console-Logging der HA-Lifecycle-Schritte. Für Bug-Reports. */
  debug?: boolean;
}

export interface AnimationConfig {
  base_duration_s?: number;
  reference_power_w?: number;
  min_duration_s?: number;
  max_dots_per_path?: number;
}

export interface DisplayConsumer {
  /** Stabile ID. 'none'-Mode: 'c0','c1'… | 'by_area': 'g_<areaId>' bzw. 'g_unassigned'. */
  id: string;
  /** Anzeige-Name (von Area oder vom einzelnen consumer).
   * undefined ⇔ unassigned-group (Renderer löst gegen ctx.t.nodes.unassignedGroup auf, siehe Subspec §2.2) */
  name?: string;
  /** Optional, Auflösung siehe deriveDisplayConsumers Algorithmus. */
  icon?: string;
  /** Entity-IDs, deren powerW in diese Gruppe summiert wird. NIE leer. */
  members: string[];
  /** Falls aus Area aufgelöst; undefined im 'none'-Mode oder bei __unassigned. */
  areaId?: string;
}
