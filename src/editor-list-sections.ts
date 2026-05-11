import { html, type TemplateResult } from 'lit';
import { DE } from './i18n/de';
import type { BatteryConfig, ConsumerConfig, SolarConfig } from './config/types';
import type { HomeAssistant } from './ha/ha-types';

export interface SolarSectionHandlers {
  onItemChange: (i: number, value: SolarConfig) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, delta: number) => void;
}

export interface BatterySectionHandlers {
  onItemChange: (i: number, value: BatteryConfig) => void;
  onPairChange: (i: number, charged_by: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, delta: number) => void;
}

export interface ConsumerSectionHandlers {
  onItemChange: (i: number, value: ConsumerConfig) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, delta: number) => void;
}

export function renderSolarSection(
  solar: readonly SolarConfig[],
  hass: HomeAssistant | undefined,
  h: SolarSectionHandlers,
): TemplateResult {
  const itemSchema = [
    { name: 'id', selector: { text: {} }, required: true },
    { name: 'name', selector: { text: {} } },
    {
      name: 'power',
      selector: { entity: { domain: 'sensor', device_class: 'power' } },
      required: true,
    },
    { name: 'icon', selector: { icon: {} } },
  ];
  return html`
    <div class="section">
      <h3>${DE.editor.sectionSolar}</h3>
      ${solar.map(
        (item, i) => html`
          <div class="list-item">
            <ha-form
              .data=${item}
              .schema=${itemSchema}
              .hass=${hass}
              @value-changed=${(e: CustomEvent) => h.onItemChange(i, e.detail.value as SolarConfig)}
            ></ha-form>
            <button @click=${() => h.onMove(i, -1)} ?disabled=${i === 0}>
              ${DE.editor.moveUp}
            </button>
            <button @click=${() => h.onMove(i, 1)} ?disabled=${i === solar.length - 1}>
              ${DE.editor.moveDown}
            </button>
            <button @click=${() => h.onRemove(i)}>${DE.editor.remove}</button>
          </div>
        `,
      )}
      <button class="add-btn" @click=${() => h.onAdd()}>${DE.editor.addSolar}</button>
    </div>
  `;
}

export function renderBatterySection(
  battery: readonly BatteryConfig[],
  solar: readonly SolarConfig[],
  hass: HomeAssistant | undefined,
  h: BatterySectionHandlers,
): TemplateResult {
  const itemSchema = [
    { name: 'id', selector: { text: {} }, required: true },
    { name: 'name', selector: { text: {} } },
    {
      name: 'soc',
      selector: { entity: { domain: 'sensor', device_class: 'battery' } },
      required: true,
    },
    {
      name: 'power',
      selector: { entity: { domain: 'sensor', device_class: 'power' } },
      required: true,
    },
    { name: 'power_invert', selector: { boolean: {} } },
    { name: 'icon', selector: { icon: {} } },
  ];
  return html`
    <div class="section">
      <h3>${DE.editor.sectionBattery}</h3>
      ${battery.map((item, i) => {
        const pairingMissing = !solar.some((s) => s.id === item.charged_by);
        return html`
          <div class="list-item">
            <div style="flex:1">
              <ha-form
                .data=${item}
                .schema=${itemSchema}
                .hass=${hass}
                @value-changed=${(e: CustomEvent) =>
                  h.onItemChange(i, {
                    ...item,
                    ...(e.detail.value as Partial<BatteryConfig>),
                  })}
              ></ha-form>
              <label class="pairing">
                ${DE.editor.chargedBy}
                <select
                  .value=${item.charged_by}
                  @change=${(e: Event) => h.onPairChange(i, (e.target as HTMLSelectElement).value)}
                >
                  <option value="" disabled ?selected=${item.charged_by === ''}>
                    ${DE.editor.chargedByPlaceholder}
                  </option>
                  ${solar.map(
                    (s) => html`
                      <option value=${s.id} ?selected=${item.charged_by === s.id}>
                        ${s.name ?? s.id}
                      </option>
                    `,
                  )}
                </select>
                ${pairingMissing && item.charged_by
                  ? html`<span class="error">${DE.editor.pairingMissing(item.charged_by)}</span>`
                  : ''}
              </label>
            </div>
            <button @click=${() => h.onMove(i, -1)} ?disabled=${i === 0}>
              ${DE.editor.moveUp}
            </button>
            <button @click=${() => h.onMove(i, 1)} ?disabled=${i === battery.length - 1}>
              ${DE.editor.moveDown}
            </button>
            <button @click=${() => h.onRemove(i)}>${DE.editor.remove}</button>
          </div>
        `;
      })}
      <button class="add-btn" @click=${() => h.onAdd()}>${DE.editor.addBattery}</button>
    </div>
  `;
}

export function renderConsumersSection(
  consumers: readonly ConsumerConfig[],
  hass: HomeAssistant | undefined,
  h: ConsumerSectionHandlers,
): TemplateResult {
  const itemSchema = [
    { name: 'name', selector: { text: {} }, required: true },
    {
      name: 'power',
      selector: { entity: { domain: 'sensor', device_class: 'power' } },
      required: true,
    },
    { name: 'icon', selector: { icon: {} } },
  ];
  return html`
    <div class="section">
      <h3>${DE.editor.sectionConsumers}</h3>
      ${consumers.map(
        (item, i) => html`
          <div class="list-item">
            <ha-form
              .data=${item}
              .schema=${itemSchema}
              .hass=${hass}
              @value-changed=${(e: CustomEvent) =>
                h.onItemChange(i, e.detail.value as ConsumerConfig)}
            ></ha-form>
            <button @click=${() => h.onMove(i, -1)} ?disabled=${i === 0}>
              ${DE.editor.moveUp}
            </button>
            <button @click=${() => h.onMove(i, 1)} ?disabled=${i === consumers.length - 1}>
              ${DE.editor.moveDown}
            </button>
            <button @click=${() => h.onRemove(i)}>${DE.editor.remove}</button>
          </div>
        `,
      )}
      <button class="add-btn" @click=${() => h.onAdd()}>${DE.editor.addConsumer}</button>
    </div>
  `;
}
