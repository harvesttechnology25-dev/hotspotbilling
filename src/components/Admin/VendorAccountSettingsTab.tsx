import React, { useState, useEffect } from 'react';
import {
  User,
  Key,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { HotspotOwner } from '../../types/index.ts';

interface VendorAccountSettingsTabProps {
  currentUser: HotspotOwner | null;
  onOwnerUpdated?: (updatedOwner: HotspotOwner) => void;
  lang?: 'sw' | 'en';
}

export const VendorAccountSettingsTab: React.FC<VendorAccountSettingsTabProps> = ({
  currentUser,
  onOwnerUpdated,
  lang = 'sw',
}) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || (currentUser.role === 'VENDOR_ADMIN' ? 'admin' : ''));
      setName(currentUser.name || '');
      setBusinessName(currentUser.business_name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [currentUser]);

  if (!currentUser) return null;

  const isVendor = currentUser.role === 'VENDOR_ADMIN';

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setConfirmPassword(pass);
    setShowNewPassword(true);
  };

  const handleCopyCredentials = () => {
    const credText = `*TZ-WiFi Hotspot Credentials*\nUsername: ${username || 'admin'}\nSimu: ${phone}\nNenosiri: ${newPassword || '(Haijabadilishwa)'}\nRole: ${currentUser.role}\nLink: ${window.location.origin}`;
    navigator.clipboard?.writeText(credText);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg(lang === 'sw' ? 'Jina kamili linahitajika.' : 'Full name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg(lang === 'sw' ? 'Nambari ya simu inahitajika.' : 'Phone number is required.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setErrorMsg(
          lang === 'sw'
            ? 'Nenosiri jipya lazima liwe na angalau tarakimu 4.'
            : 'New password must be at least 4 characters.'
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg(
          lang === 'sw'
            ? 'Nenosiri jipya na uthibitisho haviendani.'
            : 'New password and confirmation do not match.'
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        username: username.trim() || undefined,
        business_name: businessName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      if (newPassword) {
        payload.newPassword = newPassword.trim();
        if (currentPassword) {
          payload.currentPassword = currentPassword.trim();
        }
      }

      const res = await fetch(`/api/v1/owners/${currentUser.id}/account`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('tzwifi_token') || ''}`,
          'x-owner-id': String(currentUser.id),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindwa kusasisha akaunti.');
      }

      const updatedUser: HotspotOwner = data.user || data.owner;

      try {
        const stored = localStorage.getItem('tzwifi_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.id === updatedUser.id) {
            localStorage.setItem('tzwifi_user', JSON.stringify({ ...parsed, ...updatedUser }));
          }
        }
      } catch (e) {
        console.error(e);
      }

      onOwnerUpdated?.(updatedUser);
      setSuccessMsg(
        lang === 'sw'
          ? 'Hongera! Taarifa za akaunti na nenosiri zimesasishwa kikamilifu!'
          : 'Account profile and password updated successfully!'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Hitilafu ya mtandao.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isVendor ? 'VENDOR HQ MASTER PROFILE' : 'ACCOUNT PROFILE'}</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900">
            {lang === 'sw' ? 'Akaunti ya Msimamizi (Username & Nenosiri)' : 'Account Profile & Credentials'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'sw'
              ? 'Badilisha jina la mtumiaji (username), nenosiri lako na taarifa za msingi za akaunti.'
              : 'Modify your login username, security credentials and account contacts.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyCredentials}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            {copiedCreds ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCreds ? 'Zimenakiliwa!' : 'Nakili Taarifa'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Profile Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Username */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Jina la Mtumiaji (Login Username)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Inatumika kuingilia mfumo badala ya simu au email
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isVendor ? 'admin' : 'username'}
                className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white text-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                @{username || 'admin'}
              </span>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Jina Kamili <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kelvin Mrema"
              className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Business / Company Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Jina la Kampuni / Biashara</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="TZ-WiFi Cloud HQ"
              className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Nambari ya Simu <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0754111222"
              className="w-full text-xs font-mono font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Barua Pepe (Email)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@tzwifi.co.tz"
              className="w-full text-xs font-semibold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Change Password Section */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-extrabold text-slate-900">
                Kubadilisha Nenosiri (Change Password)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleGenerateRandomPassword}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Zalisha Nenosiri Salama</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Acha wazi sehemu za nenosiri jipya kama hutaki kubadilisha nenosiri lako la sasa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Nenosiri Jipya
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Weka nenosiri jipya..."
                  className="w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {newPassword && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Thibitisha Nenosiri Jipya
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Rudia nenosiri jipya..."
                    className={`w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border rounded-xl focus:outline-none pr-9 ${
                      confirmPassword && confirmPassword !== newPassword
                        ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20'
                        : confirmPassword && confirmPassword === newPassword
                        ? 'border-emerald-300 focus:border-emerald-500 bg-emerald-50/20'
                        : 'border-slate-200 focus:border-indigo-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Inahifadhi...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Hifadhi Mabadiliko ya Akaunti</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
