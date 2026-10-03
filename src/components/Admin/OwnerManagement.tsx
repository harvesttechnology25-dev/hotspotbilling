import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Server,
  Phone,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  Wifi,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Coins,
  CreditCard,
  Key,
  ShieldCheck,
  Clock,
  Receipt,
  XCircle,
  Calendar,
  Zap,
  ArrowRight,
  BadgeAlert,
  Sliders,
  CheckCheck,
  LayoutGrid,
  List,
  Power,
} from 'lucide-react';
import { HotspotOwner, RouterItem, UserRole, ManualSubscriptionRequest } from '../../types/index.ts';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

interface OwnerManagementProps {
  onSwitchToOwner?: (owner: HotspotOwner) => void;
  onOwnersUpdated?: () => void;
}

export const OwnerManagement: React.FC<OwnerManagementProps> = ({ onSwitchToOwner, onOwnersUpdated }) => {
  const [owners, setOwners] = useState<HotspotOwner[]>([]);
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [manualRequests, setManualRequests] = useState<ManualSubscriptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [pingingRouterId, setPingingRouterId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<HotspotOwner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'updated'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revealedPasswordId, setRevealedPasswordId] = useState<number | null>(null);

  // Manual Subscription Approval Modal State
  const [manualApproveTarget, setManualApproveTarget] = useState<HotspotOwner | null>(null);
  const [isManualApproveModalOpen, setIsManualApproveModalOpen] = useState(false);
  const [manualDurationDays, setManualDurationDays] = useState<number>(30);
  const [manualAmountPaid, setManualAmountPaid] = useState<number>(15000);
  const [manualPaymentMethod, setManualPaymentMethod] = useState<
    'CASH' | 'BANK_TRANSFER' | 'MANUAL_MPESA' | 'MANUAL_TIGO' | 'MANUAL_AIRTEL' | 'VENDOR_OVERRIDE'
  >('CASH');
  const [manualReferenceNote, setManualReferenceNote] = useState('Malipo ya Taslimu / Verified by Vendor HQ');
  const [manualNotes, setManualNotes] = useState('');
  const [manualRequestId, setManualRequestId] = useState<number | undefined>(undefined);
  const [isApprovingManual, setIsApprovingManual] = useState(false);
  const [manualApproveSaveStatus, setManualApproveSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Filter for manual requests
  const [showPendingRequestsOnly, setShowPendingRequestsOnly] = useState(true);

  // Pagination (10, 20, 30, 40, ALL)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);

  // Password visibility inside modal
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Newly created credentials modal state
  const [newCredentials, setNewCredentials] = useState<{
    name: string;
    business_name: string;
    email: string;
    phone: string;
    password: string;
    monthly_fee: number;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Registration OTP Policy State
  const [requireOtpPolicy, setRequireOtpPolicy] = useState<boolean>(true);
  const [isUpdatingOtpPolicy, setIsUpdatingOtpPolicy] = useState(false);

  // Form State
  const [formState, setFormState] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    password: '123456',
    confirmPassword: '123456',
    role: 'HOTSPOT_OWNER' as UserRole,
    monthly_fee: 15000,
    commission_rate: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
    palmpesa_user_id: '',
    palmpesa_user_ref: '',
    palmpesa_api_token: '',
    palmpesa_accept_stk: true,
  });

  const fetchOtpPolicy = async () => {
    try {
      const res = await fetch('/api/v1/auth/registration-config');
      if (res.ok) {
        const data = await res.json();
        if (data && data.requireOtp !== undefined) {
          setRequireOtpPolicy(Boolean(data.requireOtp));
        }
      }
    } catch (e) {
      console.error('Failed to fetch OTP config:', e);
    }
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) {
      setIsLoading(true);
    }
    try {
      const [ownersRes, routersRes, reqsRes] = await Promise.allSettled([
        fetch(`/api/v1/owners?_t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/v1/routers?_t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/v1/subscription/manual-requests?_t=${Date.now()}`, { cache: 'no-store' }),
      ]);

      if (ownersRes.status === 'fulfilled' && ownersRes.value.ok) {
        const ownersData = await ownersRes.value.json();
        if (Array.isArray(ownersData)) {
          setOwners(ownersData);
        }
      }

      if (routersRes.status === 'fulfilled' && routersRes.value.ok) {
        const routersData = await routersRes.value.json();
        if (Array.isArray(routersData)) {
          setRouters(routersData);
        }
      }

      if (reqsRes.status === 'fulfilled' && reqsRes.value.ok) {
        const reqsData = await reqsRes.value.json();
        if (Array.isArray(reqsData)) {
          setManualRequests(reqsData);
        }
      }

      if (onOwnersUpdated) onOwnersUpdated();
    } catch (err) {
      console.error('Failed to load owners data:', err);
    } finally {
      if (!isBackground) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(false);
    // Real-time background sync every 5 seconds
    const interval = setInterval(() => fetchData(true), 5000);
    return () => clearInterval(interval);
  }, []);

  // Ping MikroTik Router to test live connectivity
  const handlePingRouter = async (router: RouterItem) => {
    setPingingRouterId(router.id);
    try {
      const res = await fetch(`/api/v1/routers/${router.id}/test-connection`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.reachable) {
        setMessage({
          type: "success",
          text: `✓ Router/AP: ${router.name} iko ONLINE (Hewani)! Ping Latency: ${data.latencyMs}ms.`,
        });
      } else {
        setMessage({
          type: "error",
          text: `✕ Router/AP: ${router.name} iko OFFLINE au haikupatikana (${data.message || "Timeout"}).`,
        });
      }
      fetchData(true);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Hitilafu ya kupima muunganisho." });
    } finally {
      setPingingRouterId(null);
    }
  };

  // Vendor toggle MikroTik Router / AP status between ONLINE and OFFLINE
  const handleToggleRouterStatus = async (router: RouterItem) => {
    try {
      const nextStatus = router.status === "ONLINE" ? "OFFLINE" : "ONLINE";
      const res = await fetch(`/api/v1/routers/${router.id}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setMessage({
          type: "success",
          text: `✓ Hali ya ${router.name} imebadilishwa kuwa: ${nextStatus === "ONLINE" ? "🟢 ONLINE (Hewani)" : "🔴 OFFLINE (Imekatika)"}.`,
        });
        fetchData(true);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  // Calculate exact subscription days and expiration status for an owner
  const getSubscriptionInfo = (owner: HotspotOwner) => {
    const isVendor = owner.role === "VENDOR_ADMIN";
    if (isVendor) {
      return { isExpired: false, daysLeft: 999, label: "Bila Kikomo", expiresDateStr: "Vendor Master" };
    }
    const now = Date.now();
    const expiresAt = owner.subscription_expires_at
      ? new Date(owner.subscription_expires_at).getTime()
      : 0;
    const isExpired =
      owner.subscription_status === "EXPIRED" ||
      (owner.subscription_expires_at ? expiresAt <= now : false);
    const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    return {
      isExpired,
      daysLeft,
      label: isExpired ? "Imeisha (Expired)" : `Siku ${daysLeft} zimebaki`,
      expiresDateStr: owner.subscription_expires_at
        ? new Date(owner.subscription_expires_at).toLocaleDateString("sw-TZ", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Haijawekwa",
    };
  };

  // Vendor toggle subscription expire / activate button
  const handleToggleSubscription = async (owner: HotspotOwner, newStatus: "ACTIVE" | "EXPIRED") => {
    if (owner.role === "VENDOR_ADMIN" || owner.id === 1) {
      alert("Huwezi kusitisha subscription ya Vendor Master HQ!");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/owners/${owner.id}/toggle-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: newStatus === "ACTIVE" ? "activate" : "expire",
          days: 30,
        }),
      });
      if (!res.ok) {
        throw new Error("Imeshindwa kubadilisha hali ya subscription.");
      }
      setMessage({
        type: "success",
        text:
          newStatus === "ACTIVE"
            ? `✓ Subscription ya ${owner.business_name} (${owner.name}) imewashwa kwa siku 30!`
            : `✓ Subscription ya ${owner.business_name} (${owner.name}) imesitishwa (Imeisha/Expired)! Mteja huyu ataona ukurasa wa subscription mara moja akifungua mfumo.`,
      });
      fetchData(true);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Hitilafu imetokea." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingOwner(null);
    setFormState({
      name: '',
      business_name: '',
      email: '',
      phone: '',
      password: '123456',
      confirmPassword: '123456',
      role: 'HOTSPOT_OWNER',
      monthly_fee: 15000,
      commission_rate: 0,
      status: 'ACTIVE',
      palmpesa_user_id: '',
      palmpesa_user_ref: '',
      palmpesa_api_token: '',
      palmpesa_accept_stk: true,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (owner: HotspotOwner) => {
    setEditingOwner(owner);
    const pwd = owner.password || '123456';
    setFormState({
      name: owner.name,
      business_name: owner.business_name,
      email: owner.email,
      phone: owner.phone,
      password: pwd,
      confirmPassword: pwd,
      role: owner.role,
      monthly_fee: owner.monthly_fee !== undefined ? owner.monthly_fee : 15000,
      commission_rate: owner.commission_rate || 0,
      status: owner.status,
      palmpesa_user_id: owner.palmpesa_user_id || '',
      palmpesa_user_ref: owner.palmpesa_user_ref || '',
      palmpesa_api_token: owner.palmpesa_api_token || '',
      palmpesa_accept_stk: owner.palmpesa_accept_stk !== false,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsAddModalOpen(true);
  };

  // Open Manual Approval Modal for an owner (or from a pending request)
  const handleOpenManualApprove = (owner: HotspotOwner, request?: ManualSubscriptionRequest) => {
    setManualApproveTarget(owner);
    setManualRequestId(request?.id);
    setManualDurationDays(request?.duration_days || 30);
    setManualAmountPaid(request?.amount || owner.subscription_fee || owner.monthly_fee || 15000);
    setManualPaymentMethod((request?.payment_method as any) || 'CASH');
    setManualReferenceNote(
      request?.reference_note || 'Malipo ya Taslimu / Verified & Approved by Vendor HQ'
    );
    setManualNotes(request?.notes || '');
    setManualApproveSaveStatus('idle');
    setIsManualApproveModalOpen(true);
  };

  // Submit Manual Approval & Unlock Hotspot Account
  const handleSubmitManualApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualApproveTarget) return;

    setIsApprovingManual(true);
    setManualApproveSaveStatus('saving');

    try {
      const res = await fetch('/api/v1/subscription/manual-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: manualApproveTarget.id,
          durationDays: Number(manualDurationDays) || 30,
          amountPaid: Number(manualAmountPaid) || 15000,
          paymentMethod: manualPaymentMethod,
          referenceNote: manualReferenceNote.trim(),
          notes: manualNotes.trim(),
          requestId: manualRequestId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kuidhinisha subscription.');

      setManualApproveSaveStatus('saved');
      setMessage({
        type: 'success',
        text: `✓ Subscription ya ${manualApproveTarget.business_name} (${manualApproveTarget.name}) imethibitishwa kwa siku ${manualDurationDays}! Mfumo wake umefunguliwa kikamilifu.`,
      });

      setTimeout(() => {
        setIsManualApproveModalOpen(false);
        setManualApproveSaveStatus('idle');
        setManualApproveTarget(null);
      }, 1200);

      fetchData();
    } catch (err: any) {
      setManualApproveSaveStatus('idle');
      setMessage({ type: 'error', text: err.message || 'Hitilafu ya kuidhinisha.' });
    } finally {
      setIsApprovingManual(false);
    }
  };

  // Reject a Manual Request
  const handleRejectManualRequest = async (reqId: number, reqName: string) => {
    if (!confirm(`Una uhakika unataka kukataa ombi hili la malipo kutoka kwa '${reqName}'?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/subscription/manual-requests/${reqId}/reject`, {
        method: 'POST',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Ombi #${reqId} limekataliwa.` });
        fetchData();
      } else {
        throw new Error('Imeshindikana kukataa ombi.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.business_name || !formState.phone) {
      setMessage({
        type: 'error',
        text: 'Tafadhali jaza jina la mmiliki, biashara na namba ya simu.',
      });
      return;
    }

    // Confirm password validation
    if (formState.password !== formState.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Nenosiri na Kuthibitisha Nenosiri hazilingani! Tafadhali hakikisha yanafanana kabla ya kuhifadhi.',
      });
      return;
    }

    if (formState.password.length < 4) {
      setMessage({
        type: 'error',
        text: 'Nenosiri linapaswa kuwa na angalau herufi au tarakimu 4.',
      });
      return;
    }

    setIsSubmitting(true);
    setSaveStatus('saving');
    setMessage(null);

    try {
      const url = editingOwner ? `/api/v1/owners/${editingOwner.id}` : '/api/v1/owners';
      const method = editingOwner ? 'PUT' : 'POST';

      const payload = {
        name: formState.name,
        business_name: formState.business_name,
        email: formState.email,
        phone: formState.phone,
        password: formState.password,
        role: formState.role,
        monthly_fee: Number(formState.monthly_fee) || 15000,
        subscription_fee: Number(formState.monthly_fee) || 15000,
        commission_rate: formState.commission_rate,
        status: formState.status,
        palmpesa_user_id: formState.palmpesa_user_id ? formState.palmpesa_user_id.trim() : undefined,
        palmpesa_user_ref: formState.palmpesa_user_ref ? formState.palmpesa_user_ref.trim() : undefined,
        palmpesa_api_token: formState.palmpesa_api_token ? formState.palmpesa_api_token.trim() : undefined,
        palmpesa_accept_stk: formState.palmpesa_accept_stk,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kuhifadhi mmiliki');

      setSaveStatus(editingOwner ? 'updated' : 'saved');

      setTimeout(() => {
        setIsAddModalOpen(false);
        setSaveStatus('idle');
      }, 1000);

      if (!editingOwner) {
        // Show the newly created credentials card
        setNewCredentials({
          name: formState.name,
          business_name: formState.business_name,
          email: formState.email || `${formState.phone.replace(/\D/g, '')}@tzwifi.local`,
          phone: formState.phone,
          password: formState.password || '123456',
          monthly_fee: Number(formState.monthly_fee) || 15000,
        });
      } else {
        setMessage({
          type: 'success',
          text: `✓ Taarifa za ${formState.name} zimesasishwa (Updated) kikamilifu!`,
        });
      }

      fetchData();
    } catch (err: any) {
      setSaveStatus('idle');
      setMessage({ type: 'error', text: err.message || 'Hitilafu imetokea.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (owner: HotspotOwner) => {
    if (owner.role === 'VENDOR_ADMIN') {
      alert('Huwezi kufuta akaunti kuu ya Vendor Admin!');
      return;
    }

    if (
      !confirm(
        `Una uhakika unataka kumfuta mmiliki ${owner.name} (${owner.business_name})? Hatua hii haiwezi kurudishwa.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/owners/${owner.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Mmiliki ${owner.name} ameondolewa kwenye mfumo.`,
        });
        fetchData();
      } else {
        throw new Error('Imeshindikana kufuta.');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const copyCredsToClipboard = () => {
    if (!newCredentials) return;
    const text = `Karibu TZ-WiFi Cloud Controller!\n\nTaarifa za Kuingia kwenye Akaunti Yako ya MikroTik Hotspot:\nBiashara: ${newCredentials.business_name}\nBarua Pepe / Login: ${newCredentials.email}\nNambari ya Simu: ${newCredentials.phone}\nNenosiri (Password): ${newCredentials.password}\nAda ya Mfumo (Kamisheni): TZS ${newCredentials.monthly_fee.toLocaleString()} / mwezi\n\nIngia hapa ili uongeze router yako na uanze kuuza vifurushi: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const filteredOwners = owners.filter((o) => {
    // Exclude only the master vendor admin account (ID 1 / VENDOR_ADMIN)
    if (o.role === 'VENDOR_ADMIN' || o.id === 1) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (o.name || '').toLowerCase().includes(q) ||
      (o.business_name || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, owners.length]);

  const paginatedOwners =
    pageSize === 'ALL'
      ? filteredOwners
      : filteredOwners.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingRequests = manualRequests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span>Wamiliki wa MikroTik Hotspot (Tenants / Users)</span>
            </h2>
            {pendingRequests.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white animate-pulse">
                <BadgeAlert className="w-3.5 h-3.5" />
                <span>{pendingRequests.length} Yanayosubiri Idhini</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Simamia akaunti za wateja, thibitisha malipo ya mkono (Manual Subscription Approvals) kwa wateja waliolipa taslimu/benki au simu ikikwama, na udhibiti vifaa.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchData(false)}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Sasisha Orodha"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>➕ Tengeneza Akaunti ya MikroTik User</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PENDING MANUAL SUBSCRIPTION APPROVALS QUEUE (Vendor Manual Approval Area) */}
      {/* ========================================================================= */}
      {pendingRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-2 border-amber-400/80 rounded-3xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Maombi ya Uthibitisho wa Malipo ya Subscription ({pendingRequests.length})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase">
                    Inasubiri Vendor Idhini
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Wateja hawa wameshindwa kulipa kwa simu au wamelipa kwa Taslimu/Benki. Idhinisha hapa ili kufungua mfumo wao mara moja.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPendingRequestsOnly(!showPendingRequestsOnly)}
              className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs transition"
            >
              {showPendingRequestsOnly ? 'Ficha Maelezo' : 'Onyesha Maelezo'}
            </button>
          </div>

          {showPendingRequestsOnly && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
              {pendingRequests.map((req) => {
                const targetOwner = owners.find((o) => o.id === req.owner_id);
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-2xl border border-amber-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-slate-900">{req.business_name}</h4>
                            <span className="text-[11px] text-slate-500">({req.owner_name})</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{req.phone_number}</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-black text-xs font-mono">
                          TZS {req.amount.toLocaleString()}
                        </span>
                      </div>

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Njia ya Malipo:</span>
                          <span className="font-bold text-slate-800 uppercase px-2 py-0.5 bg-white rounded-md border border-slate-200">
                            {req.payment_method === 'CASH'
                              ? '💵 Taslimu (Cash)'
                              : req.payment_method === 'BANK_TRANSFER'
                              ? '🏦 Benki (CRDB/NMB)'
                              : req.payment_method}
                          </span>
                        </div>
                        <div className="flex items-start justify-between text-[11px] gap-2">
                          <span className="text-slate-500 font-medium whitespace-nowrap">Risiti / Kumbukumbu:</span>
                          <span className="font-mono font-bold text-indigo-700 text-right break-all">
                            {req.reference_note}
                          </span>
                        </div>
                        {req.notes && (
                          <div className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-200/60">
                            "{req.notes}"
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Imetumwa: {new Date(req.created_at).toLocaleString('sw-TZ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleRejectManualRequest(req.id, req.business_name)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Kataa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (targetOwner) {
                            handleOpenManualApprove(targetOwner, req);
                          } else {
                            // Fallback owner mock
                            const mockOwner: HotspotOwner = {
                              id: req.owner_id,
                              name: req.owner_name,
                              business_name: req.business_name,
                              email: `${req.phone_number}@tzwifi.local`,
                              phone: req.phone_number,
                              role: 'HOTSPOT_OWNER',
                              status: 'ACTIVE',
                              assigned_router_ids: [],
                              commission_rate: 0,
                              monthly_fee: req.amount,
                              subscription_fee: req.amount,
                              subscription_status: 'EXPIRED',
                              created_at: req.created_at,
                              updated_at: req.created_at,
                            };
                            handleOpenManualApprove(mockOwner, req);
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Idhinisha Papo Hapo (+30 Siku)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Credentials Modal / Card */}
      {newCredentials && (
        <div className="p-5 rounded-3xl bg-emerald-950 text-white border border-emerald-700/60 shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  Akaunti Mpya ya MikroTik User Imetengenezwa
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  {newCredentials.name} – {newCredentials.business_name}
                </h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  Taarifa za kuingia kwenye akaunti ziko tayari. Mteja anaweza kuingia sasa na kuongeza MikroTik router yake mwenyewe.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNewCredentials(null)}
              className="p-1 rounded-lg text-emerald-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4 bg-emerald-900/80 p-3 rounded-2xl border border-emerald-800/80 text-xs">
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Login / Email</span>
              <div className="font-mono font-bold text-white truncate">{newCredentials.email}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Nambari ya Simu</span>
              <div className="font-mono font-bold text-white">{newCredentials.phone}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Nenosiri (Password)</span>
              <div className="font-mono font-bold text-amber-300 text-sm">{newCredentials.password}</div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Ada ya Mfumo</span>
              <div className="font-bold text-emerald-200 text-sm">
                TZS {newCredentials.monthly_fee.toLocaleString()} / mwezi
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-emerald-800/60">
            <div className="text-[11px] text-emerald-300">
              💡 Nakili taarifa hizi umtumie mteja kupitia WhatsApp au SMS. Router itaongezwa moja kwa moja kwenye akaunti yake.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyCredsToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
              >
                {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCreds ? 'Imenakiliwa!' : 'Nakili Ujumbe wa Mteja'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetOwner = owners.find(
                    (o) => o.phone === newCredentials.phone || o.email === newCredentials.email
                  );
                  if (targetOwner && onSwitchToOwner) {
                    onSwitchToOwner(targetOwner);
                  }
                  setNewCredentials(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-100 font-bold text-xs shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ingia Kwenye Akaunti Yake Sasa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Hotspot Owners Registry Notice Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white shrink-0 shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">
                Wateja & Wamiliki wa Hotspot Waliojiunga: {filteredOwners.length}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Papo Hapo (Real-time)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-300">
              {filteredOwners.map((o) => (
                <span
                  key={o.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-[11px] font-semibold"
                >
                  <Building className="w-3 h-3 text-indigo-400" />
                  <span>{o.business_name}</span>
                  <span className="text-slate-400">({o.name} • {o.phone})</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchData(false)}
          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Sasisha Orodha</span>
        </button>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Wamiliki Waliosajiliwa (Tenants)</span>
          <div className="text-xl font-black text-indigo-600 mt-1">{filteredOwners.length}</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Akaunti Zinazotumika (Active)</span>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {filteredOwners.filter((o) => o.status === 'ACTIVE').length}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Ada ya Mwezi (Standard)</span>
          <div className="text-xl font-black text-emerald-600 mt-1">TZS 15,000</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Router Fleet Zote</span>
          <div className="text-xl font-black text-purple-600 mt-1">{routers.length}</div>
        </div>
      </div>

      {/* Search and Filters with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tafuta mmiliki kwa jina, cafe/lounge, barua pepe, au namba ya simu..."
            className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Futa
            </button>
          )}
        </div>

        {/* View Mode Toggle: Table or Grid */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-2xl border border-slate-300/80 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Jedwali (Table)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kadi (Cards)</span>
          </button>
        </div>
      </div>

      {/* Owners List: Table or Cards View */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Inapakia wamiliki na taarifa...</div>
      ) : filteredOwners.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
          Hakuna mmiliki au mteja aliyepatikana kwa utafutaji huo.
        </div>
      ) : (
        <div className="space-y-4">
          {viewMode === 'table' ? (
            /* Table View with Subscription Days and Expire/Activate Controls */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4"># ID</th>
                      <th className="py-3 px-4">Mmiliki / Mteja</th>
                      <th className="py-3 px-4">Hotspot / Eneo</th>
                      <th className="py-3 px-4">Simu & Barua Pepe</th>
                      <th className="py-3 px-4">Nenosiri</th>
                      <th className="py-3 px-4">MikroTik Router / AP & Hali</th>
                      <th className="py-3 px-4">Siku za Subscription</th>
                      <th className="py-3 px-4">Udhibiti (Washa / Zima Expire)</th>
                      <th className="py-3 px-4 text-right">Vitendo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedOwners.map((owner) => {
                      const isPasswordRevealed = revealedPasswordId === owner.id;
                      const subInfo = getSubscriptionInfo(owner);
                      return (
                        <tr key={owner.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                            #{owner.id}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {owner.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900">{owner.name}</div>
                                <span className="text-[10px] font-semibold text-emerald-700">🏢 Hotspot Owner</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Building className="w-3.5 h-3.5 text-slate-400" />
                              <span>{owner.business_name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 space-y-0.5">
                            <div className="font-mono text-slate-900 font-bold">{owner.phone}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{owner.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-800 text-xs">
                                {isPasswordRevealed ? owner.password || "123456" : "••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setRevealedPasswordId(isPasswordRevealed ? null : owner.id)}
                                className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                              >
                                {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          {/* MikroTik Router / AP & Online/Offline Status */}
                          <td className="py-3.5 px-4">
                            {(() => {
                              const assigned = routers.filter(
                                (r) =>
                                  owner.assigned_router_ids?.includes(r.id) ||
                                  r.owner_id === owner.id ||
                                  (r.owner_name && r.owner_name.toLowerCase() === (owner.name || "").toLowerCase()) ||
                                  (r.owner_name && r.owner_name.toLowerCase() === (owner.business_name || "").toLowerCase())
                              );
                              if (assigned.length === 0) {
                                return (
                                  <span className="text-amber-600 text-[11px] font-semibold flex items-center gap-1">
                                    <Wifi className="w-3 h-3 text-amber-500" />
                                    <span>Bado Hajajumuisha Router</span>
                                  </span>
                                );
                              }
                              return (
                                <div className="space-y-1.5">
                                  {assigned.map((r) => {
                                    const isOnline = r.status === "ONLINE";
                                    return (
                                      <div key={r.id} className="flex items-center gap-1.5 flex-wrap">
                                        {isOnline ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>ONLINE</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span>OFFLINE</span>
                                          </span>
                                        )}
                                        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[130px]">{r.name}</span>
                                        <span className="font-mono text-[10px] text-slate-400">({r.ip_address})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>
                          {/* Number of Subscription Days Remaining */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-black text-xs">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className={subInfo.isExpired ? "text-rose-600" : "text-emerald-700"}>
                                  {subInfo.isExpired ? "0 Siku (Imeisha)" : `Siku ${subInfo.daysLeft} zimebaki`}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Hadi: {subInfo.expiresDateStr}
                              </div>
                            </div>
                          </td>
                          {/* Toggle Expire or Activate Button */}
                          <td className="py-3.5 px-4">
                            {subInfo.isExpired ? (
                              <button
                                type="button"
                                onClick={() => handleToggleSubscription(owner, "ACTIVE")}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                                title="Washa subscription ya siku 30 (Mteja ataendelea kutumia mfumo)"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                <span>⚡ Washa (Siku 30)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleSubscription(owner, "EXPIRED")}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition flex items-center gap-1.5 cursor-pointer border border-rose-200 whitespace-nowrap"
                                title="Sitisha / fanya subscription iishe ili mteja aone ukurasa wa subscription mara moja"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>⛔ Sitisha (Expire Sasa)</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onSwitchToOwner && (
                                <button
                                  type="button"
                                  onClick={() => onSwitchToOwner(owner)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                                  title="Ingia kwenye akaunti ya mmiliki huyu"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Ingia</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(owner)}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                                title="Hariri Taarifa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(owner)}
                                className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                                title="Futa"
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
            </div>
          ) : (
            /* Cards Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
            {paginatedOwners.map((owner) => {
              const isVendor = owner.role === 'VENDOR_ADMIN';
              const assignedRouters = routers.filter(
                (r) =>
                  owner.assigned_router_ids?.includes(r.id) ||
                  r.owner_id === owner.id ||
                  (r.owner_name && r.owner_name.toLowerCase() === (owner.name || "").toLowerCase()) ||
                  (r.owner_name && r.owner_name.toLowerCase() === (owner.business_name || "").toLowerCase())
              );
              const isPasswordRevealed = revealedPasswordId === owner.id;
              const monthlyFee = owner.subscription_fee || owner.monthly_fee || 15000;
              const hasPendingReq = manualRequests.some(
                (r) => r.owner_id === owner.id && r.status === 'PENDING'
              );

              return (
                <div
                  key={owner.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition flex flex-col justify-between ${
                    hasPendingReq
                      ? 'border-amber-400 ring-2 ring-amber-300/40 bg-amber-50/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm ${
                            isVendor
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          }`}
                        >
                          {owner.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{owner.name}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isVendor
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isVendor ? '👑 Vendor HQ' : '🏢 Hotspot Owner'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium mt-0.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{owner.business_name}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(owner)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                          title="Hariri Taarifa / Nenosiri"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isVendor && (
                          <button
                            type="button"
                            onClick={() => handleDelete(owner)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                            title="Futa Mmiliki"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contacts & Metadata */}
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-slate-700 font-mono text-[11px]">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{owner.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 text-slate-700 text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{owner.email}</span>
                      </div>
                    </div>

                    {/* Password & Credentials Field */}
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-500 font-medium">Nenosiri:</span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {isPasswordRevealed
                            ? owner.password || (isVendor ? 'admin123' : '123456')
                            : '••••••••'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedPasswordId(isPasswordRevealed ? null : owner.id)
                        }
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                      >
                        {isPasswordRevealed ? 'Ficha' : 'Onyesha'}
                      </button>
                    </div>

                    {/* Monthly Fee & Subscription Status & Days Remaining */}
                    {!isVendor && (() => {
                      const subInfo = getSubscriptionInfo(owner);
                      return (
                        <div className="mt-2.5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-indigo-950">
                              <Coins className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <div>
                                <span className="text-[11px] text-slate-600 font-medium">Ada: </span>
                                <span className="font-mono font-black text-indigo-900 text-xs">
                                  TZS {monthlyFee.toLocaleString()}
                                </span>
                                <span className="text-[10px] text-slate-500"> / mwezi</span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                subInfo.isExpired
                                  ? "bg-rose-100 text-rose-700 border border-rose-200"
                                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {subInfo.isExpired ? "⛔ Imeisha (0 Siku)" : `🟢 Siku ${subInfo.daysLeft} zimebaki`}
                            </span>
                          </div>

                          {/* Expiry date info */}
                          <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-indigo-100/80">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Mwisho: <strong>{subInfo.expiresDateStr}</strong></span>
                            </span>

                            {hasPendingReq && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[9px] animate-pulse">
                                Ombi Linasubiri
                              </span>
                            )}
                          </div>

                          {/* Toggle Expire/Activate Button */}
                          <div className="pt-2 border-t border-indigo-100 flex items-center justify-between gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleOpenManualApprove(owner)}
                              className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Thibitisha malipo ya mkono (Taslimu / Benki) na uongeze muda"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                              <span>⚡ Idhinisha Manual (Extend)</span>
                            </button>

                            <div className="w-full flex items-center justify-between gap-1 pt-1">
                              {subInfo.isExpired ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubscription(owner, "ACTIVE")}
                                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                                  <span>⚡ Washa Subscription (Siku 30)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSubscription(owner, "EXPIRED")}
                                  className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                  title="Sitisha subscription ili mteja akifungua mfumo aone ukurasa wa subscription moja kwa moja"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>⛔ Sitisha / Expire Subscription</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* PalmPesa Account Status */}
                    <div className="mt-2.5 p-2.5 rounded-xl border flex items-center justify-between text-xs bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-[11px] text-slate-500 font-medium">PalmPesa Payout: </span>
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {owner.palmpesa_user_id ? `ID: ${owner.palmpesa_user_id}` : 'Haijawekwa'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          owner.palmpesa_user_id
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {owner.palmpesa_user_id ? 'Akaunti Yake Binafsi' : 'Default ya Admin'}
                      </span>
                    </div>

                    {/* MikroTik Router(s) & APs Fleet Status with ONLINE / OFFLINE Badge */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-2">
                        <span className="flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-slate-400" />
                          <span>MikroTik Router(s) & APs:</span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {isVendor ? `${routers.length} (Zote Nchini)` : assignedRouters.length}
                        </span>
                      </div>

                      {isVendor ? (
                        <div className="text-[11px] bg-indigo-50/60 border border-indigo-100 rounded-xl p-2.5 text-indigo-900 font-medium">
                          👑 Kama Vendor HQ, una uwezo wa kuona na kudhibiti router zote nchini Tanzania.
                        </div>
                      ) : assignedRouters.length > 0 ? (
                        <div className="space-y-2">
                          {assignedRouters.map((r) => {
                            const isOnline = r.status === "ONLINE";
                            const isPinging = pingingRouterId === r.id;

                            return (
                              <div
                                key={r.id}
                                className={`p-3 rounded-xl border transition text-xs space-y-2 ${
                                  isOnline
                                    ? "bg-emerald-50/50 border-emerald-200/90 shadow-2xs"
                                    : "bg-rose-50/50 border-rose-200/90"
                                }`}
                              >
                                {/* Top Row: Device Name & ONLINE / OFFLINE Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Wifi className={`w-3.5 h-3.5 shrink-0 ${isOnline ? "text-emerald-600" : "text-rose-500"}`} />
                                      <span className="font-bold text-slate-900 truncate">{r.name}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                                      {r.model_name || "MikroTik RouterOS"} • {r.location}
                                    </div>
                                  </div>

                                  {/* Status Badge: ONLINE vs OFFLINE */}
                                  <div className="shrink-0">
                                    {isOnline ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span>ONLINE</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                        <span>OFFLINE</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Middle Row: Network Details */}
                                <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white/85 p-2 rounded-lg border border-slate-200/70 font-mono">
                                  <div className="flex items-center gap-1 truncate">
                                    <span className="text-slate-400">IP:</span>
                                    <span className="font-bold text-slate-800">{r.ip_address}</span>
                                    {r.ssid && (
                                      <span className="text-indigo-600 font-sans ml-1 text-[10px]">
                                        ({r.ssid})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-sans font-semibold text-slate-500 shrink-0">
                                    {r.active_users_count !== undefined ? `${r.active_users_count} wateja live` : "Hotspot Tayari"}
                                  </div>
                                </div>

                                {/* Bottom Row: Controls (Ping Test & Status Toggle for Vendor) */}
                                <div className="flex items-center justify-between pt-1 text-[11px]">
                                  <button
                                    type="button"
                                    disabled={isPinging}
                                    onClick={() => handlePingRouter(r)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition cursor-pointer shadow-2xs disabled:opacity-50"
                                    title="Pima muunganisho wa Router na seva ya Vendor"
                                  >
                                    <RefreshCw className={`w-3 h-3 text-indigo-600 ${isPinging ? "animate-spin" : ""}`} />
                                    <span>{isPinging ? "Inapima..." : "Pima Ping"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleRouterStatus(r)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                      isOnline
                                        ? "text-rose-600 hover:bg-rose-100/60 bg-white border border-rose-200"
                                        : "text-emerald-700 hover:bg-emerald-100/60 bg-white border border-emerald-200"
                                    }`}
                                    title={isOnline ? "Weka Offline kwa majaribio" : "Weka Online kwa majaribio"}
                                  >
                                    <Power className="w-3 h-3" />
                                    <span>{isOnline ? "Zima (OFFLINE)" : "Washa (ONLINE)"}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-amber-800 flex items-start gap-2.5">
                          <Wifi className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-amber-900 font-bold mb-0.5">Hajajumuisha MikroTik Router au AP bado.</strong>
                            <span className="text-amber-700">Router au Access Point ikiongezwa itajitokeza hapa ikiwa na hali ya ONLINE au OFFLINE papo hapo.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Switch / Impersonate Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Akaunti: {owner.status === 'ACTIVE' ? '🟢 Hai' : '🔴 Imesitishwa'}
                    </span>

                    {onSwitchToOwner && (
                      <button
                        type="button"
                        onClick={() => onSwitchToOwner(owner)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition shadow-xs ${
                          isVendor
                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{isVendor ? 'Fungua Vendor HQ' : 'Ingia kama Mmiliki huyu'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          )}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredOwners.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="wamiliki"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VENDOR MANUAL SUBSCRIPTION APPROVAL MODAL */}
      {/* ========================================================================= */}
      {isManualApproveModalOpen && manualApproveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Idhinisha Subscription kwa Mkono (Manual Approve)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mmiliki: <strong className="text-indigo-700">{manualApproveTarget.name}</strong> ({manualApproveTarget.business_name})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManualApproveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitManualApproval} className="space-y-4">
              {/* Tenant Summary Card */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-emerald-800 font-bold uppercase">Biashara ya Hotspot:</span>
                  <div className="font-bold text-slate-900 text-sm">{manualApproveTarget.business_name}</div>
                  <div className="text-[11px] text-slate-600 font-mono">{manualApproveTarget.phone}</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase">Hali ya Sasa:</span>
                  <div className="font-bold text-xs mt-0.5">
                    {manualApproveTarget.subscription_status === 'EXPIRED' ? (
                      <span className="text-rose-600 font-black">🔴 Muda Umeisha</span>
                    ) : (
                      <span className="text-emerald-700 font-black">🟢 Active</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Muda wa Kuongeza (Duration in Days) *</span>
                  <span className="text-indigo-600 font-black text-xs">Siku {manualDurationDays}</span>
                </label>

                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '7 Siku (Grace)', days: 7 },
                    { label: '14 Siku', days: 14 },
                    { label: '30 Siku (Mwezi 1)', days: 30 },
                    { label: '60 Siku (Miezi 2)', days: 60 },
                    { label: '90 Siku (Miezi 3)', days: 90 },
                    { label: '180 Siku (Miezi 6)', days: 180 },
                    { label: '365 Siku (Mwaka 1)', days: 365 },
                  ].map((item) => (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => setManualDurationDays(item.days)}
                      className={`py-2 px-1 text-center rounded-xl text-[11px] font-bold transition border cursor-pointer ${
                        manualDurationDays === item.days
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">Au Weka Idadi ya Siku:</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={manualDurationDays}
                    onChange={(e) => setManualDurationDays(Number(e.target.value) || 30)}
                    className="w-24 text-xs font-bold p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-center"
                  />
                  <span className="text-xs text-slate-500">Siku kuanzia leo</span>
                </div>
              </div>

              {/* Amount & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kiasi Kilicholipwa (TZS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={manualAmountPaid}
                    onChange={(e) => setManualAmountPaid(Number(e.target.value) || 0)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Njia ya Malipo *
                  </label>
                  <select
                    value={manualPaymentMethod}
                    onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white font-bold"
                  >
                    <option value="CASH">💵 Taslimu (Cash Direct)</option>
                    <option value="BANK_TRANSFER">🏦 Benki (CRDB / NMB / Stanbic)</option>
                    <option value="MANUAL_MPESA">📱 M-Pesa Wakala / Namba Binafsi</option>
                    <option value="MANUAL_TIGO">📱 Tigo Pesa Wakala / Lipa Namba</option>
                    <option value="MANUAL_AIRTEL">📱 Airtel Money</option>
                    <option value="VENDOR_OVERRIDE">🎁 Ofa ya Vendor / Grace Period</option>
                  </select>
                </div>
              </div>

              {/* Payment Reference & Receipt Details */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Namba ya Risiti / Kumbukumbu ya Malipo *
                </label>
                <input
                  type="text"
                  required
                  value={manualReferenceNote}
                  onChange={(e) => setManualReferenceNote(e.target.value)}
                  placeholder="mfano: Receipt #8920, M-Pesa Code: QX98102, au CRDB Slip"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                />
              </div>

              {/* Optional Admin Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Maelezo ya Ziada (Admin Internal Notes)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="mfano: Amelipa ofisini Kariakoo, imethibitishwa na Mhasibu"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualApproveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Ghairi
                </button>

                <button
                  type="submit"
                  disabled={isApprovingManual || !manualReferenceNote.trim()}
                  className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer ${
                    manualApproveSaveStatus === 'saved'
                      ? 'bg-emerald-600 shadow-emerald-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {isApprovingManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Inaidhinisha Mfumo...</span>
                    </>
                  ) : manualApproveSaveStatus === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Approved & Saved! (Imeidhinishwa Kikamilifu)</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Thibitisha na Fungua Mfumo (+{manualDurationDays} Siku)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Add / Edit Owner Modal */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {editingOwner
                  ? `Hariri Taarifa za ${editingOwner.name}`
                  : 'Sajili Mmiliki Mpya wa MikroTik (Hotspot User)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jina Kamili la Mmiliki *
                </label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="mfano: Juma Shabani"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jina la Biashara / Hotspot Cafe *
                </label>
                <input
                  type="text"
                  required
                  value={formState.business_name}
                  onChange={(e) =>
                    setFormState({ ...formState, business_name: e.target.value })
                  }
                  placeholder="mfano: Kariakoo Cyber & WiFi Point"
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nambari ya Simu *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="0712345678"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Barua Pepe (Login Email)
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    placeholder="juma@hotspot.tz"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Nenosiri (Password) *</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      {showPassword ? 'Ficha' : 'Onyesha'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formState.password}
                    onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Thibitisha Nenosiri *</label>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      {showConfirmPassword ? 'Ficha' : 'Onyesha'}
                    </button>
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formState.confirmPassword}
                    onChange={(e) =>
                      setFormState({ ...formState, confirmPassword: e.target.value })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Monthly Subscription Fee */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Ada ya Kila Mwezi ya Mfumo (TZS / Mwezi) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formState.monthly_fee}
                    onChange={(e) =>
                      setFormState({ ...formState, monthly_fee: Number(e.target.value) || 0 })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">TZS / Mwezi</span>
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Kiasi hiki kitatozwa kila mwezi ili kufungua mfumo wa router ya mmiliki huyu. Standard ni TZS 15,000.
                </span>
              </div>

              {/* PalmPesa Account Settings */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      PalmPesa Gateway ya Mteja Huyu (Hiari)
                    </h4>
                    <p className="text-[10px] text-emerald-800">
                      Weka User ID na token ya PalmPesa ya mteja huyu ili pesa za vocha ziende moja kwa moja kwenye akaunti yake.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      PalmPesa User ID
                    </label>
                    <input
                      type="text"
                      value={formState.palmpesa_user_id}
                      onChange={(e) =>
                        setFormState({ ...formState, palmpesa_user_id: e.target.value })
                      }
                      placeholder="Ingiza User ID..."
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      User Reference
                    </label>
                    <input
                      type="text"
                      value={formState.palmpesa_user_ref}
                      onChange={(e) =>
                        setFormState({ ...formState, palmpesa_user_ref: e.target.value })
                      }
                      placeholder="Ingiza Public User Ref..."
                      className="w-full text-xs p-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                    PalmPesa API Token (Secret Token)
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={formState.palmpesa_api_token}
                      onChange={(e) =>
                        setFormState({ ...formState, palmpesa_api_token: e.target.value })
                      }
                      placeholder="Weka Token ya PalmPesa ya huyu mmiliki"
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono bg-white"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Ufunguo wa siri unaoidhinisha kutuma STK Push kwenda kwenye akaunti ya mteja huyu. Ikiachwa wazi, itatumia token kuu ya Admin.
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    ACCEPT HOTSPOT STK (Washa USSD Push ya Simu)
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.palmpesa_accept_stk}
                      onChange={(e) =>
                        setFormState({ ...formState, palmpesa_accept_stk: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{formState.palmpesa_accept_stk ? 'YES (Ndio)' : 'NO (Hapana)'}</span>
                  </label>
                </div>
              </div>

              {/* Notice that router will be added inside their account */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-2.5">
                <Wifi className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div className="text-xs text-indigo-950 leading-relaxed">
                  <span className="font-bold">Usajili wa Router:</span> Router haigawiwi hapa. Mmiliki ataongeza router yake ya MikroTik moja kwa moja akishaingia kwenye akaunti yake kupitia kichupo cha <strong>"MikroTik Router(s) Zangu"</strong> ➡️ <strong>"➕ Ongeza MikroTik Router Yangu"</strong>.
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aina ya Akaunti
                  </label>
                  <select
                    value={formState.role}
                    onChange={(e) =>
                      setFormState({ ...formState, role: e.target.value as any })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="HOTSPOT_OWNER">Hotspot Owner (Mmiliki wa MikroTik)</option>
                    <option value="VENDOR_ADMIN">Vendor Admin (Msimamizi Mkuu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hali (Status)</label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState({ ...formState, status: e.target.value as any })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (Inafanya Kazi)</option>
                    <option value="SUSPENDED">SUSPENDED (Imesitishwa)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (Boolean(formState.confirmPassword) &&
                      formState.password !== formState.confirmPassword)
                  }
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${
                    saveStatus === 'saved' || saveStatus === 'updated'
                      ? 'bg-emerald-600 shadow-emerald-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {isSubmitting ? (
                    'Inahifadhi...'
                  ) : saveStatus === 'saved' ? (
                    '✓ Saved! (Akaunti Imehifadhiwa)'
                  ) : saveStatus === 'updated' ? (
                    '✓ Updated! (Taarifa Zimesasishwa)'
                  ) : editingOwner ? (
                    'Sasisha Taarifa (Update)'
                  ) : (
                    'Tengeneza Akaunti (Save)'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
