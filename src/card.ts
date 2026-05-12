import { LitElement, html, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  buildCardState,
  hassRelevantSensorsChanged,
  isStubConfig,
  renderSkeleton,
  resolveEntityId,
} from './card-helpers';
import { cardStyles } from './card-styles';
import { validateConfig } from './config/schema';
import { CARD_TYPE, DEFAULTS } from './const';
import { fireMoreInfo } from './ha/ha-helpers';
import { DE } from './i18n/de';
import { renderCard } from './render/flow-renderer';
import { computeLayout, type LayoutResult } from './render/layout';
import type { Config, DisplayConsumer } from './config/types';
import type { FlowResult } from './engine/types';
import type { HomeAssistant } from './ha/ha-types';
import type { EngineWarning } from './util/warning-types';

@customElement(CARD_TYPE)
export class CustomEnergyFlowCard extends LitElement {
  // We use shouldUpdate (not @property hasChanged) because Lit's hasChanged
  // does not receive `this`, so it cannot read `this._config` to decide which
  // sensors are relevant. shouldUpdate runs on the element instance.
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: Config;
  @state() private _flowResult?: FlowResult;
  @state() private _layout?: LayoutResult;
  @state() private _renderError?: string;
  @state() private _buildWarnings: EngineWarning[] = [];
  @state() private _unavailable: Set<string> = new Set();
  @state() private _batterySoc: Map<string, number> = new Map();
  @state() private _displayConsumers: ReadonlyMap<string, DisplayConsumer> = new Map();
  @state() private _unavailableGroups: Set<string> = new Set();
  @state() private _containerW = 720;
  private _resizeObs?: ResizeObserver;

  static override styles = cardStyles;

  setConfig(config: unknown): void {
    // validateConfig itself accepts the HA stub-config (empty grid.power +
    // all lists empty) — see config/schema.ts.
    const validated = validateConfig(config);
    this._config = validated;
    // _layout is computed in willUpdate once hass is available
    if (validated.display?.debug) {
      console.info('[CEFC] setConfig accepted', {
        stub: isStubConfig(validated),
        config: validated,
      });
    }
  }

  static getConfigElement(): HTMLElement {
    return document.createElement(`${CARD_TYPE}-editor`);
  }

  static getStubConfig(): Partial<Config> {
    return {
      type: 'custom:custom-energy-flow-card',
      grid: { power: '' },
      solar: [],
      battery: [],
      consumers: [],
    };
  }

  getGridOptions(): {
    columns: number;
    rows: number;
    min_columns: number;
    max_columns: number;
    min_rows: number;
    max_rows: number;
  } {
    return {
      columns: 6,
      rows: 5,
      min_columns: 4,
      max_columns: 12,
      min_rows: 4,
      max_rows: 8,
    };
  }

  getCardSize(): number {
    return Math.ceil((this.getGridOptions().rows * 56) / 50);
  }

  override firstUpdated(): void {
    this.setAttribute('data-mounted', '');
    this._resizeObs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width } = entry.contentRect;
      if (Math.abs(width - this._containerW) > 4) {
        this._containerW = width;
      }
    });
    this._resizeObs.observe(this);
    if (this._config?.display?.debug) {
      console.info('[CEFC] firstUpdated, ResizeObserver attached', { container: this._containerW });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    // If only `hass` changed and no relevant sensor moved, skip the update.
    if (changed.size === 1 && changed.has('hass') && this._config) {
      const prev = changed.get('hass') as HomeAssistant | undefined;
      if (!hassRelevantSensorsChanged(prev, this.hass, this._config)) return false;
    }
    return true;
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!this._config || !this.hass) return;
    if (isStubConfig(this._config)) return;
    if (!changed.has('hass') && !changed.has('_config')) return;
    try {
      const { build, flow } = buildCardState(this._config, this.hass);
      this._buildWarnings = build.warnings;
      this._unavailable = build.unavailableEntities;
      this._batterySoc = build.batterySoc;
      this._displayConsumers = new Map(build.displayConsumers.map((c) => [c.id, c]));
      this._unavailableGroups = build.unavailableGroups;
      this._layout = computeLayout(this._config, build.displayConsumers);
      this._flowResult = flow;
      this._renderError = undefined;
      if (this._config.display?.debug) {
        console.info('[CEFC] willUpdate', {
          homeW: flow.homeW,
          consumers: build.displayConsumers.length,
          unavailableGroups: this._unavailableGroups.size,
        });
      }
    } catch (err) {
      this._renderError = err instanceof Error ? err.message : String(err);
      console.error('[custom-energy-flow-card] willUpdate error:', err);
    }
  }

  override render(): TemplateResult {
    if (this._renderError) {
      return html`<ha-card
        ><div class="error-banner" role="alert">
          ${DE.states.cardError}: ${this._renderError}
        </div></ha-card
      >`;
    }
    if (!this.hass || !this._config) {
      return html`<ha-card>${renderSkeleton()}</ha-card>`;
    }
    if (isStubConfig(this._config)) {
      return html`<ha-card><div class="stub-hint">${DE.states.stubHint}</div></ha-card>`;
    }
    if (!this._flowResult || !this._layout) {
      return html`<ha-card>${renderSkeleton()}</ha-card>`;
    }
    const display = this._config.display ?? {};
    const narrow = this._containerW < 280;
    return html`
      <ha-card>
        ${narrow
          ? html`<div class="narrow-banner" role="status">${DE.states.narrowBanner}</div>`
          : ''}
        ${renderCard(this._layout, this._flowResult, {
          config: this._config,
          formatGrouped: (display.number_format ?? DEFAULTS.number_format) === 'grouped',
          activeThresholdW: display.active_threshold_w ?? DEFAULTS.active_threshold_w,
          showInactive: display.show_inactive_paths ?? DEFAULTS.show_inactive_paths,
          theme: { colorOverrides: display.colors },
          animation: display.animation,
          buildWarnings: this._buildWarnings,
          unavailableEntities: this._unavailable,
          batterySoc: this._batterySoc,
          displayConsumers: this._displayConsumers,
          unavailableGroups: this._unavailableGroups,
          onNodeClick: (id) => {
            const entity = resolveEntityId(this._config, id, this._displayConsumers);
            if (entity) fireMoreInfo(this, entity);
          },
        })}
      </ha-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-energy-flow-card': CustomEnergyFlowCard;
  }
}
