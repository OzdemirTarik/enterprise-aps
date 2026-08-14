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

  // Standard PCBA Process Chips Library (Item 2)
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

  // Add Step from Library Chip (Item 2)
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

  // Reorder Operations: Move Up / Down (Item 3)
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

  // Live Metrics & Lead Time Calculator (Item 4 & 5)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">{t('createModalTitle')}</h2>
              <p className="text-[11px] text-slate-400">
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Quick Routing Template Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('quickTemplates')}</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => loadPreset('DOUBLE_SMT_THT')}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 hover:border-cyan-500 rounded-lg p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-cyan-300 group-hover:text-cyan-200">
                  {t('tmplDoubleSmt')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplDoubleSmtDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => loadPreset('SINGLE_SMT_WAVE')}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 hover:border-amber-500 rounded-lg p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-amber-300 group-hover:text-amber-200">
                  {t('tmplSingleSmt')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplSingleSmtDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => loadPreset('NPI_FAST')}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 hover:border-purple-500 rounded-lg p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-purple-300 group-hover:text-purple-200">
                  {t('tmplNpiFast')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplNpiFastDesc')}</div>
              </button>
              <button
                type="button"
                onClick={() => loadPreset('MEDICAL_CLASS3')}
                className="bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 hover:border-emerald-500 rounded-lg p-2 text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-emerald-300 group-hover:text-emerald-200">
                  {t('tmplMedical')}
                </div>
                <div className="text-[10px] text-slate-400">{t('tmplMedicalDesc')}</div>
              </button>
            </div>
          </div>

          {/* Quick Process Library Chips (Item 2) */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>{t('quickProcessLibrary')} (1-Click Add):</span>
              </span>
              <span className="text-[10px] text-slate-500">Tıklandığında rotanın sonuna eklenir</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {processLibrary.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddProcessChip(chip)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/70 hover:border-cyan-400 text-[10px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: chip.color }} />
                  <span>+ {chip.label}</span>
                  <span className="text-slate-500 text-[9px] font-mono">({chip.duration}m)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Work Order Info Inputs */}
          <div className="grid grid-cols-3 gap-3 border-t border-slate-800 pt-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                {t('woNumber')}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WO-2026-PCBA-701"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('customer')}</label>
              <input
                type="text"
                placeholder="e.g. Continental Automotive"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('qualityStd')}</label>
              <select
                value={industryStandard}
                onChange={(e) => setIndustryStandard(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Automotive (IATF 16949)">Automotive (IATF 16949)</option>
                <option value="Medical (ISO 13485)">Medical (ISO 13485)</option>
                <option value="Industrial (IEC 61508)">Industrial (IEC 61508)</option>
                <option value="Aerospace (AS9100)">Aerospace (AS9100)</option>
                <option value="IoT & Telecom">IoT & Telecom</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('productCode')}</label>
              <input
                type="text"
                required
                placeholder="e.g. ECU-MAIN-V4"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('productDesc')}</label>
              <input
                type="text"
                required
                placeholder="e.g. Engine Control Dual-Sided Board"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('solderAlloy')}</label>
              <select
                value={solderAlloy}
                onChange={(e) => setSolderAlloy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="SAC305-LeadFree">Lead-Free (SAC305 / RoHS)</option>
                <option value="SnPb-Leaded">Leaded (Sn63Pb37 / High-Rel)</option>
                <option value="HighTemp-SAC387">High-Temp (SAC387)</option>
                <option value="LowTemp-Bi58Sn42">Low-Temp Bismuth (Bi58Sn42)</option>
              </select>
            </div>
          </div>

          {/* Quantity, Priority & Enhanced Date Picker (Item 5) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('quantity')}</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">{t('priority')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value={1}>{t('prioCritical')}</option>
                <option value={2}>{t('prioNormal')}</option>
                <option value={3}>{t('prioLow')}</option>
              </select>
            </div>

            {/* Target Due Date with Quick Day Presets + Exact Datetime (Item 5) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                <span>{t('targetLeadTime')}</span>
                {customDueDate && (
                  <button
                    type="button"
                    onClick={() => setCustomDueDate('')}
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Presetlere Dön
                  </button>
                )}
              </label>
              {!customDueDate ? (
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 5, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setDueDateDays(days)}
                      className={`flex-1 py-1.5 rounded text-[11px] font-mono border transition-all ${
                        dueDateDays === days
                          ? 'bg-cyan-600 text-white font-bold border-cyan-500'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      +{days}G
                    </button>
                  ))}
                  <input
                    type="datetime-local"
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="w-8 bg-slate-950 border border-slate-700 rounded text-slate-400 p-1 text-center cursor-pointer"
                    title={t('customDueDate')}
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="datetime-local"
                    value={customDueDate}
                    onChange={(e) => setCustomDueDate(e.target.value)}
                    className="flex-1 bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-slate-100 font-mono text-[11px]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Live Lead Time & Capacity Predictor Card (Item 4) */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 grid grid-cols-4 gap-3 items-center text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">{t('totalRunTime')}</div>
                <div className="font-mono font-bold text-slate-200 text-xs">
                  {routeMetrics.totalHours} saat ({routeMetrics.totalDurationMin} dk)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">{t('totalSetupTime')}</div>
                <div className="font-mono font-bold text-amber-300 text-xs">
                  {routeMetrics.totalSetupMin} dk
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400">{t('unitCycleTime')}</div>
                <div className="font-mono font-bold text-purple-300 text-xs">
                  {routeMetrics.unitSeconds} sn / panel
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              {routeMetrics.isOnSchedule ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('onSchedule')} (+{routeMetrics.hoursMargin}s)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 border border-rose-500/80 text-rose-300 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>{t('dueDateRisk')} ({routeMetrics.hoursMargin}s)</span>
                </div>
              )}
            </div>
          </div>

          {/* Sequential Operations Builder with Move Up/Down Reordering (Item 3) */}
          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('routingSteps')} ({operations.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddBlankOperation}
                className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 rounded px-2.5 py-1 font-semibold flex items-center gap-1 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addStep')}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {operations.map((op, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center gap-2 text-[11px] hover:border-slate-700 transition-colors"
                >
                  {/* Sequence Reorder Controls (Item 3) */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOperation(idx, 'up')}
                      className="text-slate-400 hover:text-cyan-300 disabled:opacity-20 p-0.5"
                      title={t('moveUp')}
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-mono font-bold text-cyan-300 text-[10px]">
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

                  {/* Operation Inputs */}
                  <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                    {/* Operation Name */}
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Op Name"
                        value={op.name}
                        onChange={(e) => handleOpChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500"
                      />
                    </div>

                    {/* Resource Selector */}
                    <div className="col-span-3">
                      <select
                        value={op.requiredResourceId}
                        onChange={(e) => handleOpChange(idx, 'requiredResourceId', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:border-cyan-500 truncate"
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
                      <div className="flex items-center gap-1" title="Besleyici/Kalıp Setup Süresi">
                        <span className="text-[10px] text-amber-400 font-mono">S:</span>
                        <input
                          type="number"
                          min={0}
                          step={5}
                          value={op.setupDurationMinutes}
                          onChange={(e) =>
                            handleOpChange(idx, 'setupDurationMinutes', Number(e.target.value))
                          }
                          className="w-11 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-amber-300 focus:border-cyan-500 font-mono text-center text-[10px]"
                        />
                      </div>
                      <div className="flex items-center gap-1" title="İşlem Süresi">
                        <span className="text-[10px] text-cyan-400 font-mono">R:</span>
                        <input
                          type="number"
                          min={15}
                          step={15}
                          value={op.durationMinutes}
                          onChange={(e) =>
                            handleOpChange(idx, 'durationMinutes', Number(e.target.value))
                          }
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-slate-200 focus:border-cyan-500 font-mono text-center text-[10px]"
                        />
                        <span className="text-slate-500 text-[10px]">dk</span>
                      </div>
                    </div>

                    {/* Product Family */}
                    <div className="col-span-2">
                      <select
                        value={op.productType}
                        onChange={(e) => handleOpChange(idx, 'productType', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-300 focus:border-cyan-500 text-[10px] truncate"
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
                      className="text-red-400 hover:text-red-300 p-1 shrink-0 transition-colors"
                      title="Operasyonu Kaldır"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mini Visual Route Flow Preview (Item 6) */}
          <div className="border-t border-slate-800 pt-2.5">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-cyan-400" />
              <span>{t('routeVisualFlow')} ({operations.length} Adım Sıralı DAG)</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] scrollbar-thin">
              {operations.map((op, idx) => (
                <React.Fragment key={idx}>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded bg-slate-950 border border-slate-800 shrink-0 text-slate-300 shadow-sm"
                    style={{ borderLeft: `3px solid ${op.colorCode || '#06b6d4'}` }}
                  >
                    <span className="font-mono text-cyan-400 font-bold">{idx + 1}.</span>
                    <span className="truncate max-w-[120px] font-medium">{op.name}</span>
                    <span className="text-slate-500 font-mono text-[9px]">({op.durationMinutes}m)</span>
                  </div>
                  {idx < operations.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hedef Teslimat: <strong className="text-slate-200 font-mono">{format(routeMetrics.targetDueDate, 'dd MMM yyyy HH:mm')}</strong></span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-md font-semibold text-xs transition-colors"
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
