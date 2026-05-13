import { describe, expect, it } from 'vitest';
import { iconNameToCamelCase } from './ha-icon-stub';

describe('iconNameToCamelCase', () => {
  it.each([
    ['mdi:battery', 'mdiBattery'],
    ['mdi:alert-circle-outline', 'mdiAlertCircleOutline'],
    ['mdi:', 'mdi'],
    ['battery', 'mdiBattery'],
    ['', 'mdi'],
    ['mdi:double--dash', 'mdiDoubleDash'],
  ])('iconNameToCamelCase(%s) → %s', (input, expected) => {
    expect(iconNameToCamelCase(input)).toBe(expected);
  });
});
