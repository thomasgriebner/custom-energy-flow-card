import { LitElement, html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { CARD_TYPE } from './const';

// Stub editor — replaced in Phase 4 Task 4.1 with the full Lovelace GUI editor.
// This file exists so index.ts's side-effect import resolves.
@customElement(`${CARD_TYPE}-editor`)
export class CustomEnergyFlowCardEditor extends LitElement {
  override render(): TemplateResult {
    return html`<div>Editor (stub) — full implementation in Phase 4.</div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-energy-flow-card-editor': CustomEnergyFlowCardEditor;
  }
}
