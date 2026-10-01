import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

export const TransactionLedger: React.FC<{ ownerId?: number }> = ({ ownerId }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

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
  }, [carrierFilter, statusFilter, ownerId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [carrierFilter, statusFilter, ownerId, search]);

  const paginatedTransactions =
    pageSize === 'ALL'
      ? transactions
      : transactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
            href="/api/v1/export/transactions/csv"
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

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number, reference, or carrier ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
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
                paginatedTransactions.map((t) => {
                const carrier = CARRIERS[t.network_provider];
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
                    <td className="px-4 py-3.5 text-slate-700">
                      {t.plan ? t.plan.name.split('(')[0] : `Plan #${t.plan_id}`}
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
            paginatedTransactions.map((t) => {
              const carrier = CARRIERS[t.network_provider];
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
                      <div className="text-[11px] text-slate-500 font-medium">
                        {t.plan ? t.plan.name.split('(')[0] : `Plan #${t.plan_id}`}
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
