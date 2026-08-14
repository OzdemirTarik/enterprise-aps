import React, { useEffect } from 'react';
import { useScheduleStore } from './store/useScheduleStore';
import { signalRService } from './services/signalrService';
import { KpiHeader } from './components/Header/KpiHeader';
import { GanttToolbar } from './components/Gantt/GanttToolbar';
import { GanttScheduler } from './components/Gantt/GanttScheduler';
import { OperationDetailDrawer } from './components/Modals/OperationDetailDrawer';
import { AutoScheduleModal } from './components/Modals/AutoScheduleModal';
import { CreateWorkOrderModal } from './components/Modals/CreateWorkOrderModal';
import { ResourceManagerModal } from './components/Modals/ResourceManagerModal';
import { AddDowntimeModal } from './components/Modals/AddDowntimeModal';
import { ShiftManagerModal } from './components/Modals/ShiftManagerModal';
import { SplitOperationModal } from './components/Modals/SplitOperationModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);
  const selectedOperationId = useScheduleStore((s) => s.selectedOperationId);
  const isLoading = useScheduleStore((s) => s.isLoading);
  const error = useScheduleStore((s) => s.error);

  // Initialize keyboard shortcuts (Ctrl+Z, Ctrl+Y, L, Esc)
  useKeyboardShortcuts();

  useEffect(() => {
    // 1. Initial Schedule Fetch
    fetchSchedule();

    // 2. Connect SignalR WebSocket Client
    signalRService.start();

    return () => {
      signalRService.stop();
    };
  }, [fetchSchedule]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden">
      {/* 1. Global KPI Status Header */}
      <KpiHeader />

      {/* 2. Interactive Toolbar with Search, Filters, and Modals */}
      <GanttToolbar />

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <GanttScheduler />

        {/* 4. Operation Inspector Drawer */}
        {selectedOperationId && <OperationDetailDrawer />}
      </div>

      {/* 5. Interactive Modals */}
      <CreateWorkOrderModal />
      <ResourceManagerModal />
      <ShiftManagerModal />
      <AddDowntimeModal />
      <SplitOperationModal />
      <AutoScheduleModal />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 bg-slate-900 border border-sky-500/50 rounded-lg px-3 py-2 text-xs flex items-center gap-2 shadow-xl z-50 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span className="text-slate-300 font-medium">Syncing with In-Memory DAG...</span>
        </div>
      )}

      {/* Error Alert Toast */}
      {error && (
        <div className="fixed top-14 right-4 bg-rose-950/90 border border-rose-600 rounded-lg p-3 text-xs text-rose-200 shadow-2xl z-50 flex items-center gap-2 max-w-md">
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
        </div>
      )}
    </div>
  );
};
export default App;
