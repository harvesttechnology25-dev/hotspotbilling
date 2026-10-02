import React, { useState, useEffect } from 'react';
import {
  Mail,
  Smartphone,
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
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Info,
  Server,
  Zap,
  Check,
  MessageSquare,
} from 'lucide-react';
import {
  GatewaySettings,
  EmailGatewayConfig,
  EmailMerchantProvider,
  SmsGatewayConfig,
  SmsMerchantProvider,
} from '../../types/index.ts';

interface EmailConfigProps {
  lang?: 'sw' | 'en';
  isVendor?: boolean;
}

const DEFAULT_EMAIL_CONFIG: EmailGatewayConfig = {
  provider: 'RESEND',
  fromEmail: 'noreply@tzwifi.co.tz',
  fromName: 'INFOTECH WiFi',
  resendApiKey: '',
  sendgridApiKey: '',
  mailgunApiKey: '',
  mailgunDomain: '',
  emailjsServiceId: '',
  emailjsTemplateId: '',
  emailjsPublicKey: '',
  emailjsPrivateKey: '',
  enabled: true,
};

const DEFAULT_SMS_CONFIG: SmsGatewayConfig = {
  provider: 'BEEM',
  senderId: 'INFOTECH',
  beemApiKey: '',
  beemSecretKey: '',
  nextsmsUsername: '',
  nextsmsPassword: '',
  twilioAccountSid: '',
  twilioAuthToken: '',
  twilioFromNumber: '',
  customWebhookUrl: '',
  customApiKey: '',
  enabled: true,
};

export const EmailConfig: React.FC<EmailConfigProps> = ({ lang = 'sw', isVendor = true }) => {
  const [activeSubTab, setActiveSubTab] = useState<'email' | 'sms'>('email');

  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailGatewayConfig>(DEFAULT_EMAIL_CONFIG);
  const [smsConfig, setSmsConfig] = useState<SmsGatewayConfig>(DEFAULT_SMS_CONFIG);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Password / Key Visibility toggles
  const [showResendKey, setShowResendKey] = useState(false);
  const [showSendGridKey, setShowSendGridKey] = useState(false);
  const [showMailgunKey, setShowMailgunKey] = useState(false);
  const [showEmailJsKey, setShowEmailJsKey] = useState(false);

  // SMS Visibility toggles
  const [showBeemSecret, setShowBeemSecret] = useState(false);
  const [showNextSmsPass, setShowNextSmsPass] = useState(false);
  const [showTwilioToken, setShowTwilioToken] = useState(false);

  // Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    otp?: string;
  } | null>(null);

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testingSms, setTestingSms] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    otp?: string;
  } | null>(null);

  const [requireRegistrationOtp, setRequireRegistrationOtp] = useState(true);
  const [togglingOtp, setTogglingOtp] = useState(false);

    const handleToggleOtp = async () => {
    const nextVal = !requireRegistrationOtp;
    setTogglingOtp(true);
    // Optimistic UI update
    setRequireRegistrationOtp(nextVal);
    try {
      const res = await fetch('/api/v1/system/otp-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireRegistrationOtp: nextVal }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequireRegistrationOtp(Boolean(data.requireRegistrationOtp));
        // Also update local settings state so subsequent saves don't overwrite it
        setSettings((prev) => prev ? { ...prev, requireRegistrationOtp: Boolean(data.requireRegistrationOtp) } : null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        // Rollback on error
        setRequireRegistrationOtp(!nextVal);
        setSaveError('Hitilafu ya kubadili hali ya OTP.');
      }
    } catch (err: any) {
      setRequireRegistrationOtp(!nextVal);
      setSaveError(err.message || 'Hitilafu ya mtandao.');
    } finally {
      setTogglingOtp(false);
    }
  };

const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/settings');
      if (res.ok) {
        const data: GatewaySettings = await res.json();
        setSettings(data);
        if (data.requireRegistrationOtp !== undefined) {
          setRequireRegistrationOtp(data.requireRegistrationOtp !== false);
        }
        if (data.emailGateway) {
          setEmailConfig({
            ...DEFAULT_EMAIL_CONFIG,
            ...data.emailGateway,
          });
        }
        if ((data as any).smsGateway) {
          setSmsConfig({
            ...DEFAULT_SMS_CONFIG,
            ...(data as any).smsGateway,
          });
        }
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    try {
      const updatedSettings = {
        ...settings,
        emailGateway: emailConfig,
        smsGateway: smsConfig,
        requireRegistrationOtp,
      };

      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save settings.');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'Hitilafu ya kuhifadhi mipangilio.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;

    setTestingEmail(true);
    setEmailTestResult(null);

    try {
      const res = await fetch('/api/v1/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      setEmailTestResult(data);
    } catch (err: any) {
      setEmailTestResult({
        success: false,
        message: err.message || 'Hitilafu ya kutuma barua pepe ya jaribio.',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setTestingSms(true);
    setSmsTestResult(null);

    try {
      const res = await fetch('/api/v1/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });
      const data = await res.json();
      setSmsTestResult(data);
    } catch (err: any) {
      setSmsTestResult({
        success: false,
        message: err.message || 'Hitilafu ya kutuma SMS ya jaribio.',
      });
    } finally {
      setTestingSms(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col justify-center items-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b62b6]" />
        <span className="text-xs font-semibold">
          {lang === 'sw' ? 'Inapakia Mipangilio ya Mawasiliano...' : 'Loading Gateway Settings...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <Mail className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {lang === 'sw' ? 'Email & SMS Merchant Gateways (Real Dispatch)' : 'Email & SMS Gateways'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              ✓ 100% Real Live Dispatch
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            {lang === 'sw'
              ? 'Tuma barua pepe halisi na ujumbe mfupi wa simu (SMS) nchini Tanzania kupitia Resend, SendGrid, Mailgun, Beem Africa au NextSMS kwa ajili ya msimbo wa OTP na taarifa za mfumo.'
              : 'Dispatch real emails and Tanzania SMS via Resend, SendGrid, Mailgun, Beem Africa, and NextSMS for 6-digit registration OTP verification.'}
          </p>
        </div>

        {/* Sub-Tabs Switcher */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200 self-start md:self-center">
          <button
            type="button"
            onClick={() => setActiveSubTab('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'email'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4 text-indigo-600" />
            <span>Email Gateway</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('sms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'sms'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>SMS Gateway (Tanzania)</span>
          </button>
        </div>
      </div>

      {/* Global OTP Policy Bar (Vendor Only) */}
      {isVendor && (
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <ShieldCheck className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wide">
                {lang === 'sw' ? 'Sera ya Uthibitisho wa OTP (Registration OTP)' : 'Registration OTP Verification'}
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  requireRegistrationOtp ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'
                }`}
              >
                {requireRegistrationOtp ? 'IMEWASHWA (LIVE ON)' : 'IMEZIMWA (BYPASS)'}
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              {requireRegistrationOtp
                ? lang === 'sw'
                  ? 'Kila mteja mpya anayejisajili atatumiwa msimbo wa tarakimu 6 (OTP) kwenye Barua Pepe / SMS kabla ya kufunguliwa akaunti.'
                  : 'New clients will receive a 6-digit OTP code to verify their identity.'
                : lang === 'sw'
                ? 'Usajili wa haraka umewashwa! Akaunti zinafunguliwa papo hapo bila kusubiri OTP.'
                : 'Instant 1-click registration without waiting for OTP code.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRequireRegistrationOtp(!requireRegistrationOtp)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer border shrink-0 ${
            requireRegistrationOtp
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-400/40'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400'
          }`}
        >
          {requireRegistrationOtp
            ? lang === 'sw'
              ? 'Zima OTP (Instant Bypass)'
              : 'Disable OTP (Instant)'
            : lang === 'sw'
            ? 'Washa OTP (Enable Security)'
            : 'Enable OTP (Secure)'}
        </button>
      </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>✓ Mipangilio yote ya Gateway imehifadhiwa kikamilifu kwenye seva!</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 1: EMAIL GATEWAY (100% REAL DISPATCH)             */}
      {/* ======================================================== */}
      {activeSubTab === 'email' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Provider Selection */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-600" />
              <span>Chagua Mtoa Huduma wa Barua Pepe (Email Provider)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Resend */}
              <button
                type="button"
                onClick={() => setEmailConfig({ ...emailConfig, provider: 'RESEND' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  emailConfig.provider === 'RESEND'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Resend API</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">
                    Inapendekezwa
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  api.resend.com — Ufanisi wa haraka zaidi, haina ucheleweshaji wa OTP.
                </p>
              </button>

              {/* 2. SendGrid */}
              <button
                type="button"
                onClick={() => setEmailConfig({ ...emailConfig, provider: 'SENDGRID' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  emailConfig.provider === 'SENDGRID'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Twilio SendGrid</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                    Enterprise
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  SendGrid v3 API rasmi kwa ajili ya mamilioni ya barua pepe na OTP.
                </p>
              </button>

              {/* 3. Mailgun */}
              <button
                type="button"
                onClick={() => setEmailConfig({ ...emailConfig, provider: 'MAILGUN' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  emailConfig.provider === 'MAILGUN'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Mailgun API</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                    Reliable
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Mailgun REST API yenye uthibitisho wa DKIM, SPF na DMARC.
                </p>
              </button>

              {/* 4. EmailJS */}
              <button
                type="button"
                onClick={() => setEmailConfig({ ...emailConfig, provider: 'EMAILJS' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  emailConfig.provider === 'EMAILJS'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-2 ring-indigo-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">EmailJS REST</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                    Custom
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Inaunganishwa moja kwa moja na Gmail au Outlook kupitia templates za EmailJS.
                </p>
              </button>
            </div>
          </div>

          {/* Sender Identity & Credentials */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Taarifa za Kutuma na API Keys za {emailConfig.provider}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jina la Mtumaji (From Name)
                </label>
                <input
                  type="text"
                  value={emailConfig.fromName}
                  onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                  placeholder="INFOTECH WiFi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Barua Pepe ya Mtumaji (From Email)
                </label>
                <input
                  type="email"
                  value={emailConfig.fromEmail}
                  onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                  placeholder="noreply@domain-yako.co.tz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  required
                />
              </div>
            </div>

            {/* Provider-Specific Keys */}
            {emailConfig.provider === 'RESEND' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Resend API Key</label>
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Pata Resend API Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showResendKey ? 'text' : 'password'}
                    value={emailConfig.resendApiKey || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, resendApiKey: e.target.value })}
                    placeholder="re_123456789abcdef..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {emailConfig.provider === 'SENDGRID' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">SendGrid API Key</label>
                  <a
                    href="https://app.sendgrid.com/settings/api_keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Pata SendGrid Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showSendGridKey ? 'text' : 'password'}
                    value={emailConfig.sendgridApiKey || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, sendgridApiKey: e.target.value })}
                    placeholder="SG.xxxxxxxx..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSendGridKey(!showSendGridKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showSendGridKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {emailConfig.provider === 'MAILGUN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mailgun Domain Name
                  </label>
                  <input
                    type="text"
                    value={emailConfig.mailgunDomain || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, mailgunDomain: e.target.value })}
                    placeholder="mg.domain-yako.co.tz"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Mailgun Private API Key</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showMailgunKey ? 'text' : 'password'}
                      value={emailConfig.mailgunApiKey || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, mailgunApiKey: e.target.value })}
                      placeholder="key-xxxxxxxx..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMailgunKey(!showMailgunKey)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showMailgunKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {emailConfig.provider === 'EMAILJS' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Service ID</label>
                  <input
                    type="text"
                    value={emailConfig.emailjsServiceId || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, emailjsServiceId: e.target.value })}
                    placeholder="service_xxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Template ID</label>
                  <input
                    type="text"
                    value={emailConfig.emailjsTemplateId || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, emailjsTemplateId: e.target.value })}
                    placeholder="template_xxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Public Key</label>
                  <input
                    type="text"
                    value={emailConfig.emailjsPublicKey || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, emailjsPublicKey: e.target.value })}
                    placeholder="user_xxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Hifadhi Mipangilio ya Email</span>
              </button>
            </div>
          </div>

          {/* Test Real Email Dispatch */}
          <div className="bg-slate-50/80 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-black text-slate-900">
                Pima Utumaji wa Barua Pepe Halisi (Live Real Dispatch Test)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Ingiza barua pepe yako halisi hapa chini ili seva yetu itume barua pepe yenye msimbo wa OTP papo hapo kupitia API ya {emailConfig.provider}.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Weka barua pepe yako (mfano: juma@gmail.com)"
                className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={testingEmail || !testEmail.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {testingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                ) : (
                  <Send className="w-4 h-4 text-indigo-300" />
                )}
                <span>Tuma Barua Pepe Halisi</span>
              </button>
            </div>

            {emailTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-medium space-y-1 ${
                  emailTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {emailTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{emailTestResult.message}</span>
                </div>
                {emailTestResult.otp && (
                  <div className="text-[11px] text-slate-600 pl-6">
                    Msimbo wa jaribio uliotumwa: <strong className="font-mono text-indigo-700">{emailTestResult.otp}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: SMS GATEWAY (TANZANIA BEEM, NEXTSMS, TWILIO)    */}
      {/* ======================================================== */}
      {activeSubTab === 'sms' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* SMS Provider Selection */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Chagua Mtoa Huduma wa SMS (SMS Gateway Provider)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Beem Africa */}
              <button
                type="button"
                onClick={() => setSmsConfig({ ...smsConfig, provider: 'BEEM' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  smsConfig.provider === 'BEEM'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Beem Africa</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    Tanzania #1
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  api.beem.africa — Inatuma moja kwa moja Vodacom, Tigo, Airtel & Halotel.
                </p>
              </button>

              {/* 2. NextSMS */}
              <button
                type="button"
                onClick={() => setSmsConfig({ ...smsConfig, provider: 'NEXTSMS' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  smsConfig.provider === 'NEXTSMS'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">NextSMS</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                    Local TZ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  messaging-service.co.tz — Mtoa huduma wa ndani ya Tanzania mwenye usajili wa TCRA.
                </p>
              </button>

              {/* 3. Twilio SMS */}
              <button
                type="button"
                onClick={() => setSmsConfig({ ...smsConfig, provider: 'TWILIO' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  smsConfig.provider === 'TWILIO'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Twilio SMS</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                    Global
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Twilio REST API — Tuma SMS kimataifa na Tanzania kupitia namba ya Twilio.
                </p>
              </button>

              {/* 4. Custom HTTP Webhook */}
              <button
                type="button"
                onClick={() => setSmsConfig({ ...smsConfig, provider: 'CUSTOM_HTTP' })}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                  smsConfig.provider === 'CUSTOM_HTTP'
                    ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Custom Gateway</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                    HTTP/JSON
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Unganisha SMS Modem, Rasberry Pi au API ya kampuni yako kwa HTTP POST.
                </p>
              </button>
            </div>
          </div>

          {/* SMS Sender ID & Credentials */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              <span>Taarifa za Usajili na API Keys za {smsConfig.provider}</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jina la Mtumaji / Sender ID (Kama lilivyosajiliwa TCRA)
              </label>
              <input
                type="text"
                value={smsConfig.senderId}
                onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value })}
                placeholder="INFOTECH au WIFI-TZ"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Kulingana na taratibu za TCRA Tanzania, Sender ID isizidi herufi 11 bila alama maalum.
              </p>
            </div>

            {/* Beem Africa Configuration */}
            {smsConfig.provider === 'BEEM' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Beem Africa API Key</label>
                    <a
                      href="https://beem.africa"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Akaunti ya Beem</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="text"
                    value={smsConfig.beemApiKey || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, beemApiKey: e.target.value })}
                    placeholder="xxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">Beem Secret Key</label>
                  </div>
                  <div className="relative">
                    <input
                      type={showBeemSecret ? 'text' : 'password'}
                      value={smsConfig.beemSecretKey || ''}
                      onChange={(e) => setSmsConfig({ ...smsConfig, beemSecretKey: e.target.value })}
                      placeholder="xxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBeemSecret(!showBeemSecret)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showBeemSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NextSMS Configuration */}
            {smsConfig.provider === 'NEXTSMS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    NextSMS Username
                  </label>
                  <input
                    type="text"
                    value={smsConfig.nextsmsUsername || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, nextsmsUsername: e.target.value })}
                    placeholder="username_yako"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    NextSMS Password / Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showNextSmsPass ? 'text' : 'password'}
                      value={smsConfig.nextsmsPassword || ''}
                      onChange={(e) => setSmsConfig({ ...smsConfig, nextsmsPassword: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNextSmsPass(!showNextSmsPass)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNextSmsPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Twilio SMS Configuration */}
            {smsConfig.provider === 'TWILIO' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Account SID</label>
                  <input
                    type="text"
                    value={smsConfig.twilioAccountSid || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, twilioAccountSid: e.target.value })}
                    placeholder="ACxxxxxxxx..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Auth Token</label>
                  <div className="relative">
                    <input
                      type={showTwilioToken ? 'text' : 'password'}
                      value={smsConfig.twilioAuthToken || ''}
                      onChange={(e) => setSmsConfig({ ...smsConfig, twilioAuthToken: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTwilioToken(!showTwilioToken)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showTwilioToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">From Number</label>
                  <input
                    type="text"
                    value={smsConfig.twilioFromNumber || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, twilioFromNumber: e.target.value })}
                    placeholder="+1234567890"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            )}

            {/* Custom Webhook Configuration */}
            {smsConfig.provider === 'CUSTOM_HTTP' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    HTTP POST Webhook Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={smsConfig.customWebhookUrl || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, customWebhookUrl: e.target.value })}
                    placeholder="https://api.sms-yako.tz/v1/send"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    API Authorization Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={smsConfig.customApiKey || ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, customApiKey: e.target.value })}
                    placeholder="Bearer token au secret"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Hifadhi Mipangilio ya SMS</span>
              </button>
            </div>
          </div>

          {/* Test Real SMS Dispatch */}
          <div className="bg-slate-50/80 rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-black text-slate-900">
                Pima Utumaji wa SMS Halisi ya Majaribio (Live SMS Test)
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Weka namba ya simu ya Tanzania (Vodacom, Tigo, Airtel, au Halotel) ili seva itume ujumbe wa SMS moja kwa moja kupitia {smsConfig.provider}.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="0754111222 au 255712345678"
                className="w-full sm:flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={testingSms || !testPhone.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {testingSms ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                ) : (
                  <Send className="w-4 h-4 text-emerald-300" />
                )}
                <span>Tuma SMS Halisi ya Majaribio</span>
              </button>
            </div>

            {smsTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs font-medium space-y-1 ${
                  smsTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {smsTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{smsTestResult.message}</span>
                </div>
                {smsTestResult.otp && (
                  <div className="text-[11px] text-slate-600 pl-6">
                    Msimbo wa SMS uliozalishwa: <strong className="font-mono text-emerald-700">{smsTestResult.otp}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
