import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CARD_TYPE } from './const';
import { fireConfigChanged } from './ha/ha-helpers';
import { DE } from './i18n/de';
import type { Config, GridConfig } from './config/types';
import type { HomeAssistant } from './ha/ha-types';

@customElement(`${CARD_TYPE}-editor`)
export class CustomEnergyFlowCardEditor extends LitElement {
  @property({ attribute: false })
  hass?: HomeAssistant;

  @state()
  private _config?: Config;

  @state()
  private _validationError?: string;

  static override styles = css`
    :host {
      display: block;
    }
    .validation-banner {
      margin-bottom: 12px;
      padding: 8px 12px;
      background: color-mix(in srgb, var(--error-color, #b00020) 12%, transparent);
      color: var(--error-color, #b00020);
      border: 1px solid var(--error-color, #b00020);
      border-radius: 6px;
      font-size: 12px;
    }
    .section {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid var(--divider-color, #e2e8f0);
      border-radius: 8px;
    }
    .section h3 {
      margin: 0 0 8px;
      font-size: 14px;
    }
    .list-item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 8px 0;
      border-top: 1px solid var(--divider-color, #e2e8f0);
    }
    .list-item ha-form {
      flex: 1;
    }
    .list-item button {
      background: transparent;
      border: 1px solid var(--divider-color, #e2e8f0);
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }
    .add-btn {
      margin-top: 8px;
      cursor: pointer;
      background: transparent;
      border: 1px dashed var(--divider-color, #cbd5e1);
      padding: 6px 12px;
      border-radius: 8px;
    }
    .error {
      color: var(--error-color, #b00020);
      font-size: 12px;
      display: block;
      margin-top: 4px;
    }
    label.pairing {
      display: block;
      font-size: 12px;
      color: var(--primary-text-color);
      margin-top: 8px;
    }
  `;

  setConfig(config: Config): void {
    this._config = config;
  }

  override render(): TemplateResult {
    if (!this._config) return html``;
    return html`
      ${this._validationError
        ? html` <div class="validation-banner" role="alert">${this._validationError}</div> `
        : ''}
      ${this._renderGeneral()} ${this._renderSolarSection()} ${this._renderBatterySection()}
      ${this._renderGridSection()} ${this._renderConsumersSection()}
    `;
  }

  private _renderGeneral(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const data = {
      title: c.title ?? '',
      number_format: c.display?.number_format ?? 'grouped',
      show_inactive_paths: c.display?.show_inactive_paths ?? false,
    };
    const schema = [
      { name: 'title', selector: { text: {} } },
      {
        name: 'number_format',
        selector: { select: { options: ['standard', 'grouped'] } },
      },
      { name: 'show_inactive_paths', selector: { boolean: {} } },
    ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionGeneral}</h3>
        <ha-form
          .data=${data}
          .schema=${schema}
          .hass=${this.hass}
          @value-changed=${(e: CustomEvent) => this._onGeneralChange(e.detail.value)}
        ></ha-form>
      </div>
    `;
  }

  private _onGeneralChange(value: Record<string, unknown>): void {
    if (!this._config) return;
    const newConfig: Config = {
      ...this._config,
      title: (value['title'] as string) || undefined,
      display: {
        ...this._config.display,
        number_format: value['number_format'] as 'standard' | 'grouped',
        show_inactive_paths: Boolean(value['show_inactive_paths']),
      },
    };
    this._emitChange(newConfig);
  }

  private _renderGridSection(): TemplateResult {
    const c = this._config;
    if (!c) return html``;
    const isSplit = !('power' in c.grid);
    const data = isSplit
      ? {
          mode: 'split',
          import: (c.grid as { import: string }).import,
          export: (c.grid as { export: string }).export,
        }
      : {
          mode: 'signed',
          power: (c.grid as { power: string }).power,
          power_invert: (c.grid as { power_invert?: boolean }).power_invert ?? false,
        };
    const schema = isSplit
      ? [
          { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
          { name: 'import', selector: { entity: { domain: 'sensor' } } },
          { name: 'export', selector: { entity: { domain: 'sensor' } } },
        ]
      : [
          { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
          { name: 'power', selector: { entity: { domain: 'sensor' } } },
          { name: 'power_invert', selector: { boolean: {} } },
        ];
    return html`
      <div class="section">
        <h3>${DE.editor.sectionGrid}</h3>
        <ha-form
          .data=${data}
          .schema=${schema}
          .hass=${this.hass}
          @value-changed=${(e: CustomEvent) => this._onGridChange(e.detail.value)}
        ></ha-form>
      </div>
    `;
  }

  private _onGridChange(value: Record<string, unknown>): void {
    if (!this._config) return;
    const mode = value['mode'] as 'signed' | 'split';
    // Mode-Wechsel resettet die nicht zur neuen Form passenden Felder. Beim
    // ersten Wechsel auf "split" haben wir kein import/export → '' Defaults
    // verursachen einen Validation-Error, der via _validationError als Banner
    // sichtbar wird, bis der User die Felder befüllt.
    const newGrid: GridConfig =
      mode === 'split'
        ? { import: (value['import'] as string) ?? '', export: (value['export'] as string) ?? '' }
        : { power: (value['power'] as string) ?? '', power_invert: Boolean(value['power_invert']) };
    this._emitChange({ ...this._config, grid: newGrid });
  }

  private _nextUniqueId(prefix: string, existing: string[]): string {
    const taken = new Set(existing);
    let n = existing.length + 1;
    while (taken.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  }

  private _renderSolarSection(): TemplateResult {
    return html``;
  }
  private _renderBatterySection(): TemplateResult {
    return html``;
  }
  private _renderConsumersSection(): TemplateResult {
    return html``;
  }

  private _emitChange(config: Config): void {
    this._config = config;
    fireConfigChanged(this, config);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-energy-flow-card-editor': CustomEnergyFlowCardEditor;
  }
}
