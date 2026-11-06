import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Radio,
  Server,
  Check,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Lock,
  Globe,
  Smartphone,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Zap,
  PlusCircle,
  Edit3,
} from 'lucide-react';
import { RouterItem, OmadaSiteItem } from '../../types/index.ts';

interface OmadaAdoptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adoptedRouter: RouterItem) => void;
  existingRouter?: RouterItem | null;
  ownerId?: number;
  ownerName?: string;
  lang?: 'sw' | 'en';
  initialStep?: number;
  onNavigatePortal?: (routerId: number) => void;
}

const OMADA_MODELS = [
  { model: 'EAP110', name: 'TP-Link Omada EAP110 (300Mbps Wireless N Ceiling Mount)', type: 'Ceiling' },
  { model: 'EAP110-Outdoor', name: 'TP-Link Omada EAP110-Outdoor (300Mbps High-Power Long Range)', type: 'Outdoor' },
  { model: 'EAP225', name: 'TP-Link Omada EAP225 (AC1350 Dual-Band Gigabit)', type: 'AC Wave 2' },
  { model: 'EAP225-Outdoor', name: 'TP-Link Omada EAP225-Outdoor (AC1200 Gigabit Waterproof)', type: 'Outdoor' },
  { model: 'EAP610', name: 'TP-Link Omada EAP610 (Wi-Fi 6 AX1800 Ceiling Mount)', type: 'Wi-Fi 6' },
  { model: 'EAP610-Outdoor', name: 'TP-Link Omada EAP610-Outdoor (AX1800 Wi-Fi 6 Outdoor AP)', type: 'Outdoor' },
  { model: 'EAP245', name: 'TP-Link Omada EAP245 (AC1750 High-Performance)', type: 'AC Wave 2' },
  { model: 'EAP650', name: 'TP-Link Omada EAP650 (Ultra-Slim AX3000 Wi-Fi 6)', type: 'Wi-Fi 6' },
  { model: 'EAP670', name: 'TP-Link Omada EAP670 (AX5400 Ultra-Speed Wi-Fi 6)', type: 'Wi-Fi 6' },
  { model: 'CPE210', name: 'TP-Link Pharos CPE210 (2.4GHz 300Mbps 9dBi Outdoor AP / CPE)', type: '2.4GHz Hotspot' },
  { model: 'CPE220', name: 'TP-Link Pharos CPE220 (2.4GHz 300Mbps 12dBi High-Power)', type: '2.4GHz High-Power' },
  { model: 'CPE510', name: 'TP-Link Pharos CPE510 (5GHz 300Mbps 13dBi PtP Bridge / AP)', type: '5GHz Bridge' },
  { model: 'CUSTOM', name: '✍️ Weka Custom Model / Model Nyingine...', type: 'Custom' },
];

export const OmadaAdoptionModal: React.FC<OmadaAdoptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingRouter,
  ownerId,
  ownerName,
  lang = 'sw',
  initialStep = 1,
  onNavigatePortal,
}) => {
  // Rodlink-Style Steps:
  // 1: Create Omada Site & Auto-Assign RADIUS NAS IP
  // 2: Claim AP (Select Site & MAC Address -> Auto Username & Password)
  // 3: Configure AP (Open AP GUI, Paste Credentials & Inform URL)
  // 4: Adapt AP (Check Status -> Adopted & Connected)
  // 5: Enable Hotspot (Push SSID & Captive Portal)
  const [activeStep, setActiveStep] = useState<number>(initialStep);

  // Sites list & creation
  const [sites, setSites] = useState<OmadaSiteItem[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [siteName, setSiteName] = useState(() => {
    return ownerName ? `${ownerName.replace(/[^a-zA-Z0-9]/g, '')}-Site` : 'Kariakoo-Hub';
  });
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedSite, setSelectedSite] = useState<OmadaSiteItem | null>(null);
  const [nasIp, setNasIp] = useState('13.140.173.98');
  const [creatingSite, setCreatingSite] = useState(false);
  const [siteCreatedSuccess, setSiteCreatedSuccess] = useState(false);
  const [siteCreationMode, setSiteCreationMode] = useState<'AUTOMATIC' | 'MANUAL'>('AUTOMATIC');
  const [manualSiteId, setManualSiteId] = useState('');
  const [canUseManualFallback, setCanUseManualFallback] = useState(false);

  // AP Claim State
  const [macAddress, setMacAddress] = useState('');
  const [selectedModel, setSelectedModel] = useState(OMADA_MODELS[0].name);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelText, setCustomModelText] = useState('');
  const [location, setLocation] = useState('Dar es Salaam, Kariakoo');
  const [brandName, setBrandName] = useState(ownerName || 'Kariakoo Fast Wi-Fi');
  const [claimingAp, setClaimingAp] = useState(false);
  const [apClaimedSuccess, setApClaimedSuccess] = useState(false);
  const [claimedRouter, setClaimedRouter] = useState<RouterItem | null>(null);

  // Auto-generated credentials for AP device account
  const [apUsername, setApUsername] = useState('admin');
  const [apPassword, setApPassword] = useState(() => 'Omada@' + Math.floor(1000 + Math.random() * 9000) + '!Tz');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedInform, setCopiedInform] = useState(false);
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);

  // Inform parameters
  const [informUrl, setInformUrl] = useState('http://omada.infotechwifi.com:29810/inform');
  const [apWebGuiUrl, setApWebGuiUrl] = useState('http://192.168.0.254');

  // Adoption & Polling State
  const [adapting, setAdapting] = useState(false);
  const [adoptionSuccess, setAdoptionSuccess] = useState(false);
  const [adoptedRouter, setAdoptedRouter] = useState<RouterItem | null>(null);
  const [adoptionFailedDetails, setAdoptionFailedDetails] = useState<string | null>(null);

  // Hotspot Enablement State
  const [ssid, setSsid] = useState('INFOTECH-HOTSPOT-WIFI');
  const [enablingHotspot, setEnablingHotspot] = useState(false);
  const [hotspotEnabledSuccess, setHotspotEnabledSuccess] = useState(false);
  const [portalUrl, setPortalUrl] = useState('https://infotechwifi.com');
  const [portalRedirectCountdown, setPortalRedirectCountdown] = useState<number | null>(null);
  const [countdownPaused, setCountdownPaused] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Omada Controller Credentials State
  const [controllerUrl, setControllerUrl] = useState('https://omada.infotechwifi.com:8043');
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'OPENAPI'>('CREDENTIALS');
  const [controllerUsername, setControllerUsername] = useState('admin');
  const [controllerPassword, setControllerPassword] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [omadacId, setOmadacId] = useState('5015eb6741252b75a3633605c471738f');
  const [showControllerPassword, setShowControllerPassword] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showControllerCreds, setShowControllerCreds] = useState(false);
  const [testingController, setTestingController] = useState(false);
  const [controllerVerified, setControllerVerified] = useState(false);
  const [controllerStatusMsg, setControllerStatusMsg] = useState('');

  // Fetch Omada Controller login credentials status
  const fetchControllerStatus = async () => {
    try {
      const res = await fetch('/api/v1/omada/controller-credentials');
      if (res.ok) {
        const data = await res.json();
        if (data.controllerUrl) setControllerUrl(data.controllerUrl);
        if (data.username) setControllerUsername(data.username);
        if (data.clientId) setClientId(data.clientId);
        if (data.omadacId) setOmadacId(data.omadacId);
        if (data.hasOpenApi) setAuthMode('OPENAPI');
        if (data.isConfigured) {
          setControllerVerified(true);
        } else {
          setShowControllerCreds(true);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleTestAndSaveController = async () => {
    if (authMode === 'CREDENTIALS' && (!controllerUsername.trim() || !controllerPassword.trim())) {
      setErrorMessage('Tafadhali weka Username na Password ya Omada Controller.');
      return;
    }
    if (authMode === 'OPENAPI' && (!clientId.trim() || !clientSecret.trim())) {
      setErrorMessage('Tafadhali weka Client ID na Client Secret za Omada Open API.');
      return;
    }

    setTestingController(true);
    setErrorMessage('');
    setControllerStatusMsg('');
    try {
      const payload = authMode === 'OPENAPI'
        ? {
            controllerUrl,
            clientId: clientId.trim(),
            clientSecret: clientSecret.trim(),
            omadacId: omadacId.trim() || '5015eb6741252b75a3633605c471738f',
          }
        : {
            controllerUrl,
            username: controllerUsername.trim(),
            password: controllerPassword.trim(),
          };

      const res = await fetch('/api/v1/omada/controller-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login ya Omada imeshindwa. Hakikisha taarifa ulizoweka ni sahihi.');
      }
      setControllerVerified(true);
      setControllerStatusMsg(authMode === 'OPENAPI' ? 'Omada Open API (Client Credentials) imethibitishwa kikamilifu!' : 'Akaunti ya Omada Controller imethibitishwa kikamilifu!');
      setTimeout(() => setControllerStatusMsg(''), 4000);
      fetchSites();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setTestingController(false);
    }
  };

  // Fetch existing Omada Sites from backend
  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      const url = ownerId ? `/api/v1/omada/sites?ownerId=${ownerId}` : '/api/v1/omada/sites';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSites(data);
        if (data.length > 0 && !selectedSiteId) {
          setSelectedSiteId(data[0].id);
          setSelectedSite(data[0]);
          if (data[0].nas_ip) setNasIp(data[0].nas_ip);
        }
      }
    } catch (e) {
      console.error('Error fetching sites:', e);
    } finally {
      setLoadingSites(false);
    }
  };

  // Fetch Controller Inform info
  const fetchInformConfig = async () => {
    try {
      const res = await fetch('/api/v1/omada/inform-info');
      if (res.ok) {
        const data = await res.json();
        if (data.informUrl) setInformUrl(data.informUrl);
        if (data.radiusIp) setNasIp(data.radiusIp);
      }
    } catch (e) {
      // Ignore
    }
  };

  // Generate random strong Omada AP device password
  const generateNewApPassword = () => 'Omada@' + Math.floor(1000 + Math.random() * 9000) + '!Tz';

  // Comprehensive reset to pristine clean state for new AP adoption or when starting over
  const resetToNewAp = (targetStep = 1) => {
    setActiveStep(targetStep);
    setMacAddress('');
    setSelectedModel(OMADA_MODELS[0].name);
    setIsCustomModel(false);
    setCustomModelText('');
    setClaimingAp(false);
    setApClaimedSuccess(false);
    setClaimedRouter(null);
    setApUsername('admin');
    setApPassword(generateNewApPassword());
    setShowPassword(false);
    setCopiedUsername(false);
    setCopiedPassword(false);
    setCopiedInform(false);
    setCopiedPortalUrl(false);
    setAdapting(false);
    setAdoptionSuccess(false);
    setAdoptedRouter(null);
    setEnablingHotspot(false);
    setHotspotEnabledSuccess(false);
    setSiteCreatedSuccess(false);
    setSiteCreationMode('AUTOMATIC');
    setManualSiteId('');
    setCanUseManualFallback(false);
    setAdoptionFailedDetails(null);
    setPortalRedirectCountdown(null);
    setCountdownPaused(false);
    setPortalUrl('https://infotechwifi.com');
    setErrorMessage('');
    const defaultBrand = ownerName || 'Kariakoo Fast Wi-Fi';
    setBrandName(defaultBrand);
    setSsid(`${defaultBrand.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-WIFI`);
    setLocation('Dar es Salaam, Kariakoo');
  };

  // Automated or manual direct transition to Captive Portal once Hotspot is enabled
  const handleGoToPortal = () => {
    const targetRouterId = adoptedRouter?.id || claimedRouter?.id || existingRouter?.id;
    if (targetRouterId && onNavigatePortal) {
      onClose();
      onNavigatePortal(targetRouterId);
    } else if (portalUrl) {
      window.open(portalUrl, '_blank');
    }
  };

  useEffect(() => {
    if (portalRedirectCountdown === null || countdownPaused) return;

    if (portalRedirectCountdown <= 0) {
      handleGoToPortal();
      return;
    }

    const timer = setTimeout(() => {
      setPortalRedirectCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [portalRedirectCountdown, countdownPaused]);

  useEffect(() => {
    if (isOpen) {
      fetchSites();
      fetchInformConfig();
      fetchControllerStatus();

      if (existingRouter) {
        // Load existing router details strictly
        setMacAddress(existingRouter.mac_address || '');
        setBrandName(existingRouter.brand_name || ownerName || 'Kariakoo Fast Wi-Fi');
        setSsid(
          existingRouter.ssid ||
          `${(existingRouter.brand_name || existingRouter.name || 'HOTSPOT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-WIFI`
        );
        setLocation(existingRouter.location || 'Dar es Salaam, Kariakoo');
        setApUsername(existingRouter.ap_username || 'admin');
        setApPassword(existingRouter.ap_password || generateNewApPassword());
        setClaimedRouter(existingRouter);
        setPortalUrl(`https://infotechwifi.com/?routerId=${existingRouter.id}&ap_vendor=omada`);
        setErrorMessage('');
        setAdoptionFailedDetails(null);

        if (existingRouter.adoption_status === 'ADOPTED') {
          setActiveStep(initialStep && initialStep !== 1 ? initialStep : 4);
          setAdoptionSuccess(true);
          setAdoptedRouter(existingRouter);
          setApClaimedSuccess(true);
        } else if (existingRouter.adoption_status === 'CLAIMED') {
          setActiveStep(initialStep && initialStep !== 1 ? initialStep : 3);
          setApClaimedSuccess(true);
          setAdoptionSuccess(false);
          setAdoptedRouter(null);
        } else {
          setActiveStep(initialStep || 1);
          setApClaimedSuccess(false);
          setAdoptionSuccess(false);
          setAdoptedRouter(null);
        }
      } else {
        // Pristine clean slate: No stale data from any deleted or previous AP!
        resetToNewAp(initialStep || 1);
      }
    }
  }, [isOpen, existingRouter, ownerName, initialStep]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // STEP 1: CREATE OMADA SITE & AUTO-ASSIGN RADIUS NAS IP
  // ---------------------------------------------------------------------------
  const handleCreateSite = async () => {
    if (!siteName.trim()) {
      setErrorMessage('Tafadhali weka jina la Site (Site Name).');
      return;
    }

    setCreatingSite(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/v1/omada/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName.trim(),
          nasIp,
          ownerId,
          region: 'Tanzania',
          timeZone: 'Africa/Dar_es_Salaam',
          scenario: 'Office',
          controllerUsername: controllerUsername.trim() || undefined,
          controllerPassword: controllerPassword.trim() || undefined,
          controllerUrl: controllerUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Imeshindwa kutengeneza Site kwenye Omada Controller.');
      }

      setSiteCreatedSuccess(true);
      setControllerVerified(true);
      setSelectedSiteId(data.site.id);
      setSelectedSite(data.site);
      if (data.site.nas_ip) setNasIp(data.site.nas_ip);
      await fetchSites();

      // Smooth transition to step 2 after brief notification
      setTimeout(() => {
        setActiveStep(2);
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Hitilafu ya uundaji wa Site.');
      setCanUseManualFallback(true);
      if (
        err.message &&
        (err.message.includes('-30109') ||
          err.message.includes('Invalid username or password') ||
          err.message.includes('Login imeshindwa'))
      ) {
        setShowControllerCreds(true);
      }
    } finally {
      setCreatingSite(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 1 (MANUAL): SAVE SITE MANUALLY & PROCEED TO STEP 2 DIRECTLY
  // ---------------------------------------------------------------------------
  const handleManualCreateSite = async () => {
    if (!siteName.trim()) {
      setErrorMessage('Tafadhali weka jina la Site (Site Name).');
      return;
    }

    setCreatingSite(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/v1/omada/sites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: siteName.trim(),
          nasIp: nasIp || '13.140.173.98',
          ownerId,
          isManual: true,
          siteId: manualSiteId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Imeshindwa kuhifadhi Site manually.');
      }

      setSiteCreatedSuccess(true);
      setSelectedSiteId(data.site.id);
      setSelectedSite(data.site);
      if (data.site.nas_ip) setNasIp(data.site.nas_ip);
      await fetchSites();

      // Smooth transition to step 2
      setTimeout(() => {
        setActiveStep(2);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Hitilafu ya kuhifadhi Site manually.');
    } finally {
      setCreatingSite(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 2: CLAIM ACCESS POINT (AP)
  // ---------------------------------------------------------------------------
  const handleClaimAp = async () => {
    if (!selectedSiteId) {
      setErrorMessage('Tafadhali chagua Site uliyotengeneza.');
      return;
    }
    if (!macAddress.trim()) {
      setErrorMessage('Tafadhali weka MAC Address ya Access Point (mfano: 50:D4:F7:2B:8C:1A).');
      return;
    }

    setClaimingAp(true);
    setErrorMessage('');
    const effectiveModel = isCustomModel ? customModelText.trim() || 'Custom AP' : selectedModel;

    try {
      const res = await fetch('/api/v1/omada/sites/claim-ap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          macAddress: macAddress.trim(),
          modelName: effectiveModel,
          location,
          brandName,
          ownerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Imeshindwa ku-claim AP.');
      }

      setApClaimedSuccess(true);
      setClaimedRouter(data.router);
      if (data.router?.id) {
        setPortalUrl(`https://infotechwifi.com/?routerId=${data.router.id}&ap_vendor=omada`);
      }
      if (data.router?.ssid) {
        setSsid(data.router.ssid);
      } else if (brandName) {
        setSsid(`${brandName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 14)}-HOTSPOT`);
      }
      if (data.apUsername) setApUsername(data.apUsername);
      if (data.apPassword) setApPassword(data.apPassword);
      if (data.informUrl) setInformUrl(data.informUrl);
      if (data.apWebGui) setApWebGuiUrl(data.apWebGui);

      // Advance to step 3 (Configure AP GUI)
      setTimeout(() => {
        setActiveStep(3);
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Hitilafu ya ku-claim AP.');
    } finally {
      setClaimingAp(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 4: ADAPT AP ON OMADA CONTROLLER (STRICT STATE PARITY)
  // ---------------------------------------------------------------------------
  const handleAdaptAp = async (overridePassword?: string) => {
    setAdapting(true);
    setErrorMessage('');
    setAdoptionFailedDetails(null);
    const passToUse = overridePassword !== undefined ? overridePassword : apPassword;
    if (overridePassword !== undefined) {
      setApPassword(overridePassword);
    }

    try {
      const res = await fetch('/api/v1/omada/sites/adapt-ap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          macAddress: macAddress.trim(),
          routerId: claimedRouter?.id || existingRouter?.id,
          apUsername: apUsername.trim(),
          apPassword: passToUse.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorText = data.error || data.message || 'Adoption imeshindikana kwenye Omada Controller.';
        setAdoptionFailedDetails(errorText);
        setAdoptionSuccess(false);
        throw new Error(errorText);
      }

      // STRICT PARITY CONFIRMED: Controller status is CONNECTED
      setAdoptionSuccess(true);
      setAdoptionFailedDetails(null);
      setAdoptedRouter(data.router);
      if (data.router?.id) {
        setPortalUrl(`https://infotechwifi.com/?routerId=${data.router.id}&ap_vendor=omada`);
      }
      if (data.router) {
        onSuccess(data.router);
      }

      // Automatically move to step 5 (Enable Hotspot)
      setTimeout(() => {
        setActiveStep(5);
      }, 1000);
    } catch (err: any) {
      setAdoptionSuccess(false);
      setErrorMessage(err.message || 'Hitilafu ya ku-adopt AP.');
    } finally {
      setAdapting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // STEP 5: ENABLE HOTSPOT & CAPTIVE PORTAL (WITH DIRECT TRANSITION)
  // ---------------------------------------------------------------------------
  const handleEnableHotspot = async () => {
    if (!ssid.trim()) {
      setErrorMessage('Tafadhali weka jina la mtandao wa Wi-Fi (SSID).');
      return;
    }

    setEnablingHotspot(true);
    setErrorMessage('');
    try {
      const targetRouterId = adoptedRouter?.id || claimedRouter?.id || existingRouter?.id;
      const res = await fetch('/api/v1/omada/sites/enable-hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSiteId,
          routerId: targetRouterId,
          ssid: ssid.trim(),
          portalUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Imeshindwa kuwasha Hotspot.');
      }

      setHotspotEnabledSuccess(true);
      if (data.portalUrl) setPortalUrl(data.portalUrl);
      if (data.router) {
        setAdoptedRouter(data.router);
        onSuccess(data.router);
      }
      // Start direct redirect countdown to Captive Portal (3 seconds)
      setPortalRedirectCountdown(3);
      setCountdownPaused(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Hitilafu ya kuwasha huduma ya Hotspot.');
    } finally {
      setEnablingHotspot(false);
    }
  };

  const formatMacInput = (value: string) => {
    const hex = value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 12);
    const formatted = hex.match(/.{1,2}/g)?.join(':') || hex;
    setMacAddress(formatted);
  };

  const handleCopyText = (text: string, type: 'username' | 'password' | 'inform' | 'portal') => {
    navigator.clipboard.writeText(text);
    if (type === 'username') {
      setCopiedUsername(true);
      setTimeout(() => setCopiedUsername(false), 2000);
    } else if (type === 'password') {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } else if (type === 'inform') {
      setCopiedInform(true);
      setTimeout(() => setCopiedInform(false), 2000);
    } else if (type === 'portal') {
      setCopiedPortalUrl(true);
      setTimeout(() => setCopiedPortalUrl(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
              <Wifi className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  TP-Link Omada Controller Hotspot Engine
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                  Rodlink Architecture
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Uundaji wa Site, Ku-claim AP, Adoption, na Kuwasha Hotspot Captive Portal bila MikroTik router.
              </p>

              {/* Status Indicator & Fresh AP Mode */}
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                {existingRouter ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-[11px] text-indigo-200 font-semibold">
                    <span>Inakagua: <strong className="text-white">{existingRouter.name || existingRouter.mac_address}</strong></span>
                    <button
                      type="button"
                      onClick={() => resetToNewAp(1)}
                      className="ml-1.5 px-2 py-0.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded text-[10px] font-black transition cursor-pointer"
                      title="Badilisha na uanze ku-adopt AP Mpya bila taarifa za kifaa kilichofutwa"
                    >
                      ➕ Anza AP Mpya
                    </button>
                  </div>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-400" />
                    <span>🟢 Usajili wa AP Mpya (Fresh AP Adoption)</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => resetToNewAp(1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border border-slate-700"
                  title="Futa data zote zilizojazwa na uanze upya hatua ya 1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Anza Upya (Reset)</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rodlink 5-Step Progress Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none text-xs">
          {[
            { num: 1, title: '1. Create Site & NAS' },
            { num: 2, title: '2. Claim AP' },
            { num: 3, title: '3. Paste kwenye AP' },
            { num: 4, title: '4. Adapt AP' },
            { num: 5, title: '5. Enable Hotspot' },
          ].map((s) => {
            const isCurrent = activeStep === s.num;
            const isCompleted = activeStep > s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setActiveStep(s.num)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                    : isCompleted
                    ? 'bg-slate-800 text-teal-300 hover:bg-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isCurrent
                      ? 'bg-slate-950 text-teal-300'
                      : isCompleted
                      ? 'bg-teal-500/20 text-teal-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 text-teal-400" /> : s.num}
                </span>
                <span>{s.title}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2 text-xs text-rose-800 font-semibold">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
              </div>
              {activeStep === 1 && (
                <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-rose-700">
                    💡 Je, unataka kuweka Site hii manually ili uendelee moja kwa moja Hatua ya 2 bila kukwama?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSiteCreationMode('MANUAL');
                      setErrorMessage('');
                    }}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <span>Tumia Njia ya Manual &rarr;</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 1: CREATE OMADA SITE & AUTO-ASSIGN RADIUS NAS IP             */}
          {/* ================================================================= */}
          {activeStep === 1 && (
            <div className="space-y-5">
              <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl text-teal-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Hatua ya 1: Uundaji wa Site na RADIUS NAS IP Kiotomatiki</span>
                </div>
                <p className="text-xs text-teal-800 leading-relaxed">
                  Mfumo unatuma ombi la kutengeneza <strong>Site mpya</strong> kwenye Omada Controller (<code>omada.infotechwifi.com</code>) na <strong>kuzalisha moja kwa moja RADIUS NAS IP</strong> kwa ajili ya kuthibitisha wateja watakaonunua vocha.
                </p>
              </div>

              {/* Omada Controller Admin Credentials Card */}
              <div
                className={`p-4 rounded-2xl border transition ${
                  controllerVerified
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-amber-50/90 border-amber-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Lock className={`w-4 h-4 ${controllerVerified ? 'text-emerald-700' : 'text-amber-700'}`} />
                    <span className="text-xs font-black text-slate-900">
                      Akaunti ya Omada Controller (Admin Credentials):
                    </span>
                    {controllerVerified ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Imeunganishwa
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                        Inahitaji Password
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowControllerCreds(!showControllerCreds)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                  >
                    {showControllerCreds ? 'Ficha Mipangilio ▴' : 'Onyesha / Weka Password ▾'}
                  </button>
                </div>

                {controllerStatusMsg && (
                  <div className="mt-2 text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{controllerStatusMsg}</span>
                  </div>
                )}

                {showControllerCreds && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-3">
                    {/* Auth Mode Toggle */}
                    <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setAuthMode('CREDENTIALS')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          authMode === 'CREDENTIALS'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🔑 Username & Password
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('OPENAPI')}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                          authMode === 'OPENAPI'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚡ Omada Open API (Client ID)
                      </button>
                    </div>

                    {authMode === 'CREDENTIALS' ? (
                      <>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Weka <strong>Username</strong> na <strong>Password</strong> ya Administrator wa Omada Controller (<code>https://omada.infotechwifi.com</code>).
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Omada Admin Username:
                            </label>
                            <input
                              type="text"
                              value={controllerUsername}
                              onChange={(e) => setControllerUsername(e.target.value)}
                              placeholder="mfano: admin au jina uliloweka"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Omada Admin Password:
                            </label>
                            <div className="relative">
                              <input
                                type={showControllerPassword ? 'text' : 'password'}
                                value={controllerPassword}
                                onChange={(e) => setControllerPassword(e.target.value)}
                                placeholder="Password ya Omada Controller"
                                className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                              />
                              <button
                                type="button"
                                onClick={() => setShowControllerPassword(!showControllerPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showControllerPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Omada Open API hutumia <strong>Client ID</strong> na <strong>Client Secret</strong> kupata Access Token moja kwa moja bila hofu ya nenosiri kubadilika.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Open API Client ID:
                            </label>
                            <input
                              type="text"
                              value={clientId}
                              onChange={(e) => setClientId(e.target.value)}
                              placeholder="Weka Client ID kutoka Omada Open API"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Open API Client Secret:
                            </label>
                            <div className="relative">
                              <input
                                type={showClientSecret ? 'text' : 'password'}
                                value={clientSecret}
                                onChange={(e) => setClientSecret(e.target.value)}
                                placeholder="Weka Client Secret"
                                className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowClientSecret(!showClientSecret)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Omada Controller ID (omadacId):
                            </label>
                            <input
                              type="text"
                              value={omadacId}
                              onChange={(e) => setOmadacId(e.target.value)}
                              placeholder="5015eb6741252b75a3633605c471738f"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-mono">
                        Host: {controllerUrl}
                      </span>
                      <button
                        type="button"
                        onClick={handleTestAndSaveController}
                        disabled={
                          testingController ||
                          (authMode === 'CREDENTIALS' ? !controllerPassword.trim() : !clientId.trim() || !clientSecret.trim())
                        }
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {testingController ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Inathibitisha...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                            <span>Thibitisha na Hifadhi (Test & Save)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Existing Sites Selector (if any) */}
              {sites.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      Chagua Site Iliyopo au Unda Mpya:
                    </label>
                    <span className="text-[11px] text-teal-600 font-mono font-bold">
                      {sites.length} Sites Zipo Tayari
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedSiteId}
                      onChange={(e) => {
                        const sid = e.target.value;
                        setSelectedSiteId(sid);
                        const match = sites.find((s) => s.id === sid);
                        if (match) {
                          setSelectedSite(match);
                          setSiteName(match.name);
                          if (match.nas_ip) setNasIp(match.nas_ip);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                    >
                      <option value="">-- Chagua Site Iliyopo --</option>
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (NAS IP: {s.nas_ip || '13.140.173.98'} • {s.status})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSiteId) {
                          setActiveStep(2);
                        }
                      }}
                      disabled={!selectedSiteId}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Tumia Hii &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* Create New Site Form (With Automatic vs Manual Tabs) */}
              <div className="border border-slate-200 p-5 rounded-2xl bg-white space-y-4 shadow-2xs">
                {/* Mode Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      setSiteCreationMode('AUTOMATIC');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      siteCreationMode === 'AUTOMATIC'
                        ? 'bg-white text-teal-800 shadow-xs border border-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-teal-600" />
                    <span>⚡ Kiotomatiki (Omada API)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSiteCreationMode('MANUAL');
                      setErrorMessage('');
                    }}
                    className={`flex-1 py-2 px-3 text-xs font-black rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      siteCreationMode === 'MANUAL'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>✍️ Weka Manually (Manual Site)</span>
                  </button>
                </div>

                {siteCreationMode === 'AUTOMATIC' ? (
                  <>
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-teal-600" />
                      <span>Unda Omada Site Kiotomatiki:</span>
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Jina la Site (Site Name):
                      </label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="mfano: Mwatulole au Kariakoo-Hub"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Jina la kituo chako litakalotengenezwa kiotomatiki kwenye Omada Controller.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">RADIUS NAS IP (Inazalishwa Kiotomatiki):</span>
                        <strong className="text-teal-700 font-mono font-bold">{nasIp}</strong>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Anwani hii ya RADIUS NAS inatumika kuwasiliana na Omada Controller kwa ajili ya ukaguzi wa vifurushi na vocha.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreateSite}
                      disabled={creatingSite || !siteName.trim()}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {creatingSite ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Inatengeneza Site na Kuunganisha RADIUS NAS IP...</span>
                        </>
                      ) : siteCreatedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Site Imetengenezwa Kikamilifu! Inahamia Hatua ya 2...</span>
                        </>
                      ) : (
                        <>
                          <span>Tengeneza Site Kiotomatiki & Unganisha (Create & Link Site)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl space-y-1 text-emerald-950">
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Njia ya Manual: Endelea Moja kwa Moja Hatua ya 2</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Kama tayari umetengeneza Site ndani ya <strong>Omada Controller GUI</strong> (au unataka kusajili jina la Site manually bila kupitia API), ingiza jina hapa kisha bofya kitufe cha chini kuendelea na <strong>Hatua ya 2 (Claim Access Point)</strong> mara moja.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Jina la Site (Site Name): <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="mfano: Mwatulole"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Omada Site ID (Hiari / Optional):
                      </label>
                      <input
                        type="text"
                        value={manualSiteId}
                        onChange={(e) => setManualSiteId(e.target.value)}
                        placeholder="mfano: Default au acha wazi ili izalishe yenyewe"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Kama unajua Site ID kutoka kwenye kivinjari chako cha Omada Controller (k.m. Default), unaweza kuiweka hapa, au iache wazi mfumo utaiweka yenyewe.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        RADIUS NAS IP:
                      </label>
                      <input
                        type="text"
                        value={nasIp}
                        onChange={(e) => setNasIp(e.target.value)}
                        placeholder="13.140.173.98"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-teal-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleManualCreateSite}
                      disabled={creatingSite || !siteName.trim()}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {creatingSite ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Inahifadhi Site na Kuandaa Hatua ya 2...</span>
                        </>
                      ) : siteCreatedSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Imehifadhiwa! Inahamia Hatua ya 2...</span>
                        </>
                      ) : (
                        <>
                          <span>Hifadhi Site Hii & Endelea Hatua ya 2 (Claim AP)</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: CLAIM AP (SELECT SITE & AP MAC ADDRESS)                   */}
          {/* ================================================================= */}
          {activeStep === 2 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl text-blue-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-900">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Hatua ya 2: Claim Access Point (AP) Kwenye Site Hii</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Chagua Site uliyotengeneza kisha weka <strong>MAC Address</strong> ya Access Point yako. Mfumo utakupa Username na Password maalum ya kuweka kwenye AP.
                </p>
              </div>

              {/* Informative notice if existingRouter is active */}
              {existingRouter && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div>
                    <span className="font-bold">Unakagua taarifa za kifaa:</span> <span className="font-mono font-bold text-amber-950">{existingRouter.name} ({existingRouter.mac_address || 'Bila MAC'})</span>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Kama unataka kusajili <strong>AP nyingine mpya</strong> (au kama hii ilishafutwa), bofya kitufe cha kulia:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetToNewAp(2)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Sajili AP Mpya</span>
                  </button>
                </div>
              )}

              <div className="border border-slate-200 p-5 rounded-2xl bg-white space-y-4 shadow-2xs">
                {/* Site Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    1. Site Iliyochaguliwa (Selected Site):
                  </label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => {
                      setSelectedSiteId(e.target.value);
                      const m = sites.find((s) => s.id === e.target.value);
                      if (m) setSelectedSite(m);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (NAS IP: {s.nas_ip || '13.140.173.98'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* MAC Address Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Weka MAC Address ya Access Point (AP):
                  </label>
                  <input
                    type="text"
                    value={macAddress}
                    onChange={(e) => formatMacInput(e.target.value)}
                    placeholder="50:D4:F7:2B:8C:1A au 50D4F72B8C1A"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-teal-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Angalia lebo iliyopo chini ya kifaa chako cha TP-Link Omada (Imeandikwa MAC au MAC Address).
                  </p>
                </div>

                {/* AP Model */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Model ya Access Point (AP Model):
                  </label>
                  <select
                    value={isCustomModel ? 'CUSTOM' : selectedModel}
                    onChange={(e) => {
                      if (e.target.value === 'CUSTOM') {
                        setIsCustomModel(true);
                      } else {
                        setIsCustomModel(false);
                        setSelectedModel(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                  >
                    {OMADA_MODELS.map((m) => (
                      <option key={m.model} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isCustomModel && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Andika Jina la Model Yako:
                    </label>
                    <input
                      type="text"
                      value={customModelText}
                      onChange={(e) => setCustomModelText(e.target.value)}
                      placeholder="mfano: TP-Link Omada EAP225-Outdoor"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleClaimAp}
                  disabled={claimingAp || !macAddress.trim() || !selectedSiteId}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {claimingAp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Ina-claim AP na kutoa taarifa za kuingia...</span>
                    </>
                  ) : apClaimedSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>AP Ime-claimiwa Kikamilifu! Inahamia Hatua ya 3...</span>
                    </>
                  ) : (
                    <>
                      <span>Claim AP Kwenye Site Hii</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: PASTE CREDENTIALS & INFORM URL INTO AP WEB GUI           */}
          {/* ================================================================= */}
          {activeStep === 3 && (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Hatua ya 3: Weka Taarifa Zifuatazo Kwenye Ukurasa wa AP Yako</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Mfumo umekuzalishia <strong>Username</strong> na <strong>Neno la Siri (Password)</strong> thabiti, pamoja na <strong>Controller Inform URL</strong> ya <code>omada.infotechwifi.com</code>. Nakili na uzibandike kwenye ukurasa wa AP.
                </p>
              </div>

              {/* Credentials Copy Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Username */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Username ya AP:</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-slate-900">{apUsername}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(apUsername, 'username')}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUsername ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUsername ? 'Nakili!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Password ya AP:</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-slate-900">
                      {showPassword ? apPassword : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(apPassword, 'password')}
                      className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPassword ? 'Nakili!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Controller Inform URL */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-teal-300 font-bold">
                    👉 Controller Inform URL ya Kubandika kwenye AP:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(informUrl, 'inform')}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedInform ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedInform ? 'Imenakiliwa!' : 'Nakili URL'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-emerald-300 break-all border border-slate-800">
                  {informUrl}
                </div>
                <p className="text-[11px] text-slate-400">
                  Kwenye ukurasa wa AP (Management &rarr; Controller Settings), bandika URL hii kisha ubonyeze Save/Apply.
                </p>
              </div>

              {/* AP Setup Instructions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs text-slate-700">
                <strong className="block text-slate-900 font-bold">Mwongozo wa Hatua kwa Hatua:</strong>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    Fungua kivinjari chako na uingie kwenye ukurasa wa AP:
                    <a
                      href={apWebGuiUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 font-bold ml-1 hover:underline"
                    >
                      <span>{apWebGuiUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Weka Username na Password uliyopewa hapo juu (au <code>admin/admin</code> kwa kifaa kipya).</li>
                  <li>Nenda sehemu ya <strong>Controller Settings / Management</strong>.</li>
                  <li>Kwenye kisanduku cha <strong>Controller Inform URL</strong>, bandika URL ya hapo juu na ubofye <strong>Save / Apply</strong>.</li>
                </ol>
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  &larr; Rudi Hatua ya 2
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep(4)}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Nimeweka kwenye AP, Endelea na Adoption</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: ADAPT AP (WAIT & CONNECT WITH STRICT PARITY)              */}
          {/* ================================================================= */}
          {activeStep === 4 && (
            <div className="space-y-5">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl text-indigo-950 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm text-indigo-900">
                  <Radio className="w-4 h-4 text-indigo-600" />
                  <span>Hatua ya 4: Unganisha na U-adopt Access Point (AP)</span>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Mfumo unathibitisha na kusubiri Omada Controller ikamilishe adoption ya AP ya MAC <code>{macAddress || '(Haijawekwa)'}</code>. Usawa unadumishwa kati ya Omada Controller na Infotech WiFi ili kuzuia taarifa zisizo sahihi.
                </p>
              </div>

              {!macAddress.trim() && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Hujaweka MAC Address ya AP unayotaka ku-adopt. Tafadhali rudi Hatua ya 2 uweke MAC Address.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(2)}
                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Rudi Hatua ya 2 &rarr;
                  </button>
                </div>
              )}

              {/* Adoption Failure Alert (When Omada Controller Reports Failed or Bad Password) */}
              {adoptionFailedDetails && (
                <div className="p-5 bg-rose-50 border-2 border-rose-300 rounded-3xl space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-rose-950">
                          ⚠️ Adoption Imeshindikana Kwenye Omada Controller
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-mono font-bold">
                          CONTROLLER STATUS: ADOPT_FAILED
                        </span>
                      </div>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        {adoptionFailedDetails}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white/90 border border-rose-200 rounded-2xl text-xs space-y-2">
                    <p className="text-[11px] text-slate-700 font-medium">
                      💡 <strong>Sababu Kuu:</strong> AP za TP-Link Omada zikiwa mpya au baada ya ku-reset zinatumia nenosiri la kiwandani: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-teal-700">admin</code>. Kama uliweka nenosiri lingine kwenye AP GUI, hakikisha unaliweka hapa chini:
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleAdaptAp('admin')}
                        disabled={adapting}
                        className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>🔑 Jaribu kwa Nenosiri: "admin" (Default)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdaptAp()}
                        disabled={adapting}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>🔄 Jaribu Tena na Nenosiri Lililopo</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* AP Device Account Configuration on Step 4 */}
              <div className="border border-slate-200 p-4 rounded-2xl bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-slate-600" />
                    <span>Nenosiri la Kifaa cha AP (Device Account):</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    MAC: {macAddress || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Username ya Kifaa cha AP:
                    </label>
                    <input
                      type="text"
                      value={apUsername}
                      onChange={(e) => setApUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Password ya Kifaa cha AP:
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={apPassword}
                        onChange={(e) => setApPassword(e.target.value)}
                        placeholder="Nenosiri la AP (mfano: admin au uliloweka)"
                        className="w-full px-3 py-2 pr-9 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setApPassword('admin')}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition cursor-pointer"
                  >
                    Weka "admin" (Factory Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setApPassword(generateNewApPassword())}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium transition cursor-pointer"
                  >
                    🎲 Zalisha Nenosiri Jipya
                  </button>
                </div>
              </div>

              {adoptionSuccess ? (
                <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-3xl text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h4 className="text-base font-black text-emerald-950">
                    AP ya TP-Link Omada Imeunganishwa Kikamilifu (Connected)!
                  </h4>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Kifaa kipo ONLINE na kimeunganishwa na Controller ya <code>omada.infotechwifi.com</code>. Usawa wa Controller na mfumo umethibitishwa. Sasa bonyeza kitufe cha chini ili kuwasha Wi-Fi na Captive Portal.
                  </p>

                  <div className="p-3 bg-white/80 rounded-2xl border border-emerald-200 inline-flex flex-wrap gap-4 text-xs font-mono font-bold text-slate-800 justify-center">
                    <span>MAC: {macAddress}</span>
                    <span className="text-emerald-700">CONTROLLER: CONNECTED</span>
                    <span>Firmware: v5.0.12</span>
                  </div>

                  <div className="pt-2 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => resetToNewAp(2)}
                      className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>➕ Unganisha AP Nyingine</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveStep(5)}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Endelea Kuwasha Hotspot & Captive Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 p-6 rounded-3xl bg-white text-center space-y-4">
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Bofya kitufe cha chini kuthibitisha Adoption:
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Controller itawasiliana na AP kwa kutumia nenosiri lililowekwa hapo juu na kuthibitisha muunganisho halisi.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleAdaptAp()}
                      disabled={adapting || !macAddress.trim()}
                      className="w-full sm:w-auto px-7 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {adapting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Inakagua Controller...</span>
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" />
                          <span>Kagua na U-adopt AP Sasa (Adapt AP)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdaptAp()}
                      disabled={adapting || !macAddress.trim()}
                      className="w-full sm:w-auto px-5 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 shadow-md transition inline-flex items-center justify-center gap-2 cursor-pointer"
                      title="Kama uli-adopt moja kwa moja kwenye Controller kwa manual, bofya hapa kuthibitisha"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-400" />
                      <span>Thibitisha Manual Adoption (Ipo Connected Tayari)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 5: ENABLE HOTSPOT SERVICE & DIRECT CAPTIVE PORTAL REDIRECT   */}
          {/* ================================================================= */}
          {activeStep === 5 && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 rounded-3xl border border-emerald-800/50 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                  <Wifi className="w-5 h-5 text-emerald-400" />
                  <span>Hatua ya Mwisho: Kuwasha Huduma ya Hotspot & Captive Portal</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Weka jina la Wi-Fi (SSID) linalotakiwa kurushwa hewani. Mara tu hotspot ikishawashwa, utapelekwa moja kwa moja kwenye Captive Portal ili mteja au mmiliki aweze kujaribu au kulipia vifurushi papo hapo kwa simu.
                </p>
              </div>

              {hotspotEnabledSuccess ? (
                <div className="p-6 bg-emerald-50 border-2 border-emerald-400 rounded-3xl text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                    <Check className="w-9 h-9 stroke-[3]" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-emerald-950">
                      🎉 HONGERA! HOTSPOT NA CAPTIVE PORTAL ZIPO HEWANI!
                    </h4>
                    <p className="text-xs text-emerald-800 max-w-md mx-auto mt-1 leading-relaxed">
                      Wi-Fi <strong>"{ssid}"</strong> sasa inarusha mtandao. Kifaa na Controller zimeunganishwa kikamilifu.
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-emerald-200 text-xs text-left max-w-md mx-auto space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Wi-Fi SSID:</span>
                      <strong className="text-emerald-700">{ssid}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Hali:</span>
                      <strong className="text-emerald-600">CONNECTED & ONLINE</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Portal Redirect:</span>
                      <span className="text-teal-700 break-all text-[11px]">{portalUrl}</span>
                    </div>
                  </div>

                  {/* Direct Redirection Section to Captive Portal */}
                  <div className="p-5 bg-gradient-to-br from-white to-teal-50/60 rounded-3xl border-2 border-teal-500/40 shadow-md max-w-lg mx-auto space-y-3">
                    <div className="flex items-center justify-center gap-2 text-teal-950 font-black text-sm">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>ELEKEZA KWENYE CAPTIVE PORTAL KULIPIA VIFURUSHI</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Mteja anayejiunga na Wi-Fi hii ataelekezwa hapa kulipia kwa M-Pesa, Tigo Pesa, Airtel Money, Halopesa au kuingiza vocha.
                    </p>

                    {portalRedirectCountdown !== null && portalRedirectCountdown > 0 && !countdownPaused ? (
                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs font-bold">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                        <span>Inakuelekeza kwenye Captive Portal baada ya sekunde <strong>{portalRedirectCountdown}</strong>...</span>
                        <button
                          type="button"
                          onClick={() => setCountdownPaused(true)}
                          className="ml-2 text-slate-500 hover:text-slate-800 underline text-[11px] cursor-pointer"
                        >
                          Sitisha
                        </button>
                      </div>
                    ) : null}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleGoToPortal}
                        className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-teal-700/25 transition flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>🚀 Fungua Captive Portal Moja kwa Moja (Lipia / Jaribu WiFi)</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => resetToNewAp(2)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>➕ Sajili / Unganisha AP Nyingine</span>
                    </button>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                    >
                      Kamilisha (Done)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 p-5 rounded-3xl bg-white space-y-4 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Jina la Wi-Fi (SSID) Litakaloonekana kwenye Simu za Wateja:
                    </label>
                    <input
                      type="text"
                      value={ssid}
                      onChange={(e) => setSsid(e.target.value)}
                      placeholder="mfano: KARIAKOO-FREE-WIFI au TZWIFI-HOTSPOT"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-teal-800 focus:outline-none focus:border-teal-500 focus:bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mtandao huu utakuwa Open bila password ili simu ikijiunga ifungue ukurasa wa Sign-in.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Captive Portal URL (Ukurasa wa Malipo):
                    </label>
                    <input
                      type="text"
                      value={portalUrl}
                      onChange={(e) => setPortalUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-teal-900">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Kiotomatiki Kwenye Omada Controller:</span>
                    </div>
                    <p className="text-[11px] text-teal-800 leading-relaxed">
                      Mfumo utatengeneza jina la Wi-Fi <strong>"{ssid}"</strong> na kuweka IP ya VPS <strong>({nasIp || '13.140.173.98'})</strong> kiotomatiki kwenye RADIUS Server Profile, External Portal, na Walled Garden kwenye Omada Controller.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleEnableHotspot}
                    disabled={enablingHotspot || !ssid.trim()}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {enablingHotspot ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Inawasha Hotspot na Captive Portal...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 text-amber-300" />
                        <span>🚀 Washa Huduma ya Hotspot (Enable Hotspot)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <a
            href="https://omada.infotechwifi.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 font-mono text-[11px] text-teal-700 hover:text-teal-900 font-bold hover:underline"
            title="Bofya kufungua ukurasa wa Login wa Omada Controller"
          >
            <Server className="w-3.5 h-3.5 text-teal-600" />
            <span>Fungua Controller GUI: omada.infotechwifi.com</span>
            <ExternalLink className="w-3 h-3 text-teal-600" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
          >
            Funga (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
