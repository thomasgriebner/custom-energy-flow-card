export type NodeKind = 'pv' | 'battery' | 'grid' | 'home' | 'consumer';

export type FlowEdgeKind =
  | 'pv-to-home'
  | 'pv-to-battery'
  | 'pv-to-grid'
  | 'battery-to-home'
  | 'battery-to-grid'
  | 'grid-to-home'
  | 'grid-to-battery' // Pairing-Defizit: Akku lädt aus Netz (siehe ADR-0007)
  | 'home-to-consumer';

export const FLOW_EDGE_KINDS: readonly FlowEdgeKind[] = [
  'pv-to-home',
  'pv-to-battery',
  'pv-to-grid',
  'battery-to-home',
  'battery-to-grid',
  'grid-to-home',
  'grid-to-battery',
  'home-to-consumer',
] as const;
