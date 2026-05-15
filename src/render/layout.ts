import { VIEWBOX } from '../const';
import { bezierPath, straightPath, type Point } from '../util/svg-path';
import type { Config, DisplayConsumer } from '../config/types';
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
export const NODE_R_MEDIUM = 34;
const NODE_R_CONSUMER = 24;
const NODE_R_GRID = 32;
const TOP_Y = 80;
const BOTTOM_Y = 460;
const MIDDLE_Y = 270;
const GRID_X = 60;
const HOME_X = 480;
const SOURCE_X_MIN = 200;
const SOURCE_X_MAX = 560;
const CONSUMER_ARC_R = 350;
// 42° cap: limited by viewBox-top margin (top consumer y = 36 → 12 px to
// viewBox top y=0). PV/Akku collision is NOT the constraint — they sit at
// x≈250/560 while consumers are at x≈740+, horizontally far apart.
const CONSUMER_ARC_MAX_DEG = 42;
// 14° step keeps adjacent center-to-center gap at 85 px (= 2·R·sin(7°)),
// well above the 48 px consumer diameter, for N=2..7. At N=8 the cap kicks
// in and gap shrinks to 73 px — still 25 px margin to diameter.
const CONSUMER_ARC_STEP_DEG = 14;

interface ArcPosition {
  x: number;
  y: number;
  theta: number;
}

export function computeLayout(
  config: Config,
  displayConsumers: ReadonlyArray<DisplayConsumer>,
): LayoutResult {
  const nodes: LayoutNode[] = [];

  // Solar (top): clustered x-positions
  const solarXs = sourceClusterXs(config.solar.length);
  config.solar.forEach((s, i) => {
    nodes.push({ id: s.id, kind: 'pv', x: solarXs[i] ?? HOME_X, y: TOP_Y, r: NODE_R_MEDIUM });
  });

  // Grid (left)
  nodes.push({ id: '__grid', kind: 'grid', x: GRID_X, y: MIDDLE_Y, r: NODE_R_GRID });

  // Home (center)
  nodes.push({ id: '__home', kind: 'home', x: HOME_X, y: MIDDLE_Y, r: NODE_R_LARGE });

  // Battery (bottom): x follows paired PV
  config.battery.forEach((b) => {
    const pairedPv = nodes.find((n) => n.kind === 'pv' && n.id === b.charged_by);
    const x = pairedPv?.x ?? HOME_X;
    nodes.push({ id: b.id, kind: 'battery', x, y: BOTTOM_Y, r: NODE_R_MEDIUM });
  });

  // Consumers (right): arc around home — compute positions ONCE, reuse for edges
  const consumerPositions = consumerArcPositions(displayConsumers.length);
  displayConsumers.forEach((c, i) => {
    const pos = consumerPositions[i];
    if (!pos) return;
    nodes.push({ id: c.id, kind: 'consumer', x: pos.x, y: pos.y, r: NODE_R_CONSUMER });
  });

  const edges = computeEdges(config, displayConsumers, nodes, consumerPositions);

  return { width: VIEWBOX.width, height: VIEWBOX.height, nodes, edges };
}

function sourceClusterXs(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [280];
  if (n === 2) return [250, 560];
  if (n === 3) return [200, 380, 560];
  if (n === 4) return [200, 320, 440, 560];
  const span = SOURCE_X_MAX - SOURCE_X_MIN;
  return Array.from({ length: n }, (_, i) => SOURCE_X_MIN + (i * span) / (n - 1));
}

function consumerArcPositions(n: number): ArcPosition[] {
  if (n === 0) return [];
  if (n === 1) {
    return [{ x: HOME_X + CONSUMER_ARC_R, y: MIDDLE_Y, theta: 0 }];
  }
  const alphaDeg = Math.min(CONSUMER_ARC_MAX_DEG, ((n - 1) * CONSUMER_ARC_STEP_DEG) / 2);
  const alphaRad = (alphaDeg * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const theta = -alphaRad + (i * 2 * alphaRad) / (n - 1);
    return {
      x: HOME_X + CONSUMER_ARC_R * Math.cos(theta),
      y: MIDDLE_Y + CONSUMER_ARC_R * Math.sin(theta),
      theta,
    };
  });
}

function computeEdges(
  config: Config,
  displayConsumers: ReadonlyArray<DisplayConsumer>,
  nodes: LayoutNode[],
  consumerPositions: ReadonlyArray<ArcPosition>,
): LayoutEdge[] {
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
          d: bezierPath(pvNode, battNode, { x: pvNode.x - 60, y: MIDDLE_Y }),
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

  // Home → Consumer: reuse computed arc positions, no recompute (ADR-0010).
  displayConsumers.forEach((c, i) => {
    const pos = consumerPositions[i];
    if (!pos) return;
    edges.push({
      id: `home-to-${c.id}`,
      kind: 'home-to-consumer',
      fromNodeId: '__home',
      toNodeId: c.id,
      d: consumerEdgePath(pos.theta, pos.x, pos.y),
    });
  });

  return edges;
}

function consumerEdgePath(theta: number, cx: number, cy: number): string {
  if (Math.abs(theta) < 1e-6 && Math.abs(cy - MIDDLE_Y) < 1e-6) {
    return straightPath({ x: HOME_X, y: MIDDLE_Y }, { x: cx, y: cy });
  }
  const homeEdgeR = NODE_R_LARGE + 2;
  const consEdgeR = NODE_R_CONSUMER + 2;
  const start: Point = {
    x: HOME_X + homeEdgeR * Math.cos(theta),
    y: MIDDLE_Y + homeEdgeR * Math.sin(theta),
  };
  const end: Point = {
    x: cx - consEdgeR * Math.cos(theta),
    y: cy - consEdgeR * Math.sin(theta),
  };
  const control: Point = {
    x: start.x + 0.55 * (end.x - start.x) - 18 * Math.cos(theta),
    y: start.y + 0.55 * (end.y - start.y) - 18 * Math.sin(theta),
  };
  return bezierPath(start, end, control);
}

function midpoint(a: Point, b: Point, yOffset: number): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + yOffset };
}
