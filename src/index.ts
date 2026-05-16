import { CustomEnergyFlowCard } from './card';
import { CARD_DOC_URL, CARD_NAME, CARD_TYPE, CARD_VERSION } from './const';
import './editor'; // side-effect import: registriert custom-energy-flow-card-editor
import { EN } from './i18n/en';

// Side-effect import — Lit's @customElement decorator registriert beim
// Klassen-Eval. Wir referenzieren den Wert hier explizit, sonst eliminiert
// Tree-Shaking ihn.
void CustomEnergyFlowCard;

console.info(
  `%c CUSTOM-ENERGY-FLOW-CARD %c ${CARD_VERSION} `,
  'color: white; background: #f59e0b; padding: 2px 6px; border-radius: 3px;',
  'color: #f59e0b; background: transparent; padding: 2px 6px;',
);

// Defensive bootstrap-Logs, helfen beim Bug-Triage:
console.info(`[CEFC] elements registered: ${CARD_TYPE}, ${CARD_TYPE}-editor`);

interface CardEntry {
  type: string;
  name: string;
  description: string;
  preview: boolean;
  documentationURL: string;
}

const win = window as unknown as { customCards?: CardEntry[] };
win.customCards = win.customCards ?? [];
win.customCards.push({
  type: CARD_TYPE,
  name: CARD_NAME,
  description: EN.card.description,
  preview: true,
  documentationURL: CARD_DOC_URL,
});

console.info(`[CEFC] customCards entry pushed (${win.customCards.length} cards total)`);
