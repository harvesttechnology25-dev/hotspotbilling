import React, { useState } from 'react';
import { Plan } from '../../types/index.ts';
import { KeyRound, Loader2, ArrowRight, AlertCircle, Wifi, ExternalLink } from 'lucide-react';

interface VoucherLoginProps {
  onSuccess: (voucherCode: string, plan: Plan) => void;
  linkLogin?: string;
  linkOrig?: string;
  macAddress?: string;
  lang: 'sw' | 'en';
}

export const VoucherLogin: React.FC<VoucherLoginProps> = ({
  onSuccess,
  linkLogin = 'http://192.168.88.1/login',
  linkOrig = 'http://www.google.com',
  macAddress,
  lang,
}) => {
  const [voucherCode, setVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [redeemed, setRedeemed] = useState<{
    code: string;
    password: string;
    plan: Plan;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherCode.trim().toUpperCase(),
          macAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Vocha siyo sahihi au imekwisha muda.');
      }

      setRedeemed({
        code: data.voucher.code,
        password: data.voucher.password || data.voucher.code,
        plan: data.plan,
      });

      onSuccess(data.voucher.code, data.plan);
    } catch (err: any) {
      setError(err.message || 'Hitilafu ya kuingia na vocha.');
    } finally {
      setLoading(false);
    }
  };

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
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-1">
              {lang === 'sw' ? 'Nambari ya Vocha' : 'Voucher PIN'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="TZ-XXXXX au PIN"
                maxLength={20}
                className="w-full px-4 py-3 text-lg font-mono font-bold tracking-widest text-center uppercase rounded-xl border-2 border-slate-200 focus:border-indigo-600 focus:outline-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !voucherCode.trim()}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
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
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
            {lang === 'sw'
              ? `Vocha ${redeemed.code} imekubaliwa! Unaweza kuunganishwa kwenye mtandao mara moja.`
              : `Voucher ${redeemed.code} verified! You can now log into the router.`}
          </div>

          <form method="POST" action={linkLogin}>
            <input type="hidden" name="username" value={redeemed.code} />
            <input type="hidden" name="password" value={redeemed.password} />
            <input type="hidden" name="dst" value={linkOrig} />
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Unganisha Kwenye Intaneti (Auto-Login)' : 'Auto-Login To Hotspot'}</span>
            </button>
          </form>

          <a
            href={`${linkLogin}?username=${redeemed.code}&password=${redeemed.password}&dst=${encodeURIComponent(linkOrig)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <span>Direct router login page</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Wifi className="w-3.5 h-3.5" />
        <span>MikroTik RouterOS High-Speed Gateway</span>
      </div>
    </div>
  );
};
