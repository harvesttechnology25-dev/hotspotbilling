import React, { useState, useEffect } from 'react';
import { HotspotOwner, NetworkProvider } from '../../types/index.ts';
import { detectCarrierFromInput, CARRIERS, formatTzs } from '../../utils/carrierInfo.ts';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
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
} from 'lucide-react';

interface SubscriptionGateProps {
  owner: HotspotOwner;
  onRenewSuccess: (updatedOwner: HotspotOwner) => void;
  onLogout: () => void;
  lang?: 'sw' | 'en';
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({
  owner,
  onRenewSuccess,
  onLogout,
  lang = 'en',
}) => {
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
  } | null>(null);

  const [paymentMode, setPaymentMode] = useState<'mobile' | 'manual'>('mobile');
  const [manualPaymentMethod, setManualPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MANUAL_MPESA' | 'MANUAL_TIGO' | 'MANUAL_AIRTEL'>('CASH');
  const [manualReferenceNote, setManualReferenceNote] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');
  const [manualSubmitted, setManualSubmitted] = useState(false);

  const [confirming, setConfirming] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const fee = owner.subscription_fee || owner.monthly_fee || 15000;

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
  }, [owner.id, onRenewSuccess]);

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
            setTimeout(() => {
              if (data.user) {
                onRenewSuccess(data.user);
              } else {
                onRenewSuccess({
                  ...owner,
                  subscription_status: 'ACTIVE',
                  subscription_expires_at: data.expiresAt,
                });
              }
            }, 1500);
          }
        }
      } catch (err) {
        console.error('Verify poll error:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showPaymentModal, paymentSession?.reference, paymentSuccess, owner, onRenewSuccess]);

  // Countdown timer effect
  useEffect(() => {
    if (!showPaymentModal || paymentSuccess || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [showPaymentModal, paymentSuccess, countdown]);

  // Handle phone change and auto-detect carrier
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
          amount: fee,
          durationDays: 30,
          paymentMethod: manualPaymentMethod,
          referenceNote: manualReferenceNote.trim(),
          notes: manualNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kutuma ombi');

      setManualSubmitted(true);
      setManualSuccessMsg(
        lang === 'sw'
          ? '✓ Ombi lako la uthibitisho limetumwa kwa Vendor Admin! Akaunti yako itafunguka papo hapo akithibitisha (au piga simu/WhatsApp hapo chini kwa uthibitisho wa haraka).'
          : '✓ Manual approval request sent to Vendor Admin! Your account will unlock as soon as approved.'
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hitilafu ya kuanzisha malipo.');
      }

      setPaymentSession({
        reference: data.externalReference,
        instructions: data.instructions,
        amount: data.amount,
        carrier: carrierToUse,
      });

      setShowPaymentModal(true);
      setCountdown(60);
    } catch (err: any) {
      setInitiateError(err.message || 'Imeshindwa kuanzisha ombi la malipo.');
    } finally {
      setInitiating(false);
    }
  };

  // Confirm payment and unlock system automatically
  const handleConfirmPayment = async (simulate = true) => {
    setConfirming(true);
    try {
      const res = await fetch('/api/v1/subscription/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: owner.id,
          externalReference: paymentSession?.reference,
          simulateSuccess: simulate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Malipo hayajathibitishwa.');
      }

      setPaymentSuccess(true);

      // Auto-unlock system after brief celebratory checkmark!
      setTimeout(() => {
        if (data.user) {
          onRenewSuccess(data.user);
        } else {
          onRenewSuccess({
            ...owner,
            subscription_status: 'ACTIVE',
            subscription_expires_at: data.newExpiresAt,
          });
        }
      }, 1600);
    } catch (err: any) {
      alert(err.message || 'Hitilafu ya kuthibitisha malipo.');
    } finally {
      setConfirming(false);
    }
  };

  const carrierInfo = selectedCarrier ? CARRIERS[selectedCarrier] : null;

  return (
    <div className="min-h-screen bg-slate-900/95 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Warning Card */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 border-2 border-rose-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-44 h-44 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{lang === 'sw' ? 'Ada ya Mwezi Inahitajika' : 'Monthly Subscription Due'}</span>
              </span>

              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Toka kwenye Akaunti' : 'Sign Out'}</span>
              </button>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {lang === 'sw'
                  ? 'Muda wa Huduma ya Mwezi Umeisha'
                  : 'Your Monthly Hotspot Access Has Expired'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {lang === 'sw'
                  ? `Habari ${owner.name}! Ili uendelee kudhibiti MikroTik Router, kuona wateja waliopo online na kukusanya malipo ya mtandao wako wa (${owner.business_name}), tafadhali lipia ada ya mwezi huu.`
                  : `Hello ${owner.name}! To continue managing your MikroTik router, monitoring online hotspot users, and collecting mobile payments for ${owner.business_name}, please renew your subscription.`}
              </p>
            </div>

            {/* Account Details Capsule */}
            <div className="bg-black/30 rounded-2xl p-3 border border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Hotspot Yako</span>
                <span className="font-bold text-white truncate block">{owner.business_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Namba ya Akaunti</span>
                <span className="font-bold text-white font-mono">{owner.phone}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Kiasi cha Kulipa</span>
                <span className="font-black text-emerald-400 text-sm">{formatTzs(fee)} / Mwezi</span>
              </div>
            </div>

            {/* Instant Automated Unlock Reassurance */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="text-white font-bold text-xs block">
                    {lang === 'sw' ? 'Malipo Salama ya Mtandao' : 'Secure Instant Payment'}
                  </span>
                  <span className="text-[11px] text-slate-300 block">
                    {lang === 'sw' ? 'Mfumo wako utafunguka moja kwa moja ukikamilisha malipo' : 'Your system will unlock automatically upon payment'}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold">
                  {lang === 'sw' ? 'Papo kwa Papo' : 'Instant Unlock'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Formulation Card */}
        <div className="bg-white rounded-3xl p-6 text-slate-900 shadow-2xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                {lang === 'sw' ? 'Lipia Subscription kwa Simu ya Mkononi' : 'Pay Subscription via Mobile Money'}
              </h2>
              <span className="text-xs text-slate-500">
                {lang === 'sw'
                  ? 'Ujumbe wa USSD Push (PIN) utatumwa moja kwa moja kwenye simu yako.'
                  : 'An instant push prompt will be sent to your phone for approval.'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-600 block leading-none">
                {formatTzs(fee)}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Siku 30 (Mwezi 1)</span>
            </div>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{lang === 'sw' ? 'Weka Nambari Yako ya Simu ya Malipo:' : 'Mobile Money Phone Number:'}</span>
              {carrierInfo && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: carrierInfo.bgColor, color: carrierInfo.textColor }}>
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
                className="w-full pl-10 pr-4 py-3 text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-600 focus:outline-hidden transition"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              {lang === 'sw'
                ? 'Mitandao inayoungwa mkono: Vodacom M-Pesa, Tigo Pesa, Airtel Money na Halopesa.'
                : 'Supported: Vodacom M-Pesa, Tigo Pesa, Airtel Money, and Halopesa.'}
            </p>
          </div>

          {/* Quick Carrier Selector Buttons */}
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
                className={`py-2 px-1.5 rounded-xl border text-xs font-bold text-center transition flex flex-col items-center gap-1 ${
                  selectedCarrier === c.id
                    ? `${c.border} bg-slate-900 text-white shadow-md ring-2 ring-indigo-500/20`
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
                <span>{lang === 'sw' ? 'Inatuma Ombi la USSD...' : 'Sending USSD Push...'}</span>
              </>
            ) : (
              <>
                <span>{lang === 'sw' ? `Lipia Sh ${fee.toLocaleString()} Sasa` : `Pay TZS ${fee.toLocaleString()} Now`}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Feature List included in subscription */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>MikroTik Live Sync 24/7</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Malipo ya M-Pesa & Tigo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Uchapishaji wa Vocha</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Usaidizi wa Kiufundi</span>
            </div>
          </div>
        </div>
      </div>

      {/* POP-UP YA MALIPO (Interactive USSD Push Confirmation Modal) */}
      {showPaymentModal && paymentSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
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

            {paymentSuccess ? (
              /* Success Unlocked State */
              <div className="py-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20 animate-in zoom-in">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  {lang === 'sw' ? 'Mfumo Wako Umefunguliwa!' : 'System Unlocked Successfully!'}
                </h4>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">
                  {lang === 'sw'
                    ? 'Uthibitisho wa malipo ya Sh 15,000 umekamilika. Unapelekwa kwenye dashibodi yako sasa hivi...'
                    : 'Your TZS 15,000 subscription is active for the next 30 days. Redirecting to your dashboard...'}
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
                    <span>{lang === 'sw' ? 'Ombi Limetumwa!' : 'Prompt Sent to Device'}</span>
                  </div>
                  <p className="leading-relaxed">
                    {paymentSession.instructions}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] font-semibold text-amber-800">
                    <span>Namba: <strong>{phoneNumber}</strong></span>
                    <span>Kiasi: <strong>{formatTzs(paymentSession.amount)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 py-2 text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span>
                    {lang === 'sw'
                      ? 'Inasubiri uthibitisho wa mtandao wako wa simu...'
                      : 'Waiting for mobile money network response...'}
                  </span>
                </div>

                {/* Instant Simulation Button (User can click to instantly approve without telecom wait) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(true)}
                    disabled={confirming}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {confirming ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{lang === 'sw' ? 'Inathibitisha...' : 'Verifying...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {lang === 'sw'
                            ? 'Nimeshaweka PIN (Fungua Mfumo Sasa)'
                            : 'I have entered PIN (Unlock System)'}
                        </span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
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
