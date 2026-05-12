export const DE = {
  card: {
    name: 'Custom Energy Flow Card',
    description:
      'Multi-Source Energie-Flow-Visualisierung mit beliebig vielen PVs, Akkus und Verbrauchern',
  },
  nodes: {
    solar: 'Solar',
    battery: 'Speicher',
    grid: 'Netz',
    home: 'Hausverbrauch',
    consumer: 'Verbraucher',
    unassignedGroup: 'Sonstige',
  },
  units: {
    watt: 'W',
    percent: '%',
  },
  states: {
    loading: 'Lade …',
    sensorUnavailable: 'Sensor nicht verfügbar',
    stubHint: 'Füge Solar, Akku oder Verbraucher hinzu, um das Energie-Diagramm zu sehen.',
    cardError: 'Card-Fehler',
    narrowBanner: 'Beste Darstellung ab 320 px Breite',
  },
  grid: {
    consumption: 'Bezug',
    feedIn: 'Einspeisung',
  },
  battery: {
    charging: 'laden',
    discharging: 'entladen',
  },
  diagnostics: {
    iconLabel: 'Diagnose-Hinweise',
    title: 'Engine-Warnungen',
    pluralize: (n: number): string => (n === 1 ? 'Warnung' : 'Warnungen'),
  },
  editor: {
    sectionGeneral: 'Allgemein',
    sectionSolar: 'Solar-Anlagen',
    sectionBattery: 'Akkus',
    sectionGrid: 'Netz',
    sectionConsumers: 'Verbraucher',
    sectionDisplay: 'Anzeige',
    addSolar: '+ PV hinzufügen',
    addBattery: '+ Akku hinzufügen',
    addConsumer: '+ Verbraucher hinzufügen',
    chargedBy: 'Lädt von',
    chargedByPlaceholder: '— wählen —',
    pairingMissing: (id: string) => `PV-ID „${id}" existiert nicht`,
    moveUp: '↑',
    moveDown: '↓',
    remove: 'Entfernen',
    consumerGroupingLabel: 'Verbraucher-Gruppierung',
    consumerGroupingNone: 'Keine',
    consumerGroupingByArea: 'Nach HA-Area',
  },
} as const;
