import React, { useState, useMemo } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import {
  ClipboardList,
  Search,
  Trash2,
  Filter,
  Plus,
  X,
  CheckCircle2,
  Cpu,
  Calendar,
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  LocateFixed,
  Lock,
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { format, isValid } from 'date-fns';

export const WorkOrderManagerModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isWorkOrderManagerOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsWorkOrderManagerOpen);
  const setIsCreateOpen = useScheduleStore((s) => s.setIsCreateWorkOrderOpen);
  const workOrders = useScheduleStore((s) => s.workOrders);
  const operations = useScheduleStore((s) => s.operations);
  const resources = useScheduleStore((s) => s.resources);
  const deleteWorkOrder = useScheduleStore((s) => s.deleteWorkOrder);
  const setWorkOrderFilter = useScheduleStore((s) => s.setWorkOrderFilter);
  const triggerScrollToOperation = useScheduleStore((s) => s.triggerScrollToOperation);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Planned' | 'InProgress' | 'Completed' | 'Delayed'>('ALL');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'duration' | 'name'>('dueDate');
  const [expandedWoId, setExpandedWoId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const woList = Object.values(workOrders);
  const opList = Object.values(operations);

  // Overall Factory KPI Metrics
  const summaryKpis = useMemo(() => {
    let totalVolume = 0;
    let overdueCount = 0;
    let inProgressCount = 0;
    const nowMs = Date.now();

    woList.forEach((wo) => {
      totalVolume += wo.quantity || 0;
      const dueMs = new Date(wo.dueDate).getTime();
      if (isValid(new Date(wo.dueDate)) && dueMs < nowMs) {
        overdueCount++;
      }
      const woOps = opList.filter((o) => o.workOrderId === wo.id);
      if (woOps.some((o) => o.status === 'InProgress')) {
        inProgressCount++;
      }
    });

    return {
      totalOrders: woList.length,
      totalVolume,
      overdueCount,
      inProgressCount,
    };
  }, [woList, opList]);

  // Filtered & Sorted Work Orders
  const filteredAndSortedWos = useMemo(() => {
    return woList
      .filter((wo) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const match =
            (wo.orderNumber || '').toLowerCase().includes(q) ||
            (wo.productCode || '').toLowerCase().includes(q) ||
            (wo.productName || '').toLowerCase().includes(q) ||
            (wo.customerName || '').toLowerCase().includes(q);
          if (!match) return false;
        }

        // Status Filter
        if (statusFilter !== 'ALL') {
          const woOps = opList.filter((o) => o.workOrderId === wo.id);
          if (statusFilter === 'Delayed') {
            const isLate = isValid(new Date(wo.dueDate)) && new Date(wo.dueDate).getTime() < Date.now();
            const hasDelayedOp = woOps.some((o) => o.status === 'Delayed');
            if (!isLate && !hasDelayedOp) return false;
          } else {
            const hasStatus = woOps.some((o) => o.status === statusFilter);
            if (!hasStatus) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'dueDate') {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'priority') {
          return (a.priority || 2) - (b.priority || 2);
        }
        if (sortBy === 'duration') {
          const aOps = opList.filter((o) => o.workOrderId === a.id);
          const bOps = opList.filter((o) => o.workOrderId === b.id);
          const aDur = aOps.reduce((sum, o) => sum + o.durationMinutes + o.setupDurationMinutes, 0);
          const bDur = bOps.reduce((sum, o) => sum + o.durationMinutes + o.setupDurationMinutes, 0);
          return bDur - aDur;
        }
        if (sortBy === 'name') {
          return (a.orderNumber || '').localeCompare(b.orderNumber || '');
        }
        return 0;
      });
  }, [woList, opList, search, statusFilter, sortBy]);

  const handleDelete = async (woId: string) => {
    setDeletingId(woId);
    try {
      await deleteWorkOrder(woId);
      await fetchSchedule();
      setConfirmDeleteId(null);
      setSuccessMsg(t('woDeletedSuccess'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to delete work order: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterInGantt = (woId: string) => {
    setWorkOrderFilter(woId);
    setIsOpen(false);
  };

  const handleFocusInGantt = (woId: string) => {
    const woOps = opList.filter((o) => o.workOrderId === woId).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
    if (woOps.length > 0) {
      triggerScrollToOperation(woOps[0].id);
    }
    setIsOpen(false);
  };

  const formatDateSafe = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return isValid(d) ? format(d, 'dd.MM.yyyy HH:mm') : '-';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150 select-none">
      <div className="w-[96vw] max-w-6xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('workOrderManagerTitle')}</span>
                <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                  {filteredAndSortedWos.length} / {woList.length} {t('workOrders')}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">{t('workOrderManagerDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top Summary KPI Banner */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800/80 grid grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
            <ClipboardList className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">{t('allWorkOrdersCount')}</div>
              <div className="font-mono font-bold text-slate-200 text-[12px]">{summaryKpis.totalOrders} Parti</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
            <Boxes className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">{t('totalVolume')}</div>
              <div className="font-mono font-bold text-purple-300 text-[12px]">{summaryKpis.totalVolume.toLocaleString()} Panel</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">{t('filterInProgress')}</div>
              <div className="font-mono font-bold text-emerald-300 text-[12px]">{summaryKpis.inProgressCount} Üretimde</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
            <AlertTriangle className={`w-4 h-4 shrink-0 ${summaryKpis.overdueCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
            <div>
              <div className="text-[10px] text-slate-400">{t('overdueRisk')}</div>
              <div className={`font-mono font-bold text-[12px] ${summaryKpis.overdueCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {summaryKpis.overdueCount} Gecikme / Kritik
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Status Filter Tabs, Sort, New WO Button */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(
              [
                { id: 'ALL', label: t('filterAll') },
                { id: 'Planned', label: t('filterPlanned') },
                { id: 'InProgress', label: t('filterInProgress') },
                { id: 'Completed', label: t('filterCompleted') },
                { id: 'Delayed', label: t('filterDelayed') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                  statusFilter === tab.id
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                language === 'tr'
                  ? 'İş emri, ürün kodu veya müşteri...'
                  : 'Search by WO#, code, customer...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 placeholder-slate-500"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="text-slate-400 font-medium">{t('sortBy')}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
            >
              <option value="dueDate">{t('sortDueDate')}</option>
              <option value="priority">{t('sortPriority')}</option>
              <option value="duration">{t('sortDuration')}</option>
              <option value="name">{t('sortOrderNumber')}</option>
            </select>
          </div>

          {/* New Work Order Action */}
          <button
            onClick={() => {
              setIsOpen(false);
              setIsCreateOpen(true);
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded-lg text-[11px] transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-950 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('newWorkOrder')}</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-5 mt-2.5 p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Work Orders List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredAndSortedWos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-semibold">
                {language === 'tr' ? 'Arama kriterlerine uygun iş emri bulunamadı.' : 'No matching work orders found.'}
              </p>
            </div>
          ) : (
            filteredAndSortedWos.map((wo) => {
              const woOps = opList.filter((o) => o.workOrderId === wo.id).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
              const isDeleting = deletingId === wo.id;
              const isConfirming = confirmDeleteId === wo.id;
              const isExpanded = expandedWoId === wo.id;

              const totalDurationMin = woOps.reduce(
                (sum, o) => sum + o.durationMinutes + o.setupDurationMinutes,
                0
              );
              const totalHours = (totalDurationMin / 60).toFixed(1);

              const completedOpsCount = woOps.filter((o) => o.status === 'Completed').length;
              const inProgressOpsCount = woOps.filter((o) => o.status === 'InProgress').length;
              const progressPercent = woOps.length > 0 ? Math.round((completedOpsCount / woOps.length) * 100) : 0;

              const nowMs = Date.now();
              const dueMs = new Date(wo.dueDate).getTime();
              const diffDays = isValid(new Date(wo.dueDate))
                ? Math.ceil((dueMs - nowMs) / 86400000)
                : null;

              return (
                <div
                  key={wo.id}
                  className={`bg-slate-950 border rounded-xl p-3 transition-all shadow-sm space-y-2.5 ${
                    isConfirming
                      ? 'border-rose-500/80 bg-rose-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Identity, Customer, Priority, Countdown & Action Buttons */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-cyan-300">
                            {wo.orderNumber}
                          </span>
                          <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 py-0.2 rounded font-mono font-semibold">
                            {wo.productCode}
                          </span>
                          {wo.customerName && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-medium border border-slate-700 flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span>{wo.customerName}</span>
                            </span>
                          )}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                              wo.priority === 1
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : wo.priority === 2
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            P{wo.priority || 2}
                          </span>

                          {/* Due Date Badge */}
                          {diffDays !== null && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                                diffDays > 1
                                  ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300'
                                  : diffDays >= 0
                                  ? 'bg-amber-950/70 border border-amber-700/60 text-amber-300'
                                  : 'bg-rose-950/70 border border-rose-700/60 text-rose-300 animate-pulse'
                              }`}
                            >
                              {diffDays > 0
                                ? `${diffDays} ${t('daysRemaining')}`
                                : diffDays === 0
                                ? t('dueToday')
                                : `${Math.abs(diffDays)} ${t('overdue')}`}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 truncate font-medium mt-0.5">
                          {wo.productName}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Focus, Filter, Expand, Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Focus on Gantt Button */}
                      <button
                        type="button"
                        onClick={() => handleFocusInGantt(wo.id)}
                        className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title={t('focusInGantt')}
                      >
                        <LocateFixed className="w-3 h-3 text-cyan-400" />
                        <span>{t('focusInGantt')}</span>
                      </button>

                      {/* Filter in Gantt */}
                      <button
                        type="button"
                        onClick={() => handleFilterInGantt(wo.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title={t('filterInGantt')}
                      >
                        <Filter className="w-3 h-3 text-slate-400" />
                        <span>{t('filterInGantt')}</span>
                      </button>

                      {/* Expand Step Details */}
                      <button
                        type="button"
                        onClick={() => setExpandedWoId(isExpanded ? null : wo.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <span>{isExpanded ? t('hideSteps') : t('showAllSteps')}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {/* Safe Delete Trigger */}
                      {!isConfirming ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(wo.id)}
                          className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                          title={t('deleteWorkOrderFull')}
                        >
                          <Trash2 className="w-3 h-3 text-rose-400" />
                          <span>{t('deleteWorkOrderFull')}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(wo.id)}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2.5 py-1 rounded-lg text-[11px] shadow-md shadow-rose-950"
                          >
                            {isDeleting ? 'Siliniyor...' : 'Onayla (Sil)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg text-[11px]"
                          >
                            Vazgeç
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar & Metadata Row */}
                  <div className="grid grid-cols-12 gap-3 items-center text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    {/* Live Progress Bar (4 cols) */}
                    <div className="col-span-4 flex items-center gap-2">
                      <span className="shrink-0 text-slate-400 font-semibold">{t('progressLabel')}:</span>
                      <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800 flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                        {inProgressOpsCount > 0 && (
                          <div
                            className="bg-cyan-500 h-full animate-pulse"
                            style={{ width: `${(inProgressOpsCount / Math.max(1, woOps.length)) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="font-mono text-emerald-300 font-bold shrink-0">
                        {completedOpsCount}/{woOps.length} (%{progressPercent})
                      </span>
                    </div>

                    {/* Quantity */}
                    <div className="col-span-2">
                      <span>{t('quantity')}: </span>
                      <span className="font-mono font-bold text-slate-200">{wo.quantity} panel</span>
                    </div>

                    {/* Total Duration */}
                    <div className="col-span-2 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{totalHours} saat ({totalDurationMin} dk)</span>
                    </div>

                    {/* Release Date */}
                    <div className="col-span-2 flex items-center gap-1 font-mono truncate">
                      <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{formatDateSafe(wo.releaseDate)}</span>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-2 flex items-center gap-1 font-mono text-amber-300 truncate">
                      <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="font-semibold truncate">{formatDateSafe(wo.dueDate)}</span>
                    </div>
                  </div>

                  {/* Expanded Step-by-Step Chronological Timeline Table */}
                  {isExpanded && (
                    <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 mt-2 space-y-1.5 animate-in fade-in duration-150 text-[10px]">
                      <div className="grid grid-cols-12 gap-2 text-[9px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1 px-1">
                        <span className="col-span-1">#</span>
                        <span className="col-span-4">Operasyon Adı</span>
                        <span className="col-span-3">Atanan İstasyon</span>
                        <span className="col-span-2">Süre (Setup + Run)</span>
                        <span className="col-span-2">Durum & Kilit</span>
                      </div>
                      {woOps.map((op, idx) => {
                        const res = resources[op.requiredResourceId];
                        return (
                          <div
                            key={op.id}
                            className="grid grid-cols-12 gap-2 items-center px-1 py-1 rounded hover:bg-slate-800/60 transition-colors font-mono"
                          >
                            <span className="col-span-1 font-bold text-cyan-400">{idx + 1}.</span>
                            <span className="col-span-4 text-slate-200 font-sans font-medium truncate flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: op.colorCode || '#06b6d4' }} />
                              <span className="truncate">{op.name}</span>
                            </span>
                            <span className="col-span-3 text-slate-300 truncate">
                              {res ? `${res.code} (${res.name})` : op.requiredResourceId}
                            </span>
                            <span className="col-span-2 text-slate-300">
                              {op.setupDurationMinutes > 0 && <span className="text-amber-400">{op.setupDurationMinutes}m + </span>}
                              <span>{op.durationMinutes}m</span>
                            </span>
                            <div className="col-span-2 flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  op.status === 'Completed'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                    : op.status === 'InProgress'
                                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                                    : op.status === 'Delayed'
                                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {op.status}
                              </span>
                              {op.isLocked && (
                                <span title="Kilitli" className="flex items-center">
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            <span>{t('allWorkOrdersCount')}: </span>
            <span className="font-bold text-slate-200 font-mono">{filteredAndSortedWos.length}</span>
            <span> / {woList.length} kayıtlı parti</span>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
