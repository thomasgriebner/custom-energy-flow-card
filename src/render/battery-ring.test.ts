import { describe, expect, it } from 'vitest';
import { renderBatteryRing } from './battery-ring';

function serialize(template: ReturnType<typeof renderBatteryRing>): string {
  const t = template as unknown as { strings: readonly string[]; values: readonly unknown[] };
  const parts: string[] = [];
  t.strings.forEach((s, i) => {
    parts.push(s);
    if (i < t.values.length) {
      const v = t.values[i];
      if (v && typeof v === 'object' && 'strings' in v && 'values' in v) {
        parts.push(serialize(v as ReturnType<typeof renderBatteryRing>));
      } else {
        parts.push(String(v));
      }
    }
  });
  return parts.join('');
}

describe('renderBatteryRing', () => {
  it('renders background ring + filled segment for 50 %', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('stroke-dasharray');
    // For 50%: dasharray = (2π·50 · 0.5) ≈ 157.08 157.08
    expect(out).toMatch(/157\.\d+ 157\.\d+/);
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

  it('SOC-ring radius=50 sits outside battery circle (NODE_R_MEDIUM=42)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toMatch(/r="50"/);
  });
});
