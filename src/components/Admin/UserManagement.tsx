import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Lock,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  Copy,
  Wifi,
  Package,
  Tag,
  Receipt,
  Server,
  Sliders,
  Sparkles,
  Smartphone,
  Mail,
  Building,
  RefreshCw,
  Power,
  Zap,
  Filter,
  UserCheck,
  UserX,
  ChevronRight,
  Palette,
  Terminal,
} from 'lucide-react';
import { HotspotOwner, RouterItem, UserPrivileges, UserRole } from '../../types/index.ts';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

interface UserManagementProps {
  currentUser?: HotspotOwner | null;
  lang?: 'sw' | 'en';
  onSwitchUser?: (user: HotspotOwner) => void;
}

const ROLE_DEFINITIONS: Record<
  UserRole,
  { labelSw: string; labelEn: string; descSw: string; descEn: string; color: string; bg: string; border: string }
> = {
  VENDOR_ADMIN: {
    labelSw: 'Master Admin (HQ)',
    labelEn: 'Master Admin (HQ)',
    descSw: 'Msimamizi mkuu wa mfumo mzima wa nchi na wamiliki wote.',
    descEn: 'Full master root administrator with complete platform privileges.',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  HOTSPOT_OWNER: {
    labelSw: 'Mmiliki wa Hotspot (Tenant)',
    labelEn: 'Hotspot Owner (Tenant)',
    descSw: 'Mmiliki wa biashara ya hotspot anayesimamia vifaa na wafanyakazi wake.',
    descEn: 'Business tenant owner controlling routers, packages and team.',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  MANAGER: {
    labelSw: 'Meneja wa Biashara',
    labelEn: 'Branch Manager',
    descSw: 'Msimamizi wa tawi anayeweza kuona ripoti, kutoa vocha na kusimamia wateja.',
    descEn: 'Branch supervisor with broad operational and staff access.',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  CASHIER: {
    labelSw: 'Muuza Vocha (Cashier / POS)',
    labelEn: 'Voucher Cashier (POS)',
    descSw: 'Mhudumu wa mauzo anayezalisha na kuchapisha kadi za vocha kwa wateja.',
    descEn: 'Frontline cashier focused on voucher generation and sales printing.',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  TECHNICIAN: {
    labelSw: 'Fundi Mtandao (Network Tech)',
    labelEn: 'Network Technician',
    descSw: 'Mtaalamu wa routers, reboot, signal na wateja waliopo hewani.',
    descEn: 'Field engineer managing routers, access points and connectivity.',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  OPERATOR: {
    labelSw: 'Mhudumu wa Hotspot (Operator)',
    labelEn: 'Hotspot Operator',
    descSw: 'Mhudumu wa kila siku anayesaidia wateja kuunganishwa na kusimamia vocha.',
    descEn: 'Daily operator handling voucher distribution and live client assistance.',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  VIEWER: {
    labelSw: 'Mwangalizi (Auditor / Read-Only)',
    labelEn: 'Auditor (Read-Only)',
    descSw: 'Haki ya kuangalia ripoti na miamala bila uwezo wa kubadilisha mipangilio.',
    descEn: 'Read-only access for accounting, auditing and monitoring.',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
};

const PRIVILEGE_ITEMS: {
  key: keyof UserPrivileges;
  labelSw: string;
  labelEn: string;
  descSw: string;
  descEn: string;
  category: 'fleet' | 'vouchers' | 'users' | 'finance_system';
  icon: any;
}[] = [
  // Fleet Category
  {
    key: 'can_manage_routers',
    labelSw: 'Kusimamia Routers & APs',
    labelEn: 'Manage Routers & APs',
    descSw: 'Kuongeza, kubadilisha IP/RADIUS na kusanidi vifaa vya mtandao.',
    descEn: 'Add, edit and configure MikroTik, Ruijie, Omada & Cudy devices.',
    category: 'fleet',
    icon: Server,
  },
  {
    key: 'can_reboot_routers',
    labelSw: 'Kuzima/Kuwasha Router (Reboot)',
    labelEn: 'Remote Device Reboot',
    descSw: 'Kutuma amri ya ku-reboot router kupitia API au Cloud VPN.',
    descEn: 'Send remote reboot commands to connected routers via VPN/API.',
    category: 'fleet',
    icon: Power,
  },
  // Vouchers & Plans Category
  {
    key: 'can_manage_plans',
    labelSw: 'Kupanga Vifurushi & Bei',
    labelEn: 'Manage Rate Plans & Pricing',
    descSw: 'Kubuni vifurushi vipya vya muda/data na kuweka bei za mauzo.',
    descEn: 'Create and update internet packages, bandwidth speeds and tariffs.',
    category: 'vouchers',
    icon: Package,
  },
  {
    key: 'can_generate_vouchers',
    labelSw: 'Kutengeneza Vocha Mpya',
    labelEn: 'Generate New Vouchers',
    descSw: 'Kuzalisha msimbo wa vocha moja moja au kwa makundi (batch).',
    descEn: 'Generate single and batch voucher codes for hotspot users.',
    category: 'vouchers',
    icon: Tag,
  },
  {
    key: 'can_view_vouchers',
    labelSw: 'Kuangalia Orodha ya Vocha',
    labelEn: 'View Voucher Inventory',
    descSw: 'Kuangalia vocha zilizouzwa, zilizopo na zilizokwisha muda.',
    descEn: 'View available, activated and expired voucher lists.',
    category: 'vouchers',
    icon: Tag,
  },
  {
    key: 'can_print_vouchers',
    labelSw: 'Kuchapisha Kadi za Vocha',
    labelEn: 'Print Physical Voucher Cards',
    descSw: 'Kutuma vocha kwenye printer ya POS au karatasi ya A4.',
    descEn: 'Print ready-to-sell thermal vouchers or card sheet layouts.',
    category: 'vouchers',
    icon: Sparkles,
  },
  // Users & Staff Category
  {
    key: 'can_view_active_users',
    labelSw: 'Kuona Wateja Waliopo Online',
    labelEn: 'View Live Hotspot Users',
    descSw: 'Kuangalia wateja waliounganishwa sasa, MAC, IP na matumizi ya data.',
    descEn: 'Inspect real-time connected clients, uptime and bandwidth consumption.',
    category: 'users',
    icon: Wifi,
  },
  {
    key: 'can_kick_users',
    labelSw: 'Kukata / Kutoa Mteja (Kick/Disconnect)',
    labelEn: 'Disconnect / Kick Users',
    descSw: 'Kukata muunganisho wa mteja aliye mtandaoni kupitia RADIUS CoA au MikroTik.',
    descEn: 'Force disconnect abusive or expired users via RADIUS CoA / API.',
    category: 'users',
    icon: Power,
  },
  {
    key: 'can_manage_subusers',
    labelSw: 'Kusimamia Wafanyakazi & Privileges',
    labelEn: 'Manage Staff & User Privileges',
    descSw: 'Kuongeza wafanyakazi wapya na kutoa au kuondoa ruhusa zao.',
    descEn: 'Create sub-users, cashiers, technicians and assign custom permissions.',
    category: 'users',
    icon: ShieldCheck,
  },
  // Finance & System Category
  {
    key: 'can_view_reports',
    labelSw: 'Kuangalia Miamala & Ripoti za Fedha',
    labelEn: 'View Transactions & Financials',
    descSw: 'Kuona taarifa za mauzo ya M-Pesa, Tigo, Airtel, Halopesa na fedha taslimu.',
    descEn: 'Review mobile money transaction records, daily revenue and audits.',
    category: 'finance_system',
    icon: Receipt,
  },
  {
    key: 'can_export_reports',
    labelSw: 'Kupakua Ripoti (Excel / CSV)',
    labelEn: 'Export Financial Reports',
    descSw: 'Kupakua ripoti za hesabu za biashara kwa uhasibu na ukaguzi.',
    descEn: 'Export revenue logs and audit trails to spreadsheet format.',
    category: 'finance_system',
    icon: Receipt,
  },
  {
    key: 'can_customize_portal',
    labelSw: 'Kubinafsisha Muonekano wa Captive Portal',
    labelEn: 'Customize Captive Portal',
    descSw: 'Kubadilisha rangi za kadi za vifurushi, mandhari na nembo ya biashara.',
    descEn: 'Modify portal theme colors, card styles, brand logos and header text.',
    category: 'finance_system',
    icon: Palette,
  },
  {
    key: 'can_manage_payments',
    labelSw: 'Kusanidi Mageti ya Malipo (APIs & Merchant)',
    labelEn: 'Configure Payment Gateways',
    descSw: 'Kuweka namba za simu za kupokea pesa au akaunti ya PalmPay/AzamPay.',
    descEn: 'Setup merchant credentials, API tokens and payout accounts.',
    category: 'finance_system',
    icon: Sliders,
  },
  {
    key: 'can_manage_devops',
    labelSw: 'Zana za VPS & DevOps',
    labelEn: 'Cloud VPS & DevOps Tools',
    descSw: 'Kuingia kwenye FreeRADIUS, mikataba ya SSL na mfumo wa seva.',
    descEn: 'Server configurations, FreeRADIUS setup, and system maintenance.',
    category: 'finance_system',
    icon: Terminal,
  },
];

const PRESETS: {
  id: string;
  nameSw: string;
  nameEn: string;
  role: UserRole;
  icon: any;
  privileges: UserPrivileges;
}[] = [
  {
    id: 'full_manager',
    nameSw: 'Meneja Mkuu (Full Operational)',
    nameEn: 'General Manager (Full Operational)',
    role: 'MANAGER',
    icon: ShieldCheck,
    privileges: {
      can_manage_routers: true,
      can_reboot_routers: true,
      can_manage_plans: true,
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_view_active_users: true,
      can_kick_users: true,
      can_view_reports: true,
      can_export_reports: true,
      can_manage_subusers: true,
      can_customize_portal: true,
    },
  },
  {
    id: 'cashier_pos',
    nameSw: 'Muuza Vocha (Cashier / POS)',
    nameEn: 'Voucher Cashier (POS Only)',
    role: 'CASHIER',
    icon: Tag,
    privileges: {
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_view_active_users: false,
      can_view_reports: false,
    },
  },
  {
    id: 'network_tech',
    nameSw: 'Fundi wa Mtandao (Network Tech)',
    nameEn: 'Network Technician',
    role: 'TECHNICIAN',
    icon: Server,
    privileges: {
      can_manage_routers: true,
      can_reboot_routers: true,
      can_view_active_users: true,
      can_kick_users: true,
      can_view_vouchers: true,
    },
  },
  {
    id: 'finance_auditor',
    nameSw: 'Mhasibu / Auditor (Ripoti Pekee)',
    nameEn: 'Auditor & Finance (Reports Only)',
    role: 'VIEWER',
    icon: Receipt,
    privileges: {
      can_view_reports: true,
      can_export_reports: true,
      can_view_vouchers: true,
      can_view_active_users: true,
    },
  },
  {
    id: 'operator_front',
    nameSw: 'Mhudumu wa Wateja (Operator)',
    nameEn: 'Front Desk Operator',
    role: 'OPERATOR',
    icon: Users,
    privileges: {
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_view_active_users: true,
      can_kick_users: true,
    },
  },
];

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  lang = 'sw',
  onSwitchUser,
}) => {
  const [users, setUsers] = useState<HotspotOwner[]>([]);
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<HotspotOwner | null>(null);
  const [privilegeModalUser, setPrivilegeModalUser] = useState<HotspotOwner | null>(null);
  const [tempPrivileges, setTempPrivileges] = useState<UserPrivileges>({});
  const [tempRole, setTempRole] = useState<UserRole>('MANAGER');
  const [tempStaffTitle, setTempStaffTitle] = useState<string>('');

  // Password Reveal
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [revealedUserId, setRevealedUserId] = useState<number | null>(null);

  // Dynamic Save / Update Status Feedbacks
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'updated'>('idle');
  const [privilegeSaveStatus, setPrivilegeSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'updated'>('idle');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; title: string; text: string } | null>(null);

  // Newly Created User Credentials card
  const [newlyCreatedCreds, setNewlyCreatedCreds] = useState<{
    name: string;
    phone: string;
    email: string;
    password: string;
    role: string;
    title?: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const isVendor = currentUser?.role === 'VENDOR_ADMIN';
  const [allHotspotOwners, setAllHotspotOwners] = useState<HotspotOwner[]>([]);
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('ALL');

  // Form State for Adding / Editing User
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    business_name: '',
    staff_title: '',
    phone: '',
    email: '',
    password: '123456',
    role: 'MANAGER' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
    assigned_router_ids: [] as number[],
    monthly_fee: 0,
    commission_rate: 0,
    parent_owner_id: (!isVendor && currentUser ? (currentUser.parent_owner_id || currentUser.id) : undefined) as number | string | undefined,
  });

  const authHeaders = useMemo<Record<string, string>>(() => {
    const token = localStorage.getItem('tzwifi_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (currentUser?.id) headers['x-owner-id'] = String(currentUser.id);
    return headers;
  }, [currentUser?.id]);

  // Fetch Users & Routers
  const fetchData = async () => {
    setIsLoading(true);
    try {
      let url = '/api/v1/owners?includeSubUsers=true';
      if (!isVendor && currentUser) {
        // Hotspot Owner mode: load owner and all their team members strictly
        url = `/api/v1/owners?parentOwnerId=${currentUser.parent_owner_id || currentUser.id}`;
      }

      const promises: Promise<Response>[] = [
        fetch(url, { headers: authHeaders }),
        fetch(
          isVendor
            ? '/api/v1/routers'
            : `/api/v1/routers?ownerId=${currentUser?.parent_owner_id || currentUser?.id || ''}`,
          { headers: authHeaders }
        ),
      ];

      if (isVendor) {
        promises.push(fetch('/api/v1/owners', { headers: authHeaders }));
      }

      const [usersRes, routersRes, ownersRes] = await Promise.all(promises);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(Array.isArray(uData) ? uData : []);
      }
      if (routersRes.ok) {
        const rData = await routersRes.json();
        setRouters(Array.isArray(rData) ? rData : []);
      }
      if (ownersRes && ownersRes.ok) {
        const oData = await ownersRes.json();
        setAllHotspotOwners(Array.isArray(oData) ? oData.filter((o: HotspotOwner) => o.role === 'HOTSPOT_OWNER') : []);
      }
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id, isVendor]);

  // Show Toast Auto-dismiss
  const showToast = (type: 'success' | 'error', title: string, text: string) => {
    setToastMessage({ type, title, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Filter Users with Strict Multi-Tenant Isolation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Hotspot Owners and Vendor Admin are excluded from staff management
      if (u.role === 'HOTSPOT_OWNER' || u.role === 'VENDOR_ADMIN') {
        return false;
      }

      // Hotspot Owner isolation: only see their own staff members
      if (!isVendor && currentUser) {
        const myParentId = Number(currentUser.parent_owner_id || currentUser.id);
        if (Number(u.parent_owner_id) !== myParentId) {
          return false;
        }
      }

      // Vendor Admin specific owner filter
      if (isVendor && selectedOwnerFilter !== 'ALL') {
        if (String(u.parent_owner_id) !== String(selectedOwnerFilter)) {
          return false;
        }
      }

      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.business_name?.toLowerCase().includes(q) ||
        u.staff_title?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);

      // Role Filter
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;

      // Status Filter
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter, isVendor, currentUser, selectedOwnerFilter]);

  // Scoped Staff / Team Members strictly for the Current Account
  const targetParentOwnerId = useMemo(() => {
    if (!isVendor && currentUser) {
      return Number(currentUser.parent_owner_id || currentUser.id);
    }
    if (isVendor && selectedOwnerFilter !== 'ALL') {
      return Number(selectedOwnerFilter);
    }
    return undefined;
  }, [isVendor, currentUser, selectedOwnerFilter]);

  const scopedStaffUsers = useMemo(() => {
    return users.filter((u) => {
      // Exclude top-level hotspot owners and vendor admin
      if (u.role === 'HOTSPOT_OWNER' || u.role === 'VENDOR_ADMIN') return false;

      if (targetParentOwnerId !== undefined) {
        return Number(u.parent_owner_id) === targetParentOwnerId;
      }

      return true;
    });
  }, [users, targetParentOwnerId]);

  // Paginated Users
  const paginatedUsers = useMemo(() => {
    if (pageSize === 'ALL') return filteredUsers;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filteredUsers.slice(start, start + size);
  }, [filteredUsers, currentPage, pageSize]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingUser(null);
    const defaultParentId = !isVendor && currentUser
      ? (currentUser.parent_owner_id || currentUser.id)
      : (selectedOwnerFilter !== 'ALL' ? Number(selectedOwnerFilter) : undefined);
    const defaultParentOwner = defaultParentId ? allHotspotOwners.find((o) => o.id === defaultParentId) : undefined;

    setUserForm({
      name: '',
      username: '',
      business_name: defaultParentOwner?.business_name || (!isVendor ? (currentUser?.business_name || '') : ''),
      staff_title: '',
      phone: '',
      email: '',
      password: '123456',
      role: 'CASHIER',
      status: 'ACTIVE',
      assigned_router_ids: defaultParentOwner?.assigned_router_ids || routers.map((r) => r.id),
      monthly_fee: 0,
      commission_rate: 0,
      parent_owner_id: defaultParentId,
    });
    setTempPrivileges({
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_view_active_users: true,
    });
    setShowFormPassword(false);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: HotspotOwner) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      username: user.username || '',
      business_name: user.business_name || '',
      staff_title: user.staff_title || '',
      phone: user.phone,
      email: user.email || '',
      password: user.password || '123456',
      role: user.role,
      status: user.status,
      assigned_router_ids: user.assigned_router_ids || [],
      monthly_fee: user.monthly_fee || 0,
      commission_rate: user.commission_rate || 0,
      parent_owner_id: user.parent_owner_id,
    });
    setTempPrivileges(user.privileges || {});
    setShowFormPassword(false);
    setIsAddModalOpen(true);
  };

  // Open Privilege Manager Modal
  const handleOpenPrivilegeModal = (user: HotspotOwner) => {
    setPrivilegeModalUser(user);
    setTempPrivileges(user.privileges || {});
    setTempRole(user.role);
    setTempStaffTitle(user.staff_title || '');
    setPrivilegeSaveStatus('idle');
  };

  // Apply Preset
  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setTempPrivileges({ ...preset.privileges });
    setTempRole(preset.role);
    showToast(
      'success',
      lang === 'sw' ? 'Preset Imetumika' : 'Preset Applied',
      lang === 'sw'
        ? `Ruhusa za ${preset.nameSw} zimewekwa kwenye fomu.`
        : `${preset.nameEn} permissions have been populated.`
    );
  };

  // Toggle individual privilege
  const handleTogglePrivilege = (key: keyof UserPrivileges) => {
    setTempPrivileges((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.phone) {
      showToast('error', 'Kosa', 'Jina kamili na nambari ya simu vinahitajika!');
      return;
    }

    if (isVendor && !userForm.parent_owner_id) {
      showToast('error', 'Chagua Mmiliki', 'Tafadhali chagua Mmiliki wa Hotspot ambaye mfanyakazi huyu anafanya kazi kwake!');
      return;
    }

    setSaveStatus('saving');

    try {
      const isUpdating = !!editingUser;
      const url = isUpdating ? `/api/v1/owners/${editingUser.id}` : '/api/v1/owners';
      const method = isUpdating ? 'PUT' : 'POST';

      const payload = {
        ...userForm,
        privileges: tempPrivileges,
        parent_owner_id:
          !isVendor && currentUser ? (currentUser.parent_owner_id || currentUser.id) : userForm.parent_owner_id,
        is_sub_user: true,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kuhifadhi mtumiaji');

      // Update button state dynamically
      setSaveStatus(isUpdating ? 'updated' : 'saved');

      showToast(
        'success',
        isUpdating
          ? (lang === 'sw' ? 'Updated! (Imesasishwa)' : 'Updated Successfully!')
          : (lang === 'sw' ? 'Saved! (Imehifadhiwa)' : 'Saved Successfully!'),
        isUpdating
          ? `Taarifa na ruhusa za ${data.owner?.name || userForm.name} zimesasishwa kikamilifu (Updated).`
          : `Mtumiaji mpya ${data.owner?.name || userForm.name} amehifadhiwa kikamilifu (Saved).`
      );

      if (!isUpdating) {
        setNewlyCreatedCreds({
          name: userForm.name,
          phone: userForm.phone,
          email: userForm.email || `${userForm.phone.replace(/\D/g, '')}@tzwifi.local`,
          password: userForm.password,
          role: userForm.role,
          title: userForm.staff_title,
        });
      }

      await fetchData();

      setTimeout(() => {
        setIsAddModalOpen(false);
        setSaveStatus('idle');
      }, 1200);
    } catch (err: any) {
      setSaveStatus('idle');
      showToast('error', 'Hitilafu ya Kuhifadhi', err.message || 'Kuna tatizo limetokea.');
    }
  };

  // Save Dedicated Privileges
  const handleSavePrivilegesOnly = async () => {
    if (!privilegeModalUser) return;
    setPrivilegeSaveStatus('saving');

    try {
      const res = await fetch(`/api/v1/owners/${privilegeModalUser.id}/privileges`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privileges: tempPrivileges,
          role: tempRole,
          staff_title: tempStaffTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kusasisha ruhusa');

      setPrivilegeSaveStatus('updated');

      showToast(
        'success',
        lang === 'sw' ? 'Updated! (Ruhusa Zimesasishwa)' : 'Privileges Updated!',
        lang === 'sw'
          ? `Ruhusa (Privileges) za ${privilegeModalUser.name} zimehifadhiwa na kusasishwa kikamilifu!`
          : `Privileges for ${privilegeModalUser.name} were successfully updated!`
      );

      await fetchData();

      setTimeout(() => {
        setPrivilegeModalUser(null);
        setPrivilegeSaveStatus('idle');
      }, 1400);
    } catch (err: any) {
      setPrivilegeSaveStatus('idle');
      showToast('error', 'Hitilafu', err.message || 'Imeshindikana kuhifadhi ruhusa.');
    }
  };

  // Toggle User Status (Active / Suspended)
  const handleToggleStatus = async (user: HotspotOwner) => {
    const newStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? 'kuwasha' : 'kusimamisha';

    if (
      !confirm(
        lang === 'sw'
          ? `Je, una uhakika unataka ${actionText} akaunti ya ${user.name}?`
          : `Are you sure you want to set ${user.name}'s status to ${newStatus}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/owners/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Imeshindikana kubadilisha hali ya mtumiaji');

      showToast(
        'success',
        lang === 'sw' ? 'Updated! (Imesasishwa)' : 'Status Updated!',
        lang === 'sw'
          ? `Akaunti ya ${user.name} sasa iko ${newStatus === 'ACTIVE' ? 'ACTIVE (Imewashwa)' : 'SUSPENDED (Imesimamishwa)'}.`
          : `Account status updated to ${newStatus}.`
      );
      fetchData();
    } catch (err: any) {
      showToast('error', 'Hitilafu', err.message);
    }
  };

  // Delete User
  const handleDeleteUser = async (user: HotspotOwner) => {
    if (user.role === 'VENDOR_ADMIN' && users.filter((u) => u.role === 'VENDOR_ADMIN').length <= 1) {
      showToast('error', 'Hairuhusiwi', 'Huwezi kufuta akaunti ya pekee ya Master Admin.');
      return;
    }

    if (
      !confirm(
        lang === 'sw'
          ? `Je, una uhakika unataka kumfuta mtumiaji ${user.name}? Hatua hii haiwezi kurudishwa nyuma.`
          : `Are you sure you want to delete ${user.name}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/owners/${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Imeshindikana kufuta mtumiaji');

      showToast(
        'success',
        lang === 'sw' ? 'Imefutwa' : 'Deleted',
        lang === 'sw' ? `Mtumiaji ${user.name} amefutwa kwenye mfumo.` : `User ${user.name} removed successfully.`
      );
      fetchData();
    } catch (err: any) {
      showToast('error', 'Hitilafu', err.message);
    }
  };

  // Quick Copy Credentials
  const handleCopyNewCreds = () => {
    if (!newlyCreatedCreds) return;
    const text = `🔐 TZ-WIFI SYSTEM LOGIN CREDENTIALS
Jina: ${newlyCreatedCreds.name}
Cheo / Title: ${newlyCreatedCreds.title || newlyCreatedCreds.role}
Simu: ${newlyCreatedCreds.phone}
Barua Pepe: ${newlyCreatedCreds.email}
Nenosiri (Password): ${newlyCreatedCreds.password}
Tovuti: ${window.location.origin}`;

    navigator.clipboard.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  // Count Active Privileges Helper
  const getActivePrivilegesCount = (privs?: UserPrivileges) => {
    if (!privs) return 0;
    return Object.values(privs).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-top-4 duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/95 text-white border-emerald-500 shadow-emerald-950/40'
              : 'bg-rose-900/95 text-white border-rose-500 shadow-rose-950/40'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm">{toastMessage.title}</div>
            <div className="mt-0.5 opacity-90 leading-relaxed">{toastMessage.text}</div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/60 hover:text-white text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Action Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isVendor
                  ? (lang === 'sw' ? 'Master HQ User & Access Control' : 'Master HQ User & Access Control')
                  : `${currentUser?.business_name || 'Hotspot'} Staff & Privileges`}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isVendor
                ? (lang === 'sw' ? 'Udhibiti wa Watumiaji na Ruhusa (Privileges)' : 'User & Privilege Management')
                : (lang === 'sw' ? 'Wafanyakazi Wangu na Ruhusa (Staff & Privileges)' : 'My Staff & Team Privileges')}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              {isVendor
                ? (lang === 'sw'
                    ? 'Sajili wamiliki, mameneja, wauza vocha na mafundi wa mtandao. Weka na badilisha ruhusa (privileges) za kila mtumiaji kwa usalama.'
                    : 'Manage platform tenants, managers, cashiers and field technicians with fine-grained privilege controls.')
                : (lang === 'sw'
                    ? 'Ongeza na simamia wafanyakazi wa hotspot yako (wauza vocha, mameneja, mafundi) na uamue kipi wanaruhusiwa kuona au kubadilisha.'
                    : 'Add and manage cashiers, technicians and managers for your hotspot with customized operational privileges.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 backdrop-blur-xs transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{lang === 'sw' ? 'Onyesha Upya' : 'Refresh'}</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition transform hover:-translate-y-0.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>
                {isVendor
                  ? (lang === 'sw' ? 'Ongeza Mtumiaji Mpya' : 'Add New User')
                  : (lang === 'sw' ? 'Ongeza Mfanyakazi Mpya' : 'Add Staff Member')}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar - Strictly Scoped to Hotspot Owner Account */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-slate-400 font-medium">{lang === 'sw' ? 'Jumla ya Watumiaji' : 'Total Accounts'}</div>
            <div className="text-2xl font-black text-white mt-1">{scopedStaffUsers.length}</div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              {targetParentOwnerId !== undefined
                ? (lang === 'sw' ? 'Akaunti hii pekee' : 'This account only')
                : (lang === 'sw' ? 'Wafanyakazi wote' : 'All accounts')}
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-slate-400 font-medium">{lang === 'sw' ? 'Walio Kazini (Active)' : 'Active Status'}</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {scopedStaffUsers.filter((u) => u.status === 'ACTIVE').length}
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">{lang === 'sw' ? 'Wafanyakazi wanaoendelea' : 'Active team'}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-slate-400 font-medium">{lang === 'sw' ? 'Wauza Vocha (POS)' : 'Cashiers / POS'}</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {scopedStaffUsers.filter((u) => u.role === 'CASHIER').length}
            </div>
            <div className="text-[10px] text-amber-300 mt-0.5">{lang === 'sw' ? 'Wauza vocha wako' : 'Your cashiers'}</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-xs">
            <div className="text-slate-400 font-medium">{lang === 'sw' ? 'Mameneja & Mafundi' : 'Managers & Techs'}</div>
            <div className="text-2xl font-black text-indigo-300 mt-1">
              {scopedStaffUsers.filter((u) => u.role === 'MANAGER' || u.role === 'TECHNICIAN').length}
            </div>
            <div className="text-[10px] text-indigo-200 mt-0.5">{lang === 'sw' ? 'Viongozi & mafundi wako' : 'Your team leaders'}</div>
          </div>
        </div>
      </div>

      {/* Newly Created Credentials Modal / Notice */}
      {newlyCreatedCreds && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-5 sm:p-6 shadow-lg space-y-4 animate-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-emerald-950">
                  {lang === 'sw' ? 'Akaunti Imehifadhiwa (Saved & Ready)!' : 'User Created & Credentials Ready!'}
                </h3>
                <p className="text-xs text-emerald-800">
                  {lang === 'sw'
                    ? 'Taarifa za kuingilia kwenye mfumo kwa ajili ya mtumiaji mpya:'
                    : 'Login credentials for the new user:'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setNewlyCreatedCreds(null)}
              className="text-emerald-700 hover:text-emerald-950 font-bold text-xs px-2 py-1"
            >
              ✕ Funga
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-emerald-200 text-xs">
            <div>
              <span className="text-slate-500 block">Jina:</span>
              <span className="font-bold text-slate-900">{newlyCreatedCreds.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Simu (Username):</span>
              <span className="font-bold font-mono text-slate-900">{newlyCreatedCreds.phone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Nenosiri (Password):</span>
              <span className="font-bold font-mono text-indigo-700">{newlyCreatedCreds.password}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cheo / Jukumu:</span>
              <span className="font-bold text-emerald-700">{newlyCreatedCreds.role}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={handleCopyNewCreds}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition"
            >
              {copiedCreds ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCreds ? 'Imenakiliwa!' : 'Nakili Taarifa (Copy Info)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={
              lang === 'sw'
                ? 'Tafuta mtumiaji, namba, cheo, email au jukumu...'
                : 'Search users, phone, role, title or email...'
            }
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Owner Filter for Vendor Admin */}
          {isVendor && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700">
              <span className="text-slate-400">🏢</span>
              <select
                value={selectedOwnerFilter}
                onChange={(e) => {
                  setSelectedOwnerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-slate-800 cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL">{lang === 'sw' ? 'Wamiliki Wote (All Owners)' : 'All Hotspot Owners'}</option>
                {allHotspotOwners.map((owner) => (
                  <option key={owner.id} value={String(owner.id)}>
                    {owner.business_name} ({owner.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="ALL">{lang === 'sw' ? 'Majukumu Yote (All Roles)' : 'All Roles'}</option>
              {isVendor && <option value="VENDOR_ADMIN">Master Admin (HQ)</option>}
              {isVendor && <option value="HOTSPOT_OWNER">Wamiliki wa Hotspot</option>}
              <option value="MANAGER">Meneja wa Biashara</option>
              <option value="CASHIER">Muuza Vocha (Cashier / POS)</option>
              <option value="TECHNICIAN">Fundi Mtandao (Tech)</option>
              <option value="OPERATOR">Mhudumu (Operator)</option>
              <option value="VIEWER">Mwangalizi (Auditor)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs font-semibold text-slate-700">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent border-none focus:ring-0 text-xs font-semibold text-slate-800 cursor-pointer"
            >
              <option value="ALL">{lang === 'sw' ? 'Hali Zote (All Status)' : 'All Status'}</option>
              <option value="ACTIVE">{lang === 'sw' ? 'Active Pekee' : 'Active Only'}</option>
              <option value="SUSPENDED">{lang === 'sw' ? 'Suspended Pekee' : 'Suspended Only'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Users Table & Privilege Cards */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-4 px-6">{lang === 'sw' ? 'Mtumiaji / Mfanyakazi' : 'User / Staff'}</th>
                <th className="py-4 px-4">{lang === 'sw' ? 'Jukumu (Role)' : 'Role'}</th>
                <th className="py-4 px-4">{lang === 'sw' ? 'Mawasiliano (Simu & Email)' : 'Contact'}</th>
                <th className="py-4 px-4">{lang === 'sw' ? 'Ruhusa Zilizopo (Privileges)' : 'Active Privileges'}</th>
                <th className="py-4 px-4">{lang === 'sw' ? 'Hali' : 'Status'}</th>
                <th className="py-4 px-6 text-right">{lang === 'sw' ? 'Vitendo (Actions)' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>{lang === 'sw' ? 'Inapakia watumiaji na ruhusa...' : 'Loading accounts and privileges...'}</span>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">
                      {lang === 'sw' ? 'Hakuna mtumiaji aliyepatikana.' : 'No users found.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {lang === 'sw'
                        ? 'Jaribu kubadilisha maneno ya utafutaji au ongeza mtumiaji mpya.'
                        : 'Try adjusting filters or create a new user account.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const roleMeta = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.HOTSPOT_OWNER;
                  const activeCount = getActivePrivilegesCount(user.privileges);
                  const isSuspended = user.status === 'SUSPENDED';

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isSuspended ? 'bg-rose-50/30 opacity-75' : ''
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-xs ${
                              user.role === 'VENDOR_ADMIN'
                                ? 'bg-purple-600 text-white'
                                : user.role === 'HOTSPOT_OWNER'
                                ? 'bg-amber-500 text-slate-950'
                                : user.role === 'CASHIER'
                                ? 'bg-emerald-500 text-white'
                                : user.role === 'TECHNICIAN'
                                ? 'bg-blue-600 text-white'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {user.name ? user.name.slice(0, 2) : 'US'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{user.name}</span>
                              {user.id === currentUser?.id && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold">
                                  YOU (Wewe)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              {user.staff_title ? (
                                <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                  {user.staff_title}
                                </span>
                              ) : (
                                <span>{user.business_name || 'TZ-WiFi Hotspot'}</span>
                              )}
                              {isVendor && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  🏢 {allHotspotOwners.find((o) => o.id === Number(user.parent_owner_id))?.business_name || user.business_name || 'Mmiliki hajatambuliwa'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${roleMeta.bg} ${roleMeta.color} ${roleMeta.border}`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>{lang === 'sw' ? roleMeta.labelSw : roleMeta.labelEn}</span>
                        </span>
                      </td>

                      {/* Contact Info */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{user.phone}</span>
                          </div>
                          {user.email && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate max-w-[180px]">{user.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Privileges Pill & Action */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleOpenPrivilegeModal(user)}
                          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 transition text-xs font-bold"
                          title="Bonyeza kusanidi au kutoa privilege"
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          <span>
                            {user.role === 'VENDOR_ADMIN'
                              ? 'Full Root Access (14/14)'
                              : `${activeCount} Ruhusa (Active)`}
                          </span>
                          <span className="text-[10px] text-indigo-600 opacity-0 group-hover:opacity-100 transition">
                            Badili ➔
                          </span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            isSuspended
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? 'bg-rose-600' : 'bg-emerald-600'
                            }`}
                          />
                          <span>{isSuspended ? 'SUSPENDED' : 'ACTIVE'}</span>
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Privileges Modal */}
                          <button
                            onClick={() => handleOpenPrivilegeModal(user)}
                            className="p-2 rounded-xl text-indigo-700 hover:bg-indigo-50 transition border border-indigo-100"
                            title={lang === 'sw' ? 'Kutoa au kubadilisha Ruhusa' : 'Manage Privileges'}
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200"
                            title={lang === 'sw' ? 'Hariri Taarifa' : 'Edit Profile'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-2 rounded-xl border transition ${
                              isSuspended
                                ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                                : 'text-amber-700 hover:bg-amber-50 border-amber-200'
                            }`}
                            title={
                              isSuspended
                                ? (lang === 'sw' ? 'Washa Akaunti (Activate)' : 'Activate')
                                : (lang === 'sw' ? 'Simamisha (Suspend)' : 'Suspend')
                            }
                          >
                            {isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>

                          {/* Delete (Sub-users only) */}
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition border border-rose-200"
                              title={lang === 'sw' ? 'Futa Mtumiaji' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <TablePagination
            totalItems={filteredUsers.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: DEDICATED PRIVILEGE & ACCESS CONTROL DRAWER / MODAL              */}
      {/* ========================================================================= */}
      {privilegeModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-600/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {lang === 'sw' ? 'Ruhusa & Ufikiaji (Privilege Matrix)' : 'User Privileges Matrix'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {privilegeModalUser.name} • {privilegeModalUser.phone} (
                    {privilegeModalUser.business_name || 'Hotspot'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPrivilegeModalUser(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1"
              >
                ✕ Funga
              </button>
            </div>

            {/* Quick Role & Title Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jukumu (Assigned Role):</label>
                <select
                  value={tempRole}
                  onChange={(e) => setTempRole(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  {isVendor && <option value="VENDOR_ADMIN">Master Admin (HQ)</option>}
                  {isVendor && <option value="HOTSPOT_OWNER">Mmiliki wa Hotspot (Tenant)</option>}
                  <option value="MANAGER">Meneja wa Biashara (Manager)</option>
                  <option value="CASHIER">Muuza Vocha (Cashier / POS)</option>
                  <option value="TECHNICIAN">Fundi Mtandao (Network Tech)</option>
                  <option value="OPERATOR">Mhudumu wa Hotspot (Operator)</option>
                  <option value="VIEWER">Mwangalizi (Auditor / Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cheo cha Mfanyakazi (Staff Title):</label>
                <input
                  type="text"
                  value={tempStaffTitle}
                  onChange={(e) => setTempStaffTitle(e.target.value)}
                  placeholder="mfano: Muuza Duka la Posta / Msimamizi Kariakoo"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Role Preset Fast Pickers */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                ⚡ {lang === 'sw' ? 'Violezo vya Haraka (Quick Presets)' : 'Quick Role Presets'}:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2.5 rounded-xl bg-indigo-50/60 hover:bg-indigo-100 border border-indigo-200/80 text-left transition flex items-center gap-2 group"
                    >
                      <Icon className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-[11px] text-indigo-950 truncate">
                          {lang === 'sw' ? preset.nameSw : preset.nameEn}
                        </div>
                        <div className="text-[10px] text-indigo-600 truncate">{preset.role}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Granular Privilege Checkboxes Grouped */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  🛡️ {lang === 'sw' ? 'Orodha ya Ruhusa Mahususi (Granular Permissions)' : 'Granular Permissions'}:
                </label>
                <span className="text-[11px] font-bold text-indigo-700">
                  {getActivePrivilegesCount(tempPrivileges)} of {PRIVILEGE_ITEMS.length} Activated
                </span>
              </div>

              <div className="space-y-3">
                {PRIVILEGE_ITEMS.map((item) => {
                  const isChecked = Boolean(tempPrivileges[item.key]);
                  const Icon = item.icon;

                  return (
                    <label
                      key={item.key}
                      onClick={() => handleTogglePrivilege(item.key)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/70'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-bold text-xs ${
                              isChecked ? 'text-indigo-950' : 'text-slate-800'
                            }`}
                          >
                            {lang === 'sw' ? item.labelSw : item.labelEn}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                              isChecked
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isChecked
                              ? (lang === 'sw' ? 'INAWEZA (ALLOWED)' : 'ALLOWED')
                              : (lang === 'sw' ? 'IMEZUIWA' : 'DENIED')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                          {lang === 'sw' ? item.descSw : item.descEn}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions with Dynamic Save / Update Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPrivilegeModalUser(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
              >
                {lang === 'sw' ? 'Ghairi' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={privilegeSaveStatus === 'saving'}
                onClick={handleSavePrivilegesOnly}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition transform hover:-translate-y-0.5 shadow-lg ${
                  privilegeSaveStatus === 'updated' || privilegeSaveStatus === 'saved'
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                }`}
              >
                {privilegeSaveStatus === 'saving' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : privilegeSaveStatus === 'updated' || privilegeSaveStatus === 'saved' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                <span>
                  {privilegeSaveStatus === 'saving'
                    ? (lang === 'sw' ? 'Inasasisha...' : 'Saving...')
                    : privilegeSaveStatus === 'updated'
                    ? (lang === 'sw' ? '✓ Updated! (Ruhusa Zimesasishwa)' : '✓ Updated!')
                    : (lang === 'sw' ? 'Hifadhi & Sasisha Ruhusa (Save & Update)' : 'Save & Update Privileges')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT USER MODAL                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    {editingUser
                      ? (lang === 'sw' ? 'Badilisha Taarifa za Mtumiaji' : 'Edit User Profile')
                      : (lang === 'sw' ? 'Sajili Mtumiaji / Mfanyakazi Mpya' : 'Add New Staff Member')}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'sw'
                      ? 'Weka taarifa za akaunti na nenosiri la kuingilia kwenye mfumo.'
                      : 'Provide login credentials, role and assigned privileges.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1"
              >
                ✕ Funga
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* Name & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Jina Kamili *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="mfano: Baraka Juma"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Cheo cha Mfanyakazi (Staff Title)' : 'Staff Title / Post'}
                  </label>
                  <input
                    type="text"
                    value={userForm.staff_title}
                    onChange={(e) => setUserForm({ ...userForm, staff_title: e.target.value })}
                    placeholder="mfano: Muuza Vocha Duka Kuu"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Business / Hotspot Owner Selection */}
              {isVendor ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Mmiliki wa Hotspot (Hotspot Owner Biashara) *' : 'Hotspot Owner Account *'}
                  </label>
                  <select
                    required
                    value={userForm.parent_owner_id ? String(userForm.parent_owner_id) : ''}
                    onChange={(e) => {
                      const pid = e.target.value ? Number(e.target.value) : undefined;
                      const pOwner = allHotspotOwners.find((o) => o.id === pid);
                      setUserForm({
                        ...userForm,
                        parent_owner_id: pid,
                        business_name: pOwner?.business_name || '',
                        assigned_router_ids: pOwner?.assigned_router_ids || [],
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold bg-white text-slate-800"
                  >
                    <option value="">{lang === 'sw' ? '-- Chagua Mmiliki wa Hotspot --' : '-- Select Hotspot Owner --'}</option>
                    {allHotspotOwners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.business_name} ({owner.name} - {owner.phone})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {lang === 'sw'
                      ? 'Mfanyakazi huyu ataunganishwa na biashara hii pekee, ataona vocha na router zake tu.'
                      : 'This staff user will be strictly linked to this owner and can only access their vouchers.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      {lang === 'sw' ? 'Biashara ya Hotspot' : 'Hotspot Business'}
                    </div>
                    <div className="text-xs font-black text-indigo-900">
                      {currentUser?.business_name || currentUser?.name}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-200 text-indigo-800">
                    {lang === 'sw' ? 'Ofisi Yako' : 'Your Team'}
                  </span>
                </div>
              )}

              {/* Username, Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Username (Hiari)' : 'Username (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="mfano: cashier1"
                    className="w-full p-2.5 font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Nambari ya Simu *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="0754123456"
                    className="w-full p-2.5 font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Barua Pepe (Email)' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Password & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Nenosiri (Password) *' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="123456"
                      className="w-full p-2.5 pr-10 font-mono rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Jukumu Kuu (Role)' : 'Primary Role'}
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    {isVendor && <option value="VENDOR_ADMIN">Master Admin (HQ)</option>}
                    {isVendor && <option value="HOTSPOT_OWNER">Mmiliki wa Hotspot (Tenant)</option>}
                    <option value="MANAGER">Meneja wa Biashara (Manager)</option>
                    <option value="CASHIER">Muuza Vocha (Cashier / POS)</option>
                    <option value="TECHNICIAN">Fundi Mtandao (Technician)</option>
                    <option value="OPERATOR">Mhudumu wa Hotspot (Operator)</option>
                    <option value="VIEWER">Mwangalizi (Auditor / Read-Only)</option>
                  </select>
                </div>
              </div>

              {/* Status & Assigned Routers */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="font-bold text-slate-700 block">
                  {lang === 'sw' ? 'Vifaa & Routers Anazohudumia:' : 'Assigned Routers & Access Points:'}
                </label>
                {routers.length === 0 ? (
                  <p className="text-[11px] text-slate-400">Hakuna router zilizosajiliwa.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {routers.map((r) => {
                      const isAssigned = userForm.assigned_router_ids.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-slate-800 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setUserForm({
                                  ...userForm,
                                  assigned_router_ids: [...userForm.assigned_router_ids, r.id],
                                });
                              } else {
                                setUserForm({
                                  ...userForm,
                                  assigned_router_ids: userForm.assigned_router_ids.filter((id) => id !== r.id),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600"
                          />
                          <span className="truncate font-semibold">{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit Buttons with Dynamic Saved / Updated State */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
                >
                  {lang === 'sw' ? 'Ghairi' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition transform hover:-translate-y-0.5 shadow-lg ${
                    saveStatus === 'saved' || saveStatus === 'updated'
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
                  }`}
                >
                  {saveStatus === 'saving' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : saveStatus === 'saved' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : saveStatus === 'updated' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  <span>
                    {saveStatus === 'saving'
                      ? (lang === 'sw' ? 'Inahifadhi...' : 'Saving...')
                      : saveStatus === 'saved'
                      ? (lang === 'sw' ? '✓ Saved! (Imehifadhiwa)' : '✓ Saved!')
                      : saveStatus === 'updated'
                      ? (lang === 'sw' ? '✓ Updated! (Imesasishwa)' : '✓ Updated!')
                      : editingUser
                      ? (lang === 'sw' ? 'Sasisha Mtumiaji (Update User)' : 'Update User')
                      : (lang === 'sw' ? 'Hifadhi Mtumiaji (Save User)' : 'Save User')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
