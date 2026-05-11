import { LitElement, css, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { validateConfig } from './config/schema';
import { CARD_TYPE } from './const';
import {
  renderBatterySection,
  renderConsumersSection,
  renderSolarSection,
} from './editor-list-sections';
import { fireConfigChanged } from './ha/ha-helpers';
import { DE } from './i18n/de';
import type {
  BatteryConfig,
  Config,
  ConsumerConfig,
  GridConfig,
  SolarConfig,
} from './config/types';
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
    const c = this._config;
    if (!c) return html``;
    return html`
      ${this._validationError
        ? html` <div class="validation-banner" role="alert">${this._validationError}</div> `
        : ''}
      ${this._renderGeneral()}
      ${renderSolarSection(c.solar, this.hass, {
        onItemChange: (i, value) => this._onSolarItemChange(i, value),
        onAdd: () => this._addSolar(),
        onRemove: (i) => this._removeSolar(i),
        onMove: (i, delta) => this._moveSolar(i, delta),
      })}
      ${renderBatterySection(c.battery, c.solar, this.hass, {
        onItemChange: (i, value) => this._onBatteryItemChange(i, value),
        onPairChange: (i, charged_by) => this._onBatteryPairChange(i, charged_by),
        onModeChange: (i, mode) => this._onBatteryModeChange(i, mode),
        onAdd: () => this._addBattery(),
        onRemove: (i) => this._removeBattery(i),
        onMove: (i, delta) => this._moveBattery(i, delta),
      })}
      ${this._renderGridSection()}
      ${renderConsumersSection(c.consumers, this.hass, {
        onItemChange: (i, value) => this._onConsumerItemChange(i, value),
        onAdd: () => this._addConsumer(),
        onRemove: (i) => this._removeConsumer(i),
        onMove: (i, delta) => this._moveConsumer(i, delta),
      })}
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
          { name: 'import', selector: { entity: { domain: 'sensor', device_class: 'power' } } },
          { name: 'export', selector: { entity: { domain: 'sensor', device_class: 'power' } } },
        ]
      : [
          { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
          { name: 'power', selector: { entity: { domain: 'sensor', device_class: 'power' } } },
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
        : {
            power: (value['power'] as string) ?? '',
            power_invert: Boolean(value['power_invert']),
          };
    this._emitChange({ ...this._config, grid: newGrid });
  }

  private _nextUniqueId(prefix: string, existing: string[]): string {
    const taken = new Set(existing);
    let n = existing.length + 1;
    while (taken.has(`${prefix}${n}`)) n++;
    return `${prefix}${n}`;
  }

  private _onSolarItemChange(i: number, value: SolarConfig): void {
    if (!this._config) return;
    const solar = [...this._config.solar];
    solar[i] = value;
    this._emitChange({ ...this._config, solar });
  }

  private _addSolar(): void {
    if (!this._config) return;
    const id = this._nextUniqueId(
      'pv',
      this._config.solar.map((s) => s.id),
    );
    const solar = [...this._config.solar, { id, power: '' }];
    this._emitChange({ ...this._config, solar });
  }

  private _removeSolar(i: number): void {
    if (!this._config) return;
    const solar = this._config.solar.filter((_, idx) => idx !== i);
    this._emitChange({ ...this._config, solar });
  }

  private _moveSolar(i: number, delta: number): void {
    if (!this._config) return;
    const solar = [...this._config.solar];
    const j = i + delta;
    if (j < 0 || j >= solar.length) return;
    const tmp = solar[i];
    const other = solar[j];
    if (!tmp || !other) return;
    solar[i] = other;
    solar[j] = tmp;
    this._emitChange({ ...this._config, solar });
  }

  private _onBatteryItemChange(i: number, value: BatteryConfig): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    battery[i] = value;
    this._emitChange({ ...this._config, battery });
  }

  private _onBatteryPairChange(i: number, charged_by: string): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    const item = battery[i];
    if (!item) return;
    battery[i] = { ...item, charged_by };
    this._emitChange({ ...this._config, battery });
  }

  private _onBatteryModeChange(i: number, mode: 'signed' | 'split'): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    const item = battery[i];
    if (!item) return;
    // Mode-Wechsel resettet die nicht zur neuen Variante passenden Felder,
    // analog zu Grid (_onGridChange). Validation-Banner zeigt fehlende Felder
    // bis der User sie ausfüllt.
    const base = {
      id: item.id,
      name: item.name,
      soc: item.soc,
      charged_by: item.charged_by,
      icon: item.icon,
    };
    battery[i] =
      mode === 'split'
        ? { ...base, charge_power: '', discharge_power: '' }
        : { ...base, power: '', power_invert: false };
    this._emitChange({ ...this._config, battery });
  }

  private _addBattery(): void {
    if (!this._config) return;
    const id = this._nextUniqueId(
      'b',
      this._config.battery.map((b) => b.id),
    );
    const battery = [...this._config.battery, { id, soc: '', power: '', charged_by: '' }];
    this._emitChange({ ...this._config, battery });
  }

  private _removeBattery(i: number): void {
    if (!this._config) return;
    const battery = this._config.battery.filter((_, idx) => idx !== i);
    this._emitChange({ ...this._config, battery });
  }

  private _moveBattery(i: number, delta: number): void {
    if (!this._config) return;
    const battery = [...this._config.battery];
    const j = i + delta;
    if (j < 0 || j >= battery.length) return;
    const tmp = battery[i];
    const other = battery[j];
    if (!tmp || !other) return;
    battery[i] = other;
    battery[j] = tmp;
    this._emitChange({ ...this._config, battery });
  }

  private _onConsumerItemChange(i: number, value: ConsumerConfig): void {
    if (!this._config) return;
    const consumers = [...this._config.consumers];
    consumers[i] = value;
    this._emitChange({ ...this._config, consumers });
  }

  private _addConsumer(): void {
    if (!this._config) return;
    const consumers = [...this._config.consumers, { name: 'Verbraucher', power: '' }];
    this._emitChange({ ...this._config, consumers });
  }

  private _removeConsumer(i: number): void {
    if (!this._config) return;
    const consumers = this._config.consumers.filter((_, idx) => idx !== i);
    this._emitChange({ ...this._config, consumers });
  }

  private _moveConsumer(i: number, delta: number): void {
    if (!this._config) return;
    const consumers = [...this._config.consumers];
    const j = i + delta;
    if (j < 0 || j >= consumers.length) return;
    const tmp = consumers[i];
    const other = consumers[j];
    if (!tmp || !other) return;
    consumers[i] = other;
    consumers[j] = tmp;
    this._emitChange({ ...this._config, consumers });
  }

  private _emitChange(config: Config): void {
    this._config = config;
    try {
      validateConfig(config);
      this._validationError = undefined;
      fireConfigChanged(this, config);
    } catch (err) {
      this._validationError = err instanceof Error ? err.message : String(err);
      console.warn('[custom-energy-flow-card] config not yet valid:', err);
      // Do not fire config-changed: HA would otherwise persist invalid config.
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-energy-flow-card-editor': CustomEnergyFlowCardEditor;
  }
}
