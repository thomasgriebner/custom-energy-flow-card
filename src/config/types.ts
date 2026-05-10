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

export interface BatteryConfig {
  id: string;
  name?: string;
  soc: string;
  power: string;
  power_invert?: boolean;
  charged_by: string;
  icon?: string;
}

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
  /** Wenn true: ausführliches console-Logging der HA-Lifecycle-Schritte. Für Bug-Reports. */
  debug?: boolean;
}

export interface AnimationConfig {
  base_duration_s?: number;
  reference_power_w?: number;
  min_duration_s?: number;
  max_dots_per_path?: number;
}
