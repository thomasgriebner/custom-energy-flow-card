import { svg, type SVGTemplateResult } from 'lit';
import { colorFor, type ThemeContext } from './theme';
import type { HomeAttribution } from '../engine/types';

const RING_RADIUS = 60;
const RING_WIDTH = 9;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function renderHomeRing(
  attribution: HomeAttribution,
  cx: number,
  cy: number,
  theme: ThemeContext = {},
): SVGTemplateResult {
  const totalShare = attribution.shares.reduce((s, x) => s + x.share, 0);
  if (totalShare <= 0) return svg``;

  const segments: SVGTemplateResult[] = [];
  let offset = 0;
  for (const share of attribution.shares) {
    if (share.share <= 0) continue;
    const length = (share.share / totalShare) * CIRCUMFERENCE;
    const stroke =
      share.sourceKind === 'pv'
        ? colorFor('solar', theme)
        : share.sourceKind === 'battery'
          ? colorFor('battery', theme)
          : colorFor('grid_import', theme);
    segments.push(svg`
      <circle
        cx="0" cy="0" r="${RING_RADIUS}"
        fill="none"
        stroke="${stroke}"
        stroke-width="${RING_WIDTH}"
        stroke-dasharray="${length} ${CIRCUMFERENCE}"
        stroke-dashoffset="${-offset}"
        opacity="0.95"
      ></circle>
    `);
    offset += length;
  }

  return svg`
    <g transform="translate(${cx} ${cy}) rotate(-90)" part="home-ring">
      ${segments}
    </g>
  `;
}
