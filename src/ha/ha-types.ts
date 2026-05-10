export interface HassEntity {
  state: string;
  attributes: Record<string, unknown>;
  entity_id?: string;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity | undefined>;
  locale?: { language: string };
  themes?: { darkMode: boolean };
  callService?: (...args: unknown[]) => Promise<unknown>;
  callApi?: (...args: unknown[]) => Promise<unknown>;
}

export interface HaFormSchema {
  name: string;
  required?: boolean;
  selector?: Record<string, unknown>;
}
