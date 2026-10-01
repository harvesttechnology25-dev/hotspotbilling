import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Key,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  PlusCircle,
  Zap,
} from 'lucide-react';
import { HotspotOwner, NetworkProvider } from '../../types/index.ts';

interface OwnerMerchantSettingsProps {
  owner: HotspotOwner | null;
  onUpdated?: (updatedOwner: HotspotOwner) => void;
  lang?: 'sw' | 'en';
}

export const OwnerMerchantSettings: React.FC<OwnerMerchantSettingsProps> = ({
  owner,
  onUpdated,
  lang = 'sw',
}) => {
  const [selectedGateway, setSelectedGateway] = useState<
    'dalipay' | 'palmpay' | 'azampay' | 'vodacom_mpesa' | 'tigopesa' | 'airtel_money' | 'manual_wallet'
  >('dalipay');

  const [userId, setUserId] = useState(owner?.palmpesa_user_id || '');
  const [userRef, setUserRef] = useState(owner?.palmpesa_user_ref || '');
  const [apiToken, setApiToken] = useState(owner?.palmpesa_api_token || '');
  const [acceptStk, setAcceptStk] = useState(owner?.palmpesa_accept_stk !== false);
  const [accountNumber, setAccountNumber] = useState(owner?.wallet_account_number || owner?.phone || '');
  const [merchantName, setMerchantName] = useState(owner?.business_name || '');

  // UI state
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'updated'>('idle');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test STK push state & diagnostics
  const [testPhone, setTestPhone] = useState(owner?.phone || '0754123456');
  const [testCarrier, setTestCarrier] = useState<NetworkProvider>('VODACOM');
  const [testAmount, setTestAmount] = useState('1000');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
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
    setMessage(null);

    try {
      const payload: Partial<HotspotOwner> = {
        ...owner,
        palmpesa_user_id: userId ? userId.trim() : undefined,
        palmpesa_user_ref: userRef ? userRef.trim() : undefined,
        palmpesa_api_token: apiToken ? apiToken.trim() : undefined,
        palmpesa_accept_stk: acceptStk,
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
        wallet_account_number: accountNumber.trim(),
      };

      const res = await fetch(`/api/v1/owners/${owner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Imeshindikana kusasisha geti la malipo');

      setSaveStatus('saved');
      setMessage({
        type: 'success',
        text: `✓ Geti la malipo limehifadhiwa na kuwashwa kikamilifu! Pesa za router zako zitaingia hapa moja kwa moja.`,
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
      if (res.ok && data.success !== false) {
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
                {owner?.payout_channel === 'DALIPAY'
                  ? 'DaliPay / DaliPesa (Live Aggregator)'
                  : owner?.payout_channel === 'PALMPESA'
                  ? 'PalmPesa (USSD Push)'
                  : owner?.payout_channel === 'AZAMPAY_SUB'
                  ? 'AzamPay Multi-Carrier'
                  : owner?.payout_channel === 'VODACOM_DIRECT'
                  ? 'Vodacom Direct OpenAPI'
                  : 'Geti Teule la Malipo'}
              </div>
              <div className="text-[11px] text-slate-500">
                Inapokea malipo ya simu kutoka mitandao yote: Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition self-start sm:self-auto cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Test STK push or payment request prompt</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHOOSE AND CONFIGURE GATEWAY */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              CHOOSE PAYMENT GATEWAY / BADILISHA MERCHANT
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Chagua mtoa huduma wa malipo unayetaka kutumia kwenye router zako kutoka kwenye orodha ifuatayo:
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

          {/* DALIPAY FORM */}
          {selectedGateway === 'dalipay' && (
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Taarifa za DaliPay / DaliPesa Merchant API</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Live Aggregator
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    DaliPay Key ID *
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Mfano: y3hT9bs505Z6"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Public Key (gw_pk_...) *
                  </label>
                  <input
                    type="text"
                    value={userRef}
                    onChange={(e) => setUserRef(e.target.value)}
                    placeholder="Mfano: gw_pk_test_EoDvAZ..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Secret Key (gw_sk_...) *
                  </label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Weka Secret Key ya DaliPay hapa..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PALMPAY FORM */}
          {selectedGateway === 'palmpay' && (
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    USER ID (Merchant Account ID) *
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Mfano: 770"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    PUBLIC USER REF *
                  </label>
                  <input
                    type="text"
                    value={userRef}
                    onChange={(e) => setUserRef(e.target.value)}
                    placeholder="Mfano: USR-B2510CD582DF"
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    YOUR API TOKEN *
                  </label>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Weka API Token yako hapa..."
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Inahifadhi...' : 'Hifadhi & Washa Geti Hili (Save & Activate)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* MODAL: TEST STK PUSH WITH LIVE ERROR DIAGNOSTICS */}
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
                  placeholder="0754123456"
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mtandao wa Simu:</label>
                <select
                  value={testCarrier}
                  onChange={(e) => setTestCarrier(e.target.value as NetworkProvider)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                >
                  <option value="VODACOM">Vodacom (M-Pesa)</option>
                  <option value="TIGO">Tigo (Tigo Pesa)</option>
                  <option value="AIRTEL">Airtel (Airtel Money)</option>
                  <option value="HALOTEL">Halotel (HaloPesa)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 font-bold"
                >
                  Ghairi
                </button>
                <button
                  type="submit"
                  disabled={sendingTest}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {sendingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{sendingTest ? 'Inatuma...' : 'Tuma Ombi la Jaribio'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
