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
  const [viewMode, setViewMode] = useState<'welcome' | 'portal' | 'admin'>('welcome');
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
  const [currentUser, setCurrentUser] = useState<HotspotOwner | null>(null);

  const handleSetLang = (newLang: 'sw' | 'en') => {
    setLang(newLang);
    try {
      localStorage.setItem('tzwifi_lang', newLang);
      localStorage.setItem('tzwifi_lang_explicit', 'true');
    } catch (e) {
      console.error('Failed to persist language preference:', e);
    }
  };

  // Restore session from localStorage if present
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
  }, []);

  const handleLoginSuccess = (user: HotspotOwner) => {
    setCurrentUser(user);
    localStorage.setItem('tzwifi_user', JSON.stringify(user));
    setViewMode('admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tzwifi_user');
    localStorage.removeItem('tzwifi_token');
    setViewMode('welcome');
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
        setViewMode={setViewMode}
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
            onNavigateLogin={() => setViewMode('admin')}
            onNavigateRegister={() => setViewMode('admin')}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            onOpenContact={() => setIsContactModalOpen(true)}
            lang={lang}
          />
        ) : viewMode === 'portal' ? (
          <CaptivePortal lang={lang} />
        ) : !currentUser ? (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onCancel={() => setViewMode('welcome')}
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
            onNavigatePortal={() => setViewMode('portal')}
            lang={lang}
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
            {viewMode === 'portal' ? (
              <button
                type="button"
                onClick={() => setViewMode('admin')}
                className="underline hover:text-slate-800 font-medium cursor-pointer"
              >
                {lang === 'sw' ? 'Msimamizi wa Mfumo (Admin Login)' : 'Network Admin Console'}
              </button>
            ) : currentUser ? (
              <button
                type="button"
                onClick={() => setViewMode('portal')}
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
        onGetStarted={() => setViewMode('admin')}
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
