import { svg, type SVGTemplateResult } from 'lit';

const RING_RADIUS = 50;
const STROKE_WIDTH = 6;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function renderBatteryRing(socPct: number, color: string): SVGTemplateResult {
  const clamped = Math.min(100, Math.max(0, socPct));

  if (clamped <= 0.5) {
    return svg`
      <g transform="rotate(-90)" part="battery-ring">
        <circle
          cx="0" cy="0" r="${RING_RADIUS}"
          fill="none"
          stroke="${color}"
          stroke-width="${STROKE_WIDTH}"
          opacity="0.18"
        ></circle>
      </g>
    `;
  }

  if (clamped >= 99.5) {
    return svg`
      <g transform="rotate(-90)" part="battery-ring">
        <circle
          cx="0" cy="0" r="${RING_RADIUS}"
          fill="none"
          stroke="${color}"
          stroke-width="${STROKE_WIDTH}"
        ></circle>
      </g>
    `;
  }

  const filled = (CIRCUMFERENCE * clamped) / 100;
  const rest = CIRCUMFERENCE - filled;
  return svg`
    <g transform="rotate(-90)" part="battery-ring">
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
  `;
}
