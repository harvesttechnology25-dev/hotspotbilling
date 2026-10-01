import React, { useEffect, useState } from 'react';
import { NetworkProvider, Plan } from '../../types/index.ts';
import { CARRIERS, formatTzs } from '../../utils/carrierInfo.ts';
import { generateQrCodeUrl } from '../../utils/qrHelper.ts';
import {
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Wifi,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Zap,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  phoneNumber: string;
  carrier: NetworkProvider;
  externalReference: string;
  instructions?: string;
  hotspotUrl?: string;
  linkLogin?: string;
  linkOrig?: string;
  onPaymentSuccess: (voucherCode: string, plan: Plan) => void;
  lang?: 'sw' | 'en';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  phoneNumber,
  carrier,
  externalReference,
  instructions,
  hotspotUrl,
  linkLogin,
  linkOrig = 'http://www.gstatic.com/generate_204',
  onPaymentSuccess,
  lang = 'sw',
}) => {
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING');
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const [voucherData, setVoucherData] = useState<{
    code: string;
    password?: string;
    expiresAt?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const carrierInfo = CARRIERS[carrier] || CARRIERS.VODACOM;

  // Poll for payment approval via Webhook / Network confirmation
  useEffect(() => {
    if (!isOpen || !externalReference || status !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/payments/status/${externalReference}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === 'SUCCESS' && data.voucher) {
          setStatus('SUCCESS');
          setVoucherData({
            code: data.voucher.code,
            password: data.voucher.password,
            expiresAt: data.voucher.expires_at,
          });
          onPaymentSuccess(data.voucher.code, plan);

          const fullLoginUrl = `${hotspotUrl || ''}?username=${data.voucher.code}&password=${data.voucher.password || data.voucher.code}&dst=${encodeURIComponent(linkOrig)}`;
          generateQrCodeUrl(fullLoginUrl).then(setQrCodeDataUrl);
          clearInterval(interval);
        } else if (data.status === 'FAILED') {
          setStatus('FAILED');
          setErrorMessage(data.failureReason || (lang === 'sw' ? 'Malipo yamekataliwa na mtandao.' : 'Payment failed.'));
          clearInterval(interval);
        }
      } catch (err) {
        // silent polling catch
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, externalReference, status, hotspotUrl, linkOrig, onPaymentSuccess, plan, lang]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || status !== 'PENDING') return;
    setSecondsLeft(120);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('FAILED');
          setErrorMessage(lang === 'sw' ? 'Muda wa malipo umekwisha.' : 'Payment session timed out.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, status, lang]);

  const handleCopyCode = () => {
    if (!voucherData?.code) return;
    navigator.clipboard.writeText(voucherData.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const targetLoginUrl = hotspotUrl || linkLogin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Carrier Header */}
        <div
          className="p-5 text-white flex items-center justify-between"
          style={{ backgroundColor: carrierInfo.brandColor }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-sm">
              {carrier === 'VODACOM' && 'M-P'}
              {carrier === 'TIGO' && 'TIGO'}
              {carrier === 'AIRTEL' && 'AIR'}
              {carrier === 'HALOTEL' && 'HALO'}
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                {carrierInfo.name} USSD Push
              </h3>
              <p className="text-xs text-white/80 font-mono mt-0.5">
                Ref: {externalReference}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black">{formatTzs(plan.price)}</div>
            <div className="text-[11px] text-white/80">{plan.name.split('(')[0]}</div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {status === 'PENDING' && (
            <div className="space-y-5">
              {/* Phone Prompt Box */}
              <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 relative overflow-hidden shadow-inner">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <Smartphone className="w-4 h-4 text-slate-600" />
                  {lang === 'sw' ? 'Ombi Kwenye Simu Yako' : 'Prompt on your phone'}
                </div>

                <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mt-1" />
                    <div>
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">
                        {instructions ||
                          `Tafadhali weka PIN ya ${carrierInfo.name} kwenye simu yako (${phoneNumber}) kuthibitisha malipo.`}
                      </p>
                      <div className="mt-2 text-[11px] font-mono text-slate-600">
                        Nambari: <span className="font-semibold text-slate-700">{phoneNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress countdown */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {lang === 'sw' ? 'Inasubiri PIN...' : 'Waiting for PIN...'}
                  </span>
                  <span className="font-bold text-indigo-600">
                    {secondsLeft}s
                  </span>
                </div>
              </div>

              {/* Polling Spinner */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>
                  {lang === 'sw'
                    ? 'Inasubiri uthibitisho kutoka mtandao wa simu...'
                    : 'Awaiting telecom network confirmation...'}
                </span>
              </div>

              {/* Security Banner */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    {lang === 'sw' ? 'Malipo Salama ya Moja kwa Moja' : 'Secure Direct Mobile Money'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  {lang === 'sw'
                    ? 'Weka tarakimu zako za siri (PIN) kwenye simu yako. Vocha na intaneti vitafunguka kiotomatiki mara moja.'
                    : 'Enter your mobile money PIN to automatically activate Wi-Fi access.'}
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'SUCCESS' && (
            <div className="text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900">
                  {lang === 'sw' ? 'Malipo Yamethibitishwa!' : 'Payment Approved!'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {lang === 'sw'
                    ? 'Akaunti yako imetengenezwa kiotomatiki kwenye MikroTik Hotspot.'
                    : 'Your account has been provisioned on MikroTik Hotspot.'}
                </p>
              </div>

              {/* Voucher Code Box */}
              {voucherData && (
                <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-indigo-200 rounded-2xl p-4 text-center space-y-2 shadow-xs">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    {lang === 'sw' ? 'Nambari Yako ya Vocha' : 'Your Hotspot Voucher'}
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-mono font-black text-indigo-950 tracking-wider">
                      {voucherData.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      title="Copy Voucher"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Login Button */}
              {targetLoginUrl && voucherData && (
                <form action={targetLoginUrl} method="post" className="pt-2">
                  <input type="hidden" name="username" value={voucherData.code} />
                  <input type="hidden" name="password" value={voucherData.password || voucherData.code} />
                  <input type="hidden" name="dst" value={linkOrig} />
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    <Wifi className="w-4 h-4" />
                    <span>{lang === 'sw' ? 'Unganisha Intaneti Sasa' : 'Connect to Internet Now'}</span>
                  </button>
                </form>
              )}
            </div>
          )}

          {/* FAILED STATE */}
          {status === 'FAILED' && (
            <div className="text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-900">
                  {lang === 'sw' ? 'Malipo Hayajakamilika' : 'Payment Incomplete'}
                </h4>
                <p className="text-xs text-rose-600 mt-1 max-w-xs mx-auto">
                  {errorMessage || (lang === 'sw' ? 'Uthibitisho wa PIN umeshindikana.' : 'Transaction failed.')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
              >
                {lang === 'sw' ? 'Jaribu Tena' : 'Try Again'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
          >
            {lang === 'sw' ? 'Funga' : 'Close'}
          </button>
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <span>Powered by DaliPay Aggregator</span>
          </div>
        </div>
      </div>
    </div>
  );
};
