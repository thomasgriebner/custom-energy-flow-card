import { html, svg, type TemplateResult } from 'lit';
import { edgeColorRole } from './edge-color';
import { computeAnimationParams, renderDots } from './flow-animation';
import { diagnosticsIcon } from './icon';
import { renderNode } from './node-renderer';
import { colorFor } from './theme';
import type { RenderContext } from './context';
import type { LayoutEdge, LayoutNode, LayoutResult } from './layout';
import type { FlowResult, PerSourceFlow } from '../engine/types';

export type { RenderContext } from './context';

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
      aria-label="${ctx.t.card.name}"
    >
      ${layout.edges.map((e) => renderEdge(e, result, ctx))}
      ${orderedNodes.map((n) => renderNode(n, result, ctx))}
      ${result.warnings.length > 0 ? renderDiagnostics(result, layout, ctx) : svg``}
    </svg>
  `;
}

function renderDiagnostics(
  result: FlowResult,
  layout: LayoutResult,
  ctx: RenderContext,
): TemplateResult {
  const count = result.warnings.length;
  const label = `${ctx.t.diagnostics.iconLabel}: ${count} ${ctx.t.diagnostics.pluralize(count)}`;
  const summary = result.warnings
    .map(
      (w) =>
        `${w.code}: ${w.detail}${w.magnitudeW !== undefined ? ` (~${Math.round(w.magnitudeW)} W)` : ''}`,
    )
    .join('\n');
  const fill = colorFor('warning', ctx.theme); // amber #eab308 default, overridable via display.colors.warning
  return svg`
    <g
      transform="translate(${layout.width - 30} 30)"
      part="diagnostics diagnostics-icon"
      role="button"
      tabindex="0"
      aria-label="${label}"
      style="cursor:help;color:${fill}"
      @click=${() => {
        for (const w of result.warnings) {
          console.warn(`[custom-energy-flow-card] ${w.code}: ${w.detail}`, w);
        }
      }}
      @keydown=${(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          for (const w of result.warnings) {
            console.warn(`[custom-energy-flow-card] ${w.code}: ${w.detail}`, w);
          }
        }
      }}
    >
      <circle r="12" fill="${fill}" opacity="0.18"></circle>
      <circle r="12" fill="none" stroke="${fill}" stroke-width="1.5"></circle>
      ${diagnosticsIcon()}
      <title>${count} ${ctx.t.diagnostics.title}:\n${summary}</title>
    </g>
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
