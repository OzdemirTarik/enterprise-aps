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

import { startOfDay } from 'date-fns';
import {
  computeCriticalPath,
  computeResourceHeatmap,
  isResourceMatchingCategory,
  CriticalPathResult,
  HeatmapBin,
} from '../utils/analytics';
import { getNextAvailableWorkingTime } from '../utils/shiftUtils';

export { computeCriticalPath, computeResourceHeatmap, isResourceMatchingCategory };
export type { CriticalPathResult, HeatmapBin };

export interface ScheduleHistoryState {
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
  isInitialized: boolean;
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
  isShortcutsOpen: boolean;

  // Planning & Analytics Modes
  isChainDragActive: boolean;
  isCriticalPathActive: boolean;
  isHeatmapActive: boolean;
  isShiftOverlayActive: boolean;
  isMagneticSnapActive: boolean;

  // Viewport Scroll Triggers
  scrollToNowTrigger: number;
  scrollToOperationId: string | null;
  scrollToDateTrigger: Date | null;

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

  setIsChainDragActive: (active: boolean) => void;
  setIsCriticalPathActive: (active: boolean) => void;
  setIsHeatmapActive: (active: boolean) => void;
  setIsShiftOverlayActive: (active: boolean) => void;
  setIsMagneticSnapActive: (active: boolean) => void;

  setContextMenu: (menu: { x: number; y: number; operationId: string } | null) => void;
  setIsCreateWorkOrderOpen: (open: boolean) => void;
  setIsResourceManagerOpen: (open: boolean) => void;
  setIsAddDowntimeOpen: (open: boolean) => void;
  setIsShiftManagerOpen: (open: boolean) => void;
  setIsWorkOrderManagerOpen: (open: boolean) => void;
  setIsSplitModalOpen: (open: boolean, operationId?: string | null) => void;
  setIsAutoScheduleOpen: (open: boolean) => void;
  setIsShortcutsOpen: (open: boolean) => void;
  triggerScrollToNow: () => void;
  triggerScrollToOperation: (opId: string | null) => void;
  triggerScrollToDate: (date: Date) => void;
  updateShiftPattern: (shifts: ShiftSchedule[]) => Promise<void>;

  // Mutations
  rescheduleOptimistic: (
    operationId: string,
    targetResourceId: string,
    targetStartTime: Date
  ) => Promise<void>;

  rescheduleWorkOrderChain: (
    workOrderId: string,
    deltaMinutes: number
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
  ) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  updateDowntime: (
    id: string,
    data: {
      resourceId: string;
      reason: string;
      startTime: string;
      endTime: string;
      isPlanned?: boolean;
    }
  ) => Promise<void>;
  deleteDowntime: (downtimeId: string) => Promise<void>;

  // SignalR Sync Handlers
  mergeScheduleDelta: (delta: ScheduleDelta) => void;
  setResourceLock: (lockInfo: LockInfo) => void;
  releaseResourceLock: (resourceId: string) => void;
  updateUserPresence: (presence: UserPresence) => void;
  updateKpis: (kpis: ScheduleKpis) => void;

  setResourceUpdated: (resource: Resource) => void;
  setResourceDeleted: (resourceId: string) => void;
  setOperationDeleted: (operationId: string) => void;
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

  zoomLevel:
    (typeof window !== 'undefined' &&
      (localStorage.getItem('aps_zoom') as 'hour' | 'day' | 'week' | 'month')) ||
    'day',
  timelineStart: startOfDay(new Date(Date.now() - 12 * 3600 * 1000)),
  timelineEnd: new Date(
    startOfDay(new Date(Date.now() - 12 * 3600 * 1000)).getTime() +
      (((typeof window !== 'undefined' &&
        (localStorage.getItem('aps_zoom') as 'hour' | 'day' | 'week' | 'month')) ||
        'day') === 'month'
        ? 32
        : ((typeof window !== 'undefined' &&
            (localStorage.getItem('aps_zoom') as 'hour' | 'day' | 'week' | 'month')) ||
            'day') === 'week'
        ? 14
        : 7) *
        86400 *
        1000
  ),
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
  isInitialized: false,
  error: null,

  searchQuery: '',
  workOrderFilter: null,
  machineFilter: null,
  statusFilter: null,
  workCenterCategory:
    (typeof window !== 'undefined' &&
      (localStorage.getItem('aps_cat') as 'ALL' | 'SMT' | 'THT' | 'TEST' | 'COAT')) ||
    'ALL',
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
  isShortcutsOpen: false,
  isChainDragActive: false,
  isCriticalPathActive: false,
  isHeatmapActive: false,
  isShiftOverlayActive: true,
  isMagneticSnapActive: true,
  scrollToNowTrigger: 0,
  scrollToOperationId: null,
  scrollToDateTrigger: null,

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
      const nowTime = Date.now();
      let tStart = startOfDay(new Date(nowTime - 12 * 3600 * 1000));
      let tEnd = new Date(nowTime + 4 * 86400 * 1000);

      if (ops.length > 0) {
        const starts = ops
          .map((o) => new Date(o.plannedStartTime).getTime())
          .filter((t) => !isNaN(t));
        const ends = ops
          .map((o) => new Date(o.plannedEndTime).getTime())
          .filter((t) => !isNaN(t));

        if (starts.length > 0 && ends.length > 0) {
          const minTime = Math.min(nowTime, ...starts);
          const maxTime = Math.max(nowTime + 48 * 3600 * 1000, ...ends);
          tStart = startOfDay(new Date(minTime - 12 * 3600 * 1000));
          tEnd = new Date(maxTime + 24 * 3600 * 1000);
        }
      }

      // Guarantee minimum days span according to current zoom level (at least 32 days for month view)
      const currentZoom = get().zoomLevel;
      const minDays =
        currentZoom === 'month' ? 32 : currentZoom === 'week' ? 14 : currentZoom === 'day' ? 7 : 4;
      const minSpanMs = minDays * 86400 * 1000;
      if (tEnd.getTime() - tStart.getTime() < minSpanMs) {
        tEnd = new Date(tStart.getTime() + minSpanMs);
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
        isInitialized: true,
      });
    } catch (err: any) {
      console.error('[fetchSchedule Error]', err);
      set({ error: err.message || 'Failed to fetch schedule', isLoading: false, isInitialized: true });
    }
  },

  setSelectedOperationId: (id) => set({ selectedOperationId: id }),
  setSelectedResourceId: (id) => set({ selectedResourceId: id }),
  setHoveredOperationId: (id) => set({ hoveredOperationId: id }),
  setZoomLevel: (level) => {
    const { timelineStart, timelineEnd } = get();
    const startMs = timelineStart.getTime();
    const minDays = level === 'month' ? 32 : level === 'week' ? 14 : level === 'day' ? 7 : 4;
    const minEndMs = startMs + minDays * 86400000;

    if (typeof window !== 'undefined') localStorage.setItem('aps_zoom', level);

    if (timelineEnd.getTime() < minEndMs) {
      set({
        zoomLevel: level,
        timelineEnd: new Date(minEndMs),
      });
    } else {
      set({ zoomLevel: level });
    }
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setWorkOrderFilter: (id) => set({ workOrderFilter: id }),
  setMachineFilter: (id) => set({ machineFilter: id }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setWorkCenterCategory: (category) => {
    if (typeof window !== 'undefined') localStorage.setItem('aps_cat', category);
    set({ workCenterCategory: category });
  },
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
  setIsShortcutsOpen: (open) => set({ isShortcutsOpen: open }),
  setIsChainDragActive: (active) => set({ isChainDragActive: active }),
  setIsCriticalPathActive: (active) => set({ isCriticalPathActive: active }),
  setIsHeatmapActive: (active) => set({ isHeatmapActive: active }),
  setIsShiftOverlayActive: (active) => set({ isShiftOverlayActive: active }),
  setIsMagneticSnapActive: (active) => set({ isMagneticSnapActive: active }),
  triggerScrollToNow: () => set((s) => ({ scrollToNowTrigger: s.scrollToNowTrigger + 1 })),
  triggerScrollToOperation: (opId) => set({ scrollToOperationId: opId }),
  triggerScrollToDate: (date) => set({ scrollToDateTrigger: date }),

  updateShiftPattern: async (newShifts) => {
    try {
      const updated = await scheduleApi.updateShiftPattern(newShifts);
      set({ shifts: updated });
    } catch (err: any) {
      console.error('Failed to update shifts pattern:', err);
      throw err;
    }
  },

  rescheduleWorkOrderChain: async (workOrderId, deltaMinutes) => {
    const { operations, undoStack } = get();
    const woOps = Object.values(operations).filter((o) => o.workOrderId === workOrderId);
    if (woOps.length === 0 || deltaMinutes === 0) return;

    set({
      undoStack: [...undoStack, { operations: { ...operations } }],
      redoStack: [],
    });

    const updatedOps = { ...operations };
    const shiftedOps: Array<{ id: string; resourceId: string; newStart: string }> = [];

    woOps.forEach((op) => {
      const curStartMs = new Date(op.plannedStartTime).getTime();
      const newStartMs = curStartMs + deltaMinutes * 60000;
      const durationMs = (op.setupDurationMinutes + op.durationMinutes) * 60000;
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formatLocalIso = (ms: number) => {
        const d = new Date(ms);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000Z`;
      };
      
      const newStartStr = formatLocalIso(newStartMs);
      const newEndStr = formatLocalIso(newStartMs + durationMs);

      updatedOps[op.id] = {
        ...op,
        plannedStartTime: newStartStr,
        plannedEndTime: newEndStr,
      };

      shiftedOps.push({
        id: op.id,
        resourceId: op.requiredResourceId,
        newStart: newStartStr,
      });
    });

    set({ operations: updatedOps });

    try {
      for (let i = 0; i < shiftedOps.length; i++) {
        const s = shiftedOps[i];
        const isLast = i === shiftedOps.length - 1;
        const delta = await scheduleApi.rescheduleOperation(
          s.id,
          s.resourceId,
          s.newStart,
          isLast
        );
        if (isLast && delta) {
          get().mergeScheduleDelta(delta);
        }
      }
    } catch (err) {
      console.error('[rescheduleWorkOrderChain failed, rolling back]', err);
      get().undo();
    }
  },

  rescheduleOptimistic: async (operationId, targetResourceId, targetStartTime) => {
    const { operations, undoStack, shifts } = get();
    const currentOp = operations[operationId];
    if (!currentOp) return;

    // Shift calendar enforcement: ensure targetStartTime is inside active shift
    const validStartTime = getNextAvailableWorkingTime(targetStartTime, shifts);

    set({
      undoStack: [...undoStack, { operations: { ...operations } }],
      redoStack: [],
    });

    const updatedOps = { ...operations };
    const duration = currentOp.durationMinutes;
    
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatLocalIso = (d: Date) => {
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000Z`;
    };

    const newStart = formatLocalIso(validStartTime);
    const newEnd = formatLocalIso(new Date(validStartTime.getTime() + duration * 60000));

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
        true
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

  updateResource: async (id, data) => {
    try {
      const updated = await scheduleApi.updateResource(id, data);
      const resMap = { ...get().resources, [id]: updated };
      set({ resources: resMap });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update resource' });
      throw err;
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

  updateDowntime: async (id, data) => {
    try {
      const updated = await scheduleApi.updateDowntime(id, data);
      const dtMap = { ...get().downtimes, [id]: updated };
      set({ downtimes: dtMap });
    } catch (err: any) {
      set({ error: err.message || 'Failed to update downtime' });
      throw err;
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

  setOperationDeleted: (operationId) => {
    const updatedOps = { ...get().operations };
    delete updatedOps[operationId];
    set({
      operations: updatedOps,
      selectedOperationId:
        get().selectedOperationId === operationId ? null : get().selectedOperationId,
    });
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
