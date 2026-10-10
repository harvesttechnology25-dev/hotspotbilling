import React, { useState, useEffect } from 'react';
import { Plan, NetworkProvider, PortalThemeConfig } from '../../types/index.ts';
import { PhoneInputWithDetection } from './PhoneInputWithDetection.tsx';
import { PackageCard } from './PackageCard.tsx';
import { PaymentModal } from './PaymentModal.tsx';
import { VoucherLogin } from './VoucherLogin.tsx';
import { ActiveSessionCard } from './ActiveSessionCard.tsx';
import { FreeTrialBanner } from './FreeTrialBanner.tsx';
import { CARRIERS, formatTzs, detectCarrierFromInput } from '../../utils/carrierInfo.ts';
import { DEFAULT_PORTAL_THEME } from '../../utils/themePresets.ts';
import {
  Wifi,
  ShieldCheck,
  Zap,
  ArrowRight,
  Radio,
  Lock,
  Headphones,
  CheckCircle2,
  Sparkles,
  Loader2,
  Laptop,
  AlertTriangle,
  X,
  AlertCircle,
  Tag,
  Globe,
  Flame,
  Rocket,
  Coffee,
  Shield,
  Phone,
} from 'lucide-react';

export interface CaptivePortalProps {
  lang: 'sw' | 'en';
  customTheme?: PortalThemeConfig;
  previewMode?: boolean;
  previewDevice?: 'mobile' | 'desktop';
  currentOwnerId?: number;
}

export const CaptivePortal: React.FC<CaptivePortalProps> = ({
  lang,
  customTheme,
  previewMode = false,
  previewDevice,
  currentOwnerId,
}) => {
  const [serverTheme, setServerTheme] = useState<PortalThemeConfig | null>(null);
  const activeTheme: PortalThemeConfig = customTheme || serverTheme || DEFAULT_PORTAL_THEME;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<NetworkProvider | null>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'voucher' | 'session'>('buy');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);

  // MikroTik Hotspot runtime parameters
  const [mikrotikParams, setMikrotikParams] = useState({
    mac: 'BC:D0:74:11:2E:8A',
    ip: '192.168.88.24',
    linkLogin: 'http://192.168.88.1/login',
    linkOrig: 'http://www.google.com',
    error: '',
    isRealHotspotRedirect: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const mac = p.get('mac');
      const ip = p.get('ip');
      const linkLogin = p.get('link-login') || p.get('link_login');
      const linkOrig = p.get('link-orig') || p.get('link_orig');
      const error = p.get('error');

      if (mac || ip || linkLogin) {
        setMikrotikParams({
          mac: mac || 'BC:D0:74:11:2E:8A',
          ip: ip || '192.168.88.24',
          linkLogin: linkLogin || 'http://192.168.88.1/login',
          linkOrig: linkOrig || 'http://www.google.com',
          error: error || '',
          isRealHotspotRedirect: true,
        });
      }
    }
  }, []);

  // Custom Owner Hotspot Branding & SSID
  const [portalInfo, setPortalInfo] = useState<{
    brandName: string;
    ssid: string;
    location: string;
    routerId?: number;
    ownerId?: number;
    ownerBusinessName?: string;
    hasPaymentGateway?: boolean;
    gatewayWarning?: string | null;
  }>({
    brandName: 'Kariakoo Cyber & WiFi Point',
    ssid: 'KARIAKOO-FREE-WIFI',
    location: 'Posta Mpya, Dar es Salaam',
  });

  useEffect(() => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    let rId = p?.get('routerId') || p?.get('router_id');
    let oId = p?.get('ownerId') || p?.get('owner_id');
    const ip = p?.get('ip') || mikrotikParams.ip;

    if (!oId && currentOwnerId) {
      oId = String(currentOwnerId);
    }
    // Detect logged in Hotspot Owner (e.g. Japhet) if testing portal from inside session
    if (!oId && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tzwifi_user');
        if (saved) {
          const u = JSON.parse(saved);
          if (u && u.id && u.role === 'HOTSPOT_OWNER') {
            oId = String(u.id);
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const query = new URLSearchParams();
    if (rId) query.set('routerId', rId);
    if (oId) query.set('ownerId', oId);
    if (ip) query.set('ip', ip);

    fetch(`/api/v1/portal/info?${query.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPortalInfo({
            brandName: data.brandName,
            ssid: data.ssid,
            location: data.location,
            routerId: data.routerId,
            ownerId: data.ownerId,
            ownerBusinessName: data.ownerBusinessName,
            hasPaymentGateway: data.hasPaymentGateway,
            gatewayWarning: data.gatewayWarning,
          });
          if (data.portalTheme) {
            setServerTheme(data.portalTheme);
          }
        }
      })
      .catch((e) => console.error('Failed to load portal info:', e));
  }, [mikrotikParams.ip]);
  
  // Payment initiation state
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [initiationError, setInitiationError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<{
    reference: string;
    instructions: string;
    carrier: NetworkProvider;
    plan: Plan;
  } | null>(null);

  // Connected state (can be saved in localStorage)
  const [activeSession, setActiveSession] = useState<{
    voucherCode: string;
    plan: Plan;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('tzwifi_active_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Fetch plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/v1/plans');
        if (res.ok) {
          const data: Plan[] = await res.json();
          const activePlans = data.filter((p) => p.is_active);
          setPlans(activePlans);
          if (activePlans.length > 0) {
            const defaultPlan = activePlans.find((p) => p.price === 1500) || activePlans[0];
            setSelectedPlanId(defaultPlan.id);
          }
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const handleOpenCheckout = (planId?: number) => {
    if (planId) {
      setSelectedPlanId(planId);
    }
    setInitiationError('');
    setCheckoutModalOpen(true);
  };

  // Handle initiate payment with automatic carrier detection
  const handleInitiatePayment = async () => {
    if (portalInfo.hasPaymentGateway === false) {
      setInitiationError(
        lang === 'sw'
          ? 'Mmiliki wa mtandao huu bado hajaweka geti la malipo. Tafadhali weka API ya malipo kwanza kwenye dashibodi ya mmiliki ili wateja waweze kulipia.'
          : 'Payment gateway API is not configured by the hotspot owner. Please set up API in the dashboard first.'
      );
      return;
    }

    if (!selectedPlanId) {
      setInitiationError(
        lang === 'sw'
          ? 'Tafadhali chagua kifurushi kwanza.'
          : 'Please select a package first.'
      );
      return;
    }

    if (!phoneNumber.trim()) {
      setInitiationError(
        lang === 'sw'
          ? 'Tafadhali weka nambari yako ya simu.'
          : 'Please enter your phone number.'
      );
      return;
    }

    const carrierToUse = selectedCarrier || detectCarrierFromInput(phoneNumber);
    if (!carrierToUse) {
      setInitiationError(
        lang === 'sw'
          ? 'Mtandao haujatambulika. Tafadhali hakikisha namba yako inaanza na 074/075/076 (Vodacom), 071/065/067 (Tigo), 078/068/069 (Airtel) au 062 (Halotel).'
          : 'Network not recognized. Please check phone number prefix.'
      );
      return;
    }

    setInitiatingPayment(true);
    setInitiationError('');

    try {
      const res = await fetch('/api/v1/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          networkProvider: carrierToUse,
          planId: selectedPlanId,
          routerId: portalInfo.routerId,
          ownerId: portalInfo.ownerId,
          macAddress: mikrotikParams.mac,
          userIp: mikrotikParams.ip,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Malipo hayakuweza kuanzishwa.');
      }

      if (selectedPlan) {
        setPaymentSession({
          reference: data.externalReference,
          instructions: data.instructions,
          carrier: carrierToUse,
          plan: selectedPlan,
        });
        setCheckoutModalOpen(false);
        setModalOpen(true);
      }
    } catch (err: any) {
      setInitiationError(err.message || 'Hitilafu ya kuanzisha malipo.');
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handlePaymentSuccess = (voucherCode: string, plan: Plan) => {
    const session = { voucherCode, plan };
    setActiveSession(session);
    try {
      localStorage.setItem('tzwifi_active_session', JSON.stringify(session));
    } catch {
      // ignore
    }
    setActiveTab('session');
  };

  const handleDisconnect = () => {
    setActiveSession(null);
    try {
      localStorage.removeItem('tzwifi_active_session');
    } catch {
      // ignore
    }
    setActiveTab('buy');
  };

  const isMobilePreview = previewMode && previewDevice === 'mobile';
  const isDesktopPreview = previewMode && previewDevice === 'desktop';

  const containerClass = previewMode
    ? isMobilePreview
      ? 'w-full max-w-full p-2.5 sm:p-3 space-y-3 overflow-hidden text-slate-900'
      : 'w-full max-w-full p-3 sm:p-4 space-y-3.5 overflow-hidden text-slate-900'
    : 'max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4';

  const gridColsClass = previewMode
    ? isMobilePreview
      ? 'grid grid-cols-1 gap-2.5'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';

  return (
    <div className={containerClass}>
      {/* MikroTik Hotspot Error Banner if redirected back with error */}
      {mikrotikParams.error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">Taarifa ya Router: </span>
            <span>{mikrotikParams.error}</span>
          </div>
        </div>
      )}

      {/* Captive Portal Top Hero Card */}
      <div
        style={{
          background:
            activeTheme.cardStyle === 'glassmorphism'
              ? 'rgba(15, 23, 42, 0.75)'
              : `linear-gradient(135deg, ${activeTheme.primaryColor} 0%, #0f172a 100%)`,
          borderColor: activeTheme.primaryColor,
          boxShadow:
            activeTheme.cardStyle === 'neo_brutalist'
              ? '5px 5px 0px #000000'
              : '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          borderWidth: activeTheme.cardStyle === 'neo_brutalist' ? '2px' : '1px',
          borderStyle: 'solid',
        }}
        className={`rounded-3xl ${isMobilePreview ? 'p-3.5' : 'p-4 sm:p-5'} text-white relative overflow-hidden backdrop-blur-md`}
      >
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-6 top-6 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white/90 max-w-full min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{portalInfo.location || 'MikroTik Hotspot'}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-white/90 font-mono bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 shrink-0">
              <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-bold">SSID: {portalInfo.ssid}</span>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
              }}
              className="w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner"
            >
              {activeTheme.customLogoUrl ? (
                <img
                  src={activeTheme.customLogoUrl}
                  alt="Logo"
                  className="w-8 h-8 object-contain rounded-lg"
                />
              ) : activeTheme.logoIcon === 'zap' ? (
                <Zap className="w-6 h-6 text-amber-300" />
              ) : activeTheme.logoIcon === 'radio' ? (
                <Radio className="w-6 h-6 text-emerald-300" />
              ) : activeTheme.logoIcon === 'globe' ? (
                <Globe className="w-6 h-6 text-sky-300" />
              ) : activeTheme.logoIcon === 'rocket' ? (
                <Rocket className="w-6 h-6 text-indigo-300" />
              ) : activeTheme.logoIcon === 'flame' ? (
                <Flame className="w-6 h-6 text-orange-400" />
              ) : activeTheme.logoIcon === 'shield' ? (
                <Shield className="w-6 h-6 text-teal-300" />
              ) : activeTheme.logoIcon === 'coffee' ? (
                <Coffee className="w-6 h-6 text-amber-200" />
              ) : activeTheme.logoIcon === 'sparkles' ? (
                <Sparkles className="w-6 h-6 text-yellow-300" />
              ) : (
                <Wifi className="w-6 h-6 text-emerald-300" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/15 text-white text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1.5 border border-white/20 max-w-full">
                <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                <span className="truncate">{activeTheme.badgeText || 'HOTSPOT YA UHAKIKA'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight break-words">
                {activeTheme.brandName || portalInfo.brandName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-md break-words leading-relaxed">
                {activeTheme.tagline ||
                  (lang === 'sw'
                    ? 'Lipa kirahisi kwa M-Pesa, Tigo Pesa, Airtel Money au Halopesa na upate intaneti papo hapo bila kusubiri!'
                    : 'Instant mobile money payments via M-Pesa, Tigo Pesa, Airtel Money, or Halopesa for immediate hotspot access!')}
              </p>
            </div>
          </div>

          {activeTheme.showSupportBadge && activeTheme.supportPhone && (
            <div className="flex items-center gap-2 text-xs text-white/90 bg-black/20 rounded-xl px-3 py-1.5 w-fit max-w-full">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                {lang === 'sw' ? 'Msaada wa Haraka: ' : 'Fast Support: '}
                <strong>{activeTheme.supportPhone}</strong>
              </span>
            </div>
          )}

          {/* Quick Carrier Logos Ribbon */}
          {activeTheme.showCarrierLogos && (
            <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-white/10 text-[11px] text-slate-200">
              <span className="text-white/70 font-medium whitespace-nowrap">
                {lang === 'sw' ? 'Mitandao Inayopokelewa:' : 'Accepted Carriers:'}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-bold">
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px]">M-Pesa</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-700 text-white text-[10px]">Tigo Pesa</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px]">Airtel</span>
                <span className="px-1.5 py-0.5 rounded bg-orange-600 text-white text-[10px]">Halopesa</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connected Device Info Bar */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Laptop className="w-4 h-4 text-slate-700 shrink-0" />
          <span className="truncate">
            {lang === 'sw' ? 'Kifaa chako:' : 'Your Device:'}{' '}
            <strong className="text-slate-800 font-mono">{mikrotikParams.mac}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>IP: {mikrotikParams.ip}</span>
        </div>
      </div>

      {/* 1-Click Free Trial (15 Minutes - Strictly Single Use per MAC Address) */}
      {!activeSession && (
        <FreeTrialBanner
          mac={mikrotikParams.mac}
          ip={mikrotikParams.ip}
          routerId={portalInfo.routerId}
          lang={lang}
          linkLogin={mikrotikParams.linkLogin}
          isRealHotspotRedirect={mikrotikParams.isRealHotspotRedirect}
          onClaimSuccess={handlePaymentSuccess}
        />
      )}

      {/* Navigation Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold text-slate-600 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('buy')}
          style={
            activeTab === 'buy'
              ? {
                  backgroundColor: '#ffffff',
                  color: activeTheme.primaryColor,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }
              : undefined
          }
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'buy' ? 'font-black' : 'hover:text-slate-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" style={{ color: activeTheme.primaryColor }} />
          <span>{lang === 'sw' ? 'Nunua Kifurushi' : 'Buy Package'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voucher')}
          style={
            activeTab === 'voucher'
              ? {
                  backgroundColor: '#ffffff',
                  color: activeTheme.primaryColor,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }
              : undefined
          }
          className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'voucher' ? 'font-black' : 'hover:text-slate-900'
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-slate-600" />
          <span>{lang === 'sw' ? 'Weka Vocha' : 'Enter Voucher'}</span>
        </button>

        {activeSession && (
          <button
            type="button"
            onClick={() => setActiveTab('session')}
            className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'session'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-700 hover:text-emerald-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lang === 'sw' ? 'Akaunti Yangu' : 'Active Session'}</span>
          </button>
        )}
      </div>

      {/* TAB CONTENT: ACTIVE SESSION */}
      {activeTab === 'session' && activeSession && (
        <ActiveSessionCard
          voucherCode={activeSession.voucherCode}
          plan={activeSession.plan}
          onDisconnect={handleDisconnect}
          lang={lang}
        />
      )}

      {/* TAB CONTENT: VOUCHER REDEEM */}
      {activeTab === 'voucher' && (
        <VoucherLogin
          onSuccess={handlePaymentSuccess}
          linkLogin={mikrotikParams.linkLogin}
          linkOrig={mikrotikParams.linkOrig}
          macAddress={mikrotikParams.mac}
          lang={lang}
        />
      )}

      {/* TAB CONTENT: BUY PACKAGE */}
      {activeTab === 'buy' && (
        <div className="space-y-4">
          {portalInfo.hasPaymentGateway === false && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">
                  {lang === 'sw'
                    ? '⚠️ Malipo ya Simu Yanasubiri Kuamilishwa'
                    : '⚠️ Mobile Payments Pending Setup'}
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                  {lang === 'sw'
                    ? 'Mmiliki wa mtandao huu bado hajaweka API ya malipo. Kama una vocha ya karatasi, bofya "Weka Vocha" hapo juu ili kujiunga mara moja.'
                    : 'The hotspot owner has not configured their payment API yet. If you have a paper voucher, click "Enter Voucher" above to connect.'}
                </p>
              </div>
            </div>
          )}

          {/* Package Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {lang === 'sw' ? 'Chagua Kifurushi cha Wi-Fi' : 'Choose Your Wi-Fi Package'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {lang === 'sw' ? 'Intaneti ya Kasi Bila Kikomo' : 'Unlimited High-Speed'}
              </span>
            </div>

            {loadingPlans ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-xs">
                  {lang === 'sw' ? 'Inapakia vifurushi...' : 'Loading packages...'}
                </span>
              </div>
            ) : (
              <div className={gridColsClass}>
                {plans.map((plan) => (
                  <PackageCard
                    key={plan.id}
                    plan={plan}
                    isSelected={selectedPlanId === plan.id}
                    onSelect={() => setSelectedPlanId(plan.id)}
                    onPayNow={() => handleOpenCheckout(plan.id)}
                    lang={lang}
                    theme={activeTheme}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Prominent "Lipia Sasa" Action Button */}
          {selectedPlan && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleOpenCheckout(selectedPlan.id)}
                style={{
                  backgroundColor: activeTheme.primaryColor,
                  boxShadow:
                    activeTheme.cardStyle === 'neo_brutalist'
                      ? '4px 4px 0px #000000'
                      : `0 10px 25px -5px ${activeTheme.primaryColor}50`,
                }}
                className="w-full py-3.5 px-4 sm:py-4 sm:px-5 rounded-2xl active:scale-98 text-white font-black text-sm sm:text-base transition flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 group cursor-pointer"
              >
                <div className="text-left min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-indigo-200 block font-bold leading-tight">
                    {lang === 'sw' ? 'Kifurushi Kilichochaguliwa' : 'Selected Package'}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-white truncate block">
                    {selectedPlan.name.split('(')[0]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition shrink-0">
                  <span className="font-extrabold text-xs sm:text-sm whitespace-nowrap">
                    {lang === 'sw' ? `Lipia Sasa (${formatTzs(selectedPlan.price)})` : `Pay Now (${formatTzs(selectedPlan.price)})`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </button>
            </div>
          )}

          {/* Option: Una vocha ya karatasi tayari? */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1 break-words">
                <span className="font-bold text-slate-800 block break-words">
                  {lang === 'sw' ? 'Una vocha ya karatasi tayari?' : 'Already have a paper voucher?'}
                </span>
                <span className="text-[11px] text-slate-500 block break-words">
                  {lang === 'sw' ? 'Weka namba ya vocha upate intaneti papo hapo.' : 'Enter your voucher code to connect instantly.'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('voucher')}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:border-indigo-400 text-indigo-700 font-bold text-xs hover:bg-indigo-50 transition shadow-2xs whitespace-nowrap shrink-0 self-stretch sm:self-auto text-center"
            >
              {lang === 'sw' ? 'Weka Vocha' : 'Enter Voucher'}
            </button>
          </div>

          {/* Guarantee Badges */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-[11px] text-slate-600 pt-1">
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center min-w-0 overflow-hidden break-words">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 mb-1 shrink-0" />
              <span className="font-semibold text-slate-800 truncate max-w-full">
                {lang === 'sw' ? 'Kasi Kubwa' : 'High Speed'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate max-w-full">QoS Priority</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center min-w-0 overflow-hidden break-words">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 mb-1 shrink-0" />
              <span className="font-semibold text-slate-800 truncate max-w-full">
                {lang === 'sw' ? 'Malipo Salama' : '100% Secure'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate max-w-full">M-Pesa & Tigo</span>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center min-w-0 overflow-hidden break-words">
              <Headphones className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 mb-1 shrink-0" />
              <span className="font-semibold text-slate-800 truncate max-w-full">
                {lang === 'sw' ? 'Msaada 24/7' : '24/7 Support'}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 truncate max-w-full">WhatsApp/Call</span>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Phone Input Modal (Inafunguka akibonyeza Lipia Sasa) */}
      {checkoutModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                    {lang === 'sw' ? 'Malipo ya Simu (USSD Push)' : 'Direct Mobile Checkout'}
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    {lang === 'sw' ? 'Lipia Kifurushi' : 'Checkout Package'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {selectedPlan.name.split('(')[0]}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Package Summary Card */}
              <div className="mt-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 flex items-center justify-between border border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-slate-300 block uppercase font-bold">Kiasi cha Kulipa</span>
                  <span className="text-lg font-black text-white font-mono">{formatTzs(selectedPlan.price)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-300 block uppercase font-bold">Kasi ya Kifurushi</span>
                  <span className="text-xs font-bold text-emerald-400">{selectedPlan.rate_limit} • Kasi ya Juu</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 space-y-4">
              {portalInfo.hasPaymentGateway === false && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">
                      {lang === 'sw' ? 'Geti la Malipo Halijawekwa' : 'Payment API Not Configured'}
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5 leading-relaxed">
                      {lang === 'sw'
                        ? 'Mmiliki wa mtandao huu bado hajaweka API ya malipo. Tafadhali weka API kwanza au tumia vocha ya karatasi hapo chini.'
                        : 'The hotspot owner has not configured their payment API yet. Please set up API in dashboard or enter a voucher.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Phone Input with Live Carrier Detection */}
              <div className="space-y-2">
                <PhoneInputWithDetection
                  value={phoneNumber}
                  onChange={(val) => {
                    setPhoneNumber(val);
                    const detected = detectCarrierFromInput(val);
                    if (detected) setSelectedCarrier(detected);
                  }}
                  selectedCarrier={selectedCarrier}
                  onCarrierDetected={(carrier: NetworkProvider) => setSelectedCarrier(carrier)}
                  lang={lang}
                />

                {/* Live Detected Carrier Display */}
                {selectedCarrier && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold">Mtandao Uliotambuliwa: </span>
                        <span>{CARRIERS[selectedCarrier].name}</span>
                      </div>
                    </div>
                    <span
                      className="px-2.5 py-0.5 rounded text-[10px] font-bold text-white shadow-2xs"
                      style={{ backgroundColor: CARRIERS[selectedCarrier].brandColor }}
                    >
                      {CARRIERS[selectedCarrier].name}
                    </span>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {initiationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{initiationError}</span>
                </div>
              )}

              {/* Pay Button */}
              <button
                type="button"
                disabled={initiatingPayment || !phoneNumber.trim()}
                onClick={handleInitiatePayment}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2"
              >
                {initiatingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'sw' ? 'Inatuma USSD Push kwenye simu yako...' : 'Sending USSD Push to phone...'}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {lang === 'sw'
                        ? `Lipa ${formatTzs(selectedPlan.price)} Sasa`
                        : `Pay ${formatTzs(selectedPlan.price)} Now`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Bottom Option: "AU WEKA VOCHA" */}
              <div className="pt-3 border-t border-slate-100 text-center space-y-2">
                <span className="text-xs text-slate-500 block">
                  {lang === 'sw' ? 'Au unayo vocha ya karatasi?' : 'Or do you have a paper voucher?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCheckoutModalOpen(false);
                    setActiveTab('voucher');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-200 flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'sw' ? '🎟️ Au Weka Nambari ya Vocha Hapa' : '🎟️ Or Enter Voucher Code Instead'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {paymentSession && (
        <PaymentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          externalReference={paymentSession.reference}
          phoneNumber={phoneNumber}
          carrier={paymentSession.carrier}
          plan={paymentSession.plan}
          instructions={paymentSession.instructions}
          linkLogin={mikrotikParams.linkLogin}
          linkOrig={mikrotikParams.linkOrig}
          clientMac={mikrotikParams.mac}
          onPaymentSuccess={handlePaymentSuccess}
          lang={lang}
        />
      )}
    </div>
  );
};
