import { svg, type SVGTemplateResult } from 'lit';
import { DE } from '../i18n/de';
import { formatPowerW } from '../util/format-power';
import { renderBatteryRing } from './battery-ring';
import { renderHomeRing } from './home-ring';
import { nodeIcon } from './icon';
import { colorFor, HA_CSS_VARS } from './theme';
import type { RenderContext } from './context';
import type { LayoutNode } from './layout';
import type { BatteryConfig, DisplayConsumer, SolarConfig } from '../config/types';
import type { FlowResult, PerSourceFlow } from '../engine/types';
import type { ColorRole } from '../util/resolve-color';

export function nodeColorRole(kind: LayoutNode['kind']): ColorRole {
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

export function renderNode(
  node: LayoutNode,
  result: FlowResult,
  ctx: RenderContext,
): SVGTemplateResult {
  const unavailable = isNodeUnavailable(node, ctx);
  const color = colorFor(nodeColorRole(node.kind), ctx.theme);
  const value = unavailable ? formatPowerW(Number.NaN) : nodeValueText(node, result, ctx);
  const name = nodeName(node, ctx);

  const isBattery = node.kind === 'battery';
  const socPct = isBattery ? ctx.batterySoc.get(node.id) : undefined;
  const showRing = !unavailable && socPct !== undefined && Number.isFinite(socPct);
  const batteryRing = showRing ? renderBatteryRing(socPct as number, color) : svg``;

  const ariaLabel = unavailable
    ? `${name}: ${DE.states.sensorUnavailable}`
    : showRing
      ? `${name}: ${value}, ${Math.round(socPct as number)}%`
      : `${name}: ${value}`;

  const ring =
    node.kind === 'home' ? renderHomeRing(result.homeAttribution, 0, 0, ctx.theme) : svg``;
  const labelOffset = labelYOffset(node);
  const strokeDash = unavailable ? '4 4' : '';

  const valueY = 20;

  const isConsumer = node.kind === 'consumer';
  const consumerLabelX = node.r + 8; // right of the circle

  return svg`
    <g
      transform="translate(${node.x} ${node.y})"
      class="node node--${node.kind} ${unavailable ? 'node--unavailable' : ''}"
      part="node node-${node.kind}"
      style="color:${color}"
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
      ${batteryRing}
      <circle
        r="${node.r}"
        fill="${HA_CSS_VARS.cardBackground}"
        stroke="${color}"
        stroke-width="2.5"
        stroke-dasharray="${strokeDash}"
      ></circle>
      ${nodeIcon(node.kind, configEntryForNode(node, ctx)?.icon)}
      ${
        isConsumer
          ? svg`
            <text class="node-name" text-anchor="start" x="${consumerLabelX}" y="-2" font-size="12" font-weight="700">
              ${name}
            </text>
            <text class="node-value" text-anchor="start" x="${consumerLabelX}" y="12" font-size="11" font-weight="600">
              ${value}
            </text>
          `
          : svg`
            <text class="node-value" text-anchor="middle" y="${valueY}" font-weight="700" font-size="${node.kind === 'home' ? 15 : 14}">
              ${value}
            </text>
            <text class="node-name" text-anchor="middle" y="${labelOffset}" font-size="11" font-weight="600">
              ${name}
            </text>
          `
      }
    </g>
  `;
}

export function isNodeUnavailable(node: LayoutNode, ctx: RenderContext): boolean {
  if (node.kind === 'grid' && !('power' in ctx.config.grid)) {
    // Split-grid form: unavailable if either import or export sensor is missing.
    return (
      ctx.unavailableEntities.has(ctx.config.grid.import) ||
      ctx.unavailableEntities.has(ctx.config.grid.export)
    );
  }
  if (node.kind === 'battery') {
    const b = ctx.config.battery.find((x) => x.id === node.id);
    if (!b) return false;
    if ('power' in b) return ctx.unavailableEntities.has(b.power);
    return (
      ctx.unavailableEntities.has(b.charge_power) || ctx.unavailableEntities.has(b.discharge_power)
    );
  }
  if (node.kind === 'consumer') {
    return ctx.unavailableGroups.has(node.id);
  }
  const id = entityIdForNode(node, ctx);
  return id !== undefined && ctx.unavailableEntities.has(id);
}

export function entityIdForNode(node: LayoutNode, ctx: RenderContext): string | undefined {
  if (node.kind === 'pv') return ctx.config.solar.find((s) => s.id === node.id)?.power;
  if (node.kind === 'battery') {
    const b = ctx.config.battery.find((x) => x.id === node.id);
    if (!b) return undefined;
    return 'power' in b ? b.power : b.charge_power;
  }
  if (node.kind === 'grid') {
    return 'power' in ctx.config.grid ? ctx.config.grid.power : ctx.config.grid.import;
  }
  if (node.kind === 'consumer') {
    return ctx.displayConsumers.get(node.id)?.members[0];
  }
  return undefined;
}

export function labelYOffset(node: LayoutNode): number {
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

function findFlow(flows: PerSourceFlow[], id: string): number {
  return flows.find((f) => f.sourceId === id)?.powerW ?? 0;
}

export function nodeValueText(node: LayoutNode, result: FlowResult, ctx: RenderContext): string {
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
    const battConfig = ctx.config.battery.find((b) => b.id === node.id);
    const pairedPvId = battConfig?.charged_by;
    const fromPv = pairedPvId ? findFlow(result.flows.pvToBattery, pairedPvId) : 0;
    const fromGrid = findFlow(result.flows.gridToBattery, node.id);
    const charging = fromPv + fromGrid;
    const discharging =
      findFlow(result.flows.batteryToHome, node.id) + findFlow(result.flows.batteryToGrid, node.id);
    const signed = charging > discharging ? charging : -discharging;
    return formatPowerW(signed, { format: fmt, signed: true });
  }
  if (node.kind === 'consumer') {
    return formatPowerW(findFlow(result.flows.homeToConsumer, node.id), { format: fmt });
  }
  return formatPowerW(Number.NaN);
}

function configEntryForNode(
  node: LayoutNode,
  ctx: RenderContext,
): SolarConfig | BatteryConfig | DisplayConsumer | undefined {
  if (node.kind === 'pv') return ctx.config.solar.find((s) => s.id === node.id);
  if (node.kind === 'battery') return ctx.config.battery.find((b) => b.id === node.id);
  if (node.kind === 'consumer') return ctx.displayConsumers.get(node.id);
  return undefined;
}

export function nodeName(node: LayoutNode, ctx: RenderContext): string {
  const entry = configEntryForNode(node, ctx);
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
