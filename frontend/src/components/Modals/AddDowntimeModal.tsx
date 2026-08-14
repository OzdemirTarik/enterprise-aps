import React, { useState, useMemo } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import {
  Wrench,
  AlertTriangle,
  X,
  Clock,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
  Calendar,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { format, isValid } from 'date-fns';

export const AddDowntimeModal: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isAddDowntimeOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsAddDowntimeOpen);
  const resources = useScheduleStore((s) => s.resources);
  const operations = useScheduleStore((s) => s.operations);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const resourceList = Object.values(resources);
  const opList = Object.values(operations);

  // Form State
  const [resourceId, setResourceId] = useState<string>(resourceList[0]?.id || 'SMT-LINE-01');
  const [downtimeType, setDowntimeType] = useState<'PREVENTIVE' | 'BREAKDOWN' | 'CALIBRATION'>('PREVENTIVE');
  const [reason, setReason] = useState('SMT Şablon & Bıçak Otomatik Silme ve Macun Kontrolü');
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [isPlanned, setIsPlanned] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Exact Start Date/Time string (format: yyyy-MM-ddTHH:mm)
  const defaultStartTime = useMemo(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    return format(d, "yyyy-MM-dd'T'HH:mm");
  }, []);

  const [startDateTimeStr, setStartDateTimeStr] = useState<string>(defaultStartTime);

  // Calculated start and end Date objects
  const computedTimes = useMemo(() => {
    let start = new Date(startDateTimeStr);
    if (!isValid(start)) {
      start = new Date(Date.now() + 60 * 60 * 1000);
    }
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return {
      startTime: start,
      endTime: end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }, [startDateTimeStr, durationMinutes]);

  // Live Overlap Impact Preview
  const overlappingOps = useMemo(() => {
    if (!resourceId) return [];
    const startMs = computedTimes.startTime.getTime();
    const endMs = computedTimes.endTime.getTime();

    return opList.filter((op) => {
      if (op.requiredResourceId !== resourceId) return false;
      const opStart = new Date(op.plannedStartTime).getTime();
      const opEnd = new Date(op.plannedEndTime).getTime();
      // Overlap condition: opStart < endMs && opEnd > startMs
      return opStart < endMs && opEnd > startMs;
    });
  }, [opList, resourceId, computedTimes]);

  // Quick Preset Loader
  const loadPreset = (
    targetResourceId: string,
    presetReason: string,
    minutes: number,
    type: 'PREVENTIVE' | 'BREAKDOWN' | 'CALIBRATION',
    planned: boolean
  ) => {
    if (resources[targetResourceId]) {
      setResourceId(targetResourceId);
    }
    setReason(presetReason);
    setDurationMinutes(minutes);
    setDowntimeType(type);
    setIsPlanned(planned);
  };

  // Quick Start Time Adjuster
  const setQuickOffset = (minutesFromNow: number) => {
    const d = new Date(Date.now() + minutesFromNow * 60 * 1000);
    setStartDateTimeStr(format(d, "yyyy-MM-dd'T'HH:mm"));
  };

  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    setStartDateTimeStr(format(d, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceId || !reason) return;

    setIsSubmitting(true);
    try {
      await scheduleApi.createDowntime({
        resourceId,
        reason,
        startTime: computedTimes.startIso,
        endTime: computedTimes.endIso,
        isPlanned,
      });

      await fetchSchedule();
      setIsOpen(false);
    } catch (err: any) {
      alert(`Failed to add maintenance window: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150 select-none">
      <div className="w-[96vw] max-w-4xl h-[88vh] max-h-[820px] min-h-[560px] bg-slate-900 border border-amber-500/60 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('maintenanceTitle')}</span>
                <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-800 font-mono">
                  EMS Hat Yönetimi
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">{t('maintenanceDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs space-y-4">
          {/* Downtime Category Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              {t('maintenanceType')}
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDowntimeType('PREVENTIVE');
                  setIsPlanned(true);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  downtimeType === 'PREVENTIVE'
                    ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">{t('typePreventive')}</div>
                  <div className="text-[10px] text-slate-400">Şablon silme, cüruf temizliği</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDowntimeType('BREAKDOWN');
                  setIsPlanned(false);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  downtimeType === 'BREAKDOWN'
                    ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">{t('typeBreakdown')}</div>
                  <div className="text-[10px] text-slate-400">Feeder sıkışması, fırın arızası</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDowntimeType('CALIBRATION');
                  setIsPlanned(true);
                }}
                className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left ${
                  downtimeType === 'CALIBRATION'
                    ? 'bg-cyan-950/80 border-cyan-500/80 text-cyan-300 shadow-sm'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs">{t('typeCalibration')}</div>
                  <div className="text-[10px] text-slate-400">SPI 3D lazer, nozul vakum</div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Presets Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{t('maintenancePresets')}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    'SMT-LINE-01',
                    'SMT Şablon & Bıçak Otomatik Silme ve Macun Kontrolü',
                    15,
                    'PREVENTIVE',
                    true
                  )
                }
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-lg p-2 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px] truncate">
                  {t('tmplSqueegeeWipe')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">SMT-LINE-01 (15 dk)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    'SMT-LINE-02',
                    'SMT Nozul & Vakum Sensörü Otomatik Kalibrasyonu',
                    30,
                    'CALIBRATION',
                    true
                  )
                }
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-lg p-2 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px] truncate">
                  {t('tmplNozzleCalib')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">SMT-LINE-02 (30 dk)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    'THT-WAVE-01',
                    'Dalga Lehim Potası Cüruf Temizliği & Dalga Yüksekliği Doğrulama',
                    25,
                    'PREVENTIVE',
                    true
                  )
                }
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-lg p-2 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px] truncate">
                  {t('tmplWaveDross')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">THT-WAVE-01 (25 dk)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    'THT-SELECTIVE-01',
                    'Selektif Lehim Nozul Kalaylama & Azot (N2) Saflık Ayarı',
                    20,
                    'PREVENTIVE',
                    true
                  )
                }
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-lg p-2 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px] truncate">
                  {t('tmplSelectiveNozzle')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">THT-SELECTIVE-01 (20 dk)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    'SMT-LINE-01',
                    '10-Zone Reflow Fırını Filtre & Flux Tuzağı Tahliyesi',
                    45,
                    'PREVENTIVE',
                    true
                  )
                }
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-lg p-2 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px] truncate">
                  {t('tmplReflowFilter')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">SMT-LINE-01 (45 dk)</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    'ICT-SPEA-01',
                    'ICT Test İğne Yatak Temizliği & Yaylı Prob Kalibrasyonu',
                    20,
                    'CALIBRATION',
                    true
                  )
                }
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/60 rounded-lg p-2 text-left transition-all group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300 text-[11px] truncate">
                  {t('tmplIctFixture')}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">ICT-SPEA-01 (20 dk)</div>
              </button>
            </div>
          </div>

          {/* Form Fields: Target Station, Reason */}
          <form id="downtime-form" onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                  {t('targetCenter')}
                </label>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none text-xs"
                >
                  {resourceList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-slate-300 font-semibold mb-1 text-[11px]">
                  {t('maintenanceReason')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: SMT Besleyici ve Nozul Yıkama"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Time Configuration: Exact Datetime + Quick Offsets */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              {/* Start Time */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('startsInHours')}</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {format(computedTimes.startTime, 'dd.MM.yyyy HH:mm')}
                  </span>
                </div>

                <input
                  type="datetime-local"
                  required
                  value={startDateTimeStr}
                  onChange={(e) => setStartDateTimeStr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500"
                />

                {/* Quick Start Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-semibold">{t('quickOffsets')}</span>
                  <button
                    type="button"
                    onClick={() => setQuickOffset(30)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]"
                  >
                    +30 Dk
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickOffset(60)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]"
                  >
                    +1 Saat
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickOffset(120)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]"
                  >
                    +2 Saat
                  </button>
                  <button
                    type="button"
                    onClick={setTomorrowMorning}
                    className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]"
                  >
                    Yarın 08:00
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('durationMinutes')}</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-mono font-bold">
                    Bitiş: {format(computedTimes.endTime, 'HH:mm')} ({durationMinutes} dk)
                  </span>
                </div>

                <input
                  type="number"
                  min={5}
                  step={5}
                  max={1440}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500"
                />

                {/* Quick Duration Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[15, 20, 30, 45, 60, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                        durationMinutes === mins
                          ? 'bg-amber-600 text-slate-950 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {mins >= 60 ? `${mins / 60}s` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Schedule Impact Analysis Preview Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t('impactAnalysis')}</span>
                </span>
                <span
                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    overlappingOps.length > 0
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {overlappingOps.length} Çakışan Operasyon
                </span>
              </div>

              {overlappingOps.length === 0 ? (
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/40">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t('impactNoConflict')}</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-300">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong className="font-mono">{overlappingOps.length}</strong> {t('impactConflictCount')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {overlappingOps.map((op) => (
                      <span
                        key={op.id}
                        className="bg-slate-900 border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        <span className="font-bold">{op.workOrderNumber}:</span>
                        <span>{op.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Seçilen Aralık:</span>
            <span className="font-mono text-slate-200 font-bold">
              {format(computedTimes.startTime, 'dd.MM HH:mm')} ➔ {format(computedTimes.endTime, 'HH:mm')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              form="downtime-form"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-md shadow-amber-950 flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('scheduling') : t('reserveWindow')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
