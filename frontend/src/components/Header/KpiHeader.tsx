import React from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { 
  Activity, 
  Clock, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Radio,
  Cpu
} from 'lucide-react';

export const KpiHeader: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();
  const kpis = useScheduleStore((state) => state.kpis);
  const activeLockUser = useScheduleStore((state) => state.activeLockUser);
  const presence = useScheduleStore((state) => state.presence);

  const peerList = Object.values(presence);

  return (
    <header className="bg-[#0f172a] border-b border-slate-800 px-5 py-2.5 flex items-center justify-between shadow-lg select-none">
      {/* Brand & EMS System Badge */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-wider text-slate-100 uppercase">
                {t('brandTitle')}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                {t('brandSubtitle')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {t('systemDescription')}
            </p>
          </div>
        </div>

        {/* Live WebSocket Connection Pill */}
        <div className="flex items-center space-x-2 pl-3 border-l border-slate-800">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono font-medium text-slate-300 flex items-center gap-1">
            <Radio className="w-3 h-3 text-slate-400" />
            {t('liveSync')}
          </span>
        </div>
      </div>

      {/* Real-Time Telemetry KPI Cards */}
      <div className="flex items-center space-x-3 font-tabular">
        {/* Makespan */}
        <div className="bg-[#1e293b]/70 border border-slate-800 rounded-md px-3 py-1.5 flex items-center space-x-2.5">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('makespan')}</div>
            <div className="text-sm font-semibold text-slate-100">
              {kpis ? `${kpis.totalMakespanHours}h` : '--'}
            </div>
          </div>
        </div>

        {/* SMT Line OEE */}
        <div className="bg-[#1e293b]/70 border border-slate-800 rounded-md px-3 py-1.5 flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('smtOee')}</div>
            <div className="text-sm font-semibold text-emerald-400">
              {kpis ? `${kpis.overallOeePercentage}%` : '--'}
            </div>
          </div>
        </div>

        {/* Feeder & Stencil Setup Ratio */}
        <div className="bg-[#1e293b]/70 border border-slate-800 rounded-md px-3 py-1.5 flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('setupRatio')}</div>
            <div className="text-sm font-semibold text-amber-400">
              {kpis ? `${kpis.setupRatioPercentage}%` : '--'}
            </div>
          </div>
        </div>

        {/* On-Time Delivery (IATF / ISO) */}
        <div className="bg-[#1e293b]/70 border border-slate-800 rounded-md px-3 py-1.5 flex items-center space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-sky-400" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('otdCompliance')}</div>
            <div className="text-sm font-semibold text-sky-400">
              {kpis ? `${kpis.onTimeDeliveryRatePercentage}%` : '--'}
            </div>
          </div>
        </div>

        {/* Delayed Orders */}
        <div
          className={`border rounded-md px-3 py-1.5 flex items-center space-x-2.5 ${
            (kpis?.delayedWorkOrdersCount ?? 0) > 0
              ? 'bg-rose-950/40 border-rose-800/80 text-rose-400'
              : 'bg-[#1e293b]/70 border-slate-800 text-slate-400'
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 ${
              (kpis?.delayedWorkOrdersCount ?? 0) > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'
            }`}
          />
          <div>
            <div className="text-[10px] uppercase tracking-wider">{t('delayedBatches')}</div>
            <div className="text-sm font-semibold">
              {kpis ? kpis.delayedWorkOrdersCount : '--'}
            </div>
          </div>
        </div>
      </div>

      {/* Language Switcher & Multi-User Bar */}
      <div className="flex items-center space-x-3 pl-4 border-l border-slate-800">
        {/* Language Selector Button Group */}
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5">
          <button
            onClick={() => setLanguage('tr')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
              language === 'tr'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Türkçe (Varsayılan)"
          >
            <span>🇹🇷</span>
            <span>TR</span>
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-all ${
              language === 'en'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="English (Optional)"
          >
            <span>🇬🇧</span>
            <span>EN</span>
          </button>
        </div>

        {/* Online Count */}
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <Users className="w-4 h-4 text-slate-400" />
          <span className="font-mono text-xs">{1 + peerList.length} {t('onlineUsers')}</span>
        </div>

        <div className="flex items-center -space-x-1.5">
          {/* Current User avatar */}
          <div
            className="w-7 h-7 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm relative group cursor-pointer"
            style={{ backgroundColor: activeLockUser.userColor }}
            title={`${t('you')}: ${activeLockUser.userName}`}
          >
            {activeLockUser.userName.substring(0, 2).toUpperCase()}
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border border-[#0f172a] rounded-full"></span>
          </div>

          {/* Connected Peers */}
          {peerList.map((peer) => (
            <div
              key={peer.userId}
              className="w-7 h-7 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-[10px] font-bold text-slate-900 shadow-sm relative group cursor-pointer"
              style={{ backgroundColor: peer.userColor }}
              title={`Peer: ${peer.userName}`}
            >
              {peer.userName.substring(0, 2).toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};
