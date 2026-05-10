import type { HomeAssistant, HaFormSchema } from './ha-types';

declare global {
  interface HTMLElementTagNameMap {
    'ha-form': HTMLElement & {
      data: Record<string, unknown>;
      schema: HaFormSchema[];
      hass: HomeAssistant;
      computeLabel?: (s: HaFormSchema) => string;
    };
    'ha-entity-picker': HTMLElement & {
      hass: HomeAssistant;
      value: string;
      includeDomains?: string[];
    };
    'ha-icon': HTMLElement & { icon: string };
  }
  interface HTMLElementEventMap {
    'value-changed': CustomEvent<{ value: unknown }>;
    'config-changed': CustomEvent<{ config: unknown }>;
    'hass-more-info': CustomEvent<{ entityId: string }>;
  }
}

export {};
