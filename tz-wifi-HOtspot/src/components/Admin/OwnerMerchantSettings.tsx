import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
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

interface OwnerMerchantSettingsProps {
  owner: HotspotOwner | null;
  onUpdated?: (updatedOwner: HotspotOwner) => void;
  lang?: 'sw' | 'en';
}

export const OwnerMerchantSettings: React.FC<OwnerMerchantSettingsProps> = ({
  owner: propOwner,
  onUpdated,
  lang = 'sw',
}) => {
  const [localOwner, setLocalOwner] = useState<HotspotOwner | null>(propOwner || null);

  useEffect(() => {
    if (propOwner) {
      setLocalOwner(propOwner);
    } else {
      // Fetch default vendor owner if null
      fetch('/api/v1/owners')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setLocalOwner(data[0]);
          }
        })
        .catch(e => console.error(e));
    }
  }, [propOwner]);

  const owner = localOwner;
  const [selectedGateway, setSelectedGateway] = useState<
    'palmpay' | 'azampay' | 'vodacom_mpesa' | 'tigopesa' | 'airtel_money' | 'manual_wallet'
  >('palmpay');

  const [userId, setUserId] = useState(owner?.palmpesa_user_id || '');
  const [userRef, setUserRef] = useState(owner?.palmpesa_user_ref || '');
  const [apiToken, setApiToken] = useState(owner?.palmpesa_api_token || '');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('https://api.dalipay.com/v1');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const webhookUrl = typeof window !== 'undefined' ? (window.location.origin + '/api/v1/payments/webhook') : '/api/v1/payments/webhook';
  const [acceptStk, setAcceptStk] = useState(owner?.palmpesa_accept_stk !== false);
  const [accountNumber, setAccountNumber] = useState(owner?.wallet_account_number || owner?.phone || '');
  const [merchantName, setMerchantName] = useState(owner?.business_name || '');

  // UI state
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'updated'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test STK push state
  const [testPhone, setTestPhone] = useState(owner?.phone || '0754123456');
  const [testCarrier, setTestCarrier] = useState<NetworkProvider>('VODACOM');
  const [testAmount, setTestAmount] = useState('1000');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  useEffect(() => {
    if (owner) {
      setUserId(owner.palmpesa_user_id || '');
      setUserRef(owner.palmpesa_user_ref || '');
      setApiToken(owner.palmpesa_api_token || '');
      setAcceptStk(owner.palmpesa_accept_stk !== false);
      setAccountNumber(owner.wallet_account_number || owner.phone || '');
      setMerchantName(owner.business_name || '');
    }
  }, [owner]);

  const handleCopyToken = () => {
    if (!apiToken) return;
    navigator.clipboard.writeText(apiToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSaveMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner) return;

    setSaving(true);
    setSaveStatus('saving');
    setMessage(null);

    try {
      const payload: Partial<HotspotOwner> = {
        ...owner,
        palmpesa_user_id: userId ? userId.trim() : undefined,
        palmpesa_user_ref: userRef ? userRef.trim() : undefined,
        palmpesa_api_token: apiToken ? apiToken.trim() : undefined,
        palmpesa_accept_stk: acceptStk,
        payout_channel:
          selectedGateway === 'palmpay'
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
        wallet_account_number: accountNumber.trim(),
      };

      const res = await fetch(`/api/v1/owners/${owner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) { data = await res.json(); }
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kusasisha geti la malipo');

      setSaveStatus('saved');
      setMessage({
        type: 'success',
        text: `✓ Geti la malipo limehifadhiwa (Saved & Updated) na kuwashwa kikamilifu! Pesa za router zako zitaingia hapa moja kwa moja.`,
      });

      if (onUpdated && data.owner) {
        onUpdated(data.owner);
      }

      setTimeout(() => {
        setSaveStatus('idle');
      }, 3500);
    } catch (err: any) {
      setSaveStatus('idle');
      setMessage({ type: 'error', text: err.message || 'Hitilafu imetokea.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToAdminDefault = async () => {
    if (!owner) return;
    if (!confirm('Je, una uhakika unataka kurejesha geti la malipo kwenye akaunti kuu ya Admin?')) return;

    setSaving(true);
    try {
      const payload: Partial<HotspotOwner> = {
        ...owner,
        palmpesa_user_id: undefined,
        palmpesa_user_ref: undefined,
        palmpesa_api_token: undefined,
        palmpesa_accept_stk: true,
      };

      const res = await fetch(`/api/v1/owners/${owner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setUserId('');
        setUserRef('');
        setApiToken('');
        setMessage({
          type: 'success',
          text: 'Akaunti yako imerejeshwa kutumia geti kuu la malipo la Msimamizi (Platform Default).',
        });
        if (onUpdated && data.owner) onUpdated(data.owner);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const [testError, setTestError] = useState<string | null>(null);

  const handleTestStkPush = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestSuccess(null);
    setTestError(null);

    try {
      const res = await fetch('/api/v1/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          networkProvider: testCarrier,
          planId: 1,
        }),
      });

      const data = await res.json();
      if (res.ok && (data.success !== false)) {
        setTestSuccess(
          `✅ USSD Push Imefanikiwa Kutumwa! Ref: ${data.externalReference || data.reference || 'N/A'}. Angalia simu yako sasa kuweka PIN.`
        );
      } else {
        setTestError(
          `❌ Hitilafu ya Mtandao: ${data.error || data.message || 'API imekataa ombi. Hakikisha API Keys/Token na namba ya simu ni sahihi.'}`
        );
      }
    } catch (err: any) {
      setTestError(`❌ Hitilafu ya Muunganisho (Network Error): ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          <span>Mipangilio ya Geti la Malipo & Merchant (Payment Gateway)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Dhibiti akaunti yako ya kupokelea pesa za mauzo ya intaneti (Hotspot & PPPoE). Weka au badilisha API Token na Merchant ID zako.
        </p>
      </div>

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
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              CURRENT PAYMENT GATEWAY OPTIONS
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            {userId ? 'Active Custom Merchant' : 'Active (Admin Default)'}
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-base font-black text-slate-900 uppercase">
                {owner?.payout_channel === 'DALIPAY' ? 'DaliPay / DaliPesa (Live Aggregator)' : owner?.payout_channel === 'PALMPESA' ? 'PalmPesa (USSD Push)' : owner?.payout_channel === 'AZAMPAY_SUB' ? 'AzamPay Multi-Carrier' : owner?.payout_channel === 'VODACOM_DIRECT' ? 'Vodacom Direct OpenAPI' : 'Geti Teule la Malipo'}
              </div>
              <div className="text-[11px] text-slate-500">
                Inapokea malipo ya simu kutoka mitandao yote: Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
            >
              <Smartphone className="w-4 h-4" />
              <span>Test STK push or payment request prompt</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">USER ID</span>
              <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">
                {userId || (lang === 'sw' ? 'Haijawekwa' : 'Not Configured')}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">PUBLIC USER REF</span>
              <span className="font-mono font-bold text-slate-700 text-xs mt-0.5 block truncate">
                {userRef || (lang === 'sw' ? 'Haijawekwa' : 'Not Configured')}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">YOUR API TOKEN</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    {showToken ? 'Ficha' : 'Onyesha'}
                  </button>
                  {apiToken && (
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 ml-1"
                      title="Nakili Token"
                    >
                      {copiedToken ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
              <span className="font-mono text-xs text-slate-800 mt-1 block truncate">
                {apiToken
                  ? showToken
                    ? apiToken
                    : `${apiToken.slice(0, 8)}••••••••••••••••••••${apiToken.slice(-4)}`
                  : (lang === 'sw' ? 'Hakuna API Token iliyowekwa' : 'No API Token configured')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">ACCEPT HOTSPOT STK:</span>
              <span
                className={`font-black px-2 py-0.5 rounded-md text-[10px] ${
                  acceptStk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {acceptStk ? 'YES' : 'NO'}
              </span>
            </div>

            {userId && (
              <button
                type="button"
                onClick={handleResetToAdminDefault}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition"
              >
                Rejesha Kwenye Default ya Admin
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: ADD NEW PAYMENT OPTION FOR PPPOE OR HOTSPOT */}
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
              Select Payment Gateway * <span className="text-rose-500">REQUIRED</span>
            </label>
            <select
              value={selectedGateway}
              onChange={(e) => setSelectedGateway(e.target.value as any)}
              className="w-full text-xs font-bold p-3 border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="dalipay">DaliPay / DaliPesa (Unified Aggregator - M-Pesa, Tigo, Airtel, Halo)</option>
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

              {/* Base Endpoint & Webhook Endpoint Callout Box */}
              <div className="space-y-3">
                <div className="p-3.5 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                      <span>1. DaliPay Checkout Push Endpoint (Seva ya Mfumo Inatuma Hapa)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 font-mono px-2 py-0.5 rounded-full font-bold">
                      Built-in
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg break-all select-all flex items-center justify-between">
                    <span>https://api.dalipay.com/v1/checkout/push</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 Hii ni URL ya seva ya DaliPay inayotumiwa na mfumo huu kuanzisha STK Push. Imejengwa moja kwa moja (pre-configured) kwenye seva, hivyo huna haja ya kuikopi au kuiweka kwa mkono!
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
                      onClick={() => {
                        navigator.clipboard.writeText(webhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold transition border border-indigo-200 cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWebhook ? "Imenakiliwa!" : "Nakili Webhook URL"}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg break-all select-all flex items-center justify-between">
                    <span>{webhookUrl}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    📌 <strong>Maelekezo:</strong> Ingia kwenye Dashboard ya DaliPay &rarr; Nenda <strong>Webhooks / API Settings</strong> &rarr; Bandika (Paste) URL hii hapo juu ili mfumo upokee majibu ya malipo ya wateja papo hapo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    DaliPay Key ID *
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Weka Key ID (Mfano: y3hT9bs505Z6)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Key ID inayopatikana kwenye ukurasa wa Keys wa DaliPay.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Public Key (gw_pk_...) *
                  </label>
                  <input
                    type="text"
                    value={userRef}
                    onChange={(e) => setUserRef(e.target.value)}
                    placeholder="Weka Public Key (gw_pk_...)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Public API Key inayotumika kuanzisha miamala.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Secret Key (gw_sk_...) *</span>
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      {showToken ? "Ficha" : "Onyesha"}
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Weka Secret Key (gw_sk_...)"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Secret Key kwa ajili ya usalama wa STK Push.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>Callback Secret / Webhook Secret Key</span>
                    <span className="text-[10px] text-indigo-600 font-bold">HMAC Signature</span>
                  </label>
                  <input
                    type="text"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="Weka Webhook Callback Secret (gw_wh_...)"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Ufunguo wa kuthibitisha uhalisi wa callback inayotoka DaliPay.</span>
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

              <div className="flex items-center justify-between pt-2 border-t border-indigo-100/80">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">ACCEPT HOTSPOT STK</span>
                  <span className="text-[11px] text-slate-500">
                    Washa USSD Push ya simu ijitokeze mteja akibonyeza "Lipa Sasa"
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-900">
                  <input
                    type="checkbox"
                    checked={acceptStk}
                    onChange={(e) => setAcceptStk(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{acceptStk ? 'YES (Imewashwa)' : 'NO (Imezimwa)'}</span>
                </label>
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
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 ${
                saveStatus === 'saved' || saveStatus === 'updated'
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'saved' || saveStatus === 'updated' ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {saving
                  ? 'Inahifadhi...'
                  : saveStatus === 'saved'
                  ? '✓ Saved & Activated! (Imehifadhiwa)'
                  : saveStatus === 'updated'
                  ? '✓ Updated! (Imesasishwa)'
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
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ Funga
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Jaribu kutuma ombi la USSD PIN kwenye simu yako kuthibitisha kama API Token na USER ID yako zinafanya kazi:
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
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
