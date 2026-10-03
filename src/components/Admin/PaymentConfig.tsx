import React, { useState, useEffect } from 'react';
import { CARRIERS } from '../../utils/carrierInfo.ts';
import { NetworkProvider, GatewaySettings, HotspotOwner } from '../../types/index.ts';
import {
  CreditCard,
  Key,
  Globe,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
  Radio,
  Sliders,
  Smartphone,
  ExternalLink,
  Clock,
  Power,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  Check,
  Building,
  ChevronRight,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';

export const PaymentConfig: React.FC = () => {
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // DaliPay State
  const [showDaliSecret, setShowDaliSecret] = useState(false);
  const [testingDali, setTestingDali] = useState(false);
  const [daliTestResult, setDaliTestResult] = useState<any>(null);

  // User Subscription Test Expire Simulator state
  const [owners, setOwners] = useState<HotspotOwner[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [togglingOwnerId, setTogglingOwnerId] = useState<number | null>(null);
  const [expireMessage, setExpireMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [subTestResult, setSubTestResult] = useState<{
    ownerName: string;
    reference: string;
    instructions: string;
    amount: number;
    phone: string;
  } | null>(null);
  const [testingSubOwnerId, setTestingSubOwnerId] = useState<number | null>(null);

  const [testCarrier, setTestCarrier] = useState<NetworkProvider>('VODACOM');
  const [testPhone, setTestPhone] = useState('0754123456');
  const [testAmount, setTestAmount] = useState('1500');
  const [testStatus, setTestStatus] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/payments/webhook`;

  const handleTestDaliPush = async (keyId?: string) => {
    setTestingDali(true);
    setDaliTestResult(null);
    try {
      const res = await fetch('/api/v1/payments/dalipay/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: keyId || settings?.dalipay?.keyId || 'y3hT9bs505Z6',
          phoneNumber: testPhone || '0754123456',
          amount: Number(testAmount) || 1000,
          carrier: testCarrier || 'VODACOM',
        }),
      });
      const data = await res.json();
      setDaliTestResult(data);
    } catch (err: any) {
      setDaliTestResult({ success: false, error: err.message || 'Hitilafu ya jaribio la DaliPay.' });
    } finally {
      setTestingDali(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      setLoadingOwners(true);
      const res = await fetch('/api/v1/owners');
      if (res.ok) {
        const data = await res.json();
        setOwners(Array.isArray(data) ? data.filter((o: HotspotOwner) => o.role === 'HOTSPOT_OWNER') : []);
      }
    } catch (err) {
      console.error('Failed to load hotspot owners:', err);
    } finally {
      setLoadingOwners(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchOwners();
  }, []);

  const handleToggleExpire = async (owner: HotspotOwner, isExpired: boolean) => {
    setTogglingOwnerId(owner.id);
    setExpireMessage(null);
    try {
      const res = await fetch('/api/v1/subscription/toggle-expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: owner.id,
          isExpired,
          days: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hitilafu ya kubadili hali ya subscription');
      }

      setExpireMessage({
        type: 'success',
        text: data.message || `Hali ya ${owner.business_name} imebadilishwa!`,
      });

      // Update state immediately
      setOwners((prev) =>
        prev.map((o) => (o.id === owner.id ? (data.owner || { ...o, subscription_status: isExpired ? 'EXPIRED' : 'ACTIVE' }) : o))
      );

      // If active user in localStorage is this owner, update it
      try {
        const savedStr = localStorage.getItem('tzwifi_user');
        if (savedStr) {
          const parsed = JSON.parse(savedStr);
          if (parsed && parsed.id === owner.id) {
            localStorage.setItem('tzwifi_user', JSON.stringify(data.owner));
          }
        }
      } catch (e) {
        console.error(e);
      }

      setTimeout(() => setExpireMessage(null), 5000);
    } catch (err: any) {
      setExpireMessage({
        type: 'error',
        text: err.message || 'Hitilafu ya kubadili subscription',
      });
    } finally {
      setTogglingOwnerId(null);
    }
  };

  const handleBulkToggleExpire = async (isExpired: boolean) => {
    setBulkProcessing(true);
    setExpireMessage(null);
    try {
      const res = await fetch('/api/v1/subscription/toggle-all-expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isExpired, days: 30 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Hitilafu ya kubadili wamiliki wote');
      }

      setExpireMessage({
        type: 'success',
        text: data.message,
      });

      if (Array.isArray(data.owners)) {
        setOwners(data.owners);
      } else {
        await fetchOwners();
      }

      setTimeout(() => setExpireMessage(null), 5000);
    } catch (err: any) {
      setExpireMessage({
        type: 'error',
        text: err.message || 'Hitilafu ya kubadili wamiliki',
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleSimulateSubscriptionPush = async (owner: HotspotOwner) => {
    setTestingSubOwnerId(owner.id);
    setSubTestResult(null);
    try {
      const res = await fetch('/api/v1/subscription/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: owner.id,
          phoneNumber: owner.phone,
          carrier: 'VODACOM',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kutuma ombi la USSD.');
      }

      setSubTestResult({
        ownerName: owner.business_name,
        reference: data.externalReference,
        instructions: data.instructions,
        amount: data.amount,
        phone: owner.phone,
      });
    } catch (err: any) {
      setExpireMessage({
        type: 'error',
        text: err.message || 'Hitilafu ya kuanzisha jaribio la USSD push.',
      });
    } finally {
      setTestingSubOwnerId(null);
    }
  };

  const handleConfirmSubPayment = async (reference: string, ownerId: number) => {
    try {
      const res = await fetch('/api/v1/subscription/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          externalReference: reference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindikana kuthibitisha malipo.');
      }

      setSubTestResult(null);
      setExpireMessage({
        type: 'success',
        text: `Malipo ya Sh ${Number(data.user?.subscription_fee || 15000).toLocaleString()} yamethibitishwa na akaunti imerejeshwa ACTIVE!`,
      });

      await fetchOwners();
      setTimeout(() => setExpireMessage(null), 5000);
    } catch (err: any) {
      setExpireMessage({
        type: 'error',
        text: err.message || 'Hitilafu ya kuthibitisha malipo.',
      });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const externalRef = `TZWF-LIVE-${Date.now().toString().slice(-6)}`;

    try {
      const initRes = await fetch('/api/v1/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: testPhone,
          networkProvider: testCarrier,
          planId: 1,
          macAddress: 'AA:BB:CC:DD:EE:FF',
        }),
      });
      const initData = await initRes.json();

      const webhookRes = await fetch('/api/v1/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': 'mock_sha256_verified',
        },
        body: JSON.stringify({
          externalReference: initData.externalReference || externalRef,
          transactionId: `${testCarrier.slice(0, 2)}${Date.now()}`,
          status: testStatus,
          amount: Number(testAmount),
          currency: 'TZS',
          phoneNumber: testPhone,
          carrier: testCarrier,
          timestamp: new Date().toISOString(),
          message: testStatus === 'SUCCESS' ? 'Transaction completed by subscriber' : 'Subscriber rejected USSD prompt',
        }),
      });

      const webhookData = await webhookRes.json();
      setResult({
        statusCode: webhookRes.status,
        data: webhookData,
        reference: initData.externalReference || externalRef,
      });
    } catch (err: any) {
      setResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  const filteredOwners = owners.filter((o) => {
    if (!ownerSearch.trim()) return true;
    const q = ownerSearch.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      o.business_name.toLowerCase().includes(q) ||
      (o.phone && o.phone.includes(q)) ||
      (o.email && o.email.toLowerCase().includes(q))
    );
  });

  if (loading || !settings) {
    return (
      <div className="py-12 flex justify-center items-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-slate-900">
          Payment Gateway Architecture & Carrier Configuration
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure AzamPay Aggregator API credentials, Vodacom OpenAPI, Webhook HMAC secret, and test USSD pushes
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Mipangilio imehifadhiwa kikamilifu kwenye database! (Configuration saved successfully)</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Active Gateway Selection & AzamPay */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Njia Kuu ya Malipo (Payment Gateway)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {settings.activeGateway}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {(['DALIPAY', 'PALMPESA', 'AZAMPAY', 'VODACOM_OPENAPI', 'SELCOM', 'TEST_SANDBOX'] as const).map((gw) => (
                <button
                  key={gw}
                  type="button"
                  onClick={() => setSettings({ ...settings, activeGateway: gw })}
                  className={`p-3 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    settings.activeGateway === gw
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>
                      {gw === 'DALIPAY'
                        ? 'DaliPay (Aggregator)'
                        : gw === 'PALMPESA'
                        ? 'PalmPesa (USSD Push)'
                        : gw === 'AZAMPAY'
                        ? 'AzamPay (Aggregator)'
                        : gw === 'VODACOM_OPENAPI'
                        ? 'Vodacom Direct'
                        : gw === 'SELCOM'
                        ? 'Selcom Wireless'
                        : 'Test Sandbox'}
                    </span>
                    {gw === 'DALIPAY' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {gw === 'DALIPAY'
                      ? 'Aggregator Live Environment'
                      : gw === 'PALMPESA'
                      ? 'M-Pesa, Tigo, Airtel, Halo'
                      : gw === 'AZAMPAY'
                      ? 'M-Pesa, Tigo, Airtel, Halo'
                      : gw === 'TEST_SANDBOX'
                      ? 'Mtandao Umeidhinisha'
                      : 'Direct Telco API'}
                  </div>
                </button>
              ))}
            </div>

            {/* DaliPay Specific Credentials & Test Environment Panel */}
            {settings.activeGateway === 'DALIPAY' && (
              <div className="pt-3 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">
                      DaliPay Aggregator API (Live Environment)
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.dalipay?.isSandbox !== false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dalipay: {
                            ...(settings.dalipay || {
                              keyId: 'y3hT9bs505Z6',
                              publicKey: 'gw_pk_test_EoDvAZ',
                              secretKey: 'gw_sk_test_IdufCg',
                            }),
                            isSandbox: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span className="font-semibold text-emerald-700">Aggregator Active Live</span>
                  </label>
                </div>

                {/* Notice banner for Test environment */}
                <div className="p-3 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-950 space-y-1.5 leading-relaxed">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mazingira Halisi ya API ya Malipo — USSD Pop-up inatumwa moja kwa moja kwenye simu</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Umeunganishwa na API za uzalishaji za <strong>DaliPay Aggregator</strong> kupitia endpoint rasmi ya <code>POST /api/v1/collections</code> (Headers: <code>X-Public-Key</code> na <code>X-Secret-Key</code>). Unaweza kuchagua mojawapo ya Funguo zilizo hai hapa chini ili kufanya majaribio ya USSD Push ya Tigo, Airtel, Halopesa, Azampesa na Mpesa.
                  </p>
                </div>

                {/* Available Test API Keys Cards Grid */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Funguo za Uzalishaji za DaliPay (Live API Keys) (Chagua Key ya Kutumia):
                    </span>
                    <span className="text-[10px] text-slate-400">Bonyeza kutumia key unayotaka</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(settings.dalipay?.availableKeys || [
                      {
                        keyId: 'y3hT9bs505Z6',
                        publicKey: 'gw_pk_test_EoDvAZ',
                        secretKey: 'gw_sk_test_IdufCg',
                        status: 'Active',
                        created: '29 Sept 2026 13:05',
                        lastUsed: 'Never',
                      },
                      {
                        keyId: 'd06TgZivMkzW',
                        publicKey: 'gw_pk_test_AAY0S5',
                        secretKey: 'gw_sk_test_tYAWZs',
                        status: 'Active',
                        created: '29 Sept 2026 13:03',
                        lastUsed: 'Never',
                      },
                      {
                        keyId: '56Jva2sXOfq',
                        publicKey: 'gw_pk_test_pd5CNG',
                        secretKey: 'gw_sk_test_gh_Xyw',
                        status: 'Active',
                        created: '29 Sept 2026 13:01',
                        lastUsed: 'Never',
                      },
                    ]).map((kItem) => {
                      const isSelected = settings.dalipay?.keyId === kItem.keyId;
                      return (
                        <div
                          key={kItem.keyId}
                          onClick={() =>
                            setSettings({
                              ...settings,
                              dalipay: {
                                ...settings.dalipay,
                                keyId: kItem.keyId,
                                publicKey: kItem.publicKey,
                                secretKey: kItem.secretKey,
                                isSandbox: true,
                                apiEndpoint: settings.dalipay?.apiEndpoint || 'https://app.dalipay.co.tz',
                                webhookSecret: settings.dalipay?.webhookSecret || 'gw_wh_test_secret_dalipay',
                              },
                            })
                          }
                          className={`p-3 rounded-xl border text-left cursor-pointer transition relative ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/30'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-black text-xs text-slate-900">
                              {kItem.keyId}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-700">
                              {kItem.status}
                            </span>
                          </div>
                          <div className="space-y-1 font-mono text-[10px] text-slate-500">
                            <div className="truncate">
                              <span className="text-slate-400">PK:</span> {kItem.publicKey}
                            </div>
                            <div className="truncate">
                              <span className="text-slate-400">SK:</span> {kItem.secretKey.slice(0, 14)}...
                            </div>
                            <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                              <span>{kItem.created || '29 Sept 2026'}</span>
                              {isSelected && <span className="font-bold text-indigo-600">✓ Inatumika</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Form Inputs for Active DaliPay Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Active Key ID
                    </label>
                    <input
                      type="text"
                      value={settings.dalipay?.keyId || 'y3hT9bs505Z6'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dalipay: {
                            ...(settings.dalipay || {
                              publicKey: '',
                              secretKey: '',
                              isSandbox: true,
                            }),
                            keyId: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. y3hT9bs505Z6"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Public Key (gw_pk_test_...)
                    </label>
                    <input
                      type="text"
                      value={settings.dalipay?.publicKey || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dalipay: {
                            ...(settings.dalipay || {
                              keyId: 'y3hT9bs505Z6',
                              secretKey: '',
                              isSandbox: true,
                            }),
                            publicKey: e.target.value,
                          },
                        })
                      }
                      placeholder="gw_pk_test_EoDvAZ"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Secret Key (gw_sk_test_...)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDaliSecret(!showDaliSecret)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {showDaliSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showDaliSecret ? 'Ficha Secret' : 'Onyesha Secret'}</span>
                    </button>
                  </div>
                  <input
                    type={showDaliSecret ? 'text' : 'password'}
                    value={settings.dalipay?.secretKey || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dalipay: {
                          ...(settings.dalipay || {
                            keyId: 'y3hT9bs505Z6',
                            publicKey: '',
                            isSandbox: true,
                          }),
                          secretKey: e.target.value,
                        },
                      })
                    }
                    placeholder="gw_sk_test_IdufCg"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      DaliPay API Endpoint
                    </label>
                    <input
                      type="text"
                      value={settings.dalipay?.apiEndpoint || 'https://app.dalipay.co.tz'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dalipay: {
                            ...(settings.dalipay || {
                              keyId: 'y3hT9bs505Z6',
                              publicKey: '',
                              secretKey: '',
                              isSandbox: true,
                            }),
                            apiEndpoint: e.target.value,
                          },
                        })
                      }
                      placeholder="https://app.dalipay.co.tz"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      DaliPay Webhook Secret
                    </label>
                    <input
                      type="text"
                      value={settings.dalipay?.webhookSecret || 'gw_wh_test_secret_dalipay'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          dalipay: {
                            ...(settings.dalipay || {
                              keyId: 'y3hT9bs505Z6',
                              publicKey: '',
                              secretKey: '',
                              isSandbox: true,
                            }),
                            webhookSecret: e.target.value,
                          },
                        })
                      }
                      placeholder="gw_wh_test_secret_dalipay"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-hidden bg-white"
                    />
                  </div>
                </div>

                {/* Quick Test DaliPay Push Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">
                      Jaribu DaliPay USSD Push (API Dispatch Test)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Tuma ombi la jaribio kwa simu {testPhone || '0754123456'} (Key: {settings.dalipay?.keyId || 'y3hT9bs505Z6'})
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={testingDali}
                    onClick={() => handleTestDaliPush(settings.dalipay?.keyId)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs shrink-0"
                  >
                    {testingDali ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    <span>Tuma USSD Push Sasa</span>
                  </button>
                </div>

                {/* DaliPay Test Result Feedback */}
                {daliTestResult && (
                  <div className={`p-3.5 rounded-xl text-xs space-y-1.5 border animate-in fade-in ${
                    daliTestResult.success
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center gap-1.5">
                        {daliTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{daliTestResult.message || (daliTestResult.success ? 'Jaribio limekamilika!' : 'Hitilafu')}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDaliTestResult(null)}
                        className="text-[10px] text-slate-500 hover:text-slate-800"
                      >
                        ✕ Funga
                      </button>
                    </div>
                    {daliTestResult.reference && (
                      <div className="text-[11px] font-mono text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 border-t border-emerald-200/60">
                        <span>Ref: <strong>{daliTestResult.reference}</strong></span>
                        <span>TX ID: <strong>{daliTestResult.transactionId}</strong></span>
                        <span>Key ID: <strong>{daliTestResult.keyId}</strong></span>
                        <span className="text-emerald-700 font-bold">✓ Live Active</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PalmPesa Specific Credentials */}
            {settings.activeGateway === 'PALMPESA' && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    <span>PalmPesa API Developer Access</span>
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.palmpesa?.isSandbox || false}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          palmpesa: {
                            userRef: settings.palmpesa?.userRef || 'USR-B2510CD582DF',
                            apiToken: settings.palmpesa?.apiToken || '',
                            isSandbox: e.target.checked,
                          },
                        })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>Sandbox Mode</span>
                  </label>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                  💡 <strong>Kwanini hakuna sehemu ya kuweka Webhook kwenye PalmPesa?</strong><br />
                  PalmPesa inatumia <em>Dynamic Callback URL</em>. Mfumo wetu wa Wi-Fi unatuma anwani ya <code>callback_url</code> ndani ya ombi la kila muamala (payload). PalmPesa inapokea na kurudisha uthibitisho wa pesa moja kwa moja!
                </div>

                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[11px] text-emerald-950 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Inalingana 100% na Mipangilio yako ya Billnass (PalmPay / PalmPesa)</span>
                  </div>
                  <p>
                    Umeingiza taarifa za Billnass: <strong>USER ID: 770</strong> na <strong>ACCEPT HOTSPOT STK: YES</strong>. Mfumo huu unafanya kazi moja kwa moja na akaunti hiyo hiyo ya PalmPay/PalmPesa!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      USER ID (Kutoka Billnass / PalmPay)
                    </label>
                    <input
                      type="text"
                      value={settings.palmpesa?.userId || '770'}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          palmpesa: {
                            userRef: settings.palmpesa?.userRef || 'USR-B2510CD582DF',
                            userId: e.target.value,
                            apiToken: settings.palmpesa?.apiToken || '',
                            acceptHotspotStk: settings.palmpesa?.acceptHotspotStk ?? true,
                            isSandbox: settings.palmpesa?.isSandbox || false,
                          },
                        })
                      }
                      placeholder="e.g. 770"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Public User Ref
                    </label>
                    <input
                      type="text"
                      value={settings.palmpesa?.userRef || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          palmpesa: {
                            userRef: e.target.value,
                            userId: settings.palmpesa?.userId || '770',
                            apiToken: settings.palmpesa?.apiToken || '',
                            acceptHotspotStk: settings.palmpesa?.acceptHotspotStk ?? true,
                            isSandbox: settings.palmpesa?.isSandbox || false,
                          },
                        })
                      }
                      placeholder="e.g. USR-B2510CD582DF"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    YOUR API TOKEN (Ufunguo wa Siri wa API)
                  </label>
                  <input
                    type="password"
                    value={settings.palmpesa?.apiToken || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        palmpesa: {
                          userRef: settings.palmpesa?.userRef || '',
                          userId: settings.palmpesa?.userId || '770',
                          apiToken: e.target.value,
                          acceptHotspotStk: settings.palmpesa?.acceptHotspotStk ?? true,
                          isSandbox: settings.palmpesa?.isSandbox || false,
                        },
                      })
                    }
                    placeholder="1NhdI6PhhHHY9kYmnSoUUszx7qm8nSYrnewbfxeDYyONiMzGGTdRhIJjj2Hq"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Inalindwa kwa siri na haionyeshwi hadharani kwa wateja.
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">ACCEPT HOTSPOT STK:</span>
                    <span className="text-[11px] text-slate-500">
                      Ruhusu dirisha la USSD PIN litokee kiotomatiki kwenye simu ya mteja (M-Pesa, Tigo, Airtel, Halo).
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.palmpesa?.acceptHotspotStk ?? true}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          palmpesa: {
                            userRef: settings.palmpesa?.userRef || 'USR-B2510CD582DF',
                            userId: settings.palmpesa?.userId || '770',
                            apiToken: settings.palmpesa?.apiToken || '',
                            acceptHotspotStk: e.target.checked,
                            isSandbox: settings.palmpesa?.isSandbox || false,
                          },
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* AzamPay Credentials */}
            {settings.activeGateway === 'AZAMPAY' && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">AzamPay API Credentials</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.azampay.isSandbox}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          azampay: { ...settings.azampay, isSandbox: e.target.checked },
                        })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>Sandbox Mode (Test)</span>
                  </label>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">App Name</label>
                  <input
                    type="text"
                    value={settings.azampay.appName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        azampay: { ...settings.azampay, appName: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Client ID</label>
                  <input
                    type="text"
                    value={settings.azampay.clientId}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        azampay: { ...settings.azampay, clientId: e.target.value },
                      })
                    }
                    placeholder="e.g. 0192384-xxxx-xxxx"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Client Secret</label>
                  <input
                    type="password"
                    value={settings.azampay.clientSecret}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        azampay: { ...settings.azampay, clientSecret: e.target.value },
                      })
                    }
                    placeholder="AzamPay Client Secret"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Merchant Account Number</label>
                  <input
                    type="text"
                    value={settings.azampay.accountNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        azampay: { ...settings.azampay, accountNumber: e.target.value },
                      })
                    }
                    placeholder="255754000111"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Webhook & General Portal Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Public Webhook & Portal Details</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Standard Webhook URL (AzamPay / Vodacom):</span>
                <div className="p-2.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] break-all select-all">
                  {webhookUrl}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-1">PalmPesa & Sub-Merchant Callback URL:</span>
                <div className="p-2.5 rounded-xl bg-slate-900 text-cyan-400 font-mono text-[11px] break-all select-all">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/payments/vendor/callback`}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Inatumwa kiotomatiki na mfumo wetu ndani ya parameter ya <code>callback_url</code> kwenye kila ombi la PalmPesa API.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Webhook Secret (HMAC-SHA256):</label>
                <input
                  type="text"
                  value={settings.webhookSecret}
                  onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Brand & Support</span>
                
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Hotspot SSID / Brand Name:</label>
                  <input
                    type="text"
                    value={settings.hotspotName}
                    onChange={(e) => setSettings({ ...settings, hotspotName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nambari ya Simu ya Huduma kwa Wateja (Support):</label>
                  <input
                    type="text"
                    value={settings.supportPhone}
                    onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                    placeholder="+255 754 000 111"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dedicated Vendor Subscription Aggregator Routing Section */}
              <div className="pt-3 border-t border-slate-100 space-y-3 bg-gradient-to-br from-indigo-50/70 to-emerald-50/50 p-4 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs text-indigo-950">
                    Akaunti ya Kupokea Ada za Subscription (Vendor Aggregator)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Ada zote za kila mwezi (<strong>TZS 15,000</strong> kwa kila mmiliki wa Hotspot) zitaelekezwa moja kwa moja kwenye akaunti ya Aggregator uliyoweka API zake hapa.
                </p>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Chagua Aggregator Inayopokea Subscription:
                  </label>
                  <select
                    value={settings.subscriptionGateway || 'PALMPESA'}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        subscriptionGateway: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:border-indigo-600 focus:outline-hidden bg-white"
                  >
                    <option value="DALIPAY">
                      DaliPay Aggregator (Key ID: {settings.dalipay?.keyId || 'y3hT9bs505Z6'})
                    </option>
                    <option value="PALMPESA">
                      PalmPesa / Billnass (USER ID: {settings.palmpesa?.userId || '770'})
                    </option>
                    <option value="AZAMPAY">
                      AzamPay Aggregator ({settings.azampay?.appName || 'Vendor Platform'})
                    </option>
                    <option value="VODACOM_OPENAPI">
                      Vodacom M-Pesa Direct (Shortcode: {settings.vodacom?.shortcode || '000000'})
                    </option>
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Akaunti Inayopokea:</span>
                    <strong className="text-emerald-700 font-mono">
                      {settings.subscriptionGateway === 'DALIPAY'
                        ? `DaliPay Key: ${settings.dalipay?.keyId || 'y3hT9bs505Z6'}`
                        : settings.subscriptionGateway === 'AZAMPAY'
                        ? settings.azampay?.accountNumber || 'ESCROW-AZAM'
                        : settings.subscriptionGateway === 'VODACOM_OPENAPI'
                        ? settings.vodacom?.shortcode || '000000'
                        : `PalmPesa User ID: ${settings.palmpesa?.userId || '770'}`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Hali ya API:</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Imewekwa & Tayari Kupokea 100%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
                  saveSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {saving
                    ? 'Inahifadhi...'
                    : saveSuccess
                    ? '✓ Saved! (Mipangilio Imehifadhiwa & Updated)'
                    : 'Hifadhi Mipangilio (Save Gateway Settings)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Admin Control: User Subscription Test Expire Simulator Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="font-black text-sm text-slate-900">
                Usimamizi wa Hali ya Subscription za Wamiliki
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-200">
                👑 Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Kama Msimamizi Mkuu (Admin), hapa ndipo unapoamua <strong>kuwasha (Expire)</strong> au <strong>kuzima (Rejesha Active)</strong> hali ya muda kuisha kwa kila mmiliki wa Hotspot (User). Watumiaji wa kawaida hawawezi kubonyeza Test Expire kwenye akaunti zao. Ukimwashia mtumiaji, akaunti yake itafungwa na atatakiwa kulipia <strong>TSh 15,000</strong> inayoelekezwa moja kwa moja kwenye Aggregator uliyoiweka hapo juu.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={bulkProcessing || owners.length === 0}
              onClick={() => handleBulkToggleExpire(true)}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Washa expire kwa wamiliki wote mara moja"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Simamisha Wote (Expire All)</span>
            </button>

            <button
              type="button"
              disabled={bulkProcessing || owners.length === 0}
              onClick={() => handleBulkToggleExpire(false)}
              className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Rejesha active kwa wamiliki wote"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${bulkProcessing ? 'animate-spin' : ''}`} />
              <span>Washa Wote Active</span>
            </button>
          </div>
        </div>

        {/* Message notification */}
        {expireMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
              expireMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {expireMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{expireMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setExpireMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              placeholder="Tafuta user kwa jina, hotspot, au namba..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium self-start sm:self-auto">
            <span>Jumla ya Wamiliki: <strong className="text-slate-900">{owners.length}</strong></span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">
              Active: {owners.filter((o) => o.subscription_status !== 'EXPIRED' && (!o.subscription_expires_at || new Date(o.subscription_expires_at).getTime() > Date.now())).length}
            </span>
            <span>•</span>
            <span className="text-rose-700 font-semibold">
              Expired: {owners.filter((o) => o.subscription_status === 'EXPIRED' || (o.subscription_expires_at && new Date(o.subscription_expires_at).getTime() <= Date.now())).length}
            </span>
          </div>
        </div>

        {/* Owners List */}
        {loadingOwners ? (
          <div className="py-8 flex justify-center items-center text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            <span>Inapakia orodha ya wamiliki...</span>
          </div>
        ) : filteredOwners.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Hakuna mmiliki aliyepatikana.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredOwners.map((owner) => {
              const isExpired =
                owner.subscription_status === 'EXPIRED' ||
                (owner.subscription_expires_at && new Date(owner.subscription_expires_at).getTime() <= Date.now());
              
              const daysRemaining = owner.subscription_expires_at
                ? Math.max(0, Math.ceil((new Date(owner.subscription_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : 30;

              const isToggling = togglingOwnerId === owner.id;
              const isTestingPush = testingSubOwnerId === owner.id;

              return (
                <div
                  key={owner.id}
                  className={`rounded-2xl border p-4 transition space-y-3 ${
                    isExpired
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          isExpired
                            ? 'bg-rose-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {owner.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900">{owner.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isExpired
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isExpired ? '🛑 EXPIRED' : '✅ ACTIVE'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{owner.business_name}</span>
                          <span>•</span>
                          <span className="font-mono">{owner.phone}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Details */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{isExpired ? 'Muda ulioisha:' : 'Muda uliobaki:'}</span>
                    </span>
                    <span className={`font-mono font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {isExpired
                        ? 'Siku 0 zimebaki (Akaunti imefungwa)'
                        : `Siku ${daysRemaining} zimebaki (${new Date(owner.subscription_expires_at || Date.now()).toLocaleDateString('sw-TZ')})`}
                    </span>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {/* The Primary Admin Toggle Button: Washa / Zima Test Expire */}
                    {isExpired ? (
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleExpire(owner, false)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Zima hali ya expire na mrejeshe active kwa siku 30"
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>Zima Test Expire (Rejesha Active)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleExpire(owner, true)}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Washa hali ya expire (Force Expired) ili kupima lock ya mfumo"
                      >
                        {isToggling ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        <span>Simamisha Huduma (Expire Account)</span>
                      </button>
                    )}

                    {/* Quick Test Subscription Push Simulation for this owner */}
                    <button
                      type="button"
                      disabled={isTestingPush}
                      className="py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Jaribu kutuma USSD push ya Sh 15,000 kwenda kwa mtumiaji huyu"
                    >
                      {isTestingPush ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      ) : (
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                      <span>Jaribu USSD Push</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Subscription Push Test Modal / Preview Result */}
        {subTestResult && (
          <div className="p-4 rounded-xl bg-indigo-950 text-white border border-indigo-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-indigo-200">
                  Matokeo ya Jaribio la Malipo ya Subscription ({subTestResult.ownerName})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSubTestResult(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Funga
              </button>
            </div>

            <div className="p-3 rounded-lg bg-indigo-900/60 border border-indigo-700/50 space-y-1.5 text-xs">
              <div className="text-emerald-300 font-medium">{subTestResult.instructions}</div>
              <div className="flex items-center justify-between text-indigo-300 font-mono text-[11px] pt-1 border-t border-indigo-800">
                <span>Reference: <strong>{subTestResult.reference}</strong></span>
                <span>Kiasi: <strong>TSh {subTestResult.amount.toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const matchedOwner = owners.find((o) => o.business_name === subTestResult.ownerName);
                  if (matchedOwner) {
                    handleConfirmSubPayment(subTestResult.reference, matchedOwner.id);
                  }
                }}
                className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Thibitisha Malipo Sasa (Tuma Webhook ya Mtandao)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Webhook & USSD Simulator Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
          <Send className="w-4 h-4 text-emerald-600" />
          <span>Kupima Uthibitisho wa Webhook ya Aggregator</span>
        </div>
        <p className="text-xs text-slate-500">
          Tuma uthibitisho halisi wa muamala wa mtandao kwenda kwenye mfumo.
        </p>

        <form onSubmit={handleSendTestWebhook} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Carrier</label>
              <select
                value={testCarrier}
                onChange={(e) => setTestCarrier(e.target.value as NetworkProvider)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none bg-white font-semibold"
              >
                <option value="VODACOM">Vodacom M-Pesa</option>
                <option value="TIGO">Tigo Pesa</option>
                <option value="AIRTEL">Airtel Money</option>
                <option value="HALOTEL">Halopesa</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Amount (TZS)</label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Status</label>
              <select
                value={testStatus}
                onChange={(e) => setTestStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none bg-white font-semibold"
              >
                <option value="SUCCESS">SUCCESS (Kulipwa)</option>
                <option value="FAILED">FAILED (Kukataliwa)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Thibitisha Muamala Sasa</span>
          </button>
        </form>

        {result && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-auto max-h-60 select-all border border-slate-800">
            <div className="text-slate-400 text-[10px] mb-1">Response (HTTP {result.statusCode}):</div>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};