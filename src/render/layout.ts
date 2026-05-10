import { VIEWBOX } from '../const';
import { bezierPath, straightPath, type Point } from '../util/svg-path';
import type { Config } from '../config/types';
import type { FlowEdgeKind, NodeKind } from '../engine/flow-graph';

export interface LayoutNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  r: number;
}

export interface LayoutEdge {
  id: string;
  kind: FlowEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  d: string;
}

export interface LayoutResult {
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

const NODE_R_LARGE = 50;
const NODE_R_MEDIUM = 42;
const NODE_R_SMALL = 32;
const TOP_Y = 80;
const BOTTOM_Y = 460;
const MIDDLE_Y = 270;
const GRID_X = 60;
const HOME_X = 360;
const CONSUMER_X = 660;
const PV_BAND_LEFT = 130;
const PV_BAND_RIGHT = 590;
const CONSUMER_Y_TOP = 160;
const CONSUMER_Y_GAP = 110;

export function computeLayout(config: Config): LayoutResult {
  const nodes: LayoutNode[] = [];

  // Solar (top): horizontal distribution
  const solarCount = config.solar.length;
  config.solar.forEach((s, i) => {
    const x =
      solarCount === 1
        ? HOME_X
        : PV_BAND_LEFT + ((PV_BAND_RIGHT - PV_BAND_LEFT) * i) / Math.max(1, solarCount - 1);
    nodes.push({ id: s.id, kind: 'pv', x, y: TOP_Y, r: NODE_R_MEDIUM });
  });

  // Grid (left)
  nodes.push({ id: '__grid', kind: 'grid', x: GRID_X, y: MIDDLE_Y, r: NODE_R_MEDIUM });

  // Home (center)
  nodes.push({ id: '__home', kind: 'home', x: HOME_X, y: MIDDLE_Y, r: NODE_R_LARGE });

  // Battery (bottom): each battery aligned x with paired PV
  config.battery.forEach((b) => {
    const pairedPv = nodes.find((n) => n.kind === 'pv' && n.id === b.charged_by);
    const x = pairedPv?.x ?? HOME_X;
    nodes.push({ id: b.id, kind: 'battery', x, y: BOTTOM_Y, r: NODE_R_MEDIUM });
  });

  // Consumers (right): vertical stack
  config.consumers.forEach((_c, i) => {
    nodes.push({
      id: `c${i}`,
      kind: 'consumer',
      x: CONSUMER_X,
      y: CONSUMER_Y_TOP + i * CONSUMER_Y_GAP,
      r: NODE_R_SMALL,
    });
  });

  const edges: LayoutEdge[] = [];
  const homeNode = nodes.find((n) => n.kind === 'home');
  const gridNode = nodes.find((n) => n.kind === 'grid');
  if (!homeNode || !gridNode) {
    throw new Error('Layout invariant: home and grid nodes always present');
  }

  for (const s of config.solar) {
    const pvNode = nodes.find((n) => n.kind === 'pv' && n.id === s.id);
    if (!pvNode) continue;
    edges.push({
      id: `pv-${s.id}-to-home`,
      kind: 'pv-to-home',
      fromNodeId: s.id,
      toNodeId: '__home',
      d: bezierPath(pvNode, homeNode, midpoint(pvNode, homeNode, 30)),
    });
    edges.push({
      id: `pv-${s.id}-to-grid`,
      kind: 'pv-to-grid',
      fromNodeId: s.id,
      toNodeId: '__grid',
      d: bezierPath(pvNode, gridNode, { x: gridNode.x - 20, y: pvNode.y + 80 }),
    });
    const paired = config.battery.find((b) => b.charged_by === s.id);
    if (paired) {
      const battNode = nodes.find((n) => n.kind === 'battery' && n.id === paired.id);
      if (battNode) {
        edges.push({
          id: `pv-${s.id}-to-battery-${paired.id}`,
          kind: 'pv-to-battery',
          fromNodeId: s.id,
          toNodeId: paired.id,
          d: bezierPath(pvNode, battNode, { x: pvNode.x - 60, y: 270 }),
        });
      }
    }
  }

  for (const b of config.battery) {
    const battNode = nodes.find((n) => n.kind === 'battery' && n.id === b.id);
    if (!battNode) continue;
    edges.push({
      id: `battery-${b.id}-to-home`,
      kind: 'battery-to-home',
      fromNodeId: b.id,
      toNodeId: '__home',
      d: bezierPath(battNode, homeNode, midpoint(battNode, homeNode, -30)),
    });
    edges.push({
      id: `battery-${b.id}-to-grid`,
      kind: 'battery-to-grid',
      fromNodeId: b.id,
      toNodeId: '__grid',
      d: bezierPath(battNode, gridNode, { x: gridNode.x - 20, y: battNode.y - 80 }),
    });
  }

  edges.push({
    id: 'grid-to-home',
    kind: 'grid-to-home',
    fromNodeId: '__grid',
    toNodeId: '__home',
    d: straightPath(gridNode, homeNode),
  });

  // Grid → Battery (Pairing-Defizit-Pfad, siehe ADR-0007 v2). Bogen unter dem
  // Haus durch nach unten zur Battery — gespiegeltes Routing zu battery → grid.
  for (const b of config.battery) {
    const battNode = nodes.find((n) => n.kind === 'battery' && n.id === b.id);
    if (!battNode) continue;
    edges.push({
      id: `grid-to-battery-${b.id}`,
      kind: 'grid-to-battery',
      fromNodeId: '__grid',
      toNodeId: b.id,
      d: bezierPath(gridNode, battNode, { x: gridNode.x - 20, y: battNode.y - 80 }),
    });
  }

  config.consumers.forEach((_c, i) => {
    const consNode = nodes.find((n) => n.kind === 'consumer' && n.id === `c${i}`);
    if (!consNode) return;
    edges.push({
      id: `home-to-c${i}`,
      kind: 'home-to-consumer',
      fromNodeId: '__home',
      toNodeId: `c${i}`,
      d: straightPath(homeNode, consNode),
    });
  });

  return { width: VIEWBOX.width, height: VIEWBOX.height, nodes, edges };
}

function midpoint(a: Point, b: Point, yOffset: number): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + yOffset };
}
