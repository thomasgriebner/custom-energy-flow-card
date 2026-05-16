import { html, type TemplateResult } from 'lit';
import type { BatteryConfig, ConsumerConfig, SolarConfig } from './config/types';
import type { HomeAssistant } from './ha/ha-types';
import type { Translations } from './i18n';

export interface SolarSectionHandlers {
  onItemChange: (i: number, value: SolarConfig) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMove: (i: number, delta: number) => void;
}

export interface BatterySectionHandlers {
  onItemChange: (i: number, value: BatteryConfig) => void;
  onPairChange: (i: number, charged_by: string) => void;
  onModeChange: (i: number, mode: 'signed' | 'split') => void;
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

export interface SolarSectionProps {
  solar: readonly SolarConfig[];
  hass: HomeAssistant | undefined;
  t: Translations;
  handlers: SolarSectionHandlers;
}

export function renderSolarSection(props: SolarSectionProps): TemplateResult {
  const { solar, hass, t, handlers: h } = props;
  const itemSchema = [
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
      <h3>${t.editor.sectionSolar}</h3>
      ${solar.map(
        (item, i) => html`
          <div class="list-item">
            <ha-form
              .data=${item}
              .schema=${itemSchema}
              .hass=${hass}
              @value-changed=${(e: CustomEvent) => {
                const v = e.detail.value as Partial<SolarConfig>;
                h.onItemChange(i, { ...item, ...v } as SolarConfig);
              }}
            ></ha-form>
            <button @click=${() => h.onMove(i, -1)} ?disabled=${i === 0}>${t.editor.moveUp}</button>
            <button @click=${() => h.onMove(i, 1)} ?disabled=${i === solar.length - 1}>
              ${t.editor.moveDown}
            </button>
            <button @click=${() => h.onRemove(i)}>${t.editor.remove}</button>
          </div>
        `,
      )}
      <button class="add-btn" @click=${() => h.onAdd()}>${t.editor.addSolar}</button>
    </div>
  `;
}

export interface BatterySectionProps {
  battery: readonly BatteryConfig[];
  solar: readonly SolarConfig[];
  hass: HomeAssistant | undefined;
  t: Translations;
  handlers: BatterySectionHandlers;
}

export function renderBatterySection(props: BatterySectionProps): TemplateResult {
  const { battery, solar, hass, t, handlers: h } = props;
  return html`
    <div class="section">
      <h3>${t.editor.sectionBattery}</h3>
      ${battery.map((item, i) => {
        const pairingMissing = !solar.some((s) => s.id === item.charged_by);
        const isSplit = !('power' in item);
        const data = isSplit
          ? {
              id: item.id,
              name: item.name ?? '',
              soc: item.soc,
              mode: 'split',
              charge_power: item.charge_power,
              discharge_power: item.discharge_power,
              icon: item.icon ?? '',
            }
          : {
              id: item.id,
              name: item.name ?? '',
              soc: item.soc,
              mode: 'signed',
              power: item.power,
              power_invert: item.power_invert ?? false,
              icon: item.icon ?? '',
            };
        const itemSchema = isSplit
          ? [
              { name: 'name', selector: { text: {} } },
              {
                name: 'soc',
                selector: { entity: { domain: 'sensor', device_class: 'battery' } },
                required: true,
              },
              { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
              {
                name: 'charge_power',
                selector: { entity: { domain: 'sensor', device_class: 'power' } },
                required: true,
              },
              {
                name: 'discharge_power',
                selector: { entity: { domain: 'sensor', device_class: 'power' } },
                required: true,
              },
              { name: 'icon', selector: { icon: {} } },
            ]
          : [
              { name: 'name', selector: { text: {} } },
              {
                name: 'soc',
                selector: { entity: { domain: 'sensor', device_class: 'battery' } },
                required: true,
              },
              { name: 'mode', selector: { select: { options: ['signed', 'split'] } } },
              {
                name: 'power',
                selector: { entity: { domain: 'sensor', device_class: 'power' } },
                required: true,
              },
              { name: 'power_invert', selector: { boolean: {} } },
              { name: 'icon', selector: { icon: {} } },
            ];
        return html`
          <div class="list-item">
            <div style="flex:1">
              <ha-form
                .data=${data}
                .schema=${itemSchema}
                .hass=${hass}
                @value-changed=${(e: CustomEvent) => {
                  const v = e.detail.value as Record<string, unknown>;
                  const newMode = v['mode'] as 'signed' | 'split' | undefined;
                  const currentMode: 'signed' | 'split' = isSplit ? 'split' : 'signed';
                  if (newMode && newMode !== currentMode) {
                    h.onModeChange(i, newMode);
                    return;
                  }
                  h.onItemChange(i, {
                    ...item,
                    ...(v as Partial<BatteryConfig>),
                  } as BatteryConfig);
                }}
              ></ha-form>
              <label class="pairing">
                ${t.editor.chargedBy}
                <select
                  .value=${item.charged_by}
                  @change=${(e: Event) => h.onPairChange(i, (e.target as HTMLSelectElement).value)}
                >
                  <option value="" disabled ?selected=${item.charged_by === ''}>
                    ${t.editor.chargedByPlaceholder}
                  </option>
                  ${solar.map(
                    (s) => html`
                      <option value=${s.id} ?selected=${item.charged_by === s.id}>
                        ${s.name ?? `${t.nodes.solar} ${s.id}`}
                      </option>
                    `,
                  )}
                </select>
                ${pairingMissing && item.charged_by
                  ? html`<span class="error">${t.editor.pairingMissing(item.charged_by)}</span>`
                  : ''}
              </label>
            </div>
            <button @click=${() => h.onMove(i, -1)} ?disabled=${i === 0}>${t.editor.moveUp}</button>
            <button @click=${() => h.onMove(i, 1)} ?disabled=${i === battery.length - 1}>
              ${t.editor.moveDown}
            </button>
            <button @click=${() => h.onRemove(i)}>${t.editor.remove}</button>
          </div>
        `;
      })}
      <button class="add-btn" @click=${() => h.onAdd()}>${t.editor.addBattery}</button>
    </div>
  `;
}

export interface ConsumersSectionProps {
  consumers: readonly ConsumerConfig[];
  hass: HomeAssistant | undefined;
  t: Translations;
  handlers: ConsumerSectionHandlers;
}

export function renderConsumersSection(props: ConsumersSectionProps): TemplateResult {
  const { consumers, hass, t, handlers: h } = props;
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
      <h3>${t.editor.sectionConsumers}</h3>
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
            <button @click=${() => h.onMove(i, -1)} ?disabled=${i === 0}>${t.editor.moveUp}</button>
            <button @click=${() => h.onMove(i, 1)} ?disabled=${i === consumers.length - 1}>
              ${t.editor.moveDown}
            </button>
            <button @click=${() => h.onRemove(i)}>${t.editor.remove}</button>
          </div>
        `,
      )}
      <button class="add-btn" @click=${() => h.onAdd()}>${t.editor.addConsumer}</button>
    </div>
  `;
}
