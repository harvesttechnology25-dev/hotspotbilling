import React, { useState, useEffect } from 'react';
import {
  Radio,
  Wifi,
  ShieldCheck,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Check,
  PlusCircle,
  Cpu,
  Layers,
  Zap,
  HelpCircle,
  Sparkles,
  Server,
  ArrowRight,
} from 'lucide-react';
import { HotspotOwner, OmadaSiteItem, RouterItem } from '../../types/index.ts';
import { getUniqueApPortalUrl, normalizeMac } from '../../utils/portalUrlHelper.ts';

interface OmadaSettingsTabProps {
  currentUser: HotspotOwner | null;
  lang?: 'sw' | 'en';
}

export const OmadaSettingsTab: React.FC<OmadaSettingsTabProps> = ({
  currentUser,
  lang = 'sw',
}) => {
  // Credentials Form State
  const [controllerUrl, setControllerUrl] = useState('https://omada.infotechwifi.com:8043');
  const [authMode, setAuthMode] = useState<'OPENAPI' | 'CREDENTIALS'>('OPENAPI');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [omadacId, setOmadacId] = useState('5015eb6741252b75a3633605c471738f');
  const [controllerUsername, setControllerUsername] = useState('admin');
  const [controllerPassword, setControllerPassword] = useState('');
  const [devicePassword, setDevicePassword] = useState('Omada@1234!Tz');

  // UI state
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showControllerPassword, setShowControllerPassword] = useState(false);
  const [showDevicePassword, setShowDevicePassword] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [hasOpenApi, setHasOpenApi] = useState(false);
  const [hasStoredSecret, setHasStoredSecret] = useState(false);

  // Status & Feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [diagnostic, setDiagnostic] = useState<{
    connected?: boolean;
    mode?: string;
    omadacId?: string;
    version?: string;
    sitesCount?: number;
    latencyMs?: number;
  } | null>(null);

  // Guide accordion toggle
  const [showGuide, setShowGuide] = useState(false);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sites list
  const [sites, setSites] = useState<OmadaSiteItem[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);

  // Quick Site Creator state
  const [newSiteName, setNewSiteName] = useState('Kariakoo-Hub-Site');
  const [newSiteScenario, setNewSiteScenario] = useState('Office');
  const [newSiteNasIp, setNewSiteNasIp] = useState('13.140.173.98');
  const [creatingSite, setCreatingSite] = useState(false);
  const [siteCreateSuccess, setSiteCreateSuccess] = useState<string | null>(null);

  // Quick AP Adoption state
  const [adoptSiteId, setAdoptSiteId] = useState('');
  const [adoptMac, setAdoptMac] = useState('');
  const [adoptModel, setAdoptModel] = useState('TP-Link Omada EAP610 (Wi-Fi 6 AX1800)');
  const [adoptingAp, setAdoptingAp] = useState(false);
  const [adoptSuccess, setAdoptSuccess] = useState<string | null>(null);

  // Quick Hotspot Enablement state
  const [hotspotSiteId, setHotspotSiteId] = useState('');
  const [hotspotSsid, setHotspotSsid] = useState('INFOTECH-HOTSPOT-WIFI');
  const [omadaRouters, setOmadaRouters] = useState<RouterItem[]>([]);
  const [selectedApRouterId, setSelectedApRouterId] = useState<string>('AUTO');
  const [customApMacForHotspot, setCustomApMacForHotspot] = useState<string>('');
  const [hotspotPortalUrl, setHotspotPortalUrl] = useState(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/?ap_vendor=omada`;
    }
    return 'https://infotechwifi.com/?ap_vendor=omada';
  });
  const [enablingHotspot, setEnablingHotspot] = useState(false);
  const [hotspotSuccess, setHotspotSuccess] = useState<string | null>(null);

  // Fetch saved credentials & settings on mount
  useEffect(() => {
    fetchCredentials();
    fetchSites();
    fetchRouters();
  }, []);

  const fetchRouters = async () => {
    try {
      const res = await fetch('/api/v1/routers');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const filtered = list.filter((r: RouterItem) => r.device_type === 'TPLINK_OMADA' || r.mac_address);
          setOmadaRouters(filtered);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch AP routers:', err);
    }
  };

  const fetchCredentials = async () => {
    setLoadingInitial(true);
    try {
      const res = await fetch('/api/v1/omada/controller-credentials');
      if (res.ok) {
        const data = await res.json();
        if (data.controllerUrl) setControllerUrl(data.controllerUrl);
        if (data.clientId) setClientId(data.clientId);
        if (data.omadacId) setOmadacId(data.omadacId);
        if (data.username) setControllerUsername(data.username);
        setIsConfigured(Boolean(data.isConfigured));
        setHasOpenApi(Boolean(data.hasOpenApi));
        setHasStoredSecret(Boolean(data.hasClientSecret));
        if (data.hasOpenApi) {
          setAuthMode('OPENAPI');
        } else if (data.hasPassword) {
          setAuthMode('CREDENTIALS');
        }
      }
    } catch (err: any) {
      console.warn('Failed to load Omada credentials:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const fetchSites = async (sync = false) => {
    setLoadingSites(true);
    try {
      const url = sync ? '/api/v1/omada/sites?sync=true' : '/api/v1/omada/sites';
      const res = await fetch(url);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setSites(list);
          if (list.length > 0) {
            if (!adoptSiteId) setAdoptSiteId(list[0].id);
            if (!hotspotSiteId) setHotspotSiteId(list[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch Omada sites:', err);
    } finally {
      setLoadingSites(false);
    }
  };

  // Auto-detect Omadac ID from /api/info
  const handleAutoDetectOmadacId = async () => {
    if (!controllerUrl.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Tafadhali weka URL ya Omada Controller kwanza (k.m. https://omada.infotechwifi.com:8043).',
      });
      return;
    }

    setDiscovering(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/omada/discover-controller-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controllerUrl }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.omadacId) {
          setOmadacId(data.omadacId);
        }
        setStatusMessage({
          type: 'success',
          text: `Omada Controller imegunduliwa (${data.latencyMs}ms)! Omadac ID: ${data.omadacId} (Version: ${data.controllerVersion})`,
        });
        setDiagnostic((prev) => ({
          ...prev,
          connected: true,
          omadacId: data.omadacId,
          version: data.controllerVersion,
          latencyMs: data.latencyMs,
        }));
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Haikuweza kugundua Controller ID. Hakikisha URL na Port 8043 zipo sahihi.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hitilafu ya kugundua Controller: ${err.message}`,
      });
    } finally {
      setDiscovering(false);
    }
  };

  // Test connection button
  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const payload: any = {
        controllerUrl: controllerUrl.trim(),
        omadacId: omadacId.trim(),
      };
      if (authMode === 'OPENAPI') {
        payload.clientId = clientId.trim();
        payload.clientSecret = clientSecret.trim();
      } else {
        payload.username = controllerUsername.trim();
        payload.password = controllerPassword.trim();
      }

      const res = await fetch('/api/v1/omada/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Muunganisho wa Omada Controller umefanikiwa kikamilifu!',
        });
        setDiagnostic({
          connected: true,
          mode: data.mode,
          omadacId: data.omadacId,
          sitesCount: data.sitesCount,
          latencyMs: data.latencyMs,
        });
        setIsConfigured(true);
        if (data.mode === 'OPENAPI') setHasOpenApi(true);
        fetchSites(true);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Muunganisho umeshindwa. Hakikisha Client ID & Secret zipo sahihi na Open API imewashwa kwenye Omada.',
        });
        setDiagnostic({ connected: false });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hitilafu ya mtandao: ${err.message}`,
      });
      setDiagnostic({ connected: false });
    } finally {
      setTesting(false);
    }
  };

  // Save Credentials button
  const handleSaveCredentials = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (authMode === 'OPENAPI') {
      if (!clientId.trim()) {
        setStatusMessage({ type: 'error', text: 'Tafadhali weka Client ID ya Omada Open API.' });
        return;
      }
      if (!clientSecret.trim() && !hasStoredSecret) {
        setStatusMessage({ type: 'error', text: 'Tafadhali weka Client Secret ya Omada Open API.' });
        return;
      }
    } else {
      if (!controllerUsername.trim() || (!controllerPassword.trim() && !isConfigured)) {
        setStatusMessage({ type: 'error', text: 'Tafadhali weka Username na Password za Omada Controller.' });
        return;
      }
    }

    setSaving(true);
    setStatusMessage(null);
    try {
      const payload: any = {
        controllerUrl: controllerUrl.trim(),
        omadacId: omadacId.trim(),
      };

      if (authMode === 'OPENAPI') {
        payload.clientId = clientId.trim();
        if (clientSecret.trim()) {
          payload.clientSecret = clientSecret.trim();
        }
      } else {
        payload.username = controllerUsername.trim();
        if (controllerPassword.trim()) {
          payload.password = controllerPassword.trim();
        }
      }

      const res = await fetch('/api/v1/omada/controller-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Taarifa za Omada Open API zimehifadhiwa na muunganisho umethibitishwa!',
        });
        setIsConfigured(true);
        setHasOpenApi(authMode === 'OPENAPI');
        setHasStoredSecret(true);
        setClientSecret('');
        if (data.diagnostic) {
          setDiagnostic({
            connected: true,
            mode: data.diagnostic.mode,
            omadacId: data.diagnostic.omadacId,
            sitesCount: data.diagnostic.sitesCount,
          });
        }
        fetchSites(true);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Imeshindwa kuunganisha na Omada Controller.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hitilafu ya kuhifadhi: ${err.message}`,
      });
    } finally {
      setSaving(false);
    }
  };

  // Automatic Site Creation
  const handleQuickCreateSite = async () => {
    if (!newSiteName.trim()) {
      setStatusMessage({ type: 'error', text: 'Tafadhali weka jina la Site (Site Name).' });
      return;
    }

    setCreatingSite(true);
    setSiteCreateSuccess(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/omada/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSiteName.trim(),
          scenario: newSiteScenario,
          nasIp: newSiteNasIp.trim() || '13.140.173.98',
          region: 'Tanzania',
          timeZone: 'Africa/Dar_es_Salaam',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSiteCreateSuccess(data.message || `Site "${newSiteName}" imetengenezwa kikamilifu kwenye Omada!`);
        setStatusMessage({ type: 'success', text: data.message });
        setNewSiteName('');
        fetchSites(true);
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Imeshindwa kutengeneza Site kwenye Omada Controller.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hitilafu ya kuunda site: ${err.message}`,
      });
    } finally {
      setCreatingSite(false);
    }
  };

  // Quick AP Adoption
  const handleQuickAdoptAp = async () => {
    if (!adoptSiteId) {
      setStatusMessage({ type: 'error', text: 'Tafadhali chagua Site ya Omada unayotaka ku-adopt AP.' });
      return;
    }
    if (!adoptMac.trim()) {
      setStatusMessage({ type: 'error', text: 'Tafadhali weka MAC Address ya Access Point.' });
      return;
    }

    setAdoptingAp(true);
    setAdoptSuccess(null);
    setStatusMessage(null);
    try {
      // 1. Claim AP & register
      const claimRes = await fetch('/api/v1/omada/sites/claim-ap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: adoptSiteId,
          macAddress: adoptMac.trim(),
          modelName: adoptModel,
        }),
      });
      const claimData = await claimRes.json();
      if (!claimRes.ok) {
        throw new Error(claimData.error || 'Imeshindwa ku-claim AP.');
      }

      // 2. Dispatch adoption command to Omada Controller via Open API
      const adaptRes = await fetch('/api/v1/omada/sites/adapt-ap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: adoptSiteId,
          macAddress: adoptMac.trim(),
          routerId: claimData.router?.id,
          apUsername: claimData.apUsername || 'admin',
          apPassword: claimData.apPassword || devicePassword,
        }),
      });
      const adaptData = await adaptRes.json();
      if (adaptRes.ok && adaptData.success) {
        setAdoptSuccess(adaptData.message || `Amri ya Adoption imetumwa kwenye Omada Controller kwa MAC ${adoptMac}!`);
        setStatusMessage({ type: 'success', text: adaptData.message });
        setAdoptMac('');
      } else {
        setStatusMessage({
          type: 'error',
          text: adaptData.error || 'Amri ya adoption imeshindwa.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hitilafu ya adoption: ${err.message}`,
      });
    } finally {
      setAdoptingAp(false);
    }
  };

  // Quick Enable Hotspot
  const handleQuickEnableHotspot = async () => {
    if (!hotspotSiteId) {
      setStatusMessage({ type: 'error', text: 'Tafadhali chagua Site ya Omada.' });
      return;
    }
    if (!hotspotSsid.trim()) {
      setStatusMessage({ type: 'error', text: 'Tafadhali weka jina la SSID (Wi-Fi Name).' });
      return;
    }

    setEnablingHotspot(true);
    setHotspotSuccess(null);
    setStatusMessage(null);
    try {
      const selectedRouter = omadaRouters.find((r) => String(r.id) === selectedApRouterId);
      const targetApMac = selectedRouter?.mac_address || (customApMacForHotspot ? normalizeMac(customApMacForHotspot) : undefined);
      const targetRouterId = selectedRouter?.id;

      // Unique Captive Portal URL kwa AP hii
      const uniqueUrlForAp = getUniqueApPortalUrl({
        routerId: targetRouterId,
        macAddress: targetApMac,
        siteId: hotspotSiteId,
        vendor: 'omada',
      });

      const effectiveUrlToSend = (hotspotPortalUrl && hotspotPortalUrl.trim() && !hotspotPortalUrl.endsWith('/?ap_vendor=omada'))
        ? hotspotPortalUrl.trim()
        : uniqueUrlForAp;

      const res = await fetch('/api/v1/omada/sites/enable-hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: hotspotSiteId,
          routerId: targetRouterId,
          apMac: targetApMac,
          ssid: hotspotSsid.trim(),
          portalUrl: effectiveUrlToSend,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHotspotSuccess(data.message || `Hotspot Captive Portal imewashwa kwa SSID "${hotspotSsid}"!`);
        setStatusMessage({ type: 'success', text: data.message });
        fetchSites(true);
        fetchRouters();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Imeshindwa kuwasha Hotspot Captive Portal.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hitilafu ya kuwasha hotspot: ${err.message}`,
      });
    } finally {
      setEnablingHotspot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Header Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>TP-LINK OMADA CONTROLLER OPEN API (REST & CLIENT CREDENTIALS)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {lang === 'sw'
                ? 'Mawasiliano ya Omada Controller Open API'
                : 'Omada Controller Open API Integration'}
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              {lang === 'sw'
                ? 'Sanidi Client ID na Client Secret za Open API ili kuunganisha mfumo wa INFOTECH WiFi moja kwa moja na Omada SDN Controller. Hii inaruhusu mfumo kuunda Sites kiotomatiki, ku-adopt Access Points (EAP & Pharos), kusanidi RADIUS Server NAS IP na kuwasha Hotspot Captive Portal kwa kubofya mara 1 bila haja ya kuingia kwenye dashibodi ya Omada mwenyewe.'
                : 'Configure Open API Client ID and Client Secret to connect INFOTECH WiFi directly with your Omada SDN Controller. Automates site creation, AP adoption, FreeRADIUS NAS IP configuration, and captive portal hotspot deployment.'}
            </p>
          </div>

          {/* Quick status badge */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/30 shrink-0 min-w-[240px] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Hali ya Open API</span>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  IMEUNGANISHWA
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <AlertCircle className="w-3.5 h-3.5" />
                  BADO HAIJAWEKWA
                </span>
              )}
            </div>

            <div className="text-xs space-y-1 font-mono text-slate-300 pt-1 border-t border-white/10">
              <div className="flex justify-between">
                <span className="text-slate-400">Modi:</span>
                <span className="text-emerald-400 font-bold">{hasOpenApi ? 'Client Credentials' : (isConfigured ? 'Web Admin' : 'Haikusanidiwa')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sites Zilizopo:</span>
                <span className="text-white font-bold">{sites.length} Sites</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-emerald-950 font-black text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{testing ? 'Inajaribu Token...' : 'Jaribu Muunganisho'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Status Message Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-start gap-3 shadow-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-bold">{statusMessage.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Step-by-Step Guide Accordion (How to get Client ID & Secret) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full p-5 sm:p-6 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {lang === 'sw'
                  ? '📖 Mwongozo: Jinsi ya Kutengeneza Client ID na Client Secret kwenye Omada Controller'
                  : '📖 Guide: How to Generate Client ID & Client Secret in Omada Controller'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'sw'
                  ? 'Fuata hatua hizi 6 rahisi kwenye dashibodi ya Omada kupata funguo zako za Open API'
                  : 'Follow these 6 simple steps in Omada Controller to get your Open API keys'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700">
            {showGuide ? 'Funga Mwongozo ▲' : 'Fungua Mwongozo ▼'}
          </span>
        </button>

        {showGuide && (
          <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs sm:text-sm text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  HATUA 1 HADI 3
                </span>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed">
                  <li>
                    Ingia kwenye <strong>TP-Link Omada Controller</strong> yako (k.m.{' '}
                    <code className="text-indigo-600 font-bold">https://omada.infotechwifi.com:8043</code>).
                  </li>
                  <li>
                    Kwenye kona ya juu kushoto, hakikisha umechagua <strong>Global View</strong> (sio site moja).
                  </li>
                  <li>
                    Nenda kwenye menyu ya chini: <strong>Settings (⚙️)</strong> →{' '}
                    <strong>Platform Integration</strong> → <strong>Open API</strong>.
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  HATUA 4 HADI 6
                </span>
                <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed" start={4}>
                  <li>
                    Washa kibonyezo cha <strong>Enable Open API</strong> kuwa <em>ON</em>.
                  </li>
                  <li>
                    Bofya <strong>+ Add Application</strong>, weka Jina:{' '}
                    <strong>INFOTECH WiFi Hotspot Billing</strong> na uchague Role kuwa{' '}
                    <strong>Administrator</strong> (Full Access).
                  </li>
                  <li>
                    Omada itakupa <strong>Client ID</strong> na <strong>Client Secret</strong>. Zinakili na
                    uzibandike kwenye fomu iliyo hapa chini kisha ubofye <strong>Hifadhi na Jaribu Muunganisho</strong>!
                  </li>
                </ol>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Zingatia:</strong> Open API inatoa usalama wa hali ya juu (OAuth 2.0 Client Credentials) na
                inaruhusu mfumo kufanya kazi hata nenosiri la admin likibadilika!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Open API Credentials Configuration Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Key className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-slate-900">
                {lang === 'sw' ? 'Usanidi wa Vigezo vya Open API' : 'Open API Configuration'}
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Weka taarifa za Controller URL, Client ID, Client Secret na Controller ID (omadacId)
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAuthMode('OPENAPI')}
              className={`px-3 py-1.5 rounded-xl transition ${
                authMode === 'OPENAPI'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚡ Open API (Client ID & Secret)
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('CREDENTIALS')}
              className={`px-3 py-1.5 rounded-xl transition ${
                authMode === 'CREDENTIALS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔑 Web Admin (User & Pass)
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveCredentials} className="space-y-5">
          {/* Controller URL */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>Omada Controller URL (Port 8043)</span>
              </label>
              <button
                type="button"
                onClick={handleAutoDetectOmadacId}
                disabled={discovering}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer"
              >
                {discovering ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Gundua Controller ID Kiotomatiki</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="url"
                value={controllerUrl}
                onChange={(e) => setControllerUrl(e.target.value)}
                placeholder="https://omada.infotechwifi.com:8043"
                required
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm font-mono text-slate-900 transition outline-none"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Mfano: <code className="text-slate-600">https://omada.infotechwifi.com:8043</code> au{' '}
              <code className="text-slate-600">https://13.140.173.98:8043</code>
            </p>
          </div>

          {authMode === 'OPENAPI' ? (
            <>
              {/* Client ID & Secret Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Client ID (Open API)</span>
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Weka Client ID kutoka Omada Platform Integration..."
                    required={authMode === 'OPENAPI'}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm font-mono text-slate-900 transition outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Inatolewa kwenye <em>Settings → Platform Integration → Open API</em>
                  </p>
                </div>

                {/* Client Secret */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Client Secret</span>
                    </label>
                    {hasStoredSecret && !clientSecret && (
                      <span className="text-[11px] font-bold text-emerald-600">
                        ✓ Imehifadhiwa (Weka mpya ukibadili)
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showClientSecret ? 'text' : 'password'}
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      placeholder={hasStoredSecret ? '•••••••••••••••• (Imehifadhiwa tayari)' : 'Weka Client Secret ya siri...'}
                      className="w-full px-4 py-3 pr-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm font-mono text-slate-900 transition outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Funguo ya siri inayotumika kuomba OAuth Bearer Access Token
                  </p>
                </div>
              </div>

              {/* Controller ID (Omadac ID) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    <span>Omada Controller ID (omadacId)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDetectOmadacId}
                    disabled={discovering}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Gundua / Update ID
                  </button>
                </div>
                <input
                  type="text"
                  value={omadacId}
                  onChange={(e) => setOmadacId(e.target.value)}
                  placeholder="5015eb6741252b75a3633605c471738f"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-xs sm:text-sm font-mono text-slate-900 transition outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Kitambulisho cha kipekee cha Controller yako (omadacId). Mfumo huigundua kiotomatiki kutoka kwenye Controller.
                </p>
              </div>
            </>
          ) : (
            /* Standard Web Admin Credentials Fallback */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Omada Admin Username</label>
                <input
                  type="text"
                  value={controllerUsername}
                  onChange={(e) => setControllerUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 text-xs sm:text-sm font-mono text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Omada Admin Password</label>
                <div className="relative">
                  <input
                    type={showControllerPassword ? 'text' : 'password'}
                    value={controllerPassword}
                    onChange={(e) => setControllerPassword(e.target.value)}
                    placeholder={isConfigured ? '•••••••• (Imehifadhiwa)' : 'Nenosiri la Omada...'}
                    className="w-full px-4 py-3 pr-11 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 text-xs sm:text-sm font-mono text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowControllerPassword(!showControllerPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showControllerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Device Password for newly adopted APs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nenosiri la Vifaa (Device Account Password kwa APs mpya)</span>
              </label>
              <button
                type="button"
                onClick={() => setDevicePassword('Omada@' + Math.floor(1000 + Math.random() * 9000) + '!Tz')}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                🎲 Tengeneza Nenosiri Imara
              </button>
            </div>
            <div className="relative">
              <input
                type={showDevicePassword ? 'text' : 'password'}
                value={devicePassword}
                onChange={(e) => setDevicePassword(e.target.value)}
                placeholder="Omada@1234!Tz"
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-900 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowDevicePassword(!showDevicePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                {showDevicePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Nenosiri linalowekwa kiotomatiki kwenye Access Points za TP-Link wakati wa adoption. Lazima liwe na herufi kubwa, ndogo, namba na alama maalum.
            </p>
          </div>

          {/* Submit & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Taarifa zinalindwa kwa usalama wa TLS/HTTPS kwenye seva yako</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                {testing ? 'Inajaribu...' : 'Jaribu Tu'}
              </button>

              <button
                type="submit"
                disabled={saving || testing}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{saving ? 'Inahifadhi & Kujaribu...' : 'Hifadhi & Unganisha Open API'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Three-Card Automation Suite: Quick Site Creation, AP Adoption & Hotspot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card A: Quick Site Creator */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  1. Tengeneza Site Kiotomatiki
                </h3>
                <span className="text-[11px] text-indigo-600 font-bold">Auto RADIUS NAS IP Setup</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Unda Site mpya kwenye Omada Controller moja kwa moja. Mfumo utasajili jina la site na kusanidi FreeRADIUS Server NAS IP ya VPS kiotomatiki.
            </p>

            <div className="space-y-2 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Jina la Site Mpya</label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="mfano: Mlimani-City-Hub"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Scenario</label>
                  <select
                    value={newSiteScenario}
                    onChange={(e) => setNewSiteScenario(e.target.value)}
                    className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none"
                  >
                    <option value="Office">Office</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Hotel">Hotel</option>
                    <option value="Mall">Shopping Mall</option>
                    <option value="Restaurant">Cafe / Restaurant</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">RADIUS NAS IP</label>
                  <input
                    type="text"
                    value={newSiteNasIp}
                    onChange={(e) => setNewSiteNasIp(e.target.value)}
                    placeholder="13.140.173.98"
                    className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {siteCreateSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{siteCreateSuccess}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickCreateSite}
            disabled={creatingSite || !newSiteName.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {creatingSite ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            <span>{creatingSite ? 'Inaunda Site Kwenye Omada...' : '🚀 Unda Site Kwenye Omada Sasa'}</span>
          </button>
        </div>

        {/* Card B: Quick AP Adoption */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-800">
                <Radio className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  2. Fanya Adoption ya AP
                </h3>
                <span className="text-[11px] text-emerald-600 font-bold">Adopt Access Point kupitia Open API</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tuma amri ya adoption kwenye TP-Link Access Point yoyote (EAP110, EAP225, EAP610, CPE210). Mfumo utaitambua na kuiunganisha kwenye site uliyochagua.
            </p>

            <div className="space-y-2 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Chagua Site</label>
                <select
                  value={adoptSiteId}
                  onChange={(e) => setAdoptSiteId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (ID: {s.id})
                    </option>
                  ))}
                  {sites.length === 0 && <option value="Default">Default Site</option>}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">AP MAC Address</label>
                <input
                  type="text"
                  value={adoptMac}
                  onChange={(e) => setAdoptMac(e.target.value)}
                  placeholder="50:D4:F7:XX:XX:XX"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Model ya AP</label>
                <select
                  value={adoptModel}
                  onChange={(e) => setAdoptModel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none"
                >
                  <option value="TP-Link Omada EAP610 (Wi-Fi 6 AX1800)">EAP610 / EAP610-Outdoor (Wi-Fi 6)</option>
                  <option value="TP-Link Omada EAP225 (AC1350 Gigabit)">EAP225 / EAP225-Outdoor (AC1350)</option>
                  <option value="TP-Link Omada EAP110-Outdoor (300Mbps)">EAP110 / EAP110-Outdoor (High Power)</option>
                  <option value="TP-Link Pharos CPE210 (2.4GHz Outdoor AP)">Pharos CPE210 / CPE220 / CPE510</option>
                  <option value="TP-Link Omada EAP670 (AX5400 Enterprise)">EAP670 / EAP650 Enterprise</option>
                </select>
              </div>
            </div>

            {adoptSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{adoptSuccess}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickAdoptAp}
            disabled={adoptingAp || !adoptMac.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {adoptingAp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
            <span>{adoptingAp ? 'Inatuma Amri ya Adoption...' : '📡 Fanya Adoption Kwenye Omada Sasa'}</span>
          </button>
        </div>

        {/* Card C: Quick Hotspot & Captive Portal Enabler */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800">
                <Zap className="w-5 h-5 text-amber-600" />
              </span>
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  3. Washa Hotspot & Portal
                </h3>
                <span className="text-[11px] text-amber-600 font-bold">Push External Web Portal & SSID</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sukuma External Web Portal URL na fungua jina la Wi-Fi (SSID) kwenye site uliyochagua ili wateja waanze kulipia vifurushi kwenye simu mara moja.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700">1. Chagua Site ya Omada</label>
                <select
                  value={hotspotSiteId}
                  onChange={(e) => setHotspotSiteId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.hotspot_enabled ? '🔥 Hotspot Active' : 'Haijawashwa'})
                    </option>
                  ))}
                  {sites.length === 0 && <option value="Default">Default Site</option>}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>2. Chagua Access Point (AP) Maalum</span>
                  <span className="text-[10px] text-emerald-700 font-bold">URL Unique kwa kila AP</span>
                </label>
                <select
                  value={selectedApRouterId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedApRouterId(val);
                    if (val !== 'AUTO' && val !== 'CUSTOM') {
                      const matched = omadaRouters.find(r => String(r.id) === val);
                      if (matched) {
                        if (matched.omada_site_id) setHotspotSiteId(matched.omada_site_id);
                        if (matched.ssid) setHotspotSsid(matched.ssid);
                      }
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-amber-500"
                >
                  <option value="AUTO">-- Chagua AP Kiotomatiki (Kutoka kwenye Site) --</option>
                  {omadaRouters.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      📡 {r.name} [{r.mac_address || 'Bila MAC'}] - {r.model_name || 'EAP'}
                    </option>
                  ))}
                  <option value="CUSTOM">✍️ Weka MAC Address ya AP Nyingine...</option>
                </select>
              </div>

              {selectedApRouterId === 'CUSTOM' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700">AP MAC Address ya Kipekee</label>
                  <input
                    type="text"
                    value={customApMacForHotspot}
                    onChange={(e) => setCustomApMacForHotspot(e.target.value)}
                    placeholder="50:D4:F7:XX:XX:XX"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 outline-none uppercase"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700">3. Jina la Wi-Fi (SSID)</label>
                <input
                  type="text"
                  value={hotspotSsid}
                  onChange={(e) => setHotspotSsid(e.target.value)}
                  placeholder="INFOTECH-HOTSPOT-WIFI"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-amber-500 uppercase"
                />
              </div>

              {/* Unique Captive Portal URL Display Box */}
              {(() => {
                const chosen = omadaRouters.find((r) => String(r.id) === selectedApRouterId);
                const activeMac = chosen?.mac_address || (customApMacForHotspot ? normalizeMac(customApMacForHotspot) : (omadaRouters[0]?.mac_address || ''));
                const activeRId = chosen?.id || (omadaRouters[0]?.id || undefined);
                const uniqueUrl = getUniqueApPortalUrl({
                  routerId: activeRId,
                  macAddress: activeMac,
                  siteId: hotspotSiteId,
                  vendor: 'omada',
                });

                return (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Unique Captive Portal URL:</span>
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono font-black">
                        {activeMac ? `MAC: ${activeMac}` : 'Per-AP Link'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-amber-200 font-mono text-[11px] text-amber-950 break-all select-all shadow-2xs">
                      {uniqueUrl}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(uniqueUrl, 'card_portal_unique')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold text-[11px] transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        {copiedKey === 'card_portal_unique' ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'card_portal_unique' ? 'Imenakiliwa!' : 'Nakili Unique URL'}</span>
                      </button>

                      <a
                        href={uniqueUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>⚡ Jaribu Portal</span>
                        <ExternalLink className="w-3 h-3 text-slate-300" />
                      </a>
                    </div>

                    <p className="text-[10px] text-amber-800/90 leading-tight">
                      URL hii inabeba kitambulisho cha MAC address ya AP hii maalum ili kila AP iwe na ukurasa wake unaotambua eneo na vifurushi vya biashara.
                    </p>
                  </div>
                );
              })()}
            </div>

            {hotspotSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">{hotspotSuccess}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleQuickEnableHotspot}
            disabled={enablingHotspot || !hotspotSsid.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {enablingHotspot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>{enablingHotspot ? 'Inawasha Hotspot Kwenye Omada...' : '🔥 Washa Hotspot Kwenye Omada Sasa'}</span>
          </button>
        </div>
      </div>

      {/* 4. Live Sites Table in Omada Controller */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <Globe className="w-4 h-4" />
              </span>
              <h3 className="font-black text-slate-900 text-sm sm:text-base">
                Orodha ya Sites Zilizopo Kwenye Omada Controller ({sites.length})
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Sites hizi zimesawazishwa moja kwa moja kutoka kwenye Omada SDN Controller kupitia API
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSites(true)}
              disabled={loadingSites}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSites ? 'animate-spin' : ''}`} />
              <span>Sawazisha kutoka Controller</span>
            </button>

            <a
              href={controllerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              <span>Fungua Omada Controller</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {loadingSites ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span className="text-xs font-semibold">Inavuta orodha ya Sites kutoka Omada Controller...</span>
          </div>
        ) : sites.length === 0 ? (
          <div className="py-10 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Radio className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">
              Bado hakuna Site iliyounganishwa au kusajiliwa. Tumia kisanduku cha{' '}
              <strong>"1. Tengeneza Site Kiotomatiki"</strong> hapo juu kuunda Site ya kwanza!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Jina la Site</th>
                  <th className="py-3 px-4">Omada Site ID</th>
                  <th className="py-3 px-4">RADIUS NAS IP</th>
                  <th className="py-3 px-4">Hali ya Hotspot</th>
                  <th className="py-3 px-4 text-right">Vitendo vya Haraka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {sites.map((site) => {
                  const siteAps = omadaRouters.filter(
                    (r) => r.omada_site_id === site.id || (r.location && r.location.toLowerCase() === site.name.toLowerCase())
                  );

                  return (
                    <tr key={site.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{site.name}</span>
                        </div>
                        {siteAps.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              APs Zilizopo Kwenye Site ({siteAps.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {siteAps.map((ap) => {
                                const apUrl = ap.unique_portal_url || getUniqueApPortalUrl({
                                  routerId: ap.id,
                                  macAddress: ap.mac_address,
                                  siteId: site.id,
                                  vendor: 'omada',
                                });

                                return (
                                  <div
                                    key={ap.id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50/90 border border-emerald-200 text-[11px] text-emerald-950 font-mono shadow-2xs"
                                  >
                                    <Radio className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="font-bold">{ap.name}</span>
                                    <span className="text-emerald-700 font-semibold">[{ap.mac_address || 'Bila MAC'}]</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(apUrl, `site_ap_${ap.id}`)}
                                      className="px-1.5 py-0.5 rounded bg-emerald-200/80 hover:bg-emerald-300 text-emerald-950 font-sans font-bold text-[10px] transition cursor-pointer"
                                      title="Nakili Unique Captive Portal URL kwa AP hii"
                                    >
                                      {copiedKey === `site_ap_${ap.id}` ? '✓ Imenakiliwa' : '📋 Nakili Unique URL'}
                                    </button>
                                    <a
                                      href={apUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-slate-400 hover:text-slate-800 p-0.5"
                                      title="Fungua Portal ya AP hii"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">{site.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-700 font-bold">
                        {site.nas_ip || '13.140.173.98'}
                      </td>
                      <td className="py-3.5 px-4">
                        {site.hotspot_enabled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            🔥 Hotspot Active ({site.ssid || 'INFOTECH'})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                            Bado Haijawashwa
                          </span>
                        )}
                      </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setAdoptSiteId(site.id);
                          window.scrollTo({ top: 400, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition cursor-pointer"
                      >
                        + Sajili AP
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setHotspotSiteId(site.id);
                          window.scrollTo({ top: 400, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-[11px] transition cursor-pointer"
                      >
                        🔥 Washa Hotspot
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Useful Inform URL & Port Information */}
      <div className="p-5 rounded-3xl bg-slate-100/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-slate-200 text-slate-700">
            <Server className="w-4 h-4" />
          </span>
          <div>
            <span className="font-bold text-slate-900 block">TP-Link Omada Inform URL kwa ajili ya APs:</span>
            <code className="text-emerald-700 font-mono font-bold">http://omada.infotechwifi.com:29810/inform</code>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleCopy('http://omada.infotechwifi.com:29810/inform', 'inform')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 transition cursor-pointer self-start sm:self-auto shrink-0"
        >
          {copiedKey === 'inform' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedKey === 'inform' ? 'Imenakiliwa!' : 'Nakili Inform URL'}</span>
        </button>
      </div>
    </div>
  );
};
