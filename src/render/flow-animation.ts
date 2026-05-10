import { svg, type SVGTemplateResult } from 'lit';
import { DEFAULTS } from '../const';
import { edgeColorRole } from './edge-color';
import { colorFor, type ThemeContext } from './theme';
import type { LayoutEdge } from './layout';
import type { AnimationConfig } from '../config/types';
import type { FlowEdgeKind } from '../engine/flow-graph';

export interface AnimationParams {
  durationS: number;
  dotCount: number;
  color: string;
}

export function computeAnimationParams(
  powerW: number,
  edgeKind: FlowEdgeKind,
  cfg: AnimationConfig | undefined,
  theme: ThemeContext,
): AnimationParams {
  const a = { ...DEFAULTS.animation, ...cfg };
  const safeRef = Math.max(1, a.reference_power_w);
  const rawDur = a.base_duration_s * (safeRef / Math.max(1, powerW));
  const durationS = clamp(rawDur, a.min_duration_s, a.base_duration_s * 4);
  const rawDots = Math.ceil((powerW / safeRef) * 2);
  const dotCount = clamp(rawDots, 1, a.max_dots_per_path);
  const role = edgeColorRole(edgeKind);
  return { durationS, dotCount, color: colorFor(role, theme) };
}

export function renderDots(edge: LayoutEdge, params: AnimationParams): SVGTemplateResult {
  // `--dur` is set on the outer wrapper-<g> in flow-renderer.renderEdge so
  // that the line-stream animation and the dot motion stay in sync. Here we
  // only set per-dot offset-path and animation-delay.
  const stride = params.durationS / params.dotCount;
  const dots = Array.from({ length: params.dotCount }, (_, i) => {
    const delayS = i * stride;
    return svg`
      <circle
        class="flow-dot"
        r="3.5"
        style="
          offset-path: path('${edge.d}');
          animation-delay: ${delayS}s;
        "
      ></circle>
    `;
  });
  return svg`
    <g class="flow-dots" part="flow-dots flow-dots-${edge.kind}">
      ${dots}
    </g>
  `;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

export const ANIMATION_CSS = `
  @keyframes flow-dot-move {
    from { offset-distance: 0%; }
    to { offset-distance: 100%; }
  }
  @keyframes flow-line-stream {
    to { stroke-dashoffset: -40; }
  }
  .flow-line {
    fill: none;
    stroke-width: 1.6;
    opacity: 0.6;
  }
  .flow-line.animated {
    stroke-dasharray: 4 6;
    animation: flow-line-stream var(--dur, 2s) linear infinite;
  }
  .flow-line.idle {
    opacity: 0.08;
  }
  .flow-dot {
    fill: var(--flow-color, currentColor);
    animation: flow-dot-move var(--dur, 2s) linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .flow-dot { animation-duration: 0s !important; }
    .flow-line.animated {
      animation: none;
      opacity: 0.6;
    }
  }
`;
