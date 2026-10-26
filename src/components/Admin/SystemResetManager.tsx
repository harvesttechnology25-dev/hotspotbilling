import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Database,
  Receipt,
  Tag,
  Wifi,
  Users,
  Server,
  Sparkles,
  Loader2,
  Lock,
  ArrowRight,
  Flame,
  Check,
  ShieldCheck,
  Package,
  Download,
  UploadCloud,
  X,
  ArrowUpCircle,
} from 'lucide-react';

interface DataSummary {
  totalTransactions: number;
  totalRevenue: number;
  vouchersCount: number;
  voucherBatchesCount: number;
  freeTrialClaimsCount: number;
  auditLogsCount: number;
  hotspotOwnersCount: number;
  routersCount: number;
  plansCount: number;
}

interface SystemResetManagerProps {
  onResetCompleted?: () => void;
  lang?: 'sw' | 'en';
}

export const SystemResetManager: React.FC<SystemResetManagerProps> = ({
  onResetCompleted,
  lang = 'sw',
}) => {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Reset checkboxes
  const [clearTransactions, setClearTransactions] = useState(true);
  const [clearVouchers, setClearVouchers] = useState(true);
  const [clearFreeTrials, setClearFreeTrials] = useState(true);
  const [clearAuditLogs, setClearAuditLogs] = useState(true);
  const [clearDemoOwners, setClearDemoOwners] = useState(true);
  const [clearDemoRouters, setClearDemoRouters] = useState(true);
  const [resetPlansToDefault, setResetPlansToDefault] = useState(true);

  // Security confirmation
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: any;
  } | null>(null);

  // Upload & Restore Backup State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileContent, setUploadedFileContent] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadPreviewStats, setUploadPreviewStats] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [restoreConfirmWord, setRestoreConfirmWord] = useState('');
  const [restoringDatabase, setRestoringDatabase] = useState(false);

  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await fetch('/api/v1/system/data-summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load system data summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleApplyPreset = (preset: 'clean_sales' | 'full_clean_slate') => {
    if (preset === 'clean_sales') {
      setClearTransactions(true);
      setClearVouchers(true);
      setClearFreeTrials(true);
      setClearAuditLogs(true);
      setClearDemoOwners(false);
      setClearDemoRouters(false);
      setResetPlansToDefault(false);
    } else {
      setClearTransactions(true);
      setClearVouchers(true);
      setClearFreeTrials(true);
      setClearAuditLogs(true);
      setClearDemoOwners(true);
      setClearDemoRouters(true);
      setResetPlansToDefault(true);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedWord = confirmationInput.trim().toUpperCase();
    if (normalizedWord !== 'RESET LIVE' && normalizedWord !== 'FUTA DATA') {
      setResultMessage({
        type: 'error',
        text: 'Neno la uthibitisho si sahihi. Andika "RESET LIVE" au "FUTA DATA" ili kuthibitisha.',
      });
      return;
    }

    setIsResetting(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/v1/system/reset-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationWord: normalizedWord,
          clearTransactions,
          clearVouchers,
          clearFreeTrials,
          clearAuditLogs,
          clearDemoOwners,
          clearDemoRouters,
          resetPlansToDefault,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hitilafu ya kufuta data za mfumo.');
      }

      setResultMessage({
        type: 'success',
        text: data.message || 'Mfumo umewekwa upya kabisa na uko tayari kwa kazi rasmi!',
        details: data.summary,
      });

      setConfirmationInput('');
      await fetchSummary();

      if (onResetCompleted) {
        onResetCompleted();
      }
    } catch (err: any) {
      setResultMessage({
        type: 'error',
        text: err.message || 'Imeshindikana kureset mfumo. Jaribu tena.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle uploaded .sql or .json file reading
  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadError(null);
    setUploadPreviewStats(null);
    setUploadedFileName(file.name);

    try {
      const text = await file.text();
      setUploadedFileContent(text);

      const res = await fetch('/api/v1/system/backup/upload-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: text, filename: file.name }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kusoma faili la backup.');
      }

      setUploadPreviewStats(data);
    } catch (err: any) {
      setUploadError(err.message || 'Hitilafu ya kusoma faili la backup.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // Execute restore from uploaded backup
  const handleExecuteRestore = async () => {
    if (!uploadedFileContent) {
      setUploadError('Tafadhali chagua faili la backup kwanza.');
      return;
    }

    const cleanWord = restoreConfirmWord.trim().toUpperCase();
    if (cleanWord !== 'RESTORE' && cleanWord !== 'REJESHA') {
      setUploadError('Tafadhali andika "RESTORE" au "REJESHA" kuthibitisha.');
      return;
    }

    setRestoringDatabase(true);
    setUploadError(null);
    try {
      const res = await fetch('/api/v1/system/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileContent: uploadedFileContent,
          filename: uploadedFileName,
          confirmationWord: cleanWord,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kurejesha database.');
      }

      setResultMessage({
        type: 'success',
        text: data.message || 'Database imerejeshwa kikamilifu!',
        details: data.stats,
      });

      setUploadModalOpen(false);
      setUploadedFileContent('');
      setUploadPreviewStats(null);
      setRestoreConfirmWord('');

      await fetchSummary();
      if (onResetCompleted) onResetCompleted();
    } catch (err: any) {
      setUploadError(err.message || 'Hitilafu ya kurejesha backup.');
    } finally {
      setRestoringDatabase(false);
    }
  };

  const isConfirmed =
    confirmationInput.trim().toUpperCase() === 'RESET LIVE' ||
    confirmationInput.trim().toUpperCase() === 'FUTA DATA';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-rose-900/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-rose-600/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-black text-xs border border-rose-500/30 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Production Launch Clean Slate</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] border border-amber-500/30">
                👑 Vendor Master HQ
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Weka Mfumo Mpya Kabisa kwa Uzinduzi Rasmi (Factory Reset)
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Kabla ya kuanza kutumia mfumo kwenye mazingira halisi ya biashara (Production / Live), unaweza kusafisha miamala yote ya majaribio, vocha zilizochapishwa, na rekodi za majaribio ili dashboard yako ianze na <strong>TZS 0</strong> bila takwimu za uongo.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyPreset('clean_sales')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safi Miamala & Vocha Tu</span>
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('full_clean_slate')}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-950/50"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Factory Reset Kamili</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Notification */}
      {resultMessage && (
        <div
          className={`p-5 rounded-2xl border text-xs space-y-3 animate-in fade-in duration-200 ${
            resultMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-sm'
              : 'bg-rose-50 text-rose-950 border-rose-300 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            {resultMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="font-bold text-sm">{resultMessage.text}</div>
          </div>

          {resultMessage.details && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200 text-[11px] font-mono">
              <div className="p-2 rounded-lg bg-emerald-100/60">
                <span className="text-slate-600 block">Miamala Iliyofutwa:</span>
                <strong className="text-emerald-800 text-xs">{resultMessage.details.clearedTransactions}</strong>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100/60">
                <span className="text-slate-600 block">Vocha Zilizofutwa:</span>
                <strong className="text-emerald-800 text-xs">{resultMessage.details.clearedVouchers}</strong>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100/60">
                <span className="text-slate-600 block">Vifaa vya Free Trial:</span>
                <strong className="text-emerald-800 text-xs">{resultMessage.details.clearedTrials}</strong>
              </div>
              <div className="p-2 rounded-lg bg-emerald-100/60">
                <span className="text-slate-600 block">Audit Logs:</span>
                <strong className="text-emerald-800 text-xs">{resultMessage.details.clearedLogs}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Data Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Miamala ya Majaribio</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {loadingSummary ? '...' : summary?.totalTransactions ?? 0}
          </div>
          <div className="text-[11px] font-mono text-emerald-600 font-bold">
            TZS {summary?.totalRevenue?.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vocha Zilizopo</span>
            <Tag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {loadingSummary ? '...' : summary?.vouchersCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Makundi {summary?.voucherBatchesCount ?? 0} ya kadi
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Wamiliki (Tenants)</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {loadingSummary ? '...' : summary?.hotspotOwnersCount ?? 0}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold">
            Vendor Admin inalindwa daima
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Routers Zilizopo</span>
            <Server className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {loadingSummary ? '...' : summary?.routersCount ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            Vifurushi {summary?.plansCount ?? 0} vya mfumo
          </div>
        </div>
      </div>

      {/* Safety Notice: Vendor Admin Credentials Preserved */}
      <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 space-y-1">
          <h4 className="font-bold">Akaunti ya Msimamizi Mkuu (Vendor Admin) Hailipwi Wala Kufutwa</h4>
          <p className="text-indigo-800 leading-relaxed">
            Hata ukichagua <strong>"Factory Reset Kamili"</strong>, akaunti yako kuu ya Vendor Master HQ (Kelvin Mrema / <code>admin</code> / nenosiri: <code>1234</code>) itaendelea kubaki salama ili uweze kuingia mara moja na kusajili wateja na routers zako halisi.
          </p>
        </div>
      </div>

      {/* Recommended SQL Backup Card Before Updates or Resets */}
      <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 rounded-xl bg-purple-600 text-white shrink-0 mt-0.5 shadow-xs">
            <Download className="w-5 h-5" />
          </span>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-purple-950">
              Pakua SQL Backup (.sql) Kwanza Kabla ya Ku-Update Mfumo au Kureset
            </h4>
            <p className="text-xs text-purple-800 leading-relaxed max-w-xl">
              Hifadhi nakala kamili ya database yenye tables na data zote halisi (wamiliki, vifaa, miamala, na vocha) kama faili la <strong>.sql</strong>. Unaweza kulitumia kurejesha mfumo kwa sekunde chache endapo lolote litatokea wakati wa update.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <a
            href="/api/v1/system/sql-backup-download"
            download
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Pakua SQL Backup (.sql)</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setUploadError(null);
              setUploadModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            title="Upload na kurejesha database kutoka kwenye backup"
          >
            <UploadCloud className="w-4 h-4 text-emerald-200" />
            <span>Upload & Rejesha Backup</span>
          </button>
        </div>
      </div>

      {/* Reset Configuration Form */}
      <form onSubmit={handleExecuteReset} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Chagua Maeneo ya Kusafisha (Select What to Purge):</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Weka alama ya tiki kwenye sehemu unazotaka zifutwe kabla ya kwenda live.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* Option 1: Transactions */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            clearTransactions ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={clearTransactions}
              onChange={(e) => setClearTransactions(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Futa Miamala Yote (Purge All Transactions)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Huondoa rekodi zote za malipo ya simu (M-Pesa, Tigo, Airtel) na kurudisha mapato kuwa <strong>TZS 0</strong>.
              </span>
            </div>
          </label>

          {/* Option 2: Vouchers */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            clearVouchers ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={clearVouchers}
              onChange={(e) => setClearVouchers(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Futa Vocha & Kadi za Uchapishaji (Purge Vouchers)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Hufuta vocha zote zilizotengenezwa, batches za uchapishaji, na watumiaji wa RADIUS.
              </span>
            </div>
          </label>

          {/* Option 3: Free Trials */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            clearFreeTrials ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={clearFreeTrials}
              onChange={(e) => setClearFreeTrials(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Futa Rekodi za Free Trial (Clear Free Trial Devices)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Huondoa orodha ya simu na kompyuta (MAC addresses) zilizotumia intaneti ya bure ili wateja waanze upya.
              </span>
            </div>
          </label>

          {/* Option 4: Audit Logs */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            clearAuditLogs ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={clearAuditLogs}
              onChange={(e) => setClearAuditLogs(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Futa Kumbukumbu za Matukio (Clear Audit Logs)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Huondoa historia yote ya matukio ya kiufundi, majaribio ya webhooks, na mabadiliko ya mfumo.
              </span>
            </div>
          </label>

          {/* Option 5: Demo Owners */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            clearDemoOwners ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={clearDemoOwners}
              onChange={(e) => setClearDemoOwners(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Futa Watumiaji, Wafanyakazi & Wamiliki Wote (Purge All Users, Staff & Hotspot Owners)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Hufuta watumiaji wote, mameneja, wauza vocha na wamiliki wa hotspot kwenye database. <strong>Akaunti yako kuu ya Vendor Admin pekee ndiyo itakayobaki salama 100%!</strong>
              </span>
            </div>
          </label>

          {/* Option 6: Demo Routers */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            clearDemoRouters ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={clearDemoRouters}
              onChange={(e) => setClearDemoRouters(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Futa Routers za Majaribio (Purge Demo Routers)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Huondoa routers za demo ili uunganishe vifaa vyako halisi vya MikroTik, Ruijie au TP-Link.
              </span>
            </div>
          </label>

          {/* Option 7: Reset Plans to Clean Defaults */}
          <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
            resetPlansToDefault ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <input
              type="checkbox"
              checked={resetPlansToDefault}
              onChange={(e) => setResetPlansToDefault(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <div>
              <strong className="text-slate-900 block font-bold">Rejesha Vifurushi vya Kawaida (Standard Packages)</strong>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Huweka upya vifurushi 4 vya msingi: Masaa 2 (500/=), Masaa 6 (1000/=), Masaa 24 (1500/=), Wiki 1 (5000/=).
              </span>
            </div>
          </label>
        </div>

        {/* Security Confirmation Step */}
        <div className="pt-4 border-t border-slate-200 space-y-3 bg-rose-50/50 p-4 sm:p-5 rounded-2xl border border-rose-200">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" />
            <span className="font-bold text-xs text-rose-950 uppercase tracking-wide">
              Uthibitisho wa Usalama (Security Confirmation):
            </span>
          </div>
          <p className="text-xs text-slate-700">
            Kitendo hiki ni cha kudumu na hakiwezi kurejeshwa. Ili kuthibitisha kwamba uko tayari kufuta data za majaribio na kuweka mfumo uwe mpya kabisa, andika <strong>RESET LIVE</strong> au <strong>FUTA DATA</strong> kwenye kisanduku hapa chini:
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Andika RESET LIVE hapa kuthibitisha..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 focus:border-rose-600 focus:outline-hidden bg-white text-xs font-mono font-bold uppercase tracking-wider text-rose-950 placeholder-slate-400"
              />
              {isConfirmed && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-[11px] font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Imethibitishwa</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!isConfirmed || isResetting}
              className={`py-2.5 px-6 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md ${
                isConfirmed && !isResetting
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Inasafisha Data...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Futa Data & Weka Mfumo Mpya</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD & RESTORE SQL / JSON BACKUP                                 */}
      {/* ========================================================================= */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Upload & Rejesha Backup ya Database
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inasaidia faili la .sql (SQL Dump) au .json
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadModalOpen(false);
                  setUploadedFileContent('');
                  setUploadPreviewStats(null);
                  setUploadError(null);
                  setRestoreConfirmWord('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {uploadError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="flex-1 font-medium">{uploadError}</div>
              </div>
            )}

            {/* File Drop / Select Area */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                1. Chagua Faili la Backup (.sql au .json):
              </label>
              <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 transition flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer group">
                <input
                  type="file"
                  accept=".sql,.json,text/plain,application/json,application/sql"
                  onChange={handleFileUploadChange}
                  className="hidden"
                  disabled={uploadingFile || restoringDatabase}
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                  {uploadingFile ? (
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  ) : (
                    <ArrowUpCircle className="w-6 h-6 text-emerald-600" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 block">
                    {uploadingFile
                      ? 'Inasoma na kuhakiki faili...'
                      : uploadedFileName
                      ? `Faili: ${uploadedFileName}`
                      : 'Bofya hapa kuchagua faili la .sql au .json'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    tz_wifi_database_backup_*.sql au *.json
                  </span>
                </div>
              </label>
            </div>

            {/* Backup Contents Preview Box */}
            {uploadPreviewStats && uploadPreviewStats.stats && (
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white font-mono font-bold text-[10px]">
                      {uploadPreviewStats.stats.format}
                    </span>
                    <span className="text-xs font-extrabold text-purple-950 truncate max-w-[260px]">
                      {uploadPreviewStats.stats.filename}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-700">
                    {uploadPreviewStats.stats.sizeKb} KB
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Wamiliki</span>
                    <span className="text-base font-black text-slate-900">{uploadPreviewStats.stats.ownersCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Routers/AP</span>
                    <span className="text-base font-black text-slate-900">{uploadPreviewStats.stats.routersCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Vifurushi</span>
                    <span className="text-base font-black text-slate-900">{uploadPreviewStats.stats.plansCount}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Vocha</span>
                    <span className="text-base font-black text-purple-700">{uploadPreviewStats.stats.vouchersCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation & Restore Section */}
            {uploadPreviewStats && (
              <div className="space-y-3 pt-1 border-t border-slate-100">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Tahadhari:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Kurejesha backup kutabadilisha taarifa zilizopo na kuweka data kutoka kwenye faili hili.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Andika "RESTORE" au "REJESHA" kuthibitisha:
                  </label>
                  <input
                    type="text"
                    value={restoreConfirmWord}
                    onChange={(e) => setRestoreConfirmWord(e.target.value)}
                    placeholder='RESTORE'
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                    disabled={restoringDatabase}
                  />
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={restoringDatabase}
                    onClick={() => {
                      setUploadModalOpen(false);
                      setUploadedFileContent('');
                      setUploadPreviewStats(null);
                      setRestoreConfirmWord('');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                  >
                    Ghairi
                  </button>
                  <button
                    type="button"
                    disabled={
                      restoringDatabase ||
                      (restoreConfirmWord.trim().toUpperCase() !== 'RESTORE' &&
                        restoreConfirmWord.trim().toUpperCase() !== 'REJESHA')
                    }
                    onClick={handleExecuteRestore}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {restoringDatabase ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inarejesha Database...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Rejesha Data Sasa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
