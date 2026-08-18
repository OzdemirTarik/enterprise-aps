import React from 'react';
import { useScheduleStore, computeCriticalPath, isResourceMatchingCategory } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import {
  Plus,
  Settings,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  Undo,
  Redo,
  Search,
  Filter,
  Cpu,
  Layers,
  Activity,
  ShieldAlert,
  ClipboardList,
  Trash2,
  Compass,
  HelpCircle,
  X,
  Link2,
  Flame,
  Calendar,
  Magnet,
} from 'lucide-react';

export const GanttToolbar: React.FC = () => {
  const { t } = useTranslation();
  const zoomLevel = useScheduleStore((state) => state.zoomLevel);
  const setZoomLevel = useScheduleStore((state) => state.setZoomLevel);
  const resources = useScheduleStore((state) => state.resources);
  const workOrders = useScheduleStore((state) => state.workOrders);
  const operations = useScheduleStore((state) => state.operations);
  const deleteWorkOrder = useScheduleStore((state) => state.deleteWorkOrder);
  const shifts = useScheduleStore((state) => state.shifts);

  const searchQuery = useScheduleStore((state) => state.searchQuery);
  const setSearchQuery = useScheduleStore((state) => state.setSearchQuery);
  const workOrderFilter = useScheduleStore((state) => state.workOrderFilter);
  const setWorkOrderFilter = useScheduleStore((state) => state.setWorkOrderFilter);
  const statusFilter = useScheduleStore((state) => state.statusFilter);
  const setStatusFilter = useScheduleStore((state) => state.setStatusFilter);
  const workCenterCategory = useScheduleStore((state) => state.workCenterCategory);
  const setWorkCenterCategory = useScheduleStore((state) => state.setWorkCenterCategory);

  const undoStack = useScheduleStore((state) => state.undoStack);
  const redoStack = useScheduleStore((state) => state.redoStack);
  const undo = useScheduleStore((state) => state.undo);
  const redo = useScheduleStore((state) => state.redo);

  const setIsCreateWorkOrderOpen = useScheduleStore((state) => state.setIsCreateWorkOrderOpen);
  const setIsWorkOrderManagerOpen = useScheduleStore((state) => state.setIsWorkOrderManagerOpen);
  const setIsResourceManagerOpen = useScheduleStore((state) => state.setIsResourceManagerOpen);
  const setIsAddDowntimeOpen = useScheduleStore((state) => state.setIsAddDowntimeOpen);
  const setIsShiftManagerOpen = useScheduleStore((state) => state.setIsShiftManagerOpen);
  const setIsAutoScheduleOpen = useScheduleStore((state) => state.setIsAutoScheduleOpen);
  const setIsShortcutsOpen = useScheduleStore((state) => state.setIsShortcutsOpen);
  const isChainDragActive = useScheduleStore((state) => state.isChainDragActive);
  const setIsChainDragActive = useScheduleStore((state) => state.setIsChainDragActive);
  const isCriticalPathActive = useScheduleStore((state) => state.isCriticalPathActive);
  const setIsCriticalPathActive = useScheduleStore((state) => state.setIsCriticalPathActive);
  const isHeatmapActive = useScheduleStore((state) => state.isHeatmapActive);
  const setIsHeatmapActive = useScheduleStore((state) => state.setIsHeatmapActive);
  const isShiftOverlayActive = useScheduleStore((state) => state.isShiftOverlayActive);
  const setIsShiftOverlayActive = useScheduleStore((state) => state.setIsShiftOverlayActive);
  const isMagneticSnapActive = useScheduleStore((state) => state.isMagneticSnapActive);
  const setIsMagneticSnapActive = useScheduleStore((state) => state.setIsMagneticSnapActive);
  const triggerScrollToNow = useScheduleStore((state) => state.triggerScrollToNow);
  const triggerScrollToDate = useScheduleStore((state) => state.triggerScrollToDate);
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedule);

  const workOrderList = Object.values(workOrders);
  const resourceList = Object.values(resources);

  const categoryCounts = React.useMemo(() => {
    return {
      ALL: resourceList.length,
      SMT: resourceList.filter((r) => isResourceMatchingCategory(r, 'SMT')).length,
      THT: resourceList.filter((r) => isResourceMatchingCategory(r, 'THT')).length,
      TEST: resourceList.filter((r) => isResourceMatchingCategory(r, 'TEST')).length,
      COAT: resourceList.filter((r) => isResourceMatchingCategory(r, 'COAT')).length,
    };
  }, [resourceList]);

  const criticalResult = React.useMemo(() => {
    if (!isCriticalPathActive) return null;
    return computeCriticalPath(operations, workOrders);
  }, [isCriticalPathActive, operations, workOrders]);

  const categories: Array<{ id: 'ALL' | 'SMT' | 'THT' | 'TEST' | 'COAT'; labelKey: any; icon: any }> = [
    { id: 'ALL', labelKey: 'allCenters', icon: Layers },
    { id: 'SMT', labelKey: 'smtLines', icon: Cpu },
    { id: 'THT', labelKey: 'thtLines', icon: Layers },
    { id: 'TEST', labelKey: 'testStations', icon: Activity },
    { id: 'COAT', labelKey: 'coatingRouter', icon: ShieldAlert },
  ];

  return (
    <div className="bg-[#141e33] border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs select-none">
      {/* Left Group: Action Modals */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setIsCreateWorkOrderOpen(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newWorkOrder')}</span>
        </button>

        <button
          onClick={() => setIsWorkOrderManagerOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          title={t('workOrderListBtn')}
        >
          <ClipboardList className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('workOrderListBtn')} ({workOrderList.length})</span>
        </button>

        <button
          onClick={() => setIsResourceManagerOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          title={t('lineManager')}
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('lineManager')}</span>
        </button>

        <button
          onClick={() => setIsShiftManagerOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
          title={t('shiftSettings')}
        >
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('shiftSettings')} ({shifts.length})</span>
        </button>

        <button
          onClick={() => setIsAddDowntimeOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
          title={t('maintenance')}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('maintenance')}</span>
        </button>

        <button
          onClick={() => setIsAutoScheduleOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t('autoSchedule')}</span>
        </button>
      </div>

      {/* Center Group: EMS Category Tabs */}
      <div className="flex items-center bg-slate-900/80 p-0.5 rounded-lg border border-slate-800">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = workCenterCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setWorkCenterCategory(cat.id)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{t(cat.labelKey)} ({categoryCounts[cat.id]})</span>
            </button>
          );
        })}
      </div>

      {/* Advanced Planning & Analytics Toggles (Chain Drag, CPM, Heatmap) */}
      <div className="flex items-center space-x-1.5 border-l border-r border-slate-800/80 px-2">
        <button
          type="button"
          onClick={() => setIsChainDragActive(!isChainDragActive)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            isChainDragActive
              ? 'bg-amber-600 text-white border-amber-500 shadow-sm shadow-amber-950 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={t('chainDragHelp')}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>{t('chainDrag')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCriticalPathActive(!isCriticalPathActive)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            isCriticalPathActive
              ? 'bg-rose-600 text-white border-rose-500 shadow-sm shadow-rose-950 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={t('criticalPathDesc')}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>{t('criticalPath')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsHeatmapActive(!isHeatmapActive)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            isHeatmapActive
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-950 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={t('capacityHeatmap')}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t('capacityHeatmap')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsShiftOverlayActive(!isShiftOverlayActive)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            isShiftOverlayActive
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-950 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={t('shiftShadingDesc')}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t('shiftShading')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMagneticSnapActive(!isMagneticSnapActive)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            isMagneticSnapActive
              ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm shadow-cyan-950 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
          title={t('magneticSnapDesc')}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>{t('magneticSnap')}</span>
        </button>

        {/* Dynamic Critical Path Status Pill */}
        {isCriticalPathActive && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-950/90 border border-rose-500/80 text-rose-200 text-[10px] font-mono shadow-sm">
            <Flame className="w-3 h-3 text-amber-300 fill-amber-400 animate-pulse shrink-0" />
            <span>
              {t('criticalPath')}: <strong className="text-white">{criticalResult?.bottleneckWorkOrderNumber || 'Yok'}</strong> ({criticalResult?.totalCriticalOperations} Adım)
            </span>
          </div>
        )}

        {/* Dynamic Heatmap Legend */}
        {isHeatmapActive && (
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              &lt;50%
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              50-85%
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              &gt;85%
            </span>
          </div>
        )}
      </div>

      {/* Right Group: Search, Filters, Undo/Redo & Zoom */}
      <div className="flex items-center space-x-2">
        {/* Search Bar with Clear Button */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/90 border border-slate-700/80 rounded pl-8 pr-7 py-1 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 w-44 transition-all focus:w-56"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 rounded"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter by Work Order */}
        <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={workOrderFilter || ''}
            onChange={(e) => setWorkOrderFilter(e.target.value || null)}
            className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer max-w-[120px]"
          >
            <option value="" className="bg-slate-900">{t('allBatches')}</option>
            {workOrderList.map((wo) => (
              <option key={wo.id} value={wo.id} className="bg-slate-900">
                {wo.orderNumber} ({wo.productCode})
              </option>
            ))}
          </select>

          {workOrderFilter && (
            <button
              type="button"
              onClick={async () => {
                const targetWo = workOrders[workOrderFilter];
                if (!targetWo) return;
                const woOps = Object.values(operations).filter(
                  (o) => o.workOrderId === workOrderFilter
                );
                if (
                  window.confirm(
                    `'${targetWo.orderNumber}' ${t('deleteWorkOrderConfirm')} (${woOps.length} ${t('routingSteps')})`
                  )
                ) {
                  await deleteWorkOrder(workOrderFilter);
                  setWorkOrderFilter(null);
                  await fetchSchedule();
                }
              }}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950 p-1 rounded transition-colors"
              title={t('deleteWorkOrderFull')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none cursor-pointer"
        >
          <option value="" className="bg-slate-900">{t('allStatuses')}</option>
          <option value="Planned" className="bg-slate-900">{t('statusPlanned')}</option>
          <option value="InProgress" className="bg-slate-900">{t('statusInProgress')}</option>
          <option value="Completed" className="bg-slate-900">{t('statusCompleted')}</option>
          <option value="Delayed" className="bg-slate-900">{t('statusDelayed')}</option>
        </select>

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded border border-slate-700 ${
              undoStack.length > 0 ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
            }`}
            title={t('undo')}
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded border border-slate-700 ${
              redoStack.length > 0 ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
            }`}
            title={t('redo')}
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
          <button
            onClick={() => setZoomLevel('hour')}
            className={`px-2 py-1 rounded text-[11px] font-mono ${
              zoomLevel === 'hour' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('hourView')}
          </button>
          <button
            onClick={() => setZoomLevel('day')}
            className={`px-2 py-1 rounded text-[11px] font-mono ${
              zoomLevel === 'day' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('dayView')}
          </button>
          <button
            onClick={() => setZoomLevel('week')}
            className={`px-2 py-1 rounded text-[11px] font-mono ${
              zoomLevel === 'week' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('weekView')}
          </button>
          <button
            onClick={() => setZoomLevel('month')}
            className={`px-2 py-1 rounded text-[11px] font-mono ${
              zoomLevel === 'month' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t('monthView')}
          </button>
        </div>

        {/* Jump to Date Picker */}
        <div
          className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 hover:border-slate-600 transition-colors"
          title={t('jumpToDate')}
        >
          <Calendar className="w-3 h-3 text-slate-400 pointer-events-none shrink-0" />
          <input
            type="date"
            onChange={(e) => {
              if (e.target.value) {
                triggerScrollToDate(new Date(e.target.value));
              }
            }}
            className="bg-transparent text-slate-300 text-[11px] font-mono focus:outline-none cursor-pointer w-24"
          />
        </div>

        {/* Jump to Now */}
        <button
          type="button"
          onClick={triggerScrollToNow}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-slate-700 transition-colors"
          title={t('jumpToNow')}
        >
          <Compass className="w-3.5 h-3.5" />
        </button>

        {/* Refresh */}
        <button
          onClick={() => fetchSchedule()}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title={t('reload')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Keyboard Shortcuts Guide */}
        <button
          type="button"
          onClick={() => setIsShortcutsOpen(true)}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors"
          title={t('keyboardShortcuts')}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
