import type { Config } from '../src/config/types';

export interface MockHassEntity {
  state: string;
  attributes?: Record<string, unknown>;
}

export interface MockEntityRegistry {
  area_id?: string | null;
  device_id?: string | null;
}

export interface MockDeviceRegistry {
  area_id?: string | null;
}

export interface MockAreaRegistry {
  area_id: string;
  name: string;
  icon?: string;
}

export interface MockScenario {
  name: string;
  emoji: string;
  config: Config;
  hassStates: Record<string, MockHassEntity>;
  // Optional HA-Registry-Mocks für `consumer_grouping: by_area` (ADR-0016).
  // derive-display-consumers.ts liest hass.entities/devices/areas, um Sensoren
  // pro Area zu gruppieren. Ohne diese Felder fällt der Renderer auf
  // einzel-Verbraucher zurück.
  entities?: Record<string, MockEntityRegistry>;
  devices?: Record<string, MockDeviceRegistry>;
  areas?: Record<string, MockAreaRegistry>;
}

const baseConfig = (): Config => ({
  type: 'custom:custom-energy-flow-card',
  title: 'Energiefluss',
  solar: [
    { id: 'dach', name: 'Solar Dach', power: 'sensor.s_dach' },
    { id: 'balkon', name: 'Solar Balkon', power: 'sensor.s_balkon' },
  ],
  battery: [
    {
      id: 'b_dach',
      name: 'Dach-Speicher',
      soc: 'sensor.b_dach_soc',
      power: 'sensor.b_dach_power',
      charged_by: 'dach',
    },
    {
      id: 'b_balkon',
      name: 'Balkon-Speicher',
      soc: 'sensor.b_balkon_soc',
      power: 'sensor.b_balkon_power',
      charged_by: 'balkon',
    },
  ],
  grid: { power: 'sensor.grid_power' },
  consumers: [
    { name: 'Wärmepumpe', power: 'sensor.heatpump' },
    { name: 'Wallbox', power: 'sensor.wallbox' },
    { name: 'Herd', power: 'sensor.stove' },
  ],
  display: { active_threshold_w: 5, number_format: 'grouped', show_inactive_paths: false },
});

const wAttrs = { unit_of_measurement: 'W' };
const pctAttrs = { unit_of_measurement: '%' };

export const scenarios: MockScenario[] = [
  {
    name: 'Sonniger Tag · Akkus laden · Überschuss → Netz',
    emoji: '☀️',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '2600', attributes: wAttrs },
      'sensor.s_balkon': { state: '600', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '75', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '600', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '42', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '200', attributes: wAttrs },
      'sensor.grid_power': { state: '-1200', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Abend · Akkus speisen Haus & Netz',
    emoji: '🌙',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '0', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '68', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '-1100', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '38', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '-400', attributes: wAttrs },
      'sensor.grid_power': { state: '-300', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '700', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Nacht · Reiner Netzbezug',
    emoji: '🌃',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '0', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '12', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '8', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '500', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Pairing-Defizit',
    emoji: '⚡',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '200', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '50', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '500', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '300', attributes: wAttrs },
      'sensor.heatpump': { state: '0', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  {
    name: 'Großverbraucher aktiv (Wallbox)',
    emoji: '🔌',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '1500', attributes: wAttrs },
      'sensor.s_balkon': { state: '300', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '60', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '5500', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '6800', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Alle Werte 0',
    emoji: '🛑',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '0', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '20', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '15', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '0', attributes: wAttrs },
      'sensor.heatpump': { state: '0', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  {
    name: 'Inkonsistente Sensor-Werte (phantom_export)',
    emoji: '⚠️',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '1000', attributes: wAttrs },
      'sensor.s_balkon': { state: '0', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '50', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '0', attributes: wAttrs },
      'sensor.heatpump': { state: '300', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  {
    name: 'Sensor unavailable',
    emoji: '🚫',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: 'unavailable' },
      'sensor.s_balkon': { state: '300', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '50', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '200', attributes: wAttrs },
      'sensor.heatpump': { state: '500', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '0', attributes: wAttrs },
    },
  },
  // Animation-Identity-Test (M4): zwei aufeinanderfolgende Szenarien mit
  // identischer Topologie aber leicht unterschiedlichen Werten — beim Wechsel
  // dürfen die Punkte NICHT zurückspringen oder restart-en. Wenn doch:
  // Lit-Diff ersetzt das gesamte <g>, statt nur das style-Attribut zu patchen.
  {
    name: 'Animation-Identity A · sonniger Tag (Wert-Variante 1)',
    emoji: '🔁',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '2400', attributes: wAttrs },
      'sensor.s_balkon': { state: '500', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '70', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '500', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '150', attributes: wAttrs },
      'sensor.grid_power': { state: '-1000', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  {
    name: 'Animation-Identity B · sonniger Tag (Wert-Variante 2)',
    emoji: '🔁',
    config: baseConfig(),
    hassStates: {
      'sensor.s_dach': { state: '2700', attributes: wAttrs },
      'sensor.s_balkon': { state: '650', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '71', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '700', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '41', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '250', attributes: wAttrs },
      'sensor.grid_power': { state: '-1100', attributes: wAttrs },
      'sensor.heatpump': { state: '450', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '100', attributes: wAttrs },
    },
  },
  // Split-Sensor-Variante (ADR-0015): Hardware wie Sungrow oder Solarwatt
  // liefert zwei separate Sensoren (charge_power, discharge_power) statt einem
  // signierten Wert. Aggregation passiert in `buildSystemState`.
  {
    name: 'Split-Sensoren · Solarwatt-Stil',
    emoji: '🔀',
    config: {
      type: 'custom:custom-energy-flow-card',
      title: 'Energiefluss (split sensors)',
      solar: [{ id: 'dach', name: 'Solar Dach', power: 'sensor.s_dach' }],
      battery: [
        {
          id: 'b_dach',
          name: 'Dach-Speicher',
          soc: 'sensor.b_dach_soc',
          charge_power: 'sensor.b_dach_charge',
          discharge_power: 'sensor.b_dach_discharge',
          charged_by: 'dach',
        },
      ],
      grid: { power: 'sensor.grid_power' },
      consumers: [
        { name: 'Wärmepumpe', power: 'sensor.heatpump' },
        { name: 'Wallbox', power: 'sensor.wallbox' },
      ],
      display: { active_threshold_w: 5, number_format: 'grouped' },
    },
    hassStates: {
      'sensor.s_dach': { state: '2200', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '64', attributes: pctAttrs },
      'sensor.b_dach_charge': { state: '800', attributes: wAttrs },
      'sensor.b_dach_discharge': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '-500', attributes: wAttrs },
      'sensor.heatpump': { state: '400', attributes: wAttrs },
      'sensor.wallbox': { state: '500', attributes: wAttrs },
    },
  },
  // Sensor-Jitter (M5): simuliert reale HA-Bedingungen mit Noise auf allen
  // Sensoren. Engine-Warnings sollten nicht durchgehend feuern. Wird in der
  // Sandbox per setInterval aktualisiert.
  {
    name: 'Sensor-Jitter · echte HA-Realität',
    emoji: '📡',
    config: { ...baseConfig(), display: { ...baseConfig().display, debug: true } },
    hassStates: {
      'sensor.s_dach': { state: '2050', attributes: wAttrs },
      'sensor.s_balkon': { state: '510', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '67', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '550', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '39', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '180', attributes: wAttrs },
      'sensor.grid_power': { state: '-820', attributes: wAttrs }, // leicht inkonsistent zur Bilanz
      'sensor.heatpump': { state: '410', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '95', attributes: wAttrs },
    },
  },
  // by-area Grouping (ADR-0016): 8 Smart-Plug-Sensoren werden automatisch in
  // 3 Raum-Knoten gemerged (Büro / Küche / Wohnzimmer). Benötigt entities +
  // areas Registry. Demonstriert das Feature für README-Screenshots.
  {
    name: 'Area-Gruppierung · 8 Sensoren → 3 Räume',
    emoji: '🏠',
    config: {
      type: 'custom:custom-energy-flow-card',
      title: 'Energiefluss · Area-Gruppierung',
      solar: [
        { id: 'dach', name: 'Solar Dach', power: 'sensor.s_dach' },
        { id: 'balkon', name: 'Solar Balkon', power: 'sensor.s_balkon' },
      ],
      battery: [
        {
          id: 'b_dach',
          name: 'Dach-Speicher',
          soc: 'sensor.b_dach_soc',
          power: 'sensor.b_dach_power',
          charged_by: 'dach',
        },
        {
          id: 'b_balkon',
          name: 'Balkon-Speicher',
          soc: 'sensor.b_balkon_soc',
          power: 'sensor.b_balkon_power',
          charged_by: 'balkon',
        },
      ],
      grid: { power: 'sensor.grid_power' },
      consumers: [
        { name: 'PC', power: 'sensor.pc' },
        { name: 'Monitor', power: 'sensor.monitor' },
        { name: 'Herd', power: 'sensor.stove_area' },
        { name: 'Geschirrspüler', power: 'sensor.dishwasher' },
        { name: 'Mikrowelle', power: 'sensor.microwave' },
        { name: 'TV', power: 'sensor.tv' },
        { name: 'Soundbar', power: 'sensor.soundbar' },
        { name: 'Licht', power: 'sensor.light' },
      ],
      display: {
        active_threshold_w: 5,
        number_format: 'grouped',
        show_inactive_paths: false,
        consumer_grouping: 'by_area',
      },
    },
    hassStates: {
      'sensor.s_dach': { state: '2200', attributes: wAttrs },
      'sensor.s_balkon': { state: '600', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '65', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '300', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '45', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '100', attributes: wAttrs },
      'sensor.grid_power': { state: '-685', attributes: wAttrs },
      // Büro
      'sensor.pc': { state: '80', attributes: wAttrs },
      'sensor.monitor': { state: '35', attributes: wAttrs },
      // Küche
      'sensor.stove_area': { state: '800', attributes: wAttrs },
      'sensor.dishwasher': { state: '500', attributes: wAttrs },
      'sensor.microwave': { state: '120', attributes: wAttrs },
      // Wohnzimmer
      'sensor.tv': { state: '100', attributes: wAttrs },
      'sensor.soundbar': { state: '30', attributes: wAttrs },
      'sensor.light': { state: '50', attributes: wAttrs },
    },
    entities: {
      'sensor.pc': { area_id: 'office' },
      'sensor.monitor': { area_id: 'office' },
      'sensor.stove_area': { area_id: 'kitchen' },
      'sensor.dishwasher': { area_id: 'kitchen' },
      'sensor.microwave': { area_id: 'kitchen' },
      'sensor.tv': { area_id: 'livingroom' },
      'sensor.soundbar': { area_id: 'livingroom' },
      'sensor.light': { area_id: 'livingroom' },
    },
    areas: {
      office: { area_id: 'office', name: 'Büro' },
      kitchen: { area_id: 'kitchen', name: 'Küche' },
      livingroom: { area_id: 'livingroom', name: 'Wohnzimmer' },
    },
  },
  {
    name: 'Icon-Demo · Custom mdi:heat-pump auf Verbraucher',
    emoji: '🎨',
    config: {
      ...baseConfig(),
      consumers: [
        { name: 'Wärmepumpe', power: 'sensor.heatpump', icon: 'mdi:heat-pump' },
        { name: 'Wallbox', power: 'sensor.wallbox', icon: 'mdi:ev-station' },
        { name: 'Herd', power: 'sensor.stove', icon: 'mdi:stove' },
      ],
    },
    hassStates: {
      'sensor.s_dach': { state: '2400', attributes: wAttrs },
      'sensor.s_balkon': { state: '600', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '65', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '300', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '100', attributes: wAttrs },
      'sensor.grid_power': { state: '-800', attributes: wAttrs },
      'sensor.heatpump': { state: '600', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '200', attributes: wAttrs },
    },
  },
  {
    name: 'Icon-Demo · Area-Icons via by_area-Grouping',
    emoji: '🏠',
    config: {
      ...baseConfig(),
      consumers: [
        { name: 'Wärmepumpe', power: 'sensor.heatpump' },
        { name: 'Wallbox', power: 'sensor.wallbox' },
        { name: 'Herd', power: 'sensor.stove' },
      ],
      display: {
        ...baseConfig().display,
        consumer_grouping: 'by_area',
      },
    },
    hassStates: {
      'sensor.s_dach': { state: '1800', attributes: wAttrs },
      'sensor.s_balkon': { state: '400', attributes: wAttrs },
      'sensor.b_dach_soc': { state: '55', attributes: pctAttrs },
      'sensor.b_dach_power': { state: '0', attributes: wAttrs },
      'sensor.b_balkon_soc': { state: '40', attributes: pctAttrs },
      'sensor.b_balkon_power': { state: '0', attributes: wAttrs },
      'sensor.grid_power': { state: '0', attributes: wAttrs },
      'sensor.heatpump': { state: '500', attributes: wAttrs },
      'sensor.wallbox': { state: '0', attributes: wAttrs },
      'sensor.stove': { state: '200', attributes: wAttrs },
    },
    entities: {
      'sensor.heatpump': { area_id: 'keller' },
      'sensor.wallbox': { area_id: 'garage' },
      'sensor.stove': { area_id: 'kueche' },
    },
    areas: {
      keller: { area_id: 'keller', name: 'Keller', icon: 'mdi:home-floor-b' },
      garage: { area_id: 'garage', name: 'Garage', icon: 'mdi:garage' },
      kueche: { area_id: 'kueche', name: 'Küche', icon: 'mdi:stove' },
    },
  },
];

export function buildMockHass(scenario: MockScenario): {
  states: Record<string, MockHassEntity>;
  entities?: Record<string, MockEntityRegistry>;
  devices?: Record<string, MockDeviceRegistry>;
  areas?: Record<string, MockAreaRegistry>;
} {
  return {
    states: scenario.hassStates,
    entities: scenario.entities,
    devices: scenario.devices,
    areas: scenario.areas,
  };
}
