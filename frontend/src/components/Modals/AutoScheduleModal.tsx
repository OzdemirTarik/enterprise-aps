import React, { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { scheduleApi } from '../../services/api';
import { Sparkles, X, Zap } from 'lucide-react';

export const AutoScheduleModal: React.FC = () => {
  const isOpen = useScheduleStore(state => state.isAutoScheduleOpen);
  const setIsOpen = useScheduleStore(state => state.setIsAutoScheduleOpen);
  const mergeScheduleDelta = useScheduleStore(state => state.mergeScheduleDelta);
  const fetchSchedule = useScheduleStore(state => state.fetchSchedule);

  const [strategy, setStrategy] = useState('HEURISTIC_SPT_EDD');
  const [isOptimizing, setIsOptimizing] = useState(false);

  if (!isOpen) return null;

  const strategies = [
    {
      id: 'HEURISTIC_SPT_EDD',
      title: 'SPT-EDD Balance (Recommended)',
      desc: 'Shortest Processing Time + Earliest Due Date. Minimizes total makespan and prevents late customer deliveries.',
      badge: 'Balanced'
    },
    {
      id: 'MINIMAL_SETUP',
      title: 'Sequence Setup Minimization',
      desc: 'Clustering identical product families (Titanium, PEEK, Ceramics) to reduce tool changeover downtime by up to 40%.',
      badge: 'Efficiency'
    },
    {
      id: 'CRITICAL_RATIO',
      title: 'Critical Ratio Bottleneck Pacing',
      desc: 'Dynamically prioritizes operations on bottleneck resources (5-Axis CNC & SMT lines) to eliminate queue starvation.',
      badge: 'Throughput'
    }
  ];

  const handleExecute = async () => {
    try {
      setIsOptimizing(true);
      const delta = await scheduleApi.optimizeSchedule(strategy);
      mergeScheduleDelta(delta);
      await fetchSchedule();
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to run AI schedule optimizer', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-[500px] overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-[#141e33] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                In-Memory Heuristic Optimization
              </h3>
              <p className="text-[11px] text-slate-400">
                Sub-millisecond global schedule recalculation
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-slate-300">
            Select the optimization strategy to recalculate operation sequences across all work centers:
          </div>

          <div className="space-y-2.5">
            {strategies.map(s => {
              const isSelected = strategy === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950'
                      : 'bg-[#1e293b]/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">
                      {s.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                      {s.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#141e33] border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecute}
            disabled={isOptimizing}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/30 flex items-center space-x-1.5 transition-all"
          >
            <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'Recalculating...' : 'Run Optimization'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
