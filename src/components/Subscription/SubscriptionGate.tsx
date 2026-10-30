import React, { useState, useEffect } from 'react';
import { HotspotOwner, NetworkProvider, SubscriptionPackage } from '../../types/index.ts';
import { detectCarrierFromInput, CARRIERS, formatTzs, isInsufficientBalance } from '../../utils/carrierInfo.ts';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  Phone,
  RefreshCw,
  AlertTriangle,
  Lock,
  Sparkles,
  Wifi,
  Smartphone,
  LogOut,
  ChevronRight,
  Layers,
  Building,
  Wallet,
  Radio,
  Users,
  MapPin,
  UserCheck,
  Check,
  Gift,
} from 'lucide-react';

interface SubscriptionGateProps {
  owner: HotspotOwner;
  onRenewSuccess: (updatedOwner: HotspotOwner) => void;
  onLogout: () => void;
  lang?: 'sw' | 'en';
}

const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    id: 1,
    name: 'Starter Hotspot',
    price: 15000,
    billing_cycle_days: 30,
    max_routers_ap: 2,
    max_users: 500,
    max_sites: 1,
    max_staff_accounts: 2,
    badge: 'STARTER',
    description_sw: 'Inafaa kwa wamiliki wa vituo vidogo vya Wi-Fi, maduka, stesheni na migahawa midogo.',
    features: [
      'Routers & APs: Hadi 2',
      'Wateja / Vouchers: Hadi 500',
      'Maeneo / Sites: Eneo 1 (1 Site)',
      'Akaunti za Wahudumu: Wahudumu 2 (Staff)',
      'Malipo ya Simu (M-Pesa, Tigo, Airtel, Halo)',
      'Captive Portal ya Kisasa & Live Sync',
    ],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
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
    features: [
      'Routers & APs: Hadi 5',
      'Wateja / Vouchers: Hadi 2,000',
      'Maeneo / Sites: Maeneo 3 (3 Sites)',
      'Akaunti za Wahudumu: Wahudumu 5 (Staff)',
      'MikroTik, Ruijie & TP-Link Omada',
      'Bandwidth Speed Limits & QoS',
      'USSD Push ya Papo Hapo & SMS Alerts',
      'Msaada wa Kiufundi wa Haraka (Priority)',
    ],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
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
    features: [
      'Routers & APs: Bila Kikomo (Unlimited)',
      'Wateja / Vouchers: Bila Kikomo (Unlimited)',
      'Maeneo / Sites: Bila Kikomo (Unlimited)',
      'Akaunti za Wahudumu: Bila Kikomo (Unlimited)',
      'Cloud RADIUS AAA & Remote VPN Access',
      'Mfumo Mahususi wa Kuzuia Wizi (Anti-Tethering)',
      'Meneja Mahsusi wa Akaunti 24/7 Dedicated Support',
    ],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  owner,
  onRenewSuccess,
  onLogout,
  lang = 'sw',
}) => {
  // Packages State
  const [packages, setPackages] = useState<SubscriptionPackage[]>(DEFAULT_PACKAGES);
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true);
  const [selectedPackageId, setSelectedPackageId] = useState<number>(() => {
    if (owner.subscription_package_id) return owner.subscription_package_id;
    return 2; // Default to 'Business Pro' (Popular)
  });

  const selectedPackage = packages.find((p) => p.id === selectedPackageId) || packages[0] || DEFAULT_PACKAGES[0];
  const currentFee = selectedPackage?.price || owner.subscription_fee || owner.monthly_fee || 15000;

  // Is this an expired trial or regular expired subscription?
  const isTrialExpired = Boolean(
    owner.subscription_status === 'TRIAL' ||
    (owner.subscription_expires_at &&
      !owner.subscription_package_id &&
      new Date(owner.subscription_expires_at).getTime() <= Date.now())
  );

  const [phoneNumber, setPhoneNumber] = useState(owner.phone || '');
  const [selectedCarrier, setSelectedCarrier] = useState<NetworkProvider | null>(() =>
    detectCarrierFromInput(owner.phone || '')
  );

  const [initiating, setInitiating] = useState(false);
  const [initiateError, setInitiateError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSession, setPaymentSession] = useState<{
    reference: string;
    instructions: string;
    amount: number;
    carrier: NetworkProvider;
    packageId?: number;
    packageName?: string;
  } | null>(null);

  const [paymentMode, setPaymentMode] = useState<'mobile' | 'manual'>('mobile');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MANUAL_MPESA' | 'MANUAL_TIGO' | 'MANUAL_AIRTEL'>('CASH');
  const [manualReferenceNote, setManualReferenceNote] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');
  const [manualSubmitted, setManualSubmitted] = useState(false);

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailedError, setPaymentFailedError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [manualChecking, setManualChecking] = useState(false);

  // Fetch Packages from Server
  useEffect(() => {
    let isMounted = true;
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/v1/subscription/packages');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            setPackages(data);
            if (!data.some((p) => p.id === selectedPackageId)) {
              const popular = data.find((p) => p.badge === 'POPULAR') || data[0];
              setSelectedPackageId(popular.id);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch server subscription packages, using defaults:', err);
      } finally {
        if (isMounted) setLoadingPackages(false);
      }
    };
    fetchPlans();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerifySubscriptionNow = async () => {
    if (!paymentSession?.reference) return;
    setManualChecking(true);
    try {
      const res = await fetch(`/api/v1/subscription/verify/${paymentSession.reference}`);
      if (res.ok) {
        const data = await res.json();
        if (data.paid && data.status === 'SUCCESS') {
          setPaymentSuccess(true);
          setPaymentFailedError(null);
          setTimeout(() => {
            if (data.user) {
              onRenewSuccess(data.user);
            } else {
              onRenewSuccess({
                ...owner,
                subscription_status: 'ACTIVE',
                subscription_package_id: selectedPackage.id,
                subscription_package: selectedPackage,
                subscription_fee: selectedPackage.price,
                monthly_fee: selectedPackage.price,
                subscription_expires_at: data.expiresAt || new Date(Date.now() + (selectedPackage.billing_cycle_days || 30) * 86400000).toISOString(),
              });
            }
          }, 1200);
        } else if (data.status === 'FAILED') {
          const isNoFunds = isInsufficientBalance(data.failureReason);
          setPaymentFailedError(
            isNoFunds
              ? 'Account haina salio la kutosha.'
              : (data.failureReason || 'Malipo hayakukamilika.')
          );
        }
      }
    } catch (err) {
      console.error('Subscription verify error:', err);
    } finally {
      setManualChecking(false);
    }
  };

  // Real-time verification polling: Checks if telecom payment is confirmed by gateway/webhook OR if Vendor approved manually
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/subscription/status?ownerId=${owner.id}`);
        if (res.ok) {
          const data = await res.json();
          if (!data.isExpired && data.subscriptionStatus === 'ACTIVE') {
            clearInterval(interval);
            setPaymentSuccess(true);
            setTimeout(() => {
              onRenewSuccess({
                ...owner,
                subscription_status: 'ACTIVE',
                subscription_package_id: selectedPackage.id,
                subscription_package: selectedPackage,
                subscription_fee: selectedPackage.price,
                monthly_fee: selectedPackage.price,
                subscription_expires_at: data.subscriptionExpiresAt,
              });
            }, 1200);
          }
        }
      } catch (err) {
        console.error('Subscription status check error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [owner.id, onRenewSuccess, selectedPackage]);

  // Real-time verification polling for active USSD modal session
  useEffect(() => {
    if (!showPaymentModal || !paymentSession?.reference || paymentSuccess) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/subscription/verify/${paymentSession.reference}`);
        if (res.ok) {
          const data = await res.json();
          if (data.paid && data.status === 'SUCCESS') {
            clearInterval(interval);
            setPaymentSuccess(true);
            setPaymentFailedError(null);
            setTimeout(() => {
              if (data.user) {
                onRenewSuccess(data.user);
              } else {
                onRenewSuccess({
                  ...owner,
                  subscription_status: 'ACTIVE',
                  subscription_package_id: selectedPackage.id,
                  subscription_package: selectedPackage,
                  subscription_fee: selectedPackage.price,
                  monthly_fee: selectedPackage.price,
                  subscription_expires_at: data.expiresAt || new Date(Date.now() + (selectedPackage.billing_cycle_days || 30) * 86400000).toISOString(),
                });
              }
            }, 1500);
          } else if (data.status === 'FAILED') {
            clearInterval(interval);
            const isNoFunds = isInsufficientBalance(data.failureReason);
            setPaymentFailedError(
              isNoFunds
                ? 'Account haina salio la kutosha.'
                : (data.failureReason || 'Malipo hayakukamilika.')
            );
          }
        }
      } catch (err) {
        console.error('Verify poll error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showPaymentModal, paymentSession?.reference, paymentSuccess, owner, onRenewSuccess, selectedPackage]);

  // Countdown timer effect
  useEffect(() => {
    if (!showPaymentModal || paymentSuccess || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [showPaymentModal, paymentSuccess, countdown]);

  const handlePhoneChange = (val: string) => {
    setPhoneNumber(val);
    const detected = detectCarrierFromInput(val);
    if (detected) {
      setSelectedCarrier(detected);
    }
  };

  // Submit Manual Cash / Bank Approval Request
  const handleSubmitManualRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReferenceNote.trim()) {
      setInitiateError(
        lang === 'sw'
          ? 'Tafadhali weka namba ya risiti au maelezo ya uthibitisho wa malipo.'
          : 'Please enter receipt number or payment reference details.'
      );
      return;
    }

    setSubmittingManual(true);
    setInitiateError('');
    setManualSuccessMsg('');

    try {
      const res = await fetch('/api/v1/subscription/manual-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: owner.id,
          phoneNumber: phoneNumber || owner.phone,
          amount: currentFee,
          durationDays: selectedPackage.billing_cycle_days || 30,
          paymentMethod: manualPaymentMethod,
          referenceNote: `[${selectedPackage.name}] ${manualReferenceNote.trim()}`,
          notes: manualNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kutuma ombi');

      setManualSubmitted(true);
      setManualSuccessMsg(
        lang === 'sw'
          ? `✓ Ombi lako la kifurushi cha '${selectedPackage.name}' (TZS ${currentFee.toLocaleString()}) limetumwa kwa Vendor Admin! Akaunti yako itafunguka mara moja akithibitisha.`
          : `✓ Request for '${selectedPackage.name}' sent to Vendor Admin! System will unlock once approved.`
      );
    } catch (err: any) {
      setInitiateError(err.message || 'Hitilafu ya kutuma ombi.');
    } finally {
      setSubmittingManual(false);
    }
  };

  // Initiate USSD Push
  const handleInitiatePush = async () => {
    if (!phoneNumber.trim()) {
      setInitiateError(
        lang === 'sw'
          ? 'Tafadhali weka nambari ya simu itakayofanya malipo.'
          : 'Please enter phone number to process payment.'
      );
      return;
    }

    const carrierToUse = selectedCarrier || detectCarrierFromInput(phoneNumber);
    if (!carrierToUse) {
      setInitiateError(
        lang === 'sw'
          ? 'Mtandao wa simu haujatambulika. Hakikisha namba inaanza na 074/075/076, 071/065/067, 078/068 au 062.'
          : 'Mobile carrier not recognized.'
      );
      return;
    }

    setInitiating(true);
    setInitiateError('');

    try {
      const res = await fetch('/api/v1/subscription/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: owner.id,
          phoneNumber,
          carrier: carrierToUse,
          packageId: selectedPackage.id,
          amount: currentFee,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hitilafu ya kuanzisha malipo.');
      }

      setPaymentSession({
        reference: data.externalReference,
        instructions: data.instructions,
        amount: data.amount || currentFee,
        carrier: carrierToUse,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
      });

      setShowPaymentModal(true);
      setCountdown(60);
    } catch (err: any) {
      setInitiateError(err.message || 'Imeshindwa kuanzisha ombi la malipo.');
    } finally {
      setInitiating(false);
    }
  };

  const carrierInfo = selectedCarrier ? CARRIERS[selectedCarrier] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-start py-8 px-4 sm:px-6 text-slate-100">
      <div className="w-full max-w-5xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP STATUS HEADER CARD */}
        <div className="bg-gradient-to-r from-rose-950/90 via-slate-900 to-indigo-950/90 border-2 border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isTrialExpired ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/40 tracking-wide uppercase">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'sw' ? 'Muda wa Majaribio (Free Trial) Umekwisha' : 'Free Trial Has Expired'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black border border-rose-500/40 tracking-wide uppercase">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>{lang === 'sw' ? 'Muda wa Huduma Umekwisha' : 'Subscription Expired'}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>{lang === 'sw' ? 'Malipo Salama ya Papo Hapo' : 'Instant Activation'}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Toka kwenye Akaunti' : 'Sign Out'}</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                {isTrialExpired
                  ? lang === 'sw'
                    ? 'Muda Wako wa Majaribio ya Bure Umekwisha!'
                    : 'Your Free Trial Has Ended!'
                  : lang === 'sw'
                  ? 'Muda Wako wa Huduma ya Hotspot Umekwisha!'
                  : 'Your Hotspot Subscription Has Expired!'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {isTrialExpired
                  ? lang === 'sw'
                    ? `Habari ${owner.name}! Umemaliza muda wako wa majaribio ya bure kwa ajili ya biashara yako (${owner.business_name}). Ili uendelee kudhibiti MikroTik/Ruijie routers, kuchapisha vocha na kukusanya malipo ya wateja wako, tafadhali chagua kifurushi hapa chini na ulipie kwa simu ya mkononi. Mfumo utafunguka papo hapo!`
                    : `Hello ${owner.name}! Your free trial for ${owner.business_name} has ended. Please choose one of our flexible subscription packages below and pay with mobile money to instantly unlock the system.`
                  : lang === 'sw'
                  ? `Habari ${owner.name}! Ili uendelee kusimamia hotspot yako (${owner.business_name}) na kuweka routers mtandaoni, tafadhali lipia ada ya huduma ya mwezi huu. Mfumo utafunguka moja kwa moja ukikamilisha malipo.`
                  : `Hello ${owner.name}! Please renew your subscription to continue managing ${owner.business_name}.`}
              </p>
            </div>

            {/* Account Quick Overview Pill */}
            <div className="bg-black/40 rounded-2xl p-3 border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Biashara / Hotspot</span>
                <span className="font-bold text-white truncate block">{owner.business_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Namba ya Simu</span>
                <span className="font-bold text-white font-mono">{owner.phone}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Hali ya Sasa</span>
                <span className="font-black text-amber-400 block uppercase">
                  {isTrialExpired ? 'Trial Expired' : 'Expired'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Kifurushi Ulichochagua</span>
                <span className="font-black text-emerald-400 text-sm block truncate">
                  {selectedPackage.name} • {formatTzs(currentFee)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: CHAGUA KIFURUSHI CHA HUDUMA (SUBSCRIPTION PACKAGES GRID) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                1
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  {lang === 'sw' ? 'Chagua Kifurushi Kinachokufaa' : 'Choose Your Subscription Package'}
                </h2>
                <p className="text-xs text-slate-400">
                  {lang === 'sw'
                    ? 'Chagua mpango kulingana na idadi ya routers, maeneo na wateja unaotaka kusimamia'
                    : 'Select a plan based on the number of routers and clients you want to manage'}
                </p>
              </div>
            </div>

            <span className="text-xs text-slate-400 hidden sm:inline-block">
              {packages.length} {lang === 'sw' ? 'Vifurushi Vinavyopatikana' : 'Packages Available'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              const isSelected = pkg.id === selectedPackageId;
              const isPopular = pkg.badge === 'POPULAR';
              const isBestValue = pkg.badge === 'BEST_VALUE';

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`relative rounded-3xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border-2 ${
                    isSelected
                      ? 'bg-slate-900/90 border-emerald-500 ring-4 ring-emerald-500/20 shadow-2xl scale-[1.01]'
                      : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Badge */}
                  {pkg.badge && pkg.badge !== 'NONE' && (
                    <div className="absolute -top-3 left-6">
                      <span
                        className={`text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md tracking-wider ${
                          isPopular
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black'
                            : isBestValue
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black'
                            : 'bg-slate-700 text-slate-200'
                        }`}
                      >
                        {pkg.badge === 'POPULAR'
                          ? lang === 'sw'
                            ? '★ Inapendwa Zaidi'
                            : '★ Most Popular'
                          : pkg.badge === 'BEST_VALUE'
                          ? lang === 'sw'
                            ? '💎 Thamani Bora'
                            : '💎 Best Value'
                          : pkg.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="pt-1 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-black text-white leading-tight">{pkg.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {pkg.description_sw || 'Inafaa kwa wamiliki wa biashara ya Wi-Fi.'}
                        </p>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-600 bg-slate-800'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Price Tag */}
                    <div className="py-2 px-3 rounded-2xl bg-white/5 border border-white/10 flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-emerald-400">
                          {formatTzs(pkg.price)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1.5 font-bold">
                          / {pkg.billing_cycle_days || 30} {lang === 'sw' ? 'Siku' : 'Days'}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {lang === 'sw' ? 'Kila Mwezi' : 'Monthly'}
                      </span>
                    </div>

                    {/* Capacity Limits Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
                        <Radio className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Routers & APs</span>
                          <span className="font-bold text-slate-100">
                            {pkg.max_routers_ap === -1 ? 'Bila Kikomo' : `Hadi ${pkg.max_routers_ap}`}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Wateja / Vouchers</span>
                          <span className="font-bold text-slate-100">
                            {pkg.max_users === -1 ? 'Bila Kikomo' : `Hadi ${pkg.max_users.toLocaleString()}`}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Maeneo (Sites)</span>
                          <span className="font-bold text-slate-100">
                            {pkg.max_sites === -1 ? 'Bila Kikomo' : `${pkg.max_sites} ${pkg.max_sites === 1 ? 'Eneo' : 'Maeneo'}`}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="truncate">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Staff Accounts</span>
                          <span className="font-bold text-slate-100">
                            {pkg.max_staff_accounts === -1 ? 'Bila Kikomo' : `${pkg.max_staff_accounts} Staff`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      {(pkg.features && pkg.features.length > 0 ? pkg.features : [
                        'MikroTik Live Sync 24/7',
                        'Malipo ya Simu (M-Pesa, Tigo, Airtel, Halo)',
                        'Uchapishaji wa Vocha',
                        'Usaidizi wa Kiufundi',
                      ]).slice(0, 5).map((f, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Select button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPackageId(pkg.id);
                      }}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{lang === 'sw' ? 'Umechagua Kifurushi Hiki' : 'Selected Plan'}</span>
                        </>
                      ) : (
                        <span>{lang === 'sw' ? 'Chagua Kifurushi Hiki' : 'Select This Plan'}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 2: NJIA YA MALIPO YA SIMU YA MKONONI (PAYMENT CHECKOUT CARD) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-200 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                2
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {lang === 'sw' ? 'Lipia na Ufungue Mfumo Papo Hapo' : 'Pay & Unlock System Instantly'}
                </h2>
                <span className="text-xs text-slate-500">
                  {lang === 'sw'
                    ? 'Pop-up ya USSD Push (PIN) itatumwa kwenye simu yako ya Vodacom, Tigo, Airtel au Halotel'
                    : 'Instant PIN prompt will appear on your mobile phone'}
                </span>
              </div>
            </div>

            {/* Selected Plan Summary Pill */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-4 text-right flex items-center gap-3">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Kifurushi</span>
                <span className="text-xs font-black text-slate-800 block truncate max-w-[120px]">
                  {selectedPackage.name}
                </span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-right">
                <span className="text-lg font-black text-emerald-600 block leading-tight">
                  {formatTzs(currentFee)}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  {selectedPackage.billing_cycle_days || 30} Siku
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Switcher: Mobile Money vs Manual Cash/Bank */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => setPaymentMode('mobile')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                paymentMode === 'mobile'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Malipo ya Simu (M-Pesa / Tigo / Airtel / Halo)' : 'Mobile Money Push'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('manual')}
              className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
                paymentMode === 'manual'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Malipo ya Benki / Wakala (Manual Approval)' : 'Bank / Cash Approval'}</span>
            </button>
          </div>

          {paymentMode === 'mobile' ? (
            /* MOBILE MONEY PAYMENT FLOW */
            <div className="space-y-5">
              {/* Phone Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{lang === 'sw' ? 'Weka Nambari Yako ya Simu ya Malipo:' : 'Mobile Money Phone Number:'}</span>
                  {carrierInfo && (
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: carrierInfo.bgColor, color: carrierInfo.textColor }}
                    >
                      {carrierInfo.name}
                    </span>
                  )}
                </label>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="07xxxxxxxx au 06xxxxxxxx"
                    className="w-full pl-10 pr-4 py-3 text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-emerald-600 focus:outline-hidden transition"
                  />
                </div>

                <p className="text-[11px] text-slate-500">
                  {lang === 'sw'
                    ? 'Mitandao inayoungwa mkono: Vodacom M-Pesa, Tigo Pesa, Airtel Money na Halopesa.'
                    : 'Supported: Vodacom M-Pesa, Tigo Pesa, Airtel Money, and Halopesa.'}
                </p>
              </div>

              {/* Carrier Selection Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'VODACOM', name: 'M-Pesa', color: 'bg-red-600', border: 'border-red-600' },
                  { id: 'TIGO', name: 'Tigo Pesa', color: 'bg-blue-600', border: 'border-blue-600' },
                  { id: 'AIRTEL', name: 'Airtel', color: 'bg-rose-600', border: 'border-rose-600' },
                  { id: 'HALOTEL', name: 'Halopesa', color: 'bg-orange-500', border: 'border-orange-500' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCarrier(c.id as any)}
                    className={`py-2 px-1.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                      selectedCarrier === c.id
                        ? `${c.border} bg-slate-900 text-white shadow-md ring-2 ring-emerald-500/20`
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {initiateError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{initiateError}</span>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="button"
                onClick={handleInitiatePush}
                disabled={initiating}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-base shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {initiating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{lang === 'sw' ? 'Inatuma Ombi la Malipo (USSD)...' : 'Sending USSD Push...'}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {lang === 'sw'
                        ? `Lipia Sh ${currentFee.toLocaleString()} (${selectedPackage.name}) Sasa & Fungua Mfumo`
                        : `Pay TZS ${currentFee.toLocaleString()} (${selectedPackage.name}) Now`}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            /* MANUAL CASH / BANK RECONCILIATION FLOW */
            <form onSubmit={handleSubmitManualRequest} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {lang === 'sw'
                    ? 'Kama umelipa kupitia Wakala, Benki au Taslimu moja kwa moja kwa Vendor, jaza taarifa za risiti hapa chini ili akaunti yako ifunguliwe.'
                    : 'If you paid cash or bank transfer directly to the Vendor Admin, submit details below.'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Njia Uliyotumia Kulipa:' : 'Payment Method:'}
                  </label>
                  <select
                    value={manualPaymentMethod}
                    onChange={(e) => setManualPaymentMethod(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-hidden"
                  >
                    <option value="CASH">Taslimu (Cash)</option>
                    <option value="BANK_TRANSFER">Benki (CRDB, NMB n.k.)</option>
                    <option value="MANUAL_MPESA">M-Pesa Wakala / Lipa Namba</option>
                    <option value="MANUAL_TIGO">Tigo Pesa Wakala</option>
                    <option value="MANUAL_AIRTEL">Airtel Money Wakala</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {lang === 'sw' ? 'Namba ya Risiti / Reference:' : 'Receipt Number / Ref:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={manualReferenceNote}
                    onChange={(e) => setManualReferenceNote(e.target.value)}
                    placeholder="Mfano: MP26049281 au NMB Ref 88291"
                    className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'sw' ? 'Maelezo ya Ziada (Hiari):' : 'Additional Notes (Optional):'}
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Maelezo yoyote unayotaka kuongeza kwa Vendor Admin..."
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              {manualSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{manualSuccessMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submittingManual}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {submittingManual ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inatuma ombi...</span>
                  </>
                ) : (
                  <>
                    <span>{lang === 'sw' ? 'Tuma Ombi la Uthibitisho kwa Vendor' : 'Submit for Vendor Approval'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Guarantee Badges */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>MikroTik Live Sync 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>M-Pesa & Tigo Pesa STK</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Uchapishaji wa Vocha</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Usaidizi wa Kiufundi</span>
            </div>
          </div>
        </div>
      </div>

      {/* POP-UP YA MALIPO (Interactive USSD Push Confirmation Modal) */}
      {showPaymentModal && paymentSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Smartphone className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {paymentSuccess
                      ? lang === 'sw'
                        ? 'Malipo Yamekamilika!'
                        : 'Payment Verified!'
                      : lang === 'sw'
                      ? 'Thibitisha Malipo Kwenye Simu'
                      : 'Authorize Payment on Phone'}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Rejea: {paymentSession.reference}
                  </span>
                </div>
              </div>
            </div>

            {paymentFailedError ? (
              /* FAILED / INSUFFICIENT BALANCE STATE */
              <div className="py-4 text-center space-y-4 animate-in fade-in">
                {isInsufficientBalance(paymentFailedError) ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
                      <Wallet className="w-8 h-8 stroke-[2.2]" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-lg font-black text-amber-950">
                        {lang === 'sw' ? 'Account Haina Salio la Kutosha' : 'Insufficient Account Balance'}
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed max-w-xs mx-auto">
                        {lang === 'sw'
                          ? `Salio kwenye akaunti yako ya simu (${phoneNumber}) halitoshi kulipia ada ya kifurushi cha '${paymentSession.packageName || selectedPackage.name}' (TZS ${paymentSession.amount.toLocaleString()}). Tafadhali weka salio kwenye simu yako kisha ujaribu tena.`
                          : `Your mobile wallet (${phoneNumber}) does not have enough balance to pay TZS ${paymentSession.amount.toLocaleString()}. Please top up your wallet and try again.`}
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium text-left flex items-start gap-2">
                      <span className="text-amber-600 font-bold shrink-0 text-sm">💡</span>
                      <span>
                        {lang === 'sw'
                          ? 'Weka salio la kutosha kwenye akaunti yako ya mtandao, kisha bofya kitufe cha chini kujaribu tena.'
                          : 'Deposit funds into your mobile money wallet, then click the button below to retry.'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFailedError(null);
                        handleInitiatePush();
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      {lang === 'sw' ? 'Weka Salio Kisha Jaribu Tena' : 'Top Up & Try Again'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFailedError(null);
                        setShowPaymentModal(false);
                      }}
                      className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                    >
                      {lang === 'sw' ? 'Funga' : 'Close'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8" />
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {lang === 'sw' ? 'Malipo Hayakukamilika' : 'Payment Failed'}
                      </h4>
                      <p className="text-xs text-rose-600 mt-1 font-medium">
                        {paymentFailedError}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentFailedError(null);
                        setShowPaymentModal(false);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      {lang === 'sw' ? 'Jaribu Tena' : 'Close and Retry'}
                    </button>
                  </>
                )}
              </div>
            ) : paymentSuccess ? (
              /* Success Unlocked State */
              <div className="py-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20 animate-in zoom-in">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
                <h4 className="text-xl font-black text-slate-900">
                  {lang === 'sw' ? 'Mfumo Wako Umefunguliwa!' : 'System Unlocked Successfully!'}
                </h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  {lang === 'sw'
                    ? `Uthibitisho wa malipo ya Sh ${paymentSession.amount.toLocaleString()} kwa kifurushi cha '${paymentSession.packageName || selectedPackage.name}' umekamilika! Dashibodi yako inafunguka sasa hivi...`
                    : `Your ${paymentSession.packageName || selectedPackage.name} subscription is now active! Redirecting to dashboard...`}
                </p>
                <div className="flex justify-center pt-2">
                  <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                </div>
              </div>
            ) : (
              /* Live Push Confirmation In-Progress */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'sw' ? 'Ombi Limetumwa Kwenye Simu!' : 'Prompt Sent to Device'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {paymentSession.instructions}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-amber-800 border-t border-amber-200/60 mt-1">
                    <span>Kifurushi: <strong>{paymentSession.packageName || selectedPackage.name}</strong></span>
                    <span>Kiasi: <strong>{formatTzs(paymentSession.amount)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>
                    {lang === 'sw'
                      ? 'Inasubiri uweke PIN kwenye simu yako...'
                      : 'Waiting for mobile money network response...'}
                  </span>
                </div>

                {/* Real Live Payment Confirmation Status */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5">
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>{lang === 'sw' ? 'Weka PIN Yako Kwenye Simu' : 'Enter PIN On Phone'}</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      {lang === 'sw'
                        ? 'Baada ya kuweka PIN, bofya kitufe cha kijani hapa chini au subiri sekunde chache mfumo utathibitisha na kufungua akaunti yako moja kwa moja.'
                        : 'Enter your PIN on your mobile device. The system will verify and unlock automatically.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifySubscriptionNow}
                    disabled={manualChecking}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {manualChecking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-emerald-100" />}
                    <span>
                      {lang === 'sw'
                        ? manualChecking ? 'Inathibitisha na mtandao sasa...' : 'Nimeshaweka PIN • Thibitisha Malipo Sasa'
                        : manualChecking ? 'Checking network status...' : 'I have entered PIN • Verify Payment Now'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition rounded-xl hover:bg-slate-100 cursor-pointer text-center block"
                  >
                    {lang === 'sw' ? 'Ghairi au Badilisha Namba ya Simu' : 'Cancel or Change Number'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
