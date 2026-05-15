import { svg, type SVGTemplateResult } from 'lit';
import { DE } from '../i18n/de';

const RING_RADIUS = 50;
const STROKE_WIDTH = 14;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// Position auf Ring-Mittellinie (r=50) bei θ=135° (10:30-Uhr-Stellung).
// SVG y-Achse zeigt nach unten — optisch „oben" ist y negativ.
const LABEL_X = -35;
const LABEL_Y = -35;
const LABEL_ROTATE_DEG = -45;
const LABEL_FONT_SIZE = 9;
const LABEL_FONT_WEIGHT = 400;
const LABEL_FILL = '#ffffff';

export function formatSocPct(socPct: number): string {
  if (!Number.isFinite(socPct)) return `0 ${DE.units.percent}`;
  const clamped = Math.min(100, Math.max(0, socPct));
  return `${Math.round(clamped)} ${DE.units.percent}`;
}

export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
  const clamped = Math.min(100, Math.max(0, socPct));
  const label = svg`<text
    x="${LABEL_X}" y="${LABEL_Y}"
    text-anchor="middle" dominant-baseline="middle"
    font-size="${LABEL_FONT_SIZE}" font-weight="${LABEL_FONT_WEIGHT}" fill="${LABEL_FILL}"
    transform="rotate(${LABEL_ROTATE_DEG} ${LABEL_X} ${LABEL_Y})"
    part="battery-ring-label"
  >${formatSocPct(clamped)}</text>`;

  if (clamped <= 0.5) {
    return svg`
      <g part="battery-ring">
        <g transform="rotate(-90)">
          <circle
            cx="0" cy="0" r="${RING_RADIUS}"
            fill="none"
            stroke="${color}"
            stroke-width="${STROKE_WIDTH}"
            opacity="0.18"
          ></circle>
        </g>
        ${label}
      </g>
    `;
  }

  if (clamped >= 99.5) {
    return svg`
      <g part="battery-ring">
        <g transform="rotate(-90)">
          <circle
            cx="0" cy="0" r="${RING_RADIUS}"
            fill="none"
            stroke="${color}"
            stroke-width="${STROKE_WIDTH}"
          ></circle>
        </g>
        ${label}
      </g>
    `;
  }

  const filled = (CIRCUMFERENCE * clamped) / 100;
  const rest = CIRCUMFERENCE - filled;
  return svg`
    <g part="battery-ring">
      <g transform="rotate(-90)">
        <circle
          cx="0" cy="0" r="${RING_RADIUS}"
          fill="none"
          stroke="${color}"
          stroke-width="${STROKE_WIDTH}"
          opacity="0.18"
        ></circle>
        <circle
          cx="0" cy="0" r="${RING_RADIUS}"
          fill="none"
          stroke="${color}"
          stroke-width="${STROKE_WIDTH}"
          stroke-dasharray="${filled} ${rest}"
          stroke-linecap="round"
        ></circle>
      </g>
      ${label}
    </g>
  `;
}
