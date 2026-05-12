import { describe, expect, it } from 'vitest';
import { renderBatteryRing } from './battery-ring';

// Lit's SVGTemplateResult exposes strings + values arrays.
function serialize(template: ReturnType<typeof renderBatteryRing>): string {
  const t = template as unknown as { strings: readonly string[]; values: readonly unknown[] };
  const parts: string[] = [];
  t.strings.forEach((s, i) => {
    parts.push(s);
    if (i < t.values.length) parts.push(String(t.values[i]));
  });
  return parts.join('');
}

describe('renderBatteryRing', () => {
  it('renders background ring + filled segment for 50 %', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('stroke-dasharray');
    // For 50%: dasharray = (2π·42 · 0.5) ≈ 131.95 131.95
    expect(out).toMatch(/131\.\d+ 131\.\d+/);
  });

  it('renders solid stroke (no dasharray) when socPct ≥ 99.5', () => {
    const out = serialize(renderBatteryRing(99.7, '#10b981'));
    expect(out).not.toContain('stroke-dasharray=');
  });

  it('renders only background ring when socPct ≤ 0.5', () => {
    const out = serialize(renderBatteryRing(0.3, '#10b981'));
    const matches = out.match(/stroke-dasharray/g);
    expect(matches).toBeNull();
  });

  it('clamps socPct above 100', () => {
    const out = serialize(renderBatteryRing(150, '#10b981'));
    expect(out).not.toContain('stroke-dasharray=');
  });

  it('clamps socPct below 0', () => {
    const out = serialize(renderBatteryRing(-10, '#10b981'));
    const matches = out.match(/stroke-dasharray/g);
    expect(matches).toBeNull();
  });
});
