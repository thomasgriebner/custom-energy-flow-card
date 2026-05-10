import type {
  EngineWarning,
  FlowResult,
  PairingDeficit,
  PerSourceFlow,
  PvState,
  SystemState,
} from './types';

const sum = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);
const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi);

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

  const sumPv = sum(pv.map((p) => p.powerW));
  const sumCharge = sum(charge);
  const sumDischarge = sum(discharge);
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

  // Step 3: Pairing
  const pvIndexById = new Map(pv.map((p, i) => [p.id, i]));
  const pvRemaining = pv.map((p) => p.powerW);
  const pvToBattery: PerSourceFlow[] = [];
  const pairingDeficit: PairingDeficit[] = [];

  state.battery.forEach((b, j) => {
    if ((charge[j] ?? 0) > 0) {
      const i = pvIndexById.get(b.pairedPvId);
      const pvAvail = i !== undefined ? (pvRemaining[i] ?? 0) : 0;
      const fromPv = Math.min(pvAvail, charge[j] ?? 0);
      if (i !== undefined && fromPv > 0) {
        const id = pv[i]?.id;
        if (id !== undefined) pvToBattery.push({ sourceId: id, powerW: fromPv });
        pvRemaining[i] = pvAvail - fromPv;
      }
      const deficit = (charge[j] ?? 0) - fromPv;
      if (deficit > 0.5) {
        pairingDeficit.push({ batteryId: b.id, deficitW: deficit });
        warnings.push({
          code: 'PAIRING_DEFICIT',
          detail: `Battery ${b.id} charges ${charge[j]} W but paired PV ${b.pairedPvId} provides only ${fromPv} W`,
          magnitudeW: deficit,
        });
      }
    }
  });

  // Step 4: Sources → Home (priority PV → Battery → Grid)
  const sumPvRemaining = sum(pvRemaining);
  const totalPvToHome = Math.min(homeW, sumPvRemaining);
  let demand = homeW - totalPvToHome;
  const totalBattToHome = Math.min(demand, sumDischarge);
  demand -= totalBattToHome;
  let gridToHome = Math.max(0, demand);

  // Step 5: Excess → Grid
  let totalPvToGrid = sumPvRemaining - totalPvToHome;
  let totalBattToGrid = sumDischarge - totalBattToHome;

  // Step 6: Per-source proportional split
  const pvToHome: PerSourceFlow[] = pv.map((p, i) => ({
    sourceId: p.id,
    powerW: sumPvRemaining > 0 ? ((pvRemaining[i] ?? 0) / sumPvRemaining) * totalPvToHome : 0,
  }));
  const pvToGrid: PerSourceFlow[] = pv.map((p, i) => ({
    sourceId: p.id,
    powerW: sumPvRemaining > 0 ? ((pvRemaining[i] ?? 0) / sumPvRemaining) * totalPvToGrid : 0,
  }));
  const batteryToHome: PerSourceFlow[] = state.battery.map((b, j) => ({
    sourceId: b.id,
    powerW: sumDischarge > 0 ? ((discharge[j] ?? 0) / sumDischarge) * totalBattToHome : 0,
  }));
  const batteryToGrid: PerSourceFlow[] = state.battery.map((b, j) => ({
    sourceId: b.id,
    powerW: sumDischarge > 0 ? ((discharge[j] ?? 0) / sumDischarge) * totalBattToGrid : 0,
  }));

  // Step 7: Reconcile with grid sensor (export side) — pure: returns new arrays.
  const calcExport = totalPvToGrid + totalBattToGrid;
  let pvToGridFinal: PerSourceFlow[] = pvToGrid;
  let battToGridFinal: PerSourceFlow[] = batteryToGrid;
  if (calcExport > 0 && exportW > 0) {
    const scale = clamp(exportW / calcExport, 0, 2);
    if (scale < 0.95 || scale > 1.05) {
      warnings.push({
        code: 'EXPORT_INCONSISTENT',
        detail: `calc_export ${calcExport.toFixed(0)} W vs sensor export ${exportW.toFixed(0)} W`,
        magnitudeW: Math.abs(calcExport - exportW),
      });
    }
    pvToGridFinal = pvToGrid.map((f) => ({ ...f, powerW: f.powerW * scale }));
    battToGridFinal = batteryToGrid.map((f) => ({ ...f, powerW: f.powerW * scale }));
    totalPvToGrid *= scale;
    totalBattToGrid *= scale;
  } else if (calcExport === 0 && exportW > 0) {
    warnings.push({
      code: 'EXPORT_INCONSISTENT',
      detail: `untracked_export: sensor exports ${exportW.toFixed(0)} W but no source has excess`,
      magnitudeW: exportW,
    });
  } else if (calcExport > 0 && exportW === 0) {
    warnings.push({
      code: 'EXPORT_INCONSISTENT',
      detail: `phantom_export: calc shows ${calcExport.toFixed(0)} W export but sensor reads 0`,
      magnitudeW: calcExport,
    });
    pvToGridFinal = pvToGrid.map((f) => ({ ...f, powerW: 0 }));
    battToGridFinal = batteryToGrid.map((f) => ({ ...f, powerW: 0 }));
    totalPvToGrid = 0;
    totalBattToGrid = 0;
  }

  // Step 7B: Reconcile import side — Sensor authoritativ, immer.
  gridToHome = importW;
  const totalToHome = totalPvToHome + totalBattToHome + gridToHome;
  const drift = totalToHome - homeW;
  if (Math.abs(drift) > Math.max(1, homeW * 0.05)) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `home in/out drift: ${totalToHome.toFixed(0)} W vs ${homeW.toFixed(0)} W`,
      magnitudeW: Math.abs(drift),
    });
  }

  // Step 8: Home → Consumer
  const homeToConsumer: PerSourceFlow[] = state.consumer.map((c) => ({
    sourceId: c.id,
    powerW: c.powerW,
  }));
  const sumConsumers = sum(state.consumer.map((c) => c.powerW));
  if (sumConsumers > homeW + 0.5) {
    warnings.push({
      code: 'BALANCE_DRIFT',
      detail: `Σ consumers (${sumConsumers.toFixed(0)} W) exceeds home (${homeW.toFixed(0)} W)`,
      magnitudeW: sumConsumers - homeW,
    });
  }

  // Home-Attribution shares
  const shares =
    homeW > 0
      ? [
          ...pvToHome.map((f) => ({
            sourceKind: 'pv' as const,
            sourceId: f.sourceId,
            share: f.powerW / homeW,
          })),
          ...batteryToHome.map((f) => ({
            sourceKind: 'battery' as const,
            sourceId: f.sourceId,
            share: f.powerW / homeW,
          })),
          { sourceKind: 'grid' as const, share: gridToHome / homeW },
        ]
      : [
          ...pvToHome.map((f) => ({
            sourceKind: 'pv' as const,
            sourceId: f.sourceId,
            share: 0,
          })),
          ...batteryToHome.map((f) => ({
            sourceKind: 'battery' as const,
            sourceId: f.sourceId,
            share: 0,
          })),
          { sourceKind: 'grid' as const, share: 0 },
        ];

  // Pairing-Defizit als sichtbare Grid → Battery Flows (siehe ADR-0007 v2):
  const gridToBattery: PerSourceFlow[] = pairingDeficit
    .filter((d) => d.deficitW > 0.5)
    .map((d) => ({ sourceId: d.batteryId, powerW: d.deficitW }));

  return {
    homeW,
    flows: {
      pvToHome,
      pvToBattery,
      pvToGrid: pvToGridFinal,
      batteryToHome,
      batteryToGrid: battToGridFinal,
      gridToHome,
      gridToBattery,
      homeToConsumer,
    },
    homeAttribution: { shares },
    pairingDeficit,
    warnings,
  };
}
