import type { EngineWarning, FlowResult, SystemState } from './types';

export function compute(state: SystemState): FlowResult {
  const warnings: EngineWarning[] = [];

  const pv = state.pv.map((p) => {
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

  return {
    homeW,
    flows: {
      pvToHome: [],
      pvToBattery: [],
      pvToGrid: [],
      batteryToHome: [],
      batteryToGrid: [],
      gridToHome: 0,
      gridToBattery: [],
      homeToConsumer: [],
    },
    homeAttribution: { shares: [] },
    pairingDeficit: [],
    warnings,
  };
}
