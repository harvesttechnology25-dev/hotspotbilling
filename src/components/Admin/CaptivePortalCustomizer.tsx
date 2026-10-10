import React, { useState, useEffect } from 'react';
import { HotspotOwner, PortalThemeConfig, RouterItem, Plan } from '../../types/index.ts';
import { THEME_PRESETS, DEFAULT_PORTAL_THEME, getCardRadiusClass, getBorderWidth } from '../../utils/themePresets.ts';
import { CaptivePortal } from '../CaptivePortal/CaptivePortal.tsx';
import {
  Palette,
  Smartphone,
  Monitor,
  Sparkles,
  Save,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  Layers,
  Layout,
  Type,
  Phone,
  Radio,
  Wifi,
  Zap,
  Globe,
  Flame,
  Rocket,
  Shield,
  Coffee,
  Download,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CaptivePortalCustomizerProps {
  currentOwner?: HotspotOwner;
  routers?: RouterItem[];
  lang?: 'sw' | 'en';
  selectedRouterId?: number | 'all';
  onSelectRouter?: (id: number | 'all') => void;
}

export const CaptivePortalCustomizer: React.FC<CaptivePortalCustomizerProps> = ({
  currentOwner,
  routers = [],
  lang = 'sw',
  selectedRouterId: propSelectedRouterId,
  onSelectRouter,
}) => {
  const [theme, setTheme] = useState<PortalThemeConfig>(() => {
    if (currentOwner?.portal_theme) {
      return { ...DEFAULT_PORTAL_THEME, ...currentOwner.portal_theme };
    }
    return {
      ...DEFAULT_PORTAL_THEME,
      brandName: currentOwner?.business_name || 'My Hotspot Wi-Fi',
      supportPhone: currentOwner?.phone || '+255 754 000 111',
    };
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [expandedPreview, setExpandedPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'cards' | 'colors' | 'branding' | 'mikrotik_export'>('presets');
  const [selectedRouterId, setSelectedRouterId] = useState<number | 'all'>(propSelectedRouterId ?? 'all');

  useEffect(() => {
    if (propSelectedRouterId !== undefined) {
      setSelectedRouterId(propSelectedRouterId);
    }
  }, [propSelectedRouterId]);

  // Load existing saved theme for this owner or router
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const query = selectedRouterId !== 'all'
          ? `?routerId=${selectedRouterId}`
          : currentOwner?.id
          ? `?ownerId=${currentOwner.id}`
          : '';
        const res = await fetch(`/api/v1/portal/theme${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.theme) {
            setTheme((prev) => ({
              ...prev,
              ...data.theme,
              brandName: data.theme.brandName || currentOwner?.business_name || prev.brandName,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load portal theme:', err);
      }
    };
    fetchTheme();
  }, [currentOwner?.id, selectedRouterId]);

  const handleApplyPreset = (preset: PortalThemeConfig) => {
    setTheme((prev) => ({
      ...preset,
      brandName: prev.brandName,
      tagline: prev.tagline,
      supportPhone: prev.supportPhone,
      customLogoUrl: prev.customLogoUrl,
    }));
  };

  const handleSaveTheme = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/v1/portal/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: currentOwner?.id,
          routerId: selectedRouterId !== 'all' ? selectedRouterId : undefined,
          theme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Imeshindwa kuhifadhi mandhari.');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Hitilafu ya kuhifadhi.');
    } finally {
      setSaving(false);
    }
  };

  // Generate downloadable MikroTik login.html snippet with current styles
  const handleDownloadLoginHtml = () => {
    const html = `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${theme.brandName || 'Hotspot Login'}</title>
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --accent: ${theme.accentColor};
      --bg: ${theme.backgroundColor};
      --text: ${theme.textColor};
      --card-bg: ${theme.cardBgColor};
      --card-border: ${theme.cardBorderColor};
      --card-active-border: ${theme.cardActiveBorderColor};
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .portal-card {
      width: 100%;
      max-width: 420px;
      background: var(--card-bg);
      border: ${getBorderWidth(theme.cardBorderThickness)} solid var(--card-border);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
      text-align: center;
    }
    .hero-header {
      background: linear-gradient(135deg, var(--primary) 0%, #0f172a 100%);
      color: #fff;
      padding: 20px;
      border-radius: 16px;
      margin-bottom: 20px;
    }
    .btn-submit {
      width: 100%;
      padding: 14px;
      background: var(--primary);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-weight: bold;
      font-size: 15px;
      cursor: pointer;
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <div class="portal-card">
    <div class="hero-header">
      <h2 style="margin: 0 0 6px 0;">${theme.brandName || 'Hotspot Wi-Fi'}</h2>
      <p style="margin: 0; font-size: 13px; opacity: 0.85;">${theme.tagline || 'Lipa kwa simu upate intaneti ya kasi papo hapo.'}</p>
    </div>

    <!-- MikroTik Standard Login Form -->
    <form name="sendin" action="$(link-login-only)" method="post">
      <input type="hidden" name="username" />
      <input type="hidden" name="password" />
      <input type="hidden" name="dst" value="$(link-orig)" />
      <input type="hidden" name="popup" value="true" />
    </form>

    <div style="font-size: 13px; margin: 12px 0; color: #64748b;">
      Wasiliana na Msaada: <strong>${theme.supportPhone || '+255 754 000 111'}</strong>
    </div>

    <a href="$(link-login)" class="btn-submit" style="display: block; text-decoration: none; box-sizing: border-box;">
      Fungua Ukurasa Kamili wa Malipo (TZ-WiFi Cloud)
    </a>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `login-${theme.brandName?.replace(/\s+/g, '-').toLowerCase() || 'hotspot'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Palette className="w-5 h-5 text-indigo-400" />
            </span>
            <h1 className="text-xl font-black">
              {lang === 'sw' ? 'Muundo & Rangi za Captive Portal' : 'Captive Portal Theme & Card Customizer'}
            </h1>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            {lang === 'sw'
              ? 'Badilisha mandhari, rangi za kadi za vifurushi, mitindo ya vivuli, nembo na ujumbe wa biashara yako. Wateja wanaounganishwa na Wi-Fi wataona muonekano huu mara moja.'
              : 'Customize themes, card styles, borders, color palettes, logo, and brand copy for your customer hotspot login portal.'}
          </p>
        </div>

        {/* Action Controls: Live Preview Devices and Save */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Simu' : 'Mobile'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Kioo Kubwa' : 'Desktop'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setExpandedPreview(!expandedPreview)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition cursor-pointer"
            title={expandedPreview ? 'Rudisha Mwonekano wa Pembeni (Split View)' : 'Panua Kioo cha Preview (Full Width)'}
          >
            {expandedPreview ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'sw' ? 'Gawa Skrini' : 'Split View'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-white" />
                <span>{lang === 'sw' ? 'Panua Kioo' : 'Full Width'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveTheme}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>
              {saving
                ? lang === 'sw'
                  ? 'Inahifadhi...'
                  : 'Saving...'
                : saveSuccess
                ? lang === 'sw'
                  ? 'Imehifadhiwa!'
                  : 'Saved!'
                : lang === 'sw'
                ? 'Hifadhi Mandhari'
                : 'Save Theme'}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lang === 'sw'
              ? 'Mandhari imehifadhiwa kikamilifu! Wateja wataona muonekano mpya kwenye Wi-Fi yako.'
              : 'Captive portal theme saved successfully! Users will now experience your custom styling.'}
          </span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Main Grid: Controls on Left, Real-Time Interactive Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Customization Tabs and Panels */}
        <div className={expandedPreview ? 'hidden' : 'lg:col-span-6 space-y-4'}>
          {/* Router scope selector */}
          {routers.length > 0 && (
            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-slate-700">
                {lang === 'sw' ? 'Weka Muundo Kwenye:' : 'Apply Theme To:'}
              </span>
              <select
                value={selectedRouterId}
                onChange={(e) =>
                  setSelectedRouterId(
                    e.target.value === 'all' ? 'all' : Number(e.target.value)
                  )
                }
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">
                  {lang === 'sw'
                    ? 'Router Zote Zangu (Akaunti Nzima)'
                    : 'All My Routers (Global Account)'}
                </option>
                {routers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.location})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Settings Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'presets'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'sw' ? 'Mandhari (Themes)' : 'Themes'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'cards'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>{lang === 'sw' ? 'Kadi za Vifurushi' : 'Card Styles'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'colors'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'sw' ? 'Rangi & Usuli' : 'Colors'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('branding')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'branding'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'sw' ? 'Nembo & Maandishi' : 'Branding'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mikrotik_export')}
              className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'mikrotik_export'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-slate-700" />
              <span>{lang === 'sw' ? 'MikroTik HTML' : 'Export'}</span>
            </button>
          </div>

          {/* TAB 1: PRESET THEMES */}
          {activeTab === 'presets' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'sw' ? 'Chagua Mandhari Yaliyotengenezwa Tayari' : 'Choose a Ready-Made Theme Preset'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'sw'
                    ? 'Bofya mandhari yoyote hapa chini ili kuweka mpangilio mzuri wa rangi, kadi, na vivuli kwa mbofyo 1.'
                    : 'Click any theme below to instantly configure color palette, cards, and styling in 1 click.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {THEME_PRESETS.map((preset) => {
                  const isCurrent = theme.themeId === preset.themeId;
                  return (
                    <div
                      key={preset.themeId}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition select-none flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          {preset.themeName}
                        </span>
                        {isCurrent && (
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Visual Color swatches preview */}
                      <div className="flex items-center gap-2">
                        <div
                          style={{ backgroundColor: preset.primaryColor }}
                          className="w-6 h-6 rounded-lg border border-black/10 shadow-xs"
                          title="Primary Brand Color"
                        />
                        <div
                          style={{ backgroundColor: preset.accentColor }}
                          className="w-6 h-6 rounded-lg border border-black/10 shadow-xs"
                          title="Accent Color"
                        />
                        <div
                          style={{ backgroundColor: preset.cardBgColor }}
                          className="w-6 h-6 rounded-lg border border-slate-300 shadow-xs"
                          title="Card Background"
                        />
                        <div
                          style={{ backgroundColor: preset.backgroundColor }}
                          className="w-6 h-6 rounded-lg border border-slate-300 shadow-xs"
                          title="Portal Background"
                        />
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">
                          {preset.cardStyle}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CARD STYLING */}
          {activeTab === 'cards' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'sw' ? 'Muundo & Mtindo wa Kadi za Vifurushi' : 'Card Design & Package Appearance'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'sw'
                    ? 'Badilisha jinsi kadi za vifurushi vya Wi-Fi zinavyoonekana (kioo, mistari mizito ya 3D, au laini ya kisasa).'
                    : 'Configure how hotspot package cards look (glassmorphic, neo-brutalist 3D, or smooth modern).'}
                </p>
              </div>

              {/* Card Style Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {lang === 'sw' ? 'Mtindo wa Kadi (Card Style):' : 'Card Style:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'modern_rounded', label: lang === 'sw' ? 'Laini ya Kisasa' : 'Modern Rounded' },
                    { id: 'glassmorphism', label: lang === 'sw' ? 'Kioo (Frosted Glass)' : 'Glassmorphism' },
                    { id: 'neo_brutalist', label: lang === 'sw' ? 'Mstari Mkali 3D' : 'Neo-Brutalist' },
                    { id: 'flat_minimal', label: lang === 'sw' ? 'Bapa & Rahisi' : 'Flat Minimal' },
                    { id: 'gradient_bordered', label: lang === 'sw' ? 'Glow ya Rangi' : 'Glow Outline' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({
                          ...prev,
                          cardStyle: style.id as any,
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold text-center transition ${
                        theme.cardStyle === style.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Corner Radius */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {lang === 'sw' ? 'Mviringo wa Pembe (Corner Radius):' : 'Corner Radius:'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'sharp', label: lang === 'sw' ? 'Kali (6px)' : 'Sharp' },
                    { id: 'medium', label: lang === 'sw' ? 'Wastani (12px)' : 'Medium' },
                    { id: 'rounded', label: lang === 'sw' ? 'Duara (16px)' : 'Rounded' },
                    { id: 'extra', label: lang === 'sw' ? 'Pill (24px)' : 'Extra' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({ ...prev, cardRadius: r.id as any }))
                      }
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition ${
                        theme.cardRadius === r.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Border Thickness */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {lang === 'sw' ? 'Unene wa Mstari wa Kadi (Border Width):' : 'Border Width:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'thin', label: lang === 'sw' ? 'Nyembamba (1px)' : 'Thin (1px)' },
                    { id: 'medium', label: lang === 'sw' ? 'Wastani (2px)' : 'Medium (2px)' },
                    { id: 'thick', label: lang === 'sw' ? 'Nene (3px)' : 'Thick (3px)' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({
                          ...prev,
                          cardBorderThickness: b.id as any,
                        }))
                      }
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition ${
                        theme.cardBorderThickness === b.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Shadow Intensity */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {lang === 'sw' ? 'Kivuli cha Kadi (Card Shadow):' : 'Card Shadow:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'none', label: lang === 'sw' ? 'Bila Kivuli' : 'None' },
                    { id: 'sm', label: lang === 'sw' ? 'Kivuli Laini' : 'Subtle' },
                    { id: 'md', label: lang === 'sw' ? 'Kivuli cha Kati' : 'Medium' },
                    { id: 'lg', label: lang === 'sw' ? 'Kivuli Kinene' : 'Large' },
                    { id: 'colored', label: lang === 'sw' ? 'Glow ya Rangi' : 'Colored Glow' },
                    { id: 'brutal', label: lang === 'sw' ? 'Kivuli cha 3D' : 'Brutal 3D' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setTheme((prev) => ({ ...prev, cardShadow: s.id as any }))
                      }
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition ${
                        theme.cardShadow === s.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLORS & PALETTE */}
          {activeTab === 'colors' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'sw' ? 'Rangi za Kadi na Mandhari' : 'Color Palette & Surfaces'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'sw'
                    ? 'Chagua rangi halisi za kadi za vifurushi, rangi ya mpaka, na rangi ya kadi inapobonyezwa.'
                    : 'Customize specific background hex colors, borders, and active highlights.'}
                </p>
              </div>

              {/* Primary Brand Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{lang === 'sw' ? 'Rangi Kuu ya Biashara (Primary Brand Color):' : 'Primary Brand Color:'}</span>
                  <span className="font-mono text-[11px] text-slate-500">{theme.primaryColor}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.primaryColor}
                    onChange={(e) =>
                      setTheme((prev) => ({ ...prev, primaryColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['#059669', '#4f46e5', '#d97706', '#e11d48', '#0284c7', '#0f172a', '#7c3aed'].map(
                      (hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            setTheme((prev) => ({ ...prev, primaryColor: hex }))
                          }
                          style={{ backgroundColor: hex }}
                          className={`w-7 h-7 rounded-lg border-2 transition ${
                            theme.primaryColor === hex
                              ? 'border-white ring-2 ring-indigo-600 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Card Background Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{lang === 'sw' ? 'Rangi ya Usuli ya Kadi (Card Background):' : 'Card Background:'}</span>
                  <span className="font-mono text-[11px] text-slate-500">{theme.cardBgColor}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.cardBgColor.startsWith('#') ? theme.cardBgColor : '#ffffff'}
                    onChange={(e) =>
                      setTheme((prev) => ({ ...prev, cardBgColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { hex: '#ffffff', label: 'White' },
                      { hex: '#f8fafc', label: 'Slate 50' },
                      { hex: '#f1f5f9', label: 'Slate 100' },
                      { hex: '#1e293b', label: 'Slate Dark' },
                      { hex: '#0f172a', label: 'OLED Navy' },
                      { hex: '#fefce8', label: 'Warm Cream' },
                    ].map((item) => (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() =>
                          setTheme((prev) => ({ ...prev, cardBgColor: item.hex }))
                        }
                        style={{ backgroundColor: item.hex }}
                        className={`w-7 h-7 rounded-lg border-2 shadow-xs transition ${
                          theme.cardBgColor === item.hex
                            ? 'border-indigo-600 ring-2 ring-indigo-400 scale-110'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        title={item.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Border Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{lang === 'sw' ? 'Rangi ya Mstari wa Kadi (Card Border):' : 'Card Border Color:'}</span>
                  <span className="font-mono text-[11px] text-slate-500">{theme.cardBorderColor}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.cardBorderColor.startsWith('#') ? theme.cardBorderColor : '#e2e8f0'}
                    onChange={(e) =>
                      setTheme((prev) => ({ ...prev, cardBorderColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {['#e2e8f0', '#cbd5e1', '#94a3b8', '#000000', '#059669', '#4f46e5', '#fde68a'].map(
                      (hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            setTheme((prev) => ({ ...prev, cardBorderColor: hex }))
                          }
                          style={{ backgroundColor: hex }}
                          className={`w-7 h-7 rounded-lg border-2 transition ${
                            theme.cardBorderColor === hex
                              ? 'border-white ring-2 ring-indigo-600 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Card Active / Selected Background */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>
                    {lang === 'sw'
                      ? 'Rangi ya Kadi Inapochaguliwa (Active Selected Card):'
                      : 'Active Selected Background:'}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{theme.cardActiveBgColor}</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme.cardActiveBgColor.startsWith('#') ? theme.cardActiveBgColor : '#f0fdf4'}
                    onChange={(e) =>
                      setTheme((prev) => ({ ...prev, cardActiveBgColor: e.target.value }))
                    }
                    className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { hex: '#f0fdf4', label: 'Emerald Tint' },
                      { hex: '#eef2ff', label: 'Indigo Tint' },
                      { hex: '#fef3c7', label: 'Amber Tint' },
                      { hex: '#ffe4e6', label: 'Rose Tint' },
                      { hex: '#1e293b', label: 'Dark Navy' },
                      { hex: '#dcfce7', label: 'Neo Green' },
                    ].map((item) => (
                      <button
                        key={item.hex}
                        type="button"
                        onClick={() =>
                          setTheme((prev) => ({ ...prev, cardActiveBgColor: item.hex }))
                        }
                        style={{ backgroundColor: item.hex }}
                        className={`w-7 h-7 rounded-lg border-2 shadow-xs transition ${
                          theme.cardActiveBgColor === item.hex
                            ? 'border-indigo-600 ring-2 ring-indigo-400 scale-110'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                        title={item.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BRANDING & HEADER */}
          {activeTab === 'branding' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === 'sw' ? 'Nembo, Jina la Biashara & Maandishi' : 'Brand Name, Logo & Messages'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'sw'
                    ? 'Weka jina la Wi-Fi yako, ujumbe wa karibu, nambari ya simu ya msaada, na chagua nembo inayokufaa.'
                    : 'Personalize your hotspot name, welcome tagline, support contact, and brand logo.'}
                </p>
              </div>

              {/* Hotspot Brand Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'sw' ? 'Jina la Hotspot / Biashara:' : 'Hotspot Brand Name:'}
                </label>
                <input
                  type="text"
                  value={theme.brandName || ''}
                  onChange={(e) =>
                    setTheme((prev) => ({ ...prev, brandName: e.target.value }))
                  }
                  placeholder="mfano: Sinza Fast Wi-Fi"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Tagline / Welcome Subtitle */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'sw' ? 'Kauli Mbiu / Maelezo Mafupi:' : 'Tagline / Welcome Message:'}
                </label>
                <input
                  type="text"
                  value={theme.tagline || ''}
                  onChange={(e) =>
                    setTheme((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  placeholder="mfano: Mtandao wa Kasi ya Juu | Malipo ya Simu Papo Hapo"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Support Phone Number */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'sw' ? 'Nambari ya Simu ya Msaada / WhatsApp:' : 'Support Phone Number:'}
                </label>
                <input
                  type="text"
                  value={theme.supportPhone || ''}
                  onChange={(e) =>
                    setTheme((prev) => ({ ...prev, supportPhone: e.target.value }))
                  }
                  placeholder="mfano: 0754 111 222"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Logo Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {lang === 'sw' ? 'Chagua Nembo / Ikoni ya Wi-Fi:' : 'Select Hotspot Icon:'}
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-2">
                  {[
                    { id: 'wifi', icon: Wifi, label: 'Wi-Fi' },
                    { id: 'zap', icon: Zap, label: 'Zap' },
                    { id: 'radio', icon: Radio, label: 'Radio' },
                    { id: 'globe', icon: Globe, label: 'Globe' },
                    { id: 'rocket', icon: Rocket, label: 'Rocket' },
                    { id: 'flame', icon: Flame, label: 'Flame' },
                    { id: 'shield', icon: Shield, label: 'Shield' },
                    { id: 'coffee', icon: Coffee, label: 'Coffee' },
                    { id: 'sparkles', icon: Sparkles, label: 'VIP' },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setTheme((prev) => ({
                            ...prev,
                            logoIcon: item.id as any,
                            customLogoUrl: '',
                          }))
                        }
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                          theme.logoIcon === item.id && !theme.customLogoUrl
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-600/30'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span className="text-[10px] font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Custom Logo URL */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  {lang === 'sw' ? 'Au Weka URL ya Picha ya Nembo Yako (Logo URL):' : 'Or Custom Logo Image URL:'}
                </label>
                <input
                  type="text"
                  value={theme.customLogoUrl || ''}
                  onChange={(e) =>
                    setTheme((prev) => ({ ...prev, customLogoUrl: e.target.value }))
                  }
                  placeholder="https://example.com/logo.png"
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme.showCarrierLogos}
                    onChange={(e) =>
                      setTheme((prev) => ({ ...prev, showCarrierLogos: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    {lang === 'sw'
                      ? 'Onyesha nembo za mitandao (M-Pesa, Tigo, Airtel, Halopesa)'
                      : 'Show accepted carrier badges (M-Pesa, Tigo, Airtel, Halopesa)'}
                  </span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={theme.showSupportBadge}
                    onChange={(e) =>
                      setTheme((prev) => ({ ...prev, showSupportBadge: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    {lang === 'sw'
                      ? 'Onyesha beji ya simu ya msaada wa haraka'
                      : 'Show fast customer support badge with phone number'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 5: MIKROTIK EXPORT */}
          {activeTab === 'mikrotik_export' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === 'sw' ? 'Pakua Faili za login.html ya MikroTik' : 'Download MikroTik login.html'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Faili hili linakuwa na muundo, rangi na nembo ya biashara yako tayari kuingizwa kwenye folda ya /hotspot ya router yako.'
                      : 'Pre-styled HTML/CSS template containing your custom branding and palette ready for MikroTik files folder.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadLoginHtml}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'sw' ? 'Pakua Faili' : 'Download .html'}</span>
                </button>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">
                  {lang === 'sw' ? 'Maelekezo ya Kuingiza Kwenye MikroTik:' : 'Quick Installation Guide:'}
                </span>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>
                    {lang === 'sw'
                      ? 'Pakua faili la login.html kwa kubofya kitufe cha juu.'
                      : 'Download login.html using the button above.'}
                  </li>
                  <li>
                    {lang === 'sw'
                      ? 'Fungua WinBox kisha nenda kwenye menyu ya Files.'
                      : 'Open WinBox and navigate to Files.'}
                  </li>
                  <li>
                    {lang === 'sw'
                      ? 'Buruta na uweke faili la login.html ndani ya folda ya /hotspot au /flash/hotspot.'
                      : 'Drag and drop login.html into your /hotspot or /flash/hotspot directory.'}
                  </li>
                  <li>
                    {lang === 'sw'
                      ? 'Kila mteja anayeunganishwa ataelekezwa kiotomatiki kwenye mfumo huu wenye rangi zako!'
                      : 'All connected guests will immediately be greeted with your custom branding!'}
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Interactive Dual-Device Preview */}
        <div className={expandedPreview ? 'col-span-12 space-y-3' : 'lg:col-span-6 space-y-3 sticky top-4'}>
          <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>
                {lang === 'sw'
                  ? `Muonekano wa Moja kwa Moja (${previewDevice === 'mobile' ? 'Simu ya Mkononi' : 'Desktop'}${expandedPreview ? ' - Kioo Kamili' : ''})`
                  : `Live Real-Time Preview (${previewDevice === 'mobile' ? 'Mobile Phone' : 'Desktop'}${expandedPreview ? ' - Full Screen' : ''})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpandedPreview(!expandedPreview)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
                title={expandedPreview ? 'Rudisha Pembeni (Split View)' : 'Panua Kioo cha Preview (Full Width)'}
              >
                {expandedPreview ? (
                  <>
                    <Minimize2 className="w-3 h-3 text-indigo-600" />
                    <span>{lang === 'sw' ? 'Rudisha Pembeni' : 'Split View'}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 text-indigo-600" />
                    <span>{lang === 'sw' ? 'Panua Kioo' : 'Expand'}</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {lang === 'sw' ? 'Inabadilika Moja kwa Moja' : 'Instant Reactive'}
              </span>
            </div>
          </div>

          {/* Device Mockup Wrapper */}
          <div className={`flex justify-center bg-slate-900/5 p-4 rounded-3xl border border-slate-200 ${expandedPreview ? 'w-full' : ''}`}>
            {previewDevice === 'mobile' ? (
              /* Mobile Phone Mockup Frame */
              <div className="w-[375px] max-w-full rounded-[44px] bg-slate-950 p-3 shadow-2xl ring-1 ring-slate-800">
                {/* Phone Notch & Status Bar */}
                <div className="h-6 w-full flex items-center justify-between px-6 text-[10px] text-white/80 font-mono">
                  <span>09:41</span>
                  <div className="w-20 h-4 bg-slate-900 rounded-full" />
                  <div className="flex items-center gap-1.5">
                    <Wifi className="w-3 h-3" />
                    <span className="font-bold">100%</span>
                  </div>
                </div>

                {/* Inner Phone Screen */}
                <div
                  style={{
                    backgroundColor: theme.backgroundColor.startsWith('#')
                      ? theme.backgroundColor
                      : '#f8fafc',
                  }}
                  className="rounded-[34px] overflow-y-auto max-h-[640px] text-slate-900"
                >
                  <CaptivePortal
                    lang={lang}
                    customTheme={theme}
                    previewMode={true}
                    previewDevice="mobile"
                  />
                </div>
              </div>
            ) : (
              /* Desktop Monitor Mockup Frame */
              <div className={`rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden ${expandedPreview ? 'w-full max-w-5xl' : 'w-full'}`}>
                {/* Browser Tab Bar */}
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="font-mono text-[11px] bg-white border border-slate-200 px-3 py-0.5 rounded-md text-slate-500">
                      http://wifi.hotspot.lan/login
                    </span>
                  </div>
                </div>

                {/* Desktop Screen Content */}
                <div
                  style={{
                    backgroundColor: theme.backgroundColor.startsWith('#')
                      ? theme.backgroundColor
                      : '#f8fafc',
                  }}
                  className="p-3 sm:p-5 overflow-y-auto max-h-[680px]"
                >
                  <CaptivePortal
                    lang={lang}
                    customTheme={theme}
                    previewMode={true}
                    previewDevice="desktop"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
