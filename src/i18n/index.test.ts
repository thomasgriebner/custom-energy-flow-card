import { describe, expect, it } from 'vitest';
import { CARD_NAME } from '../const';
import { DE } from './de';
import { EN } from './en';
import { langFromHass, resolveT } from './index';

describe('langFromHass', () => {
  it.each([
    ['de', 'de'],
    ['de-DE', 'de'],
    ['de-AT', 'de'],
    ['de-CH', 'de'],
    ['DE', 'de'], // case-insensitive defensive
    ['en', 'en'],
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['fr', 'en'],
    ['es', 'en'],
    ['ja', 'en'],
    ['', 'en'],
  ] as const)('hass.locale.language=%s → %s', (lang, expected) => {
    expect(langFromHass({ locale: { language: lang } })).toBe(expected);
  });

  it('undefined hass → en', () => {
    expect(langFromHass(undefined)).toBe('en');
  });

  it('hass without locale → en', () => {
    expect(langFromHass({})).toBe('en');
  });

  it('hass.locale without language → en', () => {
    expect(langFromHass({ locale: {} })).toBe('en');
  });
});

describe('resolveT', () => {
  it('resolveT(de) === DE (referential identity)', () => {
    expect(resolveT('de')).toBe(DE);
  });
  it('resolveT(en) === EN (referential identity)', () => {
    expect(resolveT('en')).toBe(EN);
  });
});

// CARD_NAME ↔ DE.card.name ↔ EN.card.name Single-Source-Konsistenz (ADR-0010)
describe('CARD_NAME Konsistenz', () => {
  it('CARD_NAME === DE.card.name === EN.card.name', () => {
    expect(CARD_NAME).toBe(DE.card.name);
    expect(CARD_NAME).toBe(EN.card.name);
  });
});
