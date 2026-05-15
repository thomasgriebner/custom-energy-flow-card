// src/render/icon.test.ts
import { describe, expect, it } from 'vitest';
import { nodeIcon, diagnosticsIcon } from './icon';

function flatten(result: ReturnType<typeof nodeIcon>): string {
  return String.raw({ raw: result.strings }, ...result.values);
}

describe('nodeIcon', () => {
  it('renders ha-icon for default-icon when no config-icon set (pv)', () => {
    const flat = flatten(nodeIcon('pv', undefined));
    expect(flat).toContain('<ha-icon');
    expect(flat).toContain('icon="mdi:solar-power"');
    expect(flat).toContain('<foreignObject');
    expect(flat).toContain('part="node-icon"');
  });

  it.each([
    ['battery', 'mdi:home-battery'],
    ['grid', 'mdi:transmission-tower'],
    ['home', 'mdi:home'],
    ['consumer', 'mdi:power-plug'],
  ] as const)('renders default icon for kind %s → %s', (kind, expectedIcon) => {
    const flat = flatten(nodeIcon(kind, undefined));
    expect(flat).toContain(`icon="${expectedIcon}"`);
  });

  it('respects user-set icon: mdi:battery (no override by new default)', () => {
    const flat = flatten(nodeIcon('battery', 'mdi:battery'));
    expect(flat).toContain('icon="mdi:battery"');
    expect(flat).not.toContain('mdi:home-battery');
  });

  it('renders ha-icon with user-set mdi:* icon', () => {
    const flat = flatten(nodeIcon('consumer', 'mdi:heat-pump'));
    expect(flat).toContain('icon="mdi:heat-pump"');
    expect(flat).toContain('<foreignObject');
  });

  it('falls through to <text> for emoji icon (non-mdi prefix)', () => {
    const flat = flatten(nodeIcon('pv', '☀'));
    expect(flat).toContain('<text');
    expect(flat).toContain('☀');
    expect(flat).not.toContain('<foreignObject');
    expect(flat).not.toContain('<ha-icon');
  });

  it('foreignObject for home has size 32, consumer 24, default 24', () => {
    const flatHome = flatten(nodeIcon('home', undefined));
    expect(flatHome).toMatch(/width="32"/);
    expect(flatHome).toMatch(/height="32"/);

    const flatConsumer = flatten(nodeIcon('consumer', undefined));
    expect(flatConsumer).toMatch(/width="24"/);

    const flatPv = flatten(nodeIcon('pv', undefined));
    expect(flatPv).toMatch(/width="24"/);
  });

  // Consumer NICHT enthalten: Consumer-Layout zeigt Name+Wert RECHTS vom Kreis
  // (consumerLabelX = node.r + 8), nicht UNTER dem Icon. Daher entfällt der
  // Icon-Bottom-↔-Value-Top-Spacing-Check für Consumer.
  it.each([
    ['pv', 24, -12, 20, 14],
    ['battery', 24, -12, 20, 14],
    ['grid', 24, -12, 20, 14],
    ['home', 32, -16, 20, 15],
  ] as const)(
    'spacing icon-bottom ↔ value-top ≥ 8 px (%s)',
    (_, size, centerY, valueY, fontSize) => {
      const iconBottom = centerY + size / 2;
      const capHeight = fontSize * 0.7;
      const textTop = valueY - capHeight;
      const spacing = textTop - iconBottom;
      expect(spacing).toBeGreaterThanOrEqual(8);
    },
  );
});

describe('diagnosticsIcon', () => {
  it('uses mdi:alert-circle-outline', () => {
    const flat = flatten(diagnosticsIcon());
    expect(flat).toContain('icon="mdi:alert-circle-outline"');
    expect(flat).toContain('<foreignObject');
    expect(flat).toContain('part="node-icon"');
  });

  it('foreignObject has size 18 (badge fit)', () => {
    const flat = flatten(diagnosticsIcon());
    expect(flat).toMatch(/width="18"/);
    expect(flat).toMatch(/height="18"/);
  });
});
