import React, { useState, useEffect, useMemo } from 'react';
import { useScheduleStore, computeCriticalPath } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import { detectOperationConstraints } from '../../utils/constraintUtils';
import { OperationStatus } from '../../types/schedule';
import {
  Layers,
  Trash2,
  Save,
  X,
  Lock,
  Unlock,
  Calendar,
  Check,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  GitMerge,
  Crosshair,
  Scissors,
  Flame,
  ArrowRight,
  Timer,
  Play,
  CheckCircle,
  Pause,
  Activity,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { tr, enUS } from 'date-fns/locale';

const PRESET_COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#8b5cf6', '#f43f5e', '#0284c7', '#ec4899', '#6366f1'];

type DrawerTab = 'general' | 'diagnostics' | 'dag';

export const OperationDetailDrawer: React.FC = () => {
  const { t, language } = useTranslation();
  const selectedOperationId = useScheduleStore((s) => s.selectedOperationId);
  const setSelectedOperationId = useScheduleStore((s) => s.setSelectedOperationId);
  const operations = useScheduleStore((s) => s.operations);
  const resources = useScheduleStore((s) => s.resources);
  const workOrders = useScheduleStore((s) => s.workOrders);
  const downtimes = useScheduleStore((s) => s.downtimes);
  const shifts = useScheduleStore((s) => s.shifts);
  const deleteOperation = useScheduleStore((s) => s.deleteOperation);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);
  const triggerScrollToOperation = useScheduleStore((s) => s.triggerScrollToOperation);
  const setIsSplitModalOpen = useScheduleStore((s) => s.setIsSplitModalOpen);

  const operation = selectedOperationId ? operations[selectedOperationId] : null;
  const workOrder = operation ? workOrders[operation.workOrderId] : null;

  // Active Tab State
  const [activeTab, setActiveTab] = useState<DrawerTab>('general');

  // Form State
  const [name, setName] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [productType, setProductType] = useState('Automotive-ECU');
  const [duration, setDuration] = useState(120);
  const [setupDuration, setSetupDuration] = useState(15);
  const [status, setStatus] = useState<OperationStatus>('Planned');
  const [colorCode, setColorCode] = useState('#06b6d4');
  const [isLocked, setIsLocked] = useState(false);
  const [precedences, setPrecedences] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const dateLocale = language === 'tr' ? tr : enUS;

  useEffect(() => {
    if (operation) {
      setName(operation.name);
      setResourceId(operation.requiredResourceId);
      setProductType(operation.productType || 'Automotive-ECU');
      setDuration(operation.durationMinutes);
      setSetupDuration(operation.setupDurationMinutes);
      setStatus(operation.status);
      setColorCode(operation.colorCode || '#06b6d4');
      setIsLocked(!!operation.isLocked);
      setPrecedences(operation.precedenceOperationIds || []);
      setSaveFeedback(null);
    }
  }, [operation]);

  // All operations in this Work Order sorted by sequenceIndex
  const woOps = useMemo(() => {
    if (!operation) return [];
    return Object.values(operations)
      .filter((o) => o.workOrderId === operation.workOrderId)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  }, [operations, operation]);

  // Current Step Index in Route (e.g. Adım 2/4)
  const currentStepIndex = useMemo(() => {
    if (!operation) return 1;
    const idx = woOps.findIndex((o) => o.id === operation.id);
    return idx >= 0 ? idx + 1 : operation.sequenceIndex || 1;
  }, [woOps, operation]);

  const totalSteps = woOps.length || 1;

  // Critical Path calculation
  const cpmResult = useMemo(() => {
    return computeCriticalPath(operations, workOrders);
  }, [operations, workOrders]);

  const isCritical = operation ? cpmResult.criticalOperationIds.has(operation.id) : false;

  // Smart Constraints & Diagnostics
  const constraints = useMemo(() => {
    if (!operation) return null;
    return detectOperationConstraints(operation, workOrder || undefined, operations, downtimes, shifts);
  }, [operation, workOrder, operations, downtimes, shifts]);

  // Count active violations for badge on tab
  const violationCount = useMemo(() => {
    if (!constraints) return 0;
    let count = 0;
    if (constraints.isLate) count++;
    if (constraints.isMachineClash) count++;
    if (constraints.isPrecedenceViolated) count++;
    if (constraints.isDowntimeClash) count++;
    if (constraints.isOffShiftClash) count++;
    return count;
  }, [constraints]);

  // Slack (Esneklik) Buffer Analysis
  const slackAnalysis = useMemo(() => {
    if (!operation) return { freeSlackMinutes: 0, resourceSlackMinutes: 0, dueDateSlackMinutes: 0, minSlackMinutes: 0 };

    const opEndMs = new Date(operation.plannedEndTime).getTime();

    // 1. Successor / Precedence Slack: Next op in DAG or sequence
    const directSuccessors = Object.values(operations).filter(
      (o) =>
        o.workOrderId === operation.workOrderId &&
        o.id !== operation.id &&
        (o.precedenceOperationIds?.includes(operation.id) || o.sequenceIndex === operation.sequenceIndex + 1)
    );

    let freeSlackMs = Infinity;
    directSuccessors.forEach((succ) => {
      const succStartMs = new Date(succ.plannedStartTime).getTime();
      if (!isNaN(succStartMs)) {
        const gap = succStartMs - opEndMs;
        if (gap < freeSlackMs) freeSlackMs = gap;
      }
    });

    // 2. Resource Slack: Next operation on the same machine
    const sameResourceOps = Object.values(operations).filter(
      (o) => o.requiredResourceId === operation.requiredResourceId && o.id !== operation.id
    );
    let resourceSlackMs = Infinity;
    sameResourceOps.forEach((other) => {
      const otherStartMs = new Date(other.plannedStartTime).getTime();
      if (!isNaN(otherStartMs) && otherStartMs >= opEndMs) {
        const gap = otherStartMs - opEndMs;
        if (gap < resourceSlackMs) resourceSlackMs = gap;
      }
    });

    // 3. Due Date Slack: Margin against Work Order deadline
    let dueDateSlackMs = Infinity;
    if (workOrder?.dueDate) {
      const dueMs = new Date(workOrder.dueDate).getTime();
      if (!isNaN(dueMs)) {
        dueDateSlackMs = dueMs - opEndMs;
      }
    }

    const freeSlackMin = freeSlackMs === Infinity ? 9999 : Math.max(0, Math.round(freeSlackMs / 60000));
    const resourceSlackMin = resourceSlackMs === Infinity ? 9999 : Math.max(0, Math.round(resourceSlackMs / 60000));
    const dueDateSlackMin = dueDateSlackMs === Infinity ? 9999 : Math.round(dueDateSlackMs / 60000);

    const minSlack = Math.min(
      freeSlackMin === 9999 ? Infinity : freeSlackMin,
      resourceSlackMin === 9999 ? Infinity : resourceSlackMin,
      dueDateSlackMin === 9999 ? Infinity : Math.max(0, dueDateSlackMin)
    );

    return {
      freeSlackMinutes: freeSlackMin === 9999 ? -1 : freeSlackMin,
      resourceSlackMinutes: resourceSlackMin === 9999 ? -1 : resourceSlackMin,
      dueDateSlackMinutes: dueDateSlackMin === 9999 ? -1 : dueDateSlackMin,
      minSlackMinutes: minSlack === Infinity ? -1 : minSlack,
    };
  }, [operation, operations, workOrder]);

  if (!operation) return null;

  const handleTogglePrecedence = (opId: string) => {
    if (precedences.includes(opId)) {
      setPrecedences(precedences.filter((id) => id !== opId));
    } else {
      setPrecedences([...precedences, opId]);
    }
  };

  const handleQuickStatusChange = (newStatus: OperationStatus) => {
    setStatus(newStatus);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!operation) return;

    setIsSaving(true);
    setSaveFeedback(null);
    try {
      await scheduleApi.updateOperation(operation.id, {
        name,
        requiredResourceId: resourceId,
        durationMinutes: Number(duration),
        setupDurationMinutes: Number(setupDuration),
        plannedStartTime: operation.plannedStartTime,
        status,
        colorCode,
        isLocked,
        precedenceOperationIds: precedences,
      });
      await fetchSchedule();
      setSaveFeedback(t('saveChanges') + ' ✓');
      setTimeout(() => setSaveFeedback(null), 2500);
    } catch (err: any) {
      alert(`Failed to save operation: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const otherOperationsInWo = woOps.filter((o) => o.id !== operation.id);

  const parsedStart = new Date(operation.plannedStartTime);
  const validStartTime = isValid(parsedStart) ? parsedStart : new Date();
  const calculatedEndTime = new Date(
    validStartTime.getTime() + (Number(setupDuration) + Number(duration)) * 60000
  );

  const currentResource = resources[resourceId] || resources[operation.requiredResourceId];

  return (
    <aside className="w-96 md:w-[440px] xl:w-[460px] bg-slate-900 border-l border-slate-800 flex flex-col h-full z-40 text-xs shadow-2xl animate-in slide-in-from-right duration-200 select-none">
      {/* 1. TOP DRAWER BAR */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/95">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: colorCode }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                {t('drawerTitle')}
              </span>
              {isLocked && (
                <span className="flex items-center gap-0.5 text-[9px] bg-amber-950/80 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800/80 font-mono">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Locked</span>
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-100 truncate mt-0.5" title={operation.name}>
              {operation.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setSelectedOperationId(null)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title={t('shortcutsClose')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. LINKED WORK ORDER CARD (ÜST BİLGİ ALANI) */}
      <div className="p-3 bg-gradient-to-b from-slate-950 to-slate-900/90 border-b border-slate-800/90 space-y-2">
        {/* Row 1: WO Number, Customer, Priority, Critical Path, Step */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                {workOrder?.orderNumber || operation.workOrderNumber || operation.workOrderId}
              </span>

              {/* Rota Adımı (örn: Adım 2/4) */}
              <span className="text-[10px] font-semibold bg-indigo-950/70 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/50 font-mono flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>{t('routeStep')}: {currentStepIndex}/{totalSteps}</span>
              </span>

              {/* Priority Badge */}
              {workOrder && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    workOrder.priority === 1
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : workOrder.priority === 2
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  P{workOrder.priority} {workOrder.priority === 1 ? 'Kritik' : workOrder.priority === 2 ? 'Normal' : 'Düşük'}
                </span>
              )}

              {/* Critical Path Flame Badge 🔥 */}
              {isCritical && (
                <span className="text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-600/70 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm shadow-rose-950/50 animate-pulse font-mono">
                  <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />
                  <span>{t('criticalPathBadge')}</span>
                </span>
              )}
            </div>

            {/* Product Name & Customer */}
            <div className="pt-1 flex items-center justify-between text-slate-300">
              <div className="truncate font-semibold text-slate-200" title={workOrder?.productName || operation.productType}>
                {workOrder?.productName || operation.productType}
                {workOrder?.productCode && (
                  <span className="text-slate-400 font-normal font-mono ml-1">({workOrder.productCode})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid: Customer, Quantity, Due Date */}
        <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-slate-800/60 text-[10px]">
          <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/70">
            <span className="text-slate-500 block font-medium">{t('customer')}</span>
            <span className="text-slate-300 font-semibold truncate block" title={workOrder?.customerName || '-'}>
              {workOrder?.customerName || '-'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/70">
            <span className="text-slate-500 block font-medium">{t('quantity')}</span>
            <span className="text-cyan-300 font-bold font-mono">
              {workOrder?.quantity ? `${workOrder.quantity} ad.` : '-'}
            </span>
          </div>

          <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/70">
            <span className="text-slate-500 block font-medium">{t('targetLeadTime')}</span>
            <span
              className={`font-semibold font-mono truncate block ${
                constraints?.isLate ? 'text-rose-400 font-bold' : 'text-slate-300'
              }`}
              title={workOrder?.dueDate ? format(new Date(workOrder.dueDate), 'dd MMM yyyy, HH:mm', { locale: dateLocale }) : '-'}
            >
              {workOrder?.dueDate
                ? format(new Date(workOrder.dueDate), 'dd MMM, HH:mm', { locale: dateLocale })
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex border-b border-slate-800 bg-slate-950 px-2 pt-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2 px-2 text-center font-bold text-xs transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'general'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t('tabGeneralTiming')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex-1 py-2 px-2 text-center font-bold text-xs transition-all border-b-2 flex items-center justify-center gap-1.5 relative ${
            activeTab === 'diagnostics'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t('tabDiagnosticsConstraints')}</span>
          {violationCount > 0 ? (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center font-mono">
              {violationCount}
            </span>
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dag')}
          className={`flex-1 py-2 px-2 text-center font-bold text-xs transition-all border-b-2 flex items-center justify-center gap-1.5 ${
            activeTab === 'dag'
              ? 'border-cyan-500 text-cyan-300 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
          }`}
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>{t('tabDagDependencies')}</span>
          {precedences.length > 0 && (
            <span className="text-[10px] bg-slate-800 text-cyan-400 px-1 rounded font-mono font-bold">
              {precedences.length}
            </span>
          )}
        </button>
      </div>

      {/* 4. TAB CONTENTS */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* ======================================================== */}
        {/* TAB 1: GENEL & SÜRELER */}
        {/* ======================================================== */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            {/* Quick Status Buttons (Hızlı Durum Değiştirici) */}
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
              <label className="block text-slate-400 font-semibold text-[11px]">{t('quickStatus')}</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('Planned')}
                  className={`px-2 py-1.5 rounded font-medium text-xs transition-all flex items-center justify-center gap-1 ${
                    status === 'Planned'
                      ? 'bg-slate-700 text-slate-100 ring-1 ring-slate-400 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Timer className="w-3 h-3 text-slate-300" />
                  <span>{t('statusPlanned')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('InProgress')}
                  className={`px-2 py-1.5 rounded font-medium text-xs transition-all flex items-center justify-center gap-1 ${
                    status === 'InProgress'
                      ? 'bg-sky-600 text-white font-bold ring-2 ring-sky-300 shadow-md shadow-sky-950'
                      : 'bg-slate-900 text-sky-400 hover:bg-sky-950/40 border border-slate-800'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{t('statusActionStart')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('Completed')}
                  className={`px-2 py-1.5 rounded font-medium text-xs transition-all flex items-center justify-center gap-1 ${
                    status === 'Completed'
                      ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-300 shadow-md shadow-emerald-950'
                      : 'bg-slate-900 text-emerald-400 hover:bg-emerald-950/40 border border-slate-800'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>{t('statusActionComplete')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('Delayed')}
                  className={`px-2 py-1.5 rounded font-medium text-xs transition-all flex items-center justify-center gap-1 ${
                    status === 'Delayed'
                      ? 'bg-amber-600 text-white font-bold ring-2 ring-amber-300 shadow-md shadow-amber-950'
                      : 'bg-slate-900 text-amber-400 hover:bg-amber-950/40 border border-slate-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{t('statusDelayed')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickStatusChange('Blocked')}
                  className={`px-2 py-1.5 rounded font-medium text-xs transition-all flex items-center justify-center gap-1 col-span-2 ${
                    status === 'Blocked'
                      ? 'bg-rose-700 text-white font-bold ring-2 ring-rose-300 shadow-md shadow-rose-950'
                      : 'bg-slate-900 text-rose-400 hover:bg-rose-950/40 border border-slate-800'
                  }`}
                >
                  <Pause className="w-3 h-3 fill-current" />
                  <span>{t('statusActionHold')}</span>
                </button>
              </div>
            </div>

            {/* Operation Name */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{t('opName')}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            {/* Assigned Resource */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1 flex items-center justify-between">
                <span>{t('assignedCenter')}</span>
                {currentResource && (
                  <span className="text-[10px] text-cyan-400 font-mono font-normal">
                    {currentResource.type} ({currentResource.workingHoursPerDay}h/gün)
                  </span>
                )}
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {Object.values(resources).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type Selection */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1">{t('productFamily')}</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer font-mono"
              >
                <option value="Automotive-ECU">Automotive-ECU</option>
                <option value="IoT-Gateway">IoT-Gateway</option>
                <option value="Medical-Monitor">Medical-Monitor</option>
                <option value="Industrial-Power">Industrial-Power</option>
                <option value="Aerospace-Telemetry">Aerospace-Telemetry</option>
              </select>
            </div>

            {/* Planned and Actual Times Card */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('plannedTimes')}</span>
                </span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {format(validStartTime, 'dd MMM, HH:mm', { locale: dateLocale })} → {format(calculatedEndTime, 'HH:mm')}
                </span>
              </div>

              {/* Actual Times (Gerçekleşen Zamanlar) */}
              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div>
                  <span className="text-slate-500 block">{t('actualTimes')} (Başlangıç):</span>
                  <span className="font-mono text-slate-300">
                    {operation.actualStartTime
                      ? format(new Date(operation.actualStartTime), 'dd MMM, HH:mm', { locale: dateLocale })
                      : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('actualTimes')} (Bitiş):</span>
                  <span className="font-mono text-slate-300">
                    {operation.actualEndTime
                      ? format(new Date(operation.actualEndTime), 'dd MMM, HH:mm', { locale: dateLocale })
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Setup & Run Durations */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">{t('setupDuration')}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={setupDuration}
                    onChange={(e) => setSetupDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono text-xs"
                  />
                  <span className="text-slate-500 font-mono">min</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">{t('runDuration')}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono text-xs"
                  />
                  <span className="text-slate-500 font-mono">min</span>
                </div>
              </div>
            </div>

            {/* Total Duration Info */}
            <div className="bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400">{t('totalDuration')}:</span>
              <span className="text-amber-400 font-bold">
                {Number(setupDuration) + Number(duration)} dk ({Math.round(((Number(setupDuration) + Number(duration)) / 60) * 10) / 10} saat)
              </span>
            </div>

            {/* Color Code Picker */}
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">{t('stageColor')}</label>
              <div className="flex items-center gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorCode(c)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      colorCode === c
                        ? 'scale-125 ring-2 ring-white shadow-md'
                        : 'opacity-70 hover:opacity-100 hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Lock Toggle */}
            <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Unlock className="w-4 h-4 text-slate-500 shrink-0" />
                )}
                <div>
                  <label htmlFor="isLockedCheck" className="text-slate-200 font-semibold cursor-pointer block">
                    {t('lockInSequence')}
                  </label>
                  <p className="text-[10px] text-slate-500">Otomatik optimizasyon ve toplu kaydırmada sabitlenir</p>
                </div>
              </div>
              <input
                type="checkbox"
                id="isLockedCheck"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AKILLI TEŞHİS & KISITLAR (DIAGNOSTICS & CONSTRAINTS) */}
        {/* ======================================================== */}
        {activeTab === 'diagnostics' && constraints && (
          <div className="space-y-3.5">
            {/* Overall Status Banner */}
            <div
              className={`p-3 rounded-lg border flex items-center justify-between ${
                violationCount === 0
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {violationCount === 0 ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <div className="font-bold text-xs">
                    {violationCount === 0 ? t('allConstraintsPassed') : `${violationCount} ${t('constraintsDetected')}`}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {violationCount === 0
                      ? 'Çizelgeleme kuralları ve kısıtları tam uyumlu.'
                      : 'Lütfen çakışmaları ve gecikmeleri inceleyin.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Slack & Buffer Analysis Card (Esneklik / Slack Süresi) */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-cyan-400" />
                  <span>{t('slackAnalysis')}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    slackAnalysis.minSlackMinutes === 0 || isCritical
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : slackAnalysis.minSlackMinutes > 60
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {slackAnalysis.minSlackMinutes === -1
                    ? 'Serbest Pay: Sınırsız'
                    : slackAnalysis.minSlackMinutes === 0 || isCritical
                    ? t('slackZero')
                    : `+${slackAnalysis.minSlackMinutes} dk Esneklik`}
                </span>
              </div>

              <p className="text-[10px] text-slate-400">{t('slackDesc')}</p>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Öncül/Ardıl Payı:</span>
                  <span className="text-cyan-300 font-bold">
                    {slackAnalysis.freeSlackMinutes === -1
                      ? 'Son Adım'
                      : `${slackAnalysis.freeSlackMinutes} dk`}
                  </span>
                </div>

                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Makine Boşluk Payı:</span>
                  <span className="text-cyan-300 font-bold">
                    {slackAnalysis.resourceSlackMinutes === -1
                      ? 'Son İşlem'
                      : `${slackAnalysis.resourceSlackMinutes} dk`}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Item 1: Makine Çakışması */}
            <div
              className={`p-3 rounded-lg border space-y-1 ${
                constraints.isMachineClash
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  {constraints.isMachineClash ? (
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{t('machineClash')}</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    constraints.isMachineClash
                      ? 'bg-rose-900/80 text-rose-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {constraints.isMachineClash ? 'ÇAKIŞMA VAR' : 'UYGUN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {constraints.isMachineClash
                  ? `Aynı hatta çakışan işlem: ${constraints.clashingOpName}`
                  : t('machineClashNone')}
              </p>
            </div>

            {/* Diagnostic Item 2: Vardiya Dışı Çakışma */}
            <div
              className={`p-3 rounded-lg border space-y-1 ${
                constraints.isOffShiftClash
                  ? 'bg-amber-950/30 border-amber-800/80'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  {constraints.isOffShiftClash ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{t('shiftClash')}</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    constraints.isOffShiftClash
                      ? 'bg-amber-900/80 text-amber-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {constraints.isOffShiftClash ? 'VARDİYA DIŞI' : 'UYGUN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {constraints.isOffShiftClash
                  ? `Vardiya uyarısı: ${constraints.offShiftReason || 'Vardiya dışı saat'}`
                  : t('shiftClashNone')}
              </p>
            </div>

            {/* Diagnostic Item 3: Bakım / Duruş Çakışması */}
            <div
              className={`p-3 rounded-lg border space-y-1 ${
                constraints.isDowntimeClash
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  {constraints.isDowntimeClash ? (
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{t('downtimeClash')}</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    constraints.isDowntimeClash
                      ? 'bg-rose-900/80 text-rose-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {constraints.isDowntimeClash ? 'BAKIM ÇAKIŞMASI' : 'UYGUN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {constraints.isDowntimeClash
                  ? `Hat bakım aralığı ile kesişiyor: ${constraints.downtimeReason}`
                  : t('downtimeClashNone')}
              </p>
            </div>

            {/* Diagnostic Item 4: Öncül Kuralı İhlali */}
            <div
              className={`p-3 rounded-lg border space-y-1 ${
                constraints.isPrecedenceViolated
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  {constraints.isPrecedenceViolated ? (
                    <AlertOctagon className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{t('precedenceClash')}</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    constraints.isPrecedenceViolated
                      ? 'bg-rose-900/80 text-rose-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {constraints.isPrecedenceViolated ? 'SIRA HATASI' : 'UYGUN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {constraints.isPrecedenceViolated
                  ? `Öncül işlem tamamlanmadan başlıyor: ${constraints.precedingOpName}`
                  : t('precedenceClashNone')}
              </p>
            </div>

            {/* Diagnostic Item 5: Termin Gecikmesi Uyarısı */}
            <div
              className={`p-3 rounded-lg border space-y-1 ${
                constraints.isLate
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  {constraints.isLate ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{t('dueDateCompliance')}</span>
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    constraints.isLate
                      ? 'bg-rose-900/80 text-rose-200'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {constraints.isLate ? 'GECİKME' : 'TERMİN UYUMLU'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {constraints.isLate
                  ? `Teslim tarihinden ${constraints.latenessMinutes} dakika (${Math.round((constraints.latenessMinutes / 60) * 10) / 10} saat) sonra bitiyor!`
                  : t('dueDateComplianceNone')}
              </p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: BAĞIMLILIKLAR (DAG) */}
        {/* ======================================================== */}
        {activeTab === 'dag' && (
          <div className="space-y-4">
            {/* Predecessor Selection Area (Öncül Operasyon Seçimleri) */}
            <div className="space-y-2">
              <label className="block text-slate-300 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4 text-cyan-400" />
                  <span>{t('predecessorSelection')}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {precedences.length} seçili
                </span>
              </label>

              {otherOperationsInWo.length === 0 ? (
                <div className="text-slate-500 italic bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                  {t('noOtherOps')}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-800 custom-scrollbar">
                  {otherOperationsInWo.map((otherOp) => {
                    const isSelectedPrecedence = precedences.includes(otherOp.id);
                    const res = resources[otherOp.requiredResourceId];
                    return (
                      <button
                        key={otherOp.id}
                        type="button"
                        onClick={() => handleTogglePrecedence(otherOp.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-all ${
                          isSelectedPrecedence
                            ? 'bg-cyan-950/80 border border-cyan-500/70 text-cyan-200 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold font-mono ${
                              isSelectedPrecedence
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isSelectedPrecedence ? <Check className="w-3 h-3 stroke-[3]" /> : otherOp.sequenceIndex}
                          </div>
                          <div className="min-w-0">
                            <span className="truncate block font-medium text-xs text-slate-200">{otherOp.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {res?.name || otherOp.requiredResourceId} • {otherOp.durationMinutes}m
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            otherOp.status === 'Completed'
                              ? 'bg-emerald-950 text-emerald-300'
                              : otherOp.status === 'InProgress'
                              ? 'bg-sky-950 text-sky-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {otherOp.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visual Route Flow & Chain View (Zincir Görünümü) */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="block text-slate-300 font-semibold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>{t('dagFlowView')}</span>
              </label>

              <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                {woOps.map((op, idx) => {
                  const isCurrent = op.id === operation.id;
                  const res = resources[op.requiredResourceId];
                  const opStart = new Date(op.plannedStartTime);
                  const opEnd = new Date(op.plannedEndTime);
                  const hasValidTime = isValid(opStart) && isValid(opEnd);

                  return (
                    <React.Fragment key={op.id}>
                      <div
                        onClick={() => {
                          if (!isCurrent) setSelectedOperationId(op.id);
                        }}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-cyan-950/60 border-cyan-500 ring-1 ring-cyan-500/50 shadow-md'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] ${
                                isCurrent
                                  ? 'bg-cyan-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <span className={`font-semibold text-xs ${isCurrent ? 'text-cyan-200' : 'text-slate-200'}`}>
                              {op.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {isCurrent && (
                              <span className="text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.2 rounded font-mono font-bold">
                                {t('currentOp')}
                              </span>
                            )}
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: op.colorCode || '#06b6d4' }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                          <span>{res?.name || op.requiredResourceId}</span>
                          <span>{op.setupDurationMinutes + op.durationMinutes} min</span>
                          {hasValidTime && (
                            <span>{format(opStart, 'HH:mm')} - {format(opEnd, 'HH:mm')}</span>
                          )}
                        </div>
                      </div>

                      {/* Arrow between sequential steps */}
                      {idx < woOps.length - 1 && (
                        <div className="flex justify-center my-0.5 text-slate-600">
                          <ArrowRight className="w-3.5 h-3.5 rotate-90" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. QUICK ACTIONS FOOTER (HIZLI AKSİYONLAR) */}
        <div className="border-t border-slate-800 pt-4 space-y-2 mt-auto">
          {saveFeedback && (
            <div className="text-center font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 py-1 rounded-lg text-xs animate-in fade-in">
              {saveFeedback}
            </div>
          )}

          {/* Primary Row: Save Changes & Focus on Timeline */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-lg shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? t('saving') : t('saveChanges')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerScrollToOperation(operation.id);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate">{t('focusTimeline')}</span>
            </button>
          </div>

          {/* Secondary Row: Split Operation & Delete Operation */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSplitModalOpen(true, operation.id);
              }}
              className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60 font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('splitOp')}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (confirm(`'${operation.name}' ${t('deleteOpConfirm')}?`)) {
                  await deleteOperation(operation.id);
                  setSelectedOperationId(null);
                }
              }}
              className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 font-semibold py-1.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('deleteOp')}</span>
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
};

