import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

export const VoucherStation: React.FC<{ ownerId?: number; businessName?: string }> = ({
  ownerId,
  businessName,
}) => {
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
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const fetchVouchers = async () => {
    try {
      const url = ownerId ? `/api/v1/vouchers?ownerId=${ownerId}` : '/api/v1/vouchers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVouchers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBatches = async () => {
    try {
      const url = ownerId ? `/api/v1/vouchers/batches?ownerId=${ownerId}` : '/api/v1/vouchers/batches';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (err) {
      console.error(err);
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
  }, [ownerId]);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setSuccessNotice(null);

    try {
      const res = await fetch('/api/v1/vouchers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlanId,
          quantity: Number(quantity),
          prefix: batchPrefix || 'TZ',
          codeLength: Number(codeLength) || 6,
          printFormat,
          ownerId: ownerId || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessNotice(`Successfully generated ${data.count} vouchers (${data.batchTag})`);
        setPrintableList(data.vouchers || []);
        setActivePrintBatchId(data.batchTag);
        setPrintModalOpen(true);
        fetchVouchers();
        fetchBatches();
      } else {
        alert(data.error || 'Failed to generate batch.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error communicating with voucher generator service.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintBatch = async (batchId: string) => {
    try {
      const res = await fetch(`/api/v1/vouchers/batches/${batchId}`);
      if (res.ok) {
        const data: VoucherBatch = await res.json();
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
    const available = vouchers.filter((v) => v.status === 'AVAILABLE');
    setPrintableList(available);
    setActivePrintBatchId(undefined);
    setPrintModalOpen(true);
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Reset voucher pagination when filters change
  useEffect(() => {
    setVoucherPage(1);
  }, [voucherSearch, voucherStatusFilter, vouchers.length]);

  const filteredVouchers = vouchers.filter((v) => {
    const matchesStatus = voucherStatusFilter === 'ALL' || v.status === voucherStatusFilter;
    const q = voucherSearch.toLowerCase();
    const matchesSearch =
      !q ||
      v.code.toLowerCase().includes(q) ||
      (v.batch_tag && v.batch_tag.toLowerCase().includes(q)) ||
      (v.plan?.name && v.plan.name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const paginatedVouchers =
    voucherPageSize === 'ALL'
      ? filteredVouchers
      : filteredVouchers.slice((voucherPage - 1) * voucherPageSize, voucherPage * voucherPageSize);

  const paginatedBatches =
    batchPageSize === 'ALL'
      ? batches
      : batches.slice((batchPage - 1) * batchPageSize, batchPage * batchPageSize);

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
            href="/api/v1/export/vouchers/csv"
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
            <span>Print All Available ({vouchers.filter((v) => v.status === 'AVAILABLE').length})</span>
          </button>
        </div>
      </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Plan Selector */}
            <div className="sm:col-span-2">
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
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Voucher Batches History ({batches.length} Batches Generated)</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Click &quot;Print&quot; to reprint any batch
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Plan / Rate Limit</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Date Generated</th>
                  <th className="px-4 py-3 text-right">Reprint Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBatches.map((batch) => (
                  <tr key={batch.id || batch.batch_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-900">
                      {batch.batch_id}
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
                      <button
                        type="button"
                        onClick={() => handlePrintBatch(batch.batch_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition shadow-2xs cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Print Batch</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Batches Cards (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedBatches.map((batch) => (
              <div key={batch.id || batch.batch_id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">BATCH ID</span>
                    <span className="font-mono font-bold text-indigo-950 text-sm">{batch.batch_id}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    {batch.quantity} Cards
                  </span>
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
                  <button
                    type="button"
                    onClick={() => handlePrintBatch(batch.batch_id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Print Batch</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination bar for batches (10, 20, 30, 40, ALL) */}
          <TablePagination
            currentPage={batchPage}
            totalItems={batches.length}
            pageSize={batchPageSize}
            onPageChange={setBatchPage}
            onPageSizeChange={setBatchPageSize}
            itemName="batches"
          />
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Voucher Inventory ({vouchers.length} Total)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Orodha ya vocha zote zilizopo kwenye mfumo
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Code / PIN</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Batch Tag</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs font-sans">
                    Hakuna vocha iliyopatikana kulingana na vigezo ulivyoweka.
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((v) => (
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
                  </tr>
                ))
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
            paginatedVouchers.map((v) => (
              <div key={v.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block font-sans">VOCHA PIN</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-indigo-950 text-base tracking-wider">
                        {v.code}
                      </span>
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

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      v.status === 'AVAILABLE'
                        ? 'bg-blue-50 text-blue-700'
                        : v.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {v.status}
                  </span>
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
            ))
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
      />
    </div>
  );
};
