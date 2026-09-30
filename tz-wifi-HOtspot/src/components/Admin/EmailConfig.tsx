import React, { useState, useEffect } from 'react';
import {
  Mail,
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
} from 'lucide-react';
import { GatewaySettings, EmailGatewayConfig, EmailMerchantProvider } from '../../types/index.ts';

interface EmailConfigProps {
  lang?: 'sw' | 'en';
}

const DEFAULT_EMAIL_CONFIG: EmailGatewayConfig = {
  provider: 'RESEND',
  fromEmail: 'noreply@tzwifi.co.tz',
  fromName: 'INFOTECH WiFi',
  resendApiKey: '',
  sendgridApiKey: '',
  mailgunApiKey: '',
  mailgunDomain: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpSecure: false,
  enabled: true,
};

export const EmailConfig: React.FC<EmailConfigProps> = ({ lang = 'sw' }) => {
  const [settings, setSettings] = useState<GatewaySettings | null>(null);
  const [emailConfig, setEmailConfig] = useState<EmailGatewayConfig>(DEFAULT_EMAIL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Password / Key Visibility toggles
  const [showEmailJsKey, setShowEmailJsKey] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);
  const [showSendGridKey, setShowSendGridKey] = useState(false);
  const [showMailgunKey, setShowMailgunKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  // Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    simulated?: boolean;
    provider?: string;
    debugOtp?: string;
  } | null>(null);

  const [requireRegistrationOtp, setRequireRegistrationOtp] = useState(true);

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
      const updatedSettings: GatewaySettings = {
        ...settings,
        emailGateway: emailConfig,
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

      const savedData = await res.json();
      setSettings(savedData.settings || updatedSettings);
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

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/v1/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Hitilafu ya kutuma barua pepe ya jaribio.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex flex-col justify-center items-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b62b6]" />
        <span className="text-xs font-semibold">
          {lang === 'sw' ? 'Inapakia mipangilio ya barua pepe...' : 'Loading email settings...'}
        </span>
      </div>
    );
  }

  const isLiveConfigured =
    emailConfig.enabled &&
    ((emailConfig.provider === 'RESEND' && Boolean(emailConfig.resendApiKey?.trim())) ||
      (emailConfig.provider === 'SENDGRID' && Boolean(emailConfig.sendgridApiKey?.trim())) ||
      (emailConfig.provider === 'MAILGUN' && Boolean(emailConfig.mailgunApiKey?.trim())) ||
      (emailConfig.provider === 'SMTP' && Boolean(emailConfig.smtpHost && emailConfig.smtpUser)));

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#041528] to-[#07314a] p-6 rounded-3xl text-white border border-white/10 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#f8a30a]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[#f8a30a] text-xs font-bold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Vendor HQ Email APIs</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black font-['Sora',sans-serif]">
              {lang === 'sw'
                ? 'API za Barua Pepe (Email Merchant Gateway)'
                : 'Email Merchant Gateway & OTP APIs'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              {lang === 'sw'
                ? 'Weka API za watoa huduma wa barua pepe (Resend, SendGrid, Mailgun au SMTP). Kila mtumiaji mpya anayejisajili atapokea msimbo wa siri wa tarakimu 6 (OTP) kwenye barua pepe yake ili kuthibitisha akaunti yake.'
                : 'Configure transactional email providers (Resend, SendGrid, Mailgun, or SMTP). Every new registering hotspot owner receives a 6-digit verification OTP on their email before their account is activated.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                isLiveConfigured
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-[#f8a30a]/20 text-[#f8a30a] border-[#f8a30a]/40'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-[#f8a30a]'
                }`}
              />
              <span>{isLiveConfigured ? 'Live Provider Active' : 'Simulation / Dev Mode'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Save Success / Error Alerts */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            {lang === 'sw'
              ? 'Mipangilio ya API za barua pepe imehifadhiwa kikamilifu kwenye database!'
              : 'Email API credentials saved successfully to persistent database!'}
          </span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Step 1: Choose Email Merchant Provider */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Sliders className="w-4 h-4 text-[#1b62b6]" />
              <span>
                {lang === 'sw'
                  ? '1. Chagua Mtoa Huduma wa Barua Pepe (Email Provider)'
                  : '1. Select Email Merchant Provider'}
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={emailConfig.enabled}
                onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                className="rounded text-[#1b62b6] focus:ring-[#1b62b6]"
              />
              <span>{lang === 'sw' ? 'Washa Utumaji wa Barua Pepe' : 'Enable Email Gateway'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* Provider 0: EmailJS */}
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider: 'EMAILJS' })}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                emailConfig.provider === 'EMAILJS'
                  ? 'border-[#1b62b6] bg-blue-50/50 text-[#005ea9] ring-2 ring-[#1b62b6]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>EmailJS</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f8a30a]/20 text-[#a36803]">
                  Rahisi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Gmail & Outlook moja kwa moja bila kusanidi seva ya SMTP.
              </p>
            </button>

            {/* Provider 1: Resend */}
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider: 'RESEND' })}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                emailConfig.provider === 'RESEND'
                  ? 'border-[#1b62b6] bg-blue-50/50 text-[#005ea9] ring-2 ring-[#1b62b6]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Resend</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                  Cloud API
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Rahisi zaidi, API ya haraka na uwezo mkubwa wa kufika inbox.
              </p>
            </button>

            {/* Provider 2: SendGrid */}
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider: 'SENDGRID' })}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                emailConfig.provider === 'SENDGRID'
                  ? 'border-[#1b62b6] bg-blue-50/50 text-[#005ea9] ring-2 ring-[#1b62b6]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <span className="font-bold text-sm block">SendGrid</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Twilio SendGrid transactional email API.
              </p>
            </button>

            {/* Provider 3: Mailgun */}
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider: 'MAILGUN' })}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                emailConfig.provider === 'MAILGUN'
                  ? 'border-[#1b62b6] bg-blue-50/50 text-[#005ea9] ring-2 ring-[#1b62b6]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <span className="font-bold text-sm block">Mailgun</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Sinch Mailgun domain API na ufuatiliaji wa taarifa.
              </p>
            </button>

            {/* Provider 4: Custom SMTP */}
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider: 'SMTP' })}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                emailConfig.provider === 'SMTP'
                  ? 'border-[#1b62b6] bg-blue-50/50 text-[#005ea9] ring-2 ring-[#1b62b6]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <span className="font-bold text-sm block">Custom SMTP</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Seva ya kawaida ya SMTP (Gmail, CPanel, au Seva yako).
              </p>
            </button>

            {/* Provider 5: Simulation */}
            <button
              type="button"
              onClick={() => setEmailConfig({ ...emailConfig, provider: 'SIMULATION' })}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer relative ${
                emailConfig.provider === 'SIMULATION'
                  ? 'border-[#f8a30a] bg-amber-50/60 text-[#a36803] ring-2 ring-[#f8a30a]/30'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <span className="font-bold text-sm block">Simulation / Dev</span>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Majaribio bila API Key (Msimbo wa OTP unatokea kwenye skrini).
              </p>
            </button>
          </div>
        </div>

        {/* Step 2: Sender Identity (From Name & Email) */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
            <Mail className="w-4 h-4 text-[#1b62b6]" />
            <span>
              {lang === 'sw'
                ? '2. Taarifa za Mtumaji (Sender Profile)'
                : '2. Sender Identity (From Name & Email)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                {lang === 'sw' ? 'Jina la Mtumaji (From Name)' : 'From Name'}
              </label>
              <input
                type="text"
                value={emailConfig.fromName}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                placeholder="INFOTECH WiFi"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm font-medium outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                Jina litakaloonekana kwenye inbox ya mtumiaji kama mtumaji wa barua pepe.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                {lang === 'sw' ? 'Barua Pepe ya Mtumaji (From Email)' : 'From Email Address'}
              </label>
              <input
                type="email"
                value={emailConfig.fromEmail}
                onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                placeholder="billing@infotechwifi.co.tz au onboarding@resend.dev"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm font-medium outline-none"
              />
              <span className="text-[10px] text-slate-400 block">
                Kwa Resend/SendGrid, hakikisha barua pepe hii imethibitishwa (Verified Domain au Verified Sender).
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Provider-Specific API Credentials */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Key className="w-4 h-4 text-[#1b62b6]" />
              <span>
                {lang === 'sw'
                  ? `3. Funguo za API (${emailConfig.provider})`
                  : `3. API Credentials (${emailConfig.provider})`}
              </span>
            </div>
            {emailConfig.provider === 'EMAILJS' && (
              <a
                href="https://dashboard.emailjs.com/admin/account"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#1b62b6] hover:underline flex items-center gap-1"
              >
                <span>Fungua EmailJS Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {emailConfig.provider === 'RESEND' && (
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#1b62b6] hover:underline flex items-center gap-1"
              >
                <span>Pata Resend API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {emailConfig.provider === 'SENDGRID' && (
              <a
                href="https://app.sendgrid.com/settings/api_keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#1b62b6] hover:underline flex items-center gap-1"
              >
                <span>Pata SendGrid API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {emailConfig.provider === 'MAILGUN' && (
              <a
                href="https://app.mailgun.com/settings/api_security/api_keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#1b62b6] hover:underline flex items-center gap-1"
              >
                <span>Pata Mailgun API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Conditional provider fields */}
          {emailConfig.provider === 'EMAILJS' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-slate-900 block">
                    ⚡ EmailJS: Utumaji wa Barua Pepe Kupitia Akaunti Yako (Gmail, Outlook au SMTP binafsi)
                  </span>
                  <span className="text-[11px] text-slate-600 leading-relaxed block">
                    Kwenye akaunti yako ya EmailJS (<a href="https://dashboard.emailjs.com" target="_blank" rel="noreferrer" className="underline font-bold text-amber-800">emailjs.com</a>):
                    1) Unganisha <strong>Email Service</strong> (Gmail/Outlook), 2) Unda <strong>Email Template</strong> yenye vigezo vya <code>{"{{to_name}}"}</code>, <code>{"{{to_email}}"}</code> na <code>{"{{otp}}"}</code>, 3) Weka <strong>Service ID</strong>, <strong>Template ID</strong> na <strong>Public Key</strong> hapa chini:
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    EmailJS Service ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailConfig.emailjsServiceId || ''}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, emailjsServiceId: e.target.value })
                    }
                    placeholder="service_xxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Inapatikana kwenye Email Services tab.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    EmailJS Template ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={emailConfig.emailjsTemplateId || ''}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, emailjsTemplateId: e.target.value })
                    }
                    placeholder="template_xxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Inapatikana kwenye Email Templates tab.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    EmailJS Public Key (User ID) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showEmailJsKey ? 'text' : 'password'}
                      value={emailConfig.emailjsPublicKey || ''}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, emailjsPublicKey: e.target.value })
                      }
                      placeholder="pk_xxxxxxx au User ID"
                      className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailJsKey(!showEmailJsKey)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showEmailJsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Kwenye Account Settings &rarr; API Keys.</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    EmailJS Private Key / Access Token (Hiari)
                  </label>
                  <input
                    type="password"
                    value={emailConfig.emailjsPrivateKey || ''}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, emailjsPrivateKey: e.target.value })
                    }
                    placeholder="Inatumika kama umewasha Strict Origin"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block">Hiari: Inahitajika tu kama umewasha API Secret Key.</span>
                </div>
              </div>
            </div>
          )}

          {emailConfig.provider === 'RESEND' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#1b62b6] shrink-0 mt-0.5" />
                <span>
                  Resend ni huduma ya kisasa na ya haraka sana. Ili kuanza kutuma bure, unaweza kutumia API Key
                  ya Resend na barua pepe ya majaribio kama vile <code>onboarding@resend.dev</code> au domain yako mwenyewe.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Resend API Key (re_...)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type={showResendKey ? 'text' : 'password'}
                    value={emailConfig.resendApiKey || ''}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, resendApiKey: e.target.value })
                    }
                    placeholder="re_123456789_abcdefghijklmnopqrstuvwxyz"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {emailConfig.provider === 'SENDGRID' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  SendGrid API Key (SG....)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type={showSendGridKey ? 'text' : 'password'}
                    value={emailConfig.sendgridApiKey || ''}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, sendgridApiKey: e.target.value })
                    }
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSendGridKey(!showSendGridKey)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSendGridKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {emailConfig.provider === 'MAILGUN' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Mailgun Domain
                  </label>
                  <input
                    type="text"
                    value={emailConfig.mailgunDomain || ''}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, mailgunDomain: e.target.value })
                    }
                    placeholder="mg.yourdomain.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Mailgun Private API Key (key-...)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showMailgunKey ? 'text' : 'password'}
                      value={emailConfig.mailgunApiKey || ''}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, mailgunApiKey: e.target.value })
                      }
                      placeholder="key-xxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 font-mono text-xs sm:text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMailgunKey(!showMailgunKey)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showMailgunKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {emailConfig.provider === 'SMTP' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">SMTP Host</label>
                  <input
                    type="text"
                    value={emailConfig.smtpHost || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com au mail.yourserver.tz"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">SMTP Port</label>
                  <input
                    type="number"
                    value={emailConfig.smtpPort || 587}
                    onChange={(e) =>
                      setEmailConfig({ ...emailConfig, smtpPort: Number(e.target.value) })
                    }
                    placeholder="587 au 465"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Usalama (SSL/TLS)</label>
                  <div className="pt-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(emailConfig.smtpSecure)}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, smtpSecure: e.target.checked })
                        }
                        className="rounded text-[#1b62b6] focus:ring-[#1b62b6]"
                      />
                      <span>Tumia SSL/TLS (Port 465)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">SMTP Username</label>
                  <input
                    type="text"
                    value={emailConfig.smtpUser || ''}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                    placeholder="info@yourdomain.co.tz"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">SMTP Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showSmtpPass ? 'text' : 'password'}
                      value={emailConfig.smtpPass || ''}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {emailConfig.provider === 'SIMULATION' && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
              <strong className="block font-bold">Hali ya Majaribio (Simulation Mode):</strong>
              <p>
                Katika hali hii, mfumo unazalisha msimbo halisi wa OTP wa tarakimu 6 na kuurekodi kwenye logi za seva
                bila kutuma kwenda kwenye API ya nje. Ni bora kwa ajili ya kufanya majaribio ya haraka bila kutumia
                mikopo au kuweka API Key.
              </p>
            </div>
          )}
        </div>

        {/* Step 4: Registration OTP Verification Policy Toggle */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <ShieldCheck className="w-4 h-4 text-[#1b62b6]" />
              <span>
                {lang === 'sw'
                  ? '4. Sera ya Uthibitisho wa OTP (Registration OTP Policy)'
                  : '4. Registration OTP Verification Policy'}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                requireRegistrationOtp
                  ? 'bg-blue-100 text-[#005ea9] border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {requireRegistrationOtp
                ? lang === 'sw'
                  ? '🟢 OTP Imewashwa (ON)'
                  : '🟢 OTP Enabled (ON)'
                : lang === 'sw'
                ? '⚡ OTP Imezimwa (Bypass OFF)'
                : '⚡ OTP Disabled (OFF)'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-900">
                {lang === 'sw'
                  ? 'Washa / Zima Uthibitisho wa OTP Wakati wa Kujisajili'
                  : 'Enable / Disable Email OTP Verification During Registration'}
              </div>
              <p className="text-xs text-slate-500 max-w-xl">
                {requireRegistrationOtp
                  ? (lang === 'sw'
                      ? 'Kila mteja / mmiliki mpya anayejisajili atatumiwa msimbo wa tarakimu 6 (OTP) kwenye barua pepe yake ili kuthibitisha utambulisho kabla ya kufunguliwa akaunti.'
                      : 'Every newly registering hotspot owner receives a 6-digit OTP code to verify their identity before account creation.')
                  : (lang === 'sw'
                      ? 'Watumiaji wapya watafungua akaunti papo hapo bila kuhitaji kuthibitisha barua pepe kwa OTP (Usajili wa Haraka / Instant 1-Click Activation).'
                      : 'New users will create accounts instantly without waiting for OTP verification.')}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={requireRegistrationOtp}
                onChange={(e) => setRequireRegistrationOtp(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b62b6]" />
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              saveSuccess
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-gradient-to-r from-[#1b62b6] to-[#005ea9] hover:brightness-110 active:scale-98 text-white shadow-blue-600/30'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'sw' ? 'Inahifadhi...' : 'Saving...'}</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>
                  {lang === 'sw'
                    ? '✓ Saved! (Mipangilio Imehifadhiwa & Updated)'
                    : '✓ Saved! (Email Settings Updated)'}
                </span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>
                  {lang === 'sw'
                    ? 'Hifadhi Mipangilio ya Barua Pepe (Save Settings)'
                    : 'Save Email Gateway Settings'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Step 4: Live Test Email Tool */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
          <Send className="w-4 h-4 text-emerald-600" />
          <span>
            {lang === 'sw'
              ? '4. Kijaribu Barua Pepe cha Moja kwa Moja (Live Email Tester)'
              : '4. Live Email Dispatch Tester'}
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Weka barua pepe yako halisi hapa chini na ubonyeze kitufe ili kuthibitisha kuwa mtoa huduma uliyemweka
          anatuma nambari ya OTP na kufika kwenye inbox.
        </p>

        <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Weka barua pepe yako (k.m. juma@gmail.com)"
            required
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:border-[#1b62b6] focus:ring-2 focus:ring-[#1b62b6]/20 text-xs sm:text-sm outline-none"
          />
          <button
            type="submit"
            disabled={testing || !testEmail.trim()}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#f8a30a]" />
                <span>Inatuma jaribio...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-[#f8a30a]" />
                <span>Tuma Barua Pepe ya Jaribio</span>
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div
            className={`p-4 rounded-2xl text-xs border font-medium space-y-1.5 animate-in fade-in ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.debugOtp && (
              <div className="pt-1 text-[11px] font-mono text-slate-700">
                Msimbo wa Jaribio (Test OTP):{' '}
                <strong className="text-slate-950 px-2 py-0.5 bg-white rounded border">
                  {testResult.debugOtp}
                </strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
