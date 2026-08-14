import { create } from 'zustand';
import {
  Resource,
  Operation,
  WorkOrder,
  SetupMatrixItem,
  ResourceDowntime,
  ShiftSchedule,
  LockInfo,
  ScheduleKpis,
  UserPresence,
  ScheduleDelta,
} from '../types/schedule';
import { scheduleApi } from '../services/api';
import { Language } from '../i18n/translations';

interface ScheduleHistoryState {
  operations: Record<string, Operation>;
}

interface ScheduleStore {
  // State
  resources: Record<string, Resource>;
  operations: Record<string, Operation>;
  workOrders: Record<string, WorkOrder>;
  setupMatrices: SetupMatrixItem[];
  downtimes: Record<string, ResourceDowntime>;
  shifts: ShiftSchedule[];
  locks: Record<string, LockInfo>;
  presence: Record<string, UserPresence>;
  kpis: ScheduleKpis | null;

  // Viewport & Selection
  zoomLevel: 'hour' | 'day' | 'week' | 'month';
  timelineStart: Date;
  timelineEnd: Date;
  selectedOperationId: string | null;
  selectedResourceId: string | null;
  hoveredOperationId: string | null;
  activeLockUser: { userId: string; userName: string; userColor: string };
  isLoading: boolean;
  error: string | null;

  // Filters & Search
  searchQuery: string;
  workOrderFilter: string | null;
  machineFilter: string | null;
  statusFilter: string | null;
  workCenterCategory: 'ALL' | 'SMT' | 'THT' | 'TEST' | 'COAT';
  language: Language;

  // Modals & Context Menu
  contextMenu: { x: number; y: number; operationId: string } | null;
  isCreateWorkOrderOpen: boolean;
  isResourceManagerOpen: boolean;
  isAddDowntimeOpen: boolean;
  isShiftManagerOpen: boolean;
  isWorkOrderManagerOpen: boolean;
  isSplitModalOpen: boolean;
  splitTargetOperationId: string | null;
  isAutoScheduleOpen: boolean;

  // History for Undo/Redo
  undoStack: ScheduleHistoryState[];
  redoStack: ScheduleHistoryState[];

  // Actions
  fetchSchedule: () => Promise<void>;
  setSelectedOperationId: (id: string | null) => void;
  setSelectedResourceId: (id: string | null) => void;
  setHoveredOperationId: (id: string | null) => void;
  setZoomLevel: (level: 'hour' | 'day' | 'week' | 'month') => void;
  setSearchQuery: (query: string) => void;
  setWorkOrderFilter: (id: string | null) => void;
  setMachineFilter: (id: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  setWorkCenterCategory: (category: 'ALL' | 'SMT' | 'THT' | 'TEST' | 'COAT') => void;
  setLanguage: (lang: Language) => void;

  setContextMenu: (menu: { x: number; y: number; operationId: string } | null) => void;
  setIsCreateWorkOrderOpen: (open: boolean) => void;
  setIsResourceManagerOpen: (open: boolean) => void;
  setIsAddDowntimeOpen: (open: boolean) => void;
  setIsShiftManagerOpen: (open: boolean) => void;
  setIsWorkOrderManagerOpen: (open: boolean) => void;
  setIsSplitModalOpen: (open: boolean, operationId?: string | null) => void;
  setIsAutoScheduleOpen: (open: boolean) => void;
  updateShiftPattern: (shifts: ShiftSchedule[]) => Promise<void>;

  // Mutations
  rescheduleOptimistic: (
    operationId: string,
    targetResourceId: string,
    targetStartTime: Date
  ) => Promise<void>;

  resizeOperationOptimistic: (
    operationId: string,
    newDurationMinutes: number
  ) => Promise<void>;

  splitOperation: (
    operationId: string,
    splitDurationMinutes: number
  ) => Promise<void>;

  deleteOperation: (operationId: string) => Promise<void>;
  deleteWorkOrder: (workOrderId: string) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  deleteDowntime: (downtimeId: string) => Promise<void>;

  // SignalR Sync Handlers
  mergeScheduleDelta: (delta: ScheduleDelta) => void;
  setResourceLock: (lockInfo: LockInfo) => void;
  releaseResourceLock: (resourceId: string) => void;
  updateUserPresence: (presence: UserPresence) => void;
  updateKpis: (kpis: ScheduleKpis) => void;

  setResourceUpdated: (resource: Resource) => void;
  setResourceDeleted: (resourceId: string) => void;
  setWorkOrderUpdated: (workOrder: WorkOrder) => void;
  setWorkOrderDeleted: (workOrderId: string) => void;
  setDowntimeUpdated: (downtime: ResourceDowntime) => void;
  setDowntimeDeleted: (downtimeId: string) => void;

  // Undo / Redo
  undo: () => void;
  redo: () => void;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  resources: {},
  operations: {},
  workOrders: {},
  setupMatrices: [],
  downtimes: {},
  shifts: [],
  locks: {},
  presence: {},
  kpis: null,

  zoomLevel: 'day',
  timelineStart: new Date(new Date().setHours(6, 0, 0, 0)),
  timelineEnd: new Date(new Date().setDate(new Date().getDate() + 3)),
  selectedOperationId: null,
  selectedResourceId: null,
  hoveredOperationId: null,
  activeLockUser: {
    userId: `user-${Math.random().toString(36).substring(2, 7)}`,
    userName: 'Planner ' + Math.floor(Math.random() * 90 + 10),
    userColor: ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa'][
      Math.floor(Math.random() * 5)
    ],
  },
  isLoading: false,
  error: null,

  searchQuery: '',
  workOrderFilter: null,
  machineFilter: null,
  statusFilter: null,
  workCenterCategory: 'ALL',
  language: (typeof window !== 'undefined' && (localStorage.getItem('aps_lang') as Language)) || 'tr',

  contextMenu: null,
  isCreateWorkOrderOpen: false,
  isResourceManagerOpen: false,
  isAddDowntimeOpen: false,
  isShiftManagerOpen: false,
  isWorkOrderManagerOpen: false,
  isSplitModalOpen: false,
  splitTargetOperationId: null,
  isAutoScheduleOpen: false,

  undoStack: [],
  redoStack: [],

  fetchSchedule: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await scheduleApi.getSchedule();
      const resourcesMap: Record<string, Resource> = {};
      const operationsMap: Record<string, Operation> = {};
      const workOrdersMap: Record<string, WorkOrder> = {};
      const downtimesMap: Record<string, ResourceDowntime> = {};
      const locksMap: Record<string, LockInfo> = {};

      (data?.resources || []).forEach((r) => (resourcesMap[r.id] = r));
      (data?.operations || []).forEach((o) => (operationsMap[o.id] = o));
      (data?.workOrders || []).forEach((w) => (workOrdersMap[w.id] = w));
      (data?.downtimes || []).forEach((d) => (downtimesMap[d.id] = d));
      (data?.locks || []).forEach((l) => (locksMap[l.resourceId] = l));

      const ops = Object.values(operationsMap);
      let tStart = new Date(new Date().setHours(6, 0, 0, 0));
      let tEnd = new Date(new Date().setDate(new Date().getDate() + 3));

      if (ops.length > 0) {
        const starts = ops
          .map((o) => new Date(o.plannedStartTime).getTime())
          .filter((t) => !isNaN(t));
        const ends = ops
          .map((o) => new Date(o.plannedEndTime).getTime())
          .filter((t) => !isNaN(t));

        if (starts.length > 0 && ends.length > 0) {
          tStart = new Date(Math.min(...starts) - 2 * 3600 * 1000);
          tEnd = new Date(Math.max(...ends) + 6 * 3600 * 1000);
        }
      }

      set({
        resources: resourcesMap,
        operations: operationsMap,
        workOrders: workOrdersMap,
        setupMatrices: data?.setupMatrices || [],
        downtimes: downtimesMap,
        shifts: data?.shifts || [],
        locks: locksMap,
        kpis: data?.kpis || null,
        timelineStart: tStart,
        timelineEnd: tEnd,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[fetchSchedule Error]', err);
      set({ error: err.message || 'Failed to fetch schedule', isLoading: false });
    }
  },

  setSelectedOperationId: (id) => set({ selectedOperationId: id }),
  setSelectedResourceId: (id) => set({ selectedResourceId: id }),
  setHoveredOperationId: (id) => set({ hoveredOperationId: id }),
  setZoomLevel: (level) => {
    const { timelineStart, timelineEnd } = get();
    if (level === 'month') {
      const startMs = timelineStart.getTime();
      const currentDays = (timelineEnd.getTime() - startMs) / 86400000;
      if (currentDays < 30) {
        set({
          zoomLevel: level,
          timelineEnd: new Date(startMs + 32 * 86400000),
        });
        return;
      }
    }
    set({ zoomLevel: level });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setWorkOrderFilter: (id) => set({ workOrderFilter: id }),
  setMachineFilter: (id) => set({ machineFilter: id }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setWorkCenterCategory: (category) => set({ workCenterCategory: category }),
  setLanguage: (lang) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('aps_lang', lang);
    }
    set({ language: lang });
  },

  setContextMenu: (menu) => set({ contextMenu: menu }),
  setIsCreateWorkOrderOpen: (open) => set({ isCreateWorkOrderOpen: open }),
  setIsResourceManagerOpen: (open) => set({ isResourceManagerOpen: open }),
  setIsAddDowntimeOpen: (open) => set({ isAddDowntimeOpen: open }),
  setIsShiftManagerOpen: (open) => set({ isShiftManagerOpen: open }),
  setIsWorkOrderManagerOpen: (open) => set({ isWorkOrderManagerOpen: open }),
  setIsSplitModalOpen: (open, opId = null) =>
    set({ isSplitModalOpen: open, splitTargetOperationId: opId }),
  setIsAutoScheduleOpen: (open) => set({ isAutoScheduleOpen: open }),

  updateShiftPattern: async (newShifts) => {
    try {
      const updated = await scheduleApi.updateShiftPattern(newShifts);
      set({ shifts: updated });
    } catch (err: any) {
      console.error('Failed to update shifts pattern:', err);
      throw err;
    }
  },

  rescheduleOptimistic: async (operationId, targetResourceId, targetStartTime) => {
    const { operations, undoStack, activeLockUser } = get();
    const currentOp = operations[operationId];
    if (!currentOp) return;

    set({
      undoStack: [...undoStack, { operations: { ...operations } }],
      redoStack: [],
    });

    const updatedOps = { ...operations };
    const duration = currentOp.durationMinutes;
    const newStart = targetStartTime.toISOString();
    const newEnd = new Date(targetStartTime.getTime() + duration * 60000).toISOString();

    updatedOps[operationId] = {
      ...currentOp,
      requiredResourceId: targetResourceId,
      plannedStartTime: newStart,
      plannedEndTime: newEnd,
    };

    set({ operations: updatedOps });

    try {
      const delta = await scheduleApi.rescheduleOperation(
        operationId,
        targetResourceId,
        newStart,
        true,
        activeLockUser.userId
      );
      get().mergeScheduleDelta(delta);
    } catch (err) {
      console.error('[rescheduleOperation failed, rolling back]', err);
      get().undo();
    }
  },

  resizeOperationOptimistic: async (operationId, newDurationMinutes) => {
    const { operations, undoStack } = get();
    const currentOp = operations[operationId];
    if (!currentOp) return;

    set({
      undoStack: [...undoStack, { operations: { ...operations } }],
      redoStack: [],
    });

    const updatedOps = { ...operations };
    const startMs = new Date(currentOp.plannedStartTime).getTime();
    const newEnd = new Date(
      startMs + (currentOp.setupDurationMinutes + newDurationMinutes) * 60000
    ).toISOString();

    updatedOps[operationId] = {
      ...currentOp,
      durationMinutes: newDurationMinutes,
      plannedEndTime: newEnd,
    };

    set({ operations: updatedOps });

    try {
      const delta = await scheduleApi.resizeOperation(operationId, newDurationMinutes);
      get().mergeScheduleDelta(delta);
    } catch (err) {
      console.error('[resizeOperation failed, rolling back]', err);
      get().undo();
    }
  },

  splitOperation: async (operationId, splitDurationMinutes) => {
    try {
      const delta = await scheduleApi.splitOperation(operationId, splitDurationMinutes);
      get().mergeScheduleDelta(delta);
      set({ isSplitModalOpen: false, splitTargetOperationId: null });
    } catch (err: any) {
      set({ error: err.message || 'Failed to split operation' });
    }
  },

  deleteOperation: async (operationId) => {
    try {
      await scheduleApi.deleteOperation(operationId);
      const updated = { ...get().operations };
      delete updated[operationId];
      set({
        operations: updated,
        selectedOperationId:
          get().selectedOperationId === operationId ? null : get().selectedOperationId,
      });
      // Re-fetch KPIs
      const kpis = await scheduleApi.getKpis();
      set({ kpis });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete operation' });
    }
  },

  deleteWorkOrder: async (workOrderId) => {
    try {
      await scheduleApi.deleteWorkOrder(workOrderId);
      const updatedWos = { ...get().workOrders };
      delete updatedWos[workOrderId];
      const updatedOps = { ...get().operations };
      Object.keys(updatedOps).forEach((opId) => {
        if (updatedOps[opId].workOrderId === workOrderId) {
          delete updatedOps[opId];
        }
      });
      set({ workOrders: updatedWos, operations: updatedOps });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete work order' });
    }
  },

  deleteResource: async (resourceId) => {
    try {
      await scheduleApi.deleteResource(resourceId);
      const updatedRes = { ...get().resources };
      delete updatedRes[resourceId];
      set({ resources: updatedRes });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete resource' });
    }
  },

  deleteDowntime: async (downtimeId) => {
    try {
      await scheduleApi.deleteDowntime(downtimeId);
      const updatedDts = { ...get().downtimes };
      delete updatedDts[downtimeId];
      set({ downtimes: updatedDts });
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete downtime' });
    }
  },

  mergeScheduleDelta: (delta: any) => {
    if (!delta) return;
    const isSuccess = delta.success !== undefined ? delta.success : (delta.Success ?? true);
    if (!isSuccess) return;
    const affected: Operation[] = delta.affectedOperations || delta.AffectedOperations || [];
    if (!affected || affected.length === 0) return;

    const currentOps = { ...get().operations };
    affected.forEach((op) => {
      currentOps[op.id] = op;
    });
    set({ operations: currentOps });
  },

  setResourceLock: (lockInfo) => {
    const locks = { ...get().locks, [lockInfo.resourceId]: lockInfo };
    set({ locks });
  },

  releaseResourceLock: (resourceId) => {
    const locks = { ...get().locks };
    delete locks[resourceId];
    set({ locks });
  },

  updateUserPresence: (presence) => {
    const presenceMap = { ...get().presence, [presence.userId]: presence };
    set({ presence: presenceMap });
  },

  updateKpis: (kpis) => set({ kpis }),

  setResourceUpdated: (resource) => {
    const resources = { ...get().resources, [resource.id]: resource };
    set({ resources });
  },

  setResourceDeleted: (resourceId) => {
    const resources = { ...get().resources };
    delete resources[resourceId];
    set({ resources });
  },

  setWorkOrderUpdated: (workOrder) => {
    const workOrders = { ...get().workOrders, [workOrder.id]: workOrder };
    set({ workOrders });
  },

  setWorkOrderDeleted: (workOrderId) => {
    const workOrders = { ...get().workOrders };
    delete workOrders[workOrderId];
    const updatedOps = { ...get().operations };
    Object.keys(updatedOps).forEach((opId) => {
      if (updatedOps[opId].workOrderId === workOrderId) {
        delete updatedOps[opId];
      }
    });
    set({ workOrders, operations: updatedOps });
  },

  setDowntimeUpdated: (downtime) => {
    const downtimes = { ...get().downtimes, [downtime.id]: downtime };
    set({ downtimes });
  },

  setDowntimeDeleted: (downtimeId) => {
    const downtimes = { ...get().downtimes };
    delete downtimes[downtimeId];
    set({ downtimes });
  },

  undo: () => {
    const { undoStack, redoStack, operations } = get();
    if (undoStack.length === 0) return;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const newRedoStack = [...redoStack, { operations: { ...operations } }];

    set({
      operations: previousState.operations,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });
  },

  redo: () => {
    const { undoStack, redoStack, operations } = get();
    if (redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const newUndoStack = [...undoStack, { operations: { ...operations } }];

    set({
      operations: nextState.operations,
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });
  },
}));
