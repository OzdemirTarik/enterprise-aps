import React, { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import { Sparkles, X, Zap } from 'lucide-react';

export const AutoScheduleModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useScheduleStore((state) => state.isAutoScheduleOpen);
  const setIsOpen = useScheduleStore((state) => state.setIsAutoScheduleOpen);
  const mergeScheduleDelta = useScheduleStore((state) => state.mergeScheduleDelta);
  const fetchSchedule = useScheduleStore((state) => state.fetchSchedule);

  const [strategy, setStrategy] = useState('HEURISTIC_SPT_EDD');
  const [isOptimizing, setIsOptimizing] = useState(false);

  if (!isOpen) return null;

  const strategies = language === 'tr' ? [
    {
      id: 'HEURISTIC_SPT_EDD',
      title: 'SPT-EDD Hibrit Dengeli Çizelgeleme (Önerilen)',
      desc: 'En Kısa İşlem Süresi + En Erken Teslim Tarihi. Toplam süreyi (makespan) minimize eder ve müşteri gecikmelerini önler.',
      badge: 'Dengeli'
    },
    {
      id: 'MINIMAL_SETUP',
      title: 'Besleyici & Hat Değişimlerini Minimize Et',
      desc: 'Aynı ürün ailelerini ve lehim alaşımlarını gruplayarak kartuş/kalıp değişim süresini %40 azaltır.',
      badge: 'Verimlilik'
    },
    {
      id: 'CRITICAL_RATIO',
      title: 'Kritik Oran & Darboğaz Önceliklendirmesi',
      desc: 'SMT hatları ve seçici lehimleme gibi darboğaz istasyonları besleyerek kuyruk tıkanmalarını giderir.',
      badge: 'Kapasite'
    }
  ] : [
    {
      id: 'HEURISTIC_SPT_EDD',
      title: 'SPT-EDD Balance (Recommended)',
      desc: 'Shortest Processing Time + Earliest Due Date. Minimizes total makespan and prevents late customer deliveries.',
      badge: 'Balanced'
    },
    {
      id: 'MINIMAL_SETUP',
      title: 'Sequence Setup Minimization',
      desc: 'Clustering identical product families to reduce feeder & solder changeover downtime by up to 40%.',
      badge: 'Efficiency'
    },
    {
      id: 'CRITICAL_RATIO',
      title: 'Critical Ratio Bottleneck Pacing',
      desc: 'Dynamically prioritizes operations on bottleneck resources (SMT lines & Selective Solder) to eliminate queue starvation.',
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
      <div className="bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl w-[520px] overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-[#141e33] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                {t('autoScheduleTitle')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('autoScheduleDesc')}
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
            {language === 'tr'
              ? 'Tüm EMS iş merkezlerinde operasyon sıralamasını yeniden hesaplamak için optimizasyon stratejisini seçin:'
              : 'Select the optimization strategy to recalculate operation sequences across all EMS work centers:'}
          </div>

          <div className="space-y-2.5">
            {strategies.map((s) => {
              const isSelected = strategy === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setStrategy(s.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                      : 'bg-[#1e293b]/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-200">
                      {s.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
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
            {t('cancel')}
          </button>
          <button
            onClick={handleExecute}
            disabled={isOptimizing}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30 flex items-center space-x-1.5 transition-all"
          >
            <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? t('optimizing') : t('runOptimizer')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
