import React, { useEffect, useState } from 'react';
import { DateRangePreset, RevenueMetrics } from '../../types/index.ts';
import { CARRIERS, formatTzs } from '../../utils/carrierInfo.ts';
import {
  TrendingUp,
  CreditCard,
  Wifi,
  Users,
  CheckCircle2,
  RefreshCw,
  PhoneCall,
  Loader2,
  Calendar,
  Tag,
  Banknote,
  Boxes,
  ArrowUpRight,
  Filter,
  Download,
  Clock,
  BadgeAlert,
  ShieldCheck,
  Receipt,
  RotateCcw,
  MapPin,
} from 'lucide-react';

interface AdminOverviewProps {
  ownerId?: number;
  ownerName?: string;
  onNavigateToTab?: (tab: string) => void;
  selectedRouterId?: number;
  selectedRouterName?: string;
  onClearRouterFilter?: () => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  ownerId,
  ownerName,
  onNavigateToTab,
  selectedRouterId,
  selectedRouterName,
  onClearRouterFilter,
}) => {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Date filtering state
  const [preset, setPreset] = useState<DateRangePreset>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const fetchPendingRequests = async () => {
    if (ownerId) return;
    try {
      const res = await fetch('/api/v1/subscription/manual-requests?status=PENDING');
      if (res.ok) {
        const data = await res.json();
        setPendingRequests(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch pending requests:', e);
    }
  };

  const fetchMetrics = async (activePreset = preset, start = startDate, end = endDate) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (ownerId) params.set('ownerId', String(ownerId));
      if (selectedRouterId) params.set('routerId', String(selectedRouterId));
      if (activePreset) params.set('preset', activePreset);
      if (activePreset === 'custom') {
        if (start) params.set('startDate', start);
        if (end) params.set('endDate', end);
      }

      const res = await fetch(`/api/v1/analytics/overview?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchPendingRequests();
    const interval = setInterval(() => {
      fetchMetrics(preset, startDate, endDate);
      fetchPendingRequests();
    }, 15000);
    return () => clearInterval(interval);
  }, [ownerId, preset, selectedRouterId]);

  const handleSelectPreset = (p: DateRangePreset) => {
    setPreset(p);
    if (p === 'custom') {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      fetchMetrics(p);
    }
  };

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate && !endDate) return;
    fetchMetrics('custom', startDate, endDate);
  };

  const getPresetLabel = (p: DateRangePreset) => {
    switch (p) {
      case 'today':
        return 'Leo (Today)';
      case 'yesterday':
        return 'Jana (Yesterday)';
      case 'this_week':
        return 'Wiki Hii (This Week)';
      case 'this_month':
        return 'Mwezi Huu (This Month)';
      case 'this_year':
        return 'Mwaka Huu (This Year)';
      case 'all':
        return 'Muda Wote (All Time)';
      case 'custom':
        return 'Tarehe Maalum (Custom Range)';
      default:
        return p;
    }
  };

  if (loading && !metrics) {
    return (
      <div className="p-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs text-slate-500 mt-2">Inapakia taarifa za mapato na miamala...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
          <TrendingUp className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-900">Hakuna Data ya Mapato Bado</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Taarifa za miamala na mauzo ya vocha zitaonekana hapa pindi wateja wanapoanza kulipa au vocha zinapochapishwa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchMetrics(preset, startDate, endDate)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Jaribu Kupakia Tena</span>
        </button>
      </div>
    );
  }

  // Percentages for comparison
  const totalGross = metrics.totalRevenue || 0;
  const mobileShare = totalGross > 0 ? Math.round(((metrics.mobileRevenue || 0) / totalGross) * 100) : 0;
  const manualShare = totalGross > 0 ? Math.round(((metrics.manualVoucherRevenue || 0) / totalGross) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Active Site Scope Banner */}
      {selectedRouterName && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-950 text-xs font-medium shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-700 font-mono">
                Site Inayotazamwa Sasa (Active Site Scope)
              </div>
              <div className="font-bold text-sm text-cyan-950 truncate">
                {selectedRouterName}
              </div>
            </div>
          </div>
          {onClearRouterFilter && (
            <button
              type="button"
              onClick={onClearRouterFilter}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-cyan-100 text-cyan-800 font-bold text-xs border border-cyan-300 transition shadow-2xs shrink-0 cursor-pointer"
            >
              🌐 Tazama Maeneo Yote (All Sites)
            </button>
          )}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          {ownerName ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 mb-1">
              <span>🏢 Biashara Yangu: {ownerName}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 mb-1">
              <span>👑 Mfumo Mzima (Vendor Master HQ)</span>
            </div>
          )}
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>{ownerName ? 'Mapato Yangu & Mauzo (My Revenue & Sales)' : 'Revenue & Hotspot Sales Overview'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Miamala ya simu (M-Pesa, Tigo, Airtel, Halopesa) pamoja na mauzo ya vocha za karatasi (Manual Cash Vouchers).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!ownerId && onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('system_reset')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 shadow-2xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Mfumo (Factory Reset)</span>
            </button>
          )}

          <a
            href="/api/v1/export/transactions/csv"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Pakua Ripoti (CSV)</span>
          </a>

          <button
            type="button"
            onClick={() => fetchMetrics(preset, startDate, endDate)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Sasisha (Refresh)</span>
          </button>
        </div>
      </div>

      {/* PENDING MANUAL SUBSCRIPTION APPROVAL BANNER (Vendor HQ) */}
      {!ownerId && pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border-2 border-amber-400 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shrink-0 shadow-md">
              <BadgeAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  Kuna Maombi {pendingRequests.length} ya Kuidhinisha Subscription (Manual Approval)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Inasubiri Vendor Idhini
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Wateja wameshindwa kulipa kwa simu au wamelipa kwa Taslimu/Benki. Idhinisha hapa ili kufungua mfumo wao mara moja.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('owners')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Fungua na Idhinisha Sasa ➡️</span>
          </button>
        </div>
      )}

      {/* FILTER BAR: PRESETS & DATE RANGE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
              CHAGUA KIPINDI CHA MAUZO (DATE RANGE FILTER)
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Kipindi Kinachoonyeshwa: <strong className="text-indigo-600 font-bold">{getPresetLabel(preset)}</strong></span>
          </span>
        </div>

        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: 'today', label: 'Leo (Today)' },
              { key: 'yesterday', label: 'Jana (Yesterday)' },
              { key: 'this_week', label: 'Wiki Hii (This Week)' },
              { key: 'this_month', label: 'Mwezi Huu (This Month)' },
              { key: 'this_year', label: 'Mwaka Huu (This Year)' },
              { key: 'all', label: 'Muda Wote (All)' },
              { key: 'custom', label: 'Tarehe Maalum (Custom)' },
            ] as const
          ).map((item) => {
            const isActive = preset === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelectPreset(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Form (Visible when custom is selected) */}
        {isCustomMode && (
          <form
            onSubmit={handleApplyCustomDate}
            className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 text-xs animate-in fade-in"
          >
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-600 whitespace-nowrap">Kuanzia (From):</span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="font-bold text-slate-600 whitespace-nowrap">Hadi (To):</span>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold transition shadow-xs"
            >
              Tumia Tarehe Hizi (Apply Filter)
            </button>
          </form>
        )}
      </div>

      {/* METRICS CARDS: COMBINED GROSS, MOBILE MONEY, MANUAL VOUCHERS, IN-STOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Combined Total Gross Revenue */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-200">
                JUMLA KUU YA MAPATO (TOTAL GROSS)
              </span>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight mt-2">
              {formatTzs(metrics.totalRevenue)}
            </div>
          </div>
          <div className="pt-3 border-t border-indigo-700/50 flex items-center justify-between text-[11px] text-indigo-200 mt-3">
            <span>Simu + Vocha za Karatasi</span>
            <span className="font-bold text-emerald-400">100% Gross</span>
          </div>
        </div>

        {/* 2. Mobile Money Revenue (STK Push) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                MALIPO YA SIMU (MOBILE MONEY)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-2">
              {formatTzs(metrics.mobileRevenue || 0)}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] mt-3">
            <span className="text-slate-500">{metrics.successfulCount} miamala imelipwa</span>
            <span className="font-bold text-emerald-600 font-mono">{mobileShare}% ya jumla</span>
          </div>
        </div>

        {/* 3. Manual Cash Vouchers Revenue */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                VOCHA ZA KARATASI (MANUAL CASH)
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-2">
              {formatTzs(metrics.manualVoucherRevenue || 0)}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] mt-3">
            <span className="text-slate-500">{metrics.manualVouchersSold || 0} vocha zimeuzwa/kuwashwa</span>
            <span className="font-bold text-amber-600 font-mono">{manualShare}% ya jumla</span>
          </div>
        </div>

        {/* 4. Unsold Stock Value (Vocha Zilizopo Tayari Kuuzwa) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                VOCHA ZILIZOPO STOO (AVAILABLE STOCK)
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-2">
              {formatTzs(metrics.manualVouchersStockValue || 0)}
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] mt-3">
            <span className="text-slate-500">{metrics.vouchersAvailable} kadi zipo stoo</span>
            <span className="font-bold text-purple-600">Tayari Kuuza</span>
          </div>
        </div>
      </div>

      {/* REVENUE DISTRIBUTION: MOBILE MONEY VS MANUAL CASH */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Mlingano wa Vyanzo vya Mapato (Payment Channels Comparison)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Uwiano wa fedha zilizoingia kupitia simu (M-Pesa/Tigo/Airtel) dhidi ya mauzo ya vocha za karatasi (Cash).
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Simu: {mobileShare}%</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Vocha za Karatasi: {manualShare}%</span>
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${totalGross > 0 ? mobileShare : 50}%` }}
            className="bg-emerald-500 transition-all duration-500 relative group"
            title={`Simu: ${formatTzs(metrics.mobileRevenue || 0)} (${mobileShare}%)`}
          />
          <div
            style={{ width: `${totalGross > 0 ? manualShare : 50}%` }}
            className="bg-amber-500 transition-all duration-500 relative group"
            title={`Vocha za Karatasi: ${formatTzs(metrics.manualVoucherRevenue || 0)} (${manualShare}%)`}
          />
        </div>

        {/* Detailed Breakdown Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs text-emerald-950">Malipo ya Simu (STK Push M-Pesa / Tigo / Airtel)</span>
              </div>
              <span className="font-black text-sm text-emerald-900 font-mono">
                {formatTzs(metrics.mobileRevenue || 0)}
              </span>
            </div>
            <div className="text-[11px] text-emerald-700">
              Miamala hii inaingia moja kwa moja kwenye akaunti yako ya malipo au merchant na kumfungulia mteja intaneti papo hapo.
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-xs text-amber-950">Vocha za Karatasi & Mauzo ya Pesa Taslimu</span>
              </div>
              <span className="font-black text-sm text-amber-900 font-mono">
                {formatTzs(metrics.manualVoucherRevenue || 0)}
              </span>
            </div>
            <div className="text-[11px] text-amber-700">
              Pesa taslimu unayokusanya dukani au mtaani kwa kuwauzia wateja kadi/vocha zilizochapishwa kupitia kituo cha vocha.
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown by Carrier */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Ugawaji wa Malipo kwa Mitandao ya Simu (Carrier Distribution)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Takwimu za mtandao gani wa simu unatumiwa zaidi na wateja wako kulipia intaneti.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">M-Pesa, Tigo Pesa, Airtel, Halopesa</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(metrics.carrierBreakdown) as (keyof typeof metrics.carrierBreakdown)[]).map(
            (key) => {
              const data = metrics.carrierBreakdown[key];
              const carrier = CARRIERS[key];

              return (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-2xs"
                        style={{ backgroundColor: carrier.brandColor }}
                      >
                        {key === 'VODACOM' && 'M-P'}
                        {key === 'TIGO' && 'TG'}
                        {key === 'AIRTEL' && 'AIR'}
                        {key === 'HALOTEL' && 'HAL'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">{carrier.name}</div>
                        <div className="text-[10px] text-slate-600">{carrier.prefixes.join(', ')}x</div>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-slate-700 font-mono">
                      {data.percentage}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(data.percentage, 4)}%`,
                        backgroundColor: carrier.brandColor,
                      }}
                    />
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-[11px] text-slate-600">
                      {data.count} miamala
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {formatTzs(data.revenue)}
                    </span>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
};
