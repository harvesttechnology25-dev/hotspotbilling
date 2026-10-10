import React, { useEffect, useState, useMemo } from 'react';
import { Plan, Voucher, VoucherBatch } from '../../types/index.ts';
import { formatTzs } from '../../utils/carrierInfo.ts';
import { VoucherPrintLayout } from './VoucherPrintLayout.tsx';
import {
  Tag,
  Printer,
  PlusCircle,
  Loader2,
  CheckCircle,
  Copy,
  Wifi,
  Sparkles,
  FileText,
  QrCode,
  Layers,
  History,
  Check,
  Search,
  Trash2,
  MapPin,
} from 'lucide-react';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';
import { RouterItem } from '../../types/index.ts';

export const VoucherStation: React.FC<{
  ownerId?: number;
  businessName?: string;
  selectedRouterId?: number;
  routers?: RouterItem[];
  onSelectRouter?: (id: number | undefined) => void;
}> = ({
  ownerId,
  businessName,
  selectedRouterId,
  routers = [],
  onSelectRouter,
}) => {
  // Auto-resolve owner ID with fallback to logged-in user to prevent any cross-owner voucher leakage
  const resolvedOwnerId = useMemo(() => {
    if (ownerId && !isNaN(Number(ownerId))) return Number(ownerId);
    try {
      const u = localStorage.getItem('tzwifi_user');
      if (u) {
        const parsed = JSON.parse(u);
        return Number(parsed.parent_owner_id || parsed.id);
      }
    } catch {}
    return undefined;
  }, [ownerId]);

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('tzwifi_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (resolvedOwnerId) headers['x-owner-id'] = String(resolvedOwnerId);
    return headers;
  }, [resolvedOwnerId]);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [batches, setBatches] = useState<VoucherBatch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(20);
  const [batchPrefix, setBatchPrefix] = useState<string>('INFO');
  const [codeLength, setCodeLength] = useState<number>(6);
  const [printFormat, setPrintFormat] = useState<'A4_GRID' | 'THERMAL_58MM' | 'THERMAL_80MM'>('A4_GRID');
  // Selected site filter state: 'ALL' or router ID number
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<number | 'ALL'>(selectedRouterId ?? 'ALL');
  const [targetRouterId, setTargetRouterId] = useState<number | 'ALL'>(selectedRouterId ?? 'ALL');

  useEffect(() => {
    if (selectedRouterId !== undefined) {
      setSelectedSiteFilter(selectedRouterId);
      setTargetRouterId(selectedRouterId);
    } else {
      setSelectedSiteFilter('ALL');
      setTargetRouterId('ALL');
    }
  }, [selectedRouterId]);

  const handleSiteFilterChange = (newSite: number | 'ALL') => {
    setSelectedSiteFilter(newSite);
    setTargetRouterId(newSite);
    setVoucherPage(1);
    setBatchPage(1);
    onSelectRouter?.(newSite === 'ALL' ? undefined : newSite);
  };

  // Voucher inventory pagination & filters (10, 20, 30, 40, ALL)
  const [voucherPage, setVoucherPage] = useState<number>(1);
  const [voucherPageSize, setVoucherPageSize] = useState<PageSizeOption>(20);
  const [voucherSearch, setVoucherSearch] = useState<string>('');
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<string>('ALL');

  // Batch table pagination (10, 20, 30, 40, ALL)
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchPageSize, setBatchPageSize] = useState<PageSizeOption>(10);
  
  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printableList, setPrintableList] = useState<Voucher[]>([]);
  const [activePrintBatchId, setActivePrintBatchId] = useState<string | undefined>(undefined);
  const [activePrintSiteName, setActivePrintSiteName] = useState<string | undefined>(undefined);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // In-app delete confirmation modal state (eliminates iframe confirm() suppression)
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'single'; id: number; code: string }
    | { type: 'batch'; batchId: string; count?: number }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const fetchVouchers = async () => {
    try {
      if (!resolvedOwnerId) {
        setVouchers([]);
        return;
      }
      const url = `/api/v1/vouchers?ownerId=${resolvedOwnerId}`;
      const res = await fetch(url, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        // Client-side strict tenant filter: ONLY vouchers strictly matching resolvedOwnerId
        const safeData = Array.isArray(data)
          ? (data as Voucher[]).filter((v) => Number(v.owner_id) === resolvedOwnerId)
          : [];
        setVouchers(safeData);
      } else {
        setVouchers([]);
      }
    } catch (err) {
      console.error(err);
      setVouchers([]);
    }
  };

  const fetchBatches = async () => {
    try {
      if (!resolvedOwnerId) {
        setBatches([]);
        return;
      }
      const url = `/api/v1/vouchers/batches?ownerId=${resolvedOwnerId}`;
      const res = await fetch(url, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        // Client-side strict tenant filter: ONLY batches strictly matching resolvedOwnerId
        const safeData = Array.isArray(data)
          ? (data as VoucherBatch[]).filter((b) => Number(b.owner_id) === resolvedOwnerId)
          : [];
        setBatches(safeData);
      } else {
        setBatches([]);
      }
    } catch (err) {
      console.error(err);
      setBatches([]);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/v1/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        if (data.length > 0) setSelectedPlanId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchVouchers(), fetchBatches(), fetchPlans()]).finally(() => setLoading(false));
  }, [resolvedOwnerId]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/v1/vouchers/generate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          planId: selectedPlanId,
          quantity: Number(quantity),
          prefix: batchPrefix || 'TZ',
          codeLength: Number(codeLength) || 6,
          printFormat,
          ownerId: resolvedOwnerId || undefined,
          routerId: targetRouterId !== 'ALL' ? Number(targetRouterId) : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const targetRouter = targetRouterId !== 'ALL' ? routers.find((r) => r.id === targetRouterId) : undefined;
        const siteLabelText = targetRouter ? ` • Site: 📍 ${targetRouter.name}` : ' • 🌐 Sites Zote';
        setSuccessNotice(`Hongera! Vocha ${data.count} zimetengenezwa kikamilifu (${data.batchTag}${siteLabelText})`);
        setPrintableList(data.vouchers || []);
        setActivePrintBatchId(data.batchTag);
        setActivePrintSiteName(targetRouter?.name);
        setPrintModalOpen(true);
        await Promise.all([fetchVouchers(), fetchBatches()]);
      } else {
        alert(data.error || 'Imeshindwa kuzalisha kundi la vocha.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Hitilafu ya kuungana na kituo cha vocha.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintBatch = async (batchId: string) => {
    try {
      const q = resolvedOwnerId ? `?ownerId=${resolvedOwnerId}` : '';
      const res = await fetch(`/api/v1/vouchers/batches/${batchId}${q}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data: VoucherBatch = await res.json();
        const batchSite = data.router_name || routers.find((r) => r.id === data.router_id)?.name;
        setActivePrintSiteName(batchSite);
        if (data.vouchers && data.vouchers.length > 0) {
          setPrintableList(data.vouchers);
          setActivePrintBatchId(batchId);
          setPrintModalOpen(true);
        } else {
          // Fallback to filtering local vouchers
          const filtered = vouchers.filter((v) => v.batch_tag === batchId);
          setPrintableList(filtered);
          setActivePrintBatchId(batchId);
          setPrintModalOpen(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintAllAvailable = () => {
    const listToPrint = currentSiteVouchers.filter((v) => v.status === 'AVAILABLE');
    setPrintableList(listToPrint);
    setActivePrintBatchId(undefined);
    setActivePrintSiteName(activeSiteObj?.name);
    setPrintModalOpen(true);
  };

  // Open in-app delete confirmation modal
  const handleDeleteVoucher = (id: number, code: string) => {
    setDeleteTarget({ type: 'single', id, code });
  };

  const handleDeleteBatch = (batchId: string, count?: number) => {
    setDeleteTarget({ type: 'batch', batchId, count });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'single') {
        const { id, code } = deleteTarget;
        setVouchers((prev) => prev.filter((v) => v.id !== id && v.code !== code));
        const res = await fetch(`/api/v1/vouchers/${id}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        if (!res.ok) {
          await fetch(`/api/v1/vouchers/code/${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: authHeaders,
          });
        }
        setSuccessNotice(`Vocha '${code}' imefutwa kikamilifu!`);
        setTimeout(() => setSuccessNotice(null), 4000);
        await Promise.all([fetchVouchers(), fetchBatches()]);
      } else if (deleteTarget.type === 'batch') {
        const { batchId } = deleteTarget;
        setBatches((prev) => prev.filter((b) => b.batch_id !== batchId && (b as any).batch_tag !== batchId));
        setVouchers((prev) => prev.filter((v) => v.batch_tag !== batchId));
        const q = resolvedOwnerId ? `?ownerId=${resolvedOwnerId}` : '';
        const res = await fetch(`/api/v1/vouchers/batches/${encodeURIComponent(batchId)}${q}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        if (res.ok) {
          setSuccessNotice(`Kundi la vocha (${batchId}) na kadi zake zimefutwa kikamilifu!`);
          setTimeout(() => setSuccessNotice(null), 4000);
        }
        await Promise.all([fetchBatches(), fetchVouchers()]);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Hitilafu ya kufuta: ' + (err.message || 'Hitilafu ya mtandao'));
    } finally {
      setDeleting(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const activeSiteObj = useMemo(() => {
    if (selectedSiteFilter === 'ALL') return null;
    return routers.find((r) => r.id === selectedSiteFilter) || null;
  }, [routers, selectedSiteFilter]);

  // Vouchers belonging to selected site (or all)
  const currentSiteVouchers = useMemo(() => {
    if (selectedSiteFilter === 'ALL') return vouchers;
    return vouchers.filter(
      (v) => v.router_id && Number(v.router_id) === Number(selectedSiteFilter)
    );
  }, [vouchers, selectedSiteFilter]);

  // Inventory stats for selected site
  const siteStats = useMemo(() => {
    const list = currentSiteVouchers;
    const available = list.filter((v) => v.status === 'AVAILABLE').length;
    const active = list.filter((v) => v.status === 'ACTIVE').length;
    const expired = list.filter((v) => v.status === 'EXPIRED').length;
    const totalVal = list.reduce((sum, v) => sum + (v.plan?.price || 0), 0);
    return {
      total: list.length,
      available,
      active,
      expired,
      totalVal,
    };
  }, [currentSiteVouchers]);

  // Batches filtered strictly by selected site
  const filteredBatches = useMemo(() => {
    if (selectedSiteFilter === 'ALL') return batches;
    return batches.filter(
      (b) => b.router_id && Number(b.router_id) === Number(selectedSiteFilter)
    );
  }, [batches, selectedSiteFilter]);

  // Reset pagination when filters change
  useEffect(() => {
    setVoucherPage(1);
  }, [voucherSearch, voucherStatusFilter, selectedSiteFilter, vouchers.length]);

  useEffect(() => {
    setBatchPage(1);
  }, [selectedSiteFilter, batches.length]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesSite =
        selectedSiteFilter === 'ALL' ||
        (v.router_id && Number(v.router_id) === Number(selectedSiteFilter));
      const matchesStatus = voucherStatusFilter === 'ALL' || v.status === voucherStatusFilter;
      const q = voucherSearch.toLowerCase();
      const matchesSearch =
        !q ||
        v.code.toLowerCase().includes(q) ||
        (v.batch_tag && v.batch_tag.toLowerCase().includes(q)) ||
        (v.plan?.name && v.plan.name.toLowerCase().includes(q)) ||
        (v.router_name && v.router_name.toLowerCase().includes(q));
      return matchesSite && matchesStatus && matchesSearch;
    });
  }, [vouchers, selectedSiteFilter, voucherStatusFilter, voucherSearch]);

  const paginatedVouchers =
    voucherPageSize === 'ALL'
      ? filteredVouchers
      : filteredVouchers.slice((voucherPage - 1) * voucherPageSize, voucherPage * voucherPageSize);

  const paginatedBatches =
    batchPageSize === 'ALL'
      ? filteredBatches
      : filteredBatches.slice((batchPage - 1) * batchPageSize, batchPage * batchPageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>FreeRADIUS 3.x Atomic Voucher Engine</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Batch Voucher Generator & Print Station
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-generate physical scratchcards with QR codes for retail shops, hotels, or counter sales (A4 & Thermal POS 58mm/80mm)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={resolvedOwnerId ? `/api/v1/export/vouchers/csv?ownerId=${resolvedOwnerId}` : '/api/v1/export/vouchers/csv'}
            download="tzwifi_vouchers.csv"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pakua CSV (Export)</span>
          </a>

          <button
            type="button"
            onClick={handlePrintAllAvailable}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>
              Print Available ({siteStats.available})
              {selectedSiteFilter !== 'ALL' && activeSiteObj ? ` • ${activeSiteObj.name}` : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Top Site Selection Tabs Bar */}
      {routers.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600" />
              <span className="text-xs font-bold text-slate-800">Chagua Site / Eneo la Vocha:</span>
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                (Hubadilisha idadi ya vocha, kundi la batches, na mtandao wa kuchapisha)
              </span>
            </div>
            {selectedSiteFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => handleSiteFilterChange('ALL')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer self-start sm:self-auto"
              >
                Tazama Sites Zote (Show All)
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSiteFilterChange('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedSiteFilter === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-600/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>🌐 Sites Zote</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  selectedSiteFilter === 'ALL' ? 'bg-cyan-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {vouchers.length} vocha • {batches.length} batches
              </span>
            </button>

            {routers.map((r) => {
              const rVoucherCount = vouchers.filter((v) => v.router_id && Number(v.router_id) === r.id).length;
              const rBatchCount = batches.filter((b) => b.router_id && Number(b.router_id) === r.id).length;
              const isSelected = selectedSiteFilter === r.id;

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSiteFilterChange(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-sm ring-2 ring-cyan-600/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                >
                  <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-cyan-600'}`} />
                  <span>{r.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-cyan-700 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {rVoucherCount} vocha • {rBatchCount} {rBatchCount === 1 ? 'batch' : 'batches'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setPrintModalOpen(true)}
            className="underline font-bold hover:text-emerald-950"
          >
            Open Printable Layout
          </button>
        </div>
      )}

      {/* Generator Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <span>Generate New Voucher Batch (Atomic FreeRADIUS AAA Insert)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            Auto-synced with MySQL radcheck & radreply
          </span>
        </div>

        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Plan Selector */}
            <div className="sm:col-span-2 xl:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Select Package / Plan
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.split('(')[0]} - {formatTzs(p.price)} ({p.rate_limit})
                  </option>
                ))}
              </select>
            </div>

            {/* Site / MikroTik Router Selector */}
            <div className="sm:col-span-2 xl:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                <span>Site / MikroTik ya Vocha Hizi</span>
              </label>
              <select
                value={targetRouterId}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  setTargetRouterId(val);
                  handleSiteFilterChange(val);
                }}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 text-slate-800"
              >
                <option value="ALL">🌐 Zitumike Sites Zote (All Sites / Global)</option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    📍 {r.name} ({r.ip_address})
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Presets */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Batch Quantity
              </label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-mono"
              >
                <option value={10}>10 Cards</option>
                <option value={20}>20 Cards</option>
                <option value={50}>50 Cards</option>
                <option value={100}>100 Cards</option>
                <option value={200}>200 Cards</option>
                <option value={500}>500 Cards</option>
              </select>
            </div>

            {/* Prefix */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Prefix Code
              </label>
              <input
                type="text"
                value={batchPrefix}
                onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. TZ or VIP"
                maxLength={5}
                className="w-full text-xs font-bold font-mono px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 uppercase"
              />
            </div>

            {/* Code Length */}
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                PIN Digits Length
              </label>
              <select
                value={codeLength}
                onChange={(e) => setCodeLength(Number(e.target.value))}
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-mono"
              >
                <option value={6}>6 Digits (Standard)</option>
                <option value={7}>7 Digits</option>
                <option value={8}>8 Digits (Ultra-Secure)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Total value of this batch:{' '}
              <strong className="text-slate-900 font-bold font-mono text-sm">
                {formatTzs((selectedPlan?.price || 1000) * quantity)}
              </strong>
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full sm:w-auto py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Generate & Open Print Preview</span>
            </button>
          </div>
        </form>
      </div>

      {/* Generated Batches Table (Reprint Center) */}
      {batches.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>
                  Voucher Batches History ({filteredBatches.length}{' '}
                  {selectedSiteFilter === 'ALL' ? 'Batches Generated' : `Batches - Site: ${activeSiteObj?.name}`})
                </span>
              </h3>
              {selectedSiteFilter !== 'ALL' && activeSiteObj && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Site: {activeSiteObj.name}</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedSiteFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => handleSiteFilterChange('ALL')}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  Onyesha Batches Zote ({batches.length})
                </button>
              )}
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Click &quot;Print&quot; to reprint any batch
              </span>
            </div>
          </div>

          {filteredBatches.length === 0 ? (
            <div className="p-8 text-center bg-slate-50">
              <p className="text-xs text-slate-600 font-medium">
                Hakuna batch ya vocha iliyotengenezwa kwa ajili ya site hii (<strong>{activeSiteObj?.name}</strong>).
              </p>
              <div className="mt-2.5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSiteFilterChange('ALL')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tazama Batches Zote ({batches.length})
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Batch ID</th>
                      <th className="px-4 py-3">Site / MikroTik</th>
                      <th className="px-4 py-3">Plan / Rate Limit</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Quantity</th>
                      <th className="px-4 py-3">Total Value</th>
                      <th className="px-4 py-3">Date Generated</th>
                      <th className="px-4 py-3 text-right">Reprint Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedBatches.map((batch) => {
                      const rObj = routers.find((r) => r.id === batch.router_id);
                      const siteDisplayName = batch.router_name || rObj?.name;

                      return (
                        <tr key={batch.id || batch.batch_id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-900">
                            {batch.batch_id}
                          </td>
                          <td className="px-4 py-3">
                            {batch.router_id ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                <MapPin className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                <span className="truncate max-w-[150px]" title={siteDisplayName || `Site #${batch.router_id}`}>
                                  {siteDisplayName || `Site #${batch.router_id}`}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                🌐 Sites Zote
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {batch.plan_name}
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-slate-900">
                            {formatTzs(batch.price)}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                              {batch.quantity} Cards
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-emerald-700">
                            {formatTzs(batch.price * batch.quantity)}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            {new Date(batch.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handlePrintBatch(batch.batch_id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Print Batch</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBatch(batch.batch_id, batch.quantity)}
                                className="inline-flex items-center p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                                title="Futa batch hii na vocha zake"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Batches Cards (< 768px) */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedBatches.map((batch) => {
                  const rObj = routers.find((r) => r.id === batch.router_id);
                  const siteDisplayName = batch.router_name || rObj?.name;

                  return (
                    <div key={batch.id || batch.batch_id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 block">BATCH ID</span>
                          <span className="font-mono font-bold text-indigo-950 text-sm">{batch.batch_id}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                            {batch.quantity} Cards
                          </span>
                          {batch.router_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                              <MapPin className="w-3 h-3 text-cyan-600" />
                              <span className="truncate max-w-[120px]">{siteDisplayName || `Site #${batch.router_id}`}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                              🌐 Sites Zote
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-slate-800">{batch.plan_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatTzs(batch.price)} / vocha
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-sans">Jumla ya Thamani</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {formatTzs(batch.price * batch.quantity)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(batch.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintBatch(batch.batch_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Print</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBatch(batch.batch_id, batch.quantity)}
                            className="inline-flex items-center p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                            title="Futa batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination bar for batches */}
              <TablePagination
                currentPage={batchPage}
                totalItems={filteredBatches.length}
                pageSize={batchPageSize}
                onPageChange={setBatchPage}
                onPageSizeChange={setBatchPageSize}
                itemName="batches"
              />
            </>
          )}
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-slate-900">
                Voucher Inventory ({currentSiteVouchers.length} {selectedSiteFilter === 'ALL' ? 'Total' : `Vocha - Site: ${activeSiteObj?.name}`})
              </h3>
              {selectedSiteFilter !== 'ALL' && activeSiteObj && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                  <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Site: {activeSiteObj.name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedSiteFilter === 'ALL'
                ? `Orodha ya vocha zote zilizopo kwenye mfumo (${vouchers.length} jumla ya mtandao)`
                : `Orodha ya vocha za ${activeSiteObj?.name} pekee (${currentSiteVouchers.length} vocha zilizosajiliwa)`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Router / Site filter */}
            {routers.length > 0 && (
              <select
                value={selectedSiteFilter}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                  handleSiteFilterChange(val);
                }}
                className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 text-slate-800"
              >
                <option value="ALL">🌐 Sites Zote ({vouchers.length} vocha)</option>
                {routers.map((r) => {
                  const rCount = vouchers.filter((v) => v.router_id && Number(v.router_id) === r.id).length;
                  return (
                    <option key={r.id} value={r.id}>
                      📍 {r.name} ({rCount} vocha)
                    </option>
                  );
                })}
              </select>
            )}

            {/* Status filter */}
            <select
              value={voucherStatusFilter}
              onChange={(e) => setVoucherStatusFilter(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Hali Zote (All Status)</option>
              <option value="AVAILABLE">AVAILABLE (Zilizopo)</option>
              <option value="ACTIVE">ACTIVE (Zinazotumika)</option>
              <option value="EXPIRED">EXPIRED (Zilizokwisha)</option>
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={voucherSearch}
                onChange={(e) => setVoucherSearch(e.target.value)}
                placeholder="Tafuta PIN, Plan, Batch..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 w-44 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Per-Site Inventory Breakdown Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
            <span className="text-slate-500 font-medium">Jumla ya Site:</span>
            <strong className="text-slate-900 font-bold">{siteStats.total}</strong>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-slate-500 font-medium">Zilizopo (Available):</span>
            <strong className="text-blue-700 font-bold">{siteStats.available}</strong>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-slate-500 font-medium">Zinazotumika (Active):</span>
            <strong className="text-emerald-700 font-bold">{siteStats.active}</strong>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span className="text-slate-500 font-medium">Thamani:</span>
            <strong className="text-slate-900 font-bold font-mono">{formatTzs(siteStats.totalVal)}</strong>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Code / PIN</th>
                <th className="px-4 py-3">Site / MikroTik</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Batch Tag</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Kitendo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-xs font-sans">
                    Hakuna vocha iliyopatikana kulingana na vigezo ulivyoweka.
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((v) => {
                  const rObj = routers.find((r) => r.id === v.router_id);
                  const siteDisplayName = v.router_name || rObj?.name;

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition font-mono">
                      <td className="px-4 py-3 font-bold text-indigo-900">
                        <div className="flex items-center gap-1.5">
                          <span>{v.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(v.code)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Nakili vocha"
                          >
                            {copiedCode === v.code ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-sans">
                        {v.router_id ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <MapPin className="w-3 h-3 text-cyan-600 shrink-0" />
                            <span
                              className="truncate max-w-[120px]"
                              title={siteDisplayName || `Site #${v.router_id}`}
                            >
                              {siteDisplayName || `Site #${v.router_id}`}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            🌐 Sites Zote
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-sans font-medium text-slate-800">
                        {v.plan?.name.split('(')[0] || `Plan #${v.plan_id}`}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {v.plan ? formatTzs(v.plan.price) : '-'}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.status === 'AVAILABLE'
                              ? 'bg-blue-50 text-blue-700'
                              : v.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {v.batch_tag || 'MNO-Auto'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteVoucher(v.id, v.code)}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 transition cursor-pointer"
                          title="Futa vocha hii"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Vouchers Cards (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedVouchers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Hakuna vocha iliyopatikana.
            </div>
          ) : (
            paginatedVouchers.map((v) => {
              const rObj = routers.find((r) => r.id === v.router_id);
              const siteDisplayName = v.router_name || rObj?.name;

              return (
                <div key={v.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block font-sans">VOCHA PIN</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-indigo-950 text-base tracking-wider">
                          {v.code}
                        </span>
                        {v.router_id ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                            <MapPin className="w-2.5 h-2.5 text-cyan-600" />
                            <span className="truncate max-w-[100px]">{siteDisplayName || `Site #${v.router_id}`}</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600">
                            🌐 Sites Zote
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(v.code)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedCode === v.code ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Imenakiliwa!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Nakili</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'AVAILABLE'
                            ? 'bg-blue-50 text-blue-700'
                            : v.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {v.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteVoucher(v.id, v.code)}
                        className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition"
                        title="Futa vocha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {v.plan?.name.split('(')[0] || `Plan #${v.plan_id}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Batch: {v.batch_tag || 'Auto'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black font-mono text-slate-900 text-sm">
                        {v.plan ? formatTzs(v.plan.price) : '-'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(v.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls (10, 20, 30, 40, ALL) */}
        <TablePagination
          currentPage={voucherPage}
          totalItems={filteredVouchers.length}
          pageSize={voucherPageSize}
          onPageChange={setVoucherPage}
          onPageSizeChange={setVoucherPageSize}
          itemName="vocha"
        />
      </div>

      {/* Production-Grade Voucher Print Layout Modal (A4 Grid & Thermal POS) */}
      <VoucherPrintLayout
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        vouchers={printableList}
        plan={selectedPlan}
        batchId={activePrintBatchId}
        hotspotName={businessName || 'INFOTECH WiFi HIGH-SPEED'}
        siteName={activePrintSiteName || activeSiteObj?.name}
      />

      {/* In-App Delete Confirmation Modal (Works seamlessly across all webviews and iframes) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {deleteTarget.type === 'single' ? 'Thibitisha Kufuta Vocha' : 'Thibitisha Kufuta Kundi (Batch)'}
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  {deleteTarget.type === 'single' ? 'Ondoa vocha hii moja kwa moja' : 'Futa kundi zima la vocha zilizochapishwa'}
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 rounded-xl p-3.5 border border-rose-100 text-xs text-rose-900 leading-relaxed font-sans">
              {deleteTarget.type === 'single' ? (
                <>
                  Je, una uhakika unataka kufuta vocha yenye PIN{' '}
                  <span className="font-mono font-bold text-rose-950 px-1.5 py-0.5 bg-rose-200/60 rounded">
                    {deleteTarget.code}
                  </span>
                  ? Mtumiaji huyu ataondolewa kwenye MikroTik na mfumo wa vocha moja kwa moja.
                </>
              ) : (
                <>
                  Je, una uhakika unataka kufuta kundi{' '}
                  <span className="font-mono font-bold text-rose-950 px-1.5 py-0.5 bg-rose-200/60 rounded">
                    {deleteTarget.batchId}
                  </span>
                  {deleteTarget.count ? ` (${deleteTarget.count} vocha)` : ''} pamoja na vocha zake zote?
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Ghairi (Cancel)
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Inafuta...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ndio, Futa Moja kwa Moja</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
