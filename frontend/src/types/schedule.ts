export type OperationStatus = 'Planned' | 'InProgress' | 'Completed' | 'Delayed' | 'Blocked';

export type ResourceType =
  | 'SmtLine'
  | 'ThtWaveSoldering'
  | 'ThtSelectiveSoldering'
  | 'InCircuitTesting'
  | 'FunctionalTesting'
  | 'ConformalCoating'
  | 'DepanelingRouter'
  | 'ManualAssembly'
  | 'CncMachine'
  | 'InjectionMolding'
  | 'AssemblyCell'
  | 'QualityControl'
  | 'Packaging'
  | 'ManualWorkstation';

export interface Resource {
  id: string;
  name: string;
  code: string;
  type: string;
  capacity: number;
  workingHoursPerDay: number;
  hourlyRate: number;
  colorHex: string;
  isActive: boolean;
}

export interface ResourceDowntime {
  id: string;
  resourceId: string;
  reason: string;
  startTime: string;
  endTime: string;
  isPlanned: boolean;
}

export interface Operation {
  id: string;
  workOrderId: string;
  workOrderNumber: string;
  sequenceIndex: number;
  name: string;
  productType: string;
  requiredResourceId: string;
  durationMinutes: number;
  setupDurationMinutes: number;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  status: OperationStatus;
  colorCode?: string;
  isLocked?: boolean;
  precedenceOperationIds: string[];
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  productCode: string;
  productName: string;
  quantity: number;
  releaseDate: string;
  dueDate: string;
  priority: number;
  status: string;
  operationIds: string[];
}

export interface SetupMatrixItem {
  resourceId?: string | null;
  fromProductType: string;
  toProductType: string;
  setupMinutes: number;
}

export interface LockInfo {
  resourceId: string;
  lockedByUserId: string;
  lockedByUserName: string;
  userColor: string;
  acquiredAt: string;
  expiresAt: string;
}

export interface ScheduleDelta {
  triggeredByOperationId: string;
  affectedOperations: Operation[];
  timestamp: string;
  success: boolean;
  errorMessage?: string | null;
}

export interface ScheduleKpis {
  totalMakespanHours: number;
  overallOeePercentage: number;
  totalSetupTimeHours: number;
  setupRatioPercentage: number;
  delayedWorkOrdersCount: number;
  onTimeDeliveryRatePercentage: number;
  totalOperationsCount: number;
  totalWorkOrdersCount: number;
  resourceUtilization: Record<string, number>;
  scheduleStart: string;
  scheduleEnd: string;
}

export interface GanttScheduleResponse {
  resources: Resource[];
  operations: Operation[];
  workOrders: WorkOrder[];
  setupMatrices: SetupMatrixItem[];
  downtimes: ResourceDowntime[];
  locks: LockInfo[];
  kpis: ScheduleKpis;
}

export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;
  cursorResourceId?: string | null;
  cursorTime?: string | null;
  lastActive: string;
}
