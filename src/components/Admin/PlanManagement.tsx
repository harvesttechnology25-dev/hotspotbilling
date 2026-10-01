import React, { useEffect, useState } from 'react';
import { Plan, PlanType, FreeTrialPackageConfig, DEFAULT_FREE_TRIAL_CONFIG, FreeTrialClaim } from '../../types/index.ts';
import { formatTzs } from '../../utils/carrierInfo.ts';
import {
  Package,
  PlusCircle,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Gauge,
  Clock,
  Zap,
  Users,
  Gift,
  Sliders,
  Shield,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

export const PlanManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Free Trial Package State
  const [trialConfig, setTrialConfig] = useState<FreeTrialPackageConfig>({ ...DEFAULT_FREE_TRIAL_CONFIG });
  const [trialClaims, setTrialClaims] = useState<FreeTrialClaim[]>([]);
  const [trialConfigModalOpen, setTrialConfigModalOpen] = useState(false);
  const [trialClaimsModalOpen, setTrialClaimsModalOpen] = useState(false);
  const [savingTrial, setSavingTrial] = useState(false);
  const [trialNotice, setTrialNotice] = useState('');
  const [trialSearchMac, setTrialSearchMac] = useState('');
  const [trialFormData, setTrialFormData] = useState<FreeTrialPackageConfig>({ ...DEFAULT_FREE_TRIAL_CONFIG });

  // Paid Plans Pagination & Filters (10, 20, 30, 40, ALL)
  const [planPage, setPlanPage] = useState<number>(1);
  const [planPageSize, setPlanPageSize] = useState<PageSizeOption>(10);
  const [planSearch, setPlanSearch] = useState<string>('');
  const [planStatusFilter, setPlanStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Trial Claims Pagination (10, 20, 30, 40, ALL)
  const [claimsPage, setClaimsPage] = useState<number>(1);
  const [claimsPageSize, setClaimsPageSize] = useState<PageSizeOption>(10);

  // Paid Plan Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'TIME_BASED' as PlanType,
    price: 500,
    uptimeHours: 2,
    rate_limit: '2M/4M',
    shared_users: 1,
    badge: 'NONE' as 'NONE' | 'POPULAR' | 'BEST_VALUE' | 'SUPER_FAST' | 'HOT_DEAL' | 'CUSTOM',
    badge_text: '',
    featuresText: '',
    description_sw: '',
    description_en: '',
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialData = async () => {
    try {
      const res = await fetch('/api/v1/admin/free-trials');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setTrialConfig(data.config);
          setTrialFormData(data.config);
        }
        if (data.claims) {
          setTrialClaims(data.claims);
        }
      }
    } catch (err) {
      console.error('Failed to fetch free trial data:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchTrialData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      type: 'TIME_BASED',
      price: 1000,
      uptimeHours: 6,
      rate_limit: '3M/6M',
      shared_users: 1,
      badge: 'NONE',
      badge_text: '',
      featuresText: 'YouTube & TikTok bila kukwama\nKasi ya juu bila kikomo cha data\nInafaa kwa kupakua na kupiga video call',
      description_sw: 'Masaa 6 ya kazi, video na kupakua maudhui mtandaoni',
      description_en: '6 Hours for remote work, streaming, and downloads',
    });
    setError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan(plan);
    const hours = plan.limit_uptime ? Math.round(plan.limit_uptime / 3600) : 1;
    setFormData({
      name: plan.name,
      type: plan.type,
      price: plan.price,
      uptimeHours: hours,
      rate_limit: plan.rate_limit,
      shared_users: plan.shared_users || 1,
      badge: plan.badge || (plan.price === 1500 ? 'POPULAR' : plan.price === 5000 ? 'BEST_VALUE' : 'NONE'),
      badge_text: plan.badge_text || '',
      featuresText: (plan.features || []).join('\n'),
      description_sw: plan.description_sw || '',
      description_en: plan.description_en || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) {
      setError('Tafadhali jaza jina la kifurushi na bei sahihi.');
      return;
    }

    setSaving(true);
    setError('');

    const limitUptime = formData.uptimeHours * 3600;
    const features = formData.featuresText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name,
      type: formData.type,
      price: Number(formData.price),
      limit_uptime: limitUptime,
      validity_period: limitUptime,
      rate_limit: formData.rate_limit,
      shared_users: Number(formData.shared_users),
      badge: formData.badge,
      badge_text: formData.badge === 'CUSTOM' ? formData.badge_text : undefined,
      features,
      description_sw: formData.description_sw,
      description_en: formData.description_en,
    };

    try {
      const url = editingPlan ? `/api/v1/plans/${editingPlan.id}` : '/api/v1/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Imeshindwa kuhifadhi kifurushi.');
      }

      setModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Je, una uhakika unataka kufuta kifurushi hiki?')) return;
    try {
      const res = await fetch(`/api/v1/plans/${id}`, { method: 'DELETE' });
      if (res.ok) fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    try {
      const res = await fetch(`/api/v1/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !plan.is_active }),
      });
      if (res.ok) fetchPlans();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Free Trial Handlers ---
  const handleOpenTrialConfig = () => {
    setTrialFormData({ ...trialConfig });
    setTrialNotice('');
    setTrialConfigModalOpen(true);
  };

  const handleToggleTrialActive = async () => {
    const updated = { ...trialConfig, enabled: !trialConfig.enabled };
    try {
      const res = await fetch('/api/v1/admin/free-trial/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        setTrialConfig(data.config);
      }
    } catch (err) {
      console.error('Error toggling trial:', err);
    }
  };

  const handleSaveTrialConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTrial(true);
    setTrialNotice('');

    try {
      const res = await fetch('/api/v1/admin/free-trial/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trialFormData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindwa kusasisha mipangilio ya bure.');
      }

      setTrialConfig(data.config);
      setTrialNotice('Limiti za majaribio ya bure zimehifadhiwa kikamilifu!');
      setTimeout(() => {
        setTrialConfigModalOpen(false);
        setTrialNotice('');
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Hitilafu ya kuhifadhi.');
    } finally {
      setSavingTrial(false);
    }
  };

  const handleResetMac = async (mac: string) => {
    if (!confirm(`Je, unataka kufuta rekodi ya MAC (${mac}) ili iweze kupata intaneti ya bure tena?`)) return;
    try {
      const res = await fetch('/api/v1/admin/free-trials/reset-mac', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mac }),
      });
      if (res.ok) {
        fetchTrialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAllClaims = async () => {
    if (!confirm('Tahadhari: Je, una uhakika unataka kufuta rekodi za vifaa vyote vilivyotumia bure? Vifaa vyote vitaweza kupata bure tena mara 1.')) return;
    try {
      const res = await fetch('/api/v1/admin/free-trials/reset-all', { method: 'DELETE' });
      if (res.ok) {
        fetchTrialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered & Paginated Plans
  const filteredPlans = plans.filter((p) => {
    if (planStatusFilter === 'ACTIVE' && !p.is_active) return false;
    if (planStatusFilter === 'INACTIVE' && p.is_active) return false;
    if (!planSearch) return true;
    const q = planSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description_sw && p.description_sw.toLowerCase().includes(q)) ||
      (p.description_en && p.description_en.toLowerCase().includes(q)) ||
      (p.rate_limit && p.rate_limit.toLowerCase().includes(q)) ||
      String(p.price).includes(q)
    );
  });

  useEffect(() => {
    setPlanPage(1);
  }, [planSearch, planStatusFilter, plans.length]);

  const paginatedPlans =
    planPageSize === 'ALL'
      ? filteredPlans
      : filteredPlans.slice((planPage - 1) * planPageSize, planPage * planPageSize);

  // Filtered & Paginated Claims
  const filteredClaims = trialClaims.filter((c) => {
    if (!trialSearchMac) return true;
    const q = trialSearchMac.toLowerCase();
    return (
      c.mac_address.toLowerCase().includes(q) ||
      (c.user_ip && c.user_ip.includes(q)) ||
      c.voucher_code.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setClaimsPage(1);
  }, [trialSearchMac, trialClaims.length]);

  const paginatedClaims =
    claimsPageSize === 'ALL'
      ? filteredClaims
      : filteredClaims.slice((claimsPage - 1) * claimsPageSize, claimsPage * claimsPageSize);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Mipangilio ya Vifurushi & Majaribio ya Bure (Packages & Free Trial)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dhibiti vifurushi vya kulipia na uweke limiti unazotaka za intaneti ya majaribio ya bure (Free Trial)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ongeza Kifurushi Kipya cha Kulipia</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* HIGHLIGHT: FREE TRIAL PACKAGE CONFIGURATION CARD */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Details */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Kifurushi cha Majaribio (Free Trial)</span>
              </span>

              <button
                type="button"
                onClick={handleToggleTrialActive}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                  trialConfig.enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-600 border border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${trialConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{trialConfig.enabled ? 'Kifurushi Kiko Hewani (Active)' : 'Kimezimwa (Disabled)'}</span>
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{trialConfig.name || 'Majaribio ya Bure (Free Trial)'}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                {trialConfig.description_sw || 'Wateja wanapounganisha simu kwenye Wi-Fi, wanapata intaneti ya bure kwa kubofya kitufe 1 tu kulingana na limiti ulizoweka hapa.'}
              </p>
            </div>

            {/* Badges of current configured limits */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="bg-white/80 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kikomo cha Muda</span>
                <span className="text-sm font-black text-emerald-900 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{trialConfig.duration_minutes} Dakika</span>
                </span>
              </div>

              <div className="bg-white/80 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Kasi ya Intaneti</span>
                <span className="text-sm font-black text-slate-900 flex items-center gap-1 mt-0.5">
                  <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{trialConfig.rate_limit || '2M/4M'}</span>
                </span>
              </div>

              <div className="bg-white/80 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ukomo wa Data</span>
                <span className="text-sm font-black text-slate-900 mt-0.5 block">
                  {trialConfig.quota_mb > 0 ? `${trialConfig.quota_mb} MB` : 'Bila Kikomo (Unlimited)'}
                </span>
              </div>

              <div className="bg-white/80 border border-emerald-200/80 rounded-xl p-2.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Sera ya Kufunga</span>
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1 mt-0.5">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>
                    {trialConfig.lock_policy === 'LIFETIME'
                      ? 'Mara 1 tu milele'
                      : trialConfig.lock_policy === 'DAILY'
                      ? 'Kila saa 24'
                      : 'Kila wiki'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-row lg:flex-col gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={handleOpenTrialConfig}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              <span>Weka Limiti za Bure (Edit Limits)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                fetchTrialData();
                setTrialClaimsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Vifaa Vilivyotumia ({trialClaims.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAID PACKAGES LIST */}
      {/* ========================================================================= */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
              Vifurushi vya Kulipia (Paid Hotspot Bundles) ({filteredPlans.length})
            </h3>
            <p className="text-xs text-slate-500">
              Dhibiti vifurushi vya mtandao vinavyoonekana kwenye ukurasa wa wateja
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={planSearch}
                onChange={(e) => setPlanSearch(e.target.value)}
                placeholder="Tafuta kifurushi, bei, au kasi..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 w-48 sm:w-56"
              />
            </div>

            {/* Status Filter */}
            <select
              value={planStatusFilter}
              onChange={(e) => setPlanStatusFilter(e.target.value as any)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Vifurushi Vyote</option>
              <option value="ACTIVE">Viko Hewani (Active)</option>
              <option value="INACTIVE">Vimezimwa (Inactive)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
            Hakuna kifurushi kilichopatikana kulingana na vigezo ulivyoweka.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
              {paginatedPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs space-y-4 transition ${
                  plan.is_active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        #{plan.id}
                      </span>
                      {plan.badge === 'POPULAR' && (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          🔥 Most Popular
                        </span>
                      )}
                      {plan.badge === 'BEST_VALUE' && (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          💎 Best Value
                        </span>
                      )}
                      {plan.badge === 'SUPER_FAST' && (
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⚡ Kasi ya Juu
                        </span>
                      )}
                      {plan.badge === 'HOT_DEAL' && (
                        <span className="text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⭐ Ofa Maalum
                        </span>
                      )}
                      {plan.badge === 'CUSTOM' && plan.badge_text && (
                        <span className="text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          🏷️ {plan.badge_text}
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 mt-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {plan.description_sw || plan.description_en}
                    </p>

                    {/* Features Bullet Points */}
                    {plan.features && plan.features.length > 0 && (
                      <div className="mt-2.5 space-y-1">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0 stroke-[2.5]" />
                            <span className="line-clamp-1">{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price & Details */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bei</span>
                    <span className="text-xl font-black text-slate-900">{formatTzs(plan.price)}</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                      <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{plan.rate_limit}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Vifaa: {plan.shared_users || 1}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(plan)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      plan.is_active
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {plan.is_active ? 'Inafanya Kazi (Active)' : 'Imezimwa (Inactive)'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(plan)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      title="Edit Plan"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(plan.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <TablePagination
                currentPage={planPage}
                totalItems={filteredPlans.length}
                pageSize={planPageSize}
                onPageChange={setPlanPage}
                onPageSizeChange={setPlanPageSize}
                itemName="vifurushi"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT FREE TRIAL PACKAGE LIMITS */}
      {/* ========================================================================= */}
      {trialConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Sanidi Kifurushi cha Bure & Limiti
                  </h3>
                  <p className="text-xs text-slate-500">
                    Weka dakika, kasi, MB, na sera unazotaka kwa wateja wanaoingia bure
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialConfigModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {trialNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{trialNotice}</span>
              </div>
            )}

            <form onSubmit={handleSaveTrialConfig} className="space-y-4">
              {/* Toggle Enable */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Kipengele cha Majaribio ya Bure</span>
                  <span className="text-[11px] text-slate-500">Kuruhusu kitufe cha kujiunga bure kwenye Captive Portal</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTrialFormData({ ...trialFormData, enabled: !trialFormData.enabled })}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    trialFormData.enabled
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {trialFormData.enabled ? 'WASHA (Active)' : 'ZIMA (Off)'}
                </button>
              </div>

              {/* Package Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jina la Kifurushi (Package Name)</label>
                <input
                  type="text"
                  required
                  value={trialFormData.name}
                  onChange={(e) => setTrialFormData({ ...trialFormData, name: e.target.value })}
                  placeholder="mfano: Majaribio ya Bure (Dakika 15)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Duration in Minutes & Lock Policy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Muda kwa Dakika (Duration Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={1440}
                    value={trialFormData.duration_minutes}
                    onChange={(e) => setTrialFormData({ ...trialFormData, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                  />
                  {/* Preset minute chips */}
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {[5, 10, 15, 30, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setTrialFormData({ ...trialFormData, duration_minutes: mins })}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition ${
                          trialFormData.duration_minutes === mins
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sera ya Ulinzi wa MAC (Lock Policy)
                  </label>
                  <select
                    value={trialFormData.lock_policy}
                    onChange={(e) => setTrialFormData({ ...trialFormData, lock_policy: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none bg-white"
                  >
                    <option value="LIFETIME">Mara 1 Tu Milele (Recommended)</option>
                    <option value="DAILY">Mara 1 Kila Baada ya Saa 24</option>
                    <option value="WEEKLY">Mara 1 Kila Wiki</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Kuzuia wateja kurudia kutumia bure mara kwa mara
                  </span>
                </div>
              </div>

              {/* Rate Limit & Data Quota */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kasi ya Intaneti / Rate Limit (Rx/Tx)
                  </label>
                  <input
                    type="text"
                    required
                    value={trialFormData.rate_limit}
                    onChange={(e) => setTrialFormData({ ...trialFormData, rate_limit: e.target.value })}
                    placeholder="2M/4M"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                  />
                  {/* Speed presets */}
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {['1M/2M', '2M/4M', '3M/6M', '5M/10M'].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setTrialFormData({ ...trialFormData, rate_limit: spd })}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold transition ${
                          trialFormData.rate_limit === spd
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ukomo wa MB (Data Quota MB)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={trialFormData.quota_mb}
                    onChange={(e) => setTrialFormData({ ...trialFormData, quota_mb: Number(e.target.value) })}
                    placeholder="0 = Bila Kikomo"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Weka 0 kama unataka iwe bila kikomo ndani ya dakika hizo
                  </span>
                </div>
              </div>

              {/* Button Text */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Maneno Kwenye Kitufe (CTA Button Text)</label>
                <input
                  type="text"
                  required
                  value={trialFormData.button_text}
                  onChange={(e) => setTrialFormData({ ...trialFormData, button_text: e.target.value })}
                  placeholder="⚡ Jiunge Bure Sasa"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Maelezo (Swahili Description)</label>
                <textarea
                  rows={2}
                  value={trialFormData.description_sw}
                  onChange={(e) => setTrialFormData({ ...trialFormData, description_sw: e.target.value })}
                  placeholder="Jaribu intaneti yetu ya kasi ya juu kwa dakika 15 bila malipo..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTrialConfigModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingTrial}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {savingTrial && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Hifadhi Limiti za Bure</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW CLAIMED DEVICES & RESET ACCESS */}
      {/* ========================================================================= */}
      {trialClaimsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Vifaa Vilivyotumia Majaribio ya Bure ({trialClaims.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Orodha ya simu na laptop zilizofungiwa na mfumo. Unaweza kufuta kifaa ili kijaribu tena.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrialClaimsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Tafuta kwa MAC Address au IP..."
                  value={trialSearchMac}
                  onChange={(e) => setTrialSearchMac(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none font-mono"
                />
              </div>

              {trialClaims.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAllClaims}
                  className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Futa Rekodi Zote (Reset All)</span>
                </button>
              )}
            </div>

            {/* Claims Table / List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {filteredClaims.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Hakuna vifaa vilivyopatikana kwenye rekodi.
                </div>
              ) : (
                paginatedClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {claim.mac_address}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                          {claim.voucher_code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>IP: {claim.user_ip || 'N/A'}</span>
                        <span>Muda: {Math.round(claim.duration_seconds / 60)} min</span>
                        <span>Tarehe: {new Date(claim.claimed_at).toLocaleString('sw-TZ')}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResetMac(claim.mac_address)}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-red-700 hover:border-red-200 font-semibold text-[11px] transition shadow-2xs cursor-pointer shrink-0"
                      title="Ruhusu mteja huyu apate intaneti ya bure tena"
                    >
                      Futa / Ruhusu Tena
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Claims Pagination (10, 20, 30, 40, ALL) */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <TablePagination
                currentPage={claimsPage}
                totalItems={filteredClaims.length}
                pageSize={claimsPageSize}
                onPageChange={setClaimsPage}
                onPageSizeChange={setClaimsPageSize}
                itemName="vifaa"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setTrialClaimsModalOpen(false)}
                className="py-2 px-5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Funga (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT PAID PLAN */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-lg text-slate-900">
                {editingPlan ? 'Hariri Kifurushi (Edit Plan)' : 'Unda Kifurushi Kipya (New Plan)'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Jina la Kifurushi (Package Name)</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="mfano: Masaa 2 - Kasi ya Juu"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Bei kwa TZS (Price)</label>
                  <input
                    type="number"
                    required
                    min={100}
                    step={100}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Muda (Masaa / Hours)</label>
                  <input
                    type="number"
                    required
                    min={0.5}
                    step={0.5}
                    value={formData.uptimeHours}
                    onChange={(e) => setFormData({ ...formData, uptimeHours: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kasi / Rate Limit (Rx/Tx)</label>
                  <input
                    type="text"
                    required
                    value={formData.rate_limit}
                    onChange={(e) => setFormData({ ...formData, rate_limit: e.target.value })}
                    placeholder="2M/4M, 5M/10M"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Idadi ya Vifaa (Shared Users)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.shared_users}
                    onChange={(e) => setFormData({ ...formData, shared_users: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Kibandiko cha Kadi (Card Badge / Tag - mfano: Most Popular, Best Value)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'NONE', label: 'Bila Kibandiko', icon: '⚪' },
                    { id: 'POPULAR', label: '🔥 Most Popular', icon: '' },
                    { id: 'BEST_VALUE', label: '💎 Best Value', icon: '' },
                    { id: 'SUPER_FAST', label: '⚡ Kasi ya Juu', icon: '' },
                    { id: 'HOT_DEAL', label: '⭐ Ofa Maalum', icon: '' },
                    { id: 'CUSTOM', label: '✏️ Maalum (Custom)', icon: '' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, badge: b.id as any })}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-left flex items-center gap-1.5 cursor-pointer ${
                        formData.badge === b.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>

                {formData.badge === 'CUSTOM' && (
                  <div className="mt-2 animate-in fade-in duration-200">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Andika Maneno ya Kibandiko (Custom Badge Words):
                    </label>
                    <input
                      type="text"
                      value={formData.badge_text}
                      onChange={(e) => setFormData({ ...formData, badge_text: e.target.value })}
                      placeholder="mfano: Weekend Offer, Gusa Uone, Ofa ya Wanafunzi..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Feature Bullet Points */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Vimaneno vya Kwenye Kadi (Feature Bullet Points)
                  </label>
                  <span className="text-[10px] text-slate-400">Mstari 1 = Alama 1 ya ✓</span>
                </div>
                <textarea
                  rows={3}
                  value={formData.featuresText}
                  onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
                  placeholder="YouTube & TikTok bila kukwama&#10;Kasi ya juu bila kikomo cha data&#10;Inafaa kwa kupakua na kupiga video call"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none leading-relaxed"
                />
                {/* Quick chip suggestions */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    'YouTube bila kukwama',
                    'Kudownload haraka',
                    'Bila kikomo cha data',
                    'Zoom & Video Call',
                    'Vifaa 2 kwa wakati 1',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        const current = formData.featuresText.trim();
                        const next = current ? `${current}\n${sug}` : sug;
                        setFormData({ ...formData, featuresText: next });
                      }}
                      className="text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 transition cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Maelezo (Swahili Description)</label>
                  <textarea
                    rows={2}
                    value={formData.description_sw}
                    onChange={(e) => setFormData({ ...formData, description_sw: e.target.value })}
                    placeholder="Maelezo ya kifurushi yanayomvutia mteja kwa Kiswahili..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Maelezo ya Kiingereza (English Description - Optional)</label>
                  <input
                    type="text"
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    placeholder="e.g. 6 Hours high speed unlimited internet for streaming and work"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPlan ? 'Hifadhi Mabadiliko' : 'Unda Kifurushi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
