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
  Plus,
  Trash2,
  Edit,
  Package,
  MapPin,
  UserCheck,
  Radio,
  Sparkles,
  Layers,
  Gift,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import {
  HotspotOwner,
  SubscriptionPackage,
  TenantFreeTrialSettings,
  DEFAULT_TENANT_FREE_TRIAL_SETTINGS,
} from '../../types/index.ts';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';
import { isInsufficientBalance } from '../../utils/carrierInfo.ts';

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
  subscription_package_id?: number | null;
  subscription_package?: SubscriptionPackage | null;
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
  const [newPriceInput, setNewPriceInput] = useState<number>(15000);
  const [applyToAllOwners, setApplyToAllOwners] = useState<boolean>(true);
  const [isSavingPrice, setIsSavingPrice] = useState<boolean>(false);

  // Individual Owner Custom Fee Modal State
  const [customFeeTarget, setCustomFeeTarget] = useState<SubscriptionItem | null>(null);
  const [customFeeAmount, setCustomFeeAmount] = useState<number>(15000);
  const [isSavingCustomFee, setIsSavingCustomFee] = useState<boolean>(false);

  // Tab State: 'ledger' | 'packages'
  const [activeTab, setActiveTab] = useState<'ledger' | 'packages'>('ledger');

  // Subscription Packages State
  const [packagesList, setPackagesList] = useState<SubscriptionPackage[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(false);
  const [isPkgModalOpen, setIsPkgModalOpen] = useState<boolean>(false);
  const [editingPkg, setEditingPkg] = useState<SubscriptionPackage | null>(null);

  // Package Form State
  const [pkgName, setPkgName] = useState<string>('');
  const [pkgPrice, setPkgPrice] = useState<number>(15000);
  const [pkgBillingCycle, setPkgBillingCycle] = useState<number>(30);
  const [pkgMaxRoutersAp, setPkgMaxRoutersAp] = useState<number>(2);
  const [pkgMaxUsers, setPkgMaxUsers] = useState<number>(500);
  const [pkgMaxSites, setPkgMaxSites] = useState<number>(1);
  const [pkgMaxStaff, setPkgMaxStaff] = useState<number>(2);
  const [pkgBadge, setPkgBadge] = useState<'POPULAR' | 'BEST_VALUE' | 'STARTER' | 'ENTERPRISE' | 'CUSTOM' | 'NONE'>('NONE');
  const [pkgDescSw, setPkgDescSw] = useState<string>('');
  const [pkgFeaturesText, setPkgFeaturesText] = useState<string>('');
  const [pkgIsActive, setPkgIsActive] = useState<boolean>(true);
  const [isSavingPkg, setIsSavingPkg] = useState<boolean>(false);

  // Assign Package to Owner Modal
  const [assignModalTarget, setAssignModalTarget] = useState<SubscriptionItem | null>(null);
  const [selectedAssignPkgId, setSelectedAssignPkgId] = useState<number | ''>('');
  const [isAssigningPkg, setIsAssigningPkg] = useState<boolean>(false);

  // Tenant Free Trial Settings State
  const [freeTrialSettings, setFreeTrialSettings] = useState<TenantFreeTrialSettings>({
    ...DEFAULT_TENANT_FREE_TRIAL_SETTINGS,
  });
  const [isLoadingTrial, setIsLoadingTrial] = useState<boolean>(false);
  const [isSavingTrial, setIsSavingTrial] = useState<boolean>(false);

  // Fetch Free Trial Settings
  const fetchFreeTrialSettings = async () => {
    setIsLoadingTrial(true);
    try {
      const res = await fetch('/api/v1/subscription/free-trial');
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.enabled === 'boolean') {
          setFreeTrialSettings(data);
        }
      }
    } catch (e) {
      console.error('Error fetching tenant free trial settings:', e);
    } finally {
      setIsLoadingTrial(false);
    }
  };

  const handleToggleFreeTrial = async () => {
    const newEnabled = !freeTrialSettings.enabled;
    const updated = { ...freeTrialSettings, enabled: newEnabled };
    setFreeTrialSettings(updated);
    await handleSaveFreeTrial(updated);
  };

  const handleSaveFreeTrial = async (customPayload?: TenantFreeTrialSettings) => {
    setIsSavingTrial(true);
    setActionMessage(null);
    try {
      const payload = customPayload || freeTrialSettings;
      const res = await fetch('/api/v1/subscription/free-trial', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kuhifadhi mipangilio ya free trial.');
      }
      setFreeTrialSettings(data.settings || payload);
      setActionMessage({
        type: 'success',
        text: (data.settings || payload).enabled
          ? `✓ Kifurushi cha Majaribio (Free Trial) kimewashwa kwa siku ${(data.settings || payload).trial_days}! Mteja mpya akijisajili atapata siku hizo za majaribio moja kwa moja.`
          : '✓ Kifurushi cha Majaribio kimezimwa. Wateja wapya watatakiwa kulipia kifurushi ili kutumia mfumo.',
      });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingTrial(false);
    }
  };

  // Fetch Packages
  const fetchPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const res = await fetch('/api/v1/subscription/packages?includeInactive=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPackagesList(data);
        }
      }
    } catch (e) {
      console.error('Error fetching subscription packages:', e);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  useEffect(() => {
    fetchPackages();
    fetchFreeTrialSettings();
  }, []);

  const handleOpenCreatePkgModal = () => {
    setEditingPkg(null);
    setPkgName('');
    setPkgPrice(15000);
    setPkgBillingCycle(30);
    setPkgMaxRoutersAp(2);
    setPkgMaxUsers(500);
    setPkgMaxSites(1);
    setPkgMaxStaff(2);
    setPkgBadge('NONE');
    setPkgDescSw('Inafaa kwa watumiaji wa biashara na wamiliki wa hotspot.');
    setPkgFeaturesText('Routers & Access Points: Hadi 2\nWateja / Vouchers: Hadi 500\nMaeneo / Sites: Eneo 1 (1 Site)\nAkaunti za Wahudumu: Wahudumu 2 (Staff)\nMalipo ya Simu (M-Pesa, Tigo, Airtel, Halo)\nCaptive Portal ya Kisasa');
    setPkgIsActive(true);
    setIsPkgModalOpen(true);
  };

  const handleOpenEditPkgModal = (pkg: SubscriptionPackage) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgPrice(pkg.price);
    setPkgBillingCycle(pkg.billing_cycle_days || 30);
    setPkgMaxRoutersAp(pkg.max_routers_ap);
    setPkgMaxUsers(pkg.max_users);
    setPkgMaxSites(pkg.max_sites);
    setPkgMaxStaff(pkg.max_staff_accounts);
    setPkgBadge(pkg.badge || 'NONE');
    setPkgDescSw(pkg.description_sw || '');
    setPkgFeaturesText((pkg.features || []).join('\n'));
    setPkgIsActive(pkg.is_active !== false);
    setIsPkgModalOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim() || Number(pkgPrice) <= 0) {
      setActionMessage({ type: 'error', text: 'Tafadhali jaza jina la kifurushi na bei halali ya kila mwezi.' });
      return;
    }

    setIsSavingPkg(true);
    setActionMessage(null);
    try {
      const features = pkgFeaturesText
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      const payload = {
        name: pkgName.trim(),
        price: Number(pkgPrice),
        billing_cycle_days: Number(pkgBillingCycle) || 30,
        max_routers_ap: Number(pkgMaxRoutersAp),
        max_users: Number(pkgMaxUsers),
        max_sites: Number(pkgMaxSites),
        max_staff_accounts: Number(pkgMaxStaff),
        badge: pkgBadge,
        description_sw: pkgDescSw.trim(),
        description_en: pkgDescSw.trim(),
        features,
        is_active: pkgIsActive,
      };

      const url = editingPkg
        ? `/api/v1/subscription/packages/${editingPkg.id}`
        : '/api/v1/subscription/packages';
      const method = editingPkg ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kuhifadhi kifurushi cha subscription.');
      }

      setIsPkgModalOpen(false);
      setActionMessage({
        type: 'success',
        text: editingPkg
          ? `✓ Kifurushi cha '${payload.name}' kimesasishwa kikamilifu!`
          : `✓ Kifurushi kipya cha '${payload.name}' kimeundwa na kiko hewani!`,
      });
      await fetchPackages();
      await fetchReport();
      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingPkg(false);
    }
  };

  const handleDeletePackage = async (pkg: SubscriptionPackage) => {
    if (!window.confirm(`Je, una uhakika unataka kufuta kifurushi cha '${pkg.name}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/subscription/packages/${pkg.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kufuta kifurushi.');

      setActionMessage({ type: 'success', text: `✓ Kifurushi cha '${pkg.name}' kimefutwa kikamilifu.` });
      await fetchPackages();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalTarget || !selectedAssignPkgId) return;

    setIsAssigningPkg(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/owners/${assignModalTarget.id}/assign-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: Number(selectedAssignPkgId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kugawa kifurushi kwa mmiliki.');

      setAssignModalTarget(null);
      setActionMessage({
        type: 'success',
        text: data.message || `✓ Kifurushi kimepangiwa kwa ${assignModalTarget.business_name} kikamilifu!`,
      });
      await fetchReport();
      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setIsAssigningPkg(false);
    }
  };

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
      const rawError = err.message || '';
      const isNoFunds = isInsufficientBalance(rawError);
      setActionMessage({
        type: 'error',
        text: isNoFunds
          ? `⚠️ Account ya ${owner.business_name} (${owner.phone}) haina salio la kutosha.`
          : (rawError || 'Hitilafu ya kutuma STK Push.'),
      });
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
              setNewPriceInput(currentSubscriptionPrice);
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreatePkgModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'sw' ? '+ Kifurushi Kipya' : '+ New Package'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewPriceInput(currentSubscriptionPrice);
              setIsPriceModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Edit3 className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Badilisha Bei ya Msingi' : 'Change Default Fee'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Daftari la Malipo ya Wamiliki (Ledger)' : 'Owner Subscription Ledger'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {summary.total_owners}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('packages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            activeTab === 'packages'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Vifurushi vya Subscription (Packages & Quotas)' : 'Subscription Packages'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'packages' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
            {packagesList.length}
          </span>
        </button>
      </div>

      {/* LEDGER TAB CONTENT */}
      {activeTab === 'ledger' && (
        <>
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
                <th className="py-3 px-4">{lang === 'sw' ? 'Kifurushi (Package)' : 'Package'}</th>
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
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span>{lang === 'sw' ? 'Inapakia data ya wamiliki...' : 'Loading subscription data...'}</span>
                  </td>
                </tr>
              ) : paginatedOwners.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
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

                    {/* Subscription Package */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5 rounded-lg text-[11px]">
                          {owner.subscription_package?.name || 'Starter WiFi'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignModalTarget(owner);
                            setSelectedAssignPkgId(owner.subscription_package_id || packagesList[0]?.id || '');
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                          title={lang === 'sw' ? 'Panga / Badilisha Kifurushi' : 'Assign Package'}
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>📡 {owner.subscription_package?.max_routers_ap === -1 ? '∞ APs' : `${owner.subscription_package?.max_routers_ap || 2} APs`}</span>
                        <span>•</span>
                        <span>👥 {owner.subscription_package?.max_users === -1 ? '∞ Users' : `${(owner.subscription_package?.max_users || 500).toLocaleString()}`}</span>
                      </div>
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
                      {owner.subscription_status === 'TRIAL' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-bold text-[11px] shadow-2xs">
                          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{lang === 'sw' ? 'MAJARIBIO (TRIAL)' : 'FREE TRIAL'}</span>
                        </div>
                      ) : owner.is_paid ? (
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
    </>
  )}

  {/* PACKAGES TAB CONTENT */}
  {activeTab === 'packages' && (
    <div className="space-y-6">
      {/* Header & New Package CTA */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tiered SaaS Packages & Quotas</span>
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {lang === 'sw' ? 'Mipango na Vifurushi vya Subscription ya Kila Mwezi' : 'Subscription Plans & Quota Management'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {lang === 'sw'
              ? 'Bainisha na udhibiti vifurushi vya mfumo. Kila kifurushi kinaweka mipaka ya Routers na AP, idadi ya wateja (users / vocha), maeneo (sites), na akaunti za wahudumu (staff). Vifurushi hivi vinaonekana moja kwa moja kwenye Ukurasa Mkuu (Home Page).'
              : 'Define and manage subscription tiers. Each package sets quotas for Routers & APs, active users / vouchers, sites, and staff operator accounts. These tiers are displayed publicly on the Home Page.'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreatePkgModal}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 transition"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Ongeza Kifurushi Kipya' : 'Add New Tier'}</span>
        </button>
      </div>

      {/* =======================================================================
          FREE TRIAL CONFIGURATION CARD (Hotspot Owner SaaS Signup Trial)
          ======================================================================= */}
      <div
        className={`p-6 rounded-3xl border transition-all duration-300 shadow-sm ${
          freeTrialSettings.enabled
            ? 'bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-50/60 border-amber-300 ring-2 ring-amber-400/20'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                freeTrialSettings.enabled
                  ? 'bg-amber-500 text-white shadow-amber-500/30'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-slate-900">
                  {lang === 'sw'
                    ? 'Kifurushi cha Majaribio ya Bure (Free Trial Package)'
                    : 'Customer Free Trial Package Settings'}
                </h4>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    freeTrialSettings.enabled
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {freeTrialSettings.enabled
                    ? lang === 'sw' ? '● IMEWASHWA (ACTIVE)' : '● ENABLED'
                    : lang === 'sw' ? '○ IMEZIMWA (OFF)' : '○ DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'sw'
                  ? 'Weka idadi ya siku za bure mteja anazopata akijisajili tu kwenye mfumo bila kulipia kabla. Unaweza kuiwasha au kuizima wakati wowote.'
                  : 'Configure how many free trial days new hotspot owners get immediately upon registration with zero upfront payment.'}
              </p>
            </div>
          </div>

          {/* Master ON/OFF Switch */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleFreeTrial}
              disabled={isSavingTrial}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-md ${
                freeTrialSettings.enabled
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  freeTrialSettings.enabled ? 'bg-white animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span>
                {freeTrialSettings.enabled
                  ? lang === 'sw' ? 'Washa/Zima: IMEWASHWA' : 'Toggle: ENABLED'
                  : lang === 'sw' ? 'Washa/Zima: IMEZIMWA' : 'Toggle: DISABLED'}
              </span>
            </button>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-5">
          {/* Trial Days Input */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>{lang === 'sw' ? 'Siku za Majaribio' : 'Trial Days'}</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="365"
                value={freeTrialSettings.trial_days}
                onChange={(e) =>
                  setFreeTrialSettings({
                    ...freeTrialSettings,
                    trial_days: Math.max(1, Number(e.target.value) || 1),
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                {lang === 'sw' ? 'siku' : 'days'}
              </span>
            </div>
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setFreeTrialSettings({ ...freeTrialSettings, trial_days: days })}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                    freeTrialSettings.trial_days === days
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          {/* Quota: Routers & APs */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'sw' ? 'Routers & APs' : 'Routers & APs'}</span>
            </label>
            <input
              type="number"
              min="1"
              value={freeTrialSettings.max_routers_ap}
              onChange={(e) =>
                setFreeTrialSettings({
                  ...freeTrialSettings,
                  max_routers_ap: Number(e.target.value) || 1,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 block">Kikomo wakati wa majaribio</span>
          </div>

          {/* Quota: Max Users */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'sw' ? 'Wateja (Users / Vocha)' : 'Max Users'}</span>
            </label>
            <input
              type="number"
              min="10"
              step="50"
              value={freeTrialSettings.max_users}
              onChange={(e) =>
                setFreeTrialSettings({
                  ...freeTrialSettings,
                  max_users: Number(e.target.value) || 100,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 block">Vocha & wateja kwa mwezi</span>
          </div>

          {/* Quota: Max Sites */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'sw' ? 'Maeneo (Sites)' : 'Max Sites'}</span>
            </label>
            <input
              type="number"
              min="1"
              value={freeTrialSettings.max_sites}
              onChange={(e) =>
                setFreeTrialSettings({
                  ...freeTrialSettings,
                  max_sites: Number(e.target.value) || 1,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 block">Idadi ya matawi/locations</span>
          </div>

          {/* Quota: Max Staff */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'sw' ? 'Wahudumu (Staff)' : 'Staff Accounts'}</span>
            </label>
            <input
              type="number"
              min="1"
              value={freeTrialSettings.max_staff_accounts}
              onChange={(e) =>
                setFreeTrialSettings({
                  ...freeTrialSettings,
                  max_staff_accounts: Number(e.target.value) || 1,
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-slate-400 block">Wahudumu wa keshia/POS</span>
          </div>
        </div>

        {/* Bottom Status Info & Save CTA */}
        <div className="mt-5 pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs">
            {freeTrialSettings.enabled ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {lang === 'sw'
                    ? `Mteja mpya akijisajili atapata Siku ${freeTrialSettings.trial_days} za majaribio ya bure moja kwa moja bila kuzuiliwa.`
                    : `New registrations automatically receive ${freeTrialSettings.trial_days} days of full active trial access.`}
                </span>
              </span>
            ) : (
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {lang === 'sw'
                    ? 'Majaribio yamezimwa. Wateja wapya wakijisajili akaunti itakuwa EXPIRED na watalazimika kulipia kabla ya kuanza.'
                    : 'Free trial disabled. New accounts are created as EXPIRED and require payment before activation.'}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSaveFreeTrial()}
            disabled={isSavingTrial}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {isSavingTrial ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>
              {lang === 'sw' ? 'Hifadhi Mipangilio ya Majaribio' : 'Save Trial Settings'}
            </span>
          </button>
        </div>
      </div>
      {isLoadingPackages ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
          <p className="text-xs text-slate-500 font-bold">Inapakia vifurushi vya subscription...</p>
        </div>
      ) : packagesList.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <Package className="w-12 h-12 mx-auto text-slate-300" />
          <h4 className="font-bold text-slate-800">Hakuna vifurushi vilivyopatikana</h4>
          <p className="text-xs text-slate-500">Bofya kitufe cha "+ Ongeza Kifurushi Kipya" kuanzisha kifurushi cha kwanza.</p>
          <button
            type="button"
            onClick={handleOpenCreatePkgModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ongeza Kifurushi</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packagesList.map((pkg) => {
            const isPopular = pkg.badge === 'POPULAR';
            const isEnterprise = pkg.badge === 'ENTERPRISE';
            const isBestValue = pkg.badge === 'BEST_VALUE';

            return (
              <div
                key={pkg.id}
                className={`relative bg-white rounded-3xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-xl ${
                  isPopular
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : isEnterprise
                    ? 'border-slate-800'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Top Ribbon Badge */}
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {pkg.badge && pkg.badge !== 'NONE' ? (
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-2xs ${
                          isPopular
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : isEnterprise
                            ? 'bg-slate-900 text-amber-300 border-slate-800'
                            : isBestValue
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {pkg.badge === 'POPULAR'
                          ? '⭐ INAYOPENDWA ZAIDI'
                          : pkg.badge === 'ENTERPRISE'
                          ? '👑 KAMPUNI KUBWA (ENTERPRISE)'
                          : pkg.badge === 'BEST_VALUE'
                          ? '🔥 CHAGUO BORA'
                          : pkg.badge}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        KIFURUSHI CHA SAAS
                      </span>
                    )}

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        pkg.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {pkg.is_active !== false ? '● Kiko Hewani' : '○ Kimezimwa'}
                    </span>
                  </div>

                  {/* Package Title & Price */}
                  <h4 className="text-xl font-black text-slate-900">{pkg.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description_sw}</p>

                  <div className="mt-4 pb-4 border-b border-slate-100 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black font-mono text-slate-900">
                      TZS {pkg.price.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      / siku {pkg.billing_cycle_days || 30}
                    </span>
                  </div>

                  {/* 4 Quotas Cards */}
                  <div className="mt-5 space-y-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Mipaka ya Kifurushi (Tiers & Quotas):
                    </span>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* 1. Routers & APs */}
                      <div className="p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Routers & APs</div>
                          <div className="font-bold text-slate-900">
                            {pkg.max_routers_ap === -1 ? 'Bila Kikomo' : `Hadi ${pkg.max_routers_ap}`}
                          </div>
                        </div>
                      </div>

                      {/* 2. Users / Wateja */}
                      <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Wateja / Vocha</div>
                          <div className="font-bold text-slate-900">
                            {pkg.max_users === -1 ? 'Bila Kikomo' : `Hadi ${pkg.max_users.toLocaleString()}`}
                          </div>
                        </div>
                      </div>

                      {/* 3. Sites / Maeneo */}
                      <div className="p-2.5 rounded-2xl bg-cyan-50/70 border border-cyan-100 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Maeneo (Sites)</div>
                          <div className="font-bold text-slate-900">
                            {pkg.max_sites === -1 ? 'Bila Kikomo' : `${pkg.max_sites} ${pkg.max_sites === 1 ? 'Site' : 'Sites'}`}
                          </div>
                        </div>
                      </div>

                      {/* 4. Staff Accounts */}
                      <div className="p-2.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Staff Accounts</div>
                          <div className="font-bold text-slate-900">
                            {pkg.max_staff_accounts === -1 ? 'Bila Kikomo' : `Hadi ${pkg.max_staff_accounts}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features List */}
                  {pkg.features && pkg.features.length > 0 && (
                    <div className="mt-5 space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                        Faida Zilizojumuishwa:
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {pkg.features.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditPkgModal(pkg)}
                    className="flex-1 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Edit className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hariri Kifurushi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePackage(pkg)}
                    className="p-2 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                    title="Futa Kifurushi"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

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

      {/* MODAL 1: BADILISHA BEI KUU YA SUBSCRIPTION (GLOBAL SETTINGS) */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {lang === 'sw' ? 'Badilisha Bei ya Subscription' : 'Change Subscription Fee'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'sw' ? 'Weka kiwango kipya cha malipo ya kila mwezi' : 'Set standard monthly tenant subscription price'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscriptionPrice} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Bei Mpya ya Mwezi (TZS)' : 'New Monthly Fee (TZS)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">TZS</span>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    value={newPriceInput}
                    onChange={(e) => setNewPriceInput(Number(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="15000"
                    required
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  {lang === 'sw' ? 'Chagua Haraka (Presets):' : 'Quick Presets:'}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[10000, 15000, 20000, 25000, 30000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewPriceInput(preset)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        newPriceInput === preset
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox to apply to all current owners */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToAllOwners}
                    onChange={(e) => setApplyToAllOwners(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 block">
                      {lang === 'sw' ? 'Sasisha pia kwa wamiliki wote waliopo' : 'Apply to all existing hotspot owners'}
                    </span>
                    <span className="text-[11px] text-amber-700">
                      {lang === 'sw'
                        ? 'Wamiliki wote ' + ownersList.length + ' watarekebishwa kiotomatiki kuwa ada hii mpya kila mwezi.'
                        : 'Updates all ' + ownersList.length + ' registered owners to this new monthly subscription rate.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPriceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingPrice || newPriceInput < 500}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingPrice && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {lang === 'sw' ? 'Hifadhi Bei Mpya' : 'Save New Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BADILISHA ADA YA MMILIKI MMOJA MMOJA (INDIVIDUAL OWNER FEE) */}
      {customFeeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {lang === 'sw' ? 'Badilisha Ada ya Mteja Huyu' : 'Edit Customer Subscription Fee'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {customFeeTarget.name} ({customFeeTarget.business_name})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomFeeTarget(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOwnerCustomFee} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Ada Maalum ya Kila Mwezi (TZS)' : 'Custom Monthly Fee (TZS)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">TZS</span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={customFeeAmount}
                    onChange={(e) => setCustomFeeAmount(Number(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="15000"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {lang === 'sw'
                    ? 'Ada ya kawaida kwa sasa ni TZS ' + currentSubscriptionPrice.toLocaleString()
                    : 'System standard fee is TZS ' + currentSubscriptionPrice.toLocaleString()}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCustomFeeTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                >
                  {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomFee || customFeeAmount < 500}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingCustomFee && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {lang === 'sw' ? 'Hifadhi Ada' : 'Save Fee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE / EDIT SUBSCRIPTION PACKAGE */}
      {isPkgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingPkg
                      ? (lang === 'sw' ? 'Hariri Kifurushi cha Subscription' : 'Edit Subscription Tier')
                      : (lang === 'sw' ? 'Tengeneza Kifurushi Kipya cha Subscription' : 'Create Subscription Tier')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'sw'
                      ? 'Panga bei, mipaka ya routers, watumiaji, maeneo, na akaunti za wahudumu'
                      : 'Configure pricing, router limits, users, sites, and operator accounts'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPkgModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
              {/* Package Name & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'sw' ? 'Jina la Kifurushi:' : 'Tier Name:'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mfano: Starter WiFi, Business Pro"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'sw' ? 'Lebo ya Kipekee (Badge):' : 'Ribbon Badge:'}
                  </label>
                  <select
                    value={pkgBadge}
                    onChange={(e) => setPkgBadge(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="NONE">Bila Lebo (None)</option>
                    <option value="STARTER">Starter / Kianzio</option>
                    <option value="POPULAR">Inayopendwa Zaidi (Popular)</option>
                    <option value="BEST_VALUE">Chaguo Bora (Best Value)</option>
                    <option value="ENTERPRISE">Kampuni Kubwa (Enterprise)</option>
                  </select>
                </div>
              </div>

              {/* Price & Billing Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'sw' ? 'Bei ya Kila Mwezi (TZS):' : 'Monthly Price (TZS):'} *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">TZS</span>
                    <input
                      type="number"
                      required
                      min="0"
                      step="500"
                      value={pkgPrice}
                      onChange={(e) => setPkgPrice(Number(e.target.value) || 0)}
                      className="w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === 'sw' ? 'Muda wa Kifurushi (Siku):' : 'Billing Cycle (Days):'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={pkgBillingCycle}
                    onChange={(e) => setPkgBillingCycle(Number(e.target.value) || 30)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 4 Quotas Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Mipaka ya Kifurushi (Tier Quotas)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    Weka -1 kwa Bila Kikomo (Unlimited)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Routers & APs */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Routers & AP:
                    </label>
                    <input
                      type="number"
                      value={pkgMaxRoutersAp}
                      onChange={(e) => setPkgMaxRoutersAp(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                      {pkgMaxRoutersAp === -1 ? 'Bila Kikomo' : `${pkgMaxRoutersAp} APs`}
                    </span>
                  </div>

                  {/* Users / Vocha */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Wateja (Users):
                    </label>
                    <input
                      type="number"
                      value={pkgMaxUsers}
                      onChange={(e) => setPkgMaxUsers(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                      {pkgMaxUsers === -1 ? 'Bila Kikomo' : `${pkgMaxUsers} Users`}
                    </span>
                  </div>

                  {/* Sites / Maeneo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Maeneo (Sites):
                    </label>
                    <input
                      type="number"
                      value={pkgMaxSites}
                      onChange={(e) => setPkgMaxSites(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                      {pkgMaxSites === -1 ? 'Bila Kikomo' : `${pkgMaxSites} Sites`}
                    </span>
                  </div>

                  {/* Staff Accounts */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Staff Accounts:
                    </label>
                    <input
                      type="number"
                      value={pkgMaxStaff}
                      onChange={(e) => setPkgMaxStaff(Number(e.target.value))}
                      className="w-full px-2.5 py-2 bg-white rounded-xl border border-slate-300 font-mono font-bold text-center"
                    />
                    <span className="text-[10px] text-slate-400 block text-center mt-0.5">
                      {pkgMaxStaff === -1 ? 'Bila Kikomo' : `${pkgMaxStaff} Staff`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Swahili */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Maelezo Mafupi (Swahili):' : 'Short Description:'}
                </label>
                <textarea
                  rows={2}
                  value={pkgDescSw}
                  onChange={(e) => setPkgDescSw(e.target.value)}
                  placeholder="Mfano: Inafaa kwa wamiliki wadogo au maduka ya mtaani yenye router 1 au 2."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Features List */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === 'sw' ? 'Faida na Vipengele (Moja kwa kila mstari):' : 'Features (One per line):'}
                </label>
                <textarea
                  rows={4}
                  value={pkgFeaturesText}
                  onChange={(e) => setPkgFeaturesText(e.target.value)}
                  placeholder="Routers & APs: Hadi 2&#10;Wateja / Vouchers: Hadi 500&#10;Maeneo: Eneo 1 (1 Site)&#10;Akaunti za Wahudumu: 2&#10;Malipo ya Simu (M-Pesa, Tigo, Airtel, Halopesa)&#10;Captive Portal ya Kisasa"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Is Active Toggle */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">Kifurushi Kiko Hewani (Active)</span>
                  <span className="text-[11px] text-slate-500">
                    Kikiwa hewani, kitatokea kwenye tovuti ya mbele (Home Page) na wakati wa usajili mpya.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={pkgIsActive}
                  onChange={(e) => setPkgIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPkgModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSavingPkg || !pkgName.trim() || pkgPrice <= 0}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-500/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingPkg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingPkg ? 'Hifadhi Mabadiliko' : 'Tengeneza Kifurushi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ASSIGN PACKAGE TO OWNER */}
      {assignModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {lang === 'sw' ? 'Panga Kifurushi cha Mmiliki' : 'Assign Subscription Package'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {assignModalTarget.business_name} ({assignModalTarget.name})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalTarget(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignPackage} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chagua Kifurushi:
                </label>
                <select
                  value={selectedAssignPkgId}
                  onChange={(e) => setSelectedAssignPkgId(Number(e.target.value) || '')}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Chagua Kifurushi --</option>
                  {packagesList.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — TZS {pkg.price.toLocaleString()} / mwezi
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Package Details Preview */}
              {(() => {
                const selectedPkg = packagesList.find((p) => p.id === Number(selectedAssignPkgId));
                if (!selectedPkg) return null;
                return (
                  <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-indigo-900 text-sm">{selectedPkg.name}</span>
                      <span className="font-mono font-bold text-indigo-700">
                        TZS {selectedPkg.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-indigo-100">
                      <div>📡 APs: <strong>{selectedPkg.max_routers_ap === -1 ? 'Bila Kikomo' : selectedPkg.max_routers_ap}</strong></div>
                      <div>👥 Wateja: <strong>{selectedPkg.max_users === -1 ? 'Bila Kikomo' : selectedPkg.max_users.toLocaleString()}</strong></div>
                      <div>📍 Sites: <strong>{selectedPkg.max_sites === -1 ? 'Bila Kikomo' : selectedPkg.max_sites}</strong></div>
                      <div>🛡️ Staff: <strong>{selectedPkg.max_staff_accounts === -1 ? 'Bila Kikomo' : selectedPkg.max_staff_accounts}</strong></div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={isAssigningPkg || !selectedAssignPkgId}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isAssigningPkg && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Weka Kifurushi Hiki</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
