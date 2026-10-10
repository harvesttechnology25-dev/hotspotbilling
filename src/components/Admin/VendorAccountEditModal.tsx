import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  Mail,
  Phone,
  Building,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { HotspotOwner } from '../../types/index.ts';

interface VendorAccountEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: HotspotOwner | null;
  onUpdated: (updatedUser: HotspotOwner) => void;
  lang?: 'sw' | 'en';
}

export const VendorAccountEditModal: React.FC<VendorAccountEditModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdated,
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
    if (currentUser && isOpen) {
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
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

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
    const credText = `*TZ-WiFi Hotspot Admin Credentials*\nUsername: ${username || 'admin'}\nSimu: ${phone}\nNenosiri: ${newPassword || '(Hakijabadilishwa)'}\nRole: ${currentUser.role}\nLink: ${window.location.origin}`;
    navigator.clipboard?.writeText(credText);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
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
        setErrorMsg(lang === 'sw' ? 'Nenosiri jipya lazima liwe na angalau tarakimu 4.' : 'New password must be at least 4 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg(lang === 'sw' ? 'Nenosiri jipya na uthibitisho haviendani.' : 'New password and confirmation do not match.');
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
        throw new Error(data.error || (lang === 'sw' ? 'Imeshindwa kusasisha taarifa.' : 'Failed to update account.'));
      }

      const updatedUser: HotspotOwner = data.user || data.owner;

      // Update localStorage session
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

      onUpdated(updatedUser);
      setSuccessMsg(
        lang === 'sw'
          ? 'Hongera! Taarifa za akaunti yako na nenosiri zimesasishwa kikamilifu!'
          : 'Account profile and credentials updated successfully!'
      );

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (lang === 'sw' ? 'Hitilafu ya mtandao.' : 'Network error.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              <span>{isVendor ? 'VENDOR HQ MASTER ACCOUNT' : 'HOTSPOT OWNER ACCOUNT'}</span>
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black tracking-tight">
            {lang === 'sw' ? 'Hariri Akaunti Yangu (Username & Nenosiri)' : 'Edit My Account (Username & Password)'}
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            {lang === 'sw'
              ? 'Badilisha jina la mtumiaji (username), nenosiri na mawasiliano ya akaunti yako ya kuingilia kwenye mfumo.'
              : 'Update your login username, credentials, full name and phone number.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Account Profile Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Username */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{lang === 'sw' ? 'Jina la Mtumiaji (Username ya Kuingilia)' : 'Login Username'}</span>
                </span>
                <span className="text-[10px] font-normal text-slate-400 font-mono">
                  {lang === 'sw' ? 'Kwa mfano: admin, kelvin_hq, msimamizi' : 'e.g. admin, kelvin_hq'}
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isVendor ? 'admin' : 'username'}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white font-mono text-slate-800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                  @{username || 'admin'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {lang === 'sw'
                  ? 'Unaweza kutumia username hii au namba ya simu/email kuingia kwenye mfumo.'
                  : 'You can log in using this username, or your registered phone number / email.'}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'sw' ? 'Jina Kamili' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Kelvin Mrema"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            {/* Business / Company Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'sw' ? 'Jina la Kampuni / Biashara' : 'Company / Business'}</span>
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="TZ-WiFi Cloud HQ"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'sw' ? 'Nambari ya Simu' : 'Phone Number'}</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0754111222"
                className="w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{lang === 'sw' ? 'Barua Pepe (Email)' : 'Email Address'}</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@tzwifi.co.tz"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Password Update Section */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-extrabold text-slate-900">
                  {lang === 'sw' ? 'Kubadilisha Nenosiri (Password)' : 'Change Password'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateRandomPassword}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>{lang === 'sw' ? 'Zalisha Nenosiri Salama' : 'Generate Strong Password'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              {lang === 'sw'
                ? 'Acha wazi sehemu hizi kama hutaki kubadilisha nenosiri lako la sasa.'
                : 'Leave blank if you do not wish to change your current password.'}
            </p>

            <div className="space-y-2.5">
              {/* New Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  {lang === 'sw' ? 'Nenosiri Jipya' : 'New Password'}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={lang === 'sw' ? 'Weka nenosiri jipya...' : 'Enter new password...'}
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

              {/* Confirm New Password */}
              {newPassword && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    {lang === 'sw' ? 'Thibitisha Nenosiri Jipya' : 'Confirm New Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={lang === 'sw' ? 'Rudia nenosiri jipya...' : 'Repeat new password...'}
                      className={`w-full text-xs font-mono font-semibold px-3 py-2.5 bg-slate-50 border rounded-xl focus:outline-none pr-9 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                          : confirmPassword && confirmPassword === newPassword
                          ? 'border-emerald-300 focus:border-emerald-500 bg-emerald-50/30'
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
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-[10px] text-rose-600 mt-1">
                      {lang === 'sw' ? 'Manenosiri haya mawili hayafanani.' : 'Passwords do not match.'}
                    </p>
                  )}
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 font-semibold">
                      <Check className="w-3 h-3" />
                      <span>{lang === 'sw' ? 'Nenosiri limethibitishwa kikamilifu!' : 'Passwords match!'}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Copy Credentials Button */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>
                {lang === 'sw' ? 'Hifadhi taarifa zako mahali salama kabla ya kusahau.' : 'Keep your updated credentials in a secure place.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold shadow-2xs transition cursor-pointer"
            >
              {copiedCreds ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCreds ? (lang === 'sw' ? 'Zimenakiliwa!' : 'Copied!') : (lang === 'sw' ? 'Nakili Taarifa' : 'Copy Creds')}</span>
            </button>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {lang === 'sw' ? 'Ghairi (Cancel)' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{lang === 'sw' ? 'Inahifadhi...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{lang === 'sw' ? 'Hifadhi Mabadiliko' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
