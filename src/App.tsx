/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { CaptivePortal } from './components/CaptivePortal/CaptivePortal.tsx';
import { AdminDashboard } from './components/Admin/AdminDashboard.tsx';
import { LoginPage } from './components/Auth/LoginPage.tsx';
import { WelcomePage } from './components/Landing/WelcomePage.tsx';
import { SubscriptionGate } from './components/Subscription/SubscriptionGate.tsx';
import { AboutUsModal } from './components/Modals/AboutUsModal.tsx';
import { ContactUsModal } from './components/Modals/ContactUsModal.tsx';
import { HotspotOwner } from './types/index.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<HotspotOwner | null>(() => {
    try {
      const saved = localStorage.getItem('tzwifi_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved session synchronously:', e);
    }
    return null;
  });

  const [viewMode, setViewMode] = useState<'welcome' | 'portal' | 'admin'>(() => {
    try {
      const savedUser = localStorage.getItem('tzwifi_user');
      const savedView = localStorage.getItem('tzwifi_view_mode') as 'welcome' | 'portal' | 'admin' | null;
      if (savedView && ['welcome', 'portal', 'admin'].includes(savedView)) {
        if (savedView === 'portal' && !savedUser) {
          return 'welcome';
        }
        return savedView;
      }
      if (savedUser) {
        return 'admin';
      }
    } catch (e) {
      console.error('Failed to read saved viewMode:', e);
    }
    return 'welcome';
  });

  const [lang, setLang] = useState<'sw' | 'en'>(() => {
    try {
      const explicitChoice = localStorage.getItem('tzwifi_lang_explicit');
      if (explicitChoice === 'true') {
        const savedLang = localStorage.getItem('tzwifi_lang');
        if (savedLang === 'sw' || savedLang === 'en') {
          return savedLang;
        }
      }
    } catch (e) {
      console.error('Failed to read saved language:', e);
    }
    return 'en';
  });

  const [adminInitialTab, setAdminInitialTab] = useState<string | undefined>(undefined);
  const [selectedSiteRouterId, setSelectedSiteRouterId] = useState<number | 'ALL'>(() => {
    try {
      const saved = localStorage.getItem('tzwifi_active_site_id');
      if (saved === 'ALL') return 'ALL';
      if (saved && !isNaN(Number(saved))) return Number(saved);
    } catch {}
    return 'ALL';
  });

  const handleSiteChange = (newSiteId: number | 'ALL') => {
    setSelectedSiteRouterId(newSiteId);
    try {
      localStorage.setItem('tzwifi_active_site_id', String(newSiteId));
    } catch {}
  };

  const handleSetLang = (newLang: 'sw' | 'en') => {
    setLang(newLang);
    try {
      localStorage.setItem('tzwifi_lang', newLang);
      localStorage.setItem('tzwifi_lang_explicit', 'true');
    } catch (e) {
      console.error('Failed to persist language preference:', e);
    }
  };

  const handleSetViewMode = (newMode: 'welcome' | 'portal' | 'admin') => {
    setViewMode(newMode);
    try {
      localStorage.setItem('tzwifi_view_mode', newMode);
    } catch (e) {
      console.error('Failed to persist viewMode preference:', e);
    }
  };

  // Guard portal view: only authenticated users can access the portal preview
  useEffect(() => {
    if (!currentUser && viewMode === 'portal') {
      handleSetViewMode('welcome');
    }
  }, [currentUser, viewMode]);

  // Restore session from localStorage if updated externally or via event
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tzwifi_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse saved session:', e);
    }

    const handleUserUpdate = (e: any) => {
      if (e?.detail && e.detail.id) {
        setCurrentUser(e.detail);
        try {
          localStorage.setItem('tzwifi_user', JSON.stringify(e.detail));
        } catch {}
      }
    };
    window.addEventListener('tzwifi_user_updated', handleUserUpdate as EventListener);
    return () => {
      window.removeEventListener('tzwifi_user_updated', handleUserUpdate as EventListener);
    };
  }, []);

  const handleLoginSuccess = (user: HotspotOwner) => {
    setCurrentUser(user);
    localStorage.setItem('tzwifi_user', JSON.stringify(user));
    handleSetViewMode('admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tzwifi_user');
    localStorage.removeItem('tzwifi_token');
    handleSetViewMode('welcome');
  };

  const handleSwitchUser = (user: HotspotOwner) => {
    setCurrentUser(user);
    localStorage.setItem('tzwifi_user', JSON.stringify(user));
  };

  const isOwnerExpired = Boolean(
    currentUser &&
      currentUser.role === 'HOTSPOT_OWNER' &&
      (currentUser.subscription_status === 'EXPIRED' ||
        (currentUser.subscription_expires_at &&
          new Date(currentUser.subscription_expires_at).getTime() <= Date.now()))
  );

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-[#f8a30a] selection:text-slate-950">
      {/* Top Header */}
      <Navbar
        viewMode={viewMode}
        setViewMode={handleSetViewMode}
        lang={lang}
        setLang={handleSetLang}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onOpenContact={() => setIsContactModalOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {viewMode === 'welcome' ? (
          <WelcomePage
            onNavigateLogin={() => handleSetViewMode('admin')}
            onNavigateRegister={() => handleSetViewMode('admin')}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            onOpenContact={() => setIsContactModalOpen(true)}
            lang={lang}
          />
        ) : viewMode === 'portal' && currentUser ? (
          <CaptivePortal
            lang={lang}
            currentOwnerId={currentUser.id}
            selectedRouterId={currentUser.role === 'VENDOR_ADMIN' ? 'ALL' : selectedSiteRouterId}
            onNavigateAddRouter={() => {
              setAdminInitialTab('routers');
              handleSetViewMode('admin');
            }}
          />
        ) : !currentUser ? (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => handleSetViewMode('welcome')}
            lang={lang}
          />
        ) : isOwnerExpired ? (
          <SubscriptionGate
            owner={currentUser}
            onRenewSuccess={(updated) => {
              setCurrentUser(updated);
              try {
                localStorage.setItem('tzwifi_user', JSON.stringify(updated));
              } catch (e) {
                console.error(e);
              }
            }}
            onLogout={handleLogout}
            lang={lang}
          />
        ) : (
          <AdminDashboard
            currentUser={currentUser}
            onLogout={handleLogout}
            onSwitchUser={handleSwitchUser}
            onNavigatePortal={() => handleSetViewMode('portal')}
            lang={lang}
            initialTab={adminInitialTab}
            selectedSiteRouterId={selectedSiteRouterId}
            onSiteChange={handleSiteChange}
            onClearInitialTab={() => setAdminInitialTab(undefined)}
          />
        )}
      </main>

      {/* Bottom Footer (shown on portal and admin) */}
      {viewMode !== 'welcome' && (
        <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>TZ-WiFi Billing System v2.6 • MikroTik RouterOS v6/v7 Compatible</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600">
            <span>Vodacom M-Pesa</span>
            <span>•</span>
            <span>Tigo Pesa</span>
            <span>•</span>
            <span>Airtel Money</span>
            <span>•</span>
            <span>Halopesa</span>
            <span>•</span>
            <span>AzamPay Unified Gateway</span>
          </div>

          <div className="text-[11px] text-slate-600">
            {viewMode === 'portal' && currentUser ? (
              <button
                type="button"
                onClick={() => handleSetViewMode('admin')}
                className="underline hover:text-slate-800 font-medium cursor-pointer"
              >
                {lang === 'sw' ? 'Rudi Kwenye Dashibodi' : 'Return to Admin Console'}
              </button>
            ) : currentUser ? (
              <button
                type="button"
                onClick={() => handleSetViewMode('portal')}
                className="underline hover:text-slate-800 font-medium cursor-pointer"
              >
                {lang === 'sw' ? 'Tazama Captive Portal Yangu' : 'Switch to Customer Portal'}
              </button>
            ) : null}
          </div>
        </div>
      </footer>
      )}

      {/* Global Modals for About Us & Contact Us */}
      <AboutUsModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        onOpenContact={() => {
          setIsAboutModalOpen(false);
          setIsContactModalOpen(true);
        }}
        onGetStarted={() => handleSetViewMode('admin')}
        lang={lang}
      />

      <ContactUsModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onOpenAbout={() => {
          setIsContactModalOpen(false);
          setIsAboutModalOpen(true);
        }}
        lang={lang}
      />
    </div>
  );
}
