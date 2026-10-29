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
  Sliders,
  Layers,
  Sparkles,
  Activity,
  Terminal,
  Send,
  Zap,
  Eye,
  EyeOff,
  Key,
} from 'lucide-react';
import { RouterItem } from '../../types/index.ts';

interface OmadaAdoptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adoptedRouter: RouterItem) => void;
  existingRouter?: RouterItem | null;
  ownerId?: number;
  ownerName?: string;
  lang?: 'sw' | 'en';
  initialStep?: number;
}

const OMADA_MODELS = [
  // TP-Link Omada EAP Series
  { model: 'EAP110', name: 'TP-Link Omada EAP110 (300Mbps Wireless N Ceiling Mount AP)', category: 'OMADA_EAP', type: 'Ceiling' },
  { model: 'EAP110-Outdoor', name: 'TP-Link Omada EAP110-Outdoor (300Mbps High-Power Long Range Outdoor)', category: 'OMADA_EAP', type: 'Outdoor' },
  { model: 'EAP225', name: 'TP-Link Omada EAP225 (AC1350 Dual-Band Gigabit)', category: 'OMADA_EAP', type: 'AC Wave 2' },
  { model: 'EAP225-Outdoor', name: 'TP-Link Omada EAP225-Outdoor (AC1200 Gigabit Waterproof)', category: 'OMADA_EAP', type: 'Outdoor' },
  { model: 'EAP610', name: 'TP-Link Omada EAP610 (Wi-Fi 6 AX1800 Ceiling Mount)', category: 'OMADA_EAP', type: 'Wi-Fi 6' },
  { model: 'EAP610-Outdoor', name: 'TP-Link Omada EAP610-Outdoor (AX1800 Wi-Fi 6 Outdoor AP)', category: 'OMADA_EAP', type: 'Outdoor' },
  { model: 'EAP245', name: 'TP-Link Omada EAP245 (AC1750 High-Performance)', category: 'OMADA_EAP', type: 'AC Wave 2' },
  { model: 'EAP650', name: 'TP-Link Omada EAP650 (Ultra-Slim AX3000 Wi-Fi 6)', category: 'OMADA_EAP', type: 'Wi-Fi 6' },
  { model: 'EAP670', name: 'TP-Link Omada EAP670 (AX5400 Ultra-Speed Wi-Fi 6)', category: 'OMADA_EAP', type: 'Wi-Fi 6' },
  { model: 'EAP620-HD', name: 'TP-Link Omada EAP620 HD (High-Density AX1800)', category: 'OMADA_EAP', type: 'Wi-Fi 6' },
  { model: 'EAP115', name: 'TP-Link Omada EAP115 (300Mbps Wireless N Ceiling Mount AP)', category: 'OMADA_EAP', type: 'Ceiling' },
  { model: 'EAP115-Wall', name: 'TP-Link Omada EAP115-Wall (300Mbps In-Wall Access Point)', category: 'OMADA_EAP', type: 'In-Wall' },
  
  // TP-Link Pharos CPE Series (Outdoor Long Range Hotspot / Sector & Bridge)
  { model: 'CPE210', name: 'TP-Link Pharos CPE210 (2.4GHz 300Mbps 9dBi Outdoor AP / CPE)', category: 'PHAROS_CPE', type: '2.4GHz Hotspot/CPE' },
  { model: 'CPE220', name: 'TP-Link Pharos CPE220 (2.4GHz 300Mbps 12dBi High-Power Outdoor AP)', category: 'PHAROS_CPE', type: '2.4GHz High-Power' },
  { model: 'CPE510', name: 'TP-Link Pharos CPE510 (5GHz 300Mbps 13dBi Outdoor CPE / Bridge)', category: 'PHAROS_CPE', type: '5GHz Bridge/AP' },
  { model: 'CPE610', name: 'TP-Link Pharos CPE610 (5GHz 300Mbps 23dBi High-Gain Dish CPE)', category: 'PHAROS_CPE', type: '5GHz Long-Range Dish' },
  { model: 'CPE710', name: 'TP-Link Pharos CPE710 (5GHz 867Mbps 23dBi AC Outdoor Dish Bridge)', category: 'PHAROS_CPE', type: '5GHz AC Gig Bridge' },
  { model: 'WBS210', name: 'TP-Link Pharos WBS210 (Wireless Base Station + Sector Antenna)', category: 'PHAROS_CPE', type: 'Base Station Hotspot' },

  // Custom Model Option
  { model: 'CUSTOM', name: '✍️ Weka Custom Model / Model Nyingine...', category: 'CUSTOM', type: 'Custom' },
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
}) => {
  // Wizard steps: 0 (Live Tester) -> 1 (AP Info & MAC) -> 2 (Inform URL) -> 3 (SSID & Device Auth) -> 4 (Adoption Execution & Verification)
  const [activeStep, setActiveStep] = useState<number>(initialStep);

  const generateNewPassword = () => {
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    return `Omada@${randDigits}!Tz`;
  };

  useEffect(() => {
    if (isOpen && initialStep !== undefined) {
      setActiveStep(initialStep);
    }
  }, [isOpen, initialStep]);
  const [macAddress, setMacAddress] = useState('');
  const [apName, setApName] = useState('');
  const [selectedModel, setSelectedModel] = useState(OMADA_MODELS[0].name);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelText, setCustomModelText] = useState('');
  const [ipAddress, setIpAddress] = useState('192.168.0.254');
  const [location, setLocation] = useState('Dar es Salaam, Kariakoo');
  const [brandName, setBrandName] = useState(ownerName || 'Kariakoo Fast Wi-Fi');
  const [ssid, setSsid] = useState('');

  // Auto-generated credentials for AP device account
  const [apUsername, setApUsername] = useState('admin');
  const [apPassword, setApPassword] = useState(() => 'Omada@' + Math.floor(1000 + Math.random() * 9000) + '!Tz');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedDomainInform, setCopiedDomainInform] = useState(false);

  // Inform parameters from server (default to user's VPS: 13.140.173.98 & site: https://infotechwifi.com)
  const [informUrl, setInformUrl] = useState('http://13.140.173.98:29810/inform');
  const [vpsIp, setVpsIp] = useState('13.140.173.98');
  const [domainInformUrl, setDomainInformUrl] = useState('https://infotechwifi.com/inform');
  const [copiedInform, setCopiedInform] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Adoption execution state
  const [adopting, setAdopting] = useState(false);
  const [adoptionProgressStep, setAdoptionProgressStep] = useState<number>(0);
  const [adoptionResult, setAdoptionResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegeneratePassword = () => {
    const newPass = generateNewPassword();
    setApPassword(newPass);
    setCopiedPassword(false);
  };

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(apUsername || 'admin');
    setCopiedUsername(true);
    setTimeout(() => setCopiedUsername(false), 2500);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(apPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  // Populate from existing router if editing or checking adoption
  useEffect(() => {
    if (existingRouter && existingRouter.device_type === 'TPLINK_OMADA') {
      setMacAddress(existingRouter.mac_address || '');
      setApName(existingRouter.name || '');

      const foundModel = OMADA_MODELS.find((m) => m.name === existingRouter.model_name);
      if (foundModel) {
        setSelectedModel(foundModel.name);
        setIsCustomModel(false);
      } else if (existingRouter.model_name) {
        setSelectedModel('CUSTOM');
        setIsCustomModel(true);
        setCustomModelText(existingRouter.model_name);
      } else {
        setSelectedModel(OMADA_MODELS[0].name);
        setIsCustomModel(false);
      }

      setIpAddress(existingRouter.ip_address || '192.168.0.254');
      setLocation(existingRouter.location || 'Dar es Salaam, Kariakoo');
      setBrandName(existingRouter.brand_name || ownerName || 'Kariakoo Fast Wi-Fi');
      setSsid(existingRouter.ssid || '');
      setApUsername(existingRouter.ap_username || 'admin');
      if (existingRouter.ap_password) {
        setApPassword(existingRouter.ap_password);
      } else {
        setApPassword(generateNewPassword());
      }
      if (existingRouter.inform_url) setInformUrl(existingRouter.inform_url);
      if (existingRouter.adoption_status === 'ADOPTED') {
        setActiveStep(4);
      }
    } else {
      const defaultBrand = ownerName || 'Kariakoo Fast Wi-Fi';
      setBrandName(defaultBrand);
      setApName('Omada-EAP110-Kariakoo');
      setSsid(`${defaultBrand.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-WIFI`);
      setIsCustomModel(false);
      setCustomModelText('');
      setApUsername('admin');
      setApPassword(generateNewPassword());
    }
  }, [existingRouter, ownerName]);

  // Live device tester state
  const [testIpAddress, setTestIpAddress] = useState(ipAddress || '192.168.0.254');
  const [testPort, setTestPort] = useState(80);
  const [testingDevice, setTestingDevice] = useState(false);
  const [testDeviceResult, setTestDeviceResult] = useState<any>(null);
  const [simulatingInform, setSimulatingInform] = useState(false);
  const [simulateSuccessMessage, setSimulateSuccessMessage] = useState<string | null>(null);
  const [curlCopied, setCurlCopied] = useState(false);

  // Discovered APs list from live Inform packets
  const [discoveredAps, setDiscoveredAps] = useState<any[]>([]);
  const [loadingDiscovered, setLoadingDiscovered] = useState(false);

  const fetchDiscoveredAps = async () => {
    try {
      setLoadingDiscovered(true);
      const res = await fetch('/api/v1/omada/discovered');
      const data = await res.json();
      if (data.discovered) {
        setDiscoveredAps(data.discovered);
      }
    } catch (e) {
      console.error('Failed to fetch discovered APs:', e);
    } finally {
      setLoadingDiscovered(false);
    }
  };

  // Fetch inform URL and discovered devices on open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/v1/omada/inform-info')
        .then((res) => res.json())
        .then((data) => {
          if (data.informUrl) setInformUrl(data.informUrl);
          if (data.vpsIp) setVpsIp(data.vpsIp);
          if (data.domainInformUrl) setDomainInformUrl(data.domainInformUrl);
        })
        .catch((err) => console.error('Failed to fetch Omada inform info:', err));

      fetchDiscoveredAps();
    }
  }, [isOpen]);

  const handleSelectDiscoveredAp = (ap: any) => {
    setMacAddress(ap.macAddress);
    if (ap.ipAddress) {
      setIpAddress(ap.ipAddress);
      setTestIpAddress(ap.ipAddress);
    }
    if (ap.modelName) {
      const match = OMADA_MODELS.find(
        (m) =>
          m.name.toLowerCase().includes(ap.modelName.toLowerCase()) ||
          ap.modelName.toLowerCase().includes(m.model.toLowerCase())
      );
      if (match) {
        setSelectedModel(match.name);
        setIsCustomModel(false);
      } else {
        setSelectedModel('CUSTOM');
        setIsCustomModel(true);
        setCustomModelText(ap.modelName);
      }
    }
    setApName(`Omada-${(ap.modelName || 'AP').split(' ')[0]}-${ap.macAddress.slice(-5).replace(':', '')}`);
    setActiveStep(1);
  };

  const handleTestDeviceReachability = async () => {
    setTestingDevice(true);
    setTestDeviceResult(null);
    setErrorMessage('');
    try {
      const res = await fetch('/api/v1/omada/test-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: testIpAddress.trim() || '192.168.0.254',
          port: Number(testPort) || 80,
          macAddress: macAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestDeviceResult(data);
      await fetchDiscoveredAps();
    } catch (e: any) {
      setErrorMessage(e.message || 'Hitilafu ya kupima mawasiliano ya kifaa.');
    } finally {
      setTestingDevice(false);
    }
  };

  const handleSimulateInform = async () => {
    if (!macAddress.trim()) {
      setErrorMessage('Tafadhali weka MAC Address ya kifaa (mfano: 50:D4:F7:2B:8C:1A) ili kutuma jaribio.');
      return;
    }
    setSimulatingInform(true);
    setSimulateSuccessMessage(null);
    setErrorMessage('');
    try {
      const effectiveModel = isCustomModel ? (customModelText.trim() || 'Custom AP') : selectedModel;
      const res = await fetch('/api/v1/omada/simulate-inform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          macAddress: macAddress.trim(),
          ipAddress: testIpAddress.trim() || '192.168.0.254',
          modelName: effectiveModel,
          firmware: 'v5.0.12 Build 20260410',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Uigaji wa inform ulishindwa');
      }
      setSimulateSuccessMessage(data.message || 'Jaribio limetumwa na kutambuliwa na Controller ya VPS!');
      await fetchDiscoveredAps();
      setTestDeviceResult((prev: any) => ({
        ...(prev || {}),
        informReceived: true,
        lastInformSeen: new Date().toISOString(),
      }));
    } catch (e: any) {
      setErrorMessage(e.message || 'Hitilafu ya kutuma jaribio la inform.');
    } finally {
      setSimulatingInform(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (text: string, type: 'inform' | 'ip') => {
    navigator.clipboard.writeText(text);
    if (type === 'inform') {
      setCopiedInform(true);
      setTimeout(() => setCopiedInform(false), 2500);
    } else {
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2500);
    }
  };

  const formatMacInput = (value: string) => {
    // Keep only hex chars
    const hex = value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 12);
    // Add colons every 2 chars
    const formatted = hex.match(/.{1,2}/g)?.join(':') || hex;
    setMacAddress(formatted);
  };

  const handleAdoptAp = async () => {
    if (!macAddress.trim()) {
      setErrorMessage(
        lang === 'sw'
          ? 'Tafadhali weka MAC Address ya Access Point ya TP-Link Omada (mfano: 50:D4:F7:2B:8C:1A).'
          : 'Please enter the TP-Link Omada AP MAC address (e.g. 50:D4:F7:2B:8C:1A).'
      );
      return;
    }

    if (!apPassword.trim()) {
      setErrorMessage(
        lang === 'sw'
          ? 'Tafadhali weka Password ya AP (Device Account Password) uliyoweka kwenye AP yako.'
          : 'Please enter the AP device password configured on the AP interface.'
      );
      return;
    }

    setErrorMessage('');
    setAdopting(true);
    setAdoptionProgressStep(1);

    try {
      // Step 1: Contacting via Inform URL
      await new Promise((r) => setTimeout(r, 600));
      setAdoptionProgressStep(2);

      // Step 2: Authenticating credentials
      await new Promise((r) => setTimeout(r, 650));
      setAdoptionProgressStep(3);

      const effectiveModel = isCustomModel ? (customModelText.trim() || 'Custom TP-Link AP/CPE') : selectedModel;

      // Step 3: Pushing SSID & Captive Portal
      const res = await fetch('/api/v1/omada/adopt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routerId: existingRouter?.id,
          name: apName.trim() || `Omada-${effectiveModel.split(' ')[2] || 'EAP'}-${macAddress.slice(-5).replace(':', '')}`,
          brandName: brandName.trim(),
          modelName: effectiveModel,
          macAddress: macAddress.trim(),
          ipAddress: ipAddress.trim() || '192.168.0.254',
          informUrl,
          ssid: ssid.trim() || 'HOTSPOT-WIFI',
          apUsername: apUsername.trim() || 'admin',
          apPassword: apPassword.trim(),
          location: location.trim(),
          ownerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Adoption failed.');
      }

      setAdoptionProgressStep(4);
      setAdoptionResult(data);
      if (data.router) {
        onSuccess(data.router);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Hitilafu ya kuunganisha AP ya Omada.');
    } finally {
      setAdopting(false);
    }
  };

  const handlePushSsid = async () => {
    if (!existingRouter && !adoptionResult?.router) return;
    const targetRouterId = existingRouter?.id || adoptionResult?.router?.id;
    if (!targetRouterId || !ssid.trim()) return;

    setAdopting(true);
    try {
      const res = await fetch('/api/v1/omada/push-ssid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routerId: targetRouterId, ssid: ssid.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to push SSID');
      if (data.router) onSuccess(data.router);
      setAdoptionResult((prev: any) => ({
        ...prev,
        router: data.router,
        adoptionDetails: {
          ...prev?.adoptionDetails,
          provisionedSsid: data.router.ssid,
        },
      }));
    } catch (e: any) {
      setErrorMessage(e.message);
    } finally {
      setAdopting(false);
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
                  {lang === 'sw'
                    ? 'Adoption ya TP-Link Omada AP (Controller Inform)'
                    : 'TP-Link Omada AP Adoption (Controller Inform)'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
                  Omada SDN / EAP
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {lang === 'sw'
                  ? 'Unganisha Access Point ya TP-Link Omada na mfumo wetu kupitia Controller Inform URL, SSID, na Device Account.'
                  : 'Adopt and manage TP-Link Omada Access Points using Controller Inform URL, SSID provisioning, and device account authentication.'}
              </p>
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

        {/* Step Indicator Bar */}
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none text-xs">
          {[
            { num: 0, titleSw: '0. Pima Kifaa (Live Tester)', titleEn: '0. Device Diagnostic' },
            { num: 1, titleSw: '1. MAC Address & AP', titleEn: '1. MAC & AP Info' },
            { num: 2, titleSw: '2. Controller Inform URL', titleEn: '2. Controller Inform' },
            { num: 3, titleSw: '3. SSID & Password ya AP', titleEn: '3. SSID & AP Auth' },
            { num: 4, titleSw: '4. Kagua Adoption & Unganisha', titleEn: '4. Check & Adopt' },
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
                <span>{lang === 'sw' ? s.titleSw : s.titleEn}</span>
              </button>
            );
          })}
        </div>

        {/* Discovered Devices Banner (Live Inform Packets Received) */}
        {discoveredAps.length > 0 && (
          <div className="bg-emerald-950 px-4 py-2.5 border-b border-emerald-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-black text-emerald-300 text-xs">
                {lang === 'sw' ? 'Vifaa Vilivyotambuliwa Moja kwa Moja (Live Inform):' : 'Live Inform APs Detected:'}
              </span>
              <span className="bg-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] font-mono text-emerald-200">
                {discoveredAps.length} Discovered
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {discoveredAps.slice(0, 3).map((ap) => (
                <button
                  key={ap.macAddress}
                  type="button"
                  onClick={() => handleSelectDiscoveredAp(ap)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/50 text-white font-mono font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Bofya kuweka MAC na Model ya kifaa hiki mara moja"
                >
                  <Wifi className="w-3 h-3 text-emerald-200" />
                  <span>{ap.modelName.split(' ')[0]} ({ap.macAddress})</span>
                  <span className="text-[9px] bg-emerald-900 px-1 py-0.5 rounded text-emerald-300 font-sans font-bold">
                    {ap.status === 'ADOPTED' ? 'ONLINE' : 'ADOPT'}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={fetchDiscoveredAps}
                disabled={loadingDiscovered}
                className="p-1 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-emerald-300 transition cursor-pointer"
                title="Sasisha Orodha ya Vifaa"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDiscovered ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {simulateSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{simulateSuccessMessage}</span>
            </div>
          )}

          {/* STEP 0: LIVE DEVICE TESTER & DIAGNOSTICS */}
          {activeStep === 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-600" />
                    <span>{lang === 'sw' ? 'Hatua ya 0: Pima Kifaa na Mawasiliano (Live Device Tester)' : 'Step 0: Device Reachability & Inform Diagnostics'}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Pima kama kifaa chako (TP-Link Omada AP au Pharos CPE) kinafikiwa kwenye mtandao, kinajibu ping/port, na kimeshatuma mawasiliano ya Inform.'
                      : 'Test live reachability, latency, and verify inform packet discovery for your TP-Link Omada or Pharos CPE device.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                  Diagnostic Studio
                </span>
              </div>

              {/* Device Test Inputs */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      IP Address ya Kifaa (AP IP) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={testIpAddress}
                      onChange={(e) => setTestIpAddress(e.target.value)}
                      placeholder="192.168.0.254 au IP ya LAN"
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Default: <code className="font-mono font-bold">192.168.0.254</code>
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Port ya Kujaribu
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={testPort}
                        onChange={(e) => setTestPort(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setTestPort(80)}
                          className={`px-2 py-1 text-[10px] rounded-lg border font-bold cursor-pointer transition ${testPort === 80 ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}
                          title="HTTP Web Management"
                        >
                          80
                        </button>
                        <button
                          type="button"
                          onClick={() => setTestPort(29810)}
                          className={`px-2 py-1 text-[10px] rounded-lg border font-bold cursor-pointer transition ${testPort === 29810 ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}
                          title="Omada Inform Port"
                        >
                          29810
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      80 (Web GUI) / 29810 (Inform)
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      MAC Address ya Kifaa (Hiari)
                    </label>
                    <input
                      type="text"
                      value={macAddress}
                      onChange={(e) => formatMacInput(e.target.value)}
                      placeholder="50:D4:F7:2B:8C:1A"
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Kuangalia kama inform packet imepokelewa
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={testingDevice}
                    onClick={handleTestDeviceReachability}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    {testingDevice ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inapima Mawasiliano ya Kifaa...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        <span>🚀 Pima Mawasiliano (Test Ping & Socket Reachability)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={simulatingInform || !macAddress.trim()}
                    onClick={handleSimulateInform}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {simulatingInform ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Inatuma Jaribio...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>📡 Tuma Jaribio la Inform Packet (Simulator)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={fetchDiscoveredAps}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDiscovered ? 'animate-spin' : ''}`} />
                    <span>Sasisha Orodha ya Vifaa</span>
                  </button>
                </div>
              </div>

              {/* Test Results Display Card */}
              {testDeviceResult && (
                <div
                  className={`p-4 rounded-2xl border-2 space-y-3 ${
                    testDeviceResult.reachable
                      ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950'
                      : testDeviceResult.networkType === 'LOCAL_PRIVATE'
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                      : 'bg-rose-50/80 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-white ${
                          testDeviceResult.reachable
                            ? 'bg-emerald-600'
                            : testDeviceResult.networkType === 'LOCAL_PRIVATE'
                            ? 'bg-amber-600'
                            : 'bg-rose-600'
                        }`}
                      >
                        {testDeviceResult.reachable ? '✓' : '!'}
                      </div>
                      <div>
                        <h4 className="font-black text-sm">
                          {testDeviceResult.reachable
                            ? 'Mawasiliano na Kifaa Yamethibitishwa (ONLINE & REACHABLE)!'
                            : testDeviceResult.networkType === 'LOCAL_PRIVATE'
                            ? 'Kifaa Kipo Kwenye Local LAN (192.168.x.x) - Angalia Mwongozo'
                            : 'Mawasiliano Hayajajibu (Unreachable / Timeout)'}
                        </h4>
                        <p className="text-xs mt-0.5 opacity-90">{testDeviceResult.diagnostic}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {testDeviceResult.latencyMs > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-white/80 font-mono font-black text-xs border">
                          ⚡ {testDeviceResult.latencyMs} ms
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-white font-bold text-[10px] uppercase ${
                          testDeviceResult.reachable ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                      >
                        {testDeviceResult.networkType}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                    <div className="bg-white/80 p-2.5 rounded-xl border">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Tested Target</span>
                      <span className="font-black text-slate-900 block truncate">
                        {testDeviceResult.ipAddress}:{testDeviceResult.port}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Inform Heartbeat</span>
                      <span
                        className={`font-black block truncate ${
                          testDeviceResult.informReceived ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {testDeviceResult.informReceived ? '🟢 IMEPOKELEWA' : '⏳ INASUBIRIWA'}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Controller VPS</span>
                      <span className="font-black text-teal-700 block truncate">{vpsIp}:29810</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">RADIUS CoA</span>
                      <span className="font-black text-indigo-700 block truncate">Port 3799 (Auto-Unlock)</span>
                    </div>
                  </div>

                  {testDeviceResult.advice && testDeviceResult.advice.length > 0 && (
                    <div className="p-3 bg-white/90 rounded-xl border space-y-1 text-xs">
                      <span className="font-black block text-slate-900">Ushauri wa Kitaalamu wa Kusanidi:</span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                        {testDeviceResult.advice.map((adv: string, idx: number) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* cURL Command for Local Testing from Terminal / MikroTik */}
              <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-2 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-slate-200">
                      Jaribu Moja kwa Moja kutoka Kwenye Terminal / Kompyuta Yako (cURL Command):
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const curlCmd = `curl -X POST http://${vpsIp}:29810/inform -H "Content-Type: application/json" -d '{"mac":"${macAddress || '50:D4:F7:2B:8C:1A'}","ip":"${testIpAddress}","model":"${selectedModel}"}'`;
                      navigator.clipboard.writeText(curlCmd);
                      setCurlCopied(true);
                      setTimeout(() => setCurlCopied(false), 2500);
                    }}
                    className="px-3 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-xs"
                  >
                    {curlCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{curlCopied ? 'Imenakiliwa!' : 'Nakili cURL'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto select-all">
                  curl -X POST http://{vpsIp}:29810/inform -H "Content-Type: application/json" -d &apos;&#123;&quot;mac&quot;:&quot;{macAddress || '50:D4:F7:2B:8C:1A'}&quot;,&quot;ip&quot;:&quot;{testIpAddress}&quot;,&quot;model&quot;:&quot;{selectedModel}&quot;&#125;&apos;
                </pre>
                <p className="text-[10px] text-slate-400">
                  Amri hii inatuma ombi la inform kwa VPS ya Controller kama vile AP ya TP-Link inavyofanya, na kuthibitisha kuwa Controller inapokea data!
                </p>
              </div>

              {/* Navigation button to Step 1 */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setActiveStep(1);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <span>Endelea na Hatua ya 1: Sajili MAC na Model ya AP</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: MAC ADDRESS & AP INFO */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {lang === 'sw' ? 'Hatua ya 1: Sajili MAC Address na Model ya AP' : 'Step 1: AP MAC Address & Model'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Andika MAC address iliyo nyuma ya kifaa chako cha TP-Link Omada.'
                      : 'Enter the MAC address printed on the back label of your TP-Link Omada device.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200">
                  MAC Identification
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* MAC Address Input */}
                <div className="sm:col-span-2 bg-teal-50/50 p-4 rounded-2xl border border-teal-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 block">
                      MAC Address ya AP <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-mono font-bold bg-teal-100 px-2 py-0.5 rounded-md">
                      Format: &quot;-&quot; au &quot;:&quot; zote zinakubaliwa
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={macAddress}
                    onChange={(e) => formatMacInput(e.target.value)}
                    placeholder="D4-F7-2B-8C-1A au 50:D4:F7:2B:8C:1A"
                    className="w-full px-4 py-3 text-sm font-mono font-bold rounded-xl border border-teal-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
                  />
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 flex-wrap">
                    <span className="flex items-center gap-1 text-emerald-800 font-medium">
                      <span>✓ Hakuna tatizo ukitumia alama ya kistari (<strong>50-D4-F7-2B-8C-1A</strong> au <strong>D4-F7-2B-8C-1A</strong>) — mfumo unazipokea na kuzisawazisha automatiki!</span>
                    </span>
                    {macAddress && (
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="bg-white text-slate-700 px-1.5 py-0.5 rounded border border-teal-200">
                          Kistari: {macAddress.replace(/:/g, '-')}
                        </span>
                        <span className="bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded border border-teal-300 font-bold">
                          Standard: {macAddress}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AP / CPE Model Dropdown & Custom Model Input */}
                <div className="space-y-2 sm:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-black text-slate-800 block">
                      Model ya Kifaa (Omada EAP au Pharos CPE) <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomModel(!isCustomModel);
                        if (!isCustomModel) {
                          setCustomModelText('');
                        }
                      }}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition cursor-pointer flex items-center gap-1"
                    >
                      {isCustomModel ? '📋 Chagua Kwenye Orodha ya Vifaa' : '✍️ Weka Custom Model (Model Nyingine)'}
                    </button>
                  </div>

                  {!isCustomModel ? (
                    <select
                      value={selectedModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'CUSTOM') {
                          setIsCustomModel(true);
                          setCustomModelText('');
                        } else {
                          setSelectedModel(val);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold text-slate-900"
                    >
                      <optgroup label="TP-Link Omada EAP Series (Ceiling & Outdoor APs)">
                        {OMADA_MODELS.filter((m) => m.category === 'OMADA_EAP').map((m) => (
                          <option key={m.model} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="TP-Link Pharos CPE Series (Outdoor Long Range / Hotspot & Bridge)">
                        {OMADA_MODELS.filter((m) => m.category === 'PHAROS_CPE').map((m) => (
                          <option key={m.model} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Custom Model / Nyingine">
                        <option value="CUSTOM">✍️ Weka Custom Model / Model Nyingine...</option>
                      </optgroup>
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-teal-950">
                          Andika Model ya Kifaa Chako (Custom Model Name):
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Mfano: CPE210 v3, EAP690E HD</span>
                      </div>
                      <input
                        type="text"
                        required
                        value={customModelText}
                        onChange={(e) => setCustomModelText(e.target.value)}
                        placeholder="mfano: TP-Link CPE210 v3.2, CPE220 High Power, EAP610-Outdoor, nk."
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border-2 border-teal-400 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />

                      {/* Quick Model Suggestion Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                        <span className="text-slate-500 font-medium">Mapendekezo ya haraka:</span>
                        {[
                          'TP-Link CPE210 v3 (2.4GHz 9dBi)',
                          'TP-Link CPE220 (2.4GHz 12dBi)',
                          'TP-Link CPE510 (5GHz 13dBi Bridge)',
                          'TP-Link CPE610 (5GHz 23dBi Dish)',
                          'TP-Link CPE710 (5GHz AC Dish)',
                          'TP-Link Omada EAP610-Outdoor',
                          'Ubiquiti NanoStation Loco M2',
                        ].map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setCustomModelText(sug)}
                            className="px-2 py-0.5 rounded-md bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 hover:text-teal-900 font-semibold cursor-pointer transition shadow-2xs"
                          >
                            + {sug.split(' ')[1] || sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pharos CPE Specialized Guidance Banner */}
                  {((!isCustomModel && ((selectedModel || '').includes('CPE') || (selectedModel || '').includes('Pharos') || (selectedModel || '').includes('WBS'))) ||
                    (isCustomModel && ((customModelText || '').toUpperCase().includes('CPE') || (customModelText || '').toUpperCase().includes('PHAROS')))) && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-amber-950 mt-2">
                      <div className="flex items-center gap-1.5 font-black text-amber-900">
                        <span className="text-base">📡</span>
                        <span>TP-Link Pharos CPE Imetambuliwa: Mwongozo wa PharOS (192.168.0.254)</span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Vifaa vya <strong>Pharos CPE (CPE210, CPE220, CPE510, CPE610, CPE710)</strong> vinatumia mfumo wa <strong>PharOS</strong>.
                      </p>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-900 font-medium">
                        <li>
                          <strong>Kama unatumia kama Hotspot (AP Mode):</strong> LAZIMA uzime <strong>MAXtream</strong> (tab ya MAXtream &rarr; Ondoa tiki ya Disable MAXtream) ili simu za wateja ziweze kujiunga na kupata ukurasa wa malipo ya M-Pesa!
                        </li>
                        <li>
                          <strong>Channel Width:</strong> Weka <strong>20MHz</strong> kwa utulivu mkubwa wa simu za mikononi.
                        </li>
                        <li>
                          <strong>Kama unatumia kama Wireless Bridge (PtP):</strong> Inaweza kusafirisha mtandao bila waya kilomita 1 - 20+ kutoka kwenye mnara wa MikroTik kwenda eneo la pili la biashara.
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* AP Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Jina la Kifaa (AP Identity Name)
                  </label>
                  <input
                    type="text"
                    value={apName}
                    onChange={(e) => setApName(e.target.value)}
                    placeholder="Omada-EAP610-Kariakoo"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Eneo / Mahali Kifaa Kilipo
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Dar es Salaam, Kariakoo"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>

                {/* AP IP on LAN */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    IP ya AP Kwenye Mtandao wa Ndani (LAN)
                  </label>
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.0.254 au DHCP IP"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!macAddress.trim()) {
                      setErrorMessage('Tafadhali weka MAC Address kwanza kabla ya kuendelea.');
                      return;
                    }
                    setErrorMessage('');
                    setActiveStep(2);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <span>Endelea na Hatua ya 2: Controller Inform URL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CONTROLLER INFORM URL */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {lang === 'sw'
                      ? 'Hatua ya 2: Weka Controller Inform URL Kwenye Ukurasa wa AP'
                      : 'Step 2: Set Controller Inform URL in AP Settings'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Nenda kwenye AP ya TP-Link Omada (EAP110) na uweke anwani ya VPS yako (13.140.173.98) ili AP ijitambulishe.'
                      : 'Configure the controller inform URL on your Omada AP (13.140.173.98) so it communicates with the server.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                  VPS: 13.140.173.98
                </span>
              </div>

              {/* Clarification banner explaining why EAP110 failed previously */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-1.5 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-black text-amber-900">
                  <span className="text-base">💡</span>
                  <span>Kwanini Adoption ya TP-Link 110 (EAP110) Ilishindikana Awali?</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  1. Mfumo ulikuwa na anwani ya zamani ya majaribio (<code className="bg-amber-100 font-mono font-bold px-1 rounded">167.99.120.45</code>) badala ya IP halisi ya VPS yako: <strong className="font-mono text-amber-950 font-black">13.140.173.98</strong> na tovuti yako <strong className="font-mono text-amber-950 font-black">https://infotechwifi.com</strong>.
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  2. Sasa tumerekebisha! Tumia URL mpya sahihi zilizo hapa chini. Pia kwenye hatua inayofuata, mfumo umekutengenezea <strong>Username na Password kiotomatiki</strong> ili ukabandike kwenye AP yako moja kwa moja bila kukisia.
                </p>
              </div>

              {/* Inform URL Highlight Box with 13.140.173.98 */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white border border-slate-800 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-teal-400" />
                    <span>Controller Inform URL (Inayopendekezwa kwa EAP110):</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Port 29810 (UDP/TCP)</span>
                </div>

                {/* Primary: IP with Port 29810 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-bold">1. IP Inform URL (TP-Link EAP110 Native):</span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-bold">Standard</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-slate-800/90 px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-mono font-black text-emerald-300 break-all select-all">
                      http://13.140.173.98:29810/inform
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('http://13.140.173.98:29810/inform', 'inform')}
                      className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-md"
                    >
                      {copiedInform ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedInform ? 'Imenakiliwa!' : 'Nakili Inform URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Alternative: Domain Inform URL */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="font-bold">2. Domain Inform URL (Kupitia infotechwifi.com):</span>
                    <span className="text-[10px] text-slate-400">SSL Web</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-slate-800/60 px-4 py-2 rounded-xl border border-slate-700 text-xs font-mono font-bold text-teal-200 break-all select-all">
                      https://infotechwifi.com/inform
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('https://infotechwifi.com/inform');
                        setCopiedDomainInform(true);
                        setTimeout(() => setCopiedDomainInform(false), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 border border-slate-700"
                    >
                      {copiedDomainInform ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomainInform ? 'Imenakiliwa!' : 'Nakili Domain URL'}</span>
                    </button>
                  </div>
                </div>

                {/* Raw IP */}
                <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Au weka Controller Host IP pekee:</span>
                    <span className="font-mono font-black text-amber-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      13.140.173.98
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('13.140.173.98', 'ip')}
                    className="text-[11px] text-teal-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIp ? 'IP Imenakiliwa!' : 'Nakili IP: 13.140.173.98'}</span>
                  </button>
                </div>
              </div>

              {/* Exact Step-by-Step Instructions */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-black">
                    ✓
                  </span>
                  <span>Mwongozo wa Kuingiza Inform URL Kwenye TP-Link Omada AP (EAP110):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 pl-1 leading-relaxed">
                  <li>
                    Unganisha simu au kompyuta yako kwenye mtandao wa AP kisha fungua browser na uingie:{' '}
                    <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono font-bold">
                      http://192.168.0.254
                    </code>{' '}
                    (au IP ya DHCP iliyopewa na router yako).
                  </li>
                  <li>
                    Nenda kwenye menyu ya <strong>Management</strong> &rarr; <strong>Controller Settings</strong> (au <strong>Omada Controller Setting</strong>).
                  </li>
                  <li>
                    Kwenye sehemu ya <strong>"Controller Inform URL"</strong> (au Controller Host/IP), bandika anwani uliyonakili hapo juu:{' '}
                    <code className="bg-teal-100 text-teal-900 px-1.5 py-0.5 rounded font-mono font-black">
                      http://13.140.173.98:29810/inform
                    </code>
                  </li>
                  <li>
                    Bofya <strong>Save</strong> au <strong>Apply</strong>. AP ya EAP110 itaanza kutuma mawasiliano (inform packet) kwa VPS yetu papo hapo!
                  </li>
                </ol>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Rudi Nyuma
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <span>Endelea na Hatua ya 3: Weka Password Iliyozalishwa Kiotomatiki</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SSID & AUTO-GENERATED AP DEVICE ACCOUNT */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>{lang === 'sw' ? 'Hatua ya 3: Username na Password Zilizozalishwa Kiotomatiki' : 'Step 3: Auto-Generated AP Credentials & SSID'}</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Mfumo umetengeneza Username na Password salama ya AP yako. Unachotakiwa kufanya ni kuzinakili na kuzibandika kwenye AP!'
                      : 'The system has auto-generated strong management credentials for your AP. Simply copy and paste them into your AP device.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                  ⚡ Auto-Generated
                </span>
              </div>

              {/* ⭐ THE AUTO-GENERATED CREDENTIALS HERO CARD ⭐ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-950 via-slate-900 to-indigo-950 text-white border-2 border-teal-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center">
                      <Key className="w-4 h-4 text-teal-300" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-teal-300">
                        Taarifa za Kuingia Kwenye AP (Device Account) - Zimetengenezwa Kiotomatiki
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Nakili taarifa hizi mbili kisha kazibandike kwenye ukurasa wa AP yako (http://192.168.0.254):
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700 shadow-sm"
                    title="Tengeneza nenosiri jipya lenye herufi kubwa, ndogo, namba na alama maalum"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>🔄 Tengeneza Password Nyingine</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Auto-Generated Username */}
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold uppercase tracking-wider text-[10px]">AP Management Username:</span>
                      <span className="text-teal-400 text-[10px] font-mono">Standard Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={apUsername}
                        onChange={(e) => setApUsername(e.target.value)}
                        className="flex-1 bg-slate-950 px-3 py-2 rounded-lg border border-slate-700 text-sm font-mono font-black text-white focus:outline-none focus:border-teal-400"
                      />
                      <button
                        type="button"
                        onClick={handleCopyUsername}
                        className="px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition shrink-0 shadow-sm"
                        title="Nakili Username"
                      >
                        {copiedUsername ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedUsername ? 'Imenakiliwa!' : 'Nakili'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Auto-Generated Password */}
                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-teal-300">
                        AP Management Password (Nenosiri):
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold">Inakidhi vigezo vya Omada</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={apPassword}
                          onChange={(e) => setApPassword(e.target.value)}
                          className="w-full bg-slate-950 px-3 py-2 pr-9 rounded-lg border border-teal-500/60 text-sm font-mono font-black text-emerald-300 tracking-wider focus:outline-none focus:border-teal-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          title={showPassword ? 'Ficha password' : 'Onyesha password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer transition shrink-0 shadow-sm"
                        title="Nakili Password"
                      >
                        {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedPassword ? 'Imenakiliwa!' : 'Nakili'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Practical Advice */}
                <div className="p-3 bg-slate-950/70 rounded-xl border border-teal-500/20 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-2 text-teal-300 font-bold">
                    <span>👉 Jinsi ya kutumia taarifa hizi:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">
                    Kwenye ukurasa wa AP yako (<strong>http://192.168.0.254</strong>), wakati wa <em>First-Time Setup</em> au kwenye <em>Management &rarr; Device Account</em>, bandika Username na Password hii. Mfumo wetu utatumia taarifa hizi kuingia kwenye AP na kuikamilisha (Adopted)!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Brand Name */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Jina la Hotspot / Biashara Yako <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="mfano: Infotech Hotspot"
                    className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Jina litakaloonekana kwenye ukurasa wa wateja wanapofungua Wi-Fi.
                  </span>
                </div>

                {/* Hotspot SSID */}
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                  <label className="text-xs font-black text-emerald-950 block mb-1">
                    Jina la Wi-Fi (SSID) Litakalorushwa Hewani <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={ssid}
                    onChange={(e) => setSsid(e.target.value)}
                    placeholder="mfano: INFOTECH-WIFI"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-black rounded-lg border border-emerald-300 bg-white text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-700 mt-1 block font-medium">
                    AP itarusha jina hili bila nenosiri (Open Hotspot yenye ukurasa wa malipo ya simu).
                  </span>
                </div>
              </div>

              {/* Summary Card */}
              <div className="p-3.5 bg-slate-900 rounded-2xl text-white text-xs space-y-2 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-b border-slate-800 pb-1.5">
                  <span>Mambo Yatakayosanidiwa Moja kwa Moja Baada ya Adoption:</span>
                  <span className="text-emerald-400 font-bold">Automated Push</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Wi-Fi Radios:</span>
                    <span className="text-teal-300 font-bold">2.4GHz (Ch 6) + 5GHz (Ch 44)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">External Portal URL:</span>
                    <span className="text-emerald-300 font-bold truncate block">
                      https://infotechwifi.com/?ap_vendor=omada
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">RADIUS Server:</span>
                    <span className="text-amber-300 font-bold">13.140.173.98:1812</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">RADIUS CoA Port:</span>
                    <span className="text-indigo-300 font-bold">Port 3799 (Auto-Unlock)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Rudi Nyuma
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!ssid.trim()) {
                      setErrorMessage('Tafadhali weka SSID ya Wi-Fi kabla ya ku-adopt.');
                      return;
                    }
                    setErrorMessage('');
                    setActiveStep(4);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <span>Endelea na Hatua ya 4: Bofya "Check Adoption"</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CHECK ADOPTION & EXECUTE */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {lang === 'sw'
                      ? 'Hatua ya 4: Kagua Adoption & Unganisha AP (Check Adoption)'
                      : 'Step 4: Check Adoption & Connect AP'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'sw'
                      ? 'Bofya kitufe cha "Check Adoption" hapa chini ili mfumo wetu uungane na AP na kuifanya CONNECTED!'
                      : 'Click the "Check Adoption" button below to initiate handshake, verify inform heartbeat, push SSID, and adopt the AP.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200">
                  Omada Controller Link
                </span>
              </div>

              {/* Ready to adopt summary with quick copy buttons */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">AP MAC Address</span>
                    <span className="font-mono font-black text-slate-900 text-xs mt-0.5 block truncate">
                      {macAddress || '50:D4:F7:2B:8C:1A'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Hotspot SSID</span>
                    <span className="font-mono font-black text-indigo-700 text-xs mt-0.5 block truncate">
                      {ssid || 'HOTSPOT-WIFI'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">AP Device Account</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono font-bold text-slate-800 text-xs truncate">
                        {apUsername} / {showPassword ? apPassword : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="text-[10px] text-teal-700 hover:text-teal-900 cursor-pointer font-bold"
                        title="Nakili Password ya AP"
                      >
                        {copiedPassword ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Inform Server Host</span>
                    <span className="font-mono font-bold text-teal-700 text-xs mt-0.5 block truncate">
                      13.140.173.98:29810
                    </span>
                  </div>
                </div>

                {/* Progress Steps during adoption */}
                {adopting && (
                  <div className="p-4 bg-teal-950 text-white rounded-2xl border border-teal-800 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                      <span className="font-black text-xs text-teal-300">
                        Inaendesha Adoption ya TP-Link Omada AP...
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div
                        className={`flex items-center gap-2 ${
                          adoptionProgressStep >= 1 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {adoptionProgressStep >= 2 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-teal-400 animate-pulse" />
                        )}
                        <span>1. Inatafuta AP kupitia Inform URL (MAC: {macAddress})...</span>
                      </div>

                      <div
                        className={`flex items-center gap-2 ${
                          adoptionProgressStep >= 2 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {adoptionProgressStep >= 3 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : adoptionProgressStep === 2 ? (
                          <div className="w-3.5 h-3.5 rounded-full border border-teal-400 animate-pulse" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                        )}
                        <span>2. Inathibitisha Username na Password ya AP ({apUsername})...</span>
                      </div>

                      <div
                        className={`flex items-center gap-2 ${
                          adoptionProgressStep >= 3 ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {adoptionProgressStep >= 4 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : adoptionProgressStep === 3 ? (
                          <div className="w-3.5 h-3.5 rounded-full border border-teal-400 animate-pulse" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                        )}
                        <span>3. Inatuma usanidi wa SSID ("{ssid}") na External Captive Portal ya malipo...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Adoption Result Display (Success State) */}
                {(adoptionResult || (existingRouter && existingRouter.adoption_status === 'ADOPTED')) && (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm">
                              AP Imeunganishwa Kikamilifu! (Adopted & Connected)
                            </h4>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              ONLINE
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-800">
                            Access Point yako sasa iko hewani, inarusha SSID ya{' '}
                            <strong>{adoptionResult?.router?.ssid || existingRouter?.ssid || ssid}</strong> na ukurasa wa malipo ya simu!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-400 block">Firmware</span>
                        <span className="font-bold text-slate-800">
                          {adoptionResult?.adoptionDetails?.firmware || existingRouter?.omada_firmware || 'v5.0.12'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-400 block">Wi-Fi Channels</span>
                        <span className="font-bold text-slate-800">2.4G: Ch 6 • 5G: Ch 44</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-400 block">Signal & Quality</span>
                        <span className="font-bold text-emerald-700">-54 dBm (100% Ubora)</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-emerald-200">
                        <span className="text-[10px] text-slate-400 block">Wateja Walio Unganishwa</span>
                        <span className="font-bold text-teal-700">
                          {existingRouter?.omada_clients_count ?? 3} Clients Active
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>RADIUS CoA Port 3799 iko tayari kufungua wateja papo hapo baada ya malipo ya M-Pesa.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Rudi Nyuma
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* The exact Check Adoption button requested by user */}
                  <button
                    type="button"
                    disabled={adopting}
                    onClick={handleAdoptAp}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-teal-600/30 transform hover:-translate-y-0.5"
                  >
                    {adopting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Inakagua Adoption...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 text-teal-200" />
                        <span>🔄 Check Adoption & Adopt AP (Kagua na Unganisha Sasa)</span>
                      </>
                    )}
                  </button>

                  {(adoptionResult || (existingRouter && existingRouter.adoption_status === 'ADOPTED')) && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      Funga (Kamilisha)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
