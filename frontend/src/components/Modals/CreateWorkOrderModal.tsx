import React, { useState, useMemo } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useTranslation } from '../../i18n/useTranslation';
import { scheduleApi } from '../../services/api';
import {
  Cpu,
  Sparkles,
  Plus,
  Trash2,
  ShieldCheck,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Activity,
  Calendar,
} from 'lucide-react';
import { format, addDays, addHours, differenceInHours } from 'date-fns';

interface OperationInput {
  name: string;
  productType: string;
  requiredResourceId: string;
  durationMinutes: number;
  setupDurationMinutes: number;
  colorCode: string;
}

interface ProcessChip {
  label: string;
  name: string;
  resourceId: string;
  duration: number;
  setup: number;
  color: string;
  productType: string;
}

export const CreateWorkOrderModal: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useScheduleStore((s) => s.isCreateWorkOrderOpen);
  const setIsOpen = useScheduleStore((s) => s.setIsCreateWorkOrderOpen);
  const resources = useScheduleStore((s) => s.resources);
  const fetchSchedule = useScheduleStore((s) => s.fetchSchedule);

  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(500);
  const [priority, setPriority] = useState(2);
  const [dueDateDays, setDueDateDays] = useState(2);
  const [customDueDate, setCustomDueDate] = useState('');
  const [industryStandard, setIndustryStandard] = useState('Automotive (IATF 16949)');
  const [solderAlloy, setSolderAlloy] = useState('SAC305-LeadFree');

  const [operations, setOperations] = useState<OperationInput[]>([
    {
      name: 'Top-Side Stencil Print & 3D SPI',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 60,
      setupDurationMinutes: 15,
      colorCode: '#06b6d4',
    },
    {
      name: 'Top-Side SMT Placement & 10-Zone Reflow',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 90,
      setupDurationMinutes: 10,
      colorCode: '#0284c7',
    },
    {
      name: 'Top-Side 3D AOI Optical Inspection',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 45,
      setupDurationMinutes: 5,
      colorCode: '#a855f7',
    },
    {
      name: 'Bottom-Side SMT Placement & Reflow',
      productType: 'Automotive-ECU',
      requiredResourceId: 'SMT-LINE-01',
      durationMinutes: 110,
      setupDurationMinutes: 20,
      colorCode: '#0284c7',
    },
    {
      name: 'THT Connectors Precision Selective Soldering',
      productType: 'Automotive-ECU',
      requiredResourceId: 'THT-SELECTIVE-01',
      durationMinutes: 75,
      setupDurationMinutes: 15,
      colorCode: '#d97706',
    },
    {
      name: 'In-Circuit Bed-of-Nails Testing (ICT)',
      productType: 'Automotive-ECU',
      requiredResourceId: 'ICT-STATION-01',
      durationMinutes: 60,
      setupDurationMinutes: 10,
      colorCode: '#10b981',
    },
    {
      name: 'Conformal Moisture Coating & UV Curing',
      productType: 'Automotive-ECU',
      requiredResourceId: 'COAT-UV-01',
      durationMinutes: 60,
      setupDurationMinutes: 15,
      colorCode: '#ec4899',
    },
    {
      name: 'Final Automated FCT Functional Test & Flash',
      productType: 'Automotive-ECU',
      requiredResourceId: 'FCT-BENCH-01',
      durationMinutes: 45,
      setupDurationMinutes: 10,
      colorCode: '#059669',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Standard PCBA Process Chips Library
  const processLibrary: ProcessChip[] = [
    { label: '3D SPI', name: 'Stencil Printing & 3D Solder Paste Inspection', resourceId: 'SMT-LINE-01', duration: 45, setup: 15, color: '#06b6d4', productType: 'Automotive-ECU' },
    { label: 'SMT Dizgi', name: 'SMT High-Speed Pick & Place and Reflow', resourceId: 'SMT-LINE-01', duration: 90, setup: 20, color: '#0284c7', productType: 'Automotive-ECU' },
    { label: '3D AOI', name: 'Automatic 3D Optical Inspection', resourceId: 'SMT-LINE-01', duration: 30, setup: 5, color: '#a855f7', productType: 'Automotive-ECU' },
    { label: '3D AXI X-Ray', name: '3D Automated X-Ray BGA Voiding Analysis', resourceId: 'SMT-LINE-02', duration: 45, setup: 10, color: '#8b5cf6', productType: 'Automotive-ECU' },
    { label: 'THT Selektif', name: 'Precision Point-to-Point Selective Solder', resourceId: 'THT-SELECTIVE-01', duration: 60, setup: 15, color: '#d97706', productType: 'Automotive-ECU' },
    { label: 'THT Dalga', name: 'Dual-Wave Nitrogen Tunnel Soldering', resourceId: 'THT-WAVE-01', duration: 50, setup: 20, color: '#f59e0b', productType: 'Automotive-ECU' },
    { label: 'ICT Test', name: 'In-Circuit Bed-of-Nails & Boundary Scan', resourceId: 'ICT-STATION-01', duration: 40, setup: 10, color: '#10b981', productType: 'Automotive-ECU' },
    { label: 'Konformal Kaplama', name: 'Conformal Moisture Coating & UV Tunnel', resourceId: 'COAT-UV-01', duration: 60, setup: 20, color: '#ec4899', productType: 'Automotive-ECU' },
    { label: 'FCT Test & Flash', name: 'Final Functional Test & FW Flashing', resourceId: 'FCT-BENCH-01', duration: 45, setup: 10, color: '#059669', productType: 'Automotive-ECU' },
    { label: 'Depaneling Router', name: 'High-Speed CNC PCB Depaneling Router', resourceId: 'DEPANEL-ROUTER-01', duration: 30, setup: 10, color: '#6366f1', productType: 'Automotive-ECU' },
  ];

  // Preset Template loader
  const loadPreset = (presetType: 'DOUBLE_SMT_THT' | 'SINGLE_SMT_WAVE' | 'NPI_FAST' | 'MEDICAL_CLASS3') => {
    if (presetType === 'DOUBLE_SMT_THT') {
      setProductCode('ECU-MAIN-V5');
      setProductName('Automotive ECU Multi-Core Controller Board');
      setCustomerName('Bosch Mobility');
      setIndustryStandard('Automotive (IATF 16949)');
      setOperations([
        { name: 'Top-Side Stencil Print & 3D SPI', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 60, setupDurationMinutes: 15, colorCode: '#06b6d4' },
        { name: 'Top-Side SMT Placement & 10-Zone Reflow', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 90, setupDurationMinutes: 10, colorCode: '#0284c7' },
        { name: 'Top-Side 3D AOI Optical Inspection', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 45, setupDurationMinutes: 5, colorCode: '#a855f7' },
        { name: 'Bottom-Side SMT Placement & Reflow', productType: 'Automotive-ECU', requiredResourceId: 'SMT-LINE-01', durationMinutes: 110, setupDurationMinutes: 20, colorCode: '#0284c7' },
        { name: 'THT Connectors Precision Selective Soldering', productType: 'Automotive-ECU', requiredResourceId: 'THT-SELECTIVE-01', durationMinutes: 75, setupDurationMinutes: 15, colorCode: '#d97706' },
        { name: 'In-Circuit Bed-of-Nails Testing (ICT)', productType: 'Automotive-ECU', requiredResourceId: 'ICT-STATION-01', durationMinutes: 60, setupDurationMinutes: 10, colorCode: '#10b981' },
        { name: 'Conformal Moisture Coating & UV Curing', productType: 'Automotive-ECU', requiredResourceId: 'COAT-UV-01', durationMinutes: 60, setupDurationMinutes: 15, colorCode: '#ec4899' },
        { name: 'Final Automated FCT Functional Test & Flash', productType: 'Automotive-ECU', requiredResourceId: 'FCT-BENCH-01', durationMinutes: 45, setupDurationMinutes: 10, colorCode: '#059669' },
      ]);
    } else if (presetType === 'SINGLE_SMT_WAVE') {
      setProductCode('IOT-NODE-500');
      setProductName('Single-Sided Smart Metering IoT Board');
      setCustomerName('Honeywell Smart Energy');
      setIndustryStandard('IoT & Telecom');
      setOperations([
        { name: 'Top-Side High-Speed SMT (RF + Passives)', productType: 'IoT-Gateway', requiredResourceId: 'SMT-LINE-01', durationMinutes: 100, setupDurationMinutes: 45, colorCode: '#06b6d4' },
        { name: 'THT Dual-Wave Lead-Free Soldering', productType: 'IoT-Gateway', requiredResourceId: 'THT-WAVE-01', durationMinutes: 80, setupDurationMinutes: 20, colorCode: '#f59e0b' },
        { name: 'In-Circuit ICT & RF Calibration', productType: 'IoT-Gateway', requiredResourceId: 'ICT-STATION-01', durationMinutes: 60, setupDurationMinutes: 10, colorCode: '#10b981' },
        { name: 'CNC Panel Singulation & Router', productType: 'IoT-Gateway', requiredResourceId: 'DEPANEL-ROUTER-01', durationMinutes: 40, setupDurationMinutes: 10, colorCode: '#6366f1' },
      ]);
    } else if (presetType === 'NPI_FAST') {
      setProductCode('AERO-PROTO-99');
      setProductName('Avionics Radar Sensor Prototype (NPI)');
      setCustomerName('Lockheed Martin Aero');
      setIndustryStandard('Aerospace (AS9100)');
      setSolderAlloy('SnPb-Leaded');
      setOperations([
        { name: 'NPI Top SMT Placement & Profiling', productType: 'Aerospace-Telemetry', requiredResourceId: 'SMT-LINE-02', durationMinutes: 110, setupDurationMinutes: 35, colorCode: '#06b6d4' },
        { name: 'NPI Bottom SMT Component Placement', productType: 'Aerospace-Telemetry', requiredResourceId: 'SMT-LINE-02', durationMinutes: 70, setupDurationMinutes: 15, colorCode: '#0284c7' },
        { name: 'Flying Probe Fixtureless High-Precision ICT', productType: 'Aerospace-Telemetry', requiredResourceId: 'ICT-STATION-01', durationMinutes: 90, setupDurationMinutes: 20, colorCode: '#10b981' },
        { name: 'Mil-Spec Parylene Vapor Barrier Coating', productType: 'Aerospace-Telemetry', requiredResourceId: 'COAT-UV-01', durationMinutes: 80, setupDurationMinutes: 20, colorCode: '#ec4899' },
      ]);
    } else if (presetType === 'MEDICAL_CLASS3') {
      setProductCode('MED-CARDIAC-V3');
      setProductName('Implantable Cardiac Telemetry Controller');
      setCustomerName('Medtronic BioSystems');
      setIndustryStandard('Medical (ISO 13485)');
      setOperations([
        { name: 'Medical Grade SMT Placement & N2 Nitrogen Reflow', productType: 'Medical-Monitor', requiredResourceId: 'SMT-LINE-02', durationMinutes: 140, setupDurationMinutes: 30, colorCode: '#06b6d4' },
        { name: '100% 3D AXI X-Ray BGA Voiding & Solder Joint Verification', productType: 'Medical-Monitor', requiredResourceId: 'SMT-LINE-02', durationMinutes: 60, setupDurationMinutes: 10, colorCode: '#8b5cf6' },
        { name: 'THT Isolated Sensor Port Selective Soldering', productType: 'Medical-Monitor', requiredResourceId: 'THT-SELECTIVE-01', durationMinutes: 80, setupDurationMinutes: 15, colorCode: '#d97706' },
        { name: 'Medical Silicone Conformal Moisture Coating', productType: 'Medical-Monitor', requiredResourceId: 'COAT-UV-01', durationMinutes: 70, setupDurationMinutes: 30, colorCode: '#ec4899' },
        { name: 'Multi-Parameter Comprehensive FCT Validation', productType: 'Medical-Monitor', requiredResourceId: 'FCT-BENCH-01', durationMinutes: 60, setupDurationMinutes: 15, colorCode: '#059669' },
      ]);
    }
  };

  const handleAddProcessChip = (chip: ProcessChip) => {
    setOperations([
      ...operations,
      {
        name: chip.name,
        productType: chip.productType,
        requiredResourceId: resources[chip.resourceId] ? chip.resourceId : Object.keys(resources)[0] || 'SMT-LINE-01',
        durationMinutes: chip.duration,
        setupDurationMinutes: chip.setup,
        colorCode: chip.color,
      },
    ]);
  };

  const handleAddBlankOperation = () => {
    setOperations([
      ...operations,
      {
        name: `PCBA Step ${operations.length + 1}`,
        productType: operations[operations.length - 1]?.productType || 'Automotive-ECU',
        requiredResourceId: Object.keys(resources)[0] || 'SMT-LINE-01',
        durationMinutes: 60,
        setupDurationMinutes: 15,
        colorCode: '#06b6d4',
      },
    ]);
  };

  const handleRemoveOperation = (index: number) => {
    if (operations.length <= 1) return;
    setOperations(operations.filter((_, i) => i !== index));
  };

  const handleMoveOperation = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === operations.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...operations];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setOperations(updated);
  };

  const handleOpChange = (index: number, field: keyof OperationInput, value: any) => {
    const updated = [...operations];
    updated[index] = { ...updated[index], [field]: value };
    setOperations(updated);
  };

  const routeMetrics = useMemo(() => {
    let totalSetupMin = 0;
    let totalRunMin = 0;

    operations.forEach((op) => {
      totalSetupMin += Number(op.setupDurationMinutes) || 0;
      totalRunMin += Number(op.durationMinutes) || 0;
    });

    const totalDurationMin = totalSetupMin + totalRunMin;
    const totalHours = (totalDurationMin / 60).toFixed(1);
    const unitSeconds = Math.round((totalDurationMin * 60) / Math.max(1, quantity));

    const targetDueDate = customDueDate
      ? new Date(customDueDate)
      : addDays(new Date(), dueDateDays);

    const estimatedEndDate = addHours(new Date(), totalDurationMin / 60);
    const hoursMargin = differenceInHours(targetDueDate, estimatedEndDate);
    const isOnSchedule = hoursMargin >= 0;

    return {
      totalSetupMin,
      totalRunMin,
      totalDurationMin,
      totalHours,
      unitSeconds,
      targetDueDate,
      estimatedEndDate,
      hoursMargin,
      isOnSchedule,
    };
  }, [operations, quantity, dueDateDays, customDueDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !productCode || !productName) {
      alert('Please fill all required work order fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const releaseDate = new Date();
      const dueDate = routeMetrics.targetDueDate;

      await scheduleApi.createWorkOrder({
        orderNumber,
        customerName: customerName || undefined,
        productCode,
        productName: `[${industryStandard.split(' ')[0]}] ${productName}`,
        quantity,
        releaseDate: releaseDate.toISOString(),
        dueDate: dueDate.toISOString(),
        priority,
        operations: operations.map((op) => ({
          name: op.name,
          productType: op.productType,
          requiredResourceId: op.requiredResourceId,
          durationMinutes: Number(op.durationMinutes),
          setupDurationMinutes: Number(op.setupDurationMinutes),
          colorCode: op.colorCode,
        })),
      });

      await fetchSchedule();
      setIsOpen(false);
      setOrderNumber('');
      setCustomerName('');
      setProductCode('');
      setProductName('');
      setCustomDueDate('');
    } catch (err: any) {
      alert(`Failed to create work order: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 animate-in fade-in duration-150 select-none">
      <div className="w-[96vw] max-w-6xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('createModalTitle')}</h2>
              <p className="text-[10px] text-slate-400">
                {t('createModalDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-200 text-lg p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Compact & No-Scroll Optimized */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {/* Quick Routing Template Selector & Process Chips in 2 Columns */}
          <div className="grid grid-cols-12 gap-3 items-stretch">
            {/* Left: Quick Templates (5 cols) */}
            <div className="col-span-5 bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
              <label className="block text-slate-300 font-semibold mb-1 text-[11px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>{t('quickTemplates')}</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => loadPreset('DOUBLE_SMT_THT')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500 rounded p-1.5 text-left transition-all"
                >
                  <div className="text-[10px] font-bold text-cyan-300 truncate">{t('tmplDoubleSmt')}</div>
                  <div className="text-[9px] text-slate-400 truncate">{t('tmplDoubleSmtDesc')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('SINGLE_SMT_WAVE')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500 rounded p-1.5 text-left transition-all"
                >
                  <div className="text-[10px] font-bold text-amber-300 truncate">{t('tmplSingleSmt')}</div>
                  <div className="text-[9px] text-slate-400 truncate">{t('tmplSingleSmtDesc')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('NPI_FAST')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500 rounded p-1.5 text-left transition-all"
                >
                  <div className="text-[10px] font-bold text-purple-300 truncate">{t('tmplNpiFast')}</div>
                  <div className="text-[9px] text-slate-400 truncate">{t('tmplNpiFastDesc')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('MEDICAL_CLASS3')}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500 rounded p-1.5 text-left transition-all"
                >
                  <div className="text-[10px] font-bold text-emerald-300 truncate">{t('tmplMedical')}</div>
                  <div className="text-[9px] text-slate-400 truncate">{t('tmplMedicalDesc')}</div>
                </button>
              </div>
            </div>

            {/* Right: Quick Process Library Chips (7 cols) */}
            <div className="col-span-7 bg-slate-950/80 border border-slate-800 rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-cyan-400" />
                  <span>{t('quickProcessLibrary')} (Tek Tıkla Ekle):</span>
                </span>
                <span className="text-[9px] text-slate-500">Doğrudan rotaya eklenir</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {processLibrary.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddProcessChip(chip)}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-[10px] font-medium text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: chip.color }} />
                    <span>+ {chip.label}</span>
                    <span className="text-slate-500 text-[9px] font-mono">({chip.duration}m)</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Work Order Info Inputs - High-Density 4x2 Grid */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2">
            {/* Row 1 (4 Columns) */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                  {t('woNumber')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="WO-2026-PCBA-701"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                  {t('customer')}
                </label>
                <input
                  type="text"
                  placeholder="Continental Automotive"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                  {t('qualityStd')}
                </label>
                <select
                  value={industryStandard}
                  onChange={(e) => setIndustryStandard(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                >
                  <option value="Automotive (IATF 16949)">Automotive (IATF 16949)</option>
                  <option value="Medical (ISO 13485)">Medical (ISO 13485)</option>
                  <option value="Industrial (IEC 61508)">Industrial (IEC 61508)</option>
                  <option value="Aerospace (AS9100)">Aerospace (AS9100)</option>
                  <option value="IoT & Telecom">IoT & Telecom</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                  {t('solderAlloy')}
                </label>
                <select
                  value={solderAlloy}
                  onChange={(e) => setSolderAlloy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                >
                  <option value="SAC305-LeadFree">Lead-Free (SAC305 / RoHS)</option>
                  <option value="SnPb-Leaded">Leaded (Sn63Pb37 / High-Rel)</option>
                  <option value="HighTemp-SAC387">High-Temp (SAC387)</option>
                  <option value="LowTemp-Bi58Sn42">Low-Temp Bismuth (Bi58Sn42)</option>
                </select>
              </div>
            </div>

            {/* Row 2 (4 Columns) */}
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                  {t('productCode')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ECU-MAIN-V4"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                  {t('productDesc')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="Engine Control Dual-Sided Board"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                />
              </div>

              {/* Quantity + Priority compact side-by-side */}
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                      {t('quantity')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-0.5 text-[11px]">
                      {t('priority')}
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-200 focus:border-cyan-500 focus:outline-none text-[11px]"
                    >
                      <option value={1}>1 - Acil</option>
                      <option value={2}>2 - Normal</option>
                      <option value={3}>3 - Düşük</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Target Due Date Picker */}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-slate-300 font-semibold text-[11px]">
                    {t('targetLeadTime')}
                  </label>
                  {customDueDate && (
                    <button
                      type="button"
                      onClick={() => setCustomDueDate('')}
                      className="text-[9px] text-cyan-400 hover:underline"
                    >
                      Preset
                    </button>
                  )}
                </div>
                {!customDueDate ? (
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 5, 7].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setDueDateDays(days)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono border transition-all ${
                          dueDateDays === days
                            ? 'bg-cyan-600 text-white font-bold border-cyan-500'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        +{days}G
                      </button>
                    ))}
                    <input
                      type="datetime-local"
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="w-7 bg-slate-900 border border-slate-700 rounded text-slate-400 p-0.5 text-center cursor-pointer text-[10px]"
                      title={t('customDueDate')}
                    />
                  </div>
                ) : (
                  <input
                    type="datetime-local"
                    value={customDueDate}
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="w-full bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-slate-100 font-mono text-[10px]"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Live Lead Time & Capacity Predictor Card - Compact 4-Card Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 grid grid-cols-4 gap-3 items-center text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400">{t('totalRunTime')}</div>
                <div className="font-mono font-bold text-slate-200 text-[11px]">
                  {routeMetrics.totalHours} saat ({routeMetrics.totalDurationMin} dk)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400">{t('totalSetupTime')}</div>
                <div className="font-mono font-bold text-amber-300 text-[11px]">
                  {routeMetrics.totalSetupMin} dk
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <div>
                <div className="text-[9px] text-slate-400">{t('unitCycleTime')}</div>
                <div className="font-mono font-bold text-purple-300 text-[11px]">
                  {routeMetrics.unitSeconds} sn / panel
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              {routeMetrics.isOnSchedule ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 font-semibold text-[10px]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{t('onSchedule')} (+{routeMetrics.hoursMargin}s)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/80 text-rose-300 font-semibold text-[10px]">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>{t('dueDateRisk')} ({routeMetrics.hoursMargin}s)</span>
                </div>
              )}
            </div>
          </div>

          {/* Sequential Operations Builder */}
          <div className="border-t border-slate-800 pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('routingSteps')} ({operations.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddBlankOperation}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded px-2 py-0.5 font-semibold flex items-center gap-1 text-[11px] transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>{t('addStep')}</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {operations.map((op, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-1.5 rounded-lg border border-slate-800/80 flex items-center gap-2 text-[11px] hover:border-slate-700 transition-colors"
                >
                  {/* Sequence Reorder Controls */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOperation(idx, 'up')}
                      className="text-slate-400 hover:text-cyan-300 disabled:opacity-20 p-0.5"
                      title={t('moveUp')}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-cyan-300 text-[9px]">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={idx === operations.length - 1}
                      onClick={() => handleMoveOperation(idx, 'down')}
                      className="text-slate-400 hover:text-cyan-300 disabled:opacity-20 p-0.5"
                      title={t('moveDown')}
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Operation Inputs Grid */}
                  <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                    {/* Operation Name */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Op Name"
                        value={op.name}
                        onChange={(e) => handleOpChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-slate-200 focus:border-cyan-500 text-[11px]"
                      />
                    </div>

                    {/* Resource Selector */}
                    <div className="col-span-3">
                      <select
                        value={op.requiredResourceId}
                        onChange={(e) => handleOpChange(idx, 'requiredResourceId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 focus:border-cyan-500 truncate text-[11px]"
                      >
                        {Object.values(resources).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.code} — {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Setup & Run Duration */}
                    <div className="col-span-3 flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5" title="Setup Süresi">
                        <span className="text-[9px] text-amber-400 font-mono">S:</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={op.setupDurationMinutes}
                          onChange={(e) =>
                            handleOpChange(idx, 'setupDurationMinutes', Number(e.target.value))
                          }
                          className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-amber-300 focus:border-cyan-500 font-mono text-center text-[10px]"
                        />
                      </div>
                      <div className="flex items-center gap-0.5" title="İşlem Süresi">
                        <span className="text-[9px] text-cyan-400 font-mono">R:</span>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={op.durationMinutes}
                          onChange={(e) =>
                            handleOpChange(idx, 'durationMinutes', Number(e.target.value))
                          }
                          className="w-11 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-200 focus:border-cyan-500 font-mono text-center text-[10px]"
                        />
                        <span className="text-slate-500 text-[9px]">dk</span>
                      </div>
                    </div>

                    {/* Product Family */}
                    <div className="col-span-2">
                      <select
                        value={op.productType}
                        onChange={(e) => handleOpChange(idx, 'productType', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-300 focus:border-cyan-500 text-[10px] truncate"
                      >
                        <option value="Automotive-ECU">Automotive-ECU</option>
                        <option value="IoT-Gateway">IoT-Gateway</option>
                        <option value="Medical-Monitor">Medical-Monitor</option>
                        <option value="Industrial-Power">Industrial-Power</option>
                        <option value="Aerospace-Telemetry">Aerospace-Telemetry</option>
                      </select>
                    </div>
                  </div>

                  {/* Remove Button */}
                  {operations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOperation(idx)}
                      className="text-red-400 hover:text-red-300 p-0.5 shrink-0 transition-colors"
                      title="Operasyonu Kaldır"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mini Visual Route Flow Preview */}
          <div className="border-t border-slate-800 pt-2">
            <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-cyan-400" />
              <span>{t('routeVisualFlow')} ({operations.length} Adım Sıralı DAG)</span>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[9px] scrollbar-thin">
              {operations.map((op, idx) => (
                <React.Fragment key={idx}>
                  <div
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 shrink-0 text-slate-300 shadow-sm"
                    style={{ borderLeft: `3px solid ${op.colorCode || '#06b6d4'}` }}
                  >
                    <span className="font-mono text-cyan-400 font-bold">{idx + 1}.</span>
                    <span className="truncate max-w-[110px] font-medium">{op.name}</span>
                    <span className="text-slate-500 font-mono text-[8px]">({op.durationMinutes}m)</span>
                  </div>
                  {idx < operations.length - 1 && (
                    <ArrowRight className="w-2.5 h-2.5 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hedef Teslimat: <strong className="text-slate-200 font-mono">{format(routeMetrics.targetDueDate, 'dd MMM yyyy HH:mm')}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-md font-semibold text-xs transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-md font-semibold text-xs transition-colors shadow-lg shadow-cyan-950 flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>{isSubmitting ? t('creatingWo') : t('submitWo')}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
