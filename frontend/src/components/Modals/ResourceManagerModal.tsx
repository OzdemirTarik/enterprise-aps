import React, { useState, useMemo } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import {
  Cpu,
  RefreshCw,
  Trash2,
  Plus,
  X,
  Edit2,
  FlaskConical,
  Wrench,
  Sparkles,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Resource, SetupMatrixItem, ResourceDowntime } from '../../types/schedule';

export const ResourceManagerModal: React.FC = () => {
  const { t, language } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isResourceManagerOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsResourceManagerOpen);
  const resources = useScheduleStore((s) => s.resources);
  const operations = useScheduleStore((s) => s.operations);
  const setupMatrices = useScheduleStore((s) => s.setupMatrices);
  const downtimes = useScheduleStore((s) => s.downtimes);
  const deleteResource = useScheduleStore((s) => s.deleteResource);
  const updateResource = useScheduleStore((s) => s.updateResource);
  const deleteDowntime = useScheduleStore((s) => s.deleteDowntime);
  const updateDowntime = useScheduleStore((s) => s.updateDowntime);
  const setIsAddDowntimeOpen = useScheduleStore((s) => s.setIsAddDowntimeOpen);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [activeTab, setActiveTab] = useState<'centers' | 'matrix' | 'alloys' | 'maintenance'>('centers');
  const [centerCategory, setCenterCategory] = useState<'ALL' | 'SMT' | 'THT' | 'TEST' | 'COAT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddCenterOpen, setIsAddCenterOpen] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Downtime Form State
  const [editingDowntimeId, setEditingDowntimeId] = useState<string | null>(null);
  const [editDtResourceId, setEditDtResourceId] = useState('');
  const [editDtReason, setEditDtReason] = useState('');
  const [editDtStartTime, setEditDtStartTime] = useState('');
  const [editDtEndTime, setEditDtEndTime] = useState('');
  const [editDtIsPlanned, setEditDtIsPlanned] = useState(true);
  const [confirmDeleteDtId, setConfirmDeleteDtId] = useState<string | null>(null);

  // New Work Center Form State
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState('SmtLine');
  const [newHours, setNewHours] = useState(24);
  const [newRate, setNewRate] = useState(350);
  const [newColor, setNewColor] = useState('#06b6d4');
  const [isSubmittingCenter, setIsSubmittingCenter] = useState(false);

  // Edit Work Center Form State
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editType, setEditType] = useState('');
  const [editHours, setEditHours] = useState(24);
  const [editRate, setEditRate] = useState(350);
  const [editColor, setEditColor] = useState('#06b6d4');
  const [editIsActive, setEditIsActive] = useState(true);

  // Setup Matrix Form State
  const [matrixFrom, setMatrixFrom] = useState('Automotive-ECU');
  const [matrixTo, setMatrixTo] = useState('IoT-Gateway');
  const [matrixMinutes, setMatrixMinutes] = useState(45);
  const [matrixResourceId, setMatrixResourceId] = useState<string>('GLOBAL');
  const [matrixCellEdit, setMatrixCellEdit] = useState<{ from: string; to: string; minutes: number } | null>(null);

  const resourceList = Object.values(resources);
  const opList = Object.values(operations);
  const downtimeList = Object.values(downtimes);

  // Product Families for 2D Matrix
  const productFamilies = [
    'Automotive-ECU',
    'IoT-Gateway',
    'Medical-Monitor',
    'Industrial-Power',
    'Aerospace-Telemetry',
    'SAC305-LeadFree',
    'SnPb-Leaded',
    'FinePitch-0.10mm',
    'Standard-0.15mm',
  ];

  // Filtered Resources
  const filteredResources = useMemo(() => {
    return resourceList.filter((r) => {
      if (centerCategory === 'SMT' && !r.id.startsWith('SMT') && r.type !== 'SmtLine') return false;
      if (centerCategory === 'THT' && !r.id.startsWith('THT') && !r.type.includes('Tht')) return false;
      if (centerCategory === 'TEST' && !r.id.startsWith('ICT') && !r.id.startsWith('FCT') && !r.type.includes('Test')) return false;
      if (centerCategory === 'COAT' && !r.id.startsWith('COAT') && !r.id.startsWith('DEPANEL')) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [resourceList, centerCategory, searchQuery]);

  // Create Work Center
  const handleCreateCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;

    setIsSubmittingCenter(true);
    try {
      await scheduleApi.createResource({
        name: newName,
        code: newCode,
        type: newType,
        capacity: 1.0,
        workingHoursPerDay: Number(newHours),
        hourlyRate: Number(newRate),
        colorHex: newColor,
      });
      await fetchSchedule();
      setNewName('');
      setNewCode('');
      setIsAddCenterOpen(false);
      setSuccessMsg(language === 'tr' ? 'Yeni EMS iş merkezi başarıyla oluşturuldu!' : 'New EMS work center created!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to create EMS work center: ${err.message}`);
    } finally {
      setIsSubmittingCenter(false);
    }
  };

  // Start Editing Work Center
  const handleStartEdit = (res: Resource) => {
    setEditingResourceId(res.id);
    setEditName(res.name);
    setEditCode(res.code);
    setEditType(res.type);
    setEditHours(res.workingHoursPerDay);
    setEditRate(res.hourlyRate);
    setEditColor(res.colorHex || '#06b6d4');
    setEditIsActive(res.isActive ?? true);
  };

  // Save Edited Work Center
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResourceId) return;

    try {
      await updateResource(editingResourceId, {
        name: editName,
        code: editCode,
        type: editType,
        capacity: 1.0,
        workingHoursPerDay: Number(editHours),
        hourlyRate: Number(editRate),
        colorHex: editColor,
        isActive: editIsActive,
      });
      await fetchSchedule();
      setEditingResourceId(null);
      setSuccessMsg(language === 'tr' ? 'İş merkezi bilgileri güncellendi!' : 'Work center updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to update resource: ${err.message}`);
    }
  };

  // Delete Work Center
  const handleDeleteCenter = async (resId: string) => {
    try {
      await deleteResource(resId);
      await fetchSchedule();
      setConfirmDeleteId(null);
      setSuccessMsg(language === 'tr' ? 'İş merkezi silindi.' : 'Work center deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to delete resource: ${err.message}`);
    }
  };

  // Save / Update Setup Matrix Rule
  const handleSaveMatrixRule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await scheduleApi.updateSetupMatrix({
        resourceId: matrixResourceId === 'GLOBAL' ? null : matrixResourceId,
        fromProductType: matrixFrom,
        toProductType: matrixTo,
        setupMinutes: Number(matrixMinutes),
      });
      await fetchSchedule();
      setMatrixCellEdit(null);
      setSuccessMsg(language === 'tr' ? 'Değişim kuralı başarıyla kaydedildi!' : 'Changeover rule saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to update setup matrix: ${err.message}`);
    }
  };

  // Apply 2D Matrix Cell Quick Edit
  const handleApplyCellEdit = async () => {
    if (!matrixCellEdit) return;
    try {
      await scheduleApi.updateSetupMatrix({
        resourceId: null,
        fromProductType: matrixCellEdit.from,
        toProductType: matrixCellEdit.to,
        setupMinutes: Number(matrixCellEdit.minutes),
      });
      await fetchSchedule();
      setMatrixCellEdit(null);
      setSuccessMsg(`${matrixCellEdit.from} ➔ ${matrixCellEdit.to}: ${matrixCellEdit.minutes}m kaydedildi.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to update cell: ${err.message}`);
    }
  };

  // Delete / Reset Setup Matrix Rule
  const handleDeleteMatrixRule = async (rule: SetupMatrixItem) => {
    try {
      await scheduleApi.updateSetupMatrix({
        resourceId: rule.resourceId,
        fromProductType: rule.fromProductType,
        toProductType: rule.toProductType,
        setupMinutes: 0,
      });
      await fetchSchedule();
      setSuccessMsg(language === 'tr' ? 'Değişim kuralı sıfırlandı / silindi.' : 'Rule reset / deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to reset rule: ${err.message}`);
    }
  };

  // Downtime Actions
  const handleStartEditDowntime = (dt: ResourceDowntime) => {
    setEditingDowntimeId(dt.id);
    setEditDtResourceId(dt.resourceId);
    setEditDtReason(dt.reason);
    setEditDtStartTime(
      isValid(new Date(dt.startTime)) ? format(new Date(dt.startTime), "yyyy-MM-dd'T'HH:mm") : ''
    );
    setEditDtEndTime(
      isValid(new Date(dt.endTime)) ? format(new Date(dt.endTime), "yyyy-MM-dd'T'HH:mm") : ''
    );
    setEditDtIsPlanned(dt.isPlanned ?? true);
  };

  const handleSaveEditDowntime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDowntimeId || !editDtResourceId || !editDtStartTime || !editDtEndTime) return;

    try {
      await updateDowntime(editingDowntimeId, {
        resourceId: editDtResourceId,
        reason: editDtReason,
        startTime: new Date(editDtStartTime).toISOString(),
        endTime: new Date(editDtEndTime).toISOString(),
        isPlanned: editDtIsPlanned,
      });
      await fetchSchedule();
      setEditingDowntimeId(null);
      setSuccessMsg(t('downtimeUpdatedSuccess'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to update downtime: ${err.message}`);
    }
  };

  const handleDeleteDowntime = async (dtId: string) => {
    try {
      await deleteDowntime(dtId);
      await fetchSchedule();
      setConfirmDeleteDtId(null);
      setSuccessMsg(t('downtimeDeletedSuccess'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to delete downtime: ${err.message}`);
    }
  };

  // Standard EMS Alloy Presets
  const applyAlloyPresets = async () => {
    const presets = [
      { from: 'RoHS-SAC305', to: 'Sn63Pb37-Leaded', minutes: 30 },
      { from: 'Sn63Pb37-Leaded', to: 'RoHS-SAC305', minutes: 60 },
      { from: 'FinePitch-0.10mm', to: 'Standard-0.15mm', minutes: 25 },
      { from: 'Standard-0.15mm', to: 'FinePitch-0.10mm', minutes: 35 },
      { from: 'HighTemp-SAC387', to: 'LowTemp-Bi58Sn42', minutes: 45 },
      { from: 'LowTemp-Bi58Sn42', to: 'HighTemp-SAC387', minutes: 45 },
      { from: 'Automotive-ECU', to: 'Aerospace-Telemetry', minutes: 50 },
      { from: 'IoT-Gateway', to: 'Medical-Monitor', minutes: 40 },
    ];

    try {
      for (const p of presets) {
        await scheduleApi.updateSetupMatrix({
          resourceId: null,
          fromProductType: p.from,
          toProductType: p.to,
          setupMinutes: p.minutes,
        });
      }
      await fetchSchedule();
      setSuccessMsg(t('rulesAppliedSuccess'));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(`Failed to apply alloy presets: ${err.message}`);
    }
  };

  // Find penalty in setupMatrices
  const getMatrixMinutes = (from: string, to: string) => {
    if (from === to) return 0;
    const rule = setupMatrices.find((s) => s.fromProductType === from && s.toProductType === to);
    return rule ? rule.setupMinutes : null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150 select-none">
      <div className="w-[96vw] max-w-6xl h-[88vh] max-h-[850px] min-h-[580px] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{t('resourceModalTitle')}</span>
                <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30 font-mono">
                  {resourceList.length} İstasyon | {setupMatrices.length} Kural
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">{t('resourceModalDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4-Tab Navigation Bar */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/70 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('centers')}
            className={`py-2.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'centers'
                ? 'border-cyan-500 text-cyan-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{t('tabCenters')} ({resourceList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-2.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-cyan-500 text-cyan-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('tabMatrix')} ({setupMatrices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('alloys')}
            className={`py-2.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'alloys'
                ? 'border-cyan-500 text-cyan-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{t('tabAlloys')}</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-2.5 px-4 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'maintenance'
                ? 'border-cyan-500 text-cyan-400 font-bold bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{t('tabMaintenanceOverview')} ({downtimeList.length})</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mx-5 mt-2 p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 text-xs space-y-3">
          {/* ========================================================= */}
          {/* TAB 1: EMS İŞ MERKEZLERİ & HATLAR                        */}
          {/* ========================================================= */}
          {activeTab === 'centers' && (
            <div className="space-y-3">
              {/* Category Filter & Add Work Center Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  {[
                    { id: 'ALL', label: 'Tüm Merkezler' },
                    { id: 'SMT', label: 'SMT Hatları' },
                    { id: 'THT', label: 'THT Lehim' },
                    { id: 'TEST', label: 'Test & Kontrol' },
                    { id: 'COAT', label: 'Kaplama & Router' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCenterCategory(cat.id as any)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                        centerCategory === cat.id
                          ? 'bg-cyan-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Hat veya istasyon ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none w-48"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddCenterOpen(!isAddCenterOpen)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-1 rounded-lg text-[11px] flex items-center gap-1.5 shadow-sm shadow-cyan-950 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addNewCenter')}</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Add New Work Center Form */}
              {isAddCenterOpen && (
                <form
                  onSubmit={handleCreateCenter}
                  className="bg-slate-950 p-3 rounded-lg border border-cyan-500/50 space-y-2.5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t('addNewCenter')}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddCenterOpen(false)}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-6 gap-2.5">
                    <div className="col-span-2">
                      <label className="block text-slate-400 mb-0.5 text-[11px]">{t('centerName')}</label>
                      <input
                        type="text"
                        required
                        placeholder="SMT Line 03 (ASM SIPLACE SX)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-0.5 text-[11px]">{t('centerCode')}</label>
                      <input
                        type="text"
                        required
                        placeholder="SMT-03"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-0.5 text-[11px]">{t('equipmentClass')}</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 text-[11px]"
                      >
                        <option value="SmtLine">SMT Line (Dizgi & Reflow)</option>
                        <option value="ThtWaveSoldering">THT Dalga Lehim (Wave)</option>
                        <option value="ThtSelectiveSoldering">THT Selektif Lehim</option>
                        <option value="InCircuitTesting">ICT Test (Bed-of-Nails)</option>
                        <option value="FunctionalTesting">FCT Test & Flash</option>
                        <option value="ConformalCoating">Konformal Nem Kaplama</option>
                        <option value="DepanelingRouter">CNC Depaneling Router</option>
                        <option value="ManualAssembly">Manuel Montaj & Box-Build</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-0.5 text-[11px]">{t('operatingHours')}</label>
                      <input
                        type="number"
                        min={8}
                        max={24}
                        value={newHours}
                        onChange={(e) => setNewHours(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-0.5 text-[11px]">{t('hourlyRate')}</label>
                      <input
                        type="number"
                        min={10}
                        value={newRate}
                        onChange={(e) => setNewRate(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                    <div className="flex items-center gap-2">
                      <label className="text-slate-400 text-[11px]">{t('accentColor')}:</label>
                      <input
                        type="color"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        className="w-6 h-6 bg-transparent border-0 cursor-pointer rounded"
                      />
                      <span className="text-slate-300 font-mono text-[11px]">{newColor}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddCenterOpen(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded text-xs"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingCenter}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1 rounded text-xs shadow-md shadow-cyan-950"
                      >
                        {t('addCenterBtn')}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Work Centers Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
                    <tr>
                      <th className="p-2.5 w-12 text-center">{t('tableColor')}</th>
                      <th className="p-2.5">{t('tableName')}</th>
                      <th className="p-2.5">{t('tableCode')}</th>
                      <th className="p-2.5">{t('tableType')}</th>
                      <th className="p-2.5">{t('operatingHours')}</th>
                      <th className="p-2.5">{t('hourlyRate')}</th>
                      <th className="p-2.5 w-36">{t('utilization')}</th>
                      <th className="p-2.5 text-center">{t('assignedOps')}</th>
                      <th className="p-2.5 text-right">{t('tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredResources.map((r) => {
                      const resOps = opList.filter((o) => o.requiredResourceId === r.id);
                      const busyMinutes = resOps.reduce((sum, o) => sum + o.durationMinutes + o.setupDurationMinutes, 0);
                      const totalCapMinutes = r.workingHoursPerDay * 60;
                      const utilPercent = Math.min(100, Math.round((busyMinutes / Math.max(1, totalCapMinutes)) * 100));

                      const isEditing = editingResourceId === r.id;
                      const isConfirmingDelete = confirmDeleteId === r.id;

                      if (isEditing) {
                        return (
                          <tr key={r.id} className="bg-slate-900/90 border-cyan-500/50">
                            <td colSpan={9} className="p-3">
                              <form onSubmit={handleSaveEdit} className="space-y-2.5">
                                <div className="flex items-center justify-between text-cyan-300 font-bold text-xs pb-1 border-b border-slate-800">
                                  <span>{t('editCenter')}: {r.code}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {r.id}</span>
                                </div>
                                <div className="grid grid-cols-6 gap-2">
                                  <div className="col-span-2">
                                    <label className="text-[10px] text-slate-400 block mb-0.5">{t('centerName')}</label>
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-cyan-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">{t('centerCode')}</label>
                                    <input
                                      type="text"
                                      value={editCode}
                                      onChange={(e) => setEditCode(e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:border-cyan-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">{t('tableHours')}</label>
                                    <input
                                      type="number"
                                      value={editHours}
                                      onChange={(e) => setEditHours(Number(e.target.value))}
                                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-400 block mb-0.5">{t('hourlyRate')}</label>
                                    <input
                                      type="number"
                                      value={editRate}
                                      onChange={(e) => setEditRate(Number(e.target.value))}
                                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pt-3">
                                    <input
                                      type="color"
                                      value={editColor}
                                      onChange={(e) => setEditColor(e.target.value)}
                                      className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                                    />
                                    <label className="flex items-center gap-1 text-[11px] text-slate-300">
                                      <input
                                        type="checkbox"
                                        checked={editIsActive}
                                        onChange={(e) => setEditIsActive(e.target.checked)}
                                        className="rounded border-slate-700"
                                      />
                                      <span>{t('statusActive')}</span>
                                    </label>
                                  </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => setEditingResourceId(null)}
                                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs"
                                  >
                                    {t('cancel')}
                                  </button>
                                  <button
                                    type="submit"
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-1 rounded text-xs shadow-sm"
                                  >
                                    {t('saveChanges')}
                                  </button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 text-center">
                            <span
                              className="inline-block w-3.5 h-3.5 rounded-full shadow-sm"
                              style={{ backgroundColor: r.colorHex || '#38bdf8' }}
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-slate-200">
                            <div className="flex items-center gap-1.5">
                              <span>{r.name}</span>
                              {r.isActive === false && (
                                <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1 rounded">
                                  {t('statusInactive')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-cyan-300">{r.code}</td>
                          <td className="p-2.5 text-slate-400">{r.type}</td>
                          <td className="p-2.5 text-slate-300 font-mono">{r.workingHoursPerDay}h/gün</td>
                          <td className="p-2.5 text-slate-300 font-mono">${r.hourlyRate}/h</td>
                          <td className="p-2.5">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    utilPercent > 85
                                      ? 'bg-rose-500'
                                      : utilPercent > 50
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${utilPercent}%` }}
                                />
                              </div>
                              <span
                                className={`text-[10px] font-mono shrink-0 w-8 text-right font-bold ${
                                  utilPercent > 85 ? 'text-rose-400' : 'text-slate-400'
                                }`}
                              >
                                {utilPercent}%
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-mono text-cyan-300 font-bold">
                            {resOps.length}
                          </td>
                          <td className="p-2.5 text-right">
                            {!isConfirmingDelete ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(r)}
                                  className="text-slate-400 hover:text-cyan-300 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title={t('editCenter')}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(r.id)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 animate-in fade-in">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCenter(r.id)}
                                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded text-[10px]"
                                >
                                  Sil
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]"
                                >
                                  Vazgeç
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 2D İNTERAKTİF DEĞİŞİM MATRİSİ IZGARASI             */}
          {/* ========================================================= */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              {/* Header & Add Rule Bar */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('matrix2DTitle')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{t('matrix2DDesc')}</p>
                </div>

                {/* Inline Add/Update Rule */}
                <form onSubmit={handleSaveMatrixRule} className="flex items-center gap-2 text-[11px]">
                  <select
                    value={matrixFrom}
                    onChange={(e) => setMatrixFrom(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500"
                  >
                    {productFamilies.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  <span className="text-slate-500 font-bold">➔</span>

                  <select
                    value={matrixTo}
                    onChange={(e) => setMatrixTo(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500"
                  >
                    {productFamilies.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>

                  <select
                    value={matrixResourceId}
                    onChange={(e) => setMatrixResourceId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 font-mono text-[10px]"
                  >
                    <option value="GLOBAL">{t('globalRule')}</option>
                    {resourceList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.code} ({r.name})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={matrixMinutes}
                      onChange={(e) => setMatrixMinutes(Number(e.target.value))}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300 font-mono text-center"
                    />
                    <span className="text-slate-400">dk</span>
                  </div>

                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded text-[11px] shadow-sm"
                  >
                    {t('saveRule')}
                  </button>
                </form>
              </div>

              {/* 2D Cross-Table Grid */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/80 shadow-md">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px]">
                      <th className="p-2 text-left bg-slate-950 border-r border-slate-800 font-bold uppercase tracking-wider text-cyan-400">
                        KAYNAK ➔ HEDEF
                      </th>
                      {productFamilies.map((col) => (
                        <th key={col} className="p-2 border-r border-slate-800/60 font-mono font-semibold truncate max-w-[100px]">
                          {col.split('-')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {productFamilies.map((row) => (
                      <tr key={row} className="hover:bg-slate-900/50">
                        <td className="p-2 text-left font-sans font-semibold text-slate-300 bg-slate-950/90 border-r border-slate-800 whitespace-nowrap">
                          {row}
                        </td>
                        {productFamilies.map((col) => {
                          const isSame = row === col;
                          const minutes = getMatrixMinutes(row, col);

                          const getCellColor = () => {
                            if (isSame) return 'bg-slate-900/40 text-slate-600 cursor-default';
                            if (minutes === null) return 'bg-transparent text-slate-600 hover:bg-slate-800 cursor-pointer';
                            if (minutes >= 60) return 'bg-rose-950/80 text-rose-300 font-bold border border-rose-700/50 hover:bg-rose-900 cursor-pointer shadow-sm';
                            if (minutes >= 30) return 'bg-amber-950/80 text-amber-300 font-bold border border-amber-700/50 hover:bg-amber-900 cursor-pointer shadow-sm';
                            return 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900 cursor-pointer';
                          };

                          return (
                            <td
                              key={col}
                              onClick={() => {
                                if (!isSame) {
                                  setMatrixCellEdit({ from: row, to: col, minutes: minutes || 30 });
                                }
                              }}
                              className={`p-2 border-r border-slate-800/40 transition-colors ${getCellColor()}`}
                              title={
                                isSame
                                  ? 'Aynı aile (0 dk ceza)'
                                  : `${row} ➔ ${col}: ${minutes !== null ? `${minutes} dk` : 'Tanımlanmamış (Varsayılan)'}`
                              }
                            >
                              {isSame ? '0m' : minutes !== null ? `${minutes}m` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cell Quick Edit Popover Dialog */}
              {matrixCellEdit && (
                <div className="bg-slate-950 border border-cyan-500 rounded-lg p-3 flex items-center justify-between gap-4 animate-in fade-in shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">{matrixCellEdit.from}</span>
                    <span className="text-slate-500">➔</span>
                    <span className="font-bold text-cyan-300">{matrixCellEdit.to}</span>
                    <span className="text-slate-400 text-[11px]">Geçiş Hazırlık Cezası:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={matrixCellEdit.minutes}
                      onChange={(e) => setMatrixCellEdit({ ...matrixCellEdit, minutes: Number(e.target.value) })}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-300 font-mono text-center"
                    />
                    <span className="text-slate-400 text-xs">dakika</span>

                    <button
                      type="button"
                      onClick={handleApplyCellEdit}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1 rounded text-xs"
                    >
                      {t('saveChanges')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixCellEdit(null)}
                      className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
                    <tr>
                      <th className="p-2">{t('fromFamily')}</th>
                      <th className="p-2">{t('toFamily')}</th>
                      <th className="p-2">{t('setupPenalty')}</th>
                      <th className="p-2">Hedef İstasyon</th>
                      <th className="p-2 text-right">{t('tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {setupMatrices.map((rule, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2 font-sans font-semibold text-slate-200">{rule.fromProductType}</td>
                        <td className="p-2 font-sans font-semibold text-slate-200">{rule.toProductType}</td>
                        <td className="p-2 text-amber-300 font-bold">{rule.setupMinutes} dk</td>
                        <td className="p-2 text-slate-400">
                          {rule.resourceId ? rule.resourceId : t('globalRule')}
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(t('deleteRuleConfirm'))) {
                                handleDeleteMatrixRule(rule);
                              }
                            }}
                            className="text-slate-400 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LEHİM ALAŞIMI & FEEDER GEÇİŞ ŞABLONLARI            */}
          {/* ========================================================= */}
          {activeTab === 'alloys' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-cyan-400" />
                    <span>{t('alloyPresetTitle')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Endüstriyel EMS standartlarına uygun kurşunsuz (RoHS), kurşunlu (SnPb), Fine-Pitch ve düşük sıcaklık alaşım geçiş sürelerini tek tıkla matrise tanımlayın.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={applyAlloyPresets}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-cyan-950 shrink-0 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('applyPresetRules')}</span>
                </button>
              </div>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 text-xs">RoHS (SAC305) ➔ Sn63Pb37 (Kurşunlu)</span>
                    <span className="font-mono text-amber-300 font-bold text-xs bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      30 dk Ceza
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    SMT reflow fırın sıcaklık eğrisi ayarlanır, pota besleyicileri ve lehim nozulları kurşunlu alaşıma ayrılır.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 text-xs">Sn63Pb37 (Kurşunlu) ➔ RoHS (SAC305)</span>
                    <span className="font-mono text-rose-300 font-bold text-xs bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                      60 dk Ceza
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    RoHS dekontaminasyon protokolü. Dalga lehim potası cüruftan arındırılır ve ultrasonik nozul yıkama yapılır.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-400 text-xs">Fine-Pitch (0.10mm) ➔ Standart (0.15mm)</span>
                    <span className="font-mono text-amber-300 font-bold text-xs bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      25 dk Ceza
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Kalıp şablon değişimi (Stencil Change), Squeegee bıçak açısı kalibrasyonu ve 3D SPI lehim macunu optik sıfırlaması.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-400 text-xs">Yüksek Sıcaklık (SAC387) ➔ Düşük Sıcaklık (Bi58Sn42)</span>
                    <span className="font-mono text-amber-300 font-bold text-xs bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                      45 dk Ceza
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    10-Zone Reflow fırınının soğutulması ve Bizmut lehim profili (138°C tepe sıcaklığı) stabilizasyonu.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: HAT BAKIM & KAPASİTE ÖZETİ                        */}
          {/* ========================================================= */}
          {activeTab === 'maintenance' && (
            <div className="space-y-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    <span>{t('tabMaintenanceOverview')}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tüm EMS hatlarının planlı bakım pencereleri ve arıza duruşlarını izleyin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setIsAddDowntimeOpen(true);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-amber-950 shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('openAddDowntime')}</span>
                </button>
              </div>

              {/* Maintenance Windows List */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
                    <tr>
                      <th className="p-2.5">Hedef Makine</th>
                      <th className="p-2.5">{t('maintenanceReason')}</th>
                      <th className="p-2.5">Başlangıç</th>
                      <th className="p-2.5">Bitiş</th>
                      <th className="p-2.5">Süre</th>
                      <th className="p-2.5">Tip</th>
                      <th className="p-2.5 text-right">{t('tableActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {downtimeList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                          Aktif bakım penceresi bulunmuyor.
                        </td>
                      </tr>
                    ) : (
                      downtimeList.map((dt) => {
                        const res = resources[dt.resourceId];
                        const startMs = new Date(dt.startTime).getTime();
                        const endMs = new Date(dt.endTime).getTime();
                        const durMin = Math.round((endMs - startMs) / 60000);
                        const isEditing = editingDowntimeId === dt.id;
                        const isConfirmingDelete = confirmDeleteDtId === dt.id;

                        if (isEditing) {
                          return (
                            <tr key={dt.id} className="bg-slate-900/90 border-amber-500/50">
                              <td colSpan={7} className="p-3">
                                <form onSubmit={handleSaveEditDowntime} className="space-y-2.5">
                                  <div className="flex items-center justify-between text-amber-300 font-bold text-xs pb-1 border-b border-slate-800">
                                    <span>{t('editDowntime')}: {dt.id}</span>
                                  </div>

                                  <div className="grid grid-cols-5 gap-2.5 font-sans">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">{t('targetCenter')}</label>
                                      <select
                                        value={editDtResourceId}
                                        onChange={(e) => setEditDtResourceId(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500"
                                      >
                                        {resourceList.map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.code} ({r.name})
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">{t('maintenanceReason')}</label>
                                      <input
                                        type="text"
                                        required
                                        value={editDtReason}
                                        onChange={(e) => setEditDtReason(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:border-amber-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">Başlangıç Tarih/Saat</label>
                                      <input
                                        type="datetime-local"
                                        required
                                        value={editDtStartTime}
                                        onChange={(e) => setEditDtStartTime(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:border-amber-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-slate-400 block mb-0.5">Bitiş Tarih/Saat</label>
                                      <input
                                        type="datetime-local"
                                        required
                                        value={editDtEndTime}
                                        onChange={(e) => setEditDtEndTime(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-mono focus:border-amber-500"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2 pt-4">
                                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                        <input
                                          type="checkbox"
                                          checked={editDtIsPlanned}
                                          onChange={(e) => setEditDtIsPlanned(e.target.checked)}
                                          className="rounded border-slate-700"
                                        />
                                        <span>Planlı Koruyucu Bakım</span>
                                      </label>
                                    </div>
                                  </div>

                                  <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
                                    <button
                                      type="button"
                                      onClick={() => setEditingDowntimeId(null)}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded text-xs"
                                    >
                                      {t('cancel')}
                                    </button>
                                    <button
                                      type="submit"
                                      className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-3.5 py-1 rounded text-xs shadow-sm"
                                    >
                                      {t('saveChanges')}
                                    </button>
                                  </div>
                                </form>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={dt.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 font-bold text-cyan-300">
                              {res ? `${res.code} (${res.name})` : dt.resourceId}
                            </td>
                            <td className="p-2.5 font-sans text-slate-200 font-medium">{dt.reason}</td>
                            <td className="p-2.5 text-slate-300">
                              {isValid(new Date(dt.startTime)) ? format(new Date(dt.startTime), 'dd.MM.yyyy HH:mm') : dt.startTime}
                            </td>
                            <td className="p-2.5 text-slate-300">
                              {isValid(new Date(dt.endTime)) ? format(new Date(dt.endTime), 'dd.MM.yyyy HH:mm') : dt.endTime}
                            </td>
                            <td className="p-2.5 text-amber-300 font-bold">{durMin} dk</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  dt.isPlanned
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                    : 'bg-rose-950 text-rose-300 border border-rose-700'
                                }`}
                              >
                                {dt.isPlanned ? 'Planlı Koruyucu Bakım' : 'Hat Arızası'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              {!isConfirmingDelete ? (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditDowntime(dt)}
                                    className="text-slate-400 hover:text-amber-300 p-1 rounded hover:bg-slate-800 transition-colors"
                                    title={t('editDowntime')}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteDtId(dt.id)}
                                    className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1 animate-in fade-in font-sans">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDowntime(dt.id)}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 py-0.5 rounded text-[10px]"
                                  >
                                    Sil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteDtId(null)}
                                    className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span>Toplam İstasyon: <strong className="text-slate-200 font-mono">{resourceList.length}</strong></span>
            <span>Kayıtlı Değişim Kuralı: <strong className="text-slate-200 font-mono">{setupMatrices.length}</strong></span>
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
