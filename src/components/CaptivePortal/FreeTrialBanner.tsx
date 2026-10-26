import React, { useState, useEffect } from 'react';
import { Gift, Zap, Lock, Clock, CheckCircle2, AlertCircle, Loader2, Sparkles, Shield } from 'lucide-react';
import { Plan } from '../../types/index.ts';

interface FreeTrialBannerProps {
  mac: string;
  ip: string;
  routerId?: number;
  lang: 'sw' | 'en';
  onClaimSuccess: (voucherCode: string, plan: Plan) => void;
  linkLogin?: string;
  isRealHotspotRedirect?: boolean;
}

export const FreeTrialBanner: React.FC<FreeTrialBannerProps> = ({
  mac,
  ip,
  routerId,
  lang,
  onClaimSuccess,
  linkLogin,
  isRealHotspotRedirect,
}) => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [available, setAvailable] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimedAt, setClaimedAt] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [trialConfig, setTrialConfig] = useState<any>(null);

  // Check trial status for this MAC address
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          ...(mac ? { mac } : {}),
          ...(routerId ? { routerId: String(routerId) } : {}),
        });
        const res = await fetch(`/api/v1/portal/free-trial/status?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setEnabled(data.enabled !== false);
            setAvailable(Boolean(data.available));
            setClaimed(Boolean(data.claimed));
            if (data.claimedAt) setClaimedAt(data.claimedAt);
            if (data.config) setTrialConfig(data.config);
          }
        }
      } catch (err) {
        console.error('Failed to check free trial status:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [mac, routerId]);

  const handleClaim = async () => {
    if (claiming) return;

    // If the customer has already claimed their trial, reject immediately on click
    if (claimed) {
      setError(
        lang === 'sw'
          ? 'Umeshatumia jaribio la bure (Already used free trial). Kila kifaa kinaruhusiwa mara 1 tu milele. Tafadhali chagua kifurushi hapa chini ili uendelee!'
          : 'Already used free trial. Strictly 1 trial per device. Please select a package below to continue!'
      );
      return;
    }

    setClaiming(true);
    setError('');

    try {
      const res = await fetch('/api/v1/portal/free-trial/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac,
          ip,
          routerId,
          linkLogin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.claimed) {
          setClaimed(true);
          throw new Error(
            data.error ||
              (lang === 'sw'
                ? 'Umeshatumia jaribio la bure (Already used free trial). Kila kifaa kinaruhusiwa mara 1 tu milele.'
                : 'Already used free trial. Strictly 1 trial allowed per device.')
          );
        }
        throw new Error(data.error || 'Hitilafu ya kufungua intaneti ya bure.');
      }

      setSuccess(true);
      setAvailable(false);
      setClaimed(true);

      const durationMinutes = data.durationMinutes || trialConfig?.duration_minutes || 15;
      const durationSeconds = durationMinutes * 60;
      const rateLimit = trialConfig?.rate_limit || '2M/4M';

      const trialPlan: Plan = {
        id: 9999,
        name: trialConfig?.name || (lang === 'sw' ? `Majaribio ya Bure (Dakika ${durationMinutes})` : `Free Trial (${durationMinutes} Minutes)`),
        type: 'TIME_BASED',
        limit_uptime: durationSeconds,
        limit_bytes_total: trialConfig?.quota_mb ? trialConfig.quota_mb * 1024 * 1024 : null,
        rate_limit: rateLimit,
        price: 0,
        validity_period: durationSeconds,
        shared_users: 1,
        is_active: true,
        description_sw: trialConfig?.description_sw || `Dakika ${durationMinutes} za intaneti ya bure ya majaribio kwenye kifaa hiki`,
        description_en: trialConfig?.description_en || `${durationMinutes} Minutes free high-speed trial on this device`,
      };

      // Notify parent to set active session with live countdown
      onClaimSuccess(data.voucher.code, trialPlan);

      // If redirected from hardware captive portal (MikroTik / Ruijie), submit credentials
      if (isRealHotspotRedirect && linkLogin && typeof document !== 'undefined') {
        setTimeout(() => {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = linkLogin;

          const userInput = document.createElement('input');
          userInput.type = 'hidden';
          userInput.name = 'username';
          userInput.value = data.voucher.code;
          form.appendChild(userInput);

          const passInput = document.createElement('input');
          passInput.type = 'hidden';
          passInput.name = 'password';
          passInput.value = data.voucher.code;
          form.appendChild(passInput);

          document.body.appendChild(form);
          form.submit();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Hitilafu wakati wa kujiunga na majaribio ya bure.');
    } finally {
      setClaiming(false);
    }
  };

  if (!enabled) {
    return null;
  }

  const durationMinutes = trialConfig?.duration_minutes || 15;
  const rateLimit = trialConfig?.rate_limit || '2M/4M';
  const quotaMb = trialConfig?.quota_mb || 0;
  const lockPolicy = trialConfig?.lock_policy || 'LIFETIME';
  const buttonText = trialConfig?.button_text || (lang === 'sw' ? '⚡ Jiunge Bure Sasa' : '⚡ Connect Free Now');

  // Case 2: Just Successfully Claimed
  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 shadow-sm animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-950">
              {lang === 'sw' ? `🎉 Umeunganishwa na Dakika ${durationMinutes} za Bure!` : `🎉 ${durationMinutes}-Minute Free Trial Connected!`}
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              {lang === 'sw'
                ? `Intaneti yako sasa iko hewani (Kasi: ${rateLimit}). Kaunta ya muda inahesabu hapa chini.`
                : `Your high-speed access is now live (Speed: ${rateLimit}). Countdown timer active below.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: AVAILABLE! 1-Click Instant Connect with User Configured Limits
  const bannerTitle = trialConfig?.name || (lang === 'sw' ? `Pata Dakika ${durationMinutes} za Bure Papo Hapo!` : `Get ${durationMinutes} Minutes Free Right Now!`);
  const bannerDesc = (lang === 'sw' ? trialConfig?.description_sw : trialConfig?.description_en) ||
    (lang === 'sw'
      ? 'Bofya kitufe kimoja tu uunganishwe moja kwa moja na intaneti ya kasi. Hakuna kujaza fomu, hakuna namba ya simu wala malipo!'
      : 'Click once to instantly connect to high-speed internet. No signup forms, no phone numbers, and no payment required!');

  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-3.5 sm:p-4 shadow-xl shadow-emerald-950/20 min-w-0">
      {/* Decorative ambient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 min-w-0">
        {/* Left side details */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 text-[10px] sm:text-[11px] font-black uppercase tracking-wider max-w-full truncate">
            <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse shrink-0" />
            <span className="truncate">{lang === 'sw' ? 'Majaribio ya Bure • Bofya Mara 1 Tu' : 'Free Trial • 1-Click Connect'}</span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2 break-words">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300 shrink-0" />
            <span className="break-words">{bannerTitle}</span>
          </h3>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-lg break-words">
            {bannerDesc}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] sm:text-[11px] text-emerald-200/80">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
              <span>{lang === 'sw' ? `Muda: Dakika ${durationMinutes}` : `Duration: ${durationMinutes} Min`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>{lang === 'sw' ? `Kasi: ${rateLimit}` : `Speed: ${rateLimit}`}</span>
            </div>
            {quotaMb > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-bold text-yellow-200">Data: {quotaMb} MB</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>
                {lockPolicy === 'LIFETIME'
                  ? (lang === 'sw' ? 'Mara 1 kwa kifaa milele' : 'Once per device')
                  : (lang === 'sw' ? 'Mara 1 kila saa 24' : 'Once every 24h')}
              </span>
            </div>
          </div>
        </div>

        {/* Right side CTA Button */}
        <div className="shrink-0 flex flex-col items-stretch md:items-end justify-center w-full md:w-auto">
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="group relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-900/40 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {claiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>{lang === 'sw' ? 'Inaunganisha...' : 'Connecting...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-slate-950 fill-current group-hover:animate-bounce" />
                <span>{buttonText}</span>
              </>
            )}
          </button>
          {mac && (
            <span className="text-[10px] text-emerald-200/70 text-center md:text-right mt-1.5 font-mono truncate">
              MAC: {mac}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3.5 p-3.5 rounded-2xl bg-red-950/95 border-2 border-red-500 text-white text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xl shadow-red-950/60 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-red-600/40 text-red-300 flex items-center justify-center shrink-0 mt-0.5 border border-red-500/40">
              <AlertCircle className="w-4 h-4 text-red-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-red-200 bg-red-900/80 px-2 py-0.5 rounded-md border border-red-500/40">
                  {lang === 'sw' ? 'Ombi Limekataliwa' : 'Request Denied'}
                </span>
                <span className="text-[11px] font-bold text-red-300 font-mono">
                  Already used free trial
                </span>
              </div>
              <p className="mt-1 text-xs text-red-100 font-semibold leading-relaxed">
                {error}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="text-red-300 hover:text-white p-1 rounded-lg hover:bg-red-900/60 transition shrink-0 cursor-pointer text-sm font-bold"
            title={lang === 'sw' ? 'Funga ujumbe' : 'Close'}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
