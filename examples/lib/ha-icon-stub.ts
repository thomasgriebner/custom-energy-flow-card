import * as mdiAll from '@mdi/js';

export function iconNameToCamelCase(name: string): string {
  const slug = name.startsWith('mdi:') ? name.slice(4) : name;
  if (!slug) return 'mdi';
  return (
    'mdi' +
    slug
      .split('-')
      .filter((p) => p.length > 0)
      .map((p) => {
        const first = p[0] ?? '';
        return first.toUpperCase() + p.slice(1);
      })
      .join('')
  );
}

function pathFor(name: string): string | undefined {
  const key = iconNameToCamelCase(name);
  return (mdiAll as Record<string, string | undefined>)[key];
}

export function registerHaIconStub(): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get('ha-icon')) return;
  class HaIconStub extends HTMLElement {
    static observedAttributes = ['icon'];

    connectedCallback(): void {
      this.update();
    }

    attributeChangedCallback(): void {
      this.update();
    }

    private update(): void {
      const name = this.getAttribute('icon') ?? '';
      const path = pathFor(name);
      this.innerHTML = path
        ? `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="${path}" fill="currentColor"/></svg>`
        : `<svg viewBox="0 0 24 24" style="width:100%;height:100%"><rect x="2" y="2" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
      if (!path && name) console.warn(`[ha-icon-stub] unknown icon: ${name}`);
    }
  }
  customElements.define('ha-icon', HaIconStub);
}
