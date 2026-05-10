export function fireMoreInfo(target: HTMLElement, entityId: string): void {
  const event = new CustomEvent('hass-more-info', {
    bubbles: true,
    composed: true,
    detail: { entityId },
  });
  target.dispatchEvent(event);
}

export function fireConfigChanged(target: HTMLElement, config: unknown): void {
  const event = new CustomEvent('config-changed', {
    bubbles: true,
    composed: true,
    detail: { config },
  });
  target.dispatchEvent(event);
}
