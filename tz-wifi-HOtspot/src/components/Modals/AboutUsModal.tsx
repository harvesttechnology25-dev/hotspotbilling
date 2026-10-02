import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Info,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Users,
  MapPin,
  CheckCircle2,
  Phone,
  ArrowRight,
  ChevronRight,
  Activity,
  Server,
} from 'lucide-react';
import { CompanyPublicInfo, DEFAULT_COMPANY_INFO } from '../../types/index.ts';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: () => void;
  onGetStarted?: () => void;
  lang?: 'sw' | 'en';
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({
  isOpen,
  onClose,
  onOpenContact,
  onGetStarted,
  lang = 'sw',
}) => {
  const [info, setInfo] = useState<CompanyPublicInfo>({ ...DEFAULT_COMPANY_INFO });
  const [activeTab, setActiveTab] = useState<'story' | 'services' | 'mission' | 'regions'>('story');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/system/company-info')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.company_name) {
            setInfo(data);
          }
        })
        .catch((e) => console.error('Failed to load company info for modal:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header Banner */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden shrink-0">
          {/* Background Orb */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-60 h-60 bg-[#f8a30a]/10 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-bold backdrop-blur-md">
              <Info className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Kuhusu Sisi' : 'About Us'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight font-['Sora',sans-serif] text-white">
              {info.company_name || 'INFOTECH WiFi Tanzania'}
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm font-['Manrope',sans-serif] leading-relaxed">
              {lang === 'sw' ? info.tagline_sw : info.tagline_en}
            </p>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-200 bg-slate-50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('story')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'story'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Historia & Maelezo' : 'Story & Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'services'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Huduma Zetu' : 'Our Services'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mission')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'mission'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Dhamira & Dira' : 'Mission & Vision'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regions')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
              activeTab === 'regions'
                ? 'border-indigo-600 text-indigo-600 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>{lang === 'sw' ? 'Mikoa ya Huduma' : 'Coverage Regions'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 font-sans">
          {/* TAB 1: STORY & STATS */}
          {activeTab === 'story' && (
            <div className="space-y-6">
              {/* Main Narrative */}
              <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                <h3 className="text-base font-black text-indigo-950 font-['Sora',sans-serif]">
                  {lang === 'sw'
                    ? info.about_title_sw || 'Sisi Ni Nani?'
                    : info.about_title_en || 'Who We Are'}
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-['Manrope',sans-serif]">
                  {lang === 'sw' ? info.about_description_sw : info.about_description_en}
                </p>
              </div>

              {/* Stats Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <div className="text-2xl font-black text-indigo-600 font-['Sora',sans-serif]">
                    {info.stats?.active_hotspots || '1,450+'}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    {lang === 'sw' ? 'Hotspot Active' : 'Active Hotspots'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <div className="text-2xl font-black text-emerald-600 font-['Sora',sans-serif]">
                    {info.stats?.daily_users || '85,000+'}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    {lang === 'sw' ? 'Watumiaji / Siku' : 'Daily Users'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <div className="text-2xl font-black text-[#f8a30a] font-['Sora',sans-serif]">
                    {info.stats?.coverage_regions || '15+'}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    {lang === 'sw' ? 'Mikoa Tanzania' : 'Regions in TZ'}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                  <div className="text-2xl font-black text-cyan-600 font-['Sora',sans-serif]">
                    {info.stats?.uptime_percentage || '99.98%'}
                  </div>
                  <div className="text-xs font-bold text-slate-600">
                    {lang === 'sw' ? 'Uptime Server' : 'System Uptime'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium">
                {lang === 'sw'
                  ? 'Tazama huduma zote za kidijitali na kiufundi zinazotolewa na mfumo wetu:'
                  : 'Explore all digital and technical telecommunication services provided by our platform:'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(info.services || []).map((srv, idx) => (
                  <div
                    key={srv.id || idx}
                    className="p-5 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 transition space-y-2 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition">
                        {idx + 1}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm font-['Sora',sans-serif]">
                        {lang === 'sw' ? srv.title_sw : srv.title_en}
                      </h4>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed font-['Manrope',sans-serif]">
                      {lang === 'sw' ? srv.description_sw : srv.description_en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MISSION & VISION */}
          {activeTab === 'mission' && (
            <div className="space-y-5">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Sparkles className="w-5 h-5" />
                  <h4 className="font-black text-sm uppercase tracking-wider">
                    {lang === 'sw' ? 'Dhamira Yetu (Our Mission)' : 'Our Mission'}
                  </h4>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed font-medium">
                  {lang === 'sw' ? info.mission_sw : info.mission_en}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-[#a36803]">
                  <Globe className="w-5 h-5" />
                  <h4 className="font-black text-sm uppercase tracking-wider">
                    {lang === 'sw' ? 'Dira Yetu (Our Vision)' : 'Our Vision'}
                  </h4>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed font-medium">
                  {lang === 'sw' ? info.vision_sw : info.vision_en}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: COVERAGE REGIONS */}
          {activeTab === 'regions' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>
                    {lang === 'sw'
                      ? 'Mikoa na Maeneo Tunayopatikana Nchini Tanzania'
                      : 'Covered Regions & Locations across Tanzania'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {lang === 'sw'
                    ? 'Mfumo wetu wa Cloud VPN na FreeRADIUS unafanya kazi kote Tanzania bila kikomo cha eneo wala ISP.'
                    : 'Our Cloud VPN & FreeRADIUS fleet works everywhere across Tanzania with any ISP or connection.'}
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  {(info.coverage_locations || []).map((loc) => (
                    <span
                      key={loc}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{loc}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {lang === 'sw'
                ? 'INFOTECH WiFi - Imeundwa kwa Viwango vya Juu Tanzania'
                : 'INFOTECH WiFi - Engineered for High Performance in Tanzania'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onOpenContact && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenContact();
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                <span>{lang === 'sw' ? 'Wasiliana Nasi' : 'Contact Us'}</span>
              </button>
            )}

            {onGetStarted && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGetStarted();
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#f8a30a] hover:bg-[#e09105] text-slate-950 font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{lang === 'sw' ? 'Anza Sasa' : 'Get Started'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
