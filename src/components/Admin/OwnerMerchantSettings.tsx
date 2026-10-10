import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Smartphone,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  Send,
  Loader2,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  Globe,
  Terminal,
  Lock,
} from 'lucide-react';
import { HotspotOwner, NetworkProvider } from '../../types/index.ts';

export interface OwnerMerchantSettingsProps {
  owner?: HotspotOwner | null;
  currentUser?: HotspotOwner | null;
  onUpdated?: (updatedOwner: HotspotOwner) => void;
  onOwnerUpdated?: (updatedOwner: HotspotOwner) => void;
  lang?: 'sw' | 'en';
}

export const OwnerMerchantSettings: React.FC<OwnerMerchantSettingsProps> = ({
  owner: propOwner,
  currentUser: propCurrentUser,
  onUpdated,
  onOwnerUpdated,
  lang = 'sw',
}) => {
  const initialOwner = propOwner || propCurrentUser || null;
  const [localOwner, setLocalOwner] = useState<HotspotOwner | null>(initialOwner);

  // Platform admin subscription default reference
  const DEFAULT_ADMIN_KEY_ID = 'admin';
  const DEFAULT_ADMIN_PUBLIC_KEY = 'gw_pk_production_o8YDH6_Liq3xgwifJV3PqOJk26QkgaLu';
  const DEFAULT_ADMIN_SECRET_KEY = 'gw_sk_production_dali_live_6A3k';
  const DEFAULT_ENDPOINT = 'https://app.dalipay.co.tz';
  const DEFAULT_WEBHOOK_URL = 'https://infotechwifi.com/api/v1/payments/webhook';

  const isVendor = localOwner?.role === 'VENDOR_ADMIN';

  // An owner has configured their keys only if explicitly set on their account
  const hasConfiguredKeys = isVendor
    ? Boolean(localOwner?.dalipay_public_key || DEFAULT_ADMIN_PUBLIC_KEY)
    : Boolean(
        (localOwner?.dalipay_key_id && localOwner?.dalipay_public_key && localOwner?.dalipay_secret_key) ||
        (localOwner?.palmpesa_user_id && localOwner?.palmpesa_api_token)
      );

  const [selectedGateway, setSelectedGateway] = useState<
    'dalipay' | 'palmpay' | 'azampay' | 'vodacom_mpesa' | 'tigopesa' | 'airtel_money' | 'manual_wallet'
  >('dalipay');

  // DaliPay State
  const [daliKeyId, setDaliKeyId] = useState(
    isVendor ? DEFAULT_ADMIN_KEY_ID : (localOwner?.dalipay_key_id || '')
  );
  const [daliPublicKey, setDaliPublicKey] = useState(
    isVendor ? DEFAULT_ADMIN_PUBLIC_KEY : (localOwner?.dalipay_public_key || '')
  );
  const [daliSecretKey, setDaliSecretKey] = useState(
    isVendor ? DEFAULT_ADMIN_SECRET_KEY : (localOwner?.dalipay_secret_key || '')
  );
  const [daliEndpoint, setDaliEndpoint] = useState(
    localOwner?.dalipay_api_endpoint || DEFAULT_ENDPOINT
  );
  const [daliWebhookSecret, setDaliWebhookSecret] = useState(
    localOwner?.dalipay_webhook_secret || ''
  );
  const [showDaliSecret, setShowDaliSecret] = useState(false);
  const [showFormDaliSecret, setShowFormDaliSecret] = useState(false);
  const [copiedDaliKey, setCopiedDaliKey] = useState(false);
  const [copiedDaliSecret, setCopiedDaliSecret] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Other Gateways State (for switching if needed)
  const [userId, setUserId] = useState('');
  const [userRef, setUserRef] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [acceptStk, setAcceptStk] = useState(true);
  const [accountNumber, setAccountNumber] = useState('');
  const [merchantName, setMerchantName] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test STK push state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testPhone, setTestPhone] = useState(localOwner?.phone || '0754123456');
  const [testCarrier, setTestCarrier] = useState<NetworkProvider>('VODACOM');
  const [testAmount, setTestAmount] = useState('1000');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Fetch or sync owner data
  useEffect(() => {
    if (propOwner) {
      setLocalOwner(propOwner);
    } else if (propCurrentUser) {
      setLocalOwner(propCurrentUser);
    } else {
      fetch('/api/v1/owners')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalOwner(data[0]);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [propOwner, propCurrentUser]);

  // Sync state when localOwner changes
  useEffect(() => {
    if (localOwner) {
      const isVendorRole = localOwner.role === 'VENDOR_ADMIN';
      setDaliKeyId(
        localOwner.dalipay_key_id || (isVendorRole ? DEFAULT_ADMIN_KEY_ID : '')
      );
      setDaliPublicKey(
        localOwner.dalipay_public_key || (isVendorRole ? DEFAULT_ADMIN_PUBLIC_KEY : '')
      );
      setDaliSecretKey(
        localOwner.dalipay_secret_key || (isVendorRole ? DEFAULT_ADMIN_SECRET_KEY : '')
      );
      setDaliEndpoint(localOwner.dalipay_api_endpoint || DEFAULT_ENDPOINT);
      setDaliWebhookSecret(localOwner.dalipay_webhook_secret || '');

      setUserId(localOwner.palmpesa_user_id || '');
      setUserRef(localOwner.palmpesa_user_ref || '');
      setApiToken(localOwner.palmpesa_api_token || '');
      setAcceptStk(localOwner.palmpesa_accept_stk !== false);
      setAccountNumber(localOwner.wallet_account_number || localOwner.phone || '');
      setMerchantName(localOwner.business_name || '');
      if (localOwner.phone) setTestPhone(localOwner.phone);

      if (
        localOwner.payout_channel === 'DALIPAY' ||
        localOwner.dalipay_public_key ||
        (!localOwner.palmpesa_user_id && !localOwner.payout_channel)
      ) {
        setSelectedGateway('dalipay');
      } else if (localOwner.payout_channel === 'PALMPESA') {
        setSelectedGateway('palmpay');
      } else if (localOwner.payout_channel === 'AZAMPAY_SUB') {
        setSelectedGateway('azampay');
      } else if (localOwner.payout_channel === 'VODACOM_DIRECT') {
        setSelectedGateway('vodacom_mpesa');
      } else if (localOwner.payout_channel === 'TIGO_DIRECT') {
        setSelectedGateway('tigopesa');
      } else if (localOwner.payout_channel === 'AIRTEL_DIRECT') {
        setSelectedGateway('airtel_money');
      } else if (localOwner.payout_channel === 'MANUAL') {
        setSelectedGateway('manual_wallet');
      }
    }
  }, [localOwner]);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(DEFAULT_WEBHOOK_URL);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopyPublicKey = () => {
    if (!daliPublicKey) return;
    navigator.clipboard.writeText(daliPublicKey);
    setCopiedDaliKey(true);
    setTimeout(() => setCopiedDaliKey(false), 2000);
  };

  const handleCopySecretKey = () => {
    if (!daliSecretKey) return;
    navigator.clipboard.writeText(daliSecretKey);
    setCopiedDaliSecret(true);
    setTimeout(() => setCopiedDaliSecret(false), 2000);
  };

  const handleSaveMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localOwner) return;

    if (!daliKeyId.trim() || !daliPublicKey.trim() || !daliSecretKey.trim()) {
      setMessage({
        type: 'error',
        text: 'Tafadhali jaza Key ID, Public Key, na Secret Key za geti la malipo ili uweze kuwasha geti la malipo.',
      });
      return;
    }

    setSaving(true);
    setSaveStatus('saving');
    setMessage(null);

    try {
      const targetOwnerId = localOwner.id;
      const payload: Partial<HotspotOwner> = {
        ...localOwner,
        payout_channel:
          selectedGateway === 'dalipay'
            ? 'DALIPAY'
            : selectedGateway === 'palmpay'
            ? 'PALMPESA'
            : selectedGateway === 'azampay'
            ? 'AZAMPAY_SUB'
            : selectedGateway === 'vodacom_mpesa'
            ? 'VODACOM_DIRECT'
            : selectedGateway === 'tigopesa'
            ? 'TIGO_DIRECT'
            : selectedGateway === 'airtel_money'
            ? 'AIRTEL_DIRECT'
            : 'MANUAL',
        dalipay_key_id: daliKeyId.trim(),
        dalipay_public_key: daliPublicKey.trim(),
        dalipay_secret_key: daliSecretKey.trim(),
        dalipay_api_endpoint: daliEndpoint.trim() || DEFAULT_ENDPOINT,
        dalipay_webhook_secret: daliWebhookSecret.trim(),
        palmpesa_accept_stk: acceptStk,
        wallet_account_number: accountNumber.trim(),
        palmpesa_user_id: userId ? userId.trim() : undefined,
        palmpesa_user_ref: userRef ? userRef.trim() : undefined,
        palmpesa_api_token: apiToken ? apiToken.trim() : undefined,
      };

      // 1. Update owner record
      const res = await fetch(`/api/v1/owners/${targetOwnerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kusasisha geti la malipo');
      }

      // 2. If Vendor Admin, also sync subscription admin settings
      if (isVendor && selectedGateway === 'dalipay') {
        await fetch('/api/v1/admin/settings/dalipay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keyId: daliKeyId.trim(),
            publicKey: daliPublicKey.trim(),
            secretKey: daliSecretKey.trim(),
            apiEndpoint: daliEndpoint.trim() || DEFAULT_ENDPOINT,
            webhookSecret: daliWebhookSecret.trim() || 'gw_wh_production_dalipay_secret',
            isSandbox: false,
          }),
        }).catch((err) => console.error('Failed to sync admin settings:', err));
      }

      const updatedOwner: HotspotOwner = data.owner || { ...localOwner, ...payload };
      setLocalOwner(updatedOwner);
      if (onUpdated) onUpdated(updatedOwner);
      if (onOwnerUpdated) onOwnerUpdated(updatedOwner);

      // Also update localStorage so session is refreshed
      try {
        const savedStr = localStorage.getItem('tzwifi_user');
        if (savedStr) {
          const parsed = JSON.parse(savedStr);
          if (parsed && parsed.id === targetOwnerId) {
            localStorage.setItem('tzwifi_user', JSON.stringify(updatedOwner));
          }
        }
      } catch (err) {
        console.error(err);
      }

      setSaveStatus('saved');
      setMessage({
        type: 'success',
        text: '✓ Geti la malipo limehifadhiwa (Saved & Updated) na kuwashwa kikamilifu! Pesa za wateja wa router zako zitaingia hapa moja kwa moja.',
      });

      setTimeout(() => {
        setSaveStatus('idle');
      }, 4000);
    } catch (err: any) {
      setSaveStatus('idle');
      setMessage({ type: 'error', text: err.message || 'Hitilafu imetokea wakati wa kuhifadhi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!daliPublicKey || !daliSecretKey || !daliKeyId) {
      setTestError('Tafadhali jaza na uhifadhi Key ID, Public Key, na Secret Key kabla ya kujaribu STK Push.');
      return;
    }

    setSendingTest(true);
    setTestSuccess(null);
    setTestError(null);

    try {
      const res = await fetch('/api/v1/payments/dalipay/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          carrier: testCarrier,
          amount: Number(testAmount) || 1000,
          ownerId: localOwner?.id,
          keyId: daliKeyId,
          publicKey: daliPublicKey,
          secretKey: daliSecretKey,
          apiEndpoint: daliEndpoint || DEFAULT_ENDPOINT,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success !== false) {
        setTestSuccess(
          `✅ USSD Push Imefanikiwa Kutumwa! Ref: ${data.reference || data.transactionId || 'N/A'}. Angalia simu yako sasa kuweka PIN.`
        );
      } else {
        setTestError(
          `❌ Hitilafu ya Mtandao: ${data.error || data.message || 'API imekataa ombi. Hakikisha API Keys na namba ya simu ni sahihi.'}`
        );
      }
    } catch (err: any) {
      setTestError(`❌ Hitilafu ya Muunganisho (Network Error): ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  // Masked secret helper for the top summary box: gw_sk_pr••••••••••••••••••••6A3k
  const activeSecretDisplay = () => {
    if (!daliSecretKey) return 'Haijawekwa (Weka kwenye fomu ya chini)';
    if (showDaliSecret) return daliSecretKey;
    if (daliSecretKey.length <= 12) return '••••••••••••••••••••';
    const prefix = daliSecretKey.slice(0, 8);
    const suffix = daliSecretKey.slice(-4);
    return `${prefix}••••••••••••••••••••${suffix}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Title & Subtitle */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <span>Mipangilio ya Geti la Malipo & Merchant (Payment Gateway)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Dhibiti akaunti yako ya kupokelea pesa za mauzo ya intaneti (Hotspot & PPPoE). Weka au badilisha API Token na Merchant ID zako.
        </p>
      </div>

      {/* Critical Owner Notice: When Owner has not yet configured their API keys */}
      {!isVendor && !hasConfiguredKeys && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-amber-900">
              ⚠️ Hujaweka API ya Geti la Malipo (Weka API Kwanza)
            </p>
            <p className="leading-relaxed text-amber-800">
              Router zako <strong>haziwezi kupokea malipo ya intaneti</strong> kutoka kwa wateja mpaka uweke API yako.
              API ya Msimamizi Mkuu <strong>haitumiki kama default</strong> kwa mauzo ya wateja wako (inatumika kwa malipo ya subscription pekee).
              Tafadhali jaza na uhifadhi funguo zako za <strong>API ya Malipo</strong> hapa chini kwenye fomu ili router zako zianze kupokea pesa moja kwa moja kwenye akaunti yako.
            </p>
          </div>
        </div>
      )}

      {/* Vendor Admin Subscription Gateway Info Notice */}
      {isVendor && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-indigo-900">
              👑 Geti Kuu la Msimamizi Mkuu (Subscription Collection Gateway)
            </p>
            <p className="leading-relaxed text-indigo-800">
              Funguo hizi za DaliPay za Msimamizi Mkuu zinatumika kupokelea malipo ya <strong>SUBSCRIPTION</strong> (ada za mwezi za jukwaa) kutoka kwa wamiliki wa hotspot (Hotspot Owners). Kila mmiliki anapojiunga lazima aweke API yake binafsi kupokea mauzo ya router zake.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* SECTION 1: CURRENT PAYMENT GATEWAY OPTIONS */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              CURRENT PAYMENT GATEWAY OPTIONS
            </h3>
          </div>
          {isVendor ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 uppercase tracking-wider">
              Vendor Subscription Gateway (Active)
            </span>
          ) : hasConfiguredKeys ? (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
              Active Custom Merchant
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase tracking-wider">
              HAIJASANIDIWA (NOT CONFIGURED)
            </span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900">
                {isVendor
                  ? 'DaliPay Aggregator (Platform Subscription Receiver)'
                  : hasConfiguredKeys
                  ? 'DaliPay / DaliPesa (Live Aggregator)'
                  : 'DaliPay / DaliPesa (Haijawekwa Bado)'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {hasConfiguredKeys || isVendor
                  ? 'Inapokea malipo ya simu kutoka mitandao yote: Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa'
                  : 'Hujaweka API ya malipo. Wateja hawawezi kulipia intaneti kwenye router zako mpaka utakapoweka API yako hapa chini.'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setTestSuccess(null);
                setTestError(null);
                setIsTestModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition self-start sm:self-auto cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Test STK push or payment request prompt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-white rounded-xl border border-indigo-200">
              <span className="text-[10px] font-bold text-indigo-600 block uppercase">
                GATEWAY & CHANNEL
              </span>
              <span className="font-mono font-black text-slate-900 text-xs mt-1 block truncate">
                {hasConfiguredKeys || isVendor ? 'DaliPay Direct Wallet' : 'Haijawekwa (Not Set)'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  PUBLIC KEY
                </span>
                {daliPublicKey && (
                  <button
                    type="button"
                    onClick={handleCopyPublicKey}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                    title="Nakili Public Key"
                  >
                    {copiedDaliKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
              <span className="font-mono font-bold text-slate-700 text-xs mt-1 block truncate">
                {hasConfiguredKeys || isVendor
                  ? daliPublicKey || DEFAULT_ADMIN_PUBLIC_KEY
                  : 'Haijawekwa — Weka hapa chini'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-indigo-200 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  SECRET KEY
                </span>
                {daliSecretKey && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDaliSecret(!showDaliSecret)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {showDaliSecret ? 'Ficha' : 'Onyesha'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySecretKey}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      title="Nakili Secret Key"
                    >
                      {copiedDaliSecret ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
              <span className="font-mono text-xs text-slate-800 mt-1 block truncate">
                {hasConfiguredKeys || isVendor
                  ? activeSecretDisplay()
                  : 'Haijawekwa — Weka hapa chini'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">ACCEPT HOTSPOT STK:</span>
              <span
                className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                  hasConfiguredKeys || isVendor
                    ? acceptStk
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {hasConfiguredKeys || isVendor ? (acceptStk ? 'YES' : 'NO') : 'NO (Inasubiri API)'}
              </span>
            </div>

            {/* Note: Admin API is strictly for subscription, not default fallback for hotspot owners */}
            <div className="text-[11px] text-slate-400">
              {isVendor ? 'Inapokea ada ya kila mwezi' : 'Pesa za router zitaingia hapa moja kwa moja'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ADD NEW PAYMENT OPTION FOR PPPOE OR HOTSPOT / BADILISHA MERCHANT */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              ADD NEW PAYMENT OPTION FOR PPPOE OR HOTSPOT / BADILISHA MERCHANT
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Chagua mtoa huduma wa malipo unayetaka kutumia kwenye router zako. Unaweza kubadilisha kutoka PalmPay kwenda AzamPay au benki wakati wowote.
          </p>
        </div>

        <form onSubmit={handleSaveMerchant} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Payment Gateway * <span className="text-rose-500 font-bold">REQUIRED</span>
            </label>
            <select
              value={selectedGateway}
              onChange={(e) => setSelectedGateway(e.target.value as any)}
              className="w-full text-xs font-bold p-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="dalipay">
                DaliPay / DaliPesa (Unified Aggregator - M-Pesa, Tigo, Airtel, Halo)
              </option>
              <option value="palmpay">PalmPay / PalmPesa (USSD Push Multi-Carrier)</option>
              <option value="azampay">AzamPay Multi-Carrier Aggregator</option>
              <option value="vodacom_mpesa">Vodacom M-Pesa Direct (OpenAPI / Lipa Namba)</option>
              <option value="tigopesa">Tigo Pesa Lipa Namba Direct</option>
              <option value="airtel_money">Airtel Money Merchant Direct</option>
              <option value="manual_wallet">Pochi ya Simu / Namba Binafsi (Manual Wallet)</option>
            </select>
          </div>

          {/* DALIPAY SPECIFIC FORM */}
          {selectedGateway === 'dalipay' && (
            <div className="p-5 bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-200/80 rounded-2xl space-y-4 animate-in fade-in shadow-xs">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>Taarifa za DaliPay / DaliPesa Merchant API (Live & Sandbox)</span>
                </span>
                <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/90 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Aggregator (M-Pesa, Tigo, Airtel, Halo)
                </span>
              </div>

              {/* 1. Endpoint & 2. Webhook Callback URL */}
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1. DaliPay Checkout Push Endpoint (Unaweza Kubadilisha)</span>
                    </span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-100 font-mono px-2 py-0.5 rounded-full font-bold">
                      Inabadilishika (Editable)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={daliEndpoint}
                    onChange={(e) => setDaliEndpoint(e.target.value)}
                    placeholder="https://app.dalipay.co.tz"
                    className="w-full p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 Unaweza kuandika au kubadilisha endpoint hapa wakati wowote. Chaguo-msingi rasmi ni <code>https://app.dalipay.co.tz/api/v1</code>.
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-600" />
                      <span>2. Webhook Callback URL (Iweke kwenye DaliPay Dashboard)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWebhook}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition border border-indigo-200 cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? 'Imenakiliwa!' : 'Nakili Webhook URL'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg break-all select-all flex items-center justify-between">
                    <span>{DEFAULT_WEBHOOK_URL}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    📌 <strong>Maelekezo:</strong> Ingia kwenye Dashboard ya DaliPay → Nenda <strong>Webhooks / API Settings</strong> → Bandika (Paste) URL hii hapo juu ili mfumo upokee majibu ya malipo ya wateja papo hapo.
                  </p>
                </div>
              </div>

              {/* 4 Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    DaliPay Key ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={daliKeyId}
                    onChange={(e) => setDaliKeyId(e.target.value)}
                    placeholder="Weka Key ID yako (Mfano: admin au ID ya DaliPay)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Key ID inayopatikana kwenye ukurasa wa Keys wa DaliPay.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Public Key (gw_pk_...) *
                  </label>
                  <input
                    type="text"
                    required
                    value={daliPublicKey}
                    onChange={(e) => setDaliPublicKey(e.target.value)}
                    placeholder="gw_pk_..."
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Public API Key inayotumika kuanzisha miamala.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Secret Key (gw_sk_...) *</span>
                    <button
                      type="button"
                      onClick={() => setShowFormDaliSecret(!showFormDaliSecret)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      {showFormDaliSecret ? 'Ficha' : 'Onyesha'}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showFormDaliSecret ? 'text' : 'password'}
                      required
                      value={daliSecretKey}
                      onChange={(e) => setDaliSecretKey(e.target.value)}
                      placeholder="gw_sk_..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Secret Key kwa ajili ya usalama wa STK Push.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Callback Secret / Webhook Secret Key</span>
                    <span className="text-[10px] text-indigo-600 font-bold">HMAC Signature</span>
                  </label>
                  <input
                    type="text"
                    value={daliWebhookSecret}
                    onChange={(e) => setDaliWebhookSecret(e.target.value)}
                    placeholder="Weka Webhook Callback Secret (gw_wh_...)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Ufunguo wa kuthibitisha uhalisi wa callback inayotoka DaliPay.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* PALMPAY SPECIFIC FORM */}
          {selectedGateway === 'palmpay' && (
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Taarifa za Akaunti ya PalmPay / PalmPesa</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Direct Sub-Merchant
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    USER ID (Merchant Account ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Ingiza Merchant User ID yako..."
                    className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Kitambulisho chako cha akaunti kilichopo kwenye ukurasa wa PalmPay.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Public User Ref (Kitambulisho cha Umma)
                  </label>
                  <input
                    type="text"
                    value={userRef}
                    onChange={(e) => setUserRef(e.target.value)}
                    placeholder="Ingiza Public User Reference..."
                    className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Public Ref kutoka sehemu ya Developer.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  YOUR API TOKEN (Ufunguo wa Siri wa API) *
                </label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    required
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Weka API Token yako hapa..."
                    className="w-full p-2.5 pr-10 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Token hii inalindwa kwa usalama na inatumika kutuma STK Push pop-up kwenye simu za wateja.
                </span>
              </div>
            </div>
          )}

          {/* AZAMPAY FORM */}
          {selectedGateway === 'azampay' && (
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3 text-xs animate-in fade-in">
              <span className="font-bold text-indigo-950 block">Taarifa za AzamPay Aggregator</span>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">AzamPay Account / Phone Number:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="255754000111"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Merchant / Business Name:</label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Jina la Biashara Yako"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          )}

          {/* VODACOM MPESA DIRECT FORM */}
          {selectedGateway === 'vodacom_mpesa' && (
            <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-3 text-xs animate-in fade-in">
              <span className="font-bold text-rose-950 block">Vodacom M-Pesa C2B Till / Paybill Direct</span>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lipa Namba / Till / Shortcode:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="mfano: 5544332"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          )}

          {/* TIGO PESA DIRECT */}
          {selectedGateway === 'tigopesa' && (
            <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3 text-xs animate-in fade-in">
              <span className="font-bold text-blue-950 block">Tigo Pesa Lipa Namba Direct</span>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lipa Namba / Merchant Number:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="mfano: 9988776"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          )}

          {/* AIRTEL MONEY DIRECT */}
          {selectedGateway === 'airtel_money' && (
            <div className="p-5 bg-red-50/50 border border-red-100 rounded-2xl space-y-3 text-xs animate-in fade-in">
              <span className="font-bold text-red-950 block">Airtel Money Merchant Direct</span>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Merchant Code / Lipa Namba:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="mfano: 112233"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          )}

          {/* MANUAL WALLET */}
          {selectedGateway === 'manual_wallet' && (
            <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-3 text-xs animate-in fade-in">
              <span className="font-bold text-amber-950 block">Pochi Binafsi ya Simu (M-Pesa / Tigo Pesa)</span>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nambari ya Simu ya Kupokea Malipo:</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="0754 000 111 - Juma Ally"
                  className="w-full p-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer ${
                saveStatus === 'saved'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? 'Inahifadhi...'
                  : saveStatus === 'saved'
                  ? '✓ Saved & Activated! (Imehifadhiwa)'
                  : 'Hifadhi & Washa Geti Hili (Save & Activate)'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL: TEST STK PUSH */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Test STK Push / USSD Payment Prompt
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕ Funga
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Jaribu kutuma ombi la USSD PIN kwenye simu yako kuthibitisha kama API Keys na Key ID ya DaliPay zinafanya kazi:
            </p>

            {testSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950">USSD Push Imefanikiwa!</p>
                  <p className="mt-0.5 text-emerald-800">{testSuccess}</p>
                </div>
              </div>
            )}

            {testError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-950">Hitilafu Imegundulika (STK Error Alert):</p>
                  <p className="mt-0.5 text-rose-800 font-mono text-[11px] break-all">{testError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleTestStkPush} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nambari ya Simu ya Jaribio:</label>
                <input
                  type="tel"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0754 123 456"
                  className="w-full p-2.5 font-mono text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mtandao:</label>
                  <select
                    value={testCarrier}
                    onChange={(e) => setTestCarrier(e.target.value as any)}
                    className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="VODACOM">Vodacom (M-Pesa)</option>
                    <option value="TIGO">Tigo (Tigo Pesa)</option>
                    <option value="AIRTEL">Airtel Money</option>
                    <option value="HALOTEL">HaloPesa</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kiasi cha Jaribio (TZS):</label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    className="w-full p-2 font-mono text-xs rounded-xl border border-slate-200 bg-white font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {sendingTest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tuma USSD Prompt Sasa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
