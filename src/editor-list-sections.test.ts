import { describe, expect, it } from 'vitest';
import { renderSolarSection, renderBatterySection } from './editor-list-sections';
import { resolveT } from './i18n';
import { DE } from './i18n/de';

describe('renderSolarSection schema', () => {
  it('does NOT include id field in itemSchema', () => {
    const noopHandlers = {
      onItemChange: () => {},
      onAdd: () => {},
      onRemove: () => {},
      onMove: () => {},
    };
    const result = renderSolarSection({
      solar: [{ id: 'pv1', power: 'sensor.x' }],
      hass: undefined,
      t: DE,
      handlers: noopHandlers,
    });
    const flat = JSON.stringify(result);
    expect(flat).not.toMatch(/"name":\s*"id"/);
    expect(flat).toMatch(/"name":\s*"name"/);
    expect(flat).toMatch(/"name":\s*"power"/);
    expect(flat).toMatch(/"name":\s*"icon"/);
  });
});

describe('renderBatterySection schema', () => {
  it('does NOT include id field in itemSchema (signed mode)', () => {
    const noopHandlers = {
      onItemChange: () => {},
      onPairChange: () => {},
      onModeChange: () => {},
      onAdd: () => {},
      onRemove: () => {},
      onMove: () => {},
    };
    const result = renderBatterySection({
      battery: [{ id: 'b1', soc: 'sensor.soc', power: 'sensor.p', charged_by: 'pv1' }],
      solar: [{ id: 'pv1', power: 'sensor.x' }],
      hass: undefined,
      t: DE,
      handlers: noopHandlers,
    });
    const flat = JSON.stringify(result);
    expect(flat).not.toMatch(/"name":\s*"id"/);
    expect(flat).toMatch(/"name":\s*"soc"/);
    expect(flat).toMatch(/"name":\s*"power"/);
  });
});

describe('renderBatterySection pairing fallback', () => {
  it('renders "Solar pv1" as fallback when solar item has no name', () => {
    const noopHandlers = {
      onItemChange: () => {},
      onPairChange: () => {},
      onModeChange: () => {},
      onAdd: () => {},
      onRemove: () => {},
      onMove: () => {},
    };
    const result = renderBatterySection({
      battery: [{ id: 'b1', soc: 'sensor.soc', power: 'sensor.p', charged_by: 'pv1' }],
      solar: [
        { id: 'pv1', power: 'sensor.x' },
        { id: 'pv2', power: 'sensor.y', name: 'Dach' },
      ],
      hass: undefined,
      t: DE,
      handlers: noopHandlers,
    });
    const flat = JSON.stringify(result);
    expect(flat).toContain('Solar pv1');
    expect(flat).toContain('Dach');
  });
});

describe('renderSolarSection — Sprach-Branching', () => {
  it.each(['de', 'en'] as const)('rendert Section-Titel in %s', (lang) => {
    const T = resolveT(lang);
    const result = renderSolarSection({
      solar: [],
      hass: undefined,
      t: T,
      handlers: { onItemChange: () => {}, onAdd: () => {}, onRemove: () => {}, onMove: () => {} },
    });
    expect(JSON.stringify(result)).toContain(T.editor.sectionSolar);
  });
});
