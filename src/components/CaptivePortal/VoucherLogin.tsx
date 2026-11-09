import React, { useState } from 'react';
import { Plan } from '../../types/index.ts';
import { KeyRound, Loader2, ArrowRight, AlertCircle, Wifi, ExternalLink } from 'lucide-react';

interface VoucherLoginProps {
  onSuccess: (voucherCode: string, plan: Plan) => void;
  linkLogin?: string;
  linkOrig?: string;
  macAddress?: string;
  lang: 'sw' | 'en';
  selectedPlan?: Plan | null;
  plans?: Plan[];
  onSelectPlan?: (planId: number | null) => void;
  routerId?: number;
  routerName?: string;
  apMac?: string;
  siteId?: string;
  ssidName?: string;
  target?: string;
  targetPort?: string;
  isOmada?: boolean;
}

export const VoucherLogin: React.FC<VoucherLoginProps> = ({
  onSuccess,
  linkLogin = 'http://192.168.88.1/login',
  linkOrig = 'http://www.google.com',
  macAddress,
  lang,
  selectedPlan,
  plans = [],
  onSelectPlan,
  routerId,
  routerName,
  apMac,
  siteId,
  ssidName,
  target,
  targetPort,
  isOmada = false,
}) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mismatchedPlanSuggestion, setMismatchedPlanSuggestion] = useState<{ id: number; name: string } | null>(null);
  const [activeTargetPlanId, setActiveTargetPlanId] = useState<number | 'ANY'>(
    selectedPlan?.id ? selectedPlan.id : 'ANY'
  );
  const [redeemed, setRedeemed] = useState<{
    code: string;
    password: string;
    plan: Plan;
    isOmada?: boolean;
    omadaAuthorized?: boolean;
  } | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);

  // Sync active target plan when selectedPlan prop changes
  React.useEffect(() => {
    if (selectedPlan?.id) {
      setActiveTargetPlanId(selectedPlan.id);
    }
  }, [selectedPlan?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setLoading(true);
    setError('');
    setMismatchedPlanSuggestion(null);

    try {
      const payload: Record<string, any> = {
        code: voucherCode.trim().toUpperCase(),
        macAddress,
        clientMac: macAddress,
        apMac,
        siteId,
        ssidName,
        target,
        targetPort,
      };

      if (routerId) {
        payload.routerId = routerId;
      }

      if (activeTargetPlanId !== 'ANY') {
        payload.selectedPlanId = Number(activeTargetPlanId);
      }

      const res = await fetch('/api/v1/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.voucherPlanId && data.voucherPlanName) {
          setMismatchedPlanSuggestion({
            id: Number(data.voucherPlanId),
            name: data.voucherPlanName,
          });
        }
        throw new Error(data.error || 'Vocha siyo sahihi au imekwisha muda.');
      }

      const isTargetOmada = Boolean(data.isOmada || data.omadaAuthorized || isOmada || apMac);

      setRedeemed({
        code: data.voucher.code,
        password: data.voucher.password || data.voucher.code,
        plan: data.plan,
        isOmada: isTargetOmada,
        omadaAuthorized: Boolean(data.omadaAuthorized),
      });

      onSuccess(data.voucher.code, data.plan);
    } catch (err: any) {
      setError(err.message || 'Hitilafu ya kuingia na vocha.');
    } finally {
      setLoading(false);
    }
  };

  const handleOmadaBrowse = () => {
    setIsBrowsing(true);
    const destination =
      linkOrig && linkOrig !== 'http://www.google.com'
        ? linkOrig
        : 'http://connectivitycheck.gstatic.com/generate_204';
    window.location.href = destination;
  };

  const effectiveIsOmada = Boolean(redeemed?.isOmada || isOmada || apMac || target);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="text-center space-y-1 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <KeyRound className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-900 text-base">
          {lang === 'sw' ? 'Weka Nambari ya Vocha' : 'Enter Voucher Code / PIN'}
        </h3>
        <p className="text-xs text-slate-500">
          {lang === 'sw'
            ? 'Ikiwa una kadi ya vocha uliyonunua dukani au kwa wakala wetu'
            : 'If you purchased a printed scratch voucher card from an agent'}
        </p>
      </div>

      {!redeemed ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Package Context / Selector */}
          {plans.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>{lang === 'sw' ? 'Kifurushi cha Vocha Hii:' : 'Target Package:'}</span>
                </span>
                {activeTargetPlanId !== 'ANY' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTargetPlanId('ANY');
                      onSelectPlan?.(null);
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    {lang === 'sw' ? 'Kubali Kifurushi Chochote' : 'Allow Any Package'}
                  </button>
                )}
              </div>

              <select
                value={String(activeTargetPlanId)}
                onChange={(e) => {
                  const val = e.target.value === 'ANY' ? 'ANY' : Number(e.target.value);
                  setActiveTargetPlanId(val);
                  onSelectPlan?.(val === 'ANY' ? null : val);
                  setError('');
                  setMismatchedPlanSuggestion(null);
                }}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 text-xs focus:border-indigo-600 focus:outline-none"
              >
                <option value="ANY">{lang === 'sw' ? '🔍 Angalia Kifurushi Kiotomatiki (Auto-Detect)' : '🔍 Auto-Detect Matching Package'}</option>
                {plans.map((p) => (
                  <option key={`voucher-target-plan-${p.id}`} value={p.id}>
                    {p.name} • {p.price} TZS ({p.rate_limit || 'Kasi ya Juu'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1">
              {lang === 'sw' ? 'Nambari ya Vocha' : 'Voucher PIN'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="TZ-XXXXX au PIN"
                maxLength={20}
                className="w-full px-4 py-3 text-lg font-mono font-bold tracking-widest text-center uppercase rounded-xl border-2 border-slate-200 focus:border-indigo-600 focus:outline-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>

              {mismatchedPlanSuggestion && (
                <div className="pt-1.5 border-t border-rose-200/70 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-800 font-medium">
                    {lang === 'sw'
                      ? `Je, unataka kubadili iwe: '${mismatchedPlanSuggestion.name}'?`
                      : `Switch to '${mismatchedPlanSuggestion.name}'?`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTargetPlanId(mismatchedPlanSuggestion.id);
                      onSelectPlan?.(mismatchedPlanSuggestion.id);
                      setError('');
                      setMismatchedPlanSuggestion(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                  >
                    {lang === 'sw' ? 'Badilisha na Jaribu' : 'Switch & Retry'}
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !voucherCode.trim()}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{lang === 'sw' ? 'Unganisha Sasa' : 'Connect Now'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-4 text-center animate-in fade-in">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium space-y-1">
            <div className="font-bold text-sm text-emerald-950 flex items-center justify-center gap-1.5">
              <Wifi className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'sw' ? '🎉 Vocha Imekubaliwa Kikamilifu!' : '🎉 Voucher Verified Successfully!'}</span>
            </div>
            <p>
              {lang === 'sw'
                ? `Vocha ${redeemed.code} imekamilika! Kifaa chako kimeruhusiwa kutumia intaneti.`
                : `Voucher ${redeemed.code} verified! Your device is granted access.`}
            </p>
          </div>

          {effectiveIsOmada ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOmadaBrowse}
                disabled={isBrowsing}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isBrowsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                <span>{lang === 'sw' ? 'FUNGUA INTANETI SASA (BROWSE NOW)' : 'BROWSE INTERNET NOW'}</span>
              </button>
              <p className="text-[11px] text-slate-500">
                {lang === 'sw'
                  ? 'Access Point yako ya TP-Link Omada imeshafunguliwa moja kwa moja.'
                  : 'Your TP-Link Omada Access Point has unblocked your client.'}
              </p>
            </div>
          ) : (
            <form method="POST" action={linkLogin}>
              <input type="hidden" name="username" value={redeemed.code} />
              <input type="hidden" name="password" value={redeemed.password} />
              <input type="hidden" name="dst" value={linkOrig} />
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Wifi className="w-4 h-4" />
                <span>{lang === 'sw' ? 'Unganisha Kwenye Intaneti (Auto-Login)' : 'Auto-Login To Hotspot'}</span>
              </button>
            </form>
          )}

          {!effectiveIsOmada && (
            <a
              href={`${linkLogin}?username=${redeemed.code}&password=${redeemed.password}&dst=${encodeURIComponent(linkOrig)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
            >
              <span>Direct router login page</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Wifi className="w-3.5 h-3.5" />
        <span>TP-Link Omada & MikroTik RouterOS Multi-Carrier Gateway</span>
      </div>
    </div>
  );
};

