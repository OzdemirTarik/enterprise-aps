import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import { Lock, Unlock, HardDrive, Cpu, Layers, Activity, ShieldAlert } from 'lucide-react';

interface GanttSidebarProps {
  rowHeight: number;
  sidebarScrollRef?: React.RefObject<HTMLDivElement>;
}

export const GanttSidebar: React.FC<GanttSidebarProps> = ({ rowHeight, sidebarScrollRef }) => {
  const { t } = useTranslation();
  const resources = useScheduleStore((state) => state.resources);
  const locks = useScheduleStore((state) => state.locks);
  const kpis = useScheduleStore((state) => state.kpis);
  const activeLockUser = useScheduleStore((state) => state.activeLockUser);
  const workCenterCategory = useScheduleStore((state) => state.workCenterCategory);

  const resourceList = Object.values(resources).filter((r) => {
    if (workCenterCategory === 'ALL') return true;
    if (workCenterCategory === 'SMT') return r.id.startsWith('SMT');
    if (workCenterCategory === 'THT') return r.id.startsWith('THT');
    if (workCenterCategory === 'TEST') return r.id.startsWith('ICT') || r.id.startsWith('FCT');
    if (workCenterCategory === 'COAT') return r.id.startsWith('COAT') || r.id.startsWith('DEPANEL');
    return true;
  });

  const toggleLock = async (resourceId: string) => {
    const existing = locks[resourceId];
    if (existing && existing.lockedByUserId === activeLockUser.userId) {
      await scheduleApi.releaseLock(resourceId, activeLockUser.userId);
    } else if (!existing) {
      await scheduleApi.acquireLock(
        resourceId,
        activeLockUser.userId,
        activeLockUser.userName,
        activeLockUser.userColor
      );
    }
  };

  const getCategoryIcon = (id: string) => {
    if (id.startsWith('SMT')) return <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    if (id.startsWith('THT')) return <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (id.startsWith('ICT') || id.startsWith('FCT'))
      return <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    return <ShieldAlert className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
  };

  return (
    <div className="w-72 flex-shrink-0 bg-[#0f172a] border-r border-slate-800 z-20 flex flex-col select-none h-full">
      {/* Sidebar Header (Fixed at top, matches 56px Timeline Ruler) */}
      <div className="h-14 min-h-[56px] max-h-[56px] bg-[#141e33] border-b border-slate-800 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="uppercase tracking-wider">{t('workCenters')} ({resourceList.length})</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase font-mono">{t('utilization')}</span>
      </div>

      {/* Resource Rows Container with Synchronized Scroll */}
      <div
        ref={sidebarScrollRef}
        className="flex-1 overflow-hidden divide-y divide-slate-800/60"
      >
        {resourceList.map((resource) => {
          const lock = locks[resource.id];
          const isLockedByMe = lock?.lockedByUserId === activeLockUser.userId;
          const isLockedByOther = lock && !isLockedByMe;
          const utilPercent = kpis?.resourceUtilization[resource.id] ?? 0;

          return (
            <div
              key={resource.id}
              className={`px-3.5 flex flex-col justify-center relative transition-colors box-border overflow-hidden ${
                isLockedByOther
                  ? 'bg-rose-950/20 border-l-4 border-rose-500'
                  : isLockedByMe
                  ? 'bg-cyan-950/20 border-l-4 border-cyan-500'
                  : 'hover:bg-slate-800/40 border-l-4 border-transparent'
              }`}
              style={{
                height: `${rowHeight}px`,
                minHeight: `${rowHeight}px`,
                maxHeight: `${rowHeight}px`,
              }}
            >
              {/* Line 1: Machine info & Lock status */}
              <div className="flex items-center justify-between leading-none">
                <div className="flex items-center space-x-2 overflow-hidden">
                  {getCategoryIcon(resource.id)}
                  <div className="truncate">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold font-mono text-slate-200">
                        {resource.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ${resource.hourlyRate}/h
                      </span>
                    </div>
                    <div
                      className="text-[11px] text-slate-400 truncate max-w-[130px] mt-0.5"
                      title={resource.name}
                    >
                      {resource.name}
                    </div>
                  </div>
                </div>

                {/* Lock Action Button & Badge */}
                <div className="flex items-center space-x-1 flex-shrink-0 ml-1">
                  {lock && (
                    <span
                      className={`text-[9px] font-mono px-1 py-0.5 rounded flex items-center gap-0.5 ${
                        isLockedByMe
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                      title={`${t('lockedBy')} ${lock.lockedByUserName}`}
                    >
                      <Lock className="w-2.5 h-2.5" />
                      {isLockedByMe ? t('you') : lock.lockedByUserName.split(' ')[0]}
                    </span>
                  )}

                  <button
                    onClick={() => toggleLock(resource.id)}
                    disabled={isLockedByOther}
                    className={`p-1 rounded text-slate-400 hover:text-white transition-colors ${
                      isLockedByOther ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-700'
                    }`}
                    title={
                      isLockedByOther
                        ? `${t('lockedBy')} ${lock.lockedByUserName}`
                        : isLockedByMe
                        ? t('releaseLock')
                        : t('acquireLock')
                    }
                  >
                    {isLockedByMe ? (
                      <Lock className="w-3 h-3 text-cyan-400" />
                    ) : isLockedByOther ? (
                      <Lock className="w-3 h-3 text-rose-400" />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Line 2: Real-Time Utilization Progress Bar */}
              <div className="mt-1 flex items-center space-x-2">
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilPercent > 80
                        ? 'bg-amber-500'
                        : utilPercent > 40
                        ? 'bg-emerald-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${utilPercent}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 flex-shrink-0 w-7 text-right">
                  {utilPercent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
