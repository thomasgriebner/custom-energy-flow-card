import { html, svg, type TemplateResult } from 'lit';
import { DE } from '../i18n/de';
import { formatPowerW } from '../util/format-power';
import { edgeColorRole } from './edge-color';
import { computeAnimationParams, renderDots } from './flow-animation';
import { renderHomeRing } from './home-ring';
import { colorFor, HA_CSS_VARS, type ThemeContext } from './theme';
import type { LayoutEdge, LayoutNode, LayoutResult } from './layout';
import type {
  AnimationConfig,
  Config,
  ConsumerConfig,
  SolarConfig,
  BatteryConfig,
} from '../config/types';
import type { FlowResult, PerSourceFlow } from '../engine/types';
import type { ColorRole } from '../util/resolve-color';
import type { EngineWarning } from '../util/warning-types';

export interface RenderContext {
  config: Config;
  formatGrouped: boolean;
  activeThresholdW: number;
  showInactive: boolean;
  theme: ThemeContext;
  buildWarnings: EngineWarning[]; // warnings collected in buildSystemState
  unavailableEntities: Set<string>; // entity_ids that are 'unavailable'/'unknown'
  animation?: AnimationConfig;
  onNodeClick?: (nodeId: string) => void;
}

const TAB_ORDER: ReadonlyArray<LayoutNode['kind']> = ['pv', 'grid', 'battery', 'consumer', 'home'];

function sortForTabOrder(nodes: ReadonlyArray<LayoutNode>): LayoutNode[] {
  return [...nodes].sort((a, b) => {
    const ka = TAB_ORDER.indexOf(a.kind);
    const kb = TAB_ORDER.indexOf(b.kind);
    if (ka !== kb) return ka - kb;
    if (a.x !== b.x) return a.x - b.x;
    return a.y - b.y;
  });
}

export function renderCard(
  layout: LayoutResult,
  result: FlowResult,
  ctx: RenderContext,
): TemplateResult {
  const orderedNodes = sortForTabOrder(layout.nodes);
  return html`
    <svg
      viewBox="0 0 ${layout.width} ${layout.height}"
      preserveAspectRatio="xMidYMid meet"
      part="card"
      role="group"
      aria-label="${DE.card.name}"
    >
      ${layout.edges.map((e) => renderEdge(e, result, ctx))}
      ${orderedNodes.map((n) => renderNode(n, result, ctx))}
    </svg>
  `;
}

function edgePower(edge: LayoutEdge, result: FlowResult): number {
  switch (edge.kind) {
    case 'pv-to-home':
      return findFlow(result.flows.pvToHome, edge.fromNodeId);
    case 'pv-to-battery':
      return findFlow(result.flows.pvToBattery, edge.fromNodeId);
    case 'pv-to-grid':
      return findFlow(result.flows.pvToGrid, edge.fromNodeId);
    case 'battery-to-home':
      return findFlow(result.flows.batteryToHome, edge.fromNodeId);
    case 'battery-to-grid':
      return findFlow(result.flows.batteryToGrid, edge.fromNodeId);
    case 'grid-to-home':
      return result.flows.gridToHome;
    case 'grid-to-battery':
      return findFlow(result.flows.gridToBattery, edge.toNodeId);
    case 'home-to-consumer':
      return findFlow(result.flows.homeToConsumer, edge.toNodeId);
  }
}

function findFlow(flows: PerSourceFlow[], id: string): number {
  return flows.find((f) => f.sourceId === id)?.powerW ?? 0;
}

function renderEdge(edge: LayoutEdge, result: FlowResult, ctx: RenderContext): TemplateResult {
  const power = edgePower(edge, result);
  const active = power > ctx.activeThresholdW;
  if (!active && !ctx.showInactive) return svg``;
  const color = colorFor(edgeColorRole(edge.kind), ctx.theme);
  if (!active) {
    return svg`
      <g part="flow flow-${edge.kind}">
        <path
          d="${edge.d}"
          class="flow-line idle"
          stroke="${color}"
          fill="none"
          data-power="${power}"
        ></path>
      </g>
    `;
  }
  const params = computeAnimationParams(power, edge.kind, ctx.animation, ctx.theme);
  return svg`
    <g
      part="flow flow-${edge.kind}"
      style="--dur: ${params.durationS}s; --flow-color: ${color};"
    >
      <path
        d="${edge.d}"
        class="flow-line animated"
        stroke="${color}"
        fill="none"
        data-power="${power}"
      ></path>
      ${renderDots(edge, params)}
    </g>
  `;
}

function nodeColorRole(kind: LayoutNode['kind']): ColorRole {
  switch (kind) {
    case 'pv':
      return 'solar';
    case 'battery':
      return 'battery';
    case 'grid':
      return 'grid_import';
    case 'home':
      return 'home';
    case 'consumer':
      return 'consumer';
  }
}

function renderNode(node: LayoutNode, result: FlowResult, ctx: RenderContext): TemplateResult {
  const unavailable = isNodeUnavailable(node, ctx);
  const color = colorFor(nodeColorRole(node.kind), ctx.theme);
  const value = unavailable ? formatPowerW(Number.NaN) : nodeValueText(node, result, ctx);
  const name = nodeName(node, ctx);
  const ariaLabel = unavailable ? `${name}: ${DE.states.sensorUnavailable}` : `${name}: ${value}`;

  const ring =
    node.kind === 'home' ? renderHomeRing(result.homeAttribution, 0, 0, ctx.theme) : svg``;
  const labelOffset = labelYOffset(node);
  const strokeDash = unavailable ? '4 4' : '';

  return svg`
    <g
      transform="translate(${node.x} ${node.y})"
      class="node node--${node.kind} ${unavailable ? 'node--unavailable' : ''}"
      part="node node-${node.kind}"
      role="button"
      tabindex="0"
      aria-label="${ariaLabel}"
      @click=${() => ctx.onNodeClick?.(node.id)}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          ctx.onNodeClick?.(node.id);
        }
      }}
    >
      ${ring}
      <circle
        r="${node.r}"
        fill="${HA_CSS_VARS.cardBackground}"
        stroke="${color}"
        stroke-width="2.5"
        stroke-dasharray="${strokeDash}"
      ></circle>
      <text class="node-icon" text-anchor="middle" y="${node.kind === 'home' ? -10 : -4}" font-size="${node.kind === 'home' ? 28 : 22}">
        ${nodeIconChar(node, ctx)}
      </text>
      <text class="node-value" text-anchor="middle" y="${node.kind === 'home' ? 14 : 16}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 13}">
        ${value}
      </text>
      <text class="node-name" text-anchor="middle" y="${labelOffset}" font-size="11" font-weight="600">
        ${name}
      </text>
    </g>
  `;
}

function isNodeUnavailable(node: LayoutNode, ctx: RenderContext): boolean {
  if (node.kind === 'grid' && !('power' in ctx.config.grid)) {
    // Split-grid form: unavailable if either import or export sensor is missing.
    return (
      ctx.unavailableEntities.has(ctx.config.grid.import) ||
      ctx.unavailableEntities.has(ctx.config.grid.export)
    );
  }
  const id = entityIdForNode(node, ctx.config);
  return id !== undefined && ctx.unavailableEntities.has(id);
}

function entityIdForNode(node: LayoutNode, config: Config): string | undefined {
  if (node.kind === 'pv') return config.solar.find((s) => s.id === node.id)?.power;
  if (node.kind === 'battery') return config.battery.find((b) => b.id === node.id)?.power;
  if (node.kind === 'grid') return 'power' in config.grid ? config.grid.power : config.grid.import;
  if (node.kind === 'consumer') {
    const idx = Number.parseInt(node.id.slice(1), 10);
    return config.consumers[idx]?.power;
  }
  return undefined;
}

function labelYOffset(node: LayoutNode): number {
  switch (node.kind) {
    case 'pv':
      return -node.r - 16;
    case 'battery':
      return node.r + 22;
    case 'home':
      return node.r + 32;
    case 'grid':
    case 'consumer':
      return -node.r - 16;
  }
}

function nodeValueText(node: LayoutNode, result: FlowResult, ctx: RenderContext): string {
  const fmt = ctx.formatGrouped ? 'grouped' : 'standard';
  if (node.kind === 'home') return formatPowerW(result.homeW, { format: fmt });
  if (node.kind === 'grid') {
    const gridFlow = result.flows.gridToHome;
    const exportFlow = -(
      result.flows.pvToGrid.reduce((s, f) => s + f.powerW, 0) +
      result.flows.batteryToGrid.reduce((s, f) => s + f.powerW, 0)
    );
    const signed = gridFlow > 0 ? gridFlow : exportFlow;
    return formatPowerW(signed, { format: fmt, signed: true });
  }
  if (node.kind === 'pv') {
    const inHome = findFlow(result.flows.pvToHome, node.id);
    const inBatt = findFlow(result.flows.pvToBattery, node.id);
    const inGrid = findFlow(result.flows.pvToGrid, node.id);
    return formatPowerW(inHome + inBatt + inGrid, { format: fmt });
  }
  if (node.kind === 'battery') {
    const out =
      findFlow(result.flows.batteryToHome, node.id) + findFlow(result.flows.batteryToGrid, node.id);
    return formatPowerW(out, { format: fmt });
  }
  if (node.kind === 'consumer') {
    return formatPowerW(findFlow(result.flows.homeToConsumer, node.id), { format: fmt });
  }
  return formatPowerW(Number.NaN);
}

function configEntryForNode(
  node: LayoutNode,
  config: Config,
): SolarConfig | BatteryConfig | ConsumerConfig | undefined {
  if (node.kind === 'pv') return config.solar.find((s) => s.id === node.id);
  if (node.kind === 'battery') return config.battery.find((b) => b.id === node.id);
  if (node.kind === 'consumer') return config.consumers[Number.parseInt(node.id.slice(1), 10)];
  return undefined;
}

function nodeName(node: LayoutNode, ctx: RenderContext): string {
  const entry = configEntryForNode(node, ctx.config);
  if (entry?.name) return entry.name;
  switch (node.kind) {
    case 'pv':
      return `${DE.nodes.solar} ${node.id}`;
    case 'battery':
      return `${DE.nodes.battery} ${node.id}`;
    case 'grid':
      return DE.nodes.grid;
    case 'home':
      return ctx.config.home?.name ?? DE.nodes.home;
    case 'consumer':
      return `${DE.nodes.consumer} ${node.id}`;
  }
}

const DEFAULT_ICONS: Record<LayoutNode['kind'], string> = {
  pv: '☀',
  battery: '🔋',
  grid: '⚡',
  home: '🏠',
  consumer: '🔌',
};

function nodeIconChar(node: LayoutNode, ctx: RenderContext): string {
  // For v1.0 we use Emoji defaults (Spec §9 acceptable fallback). User-configured
  // mdi:* icon names are stored in config but not rendered as SVG paths in v1.0;
  // this is an explicit deferral to v1.x — see Spec §9.
  const entry = configEntryForNode(node, ctx.config);
  // If user supplied a non-mdi icon (e.g. an emoji directly), pass through:
  if (entry?.icon && !entry.icon.startsWith('mdi:')) return entry.icon;
  return DEFAULT_ICONS[node.kind];
}
