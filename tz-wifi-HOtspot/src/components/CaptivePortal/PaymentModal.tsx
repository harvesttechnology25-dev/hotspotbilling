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
  externalReference: string;
  phoneNumber: string;
  carrier: NetworkProvider;
  plan: Plan;
  instructions: string;
  linkLogin?: string;
  linkOrig?: string;
  clientMac?: string;
  onPaymentSuccess: (voucherCode: string, plan: Plan) => void;
  lang: 'sw' | 'en';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  externalReference,
  phoneNumber,
  carrier,
  plan,
  instructions,
  linkLogin = 'http://192.168.88.1/login',
  linkOrig = 'http://www.google.com',
  clientMac,
  onPaymentSuccess,
  lang,
}) => {
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING');
  const [voucherData, setVoucherData] = useState<{
    code: string;
    password: string;
    expiresAt?: string;
  } | null>(null);
  const [hotspotUrl, setHotspotUrl] = useState<string>(linkLogin);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const [isSimulating, setIsSimulating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  const carrierInfo = CARRIERS[carrier];

  // Polling loop for real or webhook payment confirmation
  useEffect(() => {
    if (!isOpen || status !== 'PENDING') return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/payments/status/${externalReference}`);
        if (!res.ok) return;
        const data = await res.json();

        if (!isMounted) return;

        if (data.status === 'SUCCESS') {
          setStatus('SUCCESS');
          setVoucherData(data.voucher);
          if (data.hotspotLoginUrl) {
            setHotspotUrl(data.hotspotLoginUrl);
          }
          if (data.voucher?.code) {
            onPaymentSuccess(data.voucher.code, plan);
            // Generate QR Code for auto login
            const targetLogin = data.hotspotLoginUrl || linkLogin;
            const fullLoginUrl = `${targetLogin}?username=${data.voucher.code}&password=${data.voucher.password || data.voucher.code}&dst=${encodeURIComponent(linkOrig)}`;
            generateQrCodeUrl(fullLoginUrl).then((url) => {
              if (isMounted) setQrCodeDataUrl(url);
            });
          }
        } else if (data.status === 'FAILED') {
          setStatus('FAILED');
          setErrorMessage(data.failureReason || 'Malipo hayakukamilika.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, status, externalReference, plan, onPaymentSuccess, linkLogin, linkOrig]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || status !== 'PENDING') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setStatus('FAILED');
          setErrorMessage(
            lang === 'sw'
              ? 'Muda wa kusubiri malipo ya USSD umekwisha. Tafadhali jaribu tena.'
              : 'Payment session timed out. Please try again.'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, status, lang]);

  // Instant simulation or sandbox approval trigger
  const handleSimulatePinEntered = async (outcome: 'SUCCESS' | 'FAILED' = 'SUCCESS') => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/v1/payments/simulate-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalReference,
          status: outcome,
        }),
      });
      const data = await res.json();
      if (data.success && outcome === 'SUCCESS') {
        setStatus('SUCCESS');
        if (data.voucher) {
          setVoucherData({
            code: data.voucher.code,
            password: data.voucher.password,
            expiresAt: data.voucher.expires_at,
          });
          onPaymentSuccess(data.voucher.code, plan);

          const fullLoginUrl = `${hotspotUrl}?username=${data.voucher.code}&password=${data.voucher.password || data.voucher.code}&dst=${encodeURIComponent(linkOrig)}`;
          generateQrCodeUrl(fullLoginUrl).then(setQrCodeDataUrl);
        }
      } else {
        setStatus('FAILED');
        setErrorMessage(
          lang === 'sw'
            ? 'Uthibitisho wa PIN umekataliwa na mtandao.'
            : 'PIN entry failed or was rejected.'
        );
      }
    } catch {
      // ignore
    } finally {
      setIsSimulating(false);
    }
  };

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
              {/* Simulated Phone USSD Screen */}
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
                          `Tafadhali weka PIN ya ${carrierInfo.name} kwenye nambari ${phoneNumber} kuthibitisha malipo.`}
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

              {/* Polling Spinner info */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-1">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>
                  {lang === 'sw'
                    ? 'Mfumo unakagua jibu la mtandao...'
                    : 'Awaiting carrier network response...'}
                </span>
              </div>

              {/* Sandbox / Testing Simulator Button */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-indigo-900 font-semibold text-xs">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {lang === 'sw'
                      ? 'Kituo cha Kujaribu (Test Simulator)'
                      : 'Test / Sandbox Simulator'}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700">
                  {lang === 'sw'
                    ? 'Bonyeza hapa chini kuiga uthibitisho wa PIN mara moja:'
                    : 'Click below to instantly simulate mobile money PIN confirmation:'}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulatePinEntered('SUCCESS')}
                    className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 active:scale-98 transition shadow-xs flex items-center justify-center gap-1"
                  >
                    {isSimulating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {lang === 'sw' ? 'Thibitisha Malipo Sasa' : 'Simulate User PIN Entered'}
                  </button>
                  <button
                    type="button"
                    disabled={isSimulating}
                    onClick={() => handleSimulatePinEntered('FAILED')}
                    className="py-2 px-2.5 rounded-lg border border-slate-300 text-slate-600 font-medium text-xs hover:bg-white transition"
                    title="Simulate cancellation"
                  >
                    {lang === 'sw' ? 'Katalia' : 'Cancel'}
                  </button>
                </div>
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
                    : 'Your account has been automatically provisioned on MikroTik Hotspot.'}
                </p>
              </div>

              {/* Voucher Code Box */}
              {voucherData && (
                <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-indigo-200 rounded-2xl p-4 text-center space-y-2 shadow-xs relative">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 flex items-center justify-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    {lang === 'sw' ? 'Nambari Yako ya Vocha / PIN' : 'Your Hotspot Voucher / PIN'}
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-3xl font-black tracking-widest text-indigo-950 selection:bg-indigo-200">
                      {voucherData.code}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-700 transition"
                      title="Copy Code"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium">
                    {lang === 'sw'
                      ? 'Nenosiri ni sawa na nambari ya vocha.'
                      : 'Password is identical to username.'}
                  </p>
                </div>
              )}

              {/* QR Code toggle */}
              {qrCodeDataUrl && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowQr(!showQr)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1.5 transition"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    {showQr
                      ? (lang === 'sw' ? 'Ficha QR Code' : 'Hide QR Code')
                      : (lang === 'sw' ? 'Onyesha QR Code ya Kuunganisha' : 'Show Auto-Login QR Code')}
                  </button>

                  {showQr && (
                    <div className="mt-2 p-3 bg-white border border-slate-200 rounded-2xl inline-block shadow-sm animate-in zoom-in-95">
                      <img src={qrCodeDataUrl} alt="Voucher Login QR Code" className="w-40 h-40 mx-auto rounded-lg" />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {lang === 'sw' ? 'Scan kwa kamera kuunganisha papo hapo' : 'Scan with camera to connect instantly'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons & MikroTik Form POST */}
              <div className="space-y-2 pt-1">
                {/* Standard MikroTik Hotspot Form Post */}
                <form method="POST" action={targetLoginUrl} className="w-full">
                  <input type="hidden" name="username" value={voucherData?.code || ''} />
                  <input type="hidden" name="password" value={voucherData?.password || voucherData?.code || ''} />
                  <input type="hidden" name="dst" value={linkOrig} />
                  
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Wifi className="w-4 h-4" />
                    {lang === 'sw' ? 'UNGANISHA KWENYE INTANETI SASA' : 'CONNECT TO INTERNET NOW'}
                  </button>
                </form>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (voucherData?.code) {
                        onPaymentSuccess(voucherData.code, plan);
                      }
                      onClose();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                  >
                    {lang === 'sw' ? 'Fungua Dashibodi' : 'View Session'}
                  </button>

                  <a
                    href={`${targetLoginUrl}?username=${voucherData?.code}&password=${voucherData?.password || voucherData?.code}&dst=${encodeURIComponent(linkOrig)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1"
                    title="Direct RouterOS Link"
                  >
                    <span>Direct Link</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* FAILED STATE */}
          {status === 'FAILED' && (
            <div className="text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <XCircle className="w-9 h-9" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {lang === 'sw' ? 'Malipo Hayakukamilika' : 'Payment Failed'}
                </h4>
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {errorMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition"
              >
                {lang === 'sw' ? 'Jaribu Tena' : 'Close and Retry'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
