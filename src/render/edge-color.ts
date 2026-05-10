import type { FlowEdgeKind } from '../engine/flow-graph';
import type { ColorRole } from '../util/resolve-color';

export function edgeColorRole(kind: FlowEdgeKind): ColorRole {
  switch (kind) {
    case 'pv-to-home':
    case 'pv-to-battery':
      return 'solar';
    case 'pv-to-grid':
    case 'battery-to-grid':
      return 'grid_export';
    case 'battery-to-home':
      return 'battery';
    case 'grid-to-home':
    case 'grid-to-battery': // Strom kommt aus dem Netz → grid_import
      return 'grid_import';
    case 'home-to-consumer':
      return 'consumer';
  }
}
