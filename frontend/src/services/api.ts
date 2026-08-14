import {
  GanttScheduleResponse,
  ScheduleDelta,
  ScheduleKpis,
  LockInfo,
  Resource,
  WorkOrder,
  Operation,
  ResourceDowntime,
  SetupMatrixItem,
  ShiftSchedule,
} from '../types/schedule';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.title || errJson.errorMessage || errorMsg;
    } catch {
      // fallback to text
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const scheduleApi = {
  // Schedule full slice & KPIs
  getSchedule: (): Promise<GanttScheduleResponse> => request<GanttScheduleResponse>('/schedule'),

  getKpis: (): Promise<ScheduleKpis> => request<ScheduleKpis>('/schedule/kpis'),

  optimizeSchedule: (strategy = 'HEURISTIC_SPT_EDD'): Promise<ScheduleDelta> =>
    request<ScheduleDelta>('/schedule/optimize', {
      method: 'POST',
      body: JSON.stringify({ strategy }),
    }),

  resetDemoData: (): Promise<boolean> =>
    request<boolean>('/schedule/reset-demo', {
      method: 'POST',
    }),

  // Operations CRUD
  createOperation: (data: {
    workOrderId: string;
    sequenceIndex: number;
    name: string;
    productType: string;
    requiredResourceId: string;
    durationMinutes: number;
    setupDurationMinutes: number;
    plannedStartTime: string;
    colorCode?: string;
    precedenceOperationIds?: string[];
  }): Promise<Operation> =>
    request<Operation>('/operations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateOperation: (
    id: string,
    data: {
      name: string;
      requiredResourceId: string;
      durationMinutes: number;
      setupDurationMinutes: number;
      plannedStartTime: string;
      status: string;
      colorCode: string;
      isLocked: boolean;
      precedenceOperationIds?: string[];
    }
  ): Promise<Operation> =>
    request<Operation>(`/operations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    }),

  deleteOperation: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/operations/${id}`, {
      method: 'DELETE',
    }),

  rescheduleOperation: (
    operationId: string,
    targetResourceId: string,
    targetStartTime: string,
    autoCascade = true,
    userId?: string
  ): Promise<ScheduleDelta> =>
    request<ScheduleDelta>(`/operations/${operationId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({
        operationId,
        targetResourceId,
        targetStartTime,
        autoCascade,
        userId,
      }),
    }),

  resizeOperation: (operationId: string, newDurationMinutes: number): Promise<ScheduleDelta> =>
    request<ScheduleDelta>(`/operations/${operationId}/resize`, {
      method: 'POST',
      body: JSON.stringify({ newDurationMinutes }),
    }),

  splitOperation: (operationId: string, splitDurationMinutes: number): Promise<ScheduleDelta> =>
    request<ScheduleDelta>(`/operations/${operationId}/split`, {
      method: 'POST',
      body: JSON.stringify({ splitDurationMinutes }),
    }),

  // Work Orders CRUD
  createWorkOrder: (data: {
    orderNumber: string;
    customerName?: string;
    productCode: string;
    productName: string;
    quantity: number;
    releaseDate: string;
    dueDate: string;
    priority: number;
    operations?: Array<{
      name: string;
      productType: string;
      requiredResourceId: string;
      durationMinutes: number;
      setupDurationMinutes: number;
      colorCode?: string;
    }>;
  }): Promise<WorkOrder> =>
    request<WorkOrder>('/workorders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateWorkOrder: (
    id: string,
    data: {
      orderNumber: string;
      customerName?: string;
      productCode: string;
      productName: string;
      quantity: number;
      releaseDate: string;
      dueDate: string;
      priority: number;
      status: string;
    }
  ): Promise<WorkOrder> =>
    request<WorkOrder>(`/workorders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    }),

  deleteWorkOrder: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/workorders/${id}`, {
      method: 'DELETE',
    }),

  // Resources CRUD & Downtimes
  createResource: (data: {
    name: string;
    code: string;
    type: string;
    capacity: number;
    workingHoursPerDay: number;
    hourlyRate: number;
    colorHex: string;
  }): Promise<Resource> =>
    request<Resource>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateResource: (
    id: string,
    data: {
      name: string;
      code: string;
      type: string;
      capacity: number;
      workingHoursPerDay: number;
      hourlyRate: number;
      colorHex: string;
      isActive: boolean;
    }
  ): Promise<Resource> =>
    request<Resource>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ id, ...data }),
    }),

  deleteResource: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/resources/${id}`, {
      method: 'DELETE',
    }),

  createDowntime: (data: {
    resourceId: string;
    reason: string;
    startTime: string;
    endTime: string;
    isPlanned?: boolean;
  }): Promise<ResourceDowntime> =>
    request<ResourceDowntime>('/resources/downtimes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDowntime: (id: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/resources/downtimes/${id}`, {
      method: 'DELETE',
    }),

  // Setup Matrix
  updateSetupMatrix: (data: {
    resourceId?: string | null;
    fromProductType: string;
    toProductType: string;
    setupMinutes: number;
  }): Promise<SetupMatrixItem> =>
    request<SetupMatrixItem>('/settings/matrix', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteSetupMatrix: (id: number): Promise<{ success: boolean }> =>
    request<{ success: boolean }>(`/settings/matrix/${id}`, {
      method: 'DELETE',
    }),

  // Locks
  acquireLock: (
    resourceId: string,
    userId: string,
    userName: string,
    userColor: string
  ): Promise<LockInfo> =>
    request<LockInfo>('/locks/acquire', {
      method: 'POST',
      body: JSON.stringify({ resourceId, userId, userName, userColor }),
    }),

  releaseLock: (resourceId: string, userId: string): Promise<{ success: boolean }> =>
    request<{ success: boolean }>('/locks/release', {
      method: 'POST',
      body: JSON.stringify({ resourceId, userId }),
    }),

  // Shift Schedules
  getShifts: (): Promise<ShiftSchedule[]> => request<ShiftSchedule[]>('/shifts'),

  updateShiftPattern: (shifts: ShiftSchedule[]): Promise<ShiftSchedule[]> =>
    request<ShiftSchedule[]>('/shifts/pattern', {
      method: 'PUT',
      body: JSON.stringify({ shifts }),
    }),

  createShift: (data: Partial<ShiftSchedule>): Promise<ShiftSchedule> =>
    request<ShiftSchedule>('/shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteShift: (id: string): Promise<void> =>
    request<void>(`/shifts/${id}`, {
      method: 'DELETE',
    }),
};
