import React, { useState, useEffect } from 'react';
import {
  Settings,
  Terminal,
  CreditCard,
  Mail,
  Database,
  RotateCcw,
  Building2,
  FileCode2,
  User,
} from 'lucide-react';
import { HotspotOwner } from '../../types/index.ts';
import { VpsDevopsManager } from './VpsDevopsManager.tsx';
import { OwnerMerchantSettings } from './OwnerMerchantSettings.tsx';
import { EmailConfig } from './EmailConfig.tsx';
import { MySQLSchemaViewer } from './MySQLSchemaViewer.tsx';
import { SystemResetManager } from './SystemResetManager.tsx';
import { CompanyInfoSettings } from './CompanyInfoSettings.tsx';
import { OwnerAllInOneScript } from './OwnerAllInOneScript.tsx';
import { PaymentConfig } from './PaymentConfig.tsx';
import { VendorAccountSettingsTab } from './VendorAccountSettingsTab.tsx';

export type SettingsSubTab =
  | 'account_profile'
  | 'company_info'
  | 'vps_devops'
  | 'all_in_one_script'
  | 'payment_gateway'
  | 'email_gateway'
  | 'database_schema'
  | 'factory_reset';

interface SettingsModuleProps {
  currentUser: HotspotOwner | null;
  lang?: 'sw' | 'en';
  defaultSubTab?: SettingsSubTab;
  onResetCompleted?: () => void;
  onOwnerUpdated?: (updatedOwner: HotspotOwner) => void;
  onPreviewAbout?: () => void;
  onPreviewContact?: () => void;
  selectedRouterId?: number;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  currentUser,
  lang = 'sw',
  defaultSubTab = 'payment_gateway',
  onResetCompleted,
  onOwnerUpdated,
  onPreviewAbout,
  onPreviewContact,
  selectedRouterId,
}) => {
  const isVendor = currentUser?.role === 'VENDOR_ADMIN';

  // Available submodules:
  // For VENDOR_ADMIN: company_info, vps_devops, payment_gateway, email_gateway, database_schema, factory_reset
  // For HOTSPOT_OWNER: all_in_one_script, payment_gateway, email_gateway (NO company_info, NO vps_devops, NO database_schema, NO factory_reset)
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>(() => {
    if (!isVendor) {
      if (
        defaultSubTab === 'company_info' ||
        defaultSubTab === 'vps_devops' ||
        defaultSubTab === 'database_schema' ||
        defaultSubTab === 'factory_reset'
      ) {
        return 'all_in_one_script';
      }
      return defaultSubTab || 'all_in_one_script';
    }
    return defaultSubTab || 'company_info';
  });

  // Ensure if role changes or unauthorized subtab is picked, fallback safely
  useEffect(() => {
    if (!isVendor) {
      if (
        activeSubTab === 'company_info' ||
        activeSubTab === 'vps_devops' ||
        activeSubTab === 'database_schema' ||
        activeSubTab === 'factory_reset'
      ) {
        setActiveSubTab('all_in_one_script');
      }
    }
  }, [isVendor, activeSubTab]);

  const subTabs = [
    // 0. Account Profile & Password (Both Vendor & Owner)
    {
      id: 'account_profile' as const,
      labelSw: isVendor ? 'Akaunti ya Vendor (Username & Nenosiri)' : 'Akaunti Yangu (Username & Nenosiri)',
      labelEn: isVendor ? 'Vendor Account (Username & Password)' : 'My Account (Username & Password)',
      descSw: 'Hariri jina la mtumiaji (username), nenosiri na mawasiliano ya akaunti yako',
      descEn: 'Update your login username, credentials and contact details',
      icon: User,
      vendorOnly: false,
      ownerOnly: false,
      badge: currentUser?.username ? `@${currentUser.username}` : (isVendor ? '@admin' : 'Profile'),
      badgeColor: 'bg-indigo-100 text-indigo-800 font-mono',
    },
    // 1. System Info (Vendor Only)
    {
      id: 'company_info' as const,
      labelSw: 'Taarifa za Mfumo (About & Contacts)',
      labelEn: 'System Info (About & Contacts)',
      descSw: 'Kuhusu sisi, simu, WhatsApp, ofisi, anwani na mitandao ya kijamii',
      descEn: 'About us, phone numbers, WhatsApp support, office and portal footer',
      icon: Building2,
      vendorOnly: true,
      ownerOnly: false,
      badge: 'Vendor HQ',
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    // 2. Cloud VPS & FreeRADIUS (Vendor Only)
    {
      id: 'vps_devops' as const,
      labelSw: 'Cloud VPS & FreeRADIUS',
      labelEn: 'Cloud VPS & FreeRADIUS',
      descSw: 'DevOps, Ubuntu 22.04, VPN WireGuard & CoA Port 3799',
      descEn: 'Ubuntu 22.04 server, WireGuard VPN & RADIUS CoA',
      icon: Terminal,
      vendorOnly: true,
      ownerOnly: false,
      badge: 'Vendor HQ',
      badgeColor: 'bg-indigo-100 text-indigo-700',
    },
    // 3. All-in-One MikroTik Script (Hotspot Owner Only)
    {
      id: 'all_in_one_script' as const,
      labelSw: 'Script ya All-in-One (MikroTik)',
      labelEn: 'All-in-One Script (MikroTik)',
      descSw: 'Script kamili ya kuweka kwenye router yako kwa kubofya 1',
      descEn: 'One-click automated configuration script for your router',
      icon: FileCode2,
      vendorOnly: false,
      ownerOnly: true,
      badge: '1-Click Setup',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    // 4. Payment Gateway (Both Vendor & Owner)
    {
      id: 'payment_gateway' as const,
      labelSw: 'Payment Gateway (Geti la Malipo)',
      labelEn: 'Payment Gateway',
      descSw: 'DaliPay, PalmPay, AzamPay, Tigo/M-Pesa STK Push APIs',
      descEn: 'Automated mobile money gateways and merchant API keys',
      icon: CreditCard,
      vendorOnly: false,
      ownerOnly: false,
      badge: currentUser?.palmpesa_user_id || currentUser?.payout_channel ? 'Active' : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    // 5. Email & SMS Gateways (Both Vendor & Owner)
    {
      id: 'email_gateway' as const,
      labelSw: 'Email & SMS Gateways',
      labelEn: 'Email & SMS Gateways',
      descSw: 'Resend, SendGrid, Mailgun, Beem Africa & NextSMS OTP (Real Dispatch)',
      descEn: 'Real transactional email & Tanzania SMS for OTP verification',
      icon: Mail,
      vendorOnly: false,
      ownerOnly: false,
      badge: 'Real Dispatch',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    // 6. Database Schema (Vendor Only)
    {
      id: 'database_schema' as const,
      labelSw: 'Database & Uhifadhi wa VPS',
      labelEn: 'Database & VPS Storage',
      descSw: 'Muunganisho wa database, ukubwa wa faili, tables & SQL schema',
      descEn: 'Live database connection, tables, records & MySQL DDL',
      icon: Database,
      vendorOnly: true,
      ownerOnly: false,
      badge: 'CONNECTED',
      badgeColor: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    // 7. Factory Reset (Vendor Only)
    {
      id: 'factory_reset' as const,
      labelSw: 'Factory Reset (Live Launch)',
      labelEn: 'Factory Reset (Live Launch)',
      descSw: 'Safi data za majaribio na uzindue mfumo rasmi live',
      descEn: 'Purge test transactions/vouchers and retain Vendor Admin',
      icon: RotateCcw,
      vendorOnly: true,
      ownerOnly: false,
      badge: 'Vendor HQ',
      badgeColor: 'bg-rose-100 text-rose-700 font-bold',
    },
  ];

  // Filter accessible tabs based on role:
  // If Vendor: exclude ownerOnly tabs.
  // If Hotspot Owner: exclude vendorOnly tabs.
  const accessibleTabs = subTabs.filter((t) => {
    if (isVendor) {
      return !t.ownerOnly;
    }
    return !t.vendorOnly;
  });

  return (
    <div className="space-y-6">
      {/* Settings Module Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {lang === 'sw' ? 'Mipangilio ya Mfumo (Settings)' : 'System Settings'}
              </h2>
              {isVendor ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  👑 Vendor Master Access
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                  🏢 {currentUser?.business_name || 'Hotspot Owner'}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {isVendor
              ? lang === 'sw'
                ? 'Sanidi miundombinu ya seva ya Cloud VPS & FreeRADIUS, mageti ya malipo ya simu, seva za barua pepe na usanidi wa kiufundi.'
                : 'Configure Cloud VPS & FreeRADIUS server infrastructure, mobile payment gateways, transactional email APIs, and technical operations.'
              : lang === 'sw'
                ? 'Sanidi script ya MikroTik all-in-one, mageti ya malipo ya simu (PalmPesa, DaliPay) na barua pepe kwa ajili ya hotspot yako.'
                : 'Configure your all-in-one MikroTik script, mobile payment gateway, and SMS/Email settings.'}
          </p>
        </div>

        {/* Info pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-medium">
            {accessibleTabs.length} {lang === 'sw' ? 'Submodules Zinazopatikana' : 'Accessible Submodules'}
          </span>
        </div>
      </div>

      {/* Submodule Navigation Tab Bar */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        {accessibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive
                    ? tab.id === 'factory_reset'
                      ? 'text-rose-600'
                      : 'text-indigo-600'
                    : 'text-slate-400'
                }`}
              />
              <span>{lang === 'sw' ? tab.labelSw : tab.labelEn}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                    tab.badgeColor || 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Submodule Content */}
      <div className="transition-all duration-200">
        {/* Account Profile & Password (Both Vendor & Owner) */}
        {activeSubTab === 'account_profile' && (
          <VendorAccountSettingsTab
            currentUser={currentUser}
            onOwnerUpdated={onOwnerUpdated}
            lang={lang}
          />
        )}

        {/* 0. System Info (Vendor Only) */}
        {activeSubTab === 'company_info' && isVendor && (
          <CompanyInfoSettings
            lang={lang}
            onPreviewAbout={onPreviewAbout}
            onPreviewContact={onPreviewContact}
          />
        )}

        {/* 1. Cloud VPS & FreeRADIUS (Vendor Only) */}
        {activeSubTab === 'vps_devops' && isVendor && <VpsDevopsManager />}

        {/* 2. All-in-One MikroTik Script (Hotspot Owner Only) */}
        {activeSubTab === 'all_in_one_script' && !isVendor && (
          <OwnerAllInOneScript currentUser={currentUser} lang={lang} initialRouterId={selectedRouterId} />
        )}

        {/* 3. Payment Gateway (Both: PaymentConfig for Vendor, OwnerMerchantSettings for Owner) */}
        {activeSubTab === 'payment_gateway' && (
          isVendor ? (
            <PaymentConfig
              currentUser={currentUser}
              onOwnerUpdated={onOwnerUpdated}
              lang={lang}
            />
          ) : (
            <OwnerMerchantSettings
              owner={currentUser}
              onUpdated={(updatedOwner: HotspotOwner) => {
                if (onOwnerUpdated) onOwnerUpdated(updatedOwner);
              }}
              lang={lang}
            />
          )
        )}

        {/* 4. Email & SMS Gateways (Both, but OTP Toggle is visible only to Vendor) */}
        {activeSubTab === 'email_gateway' && (
          <EmailConfig lang={lang} isVendor={isVendor} />
        )}

        {/* 5. Database Schema (Vendor Only) */}
        {activeSubTab === 'database_schema' && isVendor && <MySQLSchemaViewer lang={lang} />}

        {/* 6. Factory Reset (Vendor Only) */}
        {activeSubTab === 'factory_reset' && isVendor && (
          <SystemResetManager
            onResetCompleted={onResetCompleted}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
};
