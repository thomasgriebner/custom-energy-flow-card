import { svg, type SVGTemplateResult } from 'lit';
import { DE } from '../i18n/de';

const RING_RADIUS = 50;
const STROKE_WIDTH = 14;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// 10:30-Uhr (θ=135° auf Ring-Mittellinie, y nach unten in SVG).
const LABEL_X = -35;
const LABEL_Y = -35;
const LABEL_ROTATE_DEG = -45;
const LABEL_FONT_SIZE = 9;
const LABEL_FONT_WEIGHT = 400;
// Theme-adaptiv: HA-Light-Theme → dunkel, Dark-Theme → hell. Fallback dunkel.
const LABEL_FILL = 'var(--primary-text-color, #1c1c1c)';

function clampSoc(s: number): number {
  return !Number.isFinite(s) || s < 0 ? 0 : s > 100 ? 100 : s;
}

export function formatSocPct(socPct: number): string {
  return `${Math.round(clampSoc(socPct))} ${DE.units.percent}`;
}

export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
  const clamped = clampSoc(socPct);
  const label = svg`<text x="${LABEL_X}" y="${LABEL_Y}" text-anchor="middle" dominant-baseline="middle" font-size="${LABEL_FONT_SIZE}" font-weight="${LABEL_FONT_WEIGHT}" fill="${LABEL_FILL}" transform="rotate(${LABEL_ROTATE_DEG} ${LABEL_X} ${LABEL_Y})" part="battery-ring-label">${formatSocPct(clamped)}</text>`;

  if (clamped <= 0.5) {
    return svg`<g part="battery-ring"><g transform="rotate(-90)"><circle r="${RING_RADIUS}" fill="none" stroke="${color}" stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle></g>${label}</g>`;
  }

  if (clamped >= 99.5) {
    return svg`<g part="battery-ring"><g transform="rotate(-90)"><circle r="${RING_RADIUS}" fill="none" stroke="${color}" stroke-width="${STROKE_WIDTH}"></circle></g>${label}</g>`;
  }

  const filled = (CIRCUMFERENCE * clamped) / 100;
  const rest = CIRCUMFERENCE - filled;
  return svg`<g part="battery-ring"><g transform="rotate(-90)"><circle r="${RING_RADIUS}" fill="none" stroke="${color}" stroke-width="${STROKE_WIDTH}" opacity="0.18"></circle><circle r="${RING_RADIUS}" fill="none" stroke="${color}" stroke-width="${STROKE_WIDTH}" stroke-dasharray="${filled} ${rest}" stroke-linecap="round"></circle></g>${label}</g>`;
}
