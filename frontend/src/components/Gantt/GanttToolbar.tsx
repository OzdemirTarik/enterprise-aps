import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import {
  Plus,
  Settings,
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
  ShieldAlert
} from 'lucide-react';

export const GanttToolbar: React.FC = () => {
  const zoomLevel = useScheduleStore((state) => state.zoomLevel);
  const setZoomLevel = useScheduleStore((state) => state.setZoomLevel);
  const workOrders = useScheduleStore((state) => state.workOrders);

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
  const setIsResourceManagerOpen = useScheduleStore((state) => state.setIsResourceManagerOpen);
  const setIsAddDowntimeOpen = useScheduleStore((state) => state.setIsAddDowntimeOpen);
  const setIsAutoScheduleOpen = useScheduleStore((state) => state.setIsAutoScheduleOpen);
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedule);

  const workOrderList = Object.values(workOrders);

  const categories: Array<{ id: 'ALL' | 'SMT' | 'THT' | 'TEST' | 'COAT'; label: string; icon: any }> = [
    { id: 'ALL', label: 'All Centers (8)', icon: Layers },
    { id: 'SMT', label: 'SMT Lines (2)', icon: Cpu },
    { id: 'THT', label: 'THT & Soldering (2)', icon: Layers },
    { id: 'TEST', label: 'Test & Inspection (2)', icon: Activity },
    { id: 'COAT', label: 'Coating & Router (2)', icon: ShieldAlert },
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
          <span>+ New PCBA Work Order</span>
        </button>

        <button
          onClick={() => setIsResourceManagerOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          title="Manage EMS Work Centers & Changeover Matrices"
        >
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>EMS Lines & Matrices</span>
        </button>

        <button
          onClick={() => setIsAddDowntimeOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors"
          title="Schedule SMT Squeegee Wipe or Maintenance"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>+ Maintenance</span>
        </button>

        <button
          onClick={() => setIsAutoScheduleOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 transition-colors"
        >
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span>Auto-Schedule</span>
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
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right Group: Search, Filters, Undo/Redo & Zoom */}
      <div className="flex items-center space-x-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search PCBA op or WO#..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900/90 border border-slate-700/80 rounded pl-8 pr-2.5 py-1 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 w-44"
          />
        </div>

        {/* Filter by Work Order */}
        <div className="flex items-center space-x-1 bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={workOrderFilter || ''}
            onChange={(e) => setWorkOrderFilter(e.target.value || null)}
            className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer max-w-[120px]"
          >
            <option value="" className="bg-slate-900">All Batches</option>
            {workOrderList.map((wo) => (
              <option key={wo.id} value={wo.id} className="bg-slate-900">
                {wo.orderNumber} ({wo.productCode})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter || ''}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="bg-slate-900/90 border border-slate-700/80 rounded px-2 py-1 text-slate-300 text-xs focus:outline-none cursor-pointer"
        >
          <option value="" className="bg-slate-900">All Statuses</option>
          <option value="Planned" className="bg-slate-900">Planned</option>
          <option value="InProgress" className="bg-slate-900">In Progress</option>
          <option value="Completed" className="bg-slate-900">Completed</option>
          <option value="Delayed" className="bg-slate-900">Delayed</option>
        </select>

        {/* Undo / Redo */}
        <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded border border-slate-700 ${
              undoStack.length > 0 ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo Move (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded border border-slate-700 ${
              redoStack.length > 0 ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo Move (Ctrl+Y)"
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
            1H
          </button>
          <button
            onClick={() => setZoomLevel('day')}
            className={`px-2 py-1 rounded text-[11px] font-mono ${
              zoomLevel === 'day' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            1D
          </button>
          <button
            onClick={() => setZoomLevel('week')}
            className={`px-2 py-1 rounded text-[11px] font-mono ${
              zoomLevel === 'week' ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Shift/W
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchSchedule()}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title="Reload Schedule Data"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
