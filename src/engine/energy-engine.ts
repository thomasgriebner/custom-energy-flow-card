import type {
  EngineWarning,
  FlowResult,
  PairingDeficit,
  PerSourceFlow,
  PvState,
  SystemState,
} from './types';

export function compute(state: SystemState): FlowResult {
  const warnings: EngineWarning[] = [];

  const pv: PvState[] = state.pv.map((p) => {
    if (p.powerW < 0) {
      warnings.push({
        code: 'NEGATIVE_PV',
        detail: `PV ${p.id} reported negative power ${p.powerW} W, clamped to 0`,
        magnitudeW: Math.abs(p.powerW),
      });
      return { ...p, powerW: 0 };
    }
    return p;
  });

  const charge = state.battery.map((b) => Math.max(0, b.powerW));
  const discharge = state.battery.map((b) => Math.max(0, -b.powerW));
  const importW = Math.max(0, state.grid.powerW);
  const exportW = Math.max(0, -state.grid.powerW);

  const sumPv = pv.reduce((s, p) => s + p.powerW, 0);
  const sumCharge = charge.reduce((s, x) => s + x, 0);
  const sumDischarge = discharge.reduce((s, x) => s + x, 0);

  const homeCalc = sumPv + sumDischarge + importW - sumCharge - exportW;
  let homeW: number;
  if (state.home.powerOverrideW !== undefined) {
    homeW = state.home.powerOverrideW;
  } else if (homeCalc < 0) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `P_home_calculated negative (${homeCalc.toFixed(0)} W); clamped to 0`,
      magnitudeW: Math.abs(homeCalc),
    });
    homeW = 0;
  } else {
    homeW = homeCalc;
  }

  // Step 3: Pairing PV → paired Battery
  const pvIndexById = new Map(pv.map((p, i) => [p.id, i]));
  const pvRemaining = pv.map((p) => p.powerW);
  const pvToBattery: PerSourceFlow[] = [];
  const gridToBattery: PerSourceFlow[] = [];
  const pairingDeficit: PairingDeficit[] = [];

  state.battery.forEach((b, j) => {
    if ((charge[j] ?? 0) > 0) {
      const i = pvIndexById.get(b.pairedPvId);
      const pvAvail = i !== undefined ? pvRemaining[i] : 0;
      const fromPv = Math.min(pvAvail ?? 0, charge[j] ?? 0);
      if (i !== undefined && fromPv > 0) {
        const id = pv[i]?.id;
        if (id !== undefined) {
          pvToBattery.push({ sourceId: id, powerW: fromPv });
        }
        pvRemaining[i] = (pvRemaining[i] ?? 0) - fromPv;
      }
      const deficit = (charge[j] ?? 0) - fromPv;
      if (deficit > 0.5) {
        pairingDeficit.push({ batteryId: b.id, deficitW: deficit });
        gridToBattery.push({ sourceId: b.id, powerW: deficit });
        warnings.push({
          code: 'PAIRING_DEFICIT',
          detail: `Battery ${b.id} charges ${charge[j]} W but paired PV ${b.pairedPvId} provides only ${fromPv} W`,
          magnitudeW: deficit,
        });
      }
    }
  });

  return {
    homeW,
    flows: {
      pvToHome: [],
      pvToBattery,
      pvToGrid: [],
      batteryToHome: [],
      batteryToGrid: [],
      gridToHome: 0,
      gridToBattery,
      homeToConsumer: [],
    },
    homeAttribution: { shares: [] },
    pairingDeficit,
    warnings,
  };
}
