import type { EngineWarning } from '../util/warning-types';

export interface SystemState {
  pv: PvState[];
  battery: BatteryState[];
  grid: GridState;
  consumer: ConsumerState[];
  home: { powerOverrideW?: number };
}

export interface PvState {
  id: string;
  powerW: number;
}

export interface BatteryState {
  id: string;
  pairedPvId: string;
  powerW: number;
  socPct: number;
}

export interface GridState {
  powerW: number;
}

export interface ConsumerState {
  id: string;
  powerW: number;
}

export interface FlowResult {
  homeW: number;
  flows: FlowSet;
  homeAttribution: HomeAttribution;
  pairingDeficit: PairingDeficit[];
  warnings: EngineWarning[];
}

export interface FlowSet {
  pvToHome: PerSourceFlow[];
  pvToBattery: PerSourceFlow[];
  pvToGrid: PerSourceFlow[];
  batteryToHome: PerSourceFlow[];
  batteryToGrid: PerSourceFlow[];
  gridToHome: number;
  /** Wenn ein Akku aus dem Netz geladen wird (PV reicht nicht): pairing_deficit. */
  gridToBattery: PerSourceFlow[];
  homeToConsumer: PerSourceFlow[];
}

export interface PerSourceFlow {
  sourceId: string;
  powerW: number;
}

export interface PairingDeficit {
  batteryId: string;
  deficitW: number;
}

export interface HomeAttribution {
  shares: AttributionShare[];
}

export interface AttributionShare {
  sourceKind: 'pv' | 'battery' | 'grid';
  sourceId?: string;
  share: number;
}

// Re-export the unified warning types from util as Single-Source.
// The ESLint zone for `engine` allows `./util/warning-types.ts`.
export type { EngineWarning, EngineWarningCode } from '../util/warning-types';
