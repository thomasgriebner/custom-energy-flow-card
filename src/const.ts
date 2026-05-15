// First production install starts at 0.9.x — v1.0.0 nach 1–2 Wochen stabilem
// Praxis-Betrieb. Reduziert Erwartungsdruck und macht Bug-Fix-Releases erwartbar.
export const CARD_VERSION = '0.13.0';
export const CARD_TYPE = 'custom-energy-flow-card';
export const CARD_NAME = 'Custom Energy Flow Card';
export const CARD_DOC_URL = 'https://github.com/thomasgriebner/custom-energy-flow-card';

export const DEFAULTS = {
  active_threshold_w: 1,
  number_format: 'grouped' as const,
  show_inactive_paths: false,
  animation: {
    base_duration_s: 2.5,
    reference_power_w: 1000,
    min_duration_s: 0.6,
    max_dots_per_path: 4,
  },
};

export const VIEWBOX = { width: 960, height: 540 } as const;
export const MIN_CONTAINER_WIDTH_PX = 280;
