import { describe, expect, it } from 'vitest';
import { DE } from './de';
import { EN } from './en';

/** Rekursiver Walker: jeder Pfad in DE existiert in EN mit gleichem Typ. */
function walk(a: unknown, b: unknown, path = ''): void {
  if (typeof a === 'function') {
    expect(typeof b).toBe('function');
    return;
  }
  if (typeof a === 'string') {
    expect(typeof b).toBe('string');
    expect((b as string).length).toBeGreaterThan(0);
    return;
  }
  if (a && typeof a === 'object') {
    expect(b).toBeTypeOf('object');
    expect(b).not.toBeNull();
    // for...of mit Side-Effects (expect-Assertions) ist via conventions §1.6 erlaubt
    for (const key of Object.keys(a)) {
      expect(b).toHaveProperty(key);
      // Internal-Cast (conventions §1.2): walk descends only into Object-Branches,
      // toHaveProperty oben garantiert Key-Existenz vor Index-Zugriff
      walk(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
        `${path}.${key}`,
      );
    }
  }
}

describe('EN strukturell identisch zu DE', () => {
  it('jeder DE-Pfad existiert in EN mit gleichem Typ', () => {
    walk(DE, EN);
  });
});

describe('EN funktionale Strings', () => {
  it('pluralize: 0 → warnings, 1 → warning, 2 → warnings', () => {
    expect(EN.diagnostics.pluralize(0)).toBe('warnings');
    expect(EN.diagnostics.pluralize(1)).toBe('warning');
    expect(EN.diagnostics.pluralize(2)).toBe('warnings');
  });
  it('pairingMissing enthält Argument-ID und ist englisch', () => {
    const msg = EN.editor.pairingMissing('foo-1');
    expect(msg).toContain('foo-1');
    expect(msg).toMatch(/does not exist|missing/i);
  });
});
