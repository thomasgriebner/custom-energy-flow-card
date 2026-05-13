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
    ['battery', 'mdi:battery'],
    ['grid', 'mdi:transmission-tower'],
    ['home', 'mdi:home'],
    ['consumer', 'mdi:power-plug'],
  ] as const)('renders default icon for kind %s → %s', (kind, expectedIcon) => {
    const flat = flatten(nodeIcon(kind, undefined));
    expect(flat).toContain(`icon="${expectedIcon}"`);
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

  it('foreignObject for home has size 32, consumer 18, default 24', () => {
    const flatHome = flatten(nodeIcon('home', undefined));
    expect(flatHome).toMatch(/width="32"/);
    expect(flatHome).toMatch(/height="32"/);

    const flatConsumer = flatten(nodeIcon('consumer', undefined));
    expect(flatConsumer).toMatch(/width="18"/);

    const flatPv = flatten(nodeIcon('pv', undefined));
    expect(flatPv).toMatch(/width="24"/);
  });
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
