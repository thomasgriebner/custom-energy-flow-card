import type { Translations } from './index';

export const EN: Translations = {
  card: {
    name: 'Custom Energy Flow Card',
    description:
      'Multi-source energy-flow visualization with any number of PVs, batteries and consumers',
  },
  nodes: {
    solar: 'Solar',
    battery: 'Battery',
    grid: 'Grid',
    home: 'Home',
    consumer: 'Consumer',
    unassignedGroup: 'Other',
  },
  units: { watt: 'W', percent: '%' },
  states: {
    loading: 'Loading …',
    sensorUnavailable: 'Sensor unavailable',
    stubHint: 'Add solar, battery or consumer entries to see the energy diagram.',
    cardError: 'Card error',
    narrowBanner: 'Best viewed at 320 px width or more',
  },
  grid: { consumption: 'Import', feedIn: 'Export' },
  battery: { charging: 'charging', discharging: 'discharging' },
  diagnostics: {
    iconLabel: 'Diagnostics',
    title: 'Engine warnings',
    pluralize: (n: number): string => (n === 1 ? 'warning' : 'warnings'),
  },
  editor: {
    sectionGeneral: 'General',
    sectionSolar: 'Solar systems',
    sectionBattery: 'Batteries',
    sectionGrid: 'Grid',
    sectionConsumers: 'Consumers',
    sectionDisplay: 'Display',
    addSolar: '+ Add PV',
    addBattery: '+ Add battery',
    addConsumer: '+ Add consumer',
    chargedBy: 'Charged by',
    chargedByPlaceholder: '— select —',
    pairingMissing: (id: string) => `PV ID "${id}" does not exist`,
    moveUp: '↑',
    moveDown: '↓',
    remove: 'Remove',
    consumerGroupingLabel: 'Consumer grouping',
    consumerGroupingNone: 'None',
    consumerGroupingByArea: 'By HA area',
  },
};
