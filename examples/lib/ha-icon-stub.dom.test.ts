// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerHaIconStub } from './ha-icon-stub';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('HaIconStub (DOM)', () => {
  it('renders <svg><path> with d-attribute for known icon', () => {
    registerHaIconStub();
    const el = document.createElement('ha-icon');
    el.setAttribute('icon', 'mdi:battery');
    document.body.appendChild(el);
    expect(el.innerHTML).toContain('<svg');
    expect(el.innerHTML).toMatch(/<path d="[^"]+"/);
  });

  it('renders placeholder rectangle and warns for unknown icon', () => {
    registerHaIconStub();
    const el = document.createElement('ha-icon');
    el.setAttribute('icon', 'mdi:does-not-exist-foo-bar');
    document.body.appendChild(el);
    expect(el.innerHTML).toContain('<rect');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('unknown icon: mdi:does-not-exist-foo-bar'),
    );
  });
});
