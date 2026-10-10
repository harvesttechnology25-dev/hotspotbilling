import React, { useEffect, useState, useMemo } from 'react';
import { RouterItem, Plan, HotspotUserDetail } from '../../types/index.ts';
import { formatBytes, formatSecondsToTime } from '../../utils/carrierInfo.ts';
import {
  Wifi,
  RefreshCw,
  UserX,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Trash2,
  Power,
  RotateCw,
  ShieldAlert,
  Search,
  Users,
  HardDrive,
  Activity,
  Terminal,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Radio,
  Check,
  Smartphone,
  Ticket,
  Package,
  Filter,
} from 'lucide-react';

import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

export const ActiveHotspotUsers: React.FC<{
  ownerId?: number;
  initialRouterId?: number | 'ALL';
  onSelectRouter?: (id: number | 'ALL') => void;
  ownerName?: string;
}> = ({ ownerId, initialRouterId, onSelectRouter, ownerName }) => {
  const resolvedOwnerId = useMemo(() => {
    if (ownerId && !isNaN(Number(ownerId))) return Number(ownerId);
    try {
      const u = localStorage.getItem('tzwifi_user');
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed.role !== 'VENDOR_ADMIN') {
          return Number(parsed.parent_owner_id || parsed.id);
        }
      }
    } catch {}
    return undefined;
  }, [ownerId]);

  const authHeaders = useMemo<Record<string, string>>(() => {
    const token = localStorage.getItem('tzwifi_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (resolvedOwnerId) headers['x-owner-id'] = String(resolvedOwnerId);
    return headers;
  }, [resolvedOwnerId]);

  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [selectedRouterId, setSelectedRouterId] = useState<number | 'ALL'>(initialRouterId ?? 'ALL');

  useEffect(() => {
    if (initialRouterId !== undefined) {
      setSelectedRouterId(initialRouterId);
    }
  }, [initialRouterId]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [users, setUsers] = useState<HotspotUserDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filters & Search
  const [filterStatus, setFilterStatus] = useState<
    'ALL' | 'ONLINE' | 'OFFLINE' | 'UNUSED' | 'USED' | 'EXPIRED'
  >('ALL');
  const [filterPlan, setFilterPlan] = useState<string>('ALL');
  const [filterMethod, setFilterMethod] = useState<'ALL' | 'PHONE' | 'MANUAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});

  // Pagination (10, 20, 30, 40, ALL)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(20);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    plan_id: 1,
    comment: '',
    rate_limit: '',
    limit_uptime: 7200,
  });

  // Remote Action State
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [customCmd, setCustomCmd] = useState('');

  // Fetch routers and plans
  useEffect(() => {
    const url = resolvedOwnerId ? `/api/v1/routers?ownerId=${resolvedOwnerId}` : '/api/v1/routers';
    fetch(url, { headers: authHeaders })
      .then((res) => res.json())
      .then((data: RouterItem[]) => {
        setRouters(data);
      })
      .catch((err) => console.error(err));

    fetch('/api/v1/plans', { headers: authHeaders })
      .then((res) => res.json())
      .then((data: Plan[]) => setPlans(data))
      .catch((err) => console.error(err));
  }, [resolvedOwnerId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const targetRouter = selectedRouterId === 'ALL' ? 'all' : selectedRouterId;
      const q = resolvedOwnerId ? `?ownerId=${resolvedOwnerId}` : '';
      const res = await fetch(`/api/v1/routers/${targetRouter}/all-users${q}`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        if (resolvedOwnerId && Array.isArray(data)) {
          const ownerRouterIds = new Set(routers.map((r) => r.id));
          const strictlyScoped = data.filter((u: HotspotUserDetail) => {
            if (u.owner_id != null) return Number(u.owner_id) === resolvedOwnerId;
            if (u.router_id && ownerRouterIds.size > 0) return ownerRouterIds.has(Number(u.router_id));
            return true;
          });
          setUsers(strictlyScoped);
        } else {
          setUsers(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch all users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, [selectedRouterId, resolvedOwnerId]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 5000);
  };

  // Kick / Terminate Active Session
  const handleKickUser = async (username: string) => {
    if (!confirm(`Je, una uhakika unataka kukata mtandao kwa mtumiaji '${username}'?`)) return;

    try {
      const res = await fetch(
        `/api/v1/routers/${selectedRouterId}/active-users/${username}/terminate`,
        { method: 'POST' }
      );
      const data = await res.json();
      showNotification(data.message || `Mtumiaji '${username}' ametolewa hewani.`);
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Delete User completely from MikroTik
  const handleDeleteUser = async (username: string) => {
    if (
      !confirm(
        `Je, una uhakika unataka kumfuta mtumiaji '${username}' moja kwa moja kutoka kwenye MikroTik na database?`
      )
    )
      return;

    // Optimistic UI update: Remove user from table immediately
    setUsers((prev) => prev.filter((u) => u.username !== username));

    try {
      const targetRouterId = selectedRouterId || 1;
      const res = await fetch(`/api/v1/routers/${targetRouterId}/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) throw new Error(data.error || 'Imeshindwa kufuta mtumiaji.');

      showNotification(data.message || `Mtumiaji '${username}' amefutwa.`);
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
      fetchUsers();
    }
  };

  // Execute Remote Action (Reboot, Flush, Kick All)
  const handleRemoteAction = async (action: 'reboot' | 'flush_cookies' | 'kick_all' | 'custom') => {
    const actionNames: Record<string, string> = {
      reboot: 'kuanzisha upya (Reboot) router hii',
      flush_cookies: 'kufuta vidakuzi (Cookies) vyote vya Hotspot',
      kick_all: 'kuwatoa watumiaji wote hewani mara moja',
      custom: `kutuma amri: ${customCmd}`,
    };

    if (action !== 'custom' && !confirm(`Je, una uhakika unataka ${actionNames[action]}?`)) return;

    setExecutingAction(action);
    try {
      const res = await fetch(`/api/v1/routers/${selectedRouterId}/remote-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, customCommand: customCmd }),
      });
      const data = await res.json();
      showNotification(data.message || 'Amri imetumwa kwa MikroTik.');
      if (action === 'custom') setCustomCmd('');
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setExecutingAction(null);
    }
  };

  // Generate random voucher code (distinct format for manual vs phone)
  const handleGenerateRandomCode = (type: 'manual' | 'phone' = 'manual') => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let r1 = '';
    let r2 = '';
    for (let i = 0; i < 4; i++) r1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) r2 += chars.charAt(Math.floor(Math.random() * chars.length));
    // Muundo tofauti: Simu (MP-XXXX-XXXX) vs Manual (VCH-XXXX-XXXX)
    const randomCode = type === 'phone' ? `MP-${r1}-${r2}` : `VCH-${r1}-${r2}`;
    setNewUserData((prev) => ({
      ...prev,
      username: randomCode,
      password: randomCode,
    }));
  };

  // Helper to test if user joined via phone
  const checkIsPhoneUser = (u: HotspotUserDetail) => {
    return (
      u.login_method === 'PHONE' ||
      u.username.toUpperCase().startsWith('MP-') ||
      u.username.toUpperCase().startsWith('PHO-') ||
      u.username.toUpperCase().startsWith('TEL-') ||
      u.username.toUpperCase().startsWith('SIMU-') ||
      /^(255|07|06|\+255)\d+/.test(u.username) ||
      !!u.phone_number
    );
  };

  // Helper to check if voucher is unused
  const checkIsUnused = (u: HotspotUserDetail) => {
    if (u.voucher_status === 'UNUSED' || u.status === 'AVAILABLE') return true;
    if (u.is_online) return false;
    if (u.status === 'EXPIRED' || u.voucher_status === 'EXPIRED') return false;
    const hasData = (u.bytes_in && u.bytes_in > 0) || (u.bytes_out && u.bytes_out > 0);
    const hasUptime = u.uptime_seconds && u.uptime_seconds > 0;
    return !hasData && !hasUptime && u.voucher_status !== 'USED';
  };

  // Create User / Voucher Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username) {
      showNotification('Tafadhali weka jina la mtumiaji (Username).', 'error');
      return;
    }

    setSavingUser(true);
    try {
      const targetRouter = selectedRouterId !== 'ALL' ? selectedRouterId : (routers[0]?.id || 1);
      const res = await fetch(`/api/v1/routers/${targetRouter}/users`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindwa kuongeza mtumiaji.');

      showNotification(data.message || 'Mtumiaji ameongezwa kikamilifu kwenye MikroTik!');
      setIsAddModalOpen(false);
      setNewUserData({
        username: '',
        password: '',
        plan_id: plans[0]?.id || 1,
        comment: '',
        rate_limit: '',
        limit_uptime: 7200,
      });
      fetchUsers();
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setSavingUser(false);
    }
  };

  const selectedRouter = selectedRouterId !== 'ALL' ? routers.find((r) => r.id === selectedRouterId) : undefined;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    // 1. Status Filter (Wote, Online, Offline, Unused, Used, Expired)
    let matchesStatus = true;
    if (filterStatus === 'ONLINE') {
      matchesStatus = !!u.is_online;
    } else if (filterStatus === 'OFFLINE') {
      matchesStatus = !u.is_online && u.status !== 'EXPIRED';
    } else if (filterStatus === 'UNUSED') {
      matchesStatus = checkIsUnused(u);
    } else if (filterStatus === 'USED') {
      matchesStatus = !checkIsUnused(u);
    } else if (filterStatus === 'EXPIRED') {
      matchesStatus = u.status === 'EXPIRED' || u.voucher_status === 'EXPIRED';
    }

    // 2. Plan / Package Filter
    let matchesPlan = true;
    if (filterPlan !== 'ALL') {
      matchesPlan = Boolean(
        String(u.plan_id) === filterPlan ||
        (u.plan_name && u.plan_name.toLowerCase() === filterPlan.toLowerCase()) ||
        (u.rate_limit && u.rate_limit.toLowerCase() === filterPlan.toLowerCase())
      );
    }

    // 3. Login Method Filter (Phone vs Manual)
    let matchesMethod = true;
    const isPhone = checkIsPhoneUser(u);
    if (filterMethod === 'PHONE') {
      matchesMethod = isPhone;
    } else if (filterMethod === 'MANUAL') {
      matchesMethod = !isPhone;
    }

    // 4. Search Query
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.ip_address && u.ip_address.toLowerCase().includes(q)) ||
      (u.mac_address && u.mac_address.toLowerCase().includes(q)) ||
      (u.comment && u.comment.toLowerCase().includes(q)) ||
      (u.plan_name && u.plan_name.toLowerCase().includes(q)) ||
      (u.phone_number && u.phone_number.toLowerCase().includes(q)) ||
      (u.rate_limit && u.rate_limit.toLowerCase().includes(q));

    return matchesStatus && matchesPlan && matchesMethod && matchesSearch;
  });

  // Reset pagination to page 1 when filters or router change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPlan, filterMethod, searchQuery, selectedRouterId]);

  // Paginated users according to pageSize (10, 20, 30, 40, ALL)
  const paginatedUsers =
    pageSize === 'ALL'
      ? filteredUsers
      : filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const onlineCount = users.filter((u) => u.is_online).length;
  const unusedCount = users.filter((u) => !u.is_online && checkIsUnused(u) && u.status !== 'EXPIRED' && u.voucher_status !== 'EXPIRED').length;
  const offlineCount = users.filter((u) => !u.is_online && !checkIsUnused(u) && u.status !== 'EXPIRED' && u.voucher_status !== 'EXPIRED').length;
  const usedCount = users.filter((u) => !checkIsUnused(u)).length;
  const expiredCount = users.filter((u) => u.status === 'EXPIRED' || u.voucher_status === 'EXPIRED').length;
  const phoneCount = users.filter(checkIsPhoneUser).length;
  const manualCount = users.length - phoneCount;
  const totalDownloadBytes = users.reduce((acc, u) => acc + (u.bytes_in || 0), 0);
  const totalUploadBytes = users.reduce((acc, u) => acc + (u.bytes_out || 0), 0);

  return (
    <div className="space-y-5">
      {/* Top Header & Router Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              {ownerName ? `Watumiaji & Remote: ${ownerName}` : 'MikroTik Cloud Remote Control & Hotspot Users'}
            </h2>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {resolvedOwnerId
              ? `Takwimu na watumiaji wa akaunti ya ${ownerName || 'Hotspot Owner'} pekee: Tazama waliopo Online na Offline, vocha zilizopo na dhibiti router.`
              : 'Dhibiti router yako ukiwa mbali: Tazama watumiaji walioko Online na Offline, tengeneza vocha, futa watumiaji, na tuma amri za mbali.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Router selector */}
          <select
            value={selectedRouterId}
            onChange={(e) => {
              const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
              setSelectedRouterId(val);
              onSelectRouter?.(val);
            }}
            className="text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 shadow-2xs"
          >
            <option value="ALL">🌐 Vifaa Vyote & Vocha Zote (All Routers & Vouchers)</option>
            {routers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.ip_address})
              </option>
            ))}
          </select>

          {/* Quick Add User Button */}
          <button
            type="button"
            onClick={() => {
              handleGenerateRandomCode();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tengeneza Vocha / User</span>
          </button>

          <button
            type="button"
            onClick={fetchUsers}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sasisha</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Statistics Cards - Strictly Scoped to Hotspot Owner Account */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jumla ya Watumiaji</span>
            <Users className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{users.length}</div>
          <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
            {resolvedOwnerId ? 'Akaunti hii pekee' : 'Watumiaji wote'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Online Sasa</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-slate-900">{onlineCount}</div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Wapo hewani sasa hivi</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hazijatumika (Unused)</span>
            <Ticket className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{unusedCount}</div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Vocha mpya tayari kutumiwa</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Wametoka (Offline)</span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{offlineCount}</div>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">Walioshatumia lakini wametoka</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Walioisha (Expired)</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{expiredCount}</div>
          <p className="text-[10px] text-amber-600 font-medium mt-0.5">Muda au data imekamilika</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Live Traffic (In/Out)</span>
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xs font-black text-indigo-900 truncate" title={`${formatBytes(totalDownloadBytes)} / ${formatBytes(totalUploadBytes)}`}>
            {formatBytes(totalDownloadBytes)} / {formatBytes(totalUploadBytes)}
          </div>
          <p className="text-[10px] text-indigo-600 font-medium mt-0.5">Jumla ya matumizi ya data</p>
        </div>
      </div>

      {/* Remote Router Control Hub */}
      {selectedRouter && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold font-mono text-indigo-400">
                ROS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{selectedRouter.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {selectedRouter.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  IP: {selectedRouter.ip_address}:{selectedRouter.api_port} • DNS: {selectedRouter.dns_name} • Eneo: {selectedRouter.location}
                </div>
              </div>
            </div>

            {/* Quick Remote Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={executingAction !== null}
                onClick={() => handleRemoteAction('flush_cookies')}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                title="Flush Hotspot Cookies"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Flush Cookies</span>
              </button>

              <button
                type="button"
                disabled={executingAction !== null}
                onClick={() => handleRemoteAction('kick_all')}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                title="Disconnect all online users"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Kick All Users</span>
              </button>

              <button
                type="button"
                disabled={executingAction !== null}
                onClick={() => handleRemoteAction('reboot')}
                className="py-1.5 px-3 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition border border-rose-800/50"
                title="Restart MikroTik remotely"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span>Reboot Router</span>
              </button>
            </div>
          </div>

          {/* Remote CLI Command Sender */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              placeholder="Tuma amri ya RouterOS moja kwa moja (mfano: /ip hotspot user print au /ping 8.8.8.8 count=2)"
              className="flex-1 bg-slate-950 text-emerald-400 text-xs font-mono px-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-indigo-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customCmd.trim()) {
                  handleRemoteAction('custom');
                }
              }}
            />
            <button
              type="button"
              disabled={!customCmd.trim() || executingAction !== null}
              onClick={() => handleRemoteAction('custom')}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1"
            >
              <span>Tekeleza (Run)</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Row 1: Status & Voucher Usage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Wote ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('ONLINE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              filterStatus === 'ONLINE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online ({onlineCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('OFFLINE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              filterStatus === 'OFFLINE'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Offline ({offlineCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('UNUSED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              filterStatus === 'UNUSED'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Hazijatumika / Unused ({unusedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('USED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
              filterStatus === 'USED'
                ? 'bg-cyan-700 text-white shadow-xs'
                : 'text-cyan-800 bg-cyan-50/60 hover:bg-cyan-100 border border-cyan-200'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Zilizotumika / Used ({usedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('EXPIRED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              filterStatus === 'EXPIRED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Expired ({expiredCount})
          </button>
        </div>

        {/* Row 2: Plan Selector, Login Method (Simu vs Manual) Selector, and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Package / Plan */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 focus-within:border-indigo-600">
              <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Chuja kwa Kifurushi"
              >
                <option value="ALL">Vifurushi Vyote (All Packages)</option>
                {plans.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} {p.price ? `(${p.price.toLocaleString()} TZS)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Join Method: Phone vs Manual Voucher */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 focus-within:border-indigo-600">
              <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                title="Chuja kwa Chanzo / Muundo"
              >
                <option value="ALL">Muundo Wote ({users.length})</option>
                <option value="PHONE">📱 Simu / Mobile ({phoneCount})</option>
                <option value="MANUAL">🎫 Vocha / Manual ({manualCount})</option>
              </select>
            </div>

            {(filterPlan !== 'ALL' || filterMethod !== 'ALL' || filterStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setFilterPlan('ALL');
                  setFilterMethod('ALL');
                  setFilterStatus('ALL');
                  setSearchQuery('');
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition"
              >
                Futa Filter zote (Reset)
              </button>
            )}
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tafuta jina, kifurushi, simu, IP..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="px-4 py-3.5">Mtumiaji / Vocha</th>
                <th className="px-4 py-3.5">Hali & Vocha</th>
                <th className="px-4 py-3.5">Kifurushi (Package)</th>
                <th className="px-4 py-3.5">Muundo / Chanzo</th>
                <th className="px-4 py-3.5">IP & MAC Address</th>
                <th className="px-4 py-3.5">Muda (Uptime)</th>
                <th className="px-4 py-3.5">Data In (Download)</th>
                <th className="px-4 py-3.5">Data Out (Upload)</th>
                <th className="px-4 py-3.5 text-right">Vitendo (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Wifi className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Hakuna mtumiaji anayelingana na vigezo ulivyoweka.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isPassVisible = !!showPasswords[u.username];
                  const isPhoneUser = checkIsPhoneUser(u);
                  const isUnused = checkIsUnused(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Username & Password */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black font-mono text-indigo-950 text-sm tracking-wide">
                            {u.username}
                          </span>
                          {u.password && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowPasswords((prev) => ({
                                  ...prev,
                                  [u.username]: !prev[u.username],
                                }))
                              }
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Onyesha nenosiri"
                            >
                              {isPassVisible ? (
                                <EyeOff className="w-3 h-3 text-indigo-600" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {isPassVisible && u.password && (
                          <div className="text-[10px] font-mono text-slate-500">
                            PIN: <strong className="text-slate-800">{u.password}</strong>
                          </div>
                        )}
                        {u.comment && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[190px]" title={u.comment}>
                            {u.comment}
                          </div>
                        )}
                      </td>

                      {/* Status & Usage Badges */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div>
                            {u.is_online ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                ONLINE
                              </span>
                            ) : u.status === 'EXPIRED' || u.voucher_status === 'EXPIRED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                EXPIRED
                              </span>
                            ) : isUnused ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Ticket className="w-3 h-3 text-indigo-500" />
                                HAIJATUMIKA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                OFFLINE
                              </span>
                            )}
                          </div>
                          <div>
                            {isUnused ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Ticket className="w-2.5 h-2.5 text-indigo-500" />
                                Bado Haijatumika
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                                <Check className="w-2.5 h-2.5 text-cyan-600" />
                                Imetumika
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Package (Kifurushi) Column */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-1.5">
                          <Package className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {u.plan_name || (u.plan_id ? `Kifurushi #${u.plan_id}` : 'Hotspot Standard')}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {u.plan_price ? (
                                <span className="text-emerald-700 font-black">{u.plan_price.toLocaleString()} TZS</span>
                              ) : (
                                <span className="text-slate-400">Standard</span>
                              )}
                              {u.limit_uptime ? ` • ${formatSecondsToTime(u.limit_uptime)}` : ''}
                            </div>
                            {u.rate_limit && u.rate_limit !== 'Default' && (
                              <div className="text-[9px] font-mono text-indigo-600 font-bold">
                                ⚡ {u.rate_limit}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Muundo / Chanzo (Phone vs Manual) Column */}
                      <td className="px-4 py-3.5">
                        {isPhoneUser ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Smartphone className="w-3 h-3 text-blue-600" />
                              SIMU (MOBILE)
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Muundo: <span className="font-bold text-blue-900">MP-XXXX-XXXX</span>
                            </div>
                            {u.phone_number && (
                              <div className="text-[10px] font-mono text-blue-700 font-bold">
                                📞 {u.phone_number}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Ticket className="w-3 h-3 text-purple-600" />
                              VOCHA (MANUAL)
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Muundo: <span className="font-bold text-purple-900">VCH-XXXX-XXXX</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* IP & MAC */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="text-slate-800 font-medium">
                          {u.ip_address || '—'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.mac_address || '—'}
                        </div>
                      </td>

                      {/* Uptime */}
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {u.uptime_seconds !== undefined && u.uptime_seconds > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatSecondsToTime(u.uptime_seconds)}
                          </span>
                        ) : u.limit_uptime ? (
                          <span className="text-slate-400 text-[11px]">
                            Kikomo: {formatSecondsToTime(u.limit_uptime)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Download */}
                      <td className="px-4 py-3.5 font-mono text-emerald-700 font-semibold">
                        {u.bytes_in ? formatBytes(u.bytes_in) : '0 B'}
                      </td>

                      {/* Upload */}
                      <td className="px-4 py-3.5 font-mono text-blue-700">
                        {u.bytes_out ? formatBytes(u.bytes_out) : '0 B'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.is_online && (
                            <button
                              type="button"
                              onClick={() => handleKickUser(u.username)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                              title="Kata mtandao mara moja (Disconnect session)"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.username)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 transition cursor-pointer"
                            title="Futa mtumiaji huyu kwenye MikroTik"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Wifi className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-medium">Hakuna mtumiaji anayelingana na vigezo.</p>
            </div>
          ) : (
            paginatedUsers.map((u) => {
              const isPassVisible = !!showPasswords[u.username];
              const isPhoneUser = checkIsPhoneUser(u);
              const isUnused = checkIsUnused(u);

              return (
                <div key={u.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/60 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-indigo-950 text-base">
                          {u.username}
                        </span>
                        {u.password && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((prev) => ({
                                ...prev,
                                [u.username]: !prev[u.username],
                              }))
                            }
                            className="p-1 rounded bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                      {isPassVisible && u.password && (
                        <div className="text-xs font-mono text-indigo-700 font-bold mt-0.5">
                          PIN: {u.password}
                        </div>
                      )}
                    </div>

                    {/* Status & Method Badges */}
                    <div className="flex flex-col items-end gap-1">
                      {u.is_online ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          ONLINE
                        </span>
                      ) : u.status === 'EXPIRED' || u.voucher_status === 'EXPIRED' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          EXPIRED
                        </span>
                      ) : isUnused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                          <Ticket className="w-3 h-3 text-indigo-500" />
                          HAIJATUMIKA
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          OFFLINE
                        </span>
                      )}

                      {isPhoneUser ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Smartphone className="w-2.5 h-2.5" />
                          Simu (MP-...)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Ticket className="w-2.5 h-2.5" />
                          Vocha (VCH-...)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Package & Usage Info Row */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900 text-xs">
                          {u.plan_name || (u.plan_id ? `Kifurushi #${u.plan_id}` : 'Hotspot Standard')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {u.plan_price ? `${u.plan_price.toLocaleString()} TZS` : 'Standard'}
                          {u.limit_uptime ? ` • ${formatSecondsToTime(u.limit_uptime)}` : ''}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isUnused ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Haijatumika
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                          Imetumika
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Device Info & Traffic Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">IP / MAC:</span>
                      <span className="text-slate-800 font-medium truncate block">{u.ip_address || '—'}</span>
                      <span className="text-[10px] text-slate-400 truncate block">{u.mac_address || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Muda / Kasi:</span>
                      <span className="text-slate-800 font-medium block">
                        {u.uptime_seconds ? formatSecondsToTime(u.uptime_seconds) : '—'}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold block">{u.rate_limit || 'Default'}</span>
                    </div>
                  </div>

                  {/* Data Usage & Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-emerald-700 font-bold">↓ {formatBytes(u.bytes_in || 0)}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-blue-700 font-bold">↑ {formatBytes(u.bytes_out || 0)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {u.is_online && (
                        <button
                          type="button"
                          onClick={() => handleKickUser(u.username)}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs flex items-center gap-1 transition min-h-[36px] cursor-pointer"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Kick</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.username)}
                        className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                        title="Futa mtumiaji"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls (10, 20, 30, 40, ALL) */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="watumiaji"
        />
      </div>

      {/* Add User / Generate Voucher Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Tengeneza Vocha / Mtumiaji Mpya</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jina la Mtumiaji (Username / Voucher Code)
                </label>
                <div className="flex items-center gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomCode('manual')}
                    className="text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    title="Muundo wa Vocha ya Kawaida: VCH-XXXX-XXXX"
                  >
                    <Ticket className="w-3 h-3 text-purple-600" />
                    <span>Zalisha Vocha (VCH-...)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateRandomCode('phone')}
                    className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                    title="Muundo wa Kujiunga kwa Simu: MP-XXXX-XXXX"
                  >
                    <Smartphone className="w-3 h-3 text-blue-600" />
                    <span>Zalisha Simu (MP-...)</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newUserData.username}
                  onChange={(e) =>
                    setNewUserData({ ...newUserData, username: e.target.value.toUpperCase() })
                  }
                  placeholder="mfano: VCH-8429-1024 au MP-9821-4401"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-black text-indigo-950 rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nenosiri (Password / PIN)
                </label>
                <input
                  type="text"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Acha tupu au sawa na Username"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Chagua Kifurushi (Plan / Profile)
                </label>
                <select
                  value={newUserData.plan_id}
                  onChange={(e) => {
                    const pid = Number(e.target.value);
                    const p = plans.find((pl) => pl.id === pid);
                    setNewUserData({
                      ...newUserData,
                      plan_id: pid,
                      rate_limit: p?.rate_limit || '',
                      limit_uptime: p?.limit_uptime || 7200,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price.toLocaleString()} TZS ({p.rate_limit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Maelezo / Comment (Hiari)
                </label>
                <input
                  type="text"
                  value={newUserData.comment}
                  onChange={(e) => setNewUserData({ ...newUserData, comment: e.target.value })}
                  placeholder="mfano: Kaunta Mteja Juma"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {savingUser && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Weka kwenye MikroTik</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
