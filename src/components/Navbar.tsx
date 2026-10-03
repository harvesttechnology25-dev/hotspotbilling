import React, { useState } from 'react';
import {
  Wifi,
  Smartphone,
  Monitor,
  LogOut,
  Building,
  Shield,
  Home,
  Menu,
  X,
  User,
  ChevronDown,
  Info,
  Phone,
} from 'lucide-react';
import { HotspotOwner } from '../types/index.ts';
import { AboutUsModal } from './Modals/AboutUsModal.tsx';
import { ContactUsModal } from './Modals/ContactUsModal.tsx';

interface NavbarProps {
  viewMode: 'welcome' | 'portal' | 'admin';
  setViewMode: (mode: 'welcome' | 'portal' | 'admin') => void;
  lang: 'sw' | 'en';
  setLang: (lang: 'sw' | 'en') => void;
  currentUser?: HotspotOwner | null;
  onLogout?: () => void;
  onOpenAbout?: () => void;
  onOpenContact?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewMode,
  setViewMode,
  lang,
  setLang,
  currentUser,
  onLogout,
  onOpenAbout,
  onOpenContact,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const isVendor = currentUser?.role === 'VENDOR_ADMIN';

  const handleNavigate = (mode: 'welcome' | 'portal' | 'admin') => {
    setViewMode(mode);
    setMobileMenuOpen(false);
  };

  const handleOpenAbout = () => {
    if (onOpenAbout) onOpenAbout();
    else setIsAboutModalOpen(true);
  };

  const handleOpenContact = () => {
    if (onOpenContact) onOpenContact();
    else setIsContactModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Name */}
          <button
            type="button"
            onClick={() => handleNavigate('welcome')}
            className="flex items-center gap-2 sm:gap-3 text-left cursor-pointer group shrink-0 min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#1b62b6] to-[#005ea9] text-white flex items-center justify-center shadow-md shadow-blue-600/20 group-hover:scale-105 transition shrink-0">
              <Wifi className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight font-['Sora',sans-serif] truncate">
                  INFOTECH WiFi
                </span>
                <span className="hidden xs:inline-block px-1.5 sm:px-2 py-0.5 rounded-full bg-[#f8a30a]/20 text-[#a36803] text-[9px] sm:text-[10px] font-black tracking-wider uppercase shrink-0">
                  MikroTik
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden md:block truncate">
                Multi-Carrier Billing & Hotspot Platform • Tanzania
              </p>
            </div>
          </button>

          {/* Center Navigation Buttons: About Us & Contacts */}
          <div className="hidden md:flex items-center gap-2 mx-auto">
            <button
              type="button"
              onClick={handleOpenAbout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/70 hover:border-indigo-200 text-slate-800 hover:text-indigo-900 font-bold text-xs shadow-2xs hover:shadow-xs transition cursor-pointer min-h-[36px]"
              title={lang === 'sw' ? 'Taarifa kuhusu sisi na mfumo wetu' : 'Learn more about us and our platform'}
            >
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'sw' ? 'Kuhusu Sisi' : 'About Us'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenContact}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold text-xs shadow-2xs hover:shadow-xs transition cursor-pointer min-h-[36px]"
              title={lang === 'sw' ? 'Wasiliana nasi kwa simu na WhatsApp' : 'Get in touch via phone and WhatsApp'}
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'sw' ? 'Mawasiliano' : 'Contacts'}</span>
            </button>
          </div>

        {/* Desktop & Tablet Controls (Hidden on small mobile) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          {/* Active User Badge & Logout */}
          {currentUser && (
            <div className="flex items-center gap-2 pr-1 border-r border-slate-200">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                {isVendor ? (
                  <Shield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                ) : (
                  <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <div className="max-w-[130px] lg:max-w-[170px] truncate text-slate-800 font-bold text-[11px]">
                  {isVendor ? 'Vendor HQ' : currentUser.business_name}
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs shadow-2xs transition cursor-pointer min-h-[36px]"
                  title={lang === 'sw' ? 'Ondoka kwenye akaunti' : 'Sign out'}
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden lg:inline">{lang === 'sw' ? 'Ondoka' : 'Logout'}</span>
                </button>
              )}
            </div>
          )}

          {/* Language Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                lang === 'en' ? 'bg-white text-indigo-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              🇬🇧 EN
            </button>
            <button
              type="button"
              onClick={() => setLang('sw')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                lang === 'sw' ? 'bg-white text-indigo-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              🇹🇿 SW
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => handleNavigate('welcome')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer min-h-[36px] ${
                viewMode === 'welcome'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Mwanzo' : 'Home'}</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => handleNavigate('portal')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer min-h-[36px] ${
                  viewMode === 'portal'
                    ? 'bg-[#1b62b6] text-white shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Portal</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavigate('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer min-h-[36px] ${
                viewMode === 'admin'
                  ? 'bg-[#f8a30a] text-slate-950 font-black shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>
                {currentUser
                  ? isVendor
                    ? 'Vendor HQ'
                    : lang === 'sw'
                    ? 'Dashibodi'
                    : 'Dashboard'
                  : lang === 'sw'
                  ? 'Ingia'
                  : 'Login'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Compact Controls (< 768px) */}
        <div className="flex md:hidden items-center gap-1.5">
          {/* Language Switcher */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}
              className="px-2 py-1 rounded-lg bg-white shadow-2xs text-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <span>{lang === 'sw' ? '🇹🇿 SW' : '🇬🇧 EN'}</span>
            </button>
          </div>

          {/* Quick Active Mode Switcher Pill */}
          <button
            type="button"
            onClick={() => handleNavigate(viewMode === 'admin' ? 'welcome' : 'admin')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs min-h-[36px] ${
              viewMode === 'admin'
                ? 'bg-[#f8a30a] text-slate-950'
                : 'bg-[#1b62b6] text-white'
            }`}
          >
            {viewMode === 'admin' ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>{currentUser ? (isVendor ? 'HQ' : 'Admin') : 'Ingia'}</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span>Admin</span>
              </>
            )}
          </button>

          {/* Mobile Menu Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Sheet Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          {/* Current User Info (if logged in) */}
          {currentUser && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                    isVendor ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                >
                  {isVendor ? 'HQ' : currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    {isVendor ? 'Vendor Master Admin' : currentUser.business_name}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{lang === 'sw' ? 'Ondoka' : 'Logout'}</span>
                </button>
              )}
            </div>
          )}

          {/* Navigation Buttons List */}
          <div className={`grid gap-2 ${currentUser ? "grid-cols-3" : "grid-cols-2"}`}>
            <button
              type="button"
              onClick={() => handleNavigate('welcome')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                viewMode === 'welcome'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Mwanzo' : 'Home'}</span>
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={() => handleNavigate('portal')}
                className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                  viewMode === 'portal'
                    ? 'bg-[#1b62b6] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Captive Portal</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleNavigate('admin')}
              className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                viewMode === 'admin'
                  ? 'bg-[#f8a30a] text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>
                {currentUser
                  ? isVendor
                    ? 'Vendor HQ'
                    : lang === 'sw'
                    ? 'Dashibodi'
                    : 'Dashboard'
                  : lang === 'sw'
                  ? 'Ingia / Jisajili'
                  : 'Login / Register'}
              </span>
            </button>
          </div>

          {/* Quick Mobile About Us & Contacts */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenAbout();
              }}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-indigo-600" />
              <span>{lang === 'sw' ? 'Kuhusu Sisi' : 'About Us'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenContact();
              }}
              className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'sw' ? 'Mawasiliano' : 'Contacts'}</span>
            </button>
          </div>
        </div>
      )}
    </header>

    {/* Fallback Modals if not controlled externally */}
    {!onOpenAbout && (
      <AboutUsModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        onOpenContact={() => {
          setIsAboutModalOpen(false);
          setIsContactModalOpen(true);
        }}
        onGetStarted={() => handleNavigate('admin')}
        lang={lang}
      />
    )}

    {!onOpenContact && (
      <ContactUsModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onOpenAbout={() => {
          setIsContactModalOpen(false);
          setIsAboutModalOpen(true);
        }}
        lang={lang}
      />
    )}
  </>
  );
};
