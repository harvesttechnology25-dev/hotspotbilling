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
  AlertTriangle,
} from 'lucide-react';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';
import { RouterItem } from '../../types/index.ts';

export const VoucherStation: React.FC<{
  ownerId?: number;
  businessName?: string;
  selectedRouterId?: number;
  routers?: RouterItem[];
  onSelectRouter?: (id: number | undefined) => void;
  onNavigateToPlans?: () => void;
}> = ({
  ownerId,
  businessName,
  selectedRouterId,
  routers = [],
  onSelectRouter,
  onNavigateToPlans,
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
  const [activePrintPlan, setActivePrintPlan] = useState<Plan | undefined>(undefined);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // In-app delete confirmation modal state (eliminates iframe confirm() suppression)
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'single'; id: number; code: string }
    | { type: 'batch'; batchId: string; count?: number }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Delete Modal State (allows deleting all vouchers by status: AVAILABLE/UNUSED, ACTIVE/USED, EXPIRED, ALL)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteStatus, setBulkDeleteStatus] = useState<'AVAILABLE' | 'ACTIVE' | 'EXPIRED' | 'ALL'>('AVAILABLE');
  const [bulkDeleteSiteScope, setBulkDeleteSiteScope] = useState<'CURRENT_SITE' | 'ALL_SITES'>('CURRENT_SITE');

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
      if (!resolvedOwnerId) {
        setPlans([]);
        return;
      }
      const res = await fetch(`/api/v1/plans?ownerId=${resolvedOwnerId}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        // Client-side strict filter: ONLY packages created by this owner
        const safePlans = Array.isArray(data)
          ? (data as Plan[]).filter(
              (p) =>
                p.owner_id != null &&
                Number(p.owner_id) === Number(resolvedOwnerId) &&
                p.owner_name !== 'Japhet Hotspot'
            )
          : [];
        setPlans(safePlans);
        if (safePlans.length > 0) {
          setSelectedPlanId((prev) => safePlans.some((p) => p.id === prev) ? prev : safePlans[0].id);
        } else {
          setSelectedPlanId(0);
        }
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to fetch owner plans:', err);
      setPlans([]);
    }
  };

  const compatiblePlans = useMemo(() => {
    if (targetRouterId === 'ALL') {
      return plans;
    }
    return plans.filter((p) => p.router_id == null || Number(p.router_id) === Number(targetRouterId));
  }, [plans, targetRouterId]);

  useEffect(() => {
    if (compatiblePlans.length > 0) {
      if (!compatiblePlans.some((p) => p.id === selectedPlanId)) {
        setSelectedPlanId(compatiblePlans[0].id);
      }
    }
  }, [compatiblePlans, selectedPlanId]);

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
        setActivePrintPlan(selectedPlan || undefined);
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
        const bPlan =
          plans.find((p) => Number(p.id) === Number(data.plan_id)) ||
          (data.plan_name ? ({ id: data.plan_id, name: data.plan_name, price: data.price } as Plan) : undefined);
        setActivePrintPlan(bPlan);
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

  const handleOpenBulkDelete = (status?: 'AVAILABLE' | 'ACTIVE' | 'EXPIRED' | 'ALL') => {
    let initialStatus: 'AVAILABLE' | 'ACTIVE' | 'EXPIRED' | 'ALL' = 'AVAILABLE';
    if (status === 'AVAILABLE' || status === 'ACTIVE' || status === 'EXPIRED' || status === 'ALL') {
      initialStatus = status;
    } else if (
      voucherStatusFilter === 'AVAILABLE' ||
      voucherStatusFilter === 'ACTIVE' ||
      voucherStatusFilter === 'EXPIRED'
    ) {
      initialStatus = voucherStatusFilter as any;
    }
    setBulkDeleteStatus(initialStatus);
    setBulkDeleteSiteScope(selectedSiteFilter === 'ALL' ? 'ALL_SITES' : 'CURRENT_SITE');
    setBulkDeleteModalOpen(true);
  };

  const handleExecuteBulkDelete = async () => {
    if (bulkDeleteEligibleCount === 0) return;
    setDeleting(true);
    try {
      const targetRouterId =
        bulkDeleteSiteScope === 'CURRENT_SITE' && selectedSiteFilter !== 'ALL'
          ? selectedSiteFilter
          : 'ALL';

      const res = await fetch('/api/v1/vouchers/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          ownerId: resolvedOwnerId,
          status: bulkDeleteStatus,
          routerId: targetRouterId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessNotice(data.message || `Vocha ${data.count || 0} zimefutwa kikamilifu!`);
        setTimeout(() => setSuccessNotice(null), 4000);
        setBulkDeleteModalOpen(false);
        await Promise.all([fetchVouchers(), fetchBatches()]);
      } else {
        alert('Hitilafu: ' + (data.error || 'Imeshindikana kufuta vocha.'));
      }
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      alert('Hitilafu ya mtandao: ' + (err.message || 'Mtandao umeshindwa kuunganisha.'));
    } finally {
      setDeleting(false);
    }
  };

  const selectedPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return (
      compatiblePlans.find((p) => Number(p.id) === Number(selectedPlanId)) ||
      plans.find((p) => Number(p.id) === Number(selectedPlanId)) ||
      compatiblePlans[0] ||
      plans[0] ||
      null
    );
  }, [plans, compatiblePlans, selectedPlanId]);

  const currentPlanPrice = useMemo(() => {
    if (selectedPlan && selectedPlan.price != null && !isNaN(Number(selectedPlan.price))) {
      return Number(selectedPlan.price);
    }
    return 1000;
  }, [selectedPlan]);

  const safeQuantity = Math.max(1, Number(quantity) || 0);
  const totalBatchValue = currentPlanPrice * safeQuantity;

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

  // All sites stats for modal display
  const allSitesStats = useMemo(() => {
    const available = vouchers.filter((v) => v.status === 'AVAILABLE').length;
    const active = vouchers.filter((v) => v.status === 'ACTIVE').length;
    const expired = vouchers.filter((v) => v.status === 'EXPIRED').length;
    return {
      total: vouchers.length,
      available,
      active,
      expired,
    };
  }, [vouchers]);

  // Bulk delete eligible count based on active scope & status
  const bulkDeleteEligibleCount = useMemo(() => {
    const list =
      bulkDeleteSiteScope === 'CURRENT_SITE' && selectedSiteFilter !== 'ALL'
        ? currentSiteVouchers
        : vouchers;
    if (bulkDeleteStatus === 'ALL') return list.length;
    return list.filter((v) => v.status === bulkDeleteStatus).length;
  }, [vouchers, currentSiteVouchers, bulkDeleteSiteScope, selectedSiteFilter, bulkDeleteStatus]);

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
  }, [voucherSearch, voucherStatusFilter, selectedSiteFilter]);

  useEffect(() => {
    setBatchPage(1);
  }, [selectedSiteFilter]);

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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold uppercase text-slate-500">
                  Select Package / Plan
                </label>
                {onNavigateToPlans && (
                  <button
                    type="button"
                    onClick={onNavigateToPlans}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    + Simamia Vifurushi
                  </button>
                )}
              </div>
              {compatiblePlans.length > 0 ? (
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                >
                  {compatiblePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name.split('(')[0]} - {formatTzs(p.price)} ({p.rate_limit})
                      {p.router_id ? ` [📍 ${p.router_name || `Router #${p.router_id}`}]` : ' [🌐 Global]'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between gap-2">
                  <div className="text-[11px] leading-tight">
                    <span className="font-bold">
                      {targetRouterId !== 'ALL'
                        ? 'Hakuna kifurushi kilichotengwa kwa ajili ya router hii au router zote.'
                        : 'Huna kifurushi ulichotengeneza bado.'}
                    </span>
                  </div>
                  {onNavigateToPlans && (
                    <button
                      type="button"
                      onClick={onNavigateToPlans}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg transition whitespace-nowrap cursor-pointer shadow-xs"
                    >
                      ➕ Tengeneza Kifurushi
                    </button>
                  )}
                </div>
              )}
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
                {routers
                  .filter((r) => r.id !== 3 && !r.name?.toLowerCase().includes('mwenge'))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      📍 {r.name} ({r.ip_address})
                    </option>
                  ))}
              </select>
              {targetRouterId !== 'ALL' ? (
                <p className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1">
                  <span>🔒 Vocha hizi zitafungwa kwenye router hii pekee (kusiwe na kushare vocha).</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 font-medium mt-1.5">
                  🌐 Vocha za jumla (zinaweza kutumika kwenye router yoyote ya eneo hili).
                </p>
              )}
            </div>

            {/* Quantity Input & Presets */}
            <div className="sm:col-span-2 xl:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                <span>Idadi ya Vocha (Quantity)</span>
                <span className="text-[10px] text-indigo-600 font-mono font-bold">{quantity} Cards</span>
              </label>
              <div className="space-y-1.5">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  required
                  value={quantity || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setQuantity(isNaN(val) ? 0 : val);
                  }}
                  className="w-full text-xs font-bold font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900"
                  placeholder="Andika idadi ya vocha, mfano: 20"
                />
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {[10, 20, 50, 100, 200, 500].map((presetQty) => (
                    <button
                      key={presetQty}
                      type="button"
                      onClick={() => setQuantity(presetQty)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer shrink-0 ${
                        quantity === presetQty
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {presetQty}
                    </button>
                  ))}
                </div>
              </div>
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
                className="w-full text-xs font-bold font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 uppercase"
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
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 font-mono"
              >
                <option value={6}>6 Digits (Standard)</option>
                <option value={7}>7 Digits</option>
                <option value={8}>8 Digits (Ultra-Secure)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-2xl w-full sm:w-auto shadow-2xs">
              <span className="font-semibold text-slate-600">Total value of this batch:</span>
              <strong className="text-emerald-700 font-extrabold font-mono text-base">
                {formatTzs(totalBatchValue)}
              </strong>
              <span className="text-[11px] text-slate-500 font-mono font-medium">
                ({safeQuantity} vocha × {formatTzs(currentPlanPrice)})
              </span>
            </div>

            <button
              type="submit"
              disabled={generating || plans.length === 0 || safeQuantity < 1}
              className="w-full sm:w-auto py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{plans.length === 0 ? 'Tengeneza Kwanza Vifurushi' : `Tengeneza Vocha ${safeQuantity} (Generate & Print)`}</span>
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

            {/* Quick Bulk Delete Button */}
            <button
              type="button"
              onClick={() => handleOpenBulkDelete(voucherStatusFilter as any)}
              disabled={currentSiteVouchers.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              title="Futa vocha kwa mkupuo (Unused, Active, Expired au Zote)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {voucherStatusFilter === 'AVAILABLE'
                  ? `Futa Zote Zilizopo (${siteStats.available})`
                  : voucherStatusFilter === 'ACTIVE'
                  ? `Futa Zote Zinazotumika (${siteStats.active})`
                  : voucherStatusFilter === 'EXPIRED'
                  ? `Futa Zote Zilizokwisha (${siteStats.expired})`
                  : `Futa Zote (${siteStats.total})`}
              </span>
            </button>

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

        {/* Per-Site Inventory Breakdown Stats Banner with Quick Status Filters & Delete Triggers */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs">
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/60 border border-slate-200/60">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
              <span className="text-slate-500 font-medium text-[11px]">Jumla:</span>
              <strong className="text-slate-900 font-bold">{siteStats.total}</strong>
            </div>
            {siteStats.total > 0 && (
              <button
                type="button"
                onClick={() => handleOpenBulkDelete('ALL')}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline cursor-pointer bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                title="Futa vocha zote bila kujali hali (Delete All)"
              >
                Futa zote
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/60 border border-blue-200/60">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
              <span className="text-slate-500 font-medium text-[11px]">Zilizopo:</span>
              <strong className="text-blue-700 font-bold">{siteStats.available}</strong>
            </div>
            {siteStats.available > 0 && (
              <button
                type="button"
                onClick={() => handleOpenBulkDelete('AVAILABLE')}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline cursor-pointer bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                title="Futa vocha zote zisizotumika (Delete All Unused)"
              >
                Futa zote
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/60 border border-emerald-200/60">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
              <span className="text-slate-500 font-medium text-[11px]">Zinazotumika:</span>
              <strong className="text-emerald-700 font-bold">{siteStats.active}</strong>
            </div>
            {siteStats.active > 0 && (
              <button
                type="button"
                onClick={() => handleOpenBulkDelete('ACTIVE')}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline cursor-pointer bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                title="Futa vocha zote zinazotumika sasa (Delete All Active)"
              >
                Futa zote
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/60 border border-amber-200/60">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <span className="text-slate-500 font-medium text-[11px]">Zilizokwisha:</span>
              <strong className="text-amber-700 font-bold">{siteStats.expired}</strong>
            </div>
            {siteStats.expired > 0 && (
              <button
                type="button"
                onClick={() => handleOpenBulkDelete('EXPIRED')}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline cursor-pointer bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                title="Futa vocha zote zilizokwisha au zilizotumika (Delete All Expired/Used)"
              >
                Futa zote
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/60 border border-slate-200/60 col-span-2 sm:col-span-1">
            <span className="text-slate-500 font-medium text-[11px]">Thamani:</span>
            <strong className="text-slate-900 font-bold font-mono text-xs">{formatTzs(siteStats.totalVal)}</strong>
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
                        {v.code?.toUpperCase().startsWith('FREE-') || v.batch_tag?.toUpperCase().includes('FREE_TRIAL')
                          ? 'Majaribio ya Bure (Free Trial)'
                          : v.plan?.name.split('(')[0] || `Plan #${v.plan_id}`}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {v.code?.toUpperCase().startsWith('FREE-') || v.batch_tag?.toUpperCase().includes('FREE_TRIAL') || (v.plan && v.plan.price === 0) ? (
                          <span className="text-cyan-700 font-bold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-[10px]">Bure (0 TZS)</span>
                        ) : v.plan ? (
                          formatTzs(v.plan.price)
                        ) : (
                          '-'
                        )}
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
        plan={activePrintPlan || selectedPlan || undefined}
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

      {/* In-App Bulk Delete Modal for Vouchers by Status */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Futa Vocha kwa Mkupuo (Delete All Vouchers)
                </h3>
                <p className="text-xs text-slate-500 font-sans">
                  Chagua aina ya vocha unazotaka kufuta: zilizopo, zinazotumika, au zilizokwisha muda.
                </p>
              </div>
            </div>

            {/* Scope Selection: Current Site vs All Sites */}
            {routers.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Eneo la Vocha (Site Scope):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkDeleteSiteScope('CURRENT_SITE')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center gap-2 ${
                      bulkDeleteSiteScope === 'CURRENT_SITE'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                    <div className="truncate">
                      <div className="font-bold truncate">
                        {selectedSiteFilter === 'ALL'
                          ? 'Sites Zote'
                          : activeSiteObj?.name || `Site #${selectedSiteFilter}`}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {currentSiteVouchers.length} vocha zilizopo hapa
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkDeleteSiteScope('ALL_SITES')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer flex items-center gap-2 ${
                      bulkDeleteSiteScope === 'ALL_SITES'
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-sm">🌐</span>
                    <div className="truncate">
                      <div className="font-bold truncate">Sites Zote za Mfumo</div>
                      <div className="text-[10px] text-slate-500">
                        {vouchers.length} vocha kwa ujumla
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Status Selection Cards */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Chagua Hali ya Vocha za Kufuta (Select Status):
              </label>

              <div className="grid grid-cols-1 gap-2">
                {/* 1. AVAILABLE / UNUSED */}
                <button
                  type="button"
                  onClick={() => setBulkDeleteStatus('AVAILABLE')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                    bulkDeleteStatus === 'AVAILABLE'
                      ? 'border-blue-500 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <strong className="text-xs font-bold text-slate-900">
                        Zisizotumika / Zilizopo (Unused / Available)
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4.5">
                      Vocha ambazo bado hazijatumiwa na mteja yeyote (tayari kuuzwa).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-blue-100 text-blue-800 shrink-0">
                    {bulkDeleteSiteScope === 'CURRENT_SITE' && selectedSiteFilter !== 'ALL'
                      ? siteStats.available
                      : allSitesStats.available}{' '}
                    vocha
                  </span>
                </button>

                {/* 2. ACTIVE / USED */}
                <button
                  type="button"
                  onClick={() => setBulkDeleteStatus('ACTIVE')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                    bulkDeleteStatus === 'ACTIVE'
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      <strong className="text-xs font-bold text-slate-900">
                        Zinazotumika (Used / Active)
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4.5">
                      Vocha ambazo wateja wameziingiza na muda wao bado unaendelea sasa.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-emerald-100 text-emerald-800 shrink-0">
                    {bulkDeleteSiteScope === 'CURRENT_SITE' && selectedSiteFilter !== 'ALL'
                      ? siteStats.active
                      : allSitesStats.active}{' '}
                    vocha
                  </span>
                </button>

                {/* 3. EXPIRED */}
                <button
                  type="button"
                  onClick={() => setBulkDeleteStatus('EXPIRED')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                    bulkDeleteStatus === 'EXPIRED'
                      ? 'border-amber-500 bg-amber-50/60 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <strong className="text-xs font-bold text-slate-900">
                        Zilizokwisha Muda (Expired)
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4.5">
                      Vocha zilizotumiwa na muda wake wa intaneti umemalizika kabisa.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-amber-100 text-amber-800 shrink-0">
                    {bulkDeleteSiteScope === 'CURRENT_SITE' && selectedSiteFilter !== 'ALL'
                      ? siteStats.expired
                      : allSitesStats.expired}{' '}
                    vocha
                  </span>
                </button>

                {/* 4. ALL */}
                <button
                  type="button"
                  onClick={() => setBulkDeleteStatus('ALL')}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between gap-3 ${
                    bulkDeleteStatus === 'ALL'
                      ? 'border-rose-500 bg-rose-50/60 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <strong className="text-xs font-bold text-rose-950">
                        Futa Vocha Zote Bila Kujali Hali (Delete All)
                      </strong>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4.5">
                      Futa vocha zote zilizopo: unused, active na expired kwa pamoja.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black font-mono bg-rose-100 text-rose-800 shrink-0">
                    {bulkDeleteSiteScope === 'CURRENT_SITE' && selectedSiteFilter !== 'ALL'
                      ? siteStats.total
                      : allSitesStats.total}{' '}
                    vocha
                  </span>
                </button>
              </div>
            </div>

            {/* Warning Box */}
            <div className="bg-rose-50 rounded-2xl p-3.5 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  {bulkDeleteEligibleCount > 0
                    ? `Vocha ${bulkDeleteEligibleCount} zitafutwa kabisa!`
                    : 'Hakuna vocha iliyopatikana kwenye kundi hili.'}
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed">
                  Vocha hizi zitaondolewa kwenye mfumo na kwenye FreeRADIUS AAA database. Kitendo hiki hakiwezi kurejeshwa.
                </p>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Ghairi (Cancel)
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                disabled={deleting || bulkDeleteEligibleCount === 0}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Inafuta Vocha {bulkDeleteEligibleCount}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {bulkDeleteStatus === 'AVAILABLE'
                        ? `Futa Zote Zilizopo (${bulkDeleteEligibleCount})`
                        : bulkDeleteStatus === 'ACTIVE'
                        ? `Futa Zote Active (${bulkDeleteEligibleCount})`
                        : bulkDeleteStatus === 'EXPIRED'
                        ? `Futa Zote Expired (${bulkDeleteEligibleCount})`
                        : `Futa Vocha Zote (${bulkDeleteEligibleCount})`}
                    </span>
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
