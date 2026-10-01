import React, { useState, useEffect } from 'react';
import {
  Building2,
  Info,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  Share2,
  CheckCircle2,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  ShieldCheck,
  Zap,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import {
  CompanyPublicInfo,
  CompanyServiceItem,
  DEFAULT_COMPANY_INFO,
} from '../../types/index.ts';

interface CompanyInfoSettingsProps {
  lang?: 'sw' | 'en';
  onPreviewAbout?: () => void;
  onPreviewContact?: () => void;
}

export const CompanyInfoSettings: React.FC<CompanyInfoSettingsProps> = ({
  lang = 'sw',
  onPreviewAbout,
  onPreviewContact,
}) => {
  const [formData, setFormData] = useState<CompanyPublicInfo>({ ...DEFAULT_COMPANY_INFO });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'about' | 'contacts' | 'services' | 'social'>('about');
  const [newLocation, setNewLocation] = useState('');

  // Fetch current company info
  const fetchInfo = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/v1/system/company-info');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          ...DEFAULT_COMPANY_INFO,
          ...data,
          services: data.services || DEFAULT_COMPANY_INFO.services,
          stats: { ...DEFAULT_COMPANY_INFO.stats, ...(data.stats || {}) },
          social_links: { ...DEFAULT_COMPANY_INFO.social_links, ...(data.social_links || {}) },
        });
      }
    } catch (err: any) {
      console.error('Failed to fetch company info:', err);
      setErrorMessage(lang === 'sw' ? 'Imeshindwa kupakia taarifa za mfumo.' : 'Failed to load company info.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/v1/system/company-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Save failed');
      }

      const data = await res.json();
      if (data.data) {
        setFormData(data.data);
      }
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 4000);
    } catch (err: any) {
      setErrorMessage(
        lang === 'sw'
          ? 'Hitilafu imetokea wakati wa kuhifadhi taarifa.'
          : 'Error occurred while saving settings.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Service helper methods
  const handleAddService = () => {
    const newService: CompanyServiceItem = {
      id: `srv_${Date.now()}`,
      title_sw: 'Huduma Mpya',
      title_en: 'New Service',
      description_sw: 'Maelezo ya huduma mpya...',
      description_en: 'Description of the new service...',
    };
    setFormData((prev) => ({
      ...prev,
      services: [...prev.services, newService],
    }));
  };

  const handleRemoveService = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
  };

  const handleServiceChange = (id: string, field: keyof CompanyServiceItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  // Location helpers
  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    if (formData.coverage_locations.includes(newLocation.trim())) return;
    setFormData((prev) => ({
      ...prev,
      coverage_locations: [...prev.coverage_locations, newLocation.trim()],
    }));
    setNewLocation('');
  };

  const handleRemoveLocation = (loc: string) => {
    setFormData((prev) => ({
      ...prev,
      coverage_locations: prev.coverage_locations.filter((l) => l !== loc),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700">
          {lang === 'sw' ? 'Inapakia taarifa za mfumo...' : 'Loading system info...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Vendor Master Control' : 'Vendor Master Control'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Sora',sans-serif]">
              {lang === 'sw' ? 'Taarifa za Mfumo (Kuhusu Sisi & Mawasiliano)' : 'System Public Info (About Us & Contacts)'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-['Manrope',sans-serif]">
              {lang === 'sw'
                ? 'Hapa ndipo unapoandika maelezo ya kampuni, namba za simu, WhatsApp, barua pepe, anwani ya ofisi na huduma zinazoonekana kwenye Header ya Homepage kwa wateja wote.'
                : 'Manage company description, phone contacts, WhatsApp, email, office address, and services displayed on the Homepage header for all visitors.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onPreviewAbout && (
              <button
                type="button"
                onClick={onPreviewAbout}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-white/20"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-300" />
                <span>{lang === 'sw' ? 'Ona Kuhusu Sisi' : 'Preview About'}</span>
              </button>
            )}

            {onPreviewContact && (
              <button
                type="button"
                onClick={onPreviewContact}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-white/20"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-300" />
                <span>{lang === 'sw' ? 'Ona Mawasiliano' : 'Preview Contacts'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : 'bg-[#f8a30a] hover:bg-[#e09105] text-slate-950 shadow-[#f8a30a]/20 active:scale-95'
              }`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{lang === 'sw' ? 'Inahifadhi...' : 'Saving...'}</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'sw' ? '✓ Imehifadhiwa Kikamilifu!' : '✓ Saved Successfully!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Hifadhi Mabadiliko' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            {lang === 'sw'
              ? 'Taarifa za Kuhusu Sisi na Mawasiliano zimehifadhiwa na zitasasishwa moja kwa moja kwenye homepage na header!'
              : 'About Us & Contact information saved successfully and updated live on the Homepage header!'}
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Subtabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('about')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'about'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Kuhusu Sisi (Bio, Dira, Dhamira)' : 'About Us (Bio, Vision, Mission)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('contacts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'contacts'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Namba za Simu & Anwani ya Ofisi' : 'Phone Numbers & Office Address'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('services')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'services'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Huduma Zetu (Services List)' : 'Our Services'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('social')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'social'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>{lang === 'sw' ? 'Mitandao ya Kijamii & Takwimu' : 'Social Links & Key Stats'}</span>
        </button>
      </div>

      {/* Main Settings Body */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: ABOUT US */}
        {activeSubTab === 'about' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'sw' ? 'Majina & Kaulimbiu (Identity & Tagline)' : 'Identity & Tagline'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Jina la Kampuni / Mfumo' : 'Company / Brand Name'}
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="e.g. INFOTECH WiFi Tanzania"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Kaulimbiu (Swahili Tagline)' : 'Tagline (Swahili)'}
                  </label>
                  <input
                    type="text"
                    value={formData.tagline_sw}
                    onChange={(e) => setFormData({ ...formData, tagline_sw: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="e.g. Mtandao wa Kisasa wa Hotspot..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Kaulimbiu ya Kiingereza (English Tagline)' : 'Tagline (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.tagline_en}
                    onChange={(e) => setFormData({ ...formData, tagline_en: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="e.g. Next-Gen Hotspot Billing Platform..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'sw' ? 'Maelezo Kamili ya Kuhusu Sisi (Detailed Bio)' : 'Detailed About Story'}</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Maelezo ya Kiswahili' : 'Swahili Description'}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.about_description_sw}
                    onChange={(e) => setFormData({ ...formData, about_description_sw: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-medium outline-none transition"
                    placeholder="Andika maelezo kamili ya jinsi INFOTECH WiFi inavyofanya kazi..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Maelezo ya Kiingereza' : 'English Description'}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.about_description_en}
                    onChange={(e) => setFormData({ ...formData, about_description_en: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-medium outline-none transition"
                    placeholder="Write full English description..."
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{lang === 'sw' ? 'Dhamira & Dira (Mission & Vision)' : 'Mission & Vision'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Dhamira Yetu (Mission - Swahili)' : 'Mission (Swahili)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.mission_sw}
                    onChange={(e) => setFormData({ ...formData, mission_sw: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Dhamira Yetu (Mission - English)' : 'Mission (English)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.mission_en}
                    onChange={(e) => setFormData({ ...formData, mission_en: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Dira Yetu (Vision - Swahili)' : 'Vision (Swahili)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.vision_sw}
                    onChange={(e) => setFormData({ ...formData, vision_sw: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Dira Yetu (Vision - English)' : 'Vision (English)'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData.vision_en}
                    onChange={(e) => setFormData({ ...formData, vision_en: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS & OFFICE */}
        {activeSubTab === 'contacts' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'sw' ? 'Namba za Simu & WhatsApp Hotline' : 'Phone Numbers & WhatsApp'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Nambari Kuu ya Simu' : 'Primary Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone_primary}
                    onChange={(e) => setFormData({ ...formData, contact_phone_primary: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="+255 754 000 111"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Nambari ya Simu ya Pili' : 'Secondary Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.contact_phone_secondary || ''}
                    onChange={(e) => setFormData({ ...formData, contact_phone_secondary: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="+255 784 999 222"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Namba ya WhatsApp' : 'WhatsApp Number'}
                  </label>
                  <input
                    type="text"
                    value={formData.contact_whatsapp}
                    onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="+255 754 000 111"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'sw' ? 'Barua Pepe (Email Addresses)' : 'Email Addresses'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Barua Pepe Kuu (General Inquiries)' : 'Primary Email'}
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email_primary}
                    onChange={(e) => setFormData({ ...formData, contact_email_primary: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="info@tzwifi.co.tz"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Barua Pepe ya Msaada wa Kiufundi (Support)' : 'Support Email'}
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email_support}
                    onChange={(e) => setFormData({ ...formData, contact_email_support: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-semibold outline-none transition"
                    placeholder="support@tzwifi.co.tz"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>{lang === 'sw' ? 'Mahali pa Ofisi & Saa za Kazi' : 'Office Location & Working Hours'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Anwani ya Ofisi (Kiswahili)' : 'Office Address (Swahili)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.office_address_sw}
                    onChange={(e) => setFormData({ ...formData, office_address_sw: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Anwani ya Ofisi (Kiingereza)' : 'Office Address (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.office_address_en}
                    onChange={(e) => setFormData({ ...formData, office_address_en: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Masaa ya Kazi (Kiswahili)' : 'Working Hours (Swahili)'}
                  </label>
                  <input
                    type="text"
                    value={formData.working_hours_sw}
                    onChange={(e) => setFormData({ ...formData, working_hours_sw: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Masaa ya Kazi (Kiingereza)' : 'Working Hours (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.working_hours_en}
                    onChange={(e) => setFormData({ ...formData, working_hours_en: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs font-medium outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES */}
        {activeSubTab === 'services' && (
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>{lang === 'sw' ? 'Orodha ya Huduma Zetu' : 'Services List'}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Huduma hizi zinaonekana kwenye dirisha la Kuhusu Sisi kwa wateja.'
                      : 'These services are listed on the About Us window for visitors.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddService}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-indigo-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'sw' ? 'Ongeza Huduma' : 'Add Service'}</span>
                </button>
              </div>

              <div className="space-y-4">
                {formData.services.map((srv, index) => (
                  <div
                    key={srv.id || index}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {srv.title_sw || srv.title_en || `Huduma ${index + 1}`}
                        </span>
                      </div>

                      {formData.services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveService(srv.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                          title="Ondoa huduma hii"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          {lang === 'sw' ? 'Kichwa cha Huduma (Kiswahili)' : 'Service Title (Swahili)'}
                        </label>
                        <input
                          type="text"
                          value={srv.title_sw}
                          onChange={(e) => handleServiceChange(srv.id, 'title_sw', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          {lang === 'sw' ? 'Kichwa cha Huduma (Kiingereza)' : 'Service Title (English)'}
                        </label>
                        <input
                          type="text"
                          value={srv.title_en}
                          onChange={(e) => handleServiceChange(srv.id, 'title_en', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          {lang === 'sw' ? 'Maelezo (Kiswahili)' : 'Description (Swahili)'}
                        </label>
                        <textarea
                          rows={2}
                          value={srv.description_sw}
                          onChange={(e) => handleServiceChange(srv.id, 'description_sw', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-normal outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          {lang === 'sw' ? 'Maelezo (Kiingereza)' : 'Description (English)'}
                        </label>
                        <textarea
                          rows={2}
                          value={srv.description_en}
                          onChange={(e) => handleServiceChange(srv.id, 'description_en', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-normal outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SOCIAL LINKS, LOCATIONS & STATS */}
        {activeSubTab === 'social' && (
          <div className="space-y-6">
            {/* Key Stats */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'sw' ? 'Takwimu Kuu za Mfumo (Key System Metrics)' : 'Key Metrics'}</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Hotspots Zinazofanya Kazi' : 'Active Hotspots'}
                  </label>
                  <input
                    type="text"
                    value={formData.stats.active_hotspots}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stats: { ...formData.stats, active_hotspots: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Watumiaji wa Kila Siku' : 'Daily Users'}
                  </label>
                  <input
                    type="text"
                    value={formData.stats.daily_users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stats: { ...formData.stats, daily_users: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Mikoa Inayohudumiwa' : 'Coverage Regions'}
                  </label>
                  <input
                    type="text"
                    value={formData.stats.coverage_regions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stats: { ...formData.stats, coverage_regions: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {lang === 'sw' ? 'Upatikanaji wa Mtandao (Uptime)' : 'Uptime %'}
                  </label>
                  <input
                    type="text"
                    value={formData.stats.uptime_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stats: { ...formData.stats, uptime_percentage: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Coverage Locations */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'sw' ? 'Mikoa na Maeneo ya Huduma' : 'Coverage Regions / Locations'}</span>
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                  placeholder={lang === 'sw' ? 'Weka jina la mkoa (mfano: Dodoma)' : 'Add region name...'}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
                >
                  {lang === 'sw' ? 'Ongeza' : 'Add'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {formData.coverage_locations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <span>{lang === 'sw' ? 'Mitandao ya Kijamii & Viungo (Social Links)' : 'Social Links'}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    WhatsApp Group / Direct Chat Link
                  </label>
                  <input
                    type="text"
                    value={formData.social_links.whatsapp_group || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_links: { ...formData.social_links, whatsapp_group: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-indigo-500"
                    placeholder="https://wa.me/255..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Instagram</label>
                  <input
                    type="text"
                    value={formData.social_links.instagram || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_links: { ...formData.social_links, instagram: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-indigo-500"
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Facebook</label>
                  <input
                    type="text"
                    value={formData.social_links.facebook || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_links: { ...formData.social_links, facebook: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-indigo-500"
                    placeholder="https://facebook.com/..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Telegram Support Channel</label>
                  <input
                    type="text"
                    value={formData.social_links.telegram || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_links: { ...formData.social_links, telegram: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold outline-none focus:border-indigo-500"
                    placeholder="https://t.me/..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Action Bar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            {lang === 'sw'
              ? 'Mabadiliko yote yatahifadhiwa na kuonekana papo hapo kwenye mfumo mzima.'
              : 'All changes are instantly persisted and updated live across the platform.'}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className={`px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-[#f8a30a] hover:bg-[#e09105] text-slate-950 shadow-[#f8a30a]/20 active:scale-95'
            }`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{lang === 'sw' ? 'Inahifadhi...' : 'Saving...'}</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'sw' ? '✓ Imehifadhiwa Kikamilifu!' : '✓ Saved Successfully!'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{lang === 'sw' ? 'Hifadhi Taarifa Zote' : 'Save All Information'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
