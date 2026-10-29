import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  CreditCard,
  Phone,
  Clock,
  ArrowRight,
  Send,
  Eye,
  Check,
  X,
  ExternalLink,
  MessageCircle,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Users,
  Edit3,
  Tag,
} from 'lucide-react';
import { HotspotOwner } from '../../types/index.ts';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

export interface SubscriptionItem {
  id: number;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  router_count: number;
  monthly_fee: number;
  subscription_status: string;
  subscription_expires_at: string | null;
  is_paid: boolean;
  days_remaining: number;
  days_overdue: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  last_payment_reference: string | null;
  total_paid_in_range: number;
  payment_count_in_range: number;
  created_at: string;
  history: Array<{
    id: number;
    amount: number;
    status: string;
    gateway_provider?: string;
    created_at: string;
    external_reference?: string;
  }>;
}

export interface SubscriptionSummary {
  total_owners: number;
  paid_count: number;
  unpaid_count: number;
  total_collected_tzs: number;
  total_pending_tzs: number;
}

interface SubscriptionManagementProps {
  currentUser?: HotspotOwner | null;
  lang?: 'sw' | 'en';
  onOwnersUpdated?: () => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  currentUser,
  lang = 'sw',
  onOwnersUpdated,
}) => {
  // Date range presets helper
  const getInitialDates = () => {
    const now = new Date();
    // Default to the current month (1st of this month to end of this month)
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`;
    const endStr = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
    return { startStr, endStr };
  };

  const initialDates = getInitialDates();
  const [startDate, setStartDate] = useState<string>(initialDates.startStr);
  const [endDate, setEndDate] = useState<string>(initialDates.endStr);
  const [activeDatePreset, setActiveDatePreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'ALL'>('THIS_MONTH');

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state (default page size 10, options: 5, 10, 15, 20)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);

  // Data state
  const [ownersList, setOwnersList] = useState<SubscriptionItem[]>([]);
  const [summary, setSummary] = useState<SubscriptionSummary>({
    total_owners: 0,
    paid_count: 0,
    unpaid_count: 0,
    total_collected_tzs: 0,
    total_pending_tzs: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [historyModalTarget, setHistoryModalTarget] = useState<SubscriptionItem | null>(null);
  const [extendModalTarget, setExtendModalTarget] = useState<SubscriptionItem | null>(null);
  const [extendDays, setExtendDays] = useState<number>(30);
  const [extendAmount, setExtendAmount] = useState<number>(15000);
  const [extendPaymentMethod, setExtendPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MANUAL_MPESA' | 'ADMIN_OVERRIDE'>('CASH');
  const [extendNotes, setExtendNotes] = useState<string>('Malipo ya mwezi / Verified by Admin HQ');
  const [isSubmittingExtend, setIsSubmittingExtend] = useState<boolean>(false);

  // USSD Push state
  const [isSendingPush, setIsSendingPush] = useState<number | null>(null);

  // Subscription Price Customization State
  const [currentSubscriptionPrice, setCurrentSubscriptionPrice] = useState<number>(15000);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState<boolean>(false);
  const [newPriceInput, setNewPriceInput] = useState<string>('15000');
  const [applyToAllOwners, setApplyToAllOwners] = useState<boolean>(true);
  const [isSavingPrice, setIsSavingPrice] = useState<boolean>(false);

  // Individual Owner Custom Fee Modal State
  const [customFeeTarget, setCustomFeeTarget] = useState<SubscriptionItem | null>(null);
  const [customFeeAmount, setCustomFeeAmount] = useState<number>(15000);
  const [isSavingCustomFee, setIsSavingCustomFee] = useState<boolean>(false);

  // Fetch report data
  const fetchReport = async () => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const params = new URLSearchParams();
      if (startDate && activeDatePreset !== 'ALL') params.set('startDate', startDate);
      if (endDate && activeDatePreset !== 'ALL') params.set('endDate', endDate);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/v1/subscriptions/report?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Hitilafu wakati wa kupakua ripoti ya subscription');
      }
      const data = await res.json();
      setOwnersList(data.owners || []);
      if (data.default_subscription_price) {
        setCurrentSubscriptionPrice(Number(data.default_subscription_price));
      }
      setSummary(
        data.summary || {
          total_owners: 0,
          paid_count: 0,
          unpaid_count: 0,
          total_collected_tzs: 0,
          total_pending_tzs: 0,
        }
      );
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Imeshindikana kupakia data ya subscription.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSubscriptionPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newPriceInput);
    if (!val || val <= 0) {
      setActionMessage({ type: 'error', text: 'Tafadhali weka bei halali ya subscription (namba chanya).' });
      return;
    }

    setIsSavingPrice(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/v1/subscription/settings/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: val,
          applyToAllOwners,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kusasisha bei ya subscription.');

      setCurrentSubscriptionPrice(val);
      setIsPriceModalOpen(false);
      setActionMessage({
        type: 'success',
        text: data.message || `✓ Bei ya subscription imewekwa TZS ${val.toLocaleString()}/mwezi kikamilifu!`,
      });
      await fetchReport();
      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleSaveOwnerCustomFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFeeTarget) return;

    const val = Number(customFeeAmount);
    if (isNaN(val) || val <= 0) {
      setActionMessage({ type: 'error', text: 'Tafadhali weka ada halali.' });
      return;
    }

    setIsSavingCustomFee(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/owners/${customFeeTarget.id}/subscription-fee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fee: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kusasisha ada ya mmiliki.');

      setCustomFeeTarget(null);
      setActionMessage({
        type: 'success',
        text: data.message || `✓ Ada ya ${customFeeTarget.business_name} imewekwa TZS ${val.toLocaleString()}.`,
      });
      await fetchReport();
      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingCustomFee(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, statusFilter, activeDatePreset]);

  // Handle preset clicks
  const applyPreset = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'ALL') => {
    setActiveDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(`${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(firstDay(first))}`);
      setEndDate(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`);
    } else if (preset === 'LAST_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(`${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(first.getDate())}`);
      setEndDate(`${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`);
    } else if (preset === 'LAST_30') {
      const past = new Date(Date.now() - 30 * 86400000);
      setStartDate(`${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`);
      setEndDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  function firstDay(d: Date) {
    return d.getDate();
  }

  // Filtered in memory for search
  const filteredOwners = useMemo(() => {
    if (!searchQuery.trim()) return ownersList;
    const q = searchQuery.toLowerCase().trim();
    return ownersList.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.business_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        (o.email && o.email.toLowerCase().includes(q))
    );
  }, [ownersList, searchQuery]);

  // Paginated records
  const paginatedOwners = useMemo(() => {
    if (pageSize === 'ALL') return filteredOwners;
    const size = typeof pageSize === 'number' ? pageSize : 10;
    const start = (currentPage - 1) * size;
    return filteredOwners.slice(start, start + size);
  }, [filteredOwners, currentPage, pageSize]);

  // Quick Action: Send STK Push to Owner
  const handleSendPush = async (owner: SubscriptionItem) => {
    if (!owner.phone) {
      setActionMessage({ type: 'error', text: 'Mmiliki huyu hana namba ya simu iliyosajiliwa.' });
      return;
    }
    setIsSendingPush(owner.id);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/payments/subscription-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: owner.id,
          phoneNumber: owner.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || 'Imeshindikana kutuma ombi la USSD Push');
      }
      setActionMessage({
        type: 'success',
        text: `✓ Ombi la malipo (USSD Push ya M-Pesa/Tigo/Airtel) limetumwa kwa namba ${owner.phone} (${owner.business_name}).`,
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Hitilafu ya kutuma STK Push.' });
    } finally {
      setIsSendingPush(null);
    }
  };

  // Quick Action: Toggle Expire / Activate
  const handleToggleStatus = async (owner: SubscriptionItem, action: 'activate' | 'expire') => {
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/owners/${owner.id}/toggle-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          days: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kusasisha hali ya mmiliki');
      }
      setActionMessage({
        type: 'success',
        text:
          action === 'activate'
            ? `✓ Subscription ya ${owner.business_name} imewashwa kwa siku 30!`
            : `✓ Subscription ya ${owner.business_name} imesitishwa (Expired).`,
      });
      await fetchReport();
      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  // Submit Manual Extend / Approval Modal
  const handleConfirmExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalTarget) return;

    setIsSubmittingExtend(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/owners/${extendModalTarget.id}/manual-approve-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: extendModalTarget.id,
          durationDays: extendDays,
          amountPaid: extendAmount,
          paymentMethod: extendPaymentMethod,
          referenceNote: extendNotes,
          notes: `Idhini ya moja kwa moja na Msimamizi Mkuu (${currentUser?.name || 'Admin'})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kuongeza muda wa subscription.');
      }
      setActionMessage({
        type: 'success',
        text: `✓ Subscription ya ${extendModalTarget.business_name} imerefushwa kwa siku ${extendDays} kikamilifu!`,
      });
      setExtendModalTarget(null);
      await fetchReport();
      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmittingExtend(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Mmiliki (Owner)',
      'Jina la Biashara (Business)',
      'Simu (Phone)',
      'Email',
      'Idadi ya Routers',
      'Ada ya Mwezi (TZS)',
      'Hali ya Malipo (Status)',
      'Tarehe ya Kuisha (Due Date)',
      'Malipo ya Mwisho (Last Paid)',
      'Kiasi Kilicholipwa (TZS)',
    ];

    const rows = filteredOwners.map((o) => [
      o.id,
      `"${o.name.replace(/"/g, '""')}"`,
      `"${o.business_name.replace(/"/g, '""')}"`,
      `"${o.phone}"`,
      `"${o.email || ''}"`,
      o.router_count,
      o.monthly_fee,
      o.is_paid ? 'PAID' : 'UNPAID',
      o.subscription_expires_at ? new Date(o.subscription_expires_at).toLocaleDateString() : 'N/A',
      o.last_payment_date ? new Date(o.last_payment_date).toLocaleDateString() : 'N/A',
      o.last_payment_amount || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Subscription_Report_${startDate || 'all'}_to_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            <span>
              {lang === 'sw'
                ? 'Usimamizi wa Malipo ya Subscription ya Kila Mwezi'
                : 'Monthly Hotspot Tenant Subscriptions'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'sw'
              ? 'Tazama wamiliki wote wa hotspot waliolipia na wasiolipia kwa mwezi husika, kagua tarehe na dhibiti upatikanaji wa huduma.'
              : 'Track active and overdue hotspot owners, review payments within custom date ranges, and manage renewals.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setNewPriceInput(String(currentSubscriptionPrice));
              setIsPriceModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition cursor-pointer"
          >
            <Tag className="w-3.5 h-3.5" />
            <span>
              {lang === 'sw'
                ? `Badilisha Bei (TZS ${currentSubscriptionPrice.toLocaleString()})`
                : `Edit Fee (TZS ${currentSubscriptionPrice.toLocaleString()})`}
            </span>
          </button>

          <button
            type="button"
            onClick={fetchReport}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{lang === 'sw' ? 'Sasisha Data' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'sw' ? 'Pakua Excel/CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Prominent Subscription Pricing & Policy Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/60 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Tag className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-2">
              <span>{lang === 'sw' ? 'Ada ya Mwezi ya Subscription (Hotspot Tenant Fee)' : 'Standard Monthly Tenant Fee'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                {lang === 'sw' ? 'Inatumika Sasa' : 'Active Rate'}
              </span>
            </div>
            <div className="text-2xl font-black text-white font-mono mt-0.5 flex items-baseline gap-2">
              <span>TZS {currentSubscriptionPrice.toLocaleString()}</span>
              <span className="text-xs font-medium text-slate-400 font-sans">
                {lang === 'sw' ? '/ mwezi kwa kila mmiliki' : '/ month per tenant'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewPriceInput(String(currentSubscriptionPrice));
            setIsPriceModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Edit3 className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Badilisha Bei ya Subscription' : 'Change Subscription Price'}</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {lang === 'sw' ? 'Jumla ya Wamiliki' : 'Total Tenants'}
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2 font-mono">{summary.total_owners}</div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {lang === 'sw' ? 'Wamiliki waliosajiliwa' : 'Registered owners'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              {lang === 'sw' ? 'Wamelipia (Hai)' : 'Paid / Active'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2 font-mono">{summary.paid_count}</div>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block font-medium">
            {summary.total_owners > 0 ? Math.round((summary.paid_count / summary.total_owners) * 100) : 0}% ya wote
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-200/80 shadow-2xs bg-gradient-to-br from-rose-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              {lang === 'sw' ? 'Hawajalipia (Expired)' : 'Unpaid / Overdue'}
            </span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2 font-mono">{summary.unpaid_count}</div>
          <span className="text-[10px] text-rose-600/80 mt-0.5 block font-medium">
            {lang === 'sw' ? 'Wanahitaji kulipia' : 'Awaiting payment'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-indigo-200/80 shadow-2xs bg-gradient-to-br from-indigo-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
              {lang === 'sw' ? 'Makusanyo (Kipindi)' : 'Collected Fees'}
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-indigo-900 mt-2 font-mono">
            TZS {summary.total_collected_tzs.toLocaleString()}
          </div>
          <span className="text-[10px] text-indigo-600/80 mt-0.5 block font-medium">
            {lang === 'sw' ? 'Pesa iliyoingia' : 'Confirmed revenue'}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-2xs bg-gradient-to-br from-amber-50/40 to-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              {lang === 'sw' ? 'Mapato Yanayosubiriwa' : 'Pending Overdue'}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-900 mt-2 font-mono">
            TZS {summary.total_pending_tzs.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-700 mt-0.5 block font-medium">
            {lang === 'sw' ? 'Bado hayajalipwa' : 'Unpaid subscription volume'}
          </span>
        </div>
      </div>

      {/* Filter Toolbar: Date Range Picker, Status Selector, and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Kipindi:' : 'Period:'}</span>
            </span>
            <button
              type="button"
              onClick={() => applyPreset('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeDatePreset === 'THIS_MONTH'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'sw' ? 'Mwezi Huu' : 'This Month'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('LAST_MONTH')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeDatePreset === 'LAST_MONTH'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'sw' ? 'Mwezi Uliopita' : 'Last Month'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('LAST_30')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeDatePreset === 'LAST_30'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'sw' ? 'Siku 30 Zilizopita' : 'Last 30 Days'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('THIS_YEAR')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeDatePreset === 'THIS_YEAR'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'sw' ? 'Mwaka Huu' : 'This Year'}
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeDatePreset === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'sw' ? 'Wakati Wote (All)' : 'All Time'}
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lang === 'sw' ? `Wote (${summary.total_owners})` : `All (${summary.total_owners})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('PAID');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'PAID'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{lang === 'sw' ? `Wamelipia (${summary.paid_count})` : `Paid (${summary.paid_count})`}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('UNPAID');
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'UNPAID'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>{lang === 'sw' ? `Hawajalipia (${summary.unpaid_count})` : `Unpaid (${summary.unpaid_count})`}</span>
            </button>
          </div>
        </div>

        {/* Date From & Date To Inputs + Search Input */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'sw' ? 'Tarehe ya Kuanzia (Date From):' : 'Date From:'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveDatePreset('ALL');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'sw' ? 'Tarehe ya Mwisho (Date To):' : 'Date To:'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveDatePreset('ALL');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'sw' ? 'Tafuta Mmiliki / Simu / Email:' : 'Search Owner / Business:'}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={lang === 'sw' ? 'Andika jina la mmiliki au namba ya simu...' : 'Search name, phone, or email...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 select-none">
              <tr>
                <th className="py-3 px-4">{lang === 'sw' ? 'Mmiliki & Biashara' : 'Owner & Business'}</th>
                <th className="py-3 px-4">{lang === 'sw' ? 'Mawasiliano' : 'Contact'}</th>
                <th className="py-3 px-3 text-center">{lang === 'sw' ? 'Routers' : 'Routers'}</th>
                <th className="py-3 px-4">{lang === 'sw' ? 'Ada ya Mwezi' : 'Monthly Fee'}</th>
                <th className="py-3 px-4">{lang === 'sw' ? 'Hali ya Malipo' : 'Status'}</th>
                <th className="py-3 px-4">{lang === 'sw' ? 'Tarehe ya Kuisha (Due Date)' : 'Expiry Date'}</th>
                <th className="py-3 px-4">{lang === 'sw' ? 'Malipo ya Mwisho' : 'Last Payment'}</th>
                <th className="py-3 px-4 text-right">{lang === 'sw' ? 'Vitendo (Actions)' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>{lang === 'sw' ? 'Inapakia data ya wamiliki...' : 'Loading subscription data...'}</span>
                  </td>
                </tr>
              ) : paginatedOwners.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CalendarX className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">
                      {lang === 'sw' ? 'Hakuna mmiliki aliyepatikana kwa vigezo hivi.' : 'No owners matched current criteria.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {lang === 'sw' ? 'Jaribu kubadilisha tarehe au vigezo vya utafutaji.' : 'Try adjusting the date range or filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOwners.map((owner) => (
                  <tr key={owner.id} className="hover:bg-slate-50/70 transition">
                    {/* Owner & Business */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{owner.business_name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">{owner.name}</div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{owner.phone}</span>
                      </div>
                      {owner.email && <div className="text-[10px] text-slate-400 font-sans truncate">{owner.email}</div>}
                    </td>

                    {/* Router Count */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {owner.router_count}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>TZS {owner.monthly_fee.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomFeeTarget(owner);
                            setCustomFeeAmount(owner.monthly_fee);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title={lang === 'sw' ? 'Badilisha ada ya mmiliki huyu' : 'Edit fee for this owner'}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {owner.is_paid ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{lang === 'sw' ? 'AMELIPIA' : 'PAID'}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 font-bold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>{lang === 'sw' ? 'HAJALIPIA' : 'UNPAID'}</span>
                        </div>
                      )}
                    </td>

                    {/* Expiry Date & Remaining Days */}
                    <td className="py-3.5 px-4">
                      {owner.subscription_expires_at ? (
                        <div>
                          <span className="font-mono font-semibold text-slate-800">
                            {new Date(owner.subscription_expires_at).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-US', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="block text-[10px] mt-0.5 font-medium">
                            {owner.days_remaining > 0 ? (
                              <span className="text-emerald-600 font-bold">
                                {lang === 'sw' ? `Imebaki siku ${owner.days_remaining}` : `${owner.days_remaining} days left`}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                {lang === 'sw' ? `Imechelewa siku ${owner.days_overdue}` : `Overdue ${owner.days_overdue} days`}
                              </span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Bado haijawekwa</span>
                      )}
                    </td>

                    {/* Last Payment Info */}
                    <td className="py-3.5 px-4">
                      {owner.last_payment_date ? (
                        <div>
                          <span className="font-mono text-slate-700 font-semibold">
                            {new Date(owner.last_payment_date).toLocaleDateString(lang === 'sw' ? 'sw-TZ' : 'en-US', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            TZS {(owner.last_payment_amount || owner.monthly_fee).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Push STK */}
                        <button
                          type="button"
                          onClick={() => handleSendPush(owner)}
                          disabled={isSendingPush === owner.id}
                          className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
                          title={lang === 'sw' ? 'Tuma USSD Push (M-Pesa/Tigo/Airtel)' : 'Send USSD Push Prompt'}
                        >
                          <Send className={`w-3.5 h-3.5 ${isSendingPush === owner.id ? 'animate-spin' : ''}`} />
                        </button>

                        {/* Extend / Manual Approve */}
                        <button
                          type="button"
                          onClick={() => {
                            setExtendModalTarget(owner);
                            setExtendAmount(owner.monthly_fee || 15000);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer flex items-center gap-1"
                        >
                          <span>{lang === 'sw' ? '+ Siku 30' : '+ 30 Days'}</span>
                        </button>

                        {/* Toggle Expire / Active */}
                        {owner.is_paid ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(owner, 'expire')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition cursor-pointer"
                            title={lang === 'sw' ? 'Sitisha (Mark Expired)' : 'Force Expire'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(owner, 'activate')}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 transition cursor-pointer"
                            title={lang === 'sw' ? 'Washa Haraka (Quick Activate)' : 'Quick Activate'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* History */}
                        <button
                          type="button"
                          onClick={() => setHistoryModalTarget(owner)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                          title={lang === 'sw' ? 'Tazama Historia ya Malipo' : 'View Payment History'}
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination with Requested Options: 5, 10, 15, 20 */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredOwners.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName={lang === 'sw' ? 'wamiliki' : 'owners'}
          pageSizeOptions={[5, 10, 15, 20]}
        />
      </div>

      {/* MODAL 1: Extend / Record Manual Payment */}
      {extendModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">
                  {lang === 'sw' ? 'Washa au Ongeza Subscription' : 'Extend / Renew Subscription'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setExtendModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{extendModalTarget.business_name}</div>
              <div className="text-slate-500">
                {extendModalTarget.name} • {extendModalTarget.phone}
              </div>
            </div>

            <form onSubmit={handleConfirmExtend} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Muda wa Kuongeza (Siku):' : 'Duration (Days):'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 15, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 rounded-xl font-bold border transition ${
                        extendDays === d
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Siku {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Kiasi Kilicholipwa (TZS):' : 'Amount Paid (TZS):'}
                </label>
                <input
                  type="number"
                  value={extendAmount}
                  onChange={(e) => setExtendAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Njia ya Malipo:' : 'Payment Method:'}
                </label>
                <select
                  value={extendPaymentMethod}
                  onChange={(e) => setExtendPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="CASH">Pesa Taslimu (Cash)</option>
                  <option value="BANK_TRANSFER">Benki (CRDB, NMB, KCB)</option>
                  <option value="MANUAL_MPESA">M-Pesa / Tigo Pesa Binafsi</option>
                  <option value="ADMIN_OVERRIDE">Msaada wa Msimamizi (Admin Override)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Maelezo / Namba ya Muamala:' : 'Reference / Remarks:'}
                </label>
                <input
                  type="text"
                  value={extendNotes}
                  onChange={(e) => setExtendNotes(e.target.value)}
                  placeholder="Mfano: Risiti #9823 au Lipa Namba"
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExtendModalTarget(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExtend}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingExtend ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{lang === 'sw' ? 'Thibitisha & Washa' : 'Confirm & Activate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Payment History Dialog */}
      {historyModalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-sm text-slate-900">
                  {lang === 'sw' ? 'Historia ya Malipo ya Subscription' : 'Subscription Payment History'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalTarget(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900">{historyModalTarget.business_name}</div>
              <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                Simu: {historyModalTarget.phone} • Ada: TZS {historyModalTarget.monthly_fee.toLocaleString()}/mwezi
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {historyModalTarget.history && historyModalTarget.history.length > 0 ? (
                historyModalTarget.history.map((h, idx) => (
                  <div
                    key={h.id || idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 font-mono">
                        TZS {Number(h.amount).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                        <span>{new Date(h.created_at).toLocaleString('sw-TZ')}</span>
                        {h.external_reference && <span>• Ref: {h.external_reference}</span>}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      SUCCESS
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Hakuna historia ya malipo ya kidijitali bado.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                {lang === 'sw' ? 'Funga' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
