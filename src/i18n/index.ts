import { DE } from './de';
import { EN } from './en';

/**
 * Mapped-Type-Widening:
 * `src/i18n/de.ts` endet mit `as const` → `typeof DE` ist Literal-Type (z.B.
 * `editor.sectionBattery: 'Akkus'`). `EN: typeof DE` mit Wert `'Batteries'`
 * würde TypeError werfen (`'Batteries' is not assignable to '"Akkus"'`).
 *
 * Widen<T> ersetzt string-Literale durch `string`, Funktionen bleiben unverändert,
 * Objekte rekursiv. Damit ist Translations strukturell kompatibel zu typeof DE
 * UND erlaubt jeden anderen string in EN.
 */
type Widen<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends (...args: infer A) => infer R
      ? (...args: A) => R
      : Widen<T[K]>;
};

export type Translations = Widen<typeof DE>;
export type Lang = 'de' | 'en';

/**
 * Strukturelle hass-Sicht — kein HA-Type-Import, damit i18n-Layer-Zone gewahrt bleibt.
 * Hinweis: src/ha/ha-types.ts:14 hat `locale?: { language: string }` (language non-optional).
 * Wir halten `language` hier OPTIONAL als defensive Verteidigung gegen partielle hass-Objekte
 * vor dem ersten setHass-Update.
 */
type HassLocaleView = { locale?: { language?: string } } | undefined;

export function langFromHass(hass: HassLocaleView): Lang {
  const lang = hass?.locale?.language;
  if (typeof lang === 'string' && lang.toLowerCase().startsWith('de')) return 'de';
  return 'en';
}

export function resolveT(lang: Lang): Translations {
  return lang === 'de' ? DE : EN;
}
