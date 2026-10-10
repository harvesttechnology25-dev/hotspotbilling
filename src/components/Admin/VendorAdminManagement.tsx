import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Users,
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
  RotateCcw,
  Globe,
  Settings,
} from 'lucide-react';
import { HotspotOwner, RouterItem, UserPrivileges, UserRole } from '../../types/index.ts';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

interface VendorAdminManagementProps {
  currentUser?: HotspotOwner | null;
  lang?: 'sw' | 'en';
  onOpenAccountModal?: () => void;
  onOwnersUpdated?: () => void;
}

const ROLE_DEFINITIONS: Record<
  UserRole,
  { labelSw: string; labelEn: string; descSw: string; descEn: string; color: string; bg: string; border: string }
> = {
  VENDOR_ADMIN: {
    labelSw: 'Master Admin / Co-Admin (HQ)',
    labelEn: 'Master Admin / Co-Admin (HQ)',
    descSw: 'Msimamizi mkuu mwenye uwezo wa kusimamia mfumo mzima wa nchi na wamiliki wote.',
    descEn: 'Full master root administrator with complete platform privileges.',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  MANAGER: {
    labelSw: 'Meneja wa HQ (Operations)',
    labelEn: 'HQ Operations Manager',
    descSw: 'Msimamizi wa shughuli za kila siku wa HQ anayeweza kuona ripoti, kutoa vocha na kusimamia wateja.',
    descEn: 'Operations supervisor with broad management and staff access.',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  TECHNICIAN: {
    labelSw: 'Fundi wa Mtandao (NOC / Tech)',
    labelEn: 'Network Engineer (NOC)',
    descSw: 'Mtaalamu wa routers, reboot, APs, mikataba na wateja waliopo hewani.',
    descEn: 'Field and network engineer managing routers, APs and connectivity.',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  CASHIER: {
    labelSw: 'Mhudumu wa Fedha / Vocha (Cashier)',
    labelEn: 'Voucher & Cashier Clerk',
    descSw: 'Mhudumu wa mauzo anayezalisha na kuchapisha kadi za vocha kwa wateja.',
    descEn: 'Frontline cashier focused on voucher generation and sales printing.',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  OPERATOR: {
    labelSw: 'Mhudumu wa Hotspot (Operator)',
    labelEn: 'Hotspot Operator',
    descSw: 'Mhudumu anayesaidia wateja kuunganishwa na kusimamia vocha za kila siku.',
    descEn: 'Daily operator handling voucher distribution and live client assistance.',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  HOTSPOT_OWNER: {
    labelSw: 'Mmiliki wa Hotspot (Tenant)',
    labelEn: 'Hotspot Owner (Tenant)',
    descSw: 'Mmiliki wa biashara ya hotspot anayesimamia vifaa vyake.',
    descEn: 'Business tenant owner controlling their routers and packages.',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
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

const PRIVILEGE_CATEGORIES: {
  id: string;
  titleSw: string;
  titleEn: string;
  items: {
    key: keyof UserPrivileges;
    labelSw: string;
    labelEn: string;
    descSw: string;
    descEn: string;
    icon: any;
  }[];
}[] = [
  {
    id: 'fleet',
    titleSw: 'Mtandao & Vifaa (Routers & Fleet)',
    titleEn: 'Network & Routers (Fleet)',
    items: [
      {
        key: 'can_manage_routers',
        labelSw: 'Kusimamia Routers & APs',
        labelEn: 'Manage Routers & APs',
        descSw: 'Kuongeza, kubadilisha IP/RADIUS na kusanidi vifaa vya mtandao.',
        descEn: 'Add, edit and configure MikroTik, Ruijie, Omada & Cudy devices.',
        icon: Server,
      },
      {
        key: 'can_reboot_routers',
        labelSw: 'Kuzima/Kuwasha Router (Reboot)',
        labelEn: 'Remote Device Reboot',
        descSw: 'Kutuma amri ya ku-reboot router kupitia API au Cloud VPN.',
        descEn: 'Send remote reboot commands to connected routers via VPN/API.',
        icon: Power,
      },
    ],
  },
  {
    id: 'vouchers',
    titleSw: 'Vocha & Vifurushi (Vouchers & Plans)',
    titleEn: 'Vouchers & Rate Plans',
    items: [
      {
        key: 'can_manage_plans',
        labelSw: 'Kupanga Vifurushi & Bei',
        labelEn: 'Manage Rate Plans & Pricing',
        descSw: 'Kubuni vifurushi vipya vya muda/data na kuweka bei za mauzo.',
        descEn: 'Create and update internet packages, bandwidth speeds and tariffs.',
        icon: Package,
      },
      {
        key: 'can_generate_vouchers',
        labelSw: 'Kutengeneza Vocha Mpya (Batch Generator)',
        labelEn: 'Generate New Voucher Batches',
        descSw: 'Kuzalisha msimbo wa vocha moja moja au kwa makundi (batch).',
        descEn: 'Generate single and batch voucher codes for hotspot users.',
        icon: Tag,
      },
      {
        key: 'can_view_vouchers',
        labelSw: 'Kuangalia Orodha ya Vocha (Inventory)',
        labelEn: 'View Voucher Inventory',
        descSw: 'Kuangalia vocha zilizouzwa, zilizopo na zilizokwisha muda.',
        descEn: 'View available, activated and expired voucher lists.',
        icon: Tag,
      },
      {
        key: 'can_print_vouchers',
        labelSw: 'Kuchapisha Kadi za Vocha (A4 & POS Thermal)',
        labelEn: 'Print Physical Voucher Cards',
        descSw: 'Kutuma vocha kwenye printer ya POS (58mm/80mm) au karatasi ya A4.',
        descEn: 'Print ready-to-sell thermal vouchers or card sheet layouts.',
        icon: Sparkles,
      },
    ],
  },
  {
    id: 'users',
    titleSw: 'Watumiaji & Tenants (Users & Clients)',
    titleEn: 'Users & Hotspot Tenants',
    items: [
      {
        key: 'can_manage_tenants',
        labelSw: 'Kusimamia Wamiliki wa Hotspot (Tenants)',
        labelEn: 'Manage Hotspot Owners (Tenants)',
        descSw: 'Kusajili, kuhariri na kufungulia akaunti wamiliki wa biashara za hotspot.',
        descEn: 'Register, edit and manage tenant hotspot owner accounts.',
        icon: Building,
      },
      {
        key: 'can_view_active_users',
        labelSw: 'Kuona Wateja Waliopo Online (Live Sessions)',
        labelEn: 'View Live Hotspot Users',
        descSw: 'Kuangalia wateja waliounganishwa sasa, MAC, IP na matumizi ya data.',
        descEn: 'Inspect real-time connected clients, uptime and bandwidth consumption.',
        icon: Wifi,
      },
      {
        key: 'can_kick_users',
        labelSw: 'Kukata / Kutoa Mteja (Kick/Disconnect)',
        labelEn: 'Disconnect / Kick Users',
        descSw: 'Kukata muunganisho wa mteja aliye mtandaoni kupitia RADIUS CoA au MikroTik.',
        descEn: 'Force disconnect abusive or expired users via RADIUS CoA / API.',
        icon: Power,
      },
      {
        key: 'can_manage_subusers',
        labelSw: 'Kusimamia Wasimamizi & Ruhusa (Sub-Admins)',
        labelEn: 'Manage Sub-Admins & Staff Privileges',
        descSw: 'Kuongeza wasimamizi wapya na kutoa au kuondoa ruhusa zao za mfumo.',
        descEn: 'Create admins, cashiers, technicians and assign custom permissions.',
        icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'finance_system',
    titleSw: 'Fedha & Mfumo Mkuu (Finance & System HQ)',
    titleEn: 'Finance, Gateways & System HQ',
    items: [
      {
        key: 'can_view_reports',
        labelSw: 'Kuangalia Miamala & Ripoti za Fedha (Ledger)',
        labelEn: 'View Transactions & Financials',
        descSw: 'Kuona taarifa za mauzo ya M-Pesa, Tigo, Airtel, Halopesa na fedha taslimu.',
        descEn: 'Review mobile money transaction records, daily revenue and audits.',
        icon: Receipt,
      },
      {
        key: 'can_export_reports',
        labelSw: 'Kupakua Ripoti (Excel / CSV Export)',
        labelEn: 'Export Financial Reports',
        descSw: 'Kupakua ripoti za hesabu za biashara kwa uhasibu na ukaguzi.',
        descEn: 'Export revenue logs and audit trails to spreadsheet format.',
        icon: Receipt,
      },
      {
        key: 'can_customize_portal',
        labelSw: 'Kubinafsisha Captive Portal (Theme & Branding)',
        labelEn: 'Customize Captive Portal',
        descSw: 'Kubadilisha rangi za kadi za vifurushi, mandhari na nembo ya biashara.',
        descEn: 'Modify portal theme colors, card styles, brand logos and header text.',
        icon: Palette,
      },
      {
        key: 'can_manage_payments',
        labelSw: 'Kusanidi Mageti ya Malipo (APIs & Merchant Gateways)',
        labelEn: 'Configure Payment Gateways',
        descSw: 'Kuweka namba za simu za kupokea pesa au akaunti ya PalmPay/AzamPay.',
        descEn: 'Setup merchant credentials, API tokens and payout accounts.',
        icon: Sliders,
      },
      {
        key: 'can_manage_devops',
        labelSw: 'Zana za Cloud VPS & FreeRADIUS DevOps',
        labelEn: 'Cloud VPS & DevOps Tools',
        descSw: 'Kuingia kwenye FreeRADIUS, vyeti vya SSL na afya ya seva ya wingu.',
        descEn: 'Server configurations, FreeRADIUS setup, and system maintenance.',
        icon: Terminal,
      },
      {
        key: 'can_reset_system',
        labelSw: 'Reset Mfumo Wote (System Factory Reset)',
        labelEn: 'Factory Reset Platform',
        descSw: 'Haki ya kufuta data za majaribio na kuandaa mfumo kwa uzinduzi live.',
        descEn: 'Purge test logs and prepare clean system for live deployment.',
        icon: RotateCcw,
      },
    ],
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
    id: 'super_admin',
    nameSw: '👑 Super Admin wa HQ (Full Access)',
    nameEn: '👑 Super Admin HQ (Full Access)',
    role: 'VENDOR_ADMIN',
    icon: ShieldCheck,
    privileges: {
      can_manage_routers: true,
      can_reboot_routers: true,
      can_manage_plans: true,
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_manage_tenants: true,
      can_view_active_users: true,
      can_kick_users: true,
      can_manage_subusers: true,
      can_view_reports: true,
      can_export_reports: true,
      can_customize_portal: true,
      can_manage_payments: true,
      can_manage_gateways: true,
      can_manage_devops: true,
      can_reset_system: true,
    },
  },
  {
    id: 'noc_engineer',
    nameSw: '🌐 Network Ops (NOC & Routers)',
    nameEn: '🌐 NOC & Network Operations',
    role: 'TECHNICIAN',
    icon: Server,
    privileges: {
      can_manage_routers: true,
      can_reboot_routers: true,
      can_view_active_users: true,
      can_kick_users: true,
      can_manage_devops: true,
      can_view_vouchers: true,
    },
  },
  {
    id: 'billing_officer',
    nameSw: '💳 Finance & Billing (Ripoti & Gateways)',
    nameEn: '💳 Finance & Billing Officer',
    role: 'MANAGER',
    icon: Receipt,
    privileges: {
      can_view_reports: true,
      can_export_reports: true,
      can_manage_payments: true,
      can_view_vouchers: true,
      can_view_active_users: true,
    },
  },
  {
    id: 'voucher_desk',
    nameSw: '🎫 Voucher & Support Operator',
    nameEn: '🎫 Voucher & Support Operator',
    role: 'OPERATOR',
    icon: Tag,
    privileges: {
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_view_active_users: true,
      can_kick_users: true,
    },
  },
  {
    id: 'read_only_auditor',
    nameSw: '📊 Auditor (Mwangalizi / Read-Only)',
    nameEn: '📊 Auditor (Read-Only)',
    role: 'VIEWER',
    icon: Shield,
    privileges: {
      can_view_reports: true,
      can_export_reports: true,
      can_view_vouchers: true,
      can_view_active_users: true,
    },
  },
];

export const VendorAdminManagement: React.FC<VendorAdminManagementProps> = ({
  currentUser,
  lang = 'sw',
  onOpenAccountModal,
  onOwnersUpdated,
}) => {
  const [admins, setAdmins] = useState<HotspotOwner[]>([]);
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'hq_only' | 'all'>('hq_only');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<HotspotOwner | null>(null);

  // Privileges modal
  const [privilegeModalAdmin, setPrivilegeModalAdmin] = useState<HotspotOwner | null>(null);
  const [tempPrivileges, setTempPrivileges] = useState<UserPrivileges>({});
  const [tempRole, setTempRole] = useState<UserRole>('MANAGER');
  const [tempStaffTitle, setTempStaffTitle] = useState<string>('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<HotspotOwner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Newly created credentials
  const [newlyCreatedCreds, setNewlyCreatedCreds] = useState<{
    name: string;
    username?: string;
    phone: string;
    email: string;
    password: string;
    role: string;
    title?: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    business_name: 'TZ-WiFi HQ Master',
    staff_title: '',
    phone: '',
    email: '',
    password: 'admin123',
    role: 'MANAGER' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'SUSPENDED',
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Toasts
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; title: string; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', title: string, text: string) => {
    setToastMessage({ type, title, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('tzwifi_token') || '';
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-owner-id': String(currentUser?.id || 1),
      };

      const [ownersRes, routersRes] = await Promise.all([
        fetch('/api/v1/owners?includeSubUsers=true&all=true', { headers }),
        fetch('/api/v1/routers', { headers }),
      ]);

      if (ownersRes.ok) {
        const data = await ownersRes.json();
        setAdmins(Array.isArray(data) ? data : []);
      }
      if (routersRes.ok) {
        const rData = await routersRes.json();
        setRouters(Array.isArray(rData) ? rData : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [currentUser?.id]);

  // Filter admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      // Exclude regular Hotspot Owners (tenants) from staff/admin list unless viewing all
      if (scopeFilter === 'hq_only') {
        // HQ admins are: role === VENDOR_ADMIN, or parent_owner_id is 1 or null/undefined, or staff with HQ roles
        const isHq =
          a.role === 'VENDOR_ADMIN' ||
          Number(a.parent_owner_id) === 1 ||
          (!a.parent_owner_id && a.role !== 'HOTSPOT_OWNER');
        if (!isHq) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL' && a.role !== roleFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

      // Search
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      return (
        a.name?.toLowerCase().includes(q) ||
        a.username?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q) ||
        a.staff_title?.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q)
      );
    });
  }, [admins, scopeFilter, roleFilter, statusFilter, searchQuery]);

  // Paginated Admins
  const paginatedAdmins = useMemo(() => {
    if (pageSize === 'ALL') return filteredAdmins;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return filteredAdmins.slice(start, start + size);
  }, [filteredAdmins, currentPage, pageSize]);

  // Metrics
  const stats = useMemo(() => {
    const total = admins.length;
    const hqAdmins = admins.filter(
      (a) => a.role === 'VENDOR_ADMIN' || Number(a.parent_owner_id) === 1
    ).length;
    const activeCount = admins.filter((a) => a.status === 'ACTIVE').length;
    const fullAccessCount = admins.filter(
      (a) => a.role === 'VENDOR_ADMIN' || a.privileges?.can_manage_devops
    ).length;
    return { total, hqAdmins, activeCount, fullAccessCount };
  }, [admins]);

  const handleOpenAdd = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      username: '',
      business_name: 'TZ-WiFi HQ Master',
      staff_title: '',
      phone: '',
      email: '',
      password: 'admin123',
      role: 'MANAGER',
      status: 'ACTIVE',
    });
    setTempPrivileges({
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
    });
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (admin: HotspotOwner) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      username: admin.username || '',
      business_name: admin.business_name || 'TZ-WiFi HQ Master',
      staff_title: admin.staff_title || '',
      phone: admin.phone,
      email: admin.email || '',
      password: admin.password || 'admin123',
      role: admin.role,
      status: admin.status,
    });
    setTempPrivileges(admin.privileges || {});
    setShowFormPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenPrivilegeModal = (admin: HotspotOwner) => {
    setPrivilegeModalAdmin(admin);
    setTempPrivileges(admin.privileges || {});
    setTempRole(admin.role);
    setTempStaffTitle(admin.staff_title || '');
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setTempPrivileges({ ...preset.privileges });
    setFormData((prev) => ({
      ...prev,
      role: preset.role,
      staff_title: prev.staff_title || preset.nameSw.split('(')[0].replace(/[^a-zA-Z\s]/g, '').trim(),
    }));
    setTempRole(preset.role);
    showToast(
      'success',
      lang === 'sw' ? 'Preset Imetumika' : 'Preset Applied',
      lang === 'sw'
        ? `Ruhusa za "${preset.nameSw}" zimewekwa kwenye fomu.`
        : `${preset.nameEn} permissions populated.`
    );
  };

  const handleTogglePrivilege = (key: keyof UserPrivileges) => {
    setTempPrivileges((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 9; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
    setShowFormPassword(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('error', 'Kosa', 'Jina kamili na nambari ya simu vinahitajika!');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        username: formData.username.trim() || undefined,
        business_name: formData.business_name.trim(),
        staff_title: formData.staff_title.trim() || undefined,
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        password: formData.password.trim(),
        role: formData.role,
        status: formData.status,
        privileges: tempPrivileges,
        parent_owner_id: 1, // HQ Master parent
        is_sub_user: formData.role !== 'VENDOR_ADMIN',
      };

      const url = editingAdmin ? `/api/v1/owners/${editingAdmin.id}` : '/api/v1/owners';
      const method = editingAdmin ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tzwifi_token') || ''}`,
          'x-owner-id': String(currentUser?.id || 1),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindwa kuhifadhi taarifa za admin.');
      }

      showToast(
        'success',
        lang === 'sw' ? 'Imekamilika!' : 'Saved!',
        editingAdmin
          ? `Taarifa na ruhusa za ${formData.name} zimesasishwa.`
          : `Admin mpya ${formData.name} ametengenezwa kikamilifu.`
      );

      if (!editingAdmin) {
        setNewlyCreatedCreds({
          name: formData.name,
          username: formData.username || undefined,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          title: formData.staff_title,
        });
      }

      setIsModalOpen(false);
      await fetchAdmins();
      onOwnersUpdated?.();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Hitilafu', err.message || 'Hitilafu ya mtandao.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivilegesOnly = async () => {
    if (!privilegeModalAdmin) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/owners/${privilegeModalAdmin.id}/privileges`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tzwifi_token') || ''}`,
          'x-owner-id': String(currentUser?.id || 1),
        },
        body: JSON.stringify({
          privileges: tempPrivileges,
          role: tempRole,
          staff_title: tempStaffTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindwa kusasisha ruhusa.');

      showToast(
        'success',
        lang === 'sw' ? 'Ruhusa Zimesasishwa' : 'Privileges Updated',
        `Ruhusa (Privileges) za ${privilegeModalAdmin.name} zimehifadhiwa kikamilifu!`
      );
      setPrivilegeModalAdmin(null);
      await fetchAdmins();
      onOwnersUpdated?.();
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Hitilafu', err.message || 'Hitilafu ya mtandao.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (admin: HotspotOwner) => {
    if (admin.id === 1) {
      showToast('error', 'Haiwezekani', 'Akaunti kuu ya Root Master ID #1 haiwezi kusimamishwa.');
      return;
    }
    const newStatus = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/v1/owners/${admin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tzwifi_token') || ''}`,
          'x-owner-id': String(currentUser?.id || 1),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(
          'success',
          'Hali Imebadilishwa',
          `${admin.name} sasa ni: ${newStatus === 'ACTIVE' ? 'Hai (ACTIVE)' : 'Imesimamishwa (SUSPENDED)'}`
        );
        await fetchAdmins();
        onOwnersUpdated?.();
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Hitilafu', err.message || 'Imeshindwa kubadili hali.');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === 1) {
      showToast('error', 'Haiwezekani', 'Akaunti kuu ya Root Master ID #1 haiwezi kufutwa.');
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/owners/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tzwifi_token') || ''}`,
          'x-owner-id': String(currentUser?.id || 1),
        },
      });
      if (res.ok) {
        showToast(
          'success',
          'Imefutwa',
          `Akaunti ya ${deleteTarget.name} imefutwa kikamilifu kwenye mfumo!`
        );
        setDeleteTarget(null);
        await fetchAdmins();
        onOwnersUpdated?.();
      } else {
        const d = await res.json();
        throw new Error(d.error || 'Imeshindwa kufuta akaunti.');
      }
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Hitilafu', err.message || 'Hitilafu ya mtandao.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center gap-3 transition-all animate-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-800'
              : 'bg-rose-950 text-rose-100 border-rose-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="font-black text-white">{toastMessage.title}</div>
            <div className="text-[11px] opacity-90">{toastMessage.text}</div>
          </div>
        </div>
      )}

      {/* Hero Header & Master Vendor Profile Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 top-0 w-80 h-32 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>VENDOR HQ MASTER CONTROL & RBAC PRIVILEGES</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {lang === 'sw'
                ? 'Wasimamizi wa Mfumo & Privileges (Admin Management)'
                : 'System Admins & Staff Privileges'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {lang === 'sw'
                ? 'Tengeneza wasimamizi wakuu wa HQ (co-admins), mameneja wa kituo, mafundi na wauza vocha. Wape ruhusa (privileges) maalum za kudhibiti routers, vocha, wateja na fedha.'
                : 'Create HQ co-administrators, supervisors, engineers, and cashiers. Grant granular role-based permissions across network fleet, vouchers, and financials.'}
            </p>
          </div>

          {/* Master Vendor Profile Card with Edit Button */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-lg backdrop-blur-xs min-w-[300px]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
                HQ
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">
                    {currentUser?.name || 'Kelvin Mrema (Vendor HQ)'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    @{currentUser?.username || 'admin'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {currentUser?.email || 'vendor@tzwifi.co.tz'} • {currentUser?.phone || '0754111222'}
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ruhusa Zote za Mfumo (Full Root Master)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAccountModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Hariri Akaunti Yangu' : 'Edit My Profile'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>{lang === 'sw' ? 'Wasimamizi Wote' : 'Total Staff'}</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {lang === 'sw' ? 'Wafanyakazi waliosajiliwa' : 'Registered staff accounts'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>{lang === 'sw' ? 'Wasimamizi wa HQ' : 'HQ Admins'}</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-mono">{stats.hqAdmins}</div>
          <div className="text-[11px] text-purple-600 font-semibold mt-0.5">
            {lang === 'sw' ? 'Master & Co-Admins wa HQ' : 'Root & Co-Admins'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>{lang === 'sw' ? 'Akaunti Zinazofanya Kazi' : 'Active Accounts'}</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">{stats.activeCount}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {lang === 'sw' ? 'Zinazoweza kuingia mtandaoni' : 'Enabled & operational'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>{lang === 'sw' ? 'Wenye Ruhusa Kamili' : 'Full Power Accounts'}</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{stats.fullAccessCount}</div>
          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
            {lang === 'sw' ? 'DevOps & Server Access' : 'DevOps & Root Access'}
          </div>
        </div>
      </div>

      {/* Newly Created Credentials Notification Box */}
      {newlyCreatedCreds && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-extrabold text-indigo-950">
                  {lang === 'sw' ? 'Akaunti ya Admin Imetengenezwa Kikamilifu!' : 'Admin Account Created!'}
                </h4>
              </div>
              <p className="text-xs text-indigo-800">
                {lang === 'sw'
                  ? 'Nakili taarifa hizi za kuingilia na umtumie msimamizi huyu kupitia WhatsApp au SMS:'
                  : 'Copy these login credentials and forward them to the staff member:'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewlyCreatedCreds(null)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-bold underline"
            >
              {lang === 'sw' ? 'Funga (Dismiss)' : 'Dismiss'}
            </button>
          </div>

          <div className="mt-3 p-3 bg-white rounded-xl border border-indigo-200 font-mono text-xs text-slate-800 space-y-1">
            <div>
              <strong className="text-slate-500 font-sans">Jina:</strong> {newlyCreatedCreds.name}
            </div>
            {newlyCreatedCreds.username && (
              <div>
                <strong className="text-slate-500 font-sans">Username:</strong>{' '}
                <span className="font-bold text-indigo-700">@{newlyCreatedCreds.username}</span>
              </div>
            )}
            <div>
              <strong className="text-slate-500 font-sans">Simu / Email:</strong> {newlyCreatedCreds.phone} • {newlyCreatedCreds.email || '-'}
            </div>
            <div>
              <strong className="text-slate-500 font-sans">Nenosiri (Password):</strong>{' '}
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                {newlyCreatedCreds.password}
              </span>
            </div>
            <div>
              <strong className="text-slate-500 font-sans">Wajibu (Role):</strong> {newlyCreatedCreds.role} ({newlyCreatedCreds.title || 'Staff'})
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-end">
            <button
              type="button"
              onClick={() =>
                handleCopyText(
                  `*TZ-WiFi Hotspot Admin Login*\nJina: ${newlyCreatedCreds.name}\nUsername: ${newlyCreatedCreds.username || newlyCreatedCreds.phone}\nNenosiri: ${newlyCreatedCreds.password}\nWajibu: ${newlyCreatedCreds.role}\nLink: ${window.location.origin}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCreds ? (lang === 'sw' ? 'Zimenakiliwa!' : 'Copied!') : (lang === 'sw' ? '📋 Nakili Taarifa Hizi' : 'Copy Credentials')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main List & Controls Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Top Filter and Action Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Scope tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setScopeFilter('hq_only')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  scopeFilter === 'hq_only'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Wasimamizi wa HQ Pekee</span>
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Wafanyakazi Wote wa Mtandao ({admins.length})</span>
              </button>
            </div>

            {/* Create New Admin Button */}
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" />
              <span>{lang === 'sw' ? '➕ Tengeneza Admin Mpya' : '➕ Create New Admin'}</span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={lang === 'sw' ? 'Tafuta kwa jina, username, simu...' : 'Search admins...'}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">Wajibu Wote (All Roles)</option>
                <option value="VENDOR_ADMIN">Master Admin (HQ)</option>
                <option value="MANAGER">Manager (HQ)</option>
                <option value="TECHNICIAN">Technician (NOC)</option>
                <option value="CASHIER">Cashier (POS)</option>
                <option value="OPERATOR">Operator</option>
                <option value="VIEWER">Auditor (Viewer)</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">Hali Zote (All Status)</option>
                <option value="ACTIVE">ACTIVE (Hai)</option>
                <option value="SUSPENDED">SUSPENDED (Imesimamishwa)</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Inaonyesha <strong>{filteredAdmins.length}</strong> kati ya <strong>{admins.length}</strong>
            </span>
          </div>
        </div>

        {/* Admins Table (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3">Msimamizi / Admin</th>
                <th className="px-4 py-3">Username & Mawasiliano</th>
                <th className="px-4 py-3">Wajibu & Cheo</th>
                <th className="px-4 py-3">Ruhusa (Privileges)</th>
                <th className="px-4 py-3">Hali (Status)</th>
                <th className="px-4 py-3 text-right">Vitendo (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAdmins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 bg-slate-50/50">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-xs text-slate-600">Hakuna wasimamizi waliopatikana kwa vigezo hivi.</p>
                    <button
                      type="button"
                      onClick={handleOpenAdd}
                      className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700"
                    >
                      ➕ Tengeneza Admin Mpya Sasa
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((admin) => {
                  const roleDef = ROLE_DEFINITIONS[admin.role] || ROLE_DEFINITIONS.MANAGER;
                  const privCount = Object.values(admin.privileges || {}).filter(Boolean).length;
                  const isRootMaster = admin.id === 1;

                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                              isRootMaster
                                ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white ring-2 ring-indigo-400/30'
                                : admin.role === 'VENDOR_ADMIN'
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{admin.name}</span>
                              {isRootMaster && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-amber-100 text-amber-800 border border-amber-300">
                                  MASTER #1
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {admin.staff_title || (isRootMaster ? 'Vendor Root Admin' : 'Staff Member')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username & Contacts */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          {admin.username ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              @{admin.username}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono italic">Bila username</span>
                          )}
                          <div className="text-[11px] font-mono text-slate-600">{admin.phone}</div>
                          {admin.email && <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{admin.email}</div>}
                        </div>
                      </td>

                      {/* Role & Cheo */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleDef.bg} ${roleDef.color} ${roleDef.border}`}
                          >
                            <Shield className="w-3 h-3" />
                            <span>{roleDef.labelSw}</span>
                          </span>
                        </div>
                      </td>

                      {/* Privileges Badge */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPrivilegeModal(admin)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] font-bold transition cursor-pointer"
                          title="Bonyeza kurekebisha ruhusa (privileges) za mtumiaji huyu"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{isRootMaster ? 'Ruhusa Zote' : `${privCount} Ruhusa`}</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(admin)}
                          disabled={isRootMaster}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer disabled:cursor-default ${
                            admin.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              admin.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          <span>{admin.status}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {/* Manage Privileges */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrivilegeModal(admin)}
                            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-indigo-600 transition cursor-pointer"
                            title="Ruhusa & Privileges"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details & Password */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(admin)}
                            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                            title="Hariri Akaunti & Nenosiri"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account (protected for Root Master #1) */}
                          {!isRootMaster && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(admin)}
                              className="p-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                              title="Futa Admin Huyu"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Mobile Cards View (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paginatedAdmins.map((admin) => {
            const roleDef = ROLE_DEFINITIONS[admin.role] || ROLE_DEFINITIONS.MANAGER;
            const privCount = Object.values(admin.privileges || {}).filter(Boolean).length;
            const isRootMaster = admin.id === 1;

            return (
              <div key={admin.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        isRootMaster ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-white'
                      }`}
                    >
                      {admin.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span>{admin.name}</span>
                        {isRootMaster && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-black bg-amber-100 text-amber-800">
                            MASTER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {admin.username ? `@${admin.username} • ` : ''}{admin.phone}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleDef.bg} ${roleDef.color} ${roleDef.border}`}
                  >
                    {roleDef.labelSw.split('(')[0]}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenPrivilegeModal(admin)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{isRootMaster ? 'Ruhusa Zote' : `${privCount} Ruhusa`}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(admin)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    >
                      Hariri
                    </button>
                    {!isRootMaster && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(admin)}
                        className="p-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredAdmins.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="wasimamizi"
        />
      </div>

      {/* MODAL 1: Create / Edit Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <Power className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span>VENDOR HQ ADMIN CREATION ENGINE</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black">
                {editingAdmin ? `Hariri Admin: ${editingAdmin.name}` : 'Tengeneza Admin / Mtendaji Mpya wa HQ'}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'sw'
                  ? 'Weka maelezo ya akaunti, jina la mtumiaji (username), nenosiri na uchague ruhusa maalum.'
                  : 'Specify credentials, login username, password and allocate role-based privileges.'}
              </p>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveAdmin} className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1">
              {/* Presets Quick Apply Bar */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chagua Preset ya Haraka (1-Click Role Setup):</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="p-2 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/50 text-left transition cursor-pointer group"
                    >
                      <div className="text-[11px] font-black text-slate-800 group-hover:text-indigo-700 truncate">
                        {preset.nameSw.split('(')[0]}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">Preset</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jina la Mtumiaji (Login Username)
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="mfano: hq_supervisor, noc_kelvin"
                    className="w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Hii inatumika kuingilia mfumo badala ya simu/email.
                  </span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jina Kamili <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Musa Juma"
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Staff Title / Cheo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cheo / Designation
                  </label>
                  <input
                    type="text"
                    value={formData.staff_title}
                    onChange={(e) => setFormData({ ...formData, staff_title: e.target.value })}
                    placeholder="HQ Operations Manager"
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nambari ya Simu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0754123456"
                    className="w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Barua Pepe (Email)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@tzwifi.co.tz"
                    className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Wajibu (System Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full text-xs font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
                  >
                    <option value="VENDOR_ADMIN">Master Admin / Co-Admin (HQ)</option>
                    <option value="MANAGER">Manager wa HQ (Operations)</option>
                    <option value="TECHNICIAN">Network Tech (NOC / Routers)</option>
                    <option value="CASHIER">Cashier (Muuza Vocha / POS)</option>
                    <option value="OPERATOR">Operator wa Huduma</option>
                    <option value="VIEWER">Auditor (Mwangalizi / Read-Only)</option>
                  </select>
                </div>

                {/* Password with generator */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Nenosiri la Kuingilia (Login Password) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Zalisha Nenosiri Salama</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="admin123"
                      className="w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPassword(!showFormPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Granular Privileges Allocation Section */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-extrabold text-slate-900">
                      Ruhusa Maalum za Mfumo (Granular RBAC Privileges)
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-indigo-600 font-bold">
                    {Object.values(tempPrivileges).filter(Boolean).length} ruhusa zimewashwa
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Weka tiki kwenye huduma unazomruhusu msimamizi huyu kuziona au kuzibadilisha:
                </p>

                <div className="space-y-4">
                  {PRIVILEGE_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2.5">
                        {cat.titleSw}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {cat.items.map((item) => {
                          const isChecked = Boolean(tempPrivileges[item.key]);
                          const Icon = item.icon;

                          return (
                            <label
                              key={item.key}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-white border-indigo-300 ring-1 ring-indigo-500/20 shadow-2xs'
                                  : 'bg-white/60 border-slate-200 hover:bg-white'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePrivilege(item.key)}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <span className="truncate">{item.labelSw}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                                  {item.descSw}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Inahifadhi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingAdmin ? 'Sasisha Taarifa za Admin' : 'Kamilisha na Hifadhi Admin'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Dedicated Privilege Matrix Modal */}
      {privilegeModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base sm:text-lg font-black">
                    Dhibiti Ruhusa (Privileges): {privilegeModalAdmin.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Rekebisha haki za msimamizi huyu moja kwa moja bila kubadilisha mawasiliano yake.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrivilegeModalAdmin(null)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6 space-y-4 flex-1">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-[11px] font-bold text-slate-500 mr-1">Weka Preset:</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setTempPrivileges({ ...p.privileges });
                      setTempRole(p.role);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 text-[11px] font-bold text-slate-700 transition"
                  >
                    {p.nameSw.split('(')[0]}
                  </button>
                ))}
              </div>

              {/* Checkbox matrix */}
              <div className="space-y-4">
                {PRIVILEGE_CATEGORIES.map((cat) => (
                  <div key={cat.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="text-[11px] font-black uppercase text-slate-500 mb-2">
                      {cat.titleSw}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.items.map((item) => {
                        const isChecked = Boolean(tempPrivileges[item.key]);
                        const Icon = item.icon;
                        return (
                          <label
                            key={item.key}
                            className={`flex items-start gap-2.5 p-2 rounded-xl border transition cursor-pointer select-none ${
                              isChecked
                                ? 'bg-white border-indigo-300 ring-1 ring-indigo-500/20'
                                : 'bg-white/50 border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePrivilege(item.key)}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                <Icon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">{item.labelSw}</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrivilegeModalAdmin(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="button"
                  onClick={handleSavePrivilegesOnly}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Hifadhi Ruhusa Mpya</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: In-App Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Thibitisha Kufuta Admin: {deleteTarget.name}
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Una uhakika unataka kufuta akaunti ya admin huyu (<strong>{deleteTarget.name}</strong>,{' '}
              {deleteTarget.phone})? Hatoweza tena kuingia kwenye mfumo na ruhusa zote zitaondolewa mara moja.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={handleDeleteAdmin}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Futa Kabisa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
