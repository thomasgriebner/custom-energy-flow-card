export type EngineWarningCode =
  | 'NEGATIVE_PV'
  | 'PAIRING_DEFICIT'
  | 'BALANCE_DRIFT'
  | 'EXPORT_INCONSISTENT'
  | 'SENSOR_UNAVAILABLE'
  | 'UNIT_UNKNOWN'
  | 'REGISTRY_UNAVAILABLE'
  | 'AREA_NOT_FOUND';

export interface EngineWarning {
  code: EngineWarningCode;
  detail: string;
  magnitudeW?: number;
  entityId?: string;
}
