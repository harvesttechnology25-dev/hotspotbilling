import React, { useState, useEffect } from 'react';
import {
  Wifi,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Activity,
  ChevronRight,
  Layers,
  Coins,
  Receipt,
  Users,
  Server,
  Globe,
  Star,
  ExternalLink,
  Calculator,
  TrendingUp,
  Radio,
  Sliders,
  Check,
  Clock,
  Gauge,
  CreditCard,
  MapPin,
  UserCheck,
  Sparkles,
  Package,
  Gift,
} from 'lucide-react';
import {
  SubscriptionPackage,
  TenantFreeTrialSettings,
  DEFAULT_TENANT_FREE_TRIAL_SETTINGS,
} from '../../types/index.ts';

interface WelcomePageProps {
  onNavigateLogin: () => void;
  onNavigateRegister: () => void;
  onOpenAbout?: () => void;
  onOpenContact?: () => void;
  lang?: 'sw' | 'en';
}

const DEFAULT_WELCOME_PACKAGES: SubscriptionPackage[] = [
  {
    id: 1,
    name: 'Starter WiFi',
    price: 15000,
    billing_cycle_days: 30,
    max_routers_ap: 2,
    max_users: 500,
    max_sites: 1,
    max_staff_accounts: 2,
    badge: 'STARTER',
    description_sw: 'Inafaa kwa Hotspot moja, cafe, kibanda cha simu, au eneo dogo lenye router 1-2.',
    description_en: 'Ideal for single hotspot setups, cafes, or small kiosks with 1-2 routers.',
    features: [
      'Routers & Access Points: Hadi 2',
      'Wateja / Vouchers: Hadi 500',
      'Maeneo / Sites: Eneo 1 (1 Site)',
      'Akaunti za Wahudumu: Wahudumu 2 (Staff)',
      'Malipo ya Simu (M-Pesa, Tigo, Airtel, Halo)',
      'Captive Portal ya Kisasa yenye Nembo Yako',
      'Ripoti za Mauzo ya Kila Siku & Mwezi',
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 2,
    name: 'Business Pro',
    price: 35000,
    billing_cycle_days: 30,
    max_routers_ap: 5,
    max_users: 2000,
    max_sites: 3,
    max_staff_accounts: 5,
    badge: 'POPULAR',
    description_sw: 'Kifurushi maarufu zaidi! Inafaa kwa migahawa mikubwa, hoteli, stendi za mabasi na maeneo ya biashara.',
    description_en: 'Most popular! Perfect for restaurants, medium hotels, bus terminals, and busy venues.',
    features: [
      'Routers & Access Points: Hadi 5',
      'Wateja / Vouchers: Hadi 2,000',
      'Maeneo / Sites: Maeneo 3 (3 Sites)',
      'Akaunti za Wahudumu: Wahudumu 5 (Staff)',
      'Usaidizi wa MikroTik & TP-Link Omada',
      'Usimamizi wa Kasi (Bandwidth Speed Limit)',
      'STK Push ya Papo Hapo & SMS Alerts',
      'Msaada wa Kiufundi wa Haraka (Priority Support)',
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: 3,
    name: 'Enterprise Fleet',
    price: 75000,
    billing_cycle_days: 30,
    max_routers_ap: -1,
    max_users: -1,
    max_sites: -1,
    max_staff_accounts: -1,
    badge: 'BEST_VALUE',
    description_sw: 'Uwezo mkubwa bila kikomo kwa watoa huduma wa ISP, vyuo, kampuni kubwa, na minara ya WiFi.',
    description_en: 'Unlimited power for WISP providers, universities, large enterprises, and WiFi tower fleets.',
    features: [
      'Routers & Access Points: Bila Kikomo (Unlimited)',
      'Wateja / Vouchers: Bila Kikomo (Unlimited)',
      'Maeneo / Sites: Bila Kikomo (Unlimited)',
      'Akaunti za Wahudumu: Bila Kikomo (Unlimited)',
      'Full Cloud RADIUS AAA Server Integration',
      'Remote Cloud VPN ya Kudhibiti Routers Popote',
      'Mfumo Mahususi wa Anti-Tethering (Zuia Wizi)',
      'Meneja Mahsusi wa Akaunti 24/7 Dedicated Support',
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onNavigateLogin,
  onNavigateRegister,
  onOpenAbout,
  onOpenContact,
  lang = 'en',
}) => {
  // Subscription Packages State
  const [subscriptionPackages, setSubscriptionPackages] = useState<SubscriptionPackage[]>(DEFAULT_WELCOME_PACKAGES);
  const [freeTrialSettings, setFreeTrialSettings] = useState<TenantFreeTrialSettings | null>(null);

  useEffect(() => {
    fetch('/api/v1/subscription/packages')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSubscriptionPackages(data);
        }
      })
      .catch((_) => {
        // Fallback already pre-loaded
      });

    fetch('/api/v1/subscription/free-trial')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.enabled === 'boolean') {
          setFreeTrialSettings(data);
        }
      })
      .catch((_) => {});
  }, []);

  // Interactive Hotspot Revenue Calculator state
  const [dailyUsers, setDailyUsers] = useState<number>(60);
  const [ticketPrice, setTicketPrice] = useState<number>(1000);

  const estimatedDailyRevenue = dailyUsers * ticketPrice;
  const estimatedMonthlyRevenue = estimatedDailyRevenue * 30;
  const estimatedProfit = Math.round(estimatedMonthlyRevenue * 0.85); // minus approx ISP cost

  return (
    <div className="min-h-screen bg-[#030d1a] text-slate-100 font-sans selection:bg-[#f8a30a] selection:text-slate-950 overflow-x-hidden relative">
      {/* 
        =======================================================================
        BACKGROUND: Modern Technology Image with Blur & Deep Sapphire Gradient
        =======================================================================
      */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* High-Resolution Enterprise Fiber Optic & Datacenter Image with Blur */}
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-[10px] scale-105 transform-gpu opacity-45 transition-opacity duration-1000"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=2560&q=85')",
          }}
        />

        {/* Deep Sapphire Midnight Dark Overlay for Perfect Contrast and Legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(3, 11, 24, 0.88) 0%, rgba(5, 18, 38, 0.82) 40%, rgba(2, 8, 18, 0.95) 100%)',
          }}
        />

        {/* Ambient Glowing Neon Light Orbs for Rich Atmospheric Depth */}
        <div className="absolute top-0 right-1/4 w-[750px] h-[750px] rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 left-0 w-[650px] h-[650px] rounded-full bg-[#f8a30a]/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[750px] h-[750px] rounded-full bg-blue-600/15 blur-[150px] pointer-events-none" />
      </div>

      {/* 
        =======================================================================
        MAIN CONTENT: Expansive Full-Page Layout (w-full max-w-[1650px] mx-auto)
        =======================================================================
      */}
      <div className="relative z-10 flex flex-col space-y-12 sm:space-y-16 lg:space-y-20 pt-6 sm:pt-10 pb-16">
        
        {/* 1. HERO SECTION */}
        <section className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
            
            {/* Left Column: Headline, Description, Action Buttons & Hero Stats */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-center lg:text-left">
              
              {/* Eyebrow Live Status Pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 border border-cyan-400/30 text-cyan-300 text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md shadow-lg shadow-cyan-950/30">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>
                  {lang === 'sw'
                    ? 'Mfumo wa Kisasa wa WiFi Hotspot & MikroTik Tanzania'
                    : 'Next-Gen Hotspot Billing & MikroTik Cloud for Tanzania'}
                </span>
              </div>

              {/* Main Punchy Heading spanning smoothly across available width */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl xl:text-6xl font-black text-white tracking-tight leading-[1.14] font-['Sora',sans-serif]">
                {lang === 'sw' ? (
                  <>
                    Dhibiti Hotspot, Malipo ya Simu Na MikroTik Yako Kwa{' '}
                    <span className="text-[#f8a30a] underline decoration-[#f8a30a]/40 decoration-wavy decoration-2">
                      Urahisi wa Kisasa
                    </span>
                  </>
                ) : (
                  <>
                    Automate Hotspot Billing, Mobile Money And MikroTik With{' '}
                    <span className="text-[#f8a30a] underline decoration-[#f8a30a]/40 decoration-wavy decoration-2">
                      Zero Hassle
                    </span>
                  </>
                )}
              </h1>

              {/* Description Subtitle with generous width */}
              <p className="text-slate-200 text-base sm:text-lg lg:text-xl leading-relaxed font-normal max-w-4xl mx-auto lg:mx-0 font-['Manrope',sans-serif]">
                {lang === 'sw'
                  ? 'INFOTECH WiFi inakupa mfumo jumuishi wa kukusanya malipo ya simu (M-Pesa, Tigo Pesa, Airtel Money, Halopesa) kwa USSD Push ya papo kwa papo, kutoa vocha za kidijitali na zilizochapishwa, na kusimamia MikroTik Router zako zote kupitia Cloud popote ulipo.'
                  : 'INFOTECH WiFi gives you one unified platform to collect mobile payments (M-Pesa, Tigo, Airtel, Halopesa) via instant USSD push, issue digital & thermal printed vouchers, and manage all your MikroTik routers via Cloud from anywhere.'}
              </p>

              {/* Call to Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-1">
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#f8a30a] hover:bg-[#e09105] active:scale-98 text-slate-950 font-black text-base shadow-xl shadow-[#f8a30a]/30 transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <span>
                    {freeTrialSettings && freeTrialSettings.enabled && freeTrialSettings.trial_days > 0
                      ? lang === 'sw'
                        ? `Anza na Siku ${freeTrialSettings.trial_days} za Bure`
                        : `Start Free ${freeTrialSettings.trial_days}-Day Trial`
                      : lang === 'sw'
                      ? 'Fungua Akaunti ya Hotspot'
                      : 'Get Started Free'}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-98 text-white border border-white/20 font-bold text-base backdrop-blur-md transition flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-cyan-300" />
                  <span>{lang === 'sw' ? 'Ingia Kwenye Dashibodi' : 'Sign In To Portal'}</span>
                </button>
              </div>

              {/* Wide 4-Item Hero Metric Stats Strip */}
              <div className="pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-left">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Kasi</span>
                  </div>
                  <b className="text-lg sm:text-xl font-black text-white font-['Sora',sans-serif] block">
                    &lt; 3 Sekunde
                  </b>
                  <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                    {lang === 'sw' ? 'USSD Push ya Simu' : 'Instant USSD Push'}
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-[#f8a30a] mb-1">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Mitandao</span>
                  </div>
                  <b className="text-lg sm:text-xl font-black text-[#f8a30a] font-['Sora',sans-serif] block">
                    Mitandao Yote 4
                  </b>
                  <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                    {lang === 'sw' ? 'M-Pesa, Tigo, Airtel, Halo' : 'All 4 Mobile Carriers'}
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Uptime</span>
                  </div>
                  <b className="text-lg sm:text-xl font-black text-emerald-400 font-['Sora',sans-serif] block">
                    99.98%
                  </b>
                  <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                    {lang === 'sw' ? 'MikroTik Live Sync' : 'RouterOS Live Sync'}
                  </span>
                </div>

                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Usalama</span>
                  </div>
                  <b className="text-lg sm:text-xl font-black text-white font-['Sora',sans-serif] block">
                    100% Salama
                  </b>
                  <span className="text-[11px] text-slate-300 font-medium block mt-0.5">
                    {lang === 'sw' ? 'HMAC SHA-256 Webhooks' : 'Encrypted Webhooks'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Wide High-Fidelity Interactive Dashboard Visual */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="w-full max-w-xl bg-slate-900/80 border border-white/20 p-5 sm:p-7 rounded-[32px] backdrop-blur-xl shadow-2xl shadow-black/80 space-y-4">
                
                {/* Router Header Bar */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#f8a30a] text-slate-950 flex items-center justify-center font-black shadow-md">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm leading-tight">
                        INFOTECH Cloud RouterOS
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>MikroTik v7.x API</span>
                        <span>•</span>
                        <span className="text-cyan-400 font-mono">Ping 6ms</span>
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync
                  </span>
                </div>

                {/* Main Hotspot Revenue Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#072440] to-[#0d3b66] border border-white/15 text-white space-y-3 relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-[#f8a30a]/15 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Mapato ya Hotspot Yako</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f8a30a]/20 border border-[#f8a30a]/30 text-[#f8a30a] font-bold text-[10px]">
                      Akaunti Hai
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl sm:text-4xl font-black font-['Sora',sans-serif] tracking-tight text-white">
                      TZS 2,840,500
                    </div>
                    <small className="text-[11px] text-slate-300 font-mono">Salio linalopatikana kutoa papo hapo</small>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Wateja Mtandaoni Sasa:</span>
                    <span className="font-bold text-emerald-300 font-mono bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      168 Active Users
                    </span>
                  </div>
                </div>

                {/* Live Throughput & Server Telemetry */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Makusanyo ya Leo</span>
                    <strong className="text-base font-bold text-white block mt-0.5">TZS 420,000</strong>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+24% vs jana</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Traffic Throughput</span>
                    <strong className="text-base font-bold text-cyan-300 font-mono block mt-0.5">
                      184.2 Mbps
                    </strong>
                    <span className="text-[11px] text-slate-300 block mt-0.5">
                      RB750Gr3 / hAP ax²
                    </span>
                  </div>
                </div>

                {/* Simulated Recent Real-Time Transactions */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Miamala ya Hivi Karibuni</span>
                    </span>
                    <span className="text-[#f8a30a] text-[11px] hover:underline cursor-pointer">
                      M-Pesa • Tigo • Airtel
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <div>
                          <span className="font-semibold text-white block leading-tight">255754***456</span>
                          <span className="text-[10px] text-slate-400">Vodacom M-Pesa • Saa 1</span>
                        </div>
                      </div>
                      <strong className="text-emerald-400 font-mono font-bold">+TZS 500</strong>
                    </div>

                    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <div>
                          <span className="font-semibold text-white block leading-tight">255713***021</span>
                          <span className="text-[10px] text-slate-400">Tigo Pesa • Siku 1</span>
                        </div>
                      </div>
                      <strong className="text-emerald-400 font-mono font-bold">+TZS 1,500</strong>
                    </div>
                  </div>
                </div>

                {/* Direct Action */}
                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1b62b6] to-[#005ea9] hover:brightness-110 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Fungua Dashibodi ya Hotspot</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 
          =======================================================================
          2. FULL-WIDTH TELCO & INFRASTRUCTURE RIBBON (Edge-to-Edge)
          =======================================================================
        */}
        <section className="w-full border-y border-white/10 bg-slate-950/60 backdrop-blur-md py-6">
          <div className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="flex flex-wrap items-center justify-between gap-6 sm:gap-8 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span className="text-slate-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Malipo ya Simu Yaliyopo:</span>
              </span>

              <div className="flex items-center gap-2 text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="w-3 h-3 rounded-full bg-red-600" />
                <span>Vodacom M-Pesa</span>
              </div>

              <div className="flex items-center gap-2 text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span>Tigo Pesa (Mixx by Yas)</span>
              </div>

              <div className="flex items-center gap-2 text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span>Airtel Money</span>
              </div>

              <div className="flex items-center gap-2 text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Halopesa</span>
              </div>

              <div className="flex items-center gap-2 text-[#f8a30a] bg-[#f8a30a]/10 px-3 py-1.5 rounded-xl border border-[#f8a30a]/30">
                <Server className="w-4 h-4" />
                <span>MikroTik RouterOS API</span>
              </div>

              <div className="flex items-center gap-2 text-cyan-400 bg-cyan-950/40 px-3 py-1.5 rounded-xl border border-cyan-400/30">
                <Receipt className="w-4 h-4" />
                <span>Thermal POS Printing</span>
              </div>
            </div>
          </div>
        </section>

        {/* 
          =======================================================================
          3. EXPANSIVE FULL-WIDTH 6-FEATURE GRID (Utilizes entire width)
          =======================================================================
        */}
        <section className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 space-y-10">
          <div className="text-center max-w-4xl mx-auto space-y-3">
            <div className="inline-block px-3.5 py-1.5 rounded-full bg-[#f8a30a]/15 text-[#f8a30a] border border-[#f8a30a]/30 text-xs font-bold uppercase tracking-wider">
              {lang === 'sw' ? 'Kazi Kuu za Mfumo' : 'Powerful Platform Features'}
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-['Sora',sans-serif] tracking-tight">
              {lang === 'sw'
                ? 'Kila Kitu Unachohitaji Kuendesha Biashara ya Hotspot'
                : 'Everything You Need To Scale Your WiFi Business'}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base lg:text-lg max-w-3xl mx-auto">
              {lang === 'sw'
                ? 'Mfumo uliotengenezwa mahsusi kwa mazingira ya Tanzania, ukichanganya malipo ya haraka ya simu na udhibiti kamili wa vifaa vya MikroTik.'
                : 'Built specifically for East African conditions, seamlessly uniting mobile telecom payments with rock-solid MikroTik RouterOS automation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-[#f8a30a]/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-[#f8a30a]/20 border border-[#f8a30a]/30 text-[#f8a30a] flex items-center justify-center group-hover:scale-110 transition">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'USSD Push ya Papo Hapo' : 'Instant USSD Push'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Mteja anaweka namba yake ya simu kwenye Captive Portal, pop-up ya PIN inatokea kwenye simu yake, anathibitisha na intaneti inawaka papo hapo bila kuandika vocha ndefu.'
                  : 'Subscribers enter their phone number and authorize via instant mobile money PIN prompt with zero manual voucher typing.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-cyan-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'MikroTik Live Sync & API' : 'RouterOS Live Sync'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Unganisha router zako zote kupitia API Port 8728 au Cloud Heartbeat. Unaona watumiaji waliopo online, kiasi cha data kilichotumika, na unaweza kureboot router kwa mbali.'
                  : 'Connect all your MikroTik routers via API port 8728 or Cloud Heartbeat. Track active users, bandwidth usage, and send remote commands.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-emerald-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'Uchapishaji wa Vocha (POS & A4)' : 'Thermal & A4 Print Engine'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Tengeneza batch za vocha za karatasi zenye namba fupi au QR Code kwa ajili ya mashine za risiti za POS (58mm/80mm) au karatasi za kawaida za A4.'
                  : 'Generate physical voucher batches with short codes or QR codes formatted for 58mm/80mm POS thermal printers or standard A4 sheets.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-purple-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'Gawio & Mkoba wa Malipo' : 'Aggregator Wallets'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Pesa inaingia moja kwa moja kwenye akaunti ya mmiliki au mkoba wa Aggregator (PalmPesa/AzamPay) kulingana na muundo ulioweka.'
                  : 'Direct routing into vendor aggregator or hotspot owner mobile wallets with zero reconciliation headache.'}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-blue-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'Vifurushi vya Saa na Data' : 'Custom Bandwidth Plans'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Panga bei za vifurushi vya dakika 30, saa 2, siku nzima au mwezi. Weka kikomo cha spidi (Mbps) na idadi ya vifaa (Shared Users).'
                  : 'Configure hourly, daily, or monthly plans with download/upload rate limits (Mbps) and device sharing policies.'}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-amber-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'Ulinzi wa MAC & Anti-Fraud' : 'MAC-Binding Anti-Fraud'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Kila vocha inafungwa kiotomatiki na MAC Address ya simu ya mteja ili kuzuia wateja kusambaziana vocha moja kiholela.'
                  : 'Automated MAC-binding prevents voucher sharing across unauthorized devices, ensuring guaranteed revenues.'}
              </p>
            </div>

            {/* Feature 7 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-rose-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'Ripoti & Takwimu za Mauzo' : 'Financial Revenue Reports'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Fuatilia mauzo ya kila siku, kila wiki na kila mwezi. Pakua ripoti za CSV au PDF za miamala yote kwa ajili ya mahesabu yako.'
                  : 'Track daily and monthly revenue graphs with one-click export to CSV and PDF audit logs.'}
              </p>
            </div>

            {/* Feature 8 */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-teal-400/50 transition duration-300 space-y-4 backdrop-blur-md group hover:bg-slate-900/80 shadow-xl">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center group-hover:scale-110 transition">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-['Sora',sans-serif]">
                {lang === 'sw' ? 'Multi-Site & Matawi Mengi' : 'Multi-Location Network'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lang === 'sw'
                  ? 'Dhibiti maeneo mengi ya hotspot (Station, Chuo, Hosteli, Mgahawa) kwa akaunti moja bila kulipia gharama za ziada.'
                  : 'Control multiple hotspots across campuses, hotels, and cafes from a single super-admin dashboard.'}
              </p>
            </div>
          </div>
        </section>

        {/* 
          =======================================================================
          4. INTERACTIVE HOTSPOT REVENUE CALCULATOR (Wide Layout Section)
          =======================================================================
        */}
        <section className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="p-6 sm:p-10 lg:p-12 rounded-[36px] bg-gradient-to-br from-slate-900/90 via-[#07253d]/90 to-slate-950/90 border border-cyan-400/20 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#f8a30a]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Left Column: Calculator Intro & Controls */}
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                  <Calculator className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Kikokotoo cha Mapato ya Hotspot' : 'Hotspot ROI Estimator'}</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white font-['Sora',sans-serif] tracking-tight">
                  {lang === 'sw'
                    ? 'Tazama Kiwango cha Faida Unachoweza Kupata'
                    : 'Calculate Your Potential Monthly Earnings'}
                </h2>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  {lang === 'sw'
                    ? 'Chagua wastani wa idadi ya wateja wanaounganishwa kwa siku na bei ya kifurushi chako uone mapato ya mwezi:'
                    : 'Adjust your expected daily users and voucher price to estimate your monthly profit:'}
                </p>

                {/* Slider / Buttons 1: Daily Users */}
                <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-300 font-semibold">
                      {lang === 'sw' ? 'Wateja kwa Siku:' : 'Daily Active Users:'}
                    </span>
                    <strong className="text-cyan-400 text-base font-bold font-mono">
                      {dailyUsers} {lang === 'sw' ? 'Wateja' : 'Users'}
                    </strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="5"
                    value={dailyUsers}
                    onChange={(e) => setDailyUsers(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>10 Wateja</span>
                    <span>100 Wateja</span>
                    <span>200 Wateja</span>
                    <span>300 Wateja</span>
                  </div>
                </div>

                {/* Selector 2: Ticket / Voucher Price */}
                <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-white/10">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-slate-300 font-semibold">
                      {lang === 'sw' ? 'Bei ya Wastani ya Kifurushi:' : 'Average Voucher Price:'}
                    </span>
                    <strong className="text-[#f8a30a] text-base font-bold font-mono">
                      TZS {ticketPrice.toLocaleString()}
                    </strong>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2000, 5000].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => setTicketPrice(price)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                          ticketPrice === price
                            ? 'bg-[#f8a30a] text-slate-950 font-black shadow-md'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        TZS {price}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Calculated Results Display Cards */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#062035] to-[#0a3152] border border-cyan-400/30 text-white space-y-5 shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                      {lang === 'sw' ? 'Makadirio ya Mapato ya Mwezi' : 'Estimated Monthly Revenue'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Auto MikroTik Billing
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-slate-300">Jumla ya Makusanyo kwa Mwezi:</span>
                    <div className="text-3xl sm:text-5xl font-black font-['Sora',sans-serif] text-emerald-400 tracking-tight">
                      TZS {estimatedMonthlyRevenue.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs sm:text-sm">
                    <div className="p-3 rounded-2xl bg-black/30 border border-white/10">
                      <span className="text-[11px] text-slate-400 block">Makusanyo kwa Siku</span>
                      <strong className="text-white font-mono text-base block mt-0.5">
                        TZS {estimatedDailyRevenue.toLocaleString()}
                      </strong>
                    </div>

                    <div className="p-3 rounded-2xl bg-black/30 border border-white/10">
                      <span className="text-[11px] text-slate-400 block">Makadirio ya Faida Halisi</span>
                      <strong className="text-[#f8a30a] font-mono text-base block mt-0.5">
                        ~ TZS {estimatedProfit.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onNavigateRegister}
                      className="w-full py-3.5 px-6 rounded-2xl bg-[#f8a30a] hover:bg-[#e09105] text-slate-950 font-black text-sm shadow-xl shadow-[#f8a30a]/25 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{lang === 'sw' ? 'Sajili Hotspot Yako Uanze Kukusanya' : 'Start Collecting Today'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 
          =======================================================================
          5. VIFURUSHI VYA SUBSCRIPTION YA KILA MWEZI (TIERED SAAS PACKAGES & QUOTAS)
          =======================================================================
        */}
        <section className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="space-y-10">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f8a30a]/10 border border-[#f8a30a]/30 text-[#f8a30a] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <Package className="w-4 h-4" />
                <span>
                  {lang === 'sw'
                    ? 'Vifurushi vya Subscription ya Mfumo'
                    : 'Transparent SaaS Subscription Plans'}
                </span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-black text-white font-['Sora',sans-serif] tracking-tight">
                {lang === 'sw'
                  ? 'Chagua Kifurushi Kinachofaa Ukubwa wa Mtandao Wako'
                  : 'Flexible Plans Tailored For Your Hotspot Growth'}
              </h2>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {lang === 'sw'
                  ? 'Gharama nafuu za kila mwezi zenye uwazi kamili wa idadi ya routers & AP, wateja (users), maeneo (sites), na akaunti za wahudumu (staff) bila ada zilizofichika.'
                  : 'Transparent quotas for routers & APs, active users/vouchers, site locations, and staff accounts with zero hidden fees.'}
              </p>
            </div>

            {/* Dynamic Free Trial Offer Banner */}
            {freeTrialSettings && freeTrialSettings.enabled && freeTrialSettings.trial_days > 0 && (
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/25 via-orange-500/15 to-amber-500/25 border-2 border-amber-400/50 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start sm:items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-lg text-amber-300">
                    <Gift className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                        {lang === 'sw' ? '🎁 OFA YA MAJARIBIO YA BURE' : '🎁 FREE TRIAL OFFER'}
                      </span>
                      <span className="text-xs text-amber-300 font-black">
                        {lang === 'sw' ? `Siku ${freeTrialSettings.trial_days} za Bure!` : `${freeTrialSettings.trial_days} Days Free!`}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-white font-['Sora',sans-serif]">
                      {lang === 'sw'
                        ? `Jaribu Mfumo Bure kwa Siku ${freeTrialSettings.trial_days} Bila Malipo ya Awali!`
                        : `Experience Full Features for ${freeTrialSettings.trial_days} Days at Zero Cost!`}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                      {lang === 'sw'
                        ? `Jisajili leo upate siku ${freeTrialSettings.trial_days} za majaribio ya bure moja kwa moja. Unganisha router yako ya MikroTik au APs, gawa vocha na uanze kukusanya mapato ya mtandao wako papo hapo kabla ya kulipia kifurushi chochote.`
                        : `Sign up today to get ${freeTrialSettings.trial_days} days of free trial. Connect your MikroTik or APs, issue vouchers, and collect mobile payments before paying any subscription fee.`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-[#f8a30a] hover:from-amber-300 hover:to-[#e09105] text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 transition flex items-center justify-center gap-2 cursor-pointer shrink-0 relative z-10"
                >
                  <span>
                    {lang === 'sw'
                      ? `Anza Majaribio ya Siku ${freeTrialSettings.trial_days} Bure`
                      : `Start ${freeTrialSettings.trial_days}-Day Trial`}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
              {subscriptionPackages.map((pkg) => {
                const isPopular = pkg.badge === 'POPULAR';
                const isBestValue = pkg.badge === 'BEST_VALUE';

                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition duration-300 relative overflow-hidden backdrop-blur-xl shadow-2xl ${
                      isPopular
                        ? 'bg-gradient-to-b from-[#092644] to-[#041527] border-2 border-[#f8a30a] shadow-[#f8a30a]/20 scale-102 lg:-translate-y-2'
                        : isBestValue
                        ? 'bg-gradient-to-b from-[#0b2b3a] to-[#041520] border-2 border-cyan-400/80 shadow-cyan-500/20'
                        : 'bg-slate-900/80 border border-white/10 hover:border-white/25 hover:bg-slate-900/95'
                    }`}
                  >
                    {/* Badge Pill */}
                    {pkg.badge && pkg.badge !== 'NONE' && (
                      <div className="absolute top-4 right-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
                            isPopular
                              ? 'bg-[#f8a30a] text-slate-950'
                              : isBestValue
                              ? 'bg-cyan-400 text-slate-950'
                              : 'bg-slate-800 text-slate-200 border border-white/20'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>
                            {pkg.badge === 'POPULAR'
                              ? lang === 'sw'
                                ? 'Maarufu Zaidi'
                                : 'Most Popular'
                              : pkg.badge === 'BEST_VALUE'
                              ? lang === 'sw'
                                ? 'Uwezo Mkubwa'
                                : 'Best Value'
                              : pkg.badge === 'STARTER'
                              ? lang === 'sw'
                                ? 'Starter'
                                : 'Starter'
                              : pkg.badge}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="space-y-6">
                      {/* Package Name & Price */}
                      <div className="space-y-2 pt-1">
                        <h3 className="text-xl sm:text-2xl font-black text-white font-['Sora',sans-serif]">
                          {pkg.name}
                        </h3>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl sm:text-4xl font-black font-mono text-[#f8a30a]">
                            TZS {pkg.price.toLocaleString()}
                          </span>
                          <span className="text-xs sm:text-sm font-medium text-slate-400">
                            / {lang === 'sw' ? 'mwezi' : 'month'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[40px]">
                          {lang === 'sw' ? pkg.description_sw : pkg.description_en || pkg.description_sw}
                        </p>
                      </div>

                      {/* 4 CORE QUOTA CARDS (Routers & AP, Users, Sites, Staff) */}
                      <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-black/40 border border-white/10">
                        {/* 1. Routers & APs Quota */}
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-cyan-400 text-[11px] font-bold">
                            <Radio className="w-3.5 h-3.5" />
                            <span>Routers & APs</span>
                          </div>
                          <div className="text-xs sm:text-sm font-black text-white font-mono">
                            {pkg.max_routers_ap === -1
                              ? lang === 'sw'
                                ? 'Bila Kikomo'
                                : 'Unlimited'
                              : `${pkg.max_routers_ap} ${lang === 'sw' ? 'Vifaa' : 'Devices'}`}
                          </div>
                        </div>

                        {/* 2. Users / Vouchers Quota */}
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-bold">
                            <Users className="w-3.5 h-3.5" />
                            <span>{lang === 'sw' ? 'Wateja (Users)' : 'Users'}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-black text-white font-mono">
                            {pkg.max_users === -1
                              ? lang === 'sw'
                                ? 'Bila Kikomo'
                                : 'Unlimited'
                              : `${pkg.max_users.toLocaleString()} ${lang === 'sw' ? 'Wateja' : 'Users'}`}
                          </div>
                        </div>

                        {/* 3. Sites Quota */}
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{lang === 'sw' ? 'Maeneo (Sites)' : 'Sites'}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-black text-white font-mono">
                            {pkg.max_sites === -1
                              ? lang === 'sw'
                                ? 'Bila Kikomo'
                                : 'Unlimited'
                              : `${pkg.max_sites} ${pkg.max_sites === 1 ? 'Eneo' : 'Maeneo'}`}
                          </div>
                        </div>

                        {/* 4. Staff Accounts Quota */}
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                          <div className="flex items-center gap-1.5 text-purple-400 text-[11px] font-bold">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{lang === 'sw' ? 'Wahudumu (Staff)' : 'Staff'}</span>
                          </div>
                          <div className="text-xs sm:text-sm font-black text-white font-mono">
                            {pkg.max_staff_accounts === -1
                              ? lang === 'sw'
                                ? 'Bila Kikomo'
                                : 'Unlimited'
                              : `${pkg.max_staff_accounts} ${lang === 'sw' ? 'Wahudumu' : 'Staff'}`}
                          </div>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="space-y-2.5 pt-2 border-t border-white/10">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          {lang === 'sw' ? 'Vipengele Vilivyojumuishwa:' : 'Plan Highlights:'}
                        </span>
                        <ul className="space-y-2">
                          {(pkg.features || []).map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-200">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="leading-snug">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-6 mt-6 border-t border-white/10">
                      <button
                        type="button"
                        onClick={onNavigateRegister}
                        className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                          isPopular
                            ? 'bg-[#f8a30a] hover:bg-[#e09105] text-slate-950 shadow-[#f8a30a]/30'
                            : isBestValue
                            ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-400/30'
                            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                        }`}
                      >
                        <span>{lang === 'sw' ? `Chagua ${pkg.name}` : `Select ${pkg.name}`}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 
          =======================================================================
          6. TRUST & SECURITY BANNER (Wide Layout)
          =======================================================================
        */}
        <section className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
          <div className="p-8 sm:p-12 rounded-[36px] bg-gradient-to-r from-[#051c30] via-[#072e4b] to-[#041528] border border-white/15 relative overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4 text-center lg:text-left">
                <span className="text-xs font-bold text-[#f8a30a] uppercase tracking-wider flex items-center justify-center lg:justify-start gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Usalama na Uaminifu wa Data' : 'Bank-Grade Security & Reliability'}</span>
                </span>
                <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white font-['Sora',sans-serif] tracking-tight">
                  {lang === 'sw'
                    ? 'Tunalinda Kila Muamala na Kila Router Yako'
                    : 'We Protect Every Transaction & Router Connection'}
                </h2>
                <p className="text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed max-w-3xl">
                  {lang === 'sw'
                    ? 'Kuanzia uthibitisho wa saini ya kidijitali (HMAC SHA-256) hadi VPN zilizolindwa na kuzuia wizi wa intaneti kupitia MAC Address na RouterOS firewall.'
                    : 'From HMAC SHA-256 webhook signatures to dedicated VPN tunnels and RouterOS anti-spoofing firewall security.'}
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={onNavigateRegister}
                  className="w-full py-4 px-8 rounded-2xl bg-[#f8a30a] hover:bg-[#e09105] text-slate-950 font-black text-base shadow-xl shadow-[#f8a30a]/30 transition text-center cursor-pointer"
                >
                  {lang === 'sw' ? 'Fungua Akaunti Sasa' : 'Start Today'}
                </button>

                <button
                  type="button"
                  onClick={onNavigateLogin}
                  className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition text-center cursor-pointer"
                >
                  {lang === 'sw' ? 'Ingia Kwenye Akaunti Yako' : 'Access Your Portal'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 
          =======================================================================
          6. WIDE FOOTER
          =======================================================================
        */}
        <footer className="w-full border-t border-white/10 text-xs text-slate-400 pt-8 pb-4">
          <div className="w-full max-w-[1650px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#f8a30a] text-slate-950 flex items-center justify-center font-bold text-xs">
                <Wifi className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-bold text-white text-sm">INFOTECH WiFi Cloud Systems</span>
              <span>• Tanzania</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {onOpenAbout && (
                <button
                  type="button"
                  onClick={onOpenAbout}
                  className="hover:text-white transition cursor-pointer font-medium"
                >
                  {lang === 'sw' ? 'Kuhusu Sisi' : 'About Us'}
                </button>
              )}
              {onOpenContact && (
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="hover:text-emerald-400 transition cursor-pointer font-medium"
                >
                  {lang === 'sw' ? 'Mawasiliano' : 'Contacts'}
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateLogin}
                className="hover:text-white transition cursor-pointer font-medium"
              >
                {lang === 'sw' ? 'Ingia (Login)' : 'Login'}
              </button>
              <button
                type="button"
                onClick={onNavigateRegister}
                className="hover:text-[#f8a30a] transition cursor-pointer font-bold"
              >
                {lang === 'sw' ? 'Fungua Akaunti' : 'Register'}
              </button>
            </div>

            <p>© {new Date().getFullYear()} INFOTECH WiFi. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </div>
  );
};
