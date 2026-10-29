import React, { useEffect, useState, useMemo } from 'react';
import { Transaction, NetworkProvider } from '../../types/index.ts';
import { CARRIERS, formatTzs } from '../../utils/carrierInfo.ts';
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Code2,
  FileText,
  MapPin,
  CalendarCheck,
  Calendar,
  CalendarRange,
  X,
} from 'lucide-react';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';
import { RouterItem } from '../../types/index.ts';

export const TransactionLedger: React.FC<{
  ownerId?: number;
  selectedRouterId?: number;
  selectedRouterName?: string;
  routers?: RouterItem[];
  onSelectRouter?: (id: number | undefined) => void;
}> = ({
  ownerId,
  selectedRouterId,
  selectedRouterName,
  routers = [],
  onSelectRouter,
}) => {
  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [routerFilter, setRouterFilter] = useState<string>(selectedRouterId ? String(selectedRouterId) : '');
  const [startDate, setStartDate] = useState<string>(getTodayDateStr());
  const [endDate, setEndDate] = useState<string>(getTodayDateStr());
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (selectedRouterId !== undefined) {
      setRouterFilter(String(selectedRouterId));
    } else {
      setRouterFilter('');
    }
  }, [selectedRouterId]);

  // Quick Preset Helper
  const setPresetDate = (preset: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL') => {
    const today = getTodayDateStr();
    if (preset === 'TODAY') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setStartDate(dStr);
      setEndDate(today);
    } else if (preset === 'MONTH') {
      const now = new Date();
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(mStr);
      setEndDate(today);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const activePreset = useMemo(() => {
    const today = getTodayDateStr();
    if (startDate === today && endDate === today) return 'TODAY';
    if (!startDate && !endDate) return 'ALL';
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    if (startDate === yStr && endDate === yStr) return 'YESTERDAY';
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (startDate === dStr && endDate === today) return 'WEEK';
    const now = new Date();
    const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    if (startDate === mStr && endDate === today) return 'MONTH';
    return 'CUSTOM';
  }, [startDate, endDate]);

  const summaryStats = useMemo(() => {
    const total = transactions.length;
    const successList = transactions.filter((t) => t.status === 'SUCCESS');
    const successCount = successList.length;
    const successAmount = successList.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    return { total, successCount, successAmount };
  }, [transactions]);

  // Export CSV url with active filters & date range
  const exportCsvUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (carrierFilter) params.append('carrier', carrierFilter);
    if (statusFilter) params.append('status', statusFilter);
    if (ownerId) params.append('ownerId', String(ownerId));
    if (routerFilter) params.append('routerId', routerFilter);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return `/api/v1/export/transactions/csv?${params.toString()}`;
  }, [search, carrierFilter, statusFilter, ownerId, routerFilter, startDate, endDate]);

  // Pagination (10, 20, 30, 40, ALL)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(20);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (carrierFilter) params.append('carrier', carrierFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (ownerId) params.append('ownerId', String(ownerId));
      if (routerFilter) params.append('routerId', routerFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/v1/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [carrierFilter, statusFilter, ownerId, routerFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [carrierFilter, statusFilter, ownerId, search, startDate, endDate]);

  const paginatedTransactions = useMemo<Transaction[]>(() => {
    if (pageSize === 'ALL') return transactions;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return transactions.slice(start, start + size);
  }, [transactions, currentPage, pageSize]);

  const isSubscriptionTx = (t: Transaction) => {
    return (
      Boolean(t.is_subscription) ||
      t.plan_id === 0 ||
      t.plan?.id === 0 ||
      t.plan?.name?.toLowerCase().includes('subscription') ||
      t.plan_name?.toLowerCase().includes('subscription') ||
      t.external_reference?.toUpperCase().startsWith('SUB-') ||
      t.external_reference?.toUpperCase().startsWith('MAN-SUB-') ||
      t.external_reference?.toUpperCase().startsWith('BULK-SUB-') ||
      (t.transaction_id && t.transaction_id.toUpperCase().startsWith('SUB-')) ||
      (t.transaction_id && t.transaction_id.toUpperCase().startsWith('MAN-SUB-')) ||
      (t.external_reference && /sub/i.test(t.external_reference))
    );
  };

  const renderPlanBadge = (t: Transaction) => {
    if (isSubscriptionTx(t)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] shadow-2xs whitespace-nowrap">
          <CalendarCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>Monthly Subscription Fee</span>
        </span>
      );
    }
    return (
      <span className="text-slate-700 font-medium">
        {t.plan ? t.plan.name.split('(')[0] : (t.plan_id ? `Plan #${t.plan_id}` : 'Monthly Subscription Fee')}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Carrier Mobile Money Transactions
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Idempotent reconciliation records, USSD push statuses, and MNO reference IDs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportCsvUrl}
            download="tzwifi_transactions.csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pakua CSV (Export)</span>
          </a>

          <button
            type="button"
            onClick={fetchTransactions}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters Bar & Date Range Controller */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
        {/* Top Filter Row: Search & Dropdowns */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search phone number, reference, or carrier ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
            />
          </form>

          {/* Carrier Filter */}
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="w-full sm:w-auto text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Carriers</option>
            <option value="VODACOM">Vodacom M-Pesa</option>
            <option value="TIGO">Tigo Pesa</option>
            <option value="AIRTEL">Airtel Money</option>
            <option value="HALOTEL">Halopesa</option>
          </select>

          {/* Site / Router Filter */}
          {routers.length > 0 && (
            <select
              value={routerFilter}
              onChange={(e) => {
                setRouterFilter(e.target.value);
                onSelectRouter?.(e.target.value ? Number(e.target.value) : undefined);
              }}
              className="w-full sm:w-auto text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 text-slate-800"
            >
              <option value="">🌐 Sites Zote (All Sites)</option>
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  📍 {r.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Bottom Filter Row: Date Range & Quick Presets */}
        <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Kuanzia:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Kuanzia Tarehe"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Hadi:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Hadi Tarehe"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => setPresetDate('ALL')}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                title="Futa tarehe (Onyesha zote)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setPresetDate('TODAY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePreset === 'TODAY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                Leo (Today)
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('YESTERDAY')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePreset === 'YESTERDAY'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                Jana
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('WEEK')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePreset === 'WEEK'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                Siku 7
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('MONTH')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePreset === 'MONTH'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                Mwezi Huu
              </button>
              <button
                type="button"
                onClick={() => setPresetDate('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePreset === 'ALL'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                Zote
              </button>
            </div>
          </div>

          {/* Quick Metrics Badges for Selected Range */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
              Miamala: <span className="text-slate-900">{summaryStats.total}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              Mafanikio: <span className="text-emerald-900">{summaryStats.successCount}</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-black border border-indigo-200">
              Mapato: <span>{formatTzs(summaryStats.successAmount)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Desktop / Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3">Carrier / Phone</th>
                <th className="px-4 py-3">Amount (TZS)</th>
                <th className="px-4 py-3">Reference (Our ID)</th>
                <th className="px-4 py-3">Carrier Trans ID</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-xs">
                    Hakuna miamala iliyopatikana.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t: Transaction) => {
                const carrier = CARRIERS[t.network_provider as NetworkProvider];
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: carrier?.brandColor || '#333' }}
                        >
                          {carrier?.name || t.network_provider}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {t.phone_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-bold font-mono text-slate-900">
                      {formatTzs(t.amount)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-600 text-[11px]">
                      {t.external_reference}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                      {t.transaction_id || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {renderPlanBadge(t)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {t.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                        {t.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                        {t.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTx(t)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        title="View details"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Mobile Transactions Cards (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Hakuna miamala iliyopatikana.
            </div>
          ) : (
            paginatedTransactions.map((t: Transaction) => {
              const carrier = CARRIERS[t.network_provider as NetworkProvider];
              return (
                <div key={t.id} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: carrier?.brandColor || '#333' }}
                      >
                        {carrier?.name || t.network_provider}
                      </span>
                      <span className="font-mono font-black text-slate-900 text-sm">
                        {t.phone_number}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                        t.status === 'SUCCESS'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : t.status === 'FAILED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {t.status === 'SUCCESS' && <CheckCircle2 className="w-3 h-3" />}
                      {t.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                      {t.status === 'PENDING' && <Clock className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div>
                      <div className="font-black font-mono text-base text-slate-900">
                        {formatTzs(t.amount)}
                      </div>
                      <div className="text-[11px] font-medium pt-0.5">
                        {renderPlanBadge(t)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTx(t)}
                        className="mt-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3 text-indigo-600" />
                        <span>Payload</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono truncate pt-1 border-t border-slate-100">
                    Ref: {t.external_reference}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination bar (10, 20, 30, 40, ALL) */}
        <TablePagination
          currentPage={currentPage}
          totalItems={transactions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="miamala"
        />
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  Transaction Audit Record ({selectedTx.external_reference})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs bg-slate-950 font-mono text-slate-200 overflow-auto max-h-[60vh]">
              <pre>{JSON.stringify(selectedTx, null, 2)}</pre>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="py-1.5 px-4 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
