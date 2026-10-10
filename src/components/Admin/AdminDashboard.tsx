import React, { useState, useEffect, useMemo } from 'react';
import { AdminOverview } from './AdminOverview.tsx';
import { ActiveHotspotUsers } from './ActiveHotspotUsers.tsx';
import { PlanManagement } from './PlanManagement.tsx';
import { TransactionLedger } from './TransactionLedger.tsx';
import { VoucherStation } from './VoucherStation.tsx';
import { RouterManagement } from './RouterManagement.tsx';
import { MySQLSchemaViewer } from './MySQLSchemaViewer.tsx';
import { OwnerManagement } from './OwnerManagement.tsx';
import { VpsDevopsManager } from './VpsDevopsManager.tsx';
import { OwnerMerchantSettings } from './OwnerMerchantSettings.tsx';
import { CaptivePortalCustomizer } from './CaptivePortalCustomizer.tsx';
import { EmailConfig } from './EmailConfig.tsx';
import { SystemResetManager } from './SystemResetManager.tsx';
import { SettingsModule, SettingsSubTab } from './SettingsModule.tsx';
import { UserManagement } from './UserManagement.tsx';
import { CompanyInfoSettings } from './CompanyInfoSettings.tsx';
import { VendorAdminManagement } from './VendorAdminManagement.tsx';
import { VendorAccountEditModal } from './VendorAccountEditModal.tsx';
import { AboutUsModal } from '../Modals/AboutUsModal.tsx';
import { ContactUsModal } from '../Modals/ContactUsModal.tsx';
import { SubscriptionGate } from '../Subscription/SubscriptionGate.tsx';
import {
  LayoutDashboard,
  Wifi,
  Package,
  Receipt,
  Tag,
  Server,
  Database,
  CreditCard,
  Mail,
  Menu,
  X,
  ChevronRight,
  Shield,
  ShieldCheck,
  Crown,
  Radio,
  Sliders,
  ChevronLeft,
  Activity,
  Layers,
  Users,
  UserPlus,
  ChevronDown,
  Building,
  Building2,
  Sparkles,
  LogOut,
  Settings,
  Terminal,
  Palette,
  Clock,
  Smartphone,
  RotateCcw,
  Flame,
  Info,
  MapPin,
  Check,
  Edit2,
  AlertCircle,
} from 'lucide-react';
import { HotspotOwner, RouterItem } from '../../types/index.ts';

export interface AdminDashboardProps {
  currentUser?: HotspotOwner;
  onLogout?: () => void;
  onSwitchUser?: (user: HotspotOwner) => void;
  onNavigatePortal?: () => void;
  lang?: 'sw' | 'en';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  onSwitchUser,
  onNavigatePortal,
  lang = 'en',
}) => {
  const [owners, setOwners] = useState<HotspotOwner[]>([]);
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [currentOwner, setCurrentOwner] = useState<HotspotOwner | null>(currentUser || null);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showPreviewAbout, setShowPreviewAbout] = useState(false);
  const [showPreviewContact, setShowPreviewContact] = useState(false);

  const [settingsSubTab, setSettingsSubTab] = useState<SettingsSubTab>('payment_gateway');
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'owners'
    | 'vendor_admins'
    | 'company_info'
    | 'user_management'
    | 'active_users'
    | 'plans'
    | 'transactions'
    | 'vouchers'
    | 'routers'
    | 'schema'
        | 'merchant_settings'
    | 'vps_devops'
    | 'portal_customizer'
    | 'email_config'
    | 'system_reset'
    | 'settings'
  >('active_users');

  const [isVendorAccountModalOpen, setIsVendorAccountModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch registered owners
  const fetchOwners = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = localStorage.getItem('tzwifi_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (currentUser?.id) headers['x-owner-id'] = String(currentUser.id);

      const res = await fetch(`/api/v1/owners?_t=${Date.now()}`, { cache: 'no-store', headers });
      if (res.ok) {
        const data = await res.json();
        setOwners(data);
        if (!currentOwner && data.length > 0) {
          if (currentUser) {
            const matched = data.find((o: HotspotOwner) => o.id === currentUser.id);
            setCurrentOwner(matched || currentUser);
          } else {
            const vendor = data.find((o: HotspotOwner) => o.role === 'VENDOR_ADMIN') || data[0];
            setCurrentOwner(vendor);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch owners:', err);
    }
  };

  const fetchRouters = async () => {
    try {
      const q = currentOwner && currentOwner.role === 'HOTSPOT_OWNER' ? `?ownerId=${currentOwner.id}` : '';
      const res = await fetch(`/api/v1/routers${q}`);
      if (res.ok) {
        const data = await res.json();
        setRouters(data);
      }
    } catch (err) {
      console.error('Failed to fetch routers:', err);
    }
  };

  useEffect(() => {
    fetchOwners();
    fetchRouters();
  }, [currentOwner?.id]);

  // Update currentOwner when currentUser prop changes
  useEffect(() => {
    if (currentUser) {
      setCurrentOwner(currentUser);
    }
  }, [currentUser]);

  const isMasterVendor = currentUser?.role === 'VENDOR_ADMIN';
  const isVendor = currentOwner?.role === 'VENDOR_ADMIN';
  const isStaff = Boolean(
    !isVendor &&
      (currentOwner?.is_sub_user ||
        currentOwner?.parent_owner_id != null ||
        (currentOwner?.role && !['VENDOR_ADMIN', 'HOTSPOT_OWNER'].includes(currentOwner.role)))
  );

  const parentOwner = useMemo(() => {
    if (isStaff && currentOwner?.parent_owner_id) {
      return owners.find((o) => Number(o.id) === Number(currentOwner.parent_owner_id));
    }
    return undefined;
  }, [isStaff, currentOwner?.parent_owner_id, owners]);

  // Active Site / Router Switcher state (Allows clients with multiple MikroTiks/sites to switch and manage each site)
  const [selectedSiteRouterId, setSelectedSiteRouterId] = useState<number | 'ALL'>(() => {
    try {
      const saved = localStorage.getItem('tzwifi_active_site_id');
      if (saved === 'ALL') return 'ALL';
      if (saved && !isNaN(Number(saved))) return Number(saved);
    } catch {}
    return 'ALL';
  });
  const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false);

  // Available routers for the current user
  const availableRouters = useMemo(() => {
    if (isVendor) return routers;
    if (isStaff && currentOwner?.parent_owner_id) {
      const pid = Number(currentOwner.parent_owner_id);
      return routers.filter(
        (r) => r.owner_id === pid || (parentOwner?.assigned_router_ids || []).includes(r.id)
      );
    }
    if (currentOwner) {
      const oid = Number(currentOwner.id);
      const assigned = currentOwner.assigned_router_ids || [];
      return routers.filter((r) => r.owner_id === oid || assigned.includes(r.id));
    }
    return routers;
  }, [routers, isVendor, isStaff, currentOwner, parentOwner]);

  // If user has specific routers and selected router is not among them, adjust
  useEffect(() => {
    if (availableRouters.length > 0) {
      if (selectedSiteRouterId !== 'ALL' && !availableRouters.some((r) => r.id === selectedSiteRouterId)) {
        // Keep or select first available router
        setSelectedSiteRouterId(availableRouters[0].id);
      }
    }
  }, [availableRouters, selectedSiteRouterId]);

  const activeSite = useMemo(() => {
    if (selectedSiteRouterId === 'ALL') return null;
    return availableRouters.find((r) => r.id === selectedSiteRouterId) || null;
  }, [availableRouters, selectedSiteRouterId]);

  const handleSiteChange = (newSiteId: number | 'ALL') => {
    setSelectedSiteRouterId(newSiteId);
    try {
      localStorage.setItem('tzwifi_active_site_id', String(newSiteId));
    } catch {}
    setIsSiteDropdownOpen(false);
  };

  const staffPrivileges = currentOwner?.privileges || {};

  // Build items allowed for this staff member
  const staffItems: any[] = useMemo(() => {
    if (!isStaff) return [];
    const items: any[] = [];
    if (staffPrivileges.can_view_active_users !== false) {
      items.push({
        id: 'active_users',
        label: lang === 'sw' ? 'Watumiaji Wangu & Remote' : 'My Active Users & Remote',
        subLabel: lang === 'sw' ? 'Waliopo Online, data na control' : 'Online users, traffic & kick control',
        icon: Wifi,
        badge: 'Live',
      });
    }
    if (
      staffPrivileges.can_generate_vouchers ||
      staffPrivileges.can_view_vouchers ||
      staffPrivileges.can_print_vouchers ||
      currentOwner?.role === 'CASHIER' ||
      currentOwner?.role === 'OPERATOR'
    ) {
      items.push({
        id: 'vouchers',
        label: lang === 'sw' ? 'Vocha Zangu & Chapisha' : 'My Vouchers & Print',
        subLabel: lang === 'sw' ? 'Tengeneza kadi za kuuza' : 'Generate cards to sell locally',
        icon: Tag,
      });
    }
    if (staffPrivileges.can_manage_routers || currentOwner?.role === 'TECHNICIAN') {
      items.push({
        id: 'routers',
        label: lang === 'sw' ? 'Vifaa, APs & Routers' : 'My Routers & Access Points',
        subLabel: lang === 'sw' ? 'Ruijie, TP-Link, Cudy, MikroTik' : 'Ruijie, TP-Link, Cudy, MikroTik, D-Link',
        icon: Server,
      });
    }
    if (staffPrivileges.can_manage_plans) {
      items.push({
        id: 'plans',
        label: lang === 'sw' ? 'Vifurushi vya Hotspot' : 'Hotspot Packages',
        subLabel: lang === 'sw' ? 'Panga bei na kasi' : 'Custom pricing & speed limits',
        icon: Package,
      });
    }
    if (staffPrivileges.can_view_reports) {
      items.push({
        id: 'overview',
        label: lang === 'sw' ? 'Mapato Yangu & Mauzo' : 'My Revenue & Sales',
        subLabel: lang === 'sw' ? 'Mauzo ya router yangu' : 'Revenue from my routers',
        icon: LayoutDashboard,
      });
    }
    if (staffPrivileges.can_view_reports || staffPrivileges.can_manage_payments) {
      items.push({
        id: 'transactions',
        label: lang === 'sw' ? 'Miamala ya Wateja Wangu' : 'My Customer Transactions',
        subLabel: lang === 'sw' ? 'M-Pesa, Tigo, Airtel zangu' : 'M-Pesa, Tigo, Airtel records',
        icon: Receipt,
      });
    }
    if (staffPrivileges.can_manage_subusers) {
      items.push({
        id: 'user_management',
        label: lang === 'sw' ? 'Wafanyakazi Wenzangu' : 'Team Members',
        subLabel: lang === 'sw' ? 'Mameneja, wauza vocha na mafundi' : 'Staff list & privileges',
        icon: ShieldCheck,
      });
    }
    return items;
  }, [isStaff, staffPrivileges, currentOwner?.role, lang]);

  // Role-Aware Navigation Structure
  const navSections = isVendor
    ? [
        {
          title: lang === 'sw' ? 'UDHIBITI WA VENDOR (Master HQ)' : 'VENDOR MASTER HQ CONTROL',
          items: [
            {
              id: 'overview',
              label: lang === 'sw' ? 'Overview & Mapato ya Nchi' : 'Overview & System Revenue',
              subLabel: lang === 'sw' ? 'Mauzo ya mtandao mzima' : 'Entire network sales & metrics',
              icon: LayoutDashboard,
            },
            {
              id: 'owners',
              label: lang === 'sw' ? 'Wamiliki wa Hotspot (Tenants)' : 'Hotspot Owners (Tenants)',
              subLabel: lang === 'sw' ? 'Sajili na simamia wateja' : 'Register and manage client accounts',
              icon: Users,
              badge: `${owners.filter((o) => o.role === 'HOTSPOT_OWNER' && !o.is_sub_user && !o.parent_owner_id).length}`,
            },
            {
              id: 'vendor_admins',
              label: lang === 'sw' ? 'Wasimamizi & Admins (HQ Privileges)' : 'System Admins & Staff (HQ Privileges)',
              subLabel: lang === 'sw' ? 'Tengeneza admins na uwape privelege' : 'Create HQ admins & assign privileges',
              icon: ShieldCheck,
              badge: 'Admins',
            },
            {
              id: 'active_users',
              label: lang === 'sw' ? 'Watumiaji Wote & Remote' : 'All Users & Live Sessions',
              subLabel: lang === 'sw' ? 'Waliopo Online na Offline' : 'Online & offline hotspot clients',
              icon: Wifi,
              badge: 'Live',
            },
          ],
        },
        {
          title: lang === 'sw' ? 'ROUTERS & ACCESS POINTS (FLEET)' : 'ROUTERS & ACCESS POINTS (FLEET)',
          items: [
            {
              id: 'routers',
              label: lang === 'sw' ? 'Routers & Access Points' : 'Routers & Access Points',
              subLabel: lang === 'sw' ? 'Ruijie, TP-Link, Cudy, D-Link, MikroTik' : 'Ruijie, TP-Link, Cudy, D-Link, MikroTik',
              icon: Server,
            },
            {
              id: 'plans',
              label: lang === 'sw' ? 'Vifurushi & Bei za Mfumo' : 'Packages & Rate Plans',
              subLabel: lang === 'sw' ? 'Muda, data na kasi (Rate limits)' : 'Time, quota limits & speed rates',
              icon: Package,
            },
            {
              id: 'vouchers',
              label: lang === 'sw' ? 'Vocha & Chapisha (Voucher Station)' : 'Voucher Station & Print',
              subLabel: lang === 'sw' ? 'Tengeneza kadi, uza na chapisha (A4/POS)' : 'Generate, inventory & print vouchers (A4/POS)',
              icon: Tag,
              badge: 'Print',
            },
            {
              id: 'portal_customizer',
              label: lang === 'sw' ? 'Muonekano wa Captive Portal' : 'Captive Portal Theme & Cards',
              subLabel: lang === 'sw' ? 'Badilisha rangi za kadi na mandhari' : 'Fleet themes, cards & branding',
              icon: Palette,
            },
          ],
        },
        {
          title: lang === 'sw' ? 'FEDHA ZA MFUMO' : 'NETWORK FINANCES',
          items: [
            {
              id: 'transactions',
              label: lang === 'sw' ? 'Miamala ya Mfumo Mzima' : 'Network Transactions Ledger',
              subLabel: lang === 'sw' ? 'M-Pesa, Tigo, Airtel, Halopesa' : 'M-Pesa, Tigo, Airtel, Halopesa records',
              icon: Receipt,
            },
          ],
        },
        {
          title: lang === 'sw' ? 'MIPANGILIO YA MFUMO & USALAMA' : 'SYSTEM SETTINGS & SECURITY',
          items: [
            {
              id: 'settings',
              label: lang === 'sw' ? 'Mipangilio Mikuu (Settings)' : 'System Settings',
              subLabel: lang === 'sw' ? 'VPS, Payment, Email, Schema & Gateways' : 'VPS, Gateways, Database & Setup',
              icon: Settings,
              badge: '5 Tools',
            },
            {
              id: 'system_reset',
              label: lang === 'sw' ? 'Reset Mfumo Wote (Factory Reset)' : 'System Factory Reset',
              subLabel: lang === 'sw' ? 'Uzinduzi Live: Futa data za majaribio' : 'Purge test data & prepare for live launch',
              icon: RotateCcw,
              badge: lang === 'sw' ? 'Uzinduzi' : 'Live Reset',
            },
          ],
        },
      ]
    : isStaff
    ? [
        {
          title: `${lang === 'sw' ? 'KITUO CHA MFANYAKAZI' : 'STAFF WORKSTATION'} (${parentOwner?.business_name || currentOwner?.business_name || 'HOTSPOT'})`,
          items: staffItems,
        },
      ]
    : [
        {
          title: `${lang === 'sw' ? 'BIASHARA YANGU' : 'MY BUSINESS'} (${currentOwner?.business_name || 'HOTSPOT'})`,
          items: [
            {
              id: 'active_users',
              label: lang === 'sw' ? 'Watumiaji Wangu & Remote' : 'My Active Users & Remote',
              subLabel: lang === 'sw' ? 'Waliopo Online, data na control' : 'Online users, traffic & kick control',
              icon: Wifi,
              badge: 'Live',
            },
            {
              id: 'user_management',
              label: lang === 'sw' ? 'Wafanyakazi & Privileges (Team)' : 'Staff & Team Privileges',
              subLabel: lang === 'sw' ? 'Mameneja, wauza vocha, mafundi na ruhusa' : 'Cashiers, techs, managers and privileges',
              icon: ShieldCheck,
              badge: 'Team',
            },
            {
              id: 'overview',
              label: lang === 'sw' ? 'Mapato Yangu & Mauzo' : 'My Revenue & Sales',
              subLabel: lang === 'sw' ? 'Mauzo ya router yangu' : 'Revenue from my routers',
              icon: LayoutDashboard,
            },
          ],
        },
        {
          title: lang === 'sw' ? 'MIKROTIK & VIFURUSHI VYANGU' : 'MIKROTIK & MY PACKAGES',
          items: [
            {
              id: 'plans',
              label: lang === 'sw' ? 'Vifurushi & Bandwidth Yangu' : 'My Packages & Bandwidth',
              subLabel: lang === 'sw' ? 'Panga bei na kasi (Rate limits)' : 'Custom pricing and speed limits',
              icon: Package,
            },
            {
              id: 'vouchers',
              label: lang === 'sw' ? 'Vocha Zangu & Chapisha' : 'My Vouchers & Print',
              subLabel: lang === 'sw' ? 'Tengeneza kadi za kuuza' : 'Generate cards to sell locally',
              icon: Tag,
            },
            {
              id: 'routers',
              label: lang === 'sw' ? 'Vifaa, APs & Routers' : 'My Routers & Access Points',
              subLabel: lang === 'sw' ? 'Ruijie, TP-Link, Cudy, MikroTik' : 'Ruijie, TP-Link, Cudy, MikroTik, D-Link',
              icon: Server,
            },
          ],
        },
        {
          title: lang === 'sw' ? 'MUUNDO WA TOVUTI & BRANDING' : 'CAPTIVE PORTAL & BRANDING',
          items: [
            {
              id: 'portal_customizer',
              label: lang === 'sw' ? 'Muonekano wa Captive Portal' : 'Captive Portal Customizer',
              subLabel: lang === 'sw' ? 'Rangi za kadi, mandhari na nembo' : 'Card styles, themes & branding',
              icon: Palette,
              badge: 'Custom',
            },
          ],
        },
        {
          title: lang === 'sw' ? 'FEDHA ZA BIASHARA' : 'BUSINESS FINANCES',
          items: [
            {
              id: 'transactions',
              label: lang === 'sw' ? 'Miamala ya Wateja Wangu' : 'My Customer Transactions',
              subLabel: lang === 'sw' ? 'M-Pesa, Tigo, Airtel zangu' : 'M-Pesa, Tigo, Airtel records',
              icon: Receipt,
            },
          ],
        },
        {
          title: lang === 'sw' ? 'MIPANGILIO (SETTINGS)' : 'SETTINGS',
          items: [
            {
              id: 'settings',
              label: lang === 'sw' ? 'Mipangilio (Settings)' : 'Settings',
              subLabel: lang === 'sw' ? 'Script ya MikroTik, Malipo & SMS/Email' : 'MikroTik Script, Payments & SMS/Email',
              icon: Settings,
              badge: currentOwner?.palmpesa_user_id ? 'Configured' : 'Setup',
            },
          ],
        },
      ];

  // Auto-switch to first available tab for staff if current tab is restricted
  useEffect(() => {
    if (isStaff && staffItems.length > 0) {
      const allowedIds = staffItems.map((i) => i.id);
      if (!allowedIds.includes(activeTab)) {
        setActiveTab(allowedIds[0]);
      }
    }
  }, [isStaff, staffItems, activeTab]);

  const currentItem = navSections
    .flatMap((s) => s.items)
    .find((item) => item.id === activeTab);

  const currentOwnerId: number | undefined = isStaff
    ? (currentOwner?.parent_owner_id ? Number(currentOwner.parent_owner_id) : undefined)
    : (currentOwner?.parent_owner_id || currentOwner?.id
        ? Number(currentOwner?.parent_owner_id || currentOwner?.id)
        : undefined);

  // Check if current regular owner subscription has expired
  const nowMs = Date.now();
  const expiresAtMs = currentOwner?.subscription_expires_at
    ? new Date(currentOwner.subscription_expires_at).getTime()
    : 0;
  const isSubscriptionExpired = Boolean(
    !isVendor &&
      currentOwner &&
      (currentOwner.subscription_status === 'EXPIRED' ||
        (currentOwner.subscription_expires_at && expiresAtMs <= nowMs))
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-100/70">
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed lg:sticky top-16 z-50 lg:z-10 h-[calc(100vh-4rem)] bg-slate-900 text-white flex flex-col justify-between transition-all duration-300 shadow-xl lg:shadow-none ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'w-72 lg:w-72'}`}
      >
        {/* Top Header / Account Switcher Selector */}
        <div className="p-3.5 border-b border-slate-800 relative">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isVendor ? 'bg-indigo-400' : isStaff ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <span>
                    {isVendor
                      ? lang === 'sw'
                        ? 'Akaunti Kuu ya Vendor'
                        : 'Vendor Master Account'
                      : isStaff
                      ? lang === 'sw'
                        ? 'Akaunti ya Mfanyakazi (Staff)'
                        : 'Staff Workstation'
                      : lang === 'sw'
                      ? 'Akaunti ya Mmiliki'
                      : 'Hotspot Owner Account'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Account Profile Card - Strictly Single Authenticated Account (No Switching/Impersonation) */}
              {isMasterVendor ? (
                <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs bg-indigo-600 text-white shadow-xs">
                      HQ
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{currentOwner?.name || (lang === 'sw' ? 'Msimamizi Mkuu' : 'Vendor Admin')}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1 font-mono">
                        <span className="text-indigo-300 font-bold">@{currentOwner?.username || 'admin'}</span>
                        <span>•</span>
                        <span className="truncate font-sans">{currentOwner?.business_name || 'Vendor HQ Master'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsVendorAccountModalOpen(true)}
                      className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/40 transition cursor-pointer"
                      title={lang === 'sw' ? 'Hariri Username & Nenosiri Yako' : 'Edit Username & Password'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hidden sm:inline">
                      VENDOR
                    </span>
                  </div>
                </div>
              ) : isStaff ? (
                /* Staff User Card - Linked to Parent Hotspot Owner */
                <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs bg-amber-500 text-slate-950">
                      {(currentOwner?.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{currentOwner?.name}</span>
                      </div>
                      <div className="text-[10px] text-amber-300 truncate font-semibold">
                        {lang === 'sw' ? 'Chini ya: ' : 'Under: '}
                        <span className="text-white font-bold">{parentOwner?.business_name || currentOwner?.business_name || 'Hotspot'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsVendorAccountModalOpen(true)}
                      className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/40 transition cursor-pointer"
                      title={lang === 'sw' ? 'Hariri Nenosiri & Akaunti Yako' : 'Edit Account & Password'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {currentOwner?.staff_title || currentOwner?.role || 'STAFF'}
                    </span>
                  </div>
                </div>
              ) : (
                /* Regular Hotspot Owner Profile Card - Completely Isolated */
                <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs bg-emerald-600 text-white">
                      {((currentOwner?.name && currentOwner.name !== 'Mteja Mpya' ? currentOwner.name : currentOwner?.business_name) || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {(currentOwner?.name && currentOwner.name !== 'Mteja Mpya') ? currentOwner.name : (currentOwner?.business_name || (lang === 'sw' ? 'Mmiliki wa Hotspot' : 'Hotspot Owner'))}
                      </div>
                      <div className="text-[10px] text-emerald-400 truncate font-semibold flex items-center gap-1">
                        {currentOwner?.username && <span className="font-mono text-emerald-300 font-bold">@{currentOwner.username} •</span>}
                        <span>{currentOwner?.business_name || 'Biashara ya Wi-Fi'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsVendorAccountModalOpen(true)}
                      className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 transition cursor-pointer"
                      title={lang === 'sw' ? 'Hariri Username & Nenosiri Yako' : 'Edit Username & Password'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                      {lang === 'sw' ? 'Mmiliki' : 'Owner'}
                    </span>
                  </div>
                </div>
              )}

              {/* Site / MikroTik Branch Switcher for Multi-Site Management */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between px-0.5 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>{lang === 'sw' ? 'Site ya MikroTik' : 'MikroTik Site'}</span>
                  </span>
                  {availableRouters.length > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                      {availableRouters.length} {availableRouters.length === 1 ? 'Site' : 'Sites'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-left transition-all group cursor-pointer shadow-xs"
                    title={lang === 'sw' ? 'Badili Site ya MikroTik unayotaka kuisimamia' : 'Switch active MikroTik site to manage'}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                        activeSite ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {activeSite ? <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" /> : <Server className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span className="truncate">
                            {activeSite ? activeSite.name : (lang === 'sw' ? '🌐 Maeneo Yote (Fleet)' : '🌐 All Sites (Fleet)')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 font-mono">
                          {activeSite ? (
                            <>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeSite.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                              <span className="truncate">{activeSite.ip_address} • {activeSite.location}</span>
                            </>
                          ) : (
                            <span className="text-slate-400 truncate">
                              {availableRouters.length > 0 ? `${availableRouters.length} MikroTiks Zipo` : (lang === 'sw' ? 'Hakuna router bado' : 'No routers')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-cyan-300 shrink-0 transition-transform duration-200 ${isSiteDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                  </button>

                  {/* Site Dropdown Menu */}
                  {isSiteDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* All Sites Option */}
                      <button
                        type="button"
                        onClick={() => handleSiteChange('ALL')}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                          selectedSiteRouterId === 'ALL'
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-700/70'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">🌐</span>
                          <div className="truncate">
                            <div className="font-semibold truncate">{lang === 'sw' ? 'Maeneo Yote (Sites Zote)' : 'All Sites (Fleet View)'}</div>
                            <div className={`text-[10px] truncate ${selectedSiteRouterId === 'ALL' ? 'text-cyan-100' : 'text-slate-400'}`}>
                              {lang === 'sw' ? 'Simamia router zote kwa pamoja' : 'Manage all connected routers together'}
                            </div>
                          </div>
                        </div>
                        {selectedSiteRouterId === 'ALL' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      {availableRouters.length > 0 && (
                        <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 font-mono border-t border-slate-700/60 mt-1 pt-1">
                          {lang === 'sw' ? 'Chagua Site Maalum ya MikroTik:' : 'Select Specific MikroTik Site:'}
                        </div>
                      )}

                      {/* List of available sites */}
                      <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                        {availableRouters.map((router, index) => {
                          const isSelected = selectedSiteRouterId === router.id;
                          return (
                            <button
                              key={router.id}
                              type="button"
                              onClick={() => handleSiteChange(router.id)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                                isSelected
                                  ? 'bg-cyan-600 text-white font-bold shadow-xs'
                                  : 'text-slate-200 hover:text-white hover:bg-slate-700/70'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${router.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <div className="min-w-0">
                                  <div className="font-semibold truncate flex items-center gap-1.5">
                                    <span className="text-[10px] opacity-75 font-mono">Site #{index + 1}</span>
                                    <span className="truncate">{router.name}</span>
                                  </div>
                                  <div className={`text-[10px] truncate font-mono ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                                    {router.ip_address} • {router.location}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Action button to Add 2nd / New Site */}
                      <div className="border-t border-slate-700/60 pt-1 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('routers');
                            setIsSiteDropdownOpen(false);
                            setIsMobileSidebarOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 p-1.5 rounded-lg text-[11px] font-bold text-cyan-300 hover:text-white hover:bg-cyan-600/30 transition text-center cursor-pointer"
                        >
                          <span>➕ {lang === 'sw' ? 'Unganisha Site ya Pili / Mpya' : 'Link 2nd / New Site'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                  isVendor ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                }`}
                title={lang === 'sw' ? 'Panua Sidebar' : 'Expand Sidebar'}
              >
                {isVendor ? 'HQ' : currentOwner?.name?.charAt(0) || 'M'}
              </button>

              {/* Collapsed Site Indicator Button */}
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(false);
                  setIsSiteDropdownOpen(true);
                }}
                className="w-8 h-8 rounded-xl bg-slate-800 text-cyan-400 border border-slate-700 flex items-center justify-center relative hover:bg-slate-700 transition cursor-pointer"
                title={activeSite ? `Site: ${activeSite.name} (${activeSite.ip_address})` : 'Maeneo Yote (All Sites)'}
              >
                <MapPin className="w-4 h-4" />
                <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${activeSite?.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Modules Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileSidebarOpen(false);
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative group ${
                      isActive
                        ? isVendor
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                          : 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                      }`}
                    />

                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{item.label}</div>
                        <div
                          className={`text-[10px] truncate ${
                            isActive
                              ? isVendor
                                ? 'text-indigo-200'
                                : 'text-emerald-100'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.subLabel}
                        </div>
                      </div>
                    )}

                    {!isCollapsed && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-white/20 text-white shrink-0">
                        {item.badge}
                      </span>
                    )}

                    {/* Active Indicator bar */}
                    {isActive && (
                      <div className="absolute right-0 top-2 bottom-2 w-1 rounded-l-full bg-white" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {!isCollapsed && (
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center justify-between text-slate-300 font-bold mb-0.5">
                <span>
                  {isVendor
                    ? 'Vendor Master Control'
                    : lang === 'sw'
                    ? 'Mmiliki wa Hotspot'
                    : 'Hotspot Owner Console'}
                </span>
                <span className="text-emerald-400">Live</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {isVendor
                  ? lang === 'sw'
                    ? 'Una uwezo wa kusimamia wamiliki na router zote nchini.'
                    : 'Full administrative control over all hotspot owners and routers.'
                  : lang === 'sw'
                  ? 'Unaona na kusimamia vifurushi na router zako zilizokabidhiwa.'
                  : 'Manage assigned MikroTik routers, plans, and local vouchers.'}
              </p>
            </div>
          )}

          {/* Logout Button in Sidebar */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className={`w-full py-2.5 px-3 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-white text-xs font-bold flex items-center ${
                isCollapsed ? 'justify-center' : 'justify-start'
              } gap-2.5 transition shadow-xs group`}
              title={lang === 'sw' ? 'Ondoka kwenye mfumo (Log Out)' : 'Sign Out / Log Out'}
            >
              <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
              {!isCollapsed && <span>{lang === 'sw' ? 'Ondoka Kwenye Mfumo' : 'Sign Out'}</span>}
            </button>
          )}

          {/* Desktop Collapse Toggle */}
          <div className="hidden lg:flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Funga Sidebar' : 'Collapse Sidebar'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* If viewing as Hotspot Owner, show noticeable top banner (without switch to vendor button) */}
        {!isVendor && (
          <div className="bg-emerald-700 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs font-medium shadow-md">
            <div className="flex items-center gap-2 overflow-hidden">
              <Building className="w-4 h-4 shrink-0 text-emerald-200" />
              <span className="truncate">
                {lang === 'sw' ? (
                  <>
                    Akaunti ya Mmiliki: <strong>{currentOwner?.name}</strong> (
                    {currentOwner?.business_name}) • Unadhibiti router na mauzo yako pekee.
                  </>
                ) : (
                  <>
                    Active tenant account: <strong>{currentOwner?.name}</strong> (
                    {currentOwner?.business_name}). Managing your assigned router fleet.
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Subscription Status Chip */}
              <div className="flex items-center gap-1.5 bg-emerald-900/80 px-2.5 py-1 rounded-full border border-emerald-500/40 text-[11px] text-emerald-100">
                <Clock className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {lang === 'sw'
                    ? `Subscription: Siku ${
                        currentOwner?.subscription_expires_at
                          ? Math.max(
                              0,
                              Math.ceil(
                                (new Date(currentOwner.subscription_expires_at).getTime() -
                                  Date.now()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )
                          : 30
                      } zimebaki`
                    : `Subscription: ${
                        currentOwner?.subscription_expires_at
                          ? Math.max(
                              0,
                              Math.ceil(
                                (new Date(currentOwner.subscription_expires_at).getTime() -
                                  Date.now()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )
                          : 30
                      } days left`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRenewalModal(true)}
                  className="ml-1 px-2 py-0.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-[10px] transition cursor-pointer"
                >
                  {lang === 'sw' ? 'Lipa Sh 15,000' : 'Renew'}
                </button>
              </div>


            </div>
          </div>
        )}

        {/* If Hotspot Owner has not configured their payment API, show notice to set API first */}
        {!isVendor && !currentOwner?.dalipay_public_key && !currentOwner?.palmpesa_api_token && (
          <div className="bg-amber-500 text-slate-950 px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-950 shrink-0" />
              <span>
                {lang === 'sw'
                  ? '⚠️ Hujaweka API ya Geti la Malipo! Wateja hawawezi kulipia intaneti kwenye router zako mpaka uweke API yako ya malipo kwanza.'
                  : '⚠️ Payment Gateway API not configured! Hotspot users cannot purchase plans until you configure your payment API.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setSettingsSubTab('payment_gateway');
              }}
              className="px-3 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              {lang === 'sw' ? 'Sanidi API Sasa →' : 'Set Up API Now →'}
            </button>
          </div>
        )}

        {/* Top Breadcrumb & Mobile Menu Toggle Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-16 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">
                  {isVendor ? '👑 Vendor Master HQ' : `🏢 ${currentOwner?.business_name}`}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-bold text-slate-900">{currentItem?.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Header Active Site Selector Pill */}
            {availableRouters.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileSidebarOpen(true);
                  setIsSiteDropdownOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-300 bg-cyan-50/90 hover:bg-cyan-100 text-cyan-950 font-bold text-xs shadow-2xs transition cursor-pointer"
                title={lang === 'sw' ? 'Badili Site ya MikroTik unayotaka kuisimamia' : 'Switch active MikroTik site'}
              >
                <MapPin className="w-3.5 h-3.5 text-cyan-600" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">
                  {activeSite ? activeSite.name : (lang === 'sw' ? '🌐 Maeneo Yote' : '🌐 All Sites')}
                </span>
                <ChevronDown className="w-3 h-3 text-cyan-700 shrink-0" />
              </button>
            )}

            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isVendor
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isVendor ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span>{isVendor ? 'Multi-Tenant Fleet Active' : 'Hotspot Owner Link Active'}</span>
            </span>

            {/* Open Captive Portal from within user account */}
            {onNavigatePortal && (
              <button
                type="button"
                onClick={onNavigatePortal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#1b62b6] font-bold text-xs shadow-2xs transition cursor-pointer"
                title={lang === 'sw' ? 'Fungua Captive Portal ya Wateja' : 'Open Captive Portal'}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Captive Portal' : 'Captive Portal'}</span>
              </button>
            )}

            {/* Prominent Header Logout Button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs shadow-2xs transition"
                title={lang === 'sw' ? 'Ondoka kwenye mfumo (Log Out)' : 'Sign Out / Log Out'}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>{lang === 'sw' ? 'Ondoka (Log Out)' : 'Log Out'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Quick-Tabs Pill Bar for Mobile & Tablet */}
        <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-none shadow-2xs">
          {navSections.flatMap((s) => s.items).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as any);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 min-h-[36px] ${
                  isActive
                    ? 'bg-[#1b62b6] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Module Content View OR Fullscreen Subscription Gate if Expired */}
        {isSubscriptionExpired && currentOwner ? (
          <main className="flex-1 w-full min-h-[calc(100vh-8rem)] p-3 sm:p-6 bg-slate-950">
            <SubscriptionGate
              owner={currentOwner}
              onRenewSuccess={(updated) => {
                setCurrentOwner(updated);
                setShowRenewalModal(false);
                if (onSwitchUser) onSwitchUser(updated);
                fetchOwners();
              }}
              onLogout={() => {
                if (onLogout) onLogout();
              }}
              lang={lang}
            />
          </main>
        ) : (
          <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1720px] mx-auto space-y-5 sm:space-y-6 pb-28 lg:pb-8">
          {/* Welcome Banner for Hotspot Owner who hasn't added a router yet */}
          {!isVendor && (!currentOwner?.assigned_router_ids || currentOwner.assigned_router_ids.length === 0) && activeTab !== 'routers' && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white border border-indigo-700/60 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/50 border border-indigo-400/30 flex items-center justify-center font-bold text-xl text-white shrink-0 shadow-inner">
                  <Server className="w-6 h-6 text-indigo-200" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {lang === 'sw'
                      ? `Karibu ${currentOwner?.business_name}! Hujasajili Router Bado`
                      : `Welcome ${currentOwner?.business_name}! No Routers Linked Yet`}
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5 max-w-xl leading-relaxed">
                    {lang === 'sw'
                      ? 'Ili uanze kuuza vifurushi, kukusanya malipo ya simu na kuona wateja waliopo online, unganisha MikroTik Router yako (mfano: hEX S au hAP).'
                      : 'To start selling hotspot packages, collecting mobile money, and managing connected users, link your MikroTik router (e.g. hEX S, hAP, or CCR).'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('routers')}
                className="px-4 py-2.5 rounded-xl bg-white text-indigo-950 font-black text-xs hover:bg-indigo-50 shadow-md transition whitespace-nowrap shrink-0 flex items-center gap-1.5"
              >
                <span>{lang === 'sw' ? '➕ Ongeza Router Yako Sasa' : '➕ Link MikroTik Router Now'}</span>
              </button>
            </div>
          )}

          {activeTab === 'overview' && (
            <AdminOverview
              ownerId={currentOwnerId}
              ownerName={!isVendor ? currentOwner?.business_name : undefined}
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : undefined}
              selectedRouterName={activeSite?.name}
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
              onClearRouterFilter={() => handleSiteChange('ALL')}
            />
          )}

          {activeTab === 'owners' && (
            <OwnerManagement
              onOwnersUpdated={fetchOwners}
            />
          )}

          {activeTab === 'vendor_admins' && isVendor && (
            <VendorAdminManagement
              currentUser={currentOwner}
              lang={lang}
              onOpenAccountModal={() => setIsVendorAccountModalOpen(true)}
              onOwnersUpdated={fetchOwners}
            />
          )}

          {activeTab === 'company_info' && isVendor && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab="company_info"
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : undefined}
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
              onPreviewAbout={() => setShowPreviewAbout(true)}
              onPreviewContact={() => setShowPreviewContact(true)}
            />
          )}

          {activeTab === 'user_management' && (
            <UserManagement
              currentUser={currentOwner}
              lang={lang}
              onSwitchUser={onSwitchUser}
            />
          )}

          {activeTab === 'active_users' && (
            <ActiveHotspotUsers
              ownerId={currentOwnerId}
              initialRouterId={selectedSiteRouterId}
              onSelectRouter={handleSiteChange}
              ownerName={currentOwner?.business_name || currentOwner?.name}
            />
          )}

          {activeTab === 'plans' && <PlanManagement />}

          {activeTab === 'transactions' && (
            <TransactionLedger
              ownerId={currentOwnerId}
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : undefined}
              selectedRouterName={activeSite?.name}
              routers={availableRouters}
              onSelectRouter={(id) => handleSiteChange(id ?? 'ALL')}
            />
          )}

          {activeTab === 'vouchers' && (
            <VoucherStation
              ownerId={currentOwnerId}
              businessName={currentOwner?.business_name || (isVendor ? 'Vendor HQ Hotspot' : undefined)}
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : undefined}
              routers={availableRouters}
              onSelectRouter={(id) => handleSiteChange(id ?? 'ALL')}
            />
          )}

          {activeTab === 'routers' && (
            <RouterManagement
              ownerId={currentOwnerId}
              ownerName={!isVendor ? (currentOwner?.business_name || currentOwner?.name) : undefined}
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : undefined}
              onSelectRouter={handleSiteChange}
            />
          )}

          {activeTab === 'portal_customizer' && (
            <CaptivePortalCustomizer
              currentOwner={currentOwner || undefined}
              routers={availableRouters}
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : 'all'}
              onSelectRouter={(id) => handleSiteChange(id === 'all' ? 'ALL' : id)}
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab={settingsSubTab}
              selectedRouterId={selectedSiteRouterId !== 'ALL' ? selectedSiteRouterId : undefined}
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
              onPreviewAbout={() => setShowPreviewAbout(true)}
              onPreviewContact={() => setShowPreviewContact(true)}
            />
          )}

          {/* Backward compatibility redirects to SettingsModule subtabs */}
          {activeTab === 'merchant_settings' && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab='payment_gateway'
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
            />
          )}
          {activeTab === 'vps_devops' && isVendor && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab='vps_devops'
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
            />
          )}
          {activeTab === 'email_config' && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab='email_gateway'
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
            />
          )}
          {activeTab === 'schema' && isVendor && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab='database_schema'
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
            />
          )}
          {activeTab === 'system_reset' && isVendor && (
            <SettingsModule
              currentUser={currentOwner}
              lang={lang}
              defaultSubTab='factory_reset'
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              onOwnerUpdated={(updatedOwner: HotspotOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
            />
          )}
        </main>
        )}
      </div>

      {/* Fixed Mobile & Tablet Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden shadow-lg">
        <div className="grid grid-cols-5 h-16 items-center px-1 max-w-lg mx-auto">
          {isVendor ? (
            <>
              {/* Vendor Tab 1: Owners */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('owners');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'owners' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Users className={`w-5 h-5 ${activeTab === 'owners' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Wamiliki' : 'Owners'}
                </span>
              </button>

              {/* Vendor Tab 2: Active Users */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('active_users');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'active_users' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Wifi className={`w-5 h-5 ${activeTab === 'active_users' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Waliopo' : 'Users'}
                </span>
              </button>

              {/* Vendor Tab 3: DevOps */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('vps_devops');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'vps_devops' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Terminal className={`w-5 h-5 ${activeTab === 'vps_devops' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">DevOps</span>
              </button>

              {/* Vendor Tab 4: Settings */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'settings' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Mipangilio' : 'Settings'}
                </span>
              </button>

              {/* Vendor Tab 5: Reset Mfumo */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('system_reset');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'system_reset' ? 'text-rose-600 font-bold' : 'text-slate-500 hover:text-rose-600'
                }`}
              >
                <RotateCcw className={`w-5 h-5 ${activeTab === 'system_reset' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Reset' : 'Reset'}
                </span>
              </button>
            </>
          ) : (
            <>
              {/* Hotspot Owner Tab 1: Active Users */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('active_users');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'active_users' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Wifi className={`w-5 h-5 ${activeTab === 'active_users' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Waliopo' : 'Users'}
                </span>
              </button>

              {/* Hotspot Owner Tab 2: Overview / Revenue */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('overview');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'overview' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className={`w-5 h-5 ${activeTab === 'overview' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Mapato' : 'Revenue'}
                </span>
              </button>

              {/* Hotspot Owner Tab 3: Vouchers */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('vouchers');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'vouchers' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Tag className={`w-5 h-5 ${activeTab === 'vouchers' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Vocha' : 'Vouchers'}
                </span>
              </button>

              {/* Hotspot Owner Tab 4: Plans */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('plans');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'plans' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Package className={`w-5 h-5 ${activeTab === 'plans' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Vifurushi' : 'Plans'}
                </span>
              </button>
              {/* Hotspot Owner Tab 5: Settings */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('settings');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'settings' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Mipangilio' : 'Settings'}
                </span>
              </button>
            </>
          )}

          {/* Tab 5: Menyu / More Drawer trigger */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 h-full cursor-pointer text-slate-500 hover:text-slate-900 transition"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] truncate max-w-[64px]">
              {lang === 'sw' ? 'Menyu' : 'Menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* Subscription Renewal Modal Dialog */}
      {showRenewalModal && currentOwner && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <SubscriptionGate
            owner={currentOwner}
            onRenewSuccess={(updated) => {
              setCurrentOwner(updated);
              setShowRenewalModal(false);
              if (onSwitchUser) onSwitchUser(updated);
              fetchOwners();
            }}
            onLogout={() => {
              setShowRenewalModal(false);
              if (onLogout) onLogout();
            }}
            lang={lang}
          />
        </div>
      )}

      {/* Live Preview Modals for Vendor */}
      <AboutUsModal
        isOpen={showPreviewAbout}
        onClose={() => setShowPreviewAbout(false)}
        onOpenContact={() => {
          setShowPreviewAbout(false);
          setShowPreviewContact(true);
        }}
        lang={lang}
      />

      <ContactUsModal
        isOpen={showPreviewContact}
        onClose={() => setShowPreviewContact(false)}
        onOpenAbout={() => {
          setShowPreviewContact(false);
          setShowPreviewAbout(true);
        }}
        lang={lang}
      />

      {/* Vendor & Owner Account Profile & Password Edit Modal */}
      <VendorAccountEditModal
        isOpen={isVendorAccountModalOpen}
        onClose={() => setIsVendorAccountModalOpen(false)}
        currentUser={currentOwner}
        onUpdated={(updatedUser) => {
          setCurrentOwner(updatedUser);
          if (onSwitchUser) onSwitchUser(updatedUser);
          fetchOwners();
        }}
        lang={lang}
      />
    </div>
  );
};
