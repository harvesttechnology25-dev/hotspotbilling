import React, { useState, useEffect } from 'react';
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
import { UserManagement } from './UserManagement.tsx';
import { CompanyInfoSettings } from './CompanyInfoSettings.tsx';
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
  Terminal,
  Palette,
  Clock,
  Smartphone,
  RotateCcw,
  Flame,
  Info,
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

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'owners'
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
  >('active_users');

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch registered owners
  const fetchOwners = async () => {
    try {
      const res = await fetch('/api/v1/owners');
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

  const isVendor = currentOwner?.role === 'VENDOR_ADMIN';

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
              badge: `${owners.filter((o) => o.role === 'HOTSPOT_OWNER').length}`,
            },
            {
              id: 'company_info',
              label: lang === 'sw' ? 'Taarifa za Mfumo (About & Contacts)' : 'System Info (About & Contacts)',
              subLabel: lang === 'sw' ? 'Kuhusu sisi, simu, WhatsApp, ofisi' : 'About us, phones, WhatsApp, office',
              icon: Building2,
              badge: 'Homepage',
            },
            {
              id: 'user_management',
              label: lang === 'sw' ? 'Wafanyakazi & Privileges (Users)' : 'Staff & Privileges (Users)',
              subLabel: lang === 'sw' ? 'Sajili na simamia ruhusa za watumiaji' : 'Manage users and granular privileges',
              icon: ShieldCheck,
              badge: 'Access',
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
              label: lang === 'sw' ? 'Vocha & Kadi za Uchapishaji' : 'Voucher Station & Printing',
              subLabel: lang === 'sw' ? 'Tengeneza na chapisha' : 'Batch voucher cards & printing',
              icon: Tag,
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
          title: lang === 'sw' ? 'FEDHA & SERVER SYSTEM' : 'FINANCE & SERVER SYSTEM',
          items: [
            {
              id: 'transactions',
              label: lang === 'sw' ? 'Miamala ya Mfumo Mzima' : 'Network Transactions Ledger',
              subLabel: lang === 'sw' ? 'M-Pesa, Tigo, Airtel, Halopesa' : 'M-Pesa, Tigo, Airtel, Halopesa records',
              icon: Receipt,
            },
            {
              id: 'vps_devops',
              label: lang === 'sw' ? 'Cloud VPS & FreeRADIUS DevOps' : 'Cloud VPS & FreeRADIUS DevOps',
              subLabel: lang === 'sw' ? 'Ubuntu 22.04, VPN & CoA 3799' : 'Ubuntu 22.04, VPN & CoA 3799',
              icon: Terminal,
            },
            {
              id: 'merchant_settings',
              label: lang === 'sw' ? 'Geti la Malipo & Merchant (APIs)' : 'Payment Gateway & Merchant Options',
              subLabel: lang === 'sw' ? 'DaliPay, PalmPay, AzamPay & M-Pesa' : 'DaliPay, PalmPay, AzamPay & M-Pesa APIs',
              icon: CreditCard,
              badge: currentOwner?.palmpesa_user_id || currentOwner?.payout_channel ? 'Active' : undefined,
            },
            {
              id: 'email_config',
              label: lang === 'sw' ? 'API za Barua Pepe (Email Gateway)' : 'Email Merchant Gateway APIs',
              subLabel: lang === 'sw' ? 'Resend, SendGrid, Mailgun & OTP' : 'Resend, SendGrid, Mailgun & OTP',
              icon: Mail,
            },
            {
              id: 'schema',
              label: lang === 'sw' ? 'Database Schema & MySQL' : 'Database Schema & MySQL',
              subLabel: lang === 'sw' ? 'Muundo wa Database' : 'Relational schema & SQL DDL',
              icon: Database,
            },
            {
              id: 'system_reset',
              label: lang === 'sw' ? 'Weka Mfumo Mpya (Live Reset)' : 'Factory Reset (Live Launch)',
              subLabel: lang === 'sw' ? 'Safi data za majaribio uanze live' : 'Purge test data for production',
              icon: RotateCcw,
              badge: 'Live',
            },
          ],
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
            {
              id: 'merchant_settings',
              label: lang === 'sw' ? 'Geti Langu la Malipo (Merchant)' : 'My Payment Gateway (Merchant)',
              subLabel: lang === 'sw' ? 'Badilisha au ongeza Merchant / PalmPay' : 'Change or add Merchant / PalmPay',
              icon: CreditCard,
              badge: currentOwner?.palmpesa_user_id ? 'Configured' : 'Setup',
            },
          ],
        },
      ];

  const currentItem = navSections
    .flatMap((s) => s.items)
    .find((item) => item.id === activeTab);

  const handleSelectAccount = (owner: HotspotOwner) => {
    // Only Vendor Admin is authorized to switch accounts
    if (!isVendor) return;

    setCurrentOwner(owner);
    setIsAccountDropdownOpen(false);
    if (onSwitchUser) {
      onSwitchUser(owner);
    }
    // If switched to owner and tab is not allowed, switch to active_users
    if (owner.role === 'HOTSPOT_OWNER' && ['owners', 'schema', 'payment_config', 'vps_devops'].includes(activeTab)) {
      setActiveTab('active_users');
    }
  };

  const currentOwnerId = !isVendor ? currentOwner?.id : undefined;

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
                  <span className={`w-1.5 h-1.5 rounded-full ${isVendor ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                  <span>
                    {isVendor
                      ? lang === 'sw'
                        ? 'Akaunti Kuu ya Vendor'
                        : 'Vendor Master Account'
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

              {/* Account Selector - Only Vendor HQ is permitted to switch accounts */}
              {isVendor ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 transition text-left group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs bg-indigo-600 text-white">
                        HQ
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {currentOwner?.name || (lang === 'sw' ? 'Msimamizi Mkuu' : 'Vendor Admin')}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {currentOwner?.business_name || 'Vendor HQ Master'}
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform ${
                        isAccountDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Account Dropdown Menu */}
                  {isAccountDropdownOpen && (
                    <div className="absolute left-3 right-3 top-20 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        {lang === 'sw' ? 'Badilisha Akaunti (Vendor HQ):' : 'Switch Account (Vendor HQ):'}
                      </div>

                      {owners.map((owner) => {
                        const isSelected = currentOwner?.id === owner.id;
                        const isVendorAccount = owner.role === 'VENDOR_ADMIN';

                        return (
                          <button
                            key={owner.id}
                            type="button"
                            onClick={() => handleSelectAccount(owner)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'text-slate-300 hover:text-white hover:bg-slate-700/80'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="truncate font-semibold flex items-center gap-1.5">
                                <span>{owner.name}</span>
                                {isVendorAccount && (
                                  <span className="px-1.5 py-0.2 rounded-sm text-[9px] bg-indigo-200 text-indigo-900 font-bold">
                                    VENDOR
                                  </span>
                                )}
                              </div>
                              <div
                                className={`text-[10px] truncate ${
                                  isSelected ? 'text-indigo-200' : 'text-slate-400'
                                }`}
                              >
                                {owner.business_name}
                              </div>
                            </div>

                            {isSelected && <span className="text-emerald-400 font-bold">✓</span>}
                          </button>
                        );
                      })}

                      {onLogout && (
                        <div className="pt-1.5 mt-1.5 border-t border-slate-700/80">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAccountDropdownOpen(false);
                              onLogout();
                            }}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-rose-300 hover:text-white hover:bg-rose-900/40 text-xs font-bold transition text-left"
                          >
                            <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{lang === 'sw' ? 'Ondoka Kwenye Mfumo (Log Out)' : 'Sign Out / Log Out'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Regular Hotspot Owner Profile Card - Completely Isolated */
                <div className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-black text-xs bg-emerald-600 text-white">
                      {currentOwner?.name?.charAt(0) || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">
                        {currentOwner?.name || (lang === 'sw' ? 'Mmiliki wa Hotspot' : 'Hotspot Owner')}
                      </div>
                      <div className="text-[10px] text-emerald-400 truncate font-semibold">
                        {currentOwner?.business_name || 'Biashara ya Wi-Fi'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 shrink-0">
                    {lang === 'sw' ? 'Mmiliki' : 'Owner'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex justify-center">
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

        {/* Dynamic Module Content View */}
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
              onNavigateToTab={(tab) => setActiveTab(tab as any)}
            />
          )}

          {activeTab === 'owners' && (
            <OwnerManagement
              onSwitchToOwner={(owner) => {
                handleSelectAccount(owner);
                setActiveTab('active_users');
              }}
            />
          )}

          {activeTab === 'company_info' && (
            <CompanyInfoSettings
              lang={lang}
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

          {activeTab === 'active_users' && <ActiveHotspotUsers ownerId={currentOwnerId} />}

          {activeTab === 'plans' && <PlanManagement />}

          {activeTab === 'transactions' && <TransactionLedger ownerId={currentOwnerId} />}

          {activeTab === 'vouchers' && (
            <VoucherStation
              ownerId={currentOwnerId}
              businessName={!isVendor ? currentOwner?.business_name : undefined}
            />
          )}

          {activeTab === 'routers' && (
            <RouterManagement
              ownerId={currentOwnerId}
              ownerName={!isVendor ? (currentOwner?.business_name || currentOwner?.name) : undefined}
            />
          )}

          {activeTab === 'schema' && <MySQLSchemaViewer />}

          
          {activeTab === 'merchant_settings' && (
            <OwnerMerchantSettings
              owner={currentOwner}
              onUpdated={(updatedOwner) => {
                setCurrentOwner(updatedOwner);
                fetchOwners();
              }}
              lang={lang}
            />
          )}

          {activeTab === 'portal_customizer' && (
            <CaptivePortalCustomizer
              currentOwner={currentOwner || undefined}
              routers={routers}
              lang={lang}
            />
          )}

          {activeTab === 'vps_devops' && <VpsDevopsManager />}
          {activeTab === 'email_config' && <EmailConfig lang={lang} />}
          {activeTab === 'system_reset' && (
            <SystemResetManager
              onResetCompleted={() => {
                fetchOwners();
                fetchRouters();
              }}
              lang={lang}
            />
          )}
        </main>
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

              {/* Vendor Tab 4: Payments / APIs */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('merchant_settings');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center gap-1 h-full cursor-pointer transition ${
                  activeTab === 'merchant_settings' ? 'text-[#1b62b6] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard className={`w-5 h-5 ${activeTab === 'merchant_settings' ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] truncate max-w-[64px]">
                  {lang === 'sw' ? 'Malipo' : 'Payments'}
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
    </div>
  );
};
