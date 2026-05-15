import { describe, expect, it } from 'vitest';
import { formatSocPct, renderBatteryRing } from './battery-ring';

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

describe('renderBatteryRing — Stroke und Branches', () => {
  it('rendert Ring-Stroke mit Breite 14', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('stroke-width="14"');
    expect(out).not.toContain('stroke-width="6"');
  });

  it.each([
    { soc: 0, branch: 'background-only', hasDasharray: false },
    { soc: 0.4, branch: 'background-only', hasDasharray: false },
    { soc: 50, branch: 'background+filled', hasDasharray: true },
    { soc: 73, branch: 'background+filled', hasDasharray: true },
    { soc: 99.4, branch: 'background+filled', hasDasharray: true },
    { soc: 99.6, branch: 'solid-only', hasDasharray: false },
    { soc: 100, branch: 'solid-only', hasDasharray: false },
    { soc: 150, branch: 'solid-only (clamp)', hasDasharray: false },
    { soc: -10, branch: 'background-only (clamp)', hasDasharray: false },
  ])('SoC=$soc → $branch', ({ soc, hasDasharray }) => {
    const out = serialize(renderBatteryRing(soc, '#10b981'));
    if (hasDasharray) {
      expect(out).toContain('stroke-dasharray');
    } else {
      expect(out).not.toContain('stroke-dasharray=');
    }
  });

  // Geometrie-Anker: 50 % → dasharray-Magnitude (CIRCUMFERENCE/2 ≈ 157.08 für r=50).
  it('SoC=50 → dasharray-Magnitude ≈ 157.08 (CIRCUMFERENCE/2 für r=50)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toMatch(/157\.\d+ 157\.\d+/);
  });

  it('SOC-ring radius=50 sits outside battery circle (NODE_R_MEDIUM=42)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toMatch(/r="50"/);
  });
});

describe('renderBatteryRing — %-Text-Element', () => {
  it.each([
    { soc: 0, label: '0 %' },
    { soc: 0.4, label: '0 %' },
    { soc: 5, label: '5 %' },
    { soc: 50, label: '50 %' },
    { soc: 73, label: '73 %' },
    { soc: 99.6, label: '100 %' },
    { soc: 100, label: '100 %' },
    { soc: 150, label: '100 %' },
    { soc: -10, label: '0 %' },
  ])('rendert Text "$label" für SoC=$soc', ({ soc, label }) => {
    const out = serialize(renderBatteryRing(soc, '#10b981'));
    expect(out).toContain(`>${label}</text>`);
  });

  it('positioniert Text bei (-35, -35) mit rotate(-45 -35 -35)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toMatch(/x="-35"\s+y="-35"/);
    expect(out).toContain('transform="rotate(-45 -35 -35)"');
  });

  it('Text-Element ist NICHT in der mit rotate(-90) gedrehten Gruppe', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    const innerOpenIdx = out.indexOf('<g transform="rotate(-90)">');
    expect(innerOpenIdx).toBeGreaterThan(-1);
    const innerCloseIdx = out.indexOf('</g>', innerOpenIdx);
    expect(innerCloseIdx).toBeGreaterThan(innerOpenIdx);
    const innerSlice = out.slice(innerOpenIdx, innerCloseIdx);
    expect(innerSlice).not.toContain('<text');
    expect(out.slice(innerCloseIdx)).toContain('<text');
  });

  it('Text hat font-size=9, font-weight=400, fill=#ffffff', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('font-size="9"');
    expect(out).toContain('font-weight="400"');
    expect(out).toContain('fill="#ffffff"');
  });

  it('Text hat dominant-baseline=middle und text-anchor=middle', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('text-anchor="middle"');
    expect(out).toContain('dominant-baseline="middle"');
  });

  it('Text exposiert part="battery-ring-label" als Theming-Hook', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('part="battery-ring-label"');
  });

  it('äußerer Wrapper behält part="battery-ring" (API-Kompatibilität)', () => {
    const out = serialize(renderBatteryRing(50, '#10b981'));
    expect(out).toContain('part="battery-ring"');
  });
});

describe('formatSocPct', () => {
  it.each([
    [0, '0 %'],
    [0.4, '0 %'],
    [49.5, '50 %'],
    [73, '73 %'],
    [99.4, '99 %'],
    [99.6, '100 %'],
    [150, '100 %'],
    [-10, '0 %'],
    [Number.NaN, '0 %'],
    [Number.POSITIVE_INFINITY, '0 %'],
    [Number.NEGATIVE_INFINITY, '0 %'],
  ])('formatSocPct(%d) === "%s"', (input, expected) => {
    expect(formatSocPct(input)).toBe(expected);
  });

  it('nutzt DE.units.percent als Einheit', async () => {
    const { DE } = await import('../i18n/de');
    expect(formatSocPct(50)).toContain(DE.units.percent);
  });
});
