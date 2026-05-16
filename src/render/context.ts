import type { ThemeContext } from './theme';
import type { AnimationConfig, Config, DisplayConsumer } from '../config/types';
import type { Translations } from '../i18n';
import type { EngineWarning } from '../util/warning-types';

export interface RenderContext {
  config: Config;
  formatGrouped: boolean;
  activeThresholdW: number;
  showInactive: boolean;
  theme: ThemeContext;
  buildWarnings: EngineWarning[]; // warnings collected in buildSystemState
  unavailableEntities: Set<string>; // entity_ids that are 'unavailable'/'unknown'
  /** Pro-Akku SoC (%), nur enthalten wenn der zugehörige soc-Sensor verfügbar ist. */
  batterySoc: ReadonlyMap<string, number>;
  displayConsumers: ReadonlyMap<string, DisplayConsumer>;
  unavailableGroups: ReadonlySet<string>;
  animation?: AnimationConfig;
  onNodeClick?: (nodeId: string) => void;
  /** Resolved translations (DE oder EN), bestimmt aus hass.locale.language in card.ts. */
  t: Translations;
}
