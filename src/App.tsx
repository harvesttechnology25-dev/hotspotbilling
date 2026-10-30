/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { CaptivePortal } from './components/CaptivePortal/CaptivePortal.tsx';
import { AdminDashboard } from './components/Admin/AdminDashboard.tsx';
import { LoginPage } from './components/Auth/LoginPage.tsx';
import { WelcomePage } from './components/Landing/WelcomePage.tsx';
import { SubscriptionGate } from './components/Subscription/SubscriptionGate.tsx';
import { AboutUsModal } from './components/Modals/AboutUsModal.tsx';
import { ContactUsModal } from './components/Modals/ContactUsModal.tsx';
import { HotspotOwner } from './types/index.ts';
import { Clock } from 'lucide-react';

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

  // Guard views: only authenticated users can access the portal preview;
  // and when logged in, keep user in admin/portal view (no welcome page)
  useEffect(() => {
    if (!currentUser && viewMode === 'portal') {
      handleSetViewMode('welcome');
    } else if (currentUser && viewMode === 'welcome') {
      handleSetViewMode('admin');
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

  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes (dakika 5)

  // 5-minute inactivity session tracking: auto logout if inactive
  useEffect(() => {
    if (!currentUser) return;

    lastActivityRef.current = Date.now();

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, updateActivity, { passive: true });
    });

    // Check every 5 seconds for inactivity expiration
    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        setCurrentUser(null);
        try {
          localStorage.removeItem('tzwifi_user');
          localStorage.removeItem('tzwifi_token');
        } catch {}
        setSessionExpiredNotice(true);
        handleSetViewMode('admin');
      }
    }, 5000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, updateActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: HotspotOwner) => {
    lastActivityRef.current = Date.now();
    setSessionExpiredNotice(false);
    setCurrentUser(user);
    try {
      localStorage.setItem('tzwifi_user', JSON.stringify(user));
    } catch {}
    handleSetViewMode('admin');
  };

  const handleLogout = () => {
    setSessionExpiredNotice(false);
    setCurrentUser(null);
    try {
      localStorage.removeItem('tzwifi_user');
      localStorage.removeItem('tzwifi_token');
    } catch {}
    handleSetViewMode('welcome');
  };

  const handleSwitchUser = (user: HotspotOwner) => {
    lastActivityRef.current = Date.now();
    setCurrentUser(user);
    try {
      localStorage.setItem('tzwifi_user', JSON.stringify(user));
    } catch {}
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

      {/* Session Expired Inactivity Notice Modal (5 minutes) */}
      {sessionExpiredNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center space-y-5 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-7 h-7 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold uppercase tracking-wider border border-amber-200">
                {lang === 'sw' ? 'Dakika 5 Bila Kazi' : '5 Minutes Inactivity'}
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {lang === 'sw' ? 'Muda wa Kikao Umekwisha' : 'Session Expired'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'sw'
                  ? 'Mfumo umekutoa kwenye akaunti kiotomatiki baada ya kutotumika kwa dakika 5 ili kulinda usalama wa data na akaunti yako.'
                  : 'You were automatically signed out after 5 minutes of inactivity to protect your account and data security.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSessionExpiredNotice(false);
                  handleSetViewMode('admin');
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#1b62b6] to-[#005ea9] hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {lang === 'sw' ? 'Ingia Tena Kwenye Akaunti' : 'Log In Again'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSessionExpiredNotice(false);
                  handleSetViewMode('welcome');
                }}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                {lang === 'sw' ? 'Nenda Ukurasa wa Mwanzo' : 'Go to Welcome Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
