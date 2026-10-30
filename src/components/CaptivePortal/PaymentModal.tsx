import React, { useEffect, useState } from 'react';
import { NetworkProvider, Plan } from '../../types/index.ts';
import { CARRIERS, formatTzs, isInsufficientBalance, isUserCancelled, isTimedOut, isWrongPin } from '../../utils/carrierInfo.ts';
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
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  Wallet,
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
  const [errorMessage, setErrorMessage] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVerifyingNow, setIsVerifyingNow] = useState(false);

  const handleCheckPaymentNow = async () => {
    setIsVerifyingNow(true);
    try {
      const res = await fetch(`/api/v1/payments/status/${externalReference}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        setStatus('SUCCESS');
        setVoucherData(data.voucher);
        if (data.hotspotLoginUrl) {
          setHotspotUrl(data.hotspotLoginUrl);
        }
        if (data.voucher?.code) {
          onPaymentSuccess(data.voucher.code, plan);
          const targetLogin = data.hotspotLoginUrl || linkLogin;
          const fullLoginUrl = `${targetLogin}?username=${data.voucher.code}&password=${data.voucher.password || data.voucher.code}&dst=${encodeURIComponent(linkOrig)}`;
          generateQrCodeUrl(fullLoginUrl).then((url) => {
            setQrCodeDataUrl(url);
          });
        }
      } else if (data.status === 'FAILED') {
        setStatus('FAILED');
        const rawReason = data.failureReason || '';
        if (isInsufficientBalance(rawReason)) {
          setErrorMessage('Account haina salio la kutosha.');
        } else if (isUserCancelled(rawReason)) {
          setErrorMessage('Mteja alighairi au amecancel STK Push kwenye simu.');
        } else if (isTimedOut(rawReason)) {
          setErrorMessage('Muda wa kusubiri malipo ya USSD umekwisha. Tafadhali jaribu tena.');
        } else if (isWrongPin(rawReason)) {
          setErrorMessage('PIN ya simu iliyowekwa si sahihi.');
        } else {
          setErrorMessage(
            rawReason && !rawReason.includes('collection.failed')
              ? rawReason.replace(/^Event:\s*/i, '')
              : 'Account haina salio la kutosha au muamala ulikataliwa na mtandao.'
          );
        }
      }
    } catch (err) {
      console.error('Manual check payment error:', err);
    } finally {
      setIsVerifyingNow(false);
    }
  };

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
          const rawReason = data.failureReason || '';
          if (isInsufficientBalance(rawReason)) {
            setErrorMessage('Account haina salio la kutosha.');
          } else if (isUserCancelled(rawReason)) {
            setErrorMessage('Mteja alighairi au amecancel STK Push kwenye simu.');
          } else if (isTimedOut(rawReason)) {
            setErrorMessage('Muda wa kusubiri malipo ya USSD umekwisha. Tafadhali jaribu tena.');
          } else if (isWrongPin(rawReason)) {
            setErrorMessage('PIN ya simu iliyowekwa si sahihi.');
          } else {
            setErrorMessage(
              rawReason && !rawReason.includes('collection.failed')
                ? rawReason.replace(/^Event:\s*/i, '')
                : 'Account haina salio la kutosha au muamala ulikataliwa na mtandao.'
            );
          }
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

              {/* Instant Verification Button */}
              <button
                type="button"
                onClick={handleCheckPaymentNow}
                disabled={isVerifyingNow}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifyingNow ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-100" />
                )}
                <span>
                  {lang === 'sw'
                    ? isVerifyingNow
                      ? 'Inathibitisha malipo na mtandao...'
                      : 'Nimeshaweka PIN • Thibitisha Malipo Sasa'
                    : isVerifyingNow
                    ? 'Checking gateway status...'
                    : 'I have entered PIN • Verify Payment Now'}
                </span>
              </button>

              {/* Live Real-time Aggregator Status Banner */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-xs text-emerald-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {lang === 'sw'
                      ? 'Malipo Halisi ya Moja kwa Moja (Live Aggregator API)'
                      : 'Live Mobile Money Payment Gateway'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  {lang === 'sw'
                    ? 'Ombi rasmi la USSD Push limetumwa kwenye laini yako ya simu. Weka tarakimu zako za siri (PIN) kwenye simu ili kufungua mtandao papo hapo.'
                    : 'The official USSD Push prompt has been dispatched to your handset. Enter your mobile money PIN to automatically activate Wi-Fi access.'}
                </p>
                <div className="pt-1 border-t border-emerald-200/60 flex items-center justify-between text-[10px] text-emerald-800 font-mono">
                  <span>Itifaki: USSD Push</span>
                  <span>Usalama: Usimbaji wa 256-bit</span>
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
              {isInsufficientBalance(errorMessage) ? (
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
                        ? `Salio kwenye akaunti yako ya ${carrierInfo.name} (${phoneNumber}) halitoshi kukamilisha malipo ya ${plan.name.split('(')[0]} (${formatTzs(plan.price)}). Tafadhali weka salio kwenye simu yako kisha ujaribu tena.`
                        : `Your ${carrierInfo.name} account (${phoneNumber}) does not have enough balance to pay ${formatTzs(plan.price)}. Please top up your wallet and try again.`}
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium text-left flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 text-sm">💡</span>
                    <span>
                      {lang === 'sw'
                        ? 'Weka salio la kutosha kwenye akaunti yako ya mtandao, kisha bofya kitufe cha chini kuanzisha tena malipo.'
                        : 'Deposit funds into your mobile money wallet, then click the button below to restart payment.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    {lang === 'sw' ? 'Weka Salio Kisha Jaribu Tena' : 'Top Up & Try Again'}
                  </button>
                </>
              ) : isUserCancelled(errorMessage) ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner border border-orange-200">
                    <XCircle className="w-8 h-8 stroke-[2.2]" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-lg font-black text-orange-950">
                      {lang === 'sw' ? 'Umeghairi Malipo ya STK Push' : 'STK Push Cancelled'}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed max-w-xs mx-auto">
                      {lang === 'sw'
                        ? `Umeghairi au umekataa kuingiza namba ya siri (PIN) kwenye simu yako ya ${carrierInfo.name} (${phoneNumber}). Ikiwa ungependa kuendelea kutumia intaneti, bofya kitufe hapa chini kutuma tena ombi la malipo.`
                        : `You cancelled or declined the payment request on your ${carrierInfo.name} phone (${phoneNumber}). Click below to request a new payment prompt.`}
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-[11px] text-orange-900 font-medium text-left flex items-start gap-2">
                    <span className="text-orange-600 font-bold shrink-0 text-sm">💡</span>
                    <span>
                      {lang === 'sw'
                        ? 'Hakikisha unaingiza PIN yako mara ujumbe wa mtandao unapojitokeza kwenye kioo cha simu yako.'
                        : 'Enter your PIN immediately when the mobile network prompt pops up on your screen.'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    {lang === 'sw' ? 'Tuma STK Push Tena' : 'Resend STK Push'}
                  </button>
                </>
              ) : isTimedOut(errorMessage) ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-inner border border-slate-200">
                    <Clock className="w-8 h-8 stroke-[2.2]" />
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-lg font-black text-slate-900">
                      {lang === 'sw' ? 'Muda wa STK Push Umekwisha' : 'STK Push Timed Out'}
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed max-w-xs mx-auto">
                      {lang === 'sw'
                        ? 'Muda wa kusubiri uthibitisho wa malipo kwenye simu yako umekwisha kabla ya kukamilika. Tafadhali hakikisha simu yako iko tayari kisha ubofye kitufe hapa chini.'
                        : 'The USSD prompt expired before confirmation. Please verify your phone is unlocked and try again.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    {lang === 'sw' ? 'Jaribu Tena' : 'Retry Payment'}
                  </button>
                </>
              ) : (
                <>
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
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    {lang === 'sw' ? 'Jaribu Tena' : 'Close and Retry'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
