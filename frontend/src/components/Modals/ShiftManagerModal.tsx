import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { ShiftSchedule } from '../../types/schedule';
import { Clock, Sparkles, Plus, Trash2, Save, X, Calendar, Check } from 'lucide-react';

const DAY_LABELS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ShiftManagerModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isShiftManagerOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsShiftManagerOpen);
  const shiftsFromStore = useScheduleStore((s) => s.shifts);
  const updateShiftPattern = useScheduleStore((s) => s.updateShiftPattern);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [localShifts, setLocalShifts] = useState<ShiftSchedule[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const dayLabels = language === 'tr' ? DAY_LABELS_TR : DAY_LABELS_EN;

  const loadPreset = (preset: 'THREE_SHIFTS' | 'TWO_SHIFTS' | 'SINGLE_SHIFT' | 'TWO_12_SHIFTS') => {
    if (preset === 'THREE_SHIFTS') {
      setLocalShifts([
        {
          id: 'SHIFT-01',
          name: language === 'tr' ? '1. Vardiya (Gündüz)' : 'Shift 1 (Morning)',
          startTime: '08:00',
          endTime: '16:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          colorCode: '#06b6d4',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 'SHIFT-02',
          name: language === 'tr' ? '2. Vardiya (Akşam)' : 'Shift 2 (Evening)',
          startTime: '16:00',
          endTime: '00:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          colorCode: '#f59e0b',
          isActive: true,
          displayOrder: 2,
        },
        {
          id: 'SHIFT-03',
          name: language === 'tr' ? '3. Vardiya (Gece)' : 'Shift 3 (Night)',
          startTime: '00:00',
          endTime: '08:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          colorCode: '#8b5cf6',
          isActive: true,
          displayOrder: 3,
        },
      ]);
    } else if (preset === 'TWO_SHIFTS') {
      setLocalShifts([
        {
          id: 'SHIFT-01',
          name: language === 'tr' ? '1. Vardiya (Gündüz)' : 'Shift 1 (Day)',
          startTime: '08:00',
          endTime: '16:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          colorCode: '#06b6d4',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 'SHIFT-02',
          name: language === 'tr' ? '2. Vardiya (Akşam)' : 'Shift 2 (Evening)',
          startTime: '16:00',
          endTime: '00:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6],
          colorCode: '#f59e0b',
          isActive: true,
          displayOrder: 2,
        },
      ]);
    } else if (preset === 'SINGLE_SHIFT') {
      setLocalShifts([
        {
          id: 'SHIFT-01',
          name: language === 'tr' ? 'Tek Vardiya (Standart Mesai)' : 'Single Shift (Standard)',
          startTime: '08:00',
          endTime: '17:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          colorCode: '#06b6d4',
          isActive: true,
          displayOrder: 1,
        },
      ]);
    } else if (preset === 'TWO_12_SHIFTS') {
      setLocalShifts([
        {
          id: 'SHIFT-01',
          name: language === 'tr' ? '1. Vardiya (Gündüz 12S)' : 'Shift 1 (Day 12h)',
          startTime: '08:00',
          endTime: '20:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          colorCode: '#06b6d4',
          isActive: true,
          displayOrder: 1,
        },
        {
          id: 'SHIFT-02',
          name: language === 'tr' ? '2. Vardiya (Gece 12S)' : 'Shift 2 (Night 12h)',
          startTime: '20:00',
          endTime: '08:00',
          daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
          colorCode: '#8b5cf6',
          isActive: true,
          displayOrder: 2,
        },
      ]);
    }
  };

  useEffect(() => {
    if (shiftsFromStore && shiftsFromStore.length > 0) {
      setLocalShifts(JSON.parse(JSON.stringify(shiftsFromStore)));
    } else {
      loadPreset('THREE_SHIFTS');
    }
  }, [shiftsFromStore, isOpen]);

  const handleAddShift = () => {
    const nextOrder = localShifts.length + 1;
    setLocalShifts([
      ...localShifts,
      {
        id: `SHIFT-0${nextOrder}`,
        name: language === 'tr' ? `${nextOrder}. Vardiya` : `Shift ${nextOrder}`,
        startTime: '08:00',
        endTime: '16:00',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        colorCode: '#06b6d4',
        isActive: true,
        displayOrder: nextOrder,
      },
    ]);
  };

  const handleRemoveShift = (idx: number) => {
    if (localShifts.length <= 1) return;
    setLocalShifts(localShifts.filter((_, i) => i !== idx));
  };

  const handleShiftChange = (idx: number, field: keyof ShiftSchedule, value: any) => {
    const updated = [...localShifts];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalShifts(updated);
  };

  const handleToggleDay = (shiftIdx: number, dayNumber: number) => {
    const shift = localShifts[shiftIdx];
    const currentDays = shift.daysOfWeek || [1, 2, 3, 4, 5, 6, 7];
    const newDays = currentDays.includes(dayNumber)
      ? currentDays.filter((d) => d !== dayNumber)
      : [...currentDays, dayNumber].sort();

    handleShiftChange(shiftIdx, 'daysOfWeek', newDays.length > 0 ? newDays : [dayNumber]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateShiftPattern(localShifts);
      await fetchSchedule();
      setFeedbackMsg(t('shiftsSavedSuccess'));
      setTimeout(() => {
        setFeedbackMsg(null);
        setIsOpen(false);
      }, 1000);
    } catch (err: any) {
      alert(`Failed to save shifts: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('shiftManagerTitle')}</h2>
              <p className="text-xs text-slate-400">{t('shiftManagerDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Quick Presets */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('shiftPresets')}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => loadPreset('THREE_SHIFTS')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200">
                  {t('presetThreeShifts')}
                </div>
                <div className="text-[10px] text-slate-400">{t('presetThreeShiftsDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('TWO_SHIFTS')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-amber-300 group-hover:text-amber-200">
                  {t('presetTwoShifts')}
                </div>
                <div className="text-[10px] text-slate-400">{t('presetTwoShiftsDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('SINGLE_SHIFT')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-emerald-300 group-hover:text-emerald-200">
                  {t('presetSingleShift')}
                </div>
                <div className="text-[10px] text-slate-400">{t('presetSingleShiftDesc')}</div>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('TWO_12_SHIFTS')}
                className="bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-purple-300 group-hover:text-purple-200">
                  {t('presetTwo12Shifts')}
                </div>
                <div className="text-[10px] text-slate-400">{t('presetTwo12ShiftsDesc')}</div>
              </button>
            </div>
          </div>

          {/* Shift Rows */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('customShifts')} ({localShifts.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddShift}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded px-2.5 py-1 font-semibold flex items-center gap-1 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addShift')}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {localShifts.map((shift, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Shift Number Badge */}
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[10px] text-slate-950 shrink-0"
                      style={{ backgroundColor: shift.colorCode || '#06b6d4' }}
                    >
                      {idx + 1}
                    </span>

                    {/* Name input */}
                    <input
                      type="text"
                      required
                      placeholder={t('shiftName')}
                      value={shift.name}
                      onChange={(e) => handleShiftChange(idx, 'name', e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:border-cyan-500 font-medium"
                    />

                    {/* Start Time */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[11px] font-mono">{t('startTime')}:</span>
                      <input
                        type="time"
                        required
                        value={shift.startTime}
                        onChange={(e) => handleShiftChange(idx, 'startTime', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-center"
                      />
                    </div>

                    {/* End Time */}
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-[11px] font-mono">{t('endTime')}:</span>
                      <input
                        type="time"
                        required
                        value={shift.endTime}
                        onChange={(e) => handleShiftChange(idx, 'endTime', e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-center"
                      />
                    </div>

                    {/* Color Picker */}
                    <input
                      type="color"
                      value={shift.colorCode}
                      onChange={(e) => handleShiftChange(idx, 'colorCode', e.target.value)}
                      className="w-7 h-7 bg-transparent border-0 cursor-pointer rounded shrink-0"
                      title={t('shiftColor')}
                    />

                    {/* Delete Shift */}
                    {localShifts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveShift(idx)}
                        className="text-red-400 hover:text-red-300 p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Active Days Checkboxes */}
                  <div className="flex items-center gap-2 pl-7">
                    <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                      {t('activeDays')}:
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((dayNum, dayIdx) => {
                        const isDayActive = (shift.daysOfWeek || []).includes(dayNum);
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => handleToggleDay(idx, dayNum)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                              isDayActive
                                ? 'bg-cyan-600 text-white shadow-sm'
                                : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                            }`}
                          >
                            {dayLabels[dayIdx]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback message */}
          {feedbackMsg && (
            <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 flex items-center gap-2 text-xs">
              <Check className="w-4 h-4" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-md font-semibold text-xs"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-md text-xs transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? t('savingShifts') : t('saveShiftPattern')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
