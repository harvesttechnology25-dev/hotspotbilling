import React, { useEffect, useState } from 'react';
import { RouterItem, DeviceType } from '../../types/index.ts';
import {
  Server,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  ExternalLink,
  MapPin,
  PlusCircle,
  Download,
  Activity,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Radio,
  FileCode,
  BookOpen,
  ArrowRight,
  CreditCard,
  Wifi,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  Printer,
  FileText,
  Search,
  Edit2,
} from 'lucide-react';
import { ApSetupGuideModal, ApGuideTab } from './ApSetupGuideModal.tsx';
import { OmadaAdoptionModal } from './OmadaAdoptionModal.tsx';
import { TablePagination, PageSizeOption } from '../Common/TablePagination.tsx';

export const DEVICE_PROFILES: Record<DeviceType, {
  name: string;
  badge: string;
  color: string;
  icon: string;
  models: string;
  description: string;
  requiresApiPort: boolean;
}> = {
  MIKROTIK: {
    name: 'MikroTik RouterOS',
    badge: 'RouterOS v6 / v7',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: '🔴',
    models: 'hEX, RB750Gr3, hAP ac/ax, CCR, CHR Cloud',
    description: 'Hardware router yenye RouterOS API na Winbox scripts.',
    requiresApiPort: true,
  },
  RUIJIE: {
    name: 'Ruijie Reyee Cloud AP',
    badge: 'Ruijie Reyee Cloud',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: '🟠',
    models: 'RG-RAP2200(E), RG-RAP1200, RG-EG105G, Reyee Cloud',
    description: 'Access Point inayounganishwa na Ruijie Cloud & External Portal bila MikroTik.',
    requiresApiPort: false,
  },
  TPLINK_OMADA: {
    name: 'TP-Link Omada & CPE',
    badge: 'Omada / Pharos CPE',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: '🟢',
    models: 'EAP610, EAP225, EAP245, CPE210, CPE220, CPE510, CPE610, CPE710',
    description: 'Omada Controller EAP Access Points na TP-Link Pharos CPE za nje zenye Hotspot & Wireless Bridge.',
    requiresApiPort: false,
  },
  OPENWRT_CUDY: {
    name: 'Cudy & OpenWrt',
    badge: 'OpenWrt / CoovaChilli',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: '🔵',
    models: 'Cudy WR1300, WR2100, GL.iNet, D-Link (Flashed)',
    description: 'Router zenye OpenWrt na CoovaChilli Hotspot script bila router ya ziada.',
    requiresApiPort: false,
  },
  UBIQUITI_UNIFI: {
    name: 'Ubiquiti UniFi',
    badge: 'UniFi OS / Network',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: '🟣',
    models: 'U6-Lite, U6-LR, U6-Pro, UniFi Express, Cloud Gateway',
    description: 'UniFi Network Application Hotspot Portal & FreeRADIUS AAA.',
    requiresApiPort: false,
  },
  GENERIC_RADIUS: {
    name: 'Generic RADIUS AP',
    badge: 'Cloud RADIUS / NAS',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: '⚪',
    models: 'Grandstream GWN, Tenda, Netgear, Zyxel',
    description: 'Access Point yoyote inayokubali External Web Portal na 802.1X / RADIUS.',
    requiresApiPort: false,
  },
};

export const ALL_DEVICE_MODELS = [
  // MikroTik RouterOS
  { id: 'rb750gr3', vendor: 'MIKROTIK', name: 'MikroTik hEX S / RB750Gr3 (Gigabit 5-Port)', category: 'MikroTik RouterOS' },
  { id: 'rb3011', vendor: 'MIKROTIK', name: 'MikroTik RB3011UiAS-RM (10-Port Rackmount)', category: 'MikroTik RouterOS' },
  { id: 'rb4011', vendor: 'MIKROTIK', name: 'MikroTik RB4011iGS+RM (Quad-Core 10G SFP+)', category: 'MikroTik RouterOS' },
  { id: 'ccr2004', vendor: 'MIKROTIK', name: 'MikroTik CCR2004-16G-2S+ (Carrier Cloud Router)', category: 'MikroTik RouterOS' },
  { id: 'hap_ac2', vendor: 'MIKROTIK', name: 'MikroTik hAP ac² / ac³ / ax² (Dual-Band Gateway)', category: 'MikroTik RouterOS' },
  { id: 'chr_vps', vendor: 'MIKROTIK', name: 'MikroTik Cloud Hosted Router (CHR VPS Gateway)', category: 'MikroTik RouterOS' },

  // TP-Link Omada EAP Series
  { id: 'eap610', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP610 (AX1800 Wi-Fi 6 Ceiling)', category: 'TP-Link Omada EAP' },
  { id: 'eap225', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP225 (AC1350 Gigabit Dual-Band)', category: 'TP-Link Omada EAP' },
  { id: 'eap245', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP245 (AC1750 High Density)', category: 'TP-Link Omada EAP' },
  { id: 'eap650', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP650 (AX3000 Ultra-Slim Wi-Fi 6)', category: 'TP-Link Omada EAP' },
  { id: 'eap110_out', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP110-Outdoor (300Mbps High-Power)', category: 'TP-Link Omada EAP' },
  { id: 'eap225_out', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP225-Outdoor (AC1200 Waterproof)', category: 'TP-Link Omada EAP' },
  { id: 'eap670', vendor: 'TPLINK_OMADA', name: 'TP-Link Omada EAP670 (AX5400 Enterprise Wi-Fi 6)', category: 'TP-Link Omada EAP' },

  // TP-Link Pharos CPE Series (Outdoor Hotspot & Wireless Bridge)
  { id: 'cpe210', vendor: 'TPLINK_OMADA', name: 'TP-Link Pharos CPE210 (2.4GHz 300Mbps 9dBi Outdoor Hotspot AP / CPE)', category: 'TP-Link Pharos CPE' },
  { id: 'cpe220', vendor: 'TPLINK_OMADA', name: 'TP-Link Pharos CPE220 (2.4GHz 300Mbps 12dBi High-Power Outdoor AP)', category: 'TP-Link Pharos CPE' },
  { id: 'cpe510', vendor: 'TPLINK_OMADA', name: 'TP-Link Pharos CPE510 (5GHz 300Mbps 13dBi Outdoor CPE / PtP Bridge)', category: 'TP-Link Pharos CPE' },
  { id: 'cpe610', vendor: 'TPLINK_OMADA', name: 'TP-Link Pharos CPE610 (5GHz 300Mbps 23dBi High-Gain Dish CPE)', category: 'TP-Link Pharos CPE' },
  { id: 'cpe710', vendor: 'TPLINK_OMADA', name: 'TP-Link Pharos CPE710 (5GHz 867Mbps 23dBi AC Outdoor Dish Bridge)', category: 'TP-Link Pharos CPE' },
  { id: 'wbs210', vendor: 'TPLINK_OMADA', name: 'TP-Link Pharos WBS210 (Wireless Base Station + Sector Antenna)', category: 'TP-Link Pharos CPE' },

  // Ruijie Reyee Cloud AP Series
  { id: 'rap2200e', vendor: 'RUIJIE', name: 'Ruijie Reyee RG-RAP2200(E) (AC1300 Dual-Band Gigabit)', category: 'Ruijie Reyee Cloud AP' },
  { id: 'rap1200f', vendor: 'RUIJIE', name: 'Ruijie Reyee RG-RAP1200(F) (AC1200 Wall Plate AP)', category: 'Ruijie Reyee Cloud AP' },
  { id: 'rap6262g', vendor: 'RUIJIE', name: 'Ruijie Reyee RG-RAP6262(G) (AX3000 Outdoor Wi-Fi 6)', category: 'Ruijie Reyee Cloud AP' },
  { id: 'rap6260h', vendor: 'RUIJIE', name: 'Ruijie Reyee RG-RAP6260(H) (AX5400 Ultra Outdoor)', category: 'Ruijie Reyee Cloud AP' },
  { id: 'eg105gp', vendor: 'RUIJIE', name: 'Ruijie Reyee RG-EG105G-P (5-Port Cloud PoE Router)', category: 'Ruijie Reyee Cloud AP' },

  // Cudy / OpenWrt
  { id: 'cudy_wr1300', vendor: 'OPENWRT_CUDY', name: 'Cudy WR1300 / WR2100 (OpenWrt CoovaChilli)', category: 'OpenWrt / Cudy' },
  { id: 'glinet_flint', vendor: 'OPENWRT_CUDY', name: 'GL.iNet Flint / Beryl (OpenWrt Enterprise)', category: 'OpenWrt / Cudy' },
  { id: 'openwrt_generic', vendor: 'OPENWRT_CUDY', name: 'Generic OpenWrt 23.05 (CoovaChilli Gateway)', category: 'OpenWrt / Cudy' },

  // Ubiquiti UniFi & airMAX
  { id: 'unifi_u6_lite', vendor: 'UBIQUITI_UNIFI', name: 'Ubiquiti UniFi U6-Lite / Pro (Wi-Fi 6 AP)', category: 'Ubiquiti UniFi' },
  { id: 'unifi_ac_mesh', vendor: 'UBIQUITI_UNIFI', name: 'Ubiquiti UniFi AC-Mesh (UAP-AC-M Outdoor)', category: 'Ubiquiti UniFi' },
  { id: 'nanostation_m2', vendor: 'UBIQUITI_UNIFI', name: 'Ubiquiti airMAX NanoStation Loco M2 / M5', category: 'Ubiquiti UniFi' },

  // Custom Model
  { id: 'CUSTOM', vendor: 'CUSTOM', name: '✍️ Weka Custom Model / Model Nyingine...', category: 'Custom' },
];

interface VpnScriptBundle {
  vpnRsc: string;
  hotspotRsc: string;
  pppoeRsc: string;
  antiTetheringRsc?: string;
  allInOne: string;
  wireguard: string;
  sstp: string;
  cloudPoll: string;
  master: string;
}

export const RouterManagement: React.FC<{ ownerId?: number; ownerName?: string }> = ({
  ownerId,
  ownerName,
}) => {
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Pagination (10, 20, 30, 40, ALL)
  const [routerSearch, setRouterSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL');
  const [routerPage, setRouterPage] = useState<number>(1);
  const [routerPageSize, setRouterPageSize] = useState<PageSizeOption>(10);
  
  // Script modal state
  const [selectedScriptRouter, setSelectedScriptRouter] = useState<RouterItem | null>(null);
  const [vpnScripts, setVpnScripts] = useState<VpnScriptBundle | null>(null);
  const [deviceConfigData, setDeviceConfigData] = useState<any>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<
    'allInOne' | 'vpn' | 'hotspot' | 'pppoe' | 'antiTethering' | 'wireguard' | 'cloudPoll' | 'sstp' | 'ruijie' | 'omada' | 'cpe' | 'openwrt' | 'unifi' | 'generic' | 'instructions'
  >('allInOne');
  const [loadingScript, setLoadingScript] = useState(false);
  const [copied, setCopied] = useState(false);
  const [portalUrlCopiedId, setPortalUrlCopiedId] = useState<number | null>(null);
  const [togglingAntiTetheringId, setTogglingAntiTetheringId] = useState<number | null>(null);

  // Testing connection state
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{
    routerId: number;
    reachable: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);

  // Guide modal state
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideInitialTab, setGuideInitialTab] = useState<ApGuideTab>('OVERVIEW');

  // TP-Link Omada Inform Adoption modal state
  const [omadaModalOpen, setOmadaModalOpen] = useState(false);
  const [selectedOmadaRouter, setSelectedOmadaRouter] = useState<RouterItem | null>(null);
  const [checkingAdoptionId, setCheckingAdoptionId] = useState<number | null>(null);
  const [adoptionFeedback, setAdoptionFeedback] = useState<{ routerId: number; success: boolean; message: string } | null>(null);

  const handleOpenOmadaModal = (router?: RouterItem) => {
    setSelectedOmadaRouter(router || null);
    setOmadaModalOpen(true);
  };

  const handleCheckAdoptionDirect = async (router: RouterItem) => {
    setCheckingAdoptionId(router.id);
    setAdoptionFeedback(null);
    try {
      const res = await fetch(`/api/v1/omada/check-adoption/${router.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Adoption check failed');
      }
      setAdoptionFeedback({
        routerId: router.id,
        success: true,
        message: data.message || `AP ya TP-Link Omada (${router.name}) ipo ONLINE na imeunganishwa kikamilifu!`,
      });
      await fetchRouters();
    } catch (e: any) {
      setAdoptionFeedback({
        routerId: router.id,
        success: false,
        message: e.message || 'Adoption haijakamilika. Hakikisha umeweka Inform URL kwenye AP.',
      });
    } finally {
      setCheckingAdoptionId(null);
    }
  };

  const handleRebootOmada = async (router: RouterItem) => {
    if (!confirm(`Una uhakika unataka kuwasha upya (Reboot) AP ya Omada (${router.name})?`)) return;
    try {
      const res = await fetch(`/api/v1/omada/reboot/${router.id}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message || 'Amri ya reboot imetumwa!');
      await fetchRouters();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Add & Edit router / AP modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RouterItem | null>(null);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelText, setCustomModelText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    device_type: 'MIKROTIK' as DeviceType,
    model_name: 'MikroTik hEX S / RB750Gr3 (Gigabit 5-Port)',
    brand_name: ownerName || '',
    ssid: '',
    ip_address: '192.168.88.1',
    api_port: 8728,
    api_username: 'billing_api',
    api_password_hash: '',
    radius_secret: 'radius_secret_2026',
    location: 'Dar es Salaam, Kariakoo',
    hotspot_server_name: 'hotspot1',
    dns_name: 'wifi.hotspot.lan',
  });

  const handleOpenAddModal = (initialType: DeviceType = 'MIKROTIK') => {
    setEditingRouter(null);
    setIsCustomModel(false);
    setCustomModelText('');
    setError('');
    const defaultBrand = ownerName || '';
    const defaultSsid = defaultBrand
      ? `${defaultBrand.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10)}-WIFI`
      : 'HOTSPOT-WIFI';

    let defaultModel = 'MikroTik hEX S / RB750Gr3 (Gigabit 5-Port)';
    let defaultName = 'RB750Gr3-Hub';
    let defaultIp = '192.168.88.1';

    if (initialType === 'RUIJIE') {
      defaultModel = 'Ruijie Reyee RG-RAP2200(E) (AC1300 Dual-Band Gigabit)';
      defaultName = 'Ruijie-RAP2200-AP';
      defaultIp = '192.168.110.1';
    } else if (initialType === 'TPLINK_OMADA') {
      defaultModel = 'TP-Link Omada EAP610 (AX1800 Wi-Fi 6 Ceiling)';
      defaultName = 'Omada-EAP-AP';
      defaultIp = '192.168.0.1';
    } else if (initialType === 'OPENWRT_CUDY') {
      defaultModel = 'Cudy WR1300 / WR2100 (OpenWrt CoovaChilli)';
      defaultName = 'Cudy-WR1300-Gateway';
      defaultIp = '192.168.1.1';
    } else if (initialType === 'UBIQUITI_UNIFI') {
      defaultModel = 'Ubiquiti UniFi U6-Lite / Pro (Wi-Fi 6 AP)';
      defaultName = 'UniFi-U6-AP';
      defaultIp = '192.168.1.1';
    } else if (initialType === 'GENERIC_RADIUS') {
      defaultModel = 'Grandstream GWN, Tenda, Netgear, Zyxel';
      defaultName = 'DLink-Cloud-AP';
      defaultIp = '192.168.0.1';
    }

    setFormData({
      name: defaultName,
      device_type: initialType,
      model_name: defaultModel,
      brand_name: defaultBrand,
      ssid: defaultSsid,
      ip_address: defaultIp,
      api_port: 8728,
      api_username: initialType === 'MIKROTIK' ? 'billing_api' : 'radius_client',
      api_password_hash: '',
      radius_secret: 'radius_secret_2026',
      location: 'Dar es Salaam, Kariakoo',
      hotspot_server_name: 'hotspot1',
      dns_name: 'wifi.hotspot.lan',
    });
    setModalOpen(true);
  };

  const handleOpenEditRouter = (router: RouterItem) => {
    setEditingRouter(router);
    setError('');

    const matchingModel = ALL_DEVICE_MODELS.find((m) => m.name === router.model_name);
    if (matchingModel && matchingModel.id !== 'CUSTOM') {
      setIsCustomModel(false);
      setCustomModelText('');
    } else if (router.model_name) {
      setIsCustomModel(true);
      setCustomModelText(router.model_name);
    } else {
      setIsCustomModel(false);
      setCustomModelText('');
    }

    setFormData({
      name: router.name || '',
      device_type: (router.device_type || 'MIKROTIK') as DeviceType,
      model_name: router.model_name || 'MikroTik Router',
      brand_name: router.brand_name || router.name || '',
      ssid: router.ssid || `${(router.brand_name || router.name).split(' ')[0].toUpperCase()}-WIFI`,
      ip_address: router.ip_address || '192.168.88.1',
      api_port: router.api_port || 8728,
      api_username: router.api_username || 'billing_api',
      api_password_hash: '',
      radius_secret: router.radius_secret || 'radius_secret_2026',
      location: router.location || 'Dar es Salaam, Kariakoo',
      hotspot_server_name: router.hotspot_server_name || 'hotspot1',
      dns_name: router.dns_name || 'wifi.hotspot.lan',
    });
    setModalOpen(true);
  };

  // Edit Brand & SSID state
  const [editingBrandRouter, setEditingBrandRouter] = useState<RouterItem | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editSsid, setEditSsid] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [savingBrandEdit, setSavingBrandEdit] = useState(false);
  const [brandEditError, setBrandEditError] = useState('');

  const handleOpenEditBrand = (router: RouterItem) => {
    setEditingBrandRouter(router);
    setEditBrandName(router.brand_name || router.name);
    setEditSsid(router.ssid || `${(router.brand_name || router.name).split(' ')[0].toUpperCase()}-WIFI`);
    setEditLocation(router.location || '');
    setBrandEditError('');
  };

  const handleSaveBrandEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrandRouter) return;
    if (!editBrandName.trim()) {
      setBrandEditError('Tafadhali weka jina la Hotspot / Brand yako.');
      return;
    }

    setSavingBrandEdit(true);
    setBrandEditError('');
    try {
      const res = await fetch(`/api/v1/routers/${editingBrandRouter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: editBrandName.trim(),
          ssid: editSsid.trim() || undefined,
          location: editLocation.trim() || editingBrandRouter.location,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Imeshindwa kubadili jina la Brand.');
      }

      setEditingBrandRouter(null);
      await fetchRouters();
    } catch (err: any) {
      setBrandEditError(err.message);
    } finally {
      setSavingBrandEdit(false);
    }
  };

  const fetchRouters = async () => {
    try {
      setLoading(true);
      const url = ownerId ? `/api/v1/routers?ownerId=${ownerId}` : '/api/v1/routers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRouters(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouters();
  }, [ownerId]);

  const handleOpenScript = async (router: RouterItem) => {
    setSelectedScriptRouter(router);
    setLoadingScript(true);

    if ((router.model_name && (router.model_name.includes('CPE') || router.model_name.includes('Pharos') || router.model_name.includes('WBS'))) || router.cpe_mode) {
      setActiveScriptTab('cpe');
    } else if (router.device_type === 'RUIJIE') {
      setActiveScriptTab('ruijie');
    } else if (router.device_type === 'TPLINK_OMADA') {
      setActiveScriptTab('omada');
    } else if (router.device_type === 'OPENWRT_CUDY') {
      setActiveScriptTab('openwrt');
    } else if (router.device_type === 'UBIQUITI_UNIFI') {
      setActiveScriptTab('unifi');
    } else if (router.device_type === 'GENERIC_RADIUS') {
      setActiveScriptTab('generic');
    } else {
      setActiveScriptTab('allInOne');
    }

    try {
      const [vpnRes, hotspotRes, pppoeRes, allInOneRes, vpnScriptsRes, configRes, antiTetheringRes] = await Promise.all([
        fetch(`/api/v1/scripts/vpn.rsc?routerId=${router.id}`),
        fetch(`/api/v1/scripts/hotspot.rsc?routerId=${router.id}`),
        fetch(`/api/v1/scripts/pppoe.rsc?routerId=${router.id}`),
        fetch(`/api/v1/scripts/all-in-one.rsc?routerId=${router.id}`),
        fetch(`/api/v1/routers/${router.id}/vpn-scripts`),
        fetch(`/api/v1/routers/${router.id}/device-config`),
        fetch(`/api/v1/scripts/anti-tethering.rsc?routerId=${router.id}`),
      ]);

      const vpnData = vpnRes.ok ? await vpnRes.json() : { script: '' };
      const hotspotData = hotspotRes.ok ? await hotspotRes.json() : { script: '' };
      const pppoeData = pppoeRes.ok ? await pppoeRes.json() : { script: '' };
      const allInOneData = allInOneRes.ok ? await allInOneRes.json() : { script: '' };
      const vpnScriptsData = vpnScriptsRes.ok ? await vpnScriptsRes.json() : {};
      const configData = configRes.ok ? await configRes.json() : null;
      const antiTetheringData = antiTetheringRes.ok ? await antiTetheringRes.json() : { script: '' };

      setDeviceConfigData(configData);
      setVpnScripts({
        vpnRsc: vpnData.script || '',
        hotspotRsc: hotspotData.script || '',
        pppoeRsc: pppoeData.script || '',
        antiTetheringRsc: antiTetheringData.script || '',
        allInOne: allInOneData.script || '',
        wireguard: vpnScriptsData.wireguard || '',
        sstp: vpnScriptsData.sstp || '',
        cloudPoll: vpnScriptsData.cloudPoll || '',
        master: vpnScriptsData.master || allInOneData.script || '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScript(false);
    }
  };

  const handleToggleAntiTethering = async (router: RouterItem) => {
    const nextState = !router.anti_tethering;
    setTogglingAntiTetheringId(router.id);
    try {
      const res = await fetch(`/api/v1/routers/${router.id}/anti-tethering`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();
      if (res.ok) {
        setRouters((prev) =>
          prev.map((r) => (r.id === router.id ? { ...r, anti_tethering: nextState } : r))
        );
        if (selectedScriptRouter?.id === router.id) {
          setSelectedScriptRouter({ ...selectedScriptRouter, anti_tethering: nextState });
        }
      } else {
        alert(data.error || 'Imeshindwa kubadilisha hali ya Anti-Tethering.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingAntiTetheringId(null);
    }
  };

  const getActiveScriptContent = (): string => {
    if (activeScriptTab === 'ruijie') {
      return (
        `# Ruijie Reyee Cloud Captive Portal Settings\n` +
        `Portal URL: ${deviceConfigData?.ruijie?.portalUrl || 'https://infotechwifi.com/?routerId=' + selectedScriptRouter?.id}\n` +
        `RADIUS Server IP: ${deviceConfigData?.ruijie?.radiusIp || 'infotechwifi.com'}\n` +
        `RADIUS Auth Port: 1812\n` +
        `RADIUS Acct Port: 1813\n` +
        `RADIUS CoA Port: 3799\n` +
        `RADIUS Shared Secret: ${selectedScriptRouter?.radius_secret || 'radius_secret_2026'}\n` +
        `\n# Walled Garden Whitelist:\n` +
        (deviceConfigData?.ruijie?.walledGardenDomains?.join('\n') || '')
      );
    }
    if (activeScriptTab === 'omada') {
      return (
        `# TP-Link Omada Controller Hotspot Settings\n` +
        `External Web Portal URL: ${deviceConfigData?.omada?.portalUrl || 'https://infotechwifi.com/?routerId=' + selectedScriptRouter?.id}\n` +
        `RADIUS Server IP: ${deviceConfigData?.omada?.radiusIp || 'infotechwifi.com'}\n` +
        `RADIUS Auth Port: 1812\n` +
        `RADIUS Acct Port: 1813\n` +
        `RADIUS CoA Port: 3799\n` +
        `RADIUS Shared Secret: ${selectedScriptRouter?.radius_secret || 'radius_secret_2026'}`
      );
    }
    if (activeScriptTab === 'cpe') {
      return (
        `# TP-Link Pharos CPE Configuration (PharOS Web: 192.168.0.254)\n` +
        `Model: ${selectedScriptRouter?.model_name || 'TP-Link Pharos CPE'}\n` +
        `External Portal URL: ${deviceConfigData?.cpe?.portalUrl || 'https://infotechwifi.com/?routerId=' + selectedScriptRouter?.id}\n` +
        `RADIUS Server IP: ${deviceConfigData?.cpe?.radiusIp || 'infotechwifi.com'}\n` +
        `RADIUS Secret: ${selectedScriptRouter?.radius_secret || 'radius_secret_2026'}\n\n` +
        `# Mwongozo Muhimu wa PharOS (Kwenye Web GUI 192.168.0.254):\n` +
        `1. Operation Mode: Access Point (AP) kwa ajili ya Hotspot, au Client kwa Wireless PtP Bridge.\n` +
        `2. SHERIA KUU: ZIMA "MAXtream" (tab ya MAXtream -> Ondoa tiki ya Enable MAXtream) ili simu ziunganishwe!\n` +
        `3. Wireless: Weka 20MHz Channel Width kwa utulivu mkubwa wa simu za mkononi, Security: None.\n` +
        `4. Network: Weka Static IP kwenye mtandao wako wa ndani (mfano 192.168.88.254, Gateway 192.168.88.1).`
      );
    }
    if (activeScriptTab === 'openwrt') {
      return deviceConfigData?.openwrt?.installScript || deviceConfigData?.openwrt?.chilliConf || '';
    }
    if (activeScriptTab === 'unifi') {
      return (
        `# Ubiquiti UniFi Guest Hotspot Settings\n` +
        `External Portal Server IP / Host: infotechwifi.com\n` +
        `Portal URL: https://infotechwifi.com/?routerId=${selectedScriptRouter?.id}\n` +
        `RADIUS Server IP: infotechwifi.com\n` +
        `Port: 1812 / 1813\n` +
        `Secret: ${selectedScriptRouter?.radius_secret || 'radius_secret_2026'}`
      );
    }
    if (activeScriptTab === 'generic') {
      return (
        `# D-Link / Generic Access Point External Portal & Cloud RADIUS Settings\n` +
        `Portal Mode: External Captive Portal / Web Authentication\n` +
        `External Portal URL: https://infotechwifi.com/?routerId=${selectedScriptRouter?.id}&ap_vendor=generic\n` +
        `Primary RADIUS Server IP: infotechwifi.com\n` +
        `Authentication Port (UDP): 1812\n` +
        `Accounting Port (UDP): 1813\n` +
        `RADIUS CoA / Disconnect Port (RFC 5176): 3799\n` +
        `RADIUS Shared Secret: ${selectedScriptRouter?.radius_secret || 'radius_secret_2026'}\n` +
        `NAS-Identifier: ${selectedScriptRouter?.name || 'GENERIC-AP-01'}\n` +
        `\n# Walled Garden Domains (Bypass for Payment):\n` +
        `api.palmpesa.com\ncheckout.azampay.com\nmpesa.vodacom.co.tz\ntigopesa.tigo.co.tz\nairtelmoney.airtel.co.tz\nhalopesa.co.tz`
      );
    }

    if (!vpnScripts) return '';
    switch (activeScriptTab) {
      case 'allInOne':
        return vpnScripts.allInOne || vpnScripts.master;
      case 'vpn':
        return vpnScripts.vpnRsc;
      case 'hotspot':
        return vpnScripts.hotspotRsc;
      case 'pppoe':
        return vpnScripts.pppoeRsc;
      case 'antiTethering':
        return vpnScripts.antiTetheringRsc || '';
      case 'wireguard':
        return vpnScripts.wireguard;
      case 'cloudPoll':
        return vpnScripts.cloudPoll;
      case 'sstp':
        return vpnScripts.sstp;
      default:
        return vpnScripts.allInOne || vpnScripts.master;
    }
  };

  const handleCopyScript = () => {
    const text = getActiveScriptContent();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadRsc = () => {
    const text = getActiveScriptContent();
    const filename = `${selectedScriptRouter?.name || 'mikrotik'}_${activeScriptTab}.rsc`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSpecific = (type: 'vpn' | 'hotspot' | 'pppoe' | 'all-in-one' | 'anti-tethering') => {
    if (!selectedScriptRouter) return;
    const url = `/api/v1/scripts/${type}.rsc?routerId=${selectedScriptRouter.id}&download=true`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedScriptRouter.name}-${type}.rsc`;
    a.click();
  };

  const handleTestConnection = async (router: RouterItem) => {
    setTestingId(router.id);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/routers/${router.id}/test-connection`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult({
        routerId: router.id,
        reachable: !!data.reachable,
        latencyMs: data.latencyMs || 0,
        message: data.message || (data.reachable ? 'Connection established successfully' : 'Router unreachable'),
      });
      fetchRouters();
    } catch (err: any) {
      setTestResult({
        routerId: router.id,
        reachable: false,
        latencyMs: 0,
        message: err.message || 'Network timeout connecting to MikroTik API',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSaveRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    const isMikrotik = formData.device_type === 'MIKROTIK';
    if (!formData.name.trim() || !formData.ip_address.trim()) {
      setError('Tafadhali jaza jina la kifaa na IP address.');
      return;
    }
    if (isMikrotik && !formData.api_username.trim()) {
      setError('Tafadhali weka API Username ya MikroTik.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const finalModelName = isCustomModel
        ? (customModelText.trim() || 'Custom Wi-Fi Device')
        : (formData.model_name.trim() || 'MikroTik RouterOS');

      const isCpe = finalModelName.includes('CPE') || finalModelName.includes('Pharos') || finalModelName.includes('WBS');

      const payload: Record<string, any> = {
        name: formData.name.trim(),
        device_type: formData.device_type,
        model_name: finalModelName,
        is_custom_model: isCustomModel,
        cpe_mode: isCpe ? 'HOTSPOT_AP' : undefined,
        pharos_maxtream_disabled: isCpe ? true : undefined,
        brand_name: formData.brand_name.trim() || formData.name.trim(),
        ssid: formData.ssid.trim(),
        ip_address: formData.ip_address.trim(),
        api_username: isMikrotik ? formData.api_username.trim() : (formData.api_username.trim() || 'radius_client'),
        api_port: isMikrotik ? (Number(formData.api_port) || 8728) : 8728,
        radius_secret: formData.radius_secret?.trim() || 'radius_secret_2026',
        location: formData.location?.trim() || 'Dar es Salaam, Kariakoo',
        hotspot_server_name: formData.hotspot_server_name?.trim() || 'hotspot1',
        dns_name: formData.dns_name?.trim() || 'wifi.hotspot.lan',
        owner_id: ownerId || undefined,
      };

      if (formData.api_password_hash.trim()) {
        payload.api_password_hash = formData.api_password_hash.trim();
      }

      if (editingRouter) {
        // UPDATE EXISTING ROUTER
        const res = await fetch(`/api/v1/routers/${editingRouter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Imeshindwa kuhifadhi mabadiliko ya kifaa.');
        }

        setModalOpen(false);
        setEditingRouter(null);
        await fetchRouters();
      } else {
        // CREATE NEW ROUTER
        const res = await fetch('/api/v1/routers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Imeshindwa kuongeza router.');
        }

        setModalOpen(false);
        await fetchRouters();

        // Automatically open script modal for new router
        if (data.router) {
          handleOpenScript(data.router);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRouter = async (id: number) => {
    if (!confirm('Je, una uhakika unataka kuondoa router hii?')) return;
    try {
      const res = await fetch(`/api/v1/routers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchRouters();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered & Paginated Routers (10, 20, 30, 40, ALL)
  const filteredRouters = routers.filter((r) => {
    if (deviceFilter === 'PHAROS_CPE') {
      const isCpe = (r.model_name && (r.model_name.includes('CPE') || r.model_name.includes('Pharos') || r.model_name.includes('WBS'))) || r.cpe_mode;
      if (!isCpe) return false;
    } else if (deviceFilter !== 'ALL' && r.device_type !== deviceFilter) {
      return false;
    }
    if (!routerSearch) return true;
    const q = routerSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      (r.brand_name && r.brand_name.toLowerCase().includes(q)) ||
      (r.ssid && r.ssid.toLowerCase().includes(q)) ||
      (r.ip_address && r.ip_address.toLowerCase().includes(q)) ||
      (r.location && r.location.toLowerCase().includes(q)) ||
      (r.model_name && r.model_name.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setRouterPage(1);
  }, [routerSearch, deviceFilter, routers.length]);

  const paginatedRouters =
    routerPageSize === 'ALL'
      ? filteredRouters
      : filteredRouters.slice((routerPage - 1) * routerPageSize, routerPage * routerPageSize);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            {ownerId ? `Vifaa Vyangu vya WiFi & Routers (${routers.length})` : 'Router & Access Point Hardware Management'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ownerId
              ? `Simamia MikroTik, Ruijie Reyee, TP-Link Omada & CPE, Cudy/OpenWrt au D-Link kwenye biashara ya ${ownerName || 'hotspot yako'}.`
              : 'Multi-Brand Gateway Management: MikroTik RouterOS, Ruijie Reyee Cloud, TP-Link Omada, Pharos CPE, OpenWrt & FreeRADIUS'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleOpenOmadaModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer"
            title="Unganisha AP ya TP-Link Omada kupitia Controller Inform URL na Check Adoption"
          >
            <Wifi className="w-4 h-4 text-teal-200" />
            <span>🟢 Omada AP Adoption</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGuideInitialTab('PHAROS_CPE');
              setGuideModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 font-bold text-xs border border-amber-300 transition cursor-pointer"
            title="Mwongozo wa Kusanidi TP-Link Pharos CPE (CPE210 / CPE220 / CPE510 / CPE610)"
          >
            <span>📡</span>
            <span>Mwongozo wa Pharos CPE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGuideInitialTab('OVERVIEW');
              setGuideModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md border border-slate-700 transition cursor-pointer"
            title="Fungua na Pakua Mwongozo Kamili wa PDF wa Kusanidi AP & Malipo"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>📄 Mwongozo wa PDF</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddModal('MIKROTIK')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{ownerId ? '➕ Ongeza Router au AP' : 'Ongeza Kifaa Kipya (Add Device)'}</span>
          </button>
        </div>
      </div>

      {/* Multi-Brand Hotspot & AP Showcase Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white border border-indigo-900/40 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Multi-Brand Support: Hakuna Lazima ya Router ya MikroTik!</span>
              </div>
              <button
                type="button"
                onClick={() => setGuideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-400/40 text-indigo-200 text-xs font-black transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>📥 Pakua PDF ya Mwongozo</span>
              </button>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              Una Access Point ya Ruijie, TP-Link Omada, Cudy, D-Link au MikroTik?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mfumo huu una <strong>Cloud RADIUS & External Captive Portal</strong> iliyojengwa tayari. Kifaa chako kikirusha Wi-Fi, wateja wanaelekezwa moja kwa moja kwenye ukurasa wa kulipia kwa M-Pesa, Tigo Pesa, na Airtel Money, kisha intaneti inafunguka papo hapo bila wewe kununua router ya ziada!
            </p>
          </div>

          {/* Quick-Add Brand Shortcuts */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenAddModal('RUIJIE')}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🟠 + Ruijie Reyee</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenOmadaModal()}
              className="px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/50 text-teal-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🟢 + TP-Link Omada (Adopt)</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('OPENWRT_CUDY')}
              className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/40 text-sky-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔵 + Cudy / OpenWrt</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('GENERIC_RADIUS')}
              className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>⚪ + D-Link / Generic</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenAddModal('MIKROTIK')}
              className="px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>🔴 + MikroTik</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : routers.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-indigo-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <Server className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {ownerId ? 'Hujasajili Router au Access Point Yoyote Bado' : 'Hakuna Vifaa Vilivyosajiliwa Kwenye Mfumo'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
              {ownerId
                ? `Unganisha router ya MikroTik au Access Point ya Ruijie Reyee, TP-Link Omada, au Cudy kwenye akaunti ya ${ownerName || 'biashara yako'} ili uanze kukusanya malipo ya M-Pesa na Tigo Pesa bila kikwazo.`
                : 'Sajili kifaa cha kwanza cha mtandao ili kuanzisha mfumo wa malipo na usimamizi wa wateja.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenAddModal('MIKROTIK')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ Ongeza Router au Access Point Yako Sasa</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search & Device Brand Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={routerSearch}
                onChange={(e) => setRouterSearch(e.target.value)}
                placeholder="Tafuta kifaa kwa jina, brand, SSID, IP, au eneo..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="w-full sm:w-auto text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">Vifaa Vyote ({routers.length})</option>
                <option value="MIKROTIK">🔴 MikroTik RouterOS</option>
                <option value="TPLINK_OMADA">🟢 TP-Link Omada EAPs</option>
                <option value="PHAROS_CPE">📡 TP-Link Pharos CPEs</option>
                <option value="RUIJIE">🟠 Ruijie Reyee Cloud AP</option>
                <option value="OPENWRT_CUDY">🔵 Cudy / OpenWrt</option>
                <option value="UBIQUITI_UNIFI">🟣 Ubiquiti UniFi</option>
                <option value="GENERIC_RADIUS">⚪ Generic RADIUS</option>
              </select>
            </div>
          </div>

          {filteredRouters.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-500 text-xs">
              Hakuna kifaa kilichopatikana kulingana na vigezo ulivyoweka.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 w-full">
                {paginatedRouters.map((router) => {
            const isTesting = testingId === router.id;
            const currentTest = testResult?.routerId === router.id ? testResult : null;
            const profile = DEVICE_PROFILES[router.device_type || 'MIKROTIK'] || DEVICE_PROFILES.MIKROTIK;

            return (
              <div
                key={router.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-slate-300 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {router.device_type === 'RUIJIE' ? (
                        <Radio className="w-5 h-5 text-amber-400" />
                      ) : router.device_type === 'TPLINK_OMADA' ? (
                        <Wifi className="w-5 h-5 text-teal-400" />
                      ) : router.device_type === 'OPENWRT_CUDY' ? (
                        <Cpu className="w-5 h-5 text-sky-400" />
                      ) : (
                        <Server className="w-5 h-5 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-base text-slate-900 leading-tight">
                          {router.brand_name || router.name}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${profile.color}`}>
                          <span>{profile.icon}</span>
                          <span>{profile.name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditRouter(router)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                          title="Hariri taarifa na mipangilio yote ya kifaa hiki (Edit Router / AP)"
                        >
                          <Edit2 className="w-3 h-3 text-indigo-600" />
                          <span>Hariri Kifaa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBrand(router)}
                          className="px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                          title="Badili Jina la Brand & SSID ya Wi-Fi"
                        >
                          ✏️ Badili Jina / SSID
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80">
                          SSID: {router.ssid || `${(router.brand_name || router.name).split(' ')[0].toUpperCase()}-WIFI`}
                        </span>
                        <span className="text-[10px] text-slate-600 font-mono">
                          Model: <strong className="text-slate-900 font-semibold">{router.model_name || router.name}</strong>
                        </span>
                        {((router.model_name && (router.model_name.includes('CPE') || router.model_name.includes('Pharos') || router.model_name.includes('WBS'))) || router.cpe_mode) && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                            <span>📡</span>
                            <span>Pharos CPE Outdoor</span>
                          </span>
                        )}
                        {router.is_custom_model && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200">
                            Custom Model
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({router.name})
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{router.location}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 w-fit mt-1">
                        <CreditCard className="w-3 h-3 text-emerald-600" />
                        <span>
                          {router.palmpesa_user_id
                            ? `PalmPesa User ID: ${router.palmpesa_user_id}`
                            : router.owner_name
                            ? `PalmPesa: Inafuata Mmiliki (${router.owner_name})`
                            : 'PalmPesa: Admin Default (770)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {router.device_type === 'TPLINK_OMADA' && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border flex items-center gap-1 ${
                          router.adoption_status === 'ADOPTED'
                            ? 'bg-teal-50 text-teal-800 border-teal-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            router.adoption_status === 'ADOPTED' ? 'bg-teal-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        <span>{router.adoption_status === 'ADOPTED' ? 'ADOPTED' : 'PENDING ADOPT'}</span>
                      </span>
                    )}

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border flex items-center gap-1 ${
                        router.status === 'ONLINE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          router.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      {router.status}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEditRouter(router)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition cursor-pointer"
                      title="Hariri kifaa hiki (Edit Router / AP Details)"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteRouter(router.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Futa kifaa (Delete device)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Router Specs */}
                {router.device_type === 'TPLINK_OMADA' ? (
                  <div className="bg-teal-50/50 rounded-xl p-3 border border-teal-200 font-mono text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">AP MAC Address</span>
                        <span className="font-black text-slate-900 truncate block">
                          {router.mac_address || '50:D4:F7:2B:8C:1A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">AP Device Account</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {router.ap_username || 'admin'} / ••••••••
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Controller Inform</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-teal-800 text-[11px] truncate block">
                            infotechwifi.com:29810
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('http://infotechwifi.com:29810/inform');
                              setPortalUrlCopiedId(router.id + 9000);
                              setTimeout(() => setPortalUrlCopiedId(null), 2500);
                            }}
                            className="text-[10px] text-teal-700 hover:text-teal-900 cursor-pointer"
                            title="Nakili Inform URL"
                          >
                            {portalUrlCopiedId === router.id + 9000 ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Wi-Fi Radios</span>
                        <span className="font-bold text-emerald-700">
                          2.4G (Ch {router.omada_channel_2g || 6}) • 5G (Ch {router.omada_channel_5g || 44})
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 rounded-xl p-3 border border-slate-100 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {router.device_type === 'MIKROTIK' || !router.device_type ? 'API Endpoint' : 'Device Gateway IP'}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {router.ip_address}
                        {(router.device_type === 'MIKROTIK' || !router.device_type) && `:${router.api_port}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Portal Engine</span>
                      <span className="font-semibold text-slate-800">
                        {router.device_type === 'RUIJIE'
                          ? 'Reyee Cloud Portal'
                          : router.device_type === 'OPENWRT_CUDY'
                          ? 'CoovaChilli Gateway'
                          : router.hotspot_server_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">FreeRADIUS Server</span>
                      <span className="font-semibold text-emerald-700">
                        infotechwifi.com:1812
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">RADIUS CoA Port</span>
                      <span className="font-semibold text-indigo-700">
                        3799 (RFC 5176)
                      </span>
                    </div>
                  </div>
                )}

                {/* Omada Adoption Feedback */}
                {adoptionFeedback && adoptionFeedback.routerId === router.id && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      adoptionFeedback.success
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {adoptionFeedback.success ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>{adoptionFeedback.message}</span>
                    </div>
                  </div>
                )}

                {/* Connection Test Output if clicked */}
                {currentTest && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      currentTest.reachable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {currentTest.reachable ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>{currentTest.message}</span>
                    </div>
                    {currentTest.latencyMs > 0 && (
                      <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded shadow-2xs">
                        {currentTest.latencyMs}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Actions tailored to Hardware Type */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={() => handleTestConnection(router)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                    <span>{isTesting ? 'Inapima...' : 'Pima Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditRouter(router)}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Hariri taarifa na mipangilio ya router/AP (Edit Device)"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hariri Kifaa</span>
                  </button>

                  {((router.model_name && (router.model_name.includes('CPE') || router.model_name.includes('Pharos') || router.model_name.includes('WBS'))) || router.cpe_mode) && (
                    <button
                      type="button"
                      onClick={() => {
                        setGuideInitialTab('PHAROS_CPE');
                        setGuideModalOpen(true);
                      }}
                      className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Mwongozo wa Kusanidi TP-Link PharOS na Kuzima MAXtream"
                    >
                      <Wifi className="w-3.5 h-3.5 text-amber-700" />
                      <span>Mwongozo wa CPE</span>
                    </button>
                  )}

                  {(!router.device_type || router.device_type === 'MIKROTIK') ? (
                    <>
                      <div className="w-full bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${router.anti_tethering ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[11px] text-slate-800">Anti-Tethering (TTL=1)</span>
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase ${router.anti_tethering ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {router.anti_tethering ? 'ACTIVE' : 'OFF'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              Zuia simu kuwasha Hotspot kusambazia wengine
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={togglingAntiTetheringId === router.id}
                          onClick={() => handleToggleAntiTethering(router)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                            router.anti_tethering
                              ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                          }`}
                          title="Washa/Zima ulinzi wa kuzuia wateja kusambaza intaneti kupitia Hotspot ya simu"
                        >
                          {togglingAntiTetheringId === router.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : router.anti_tethering ? (
                            'Zima'
                          ) : (
                            'Washa'
                          )}
                        </button>
                      </div>

                      <a
                        href={`/api/v1/routers/${router.id}/mikrotik-login-file`}
                        download="login.html"
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                        title="Download captive portal login.html"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Pakua login.html</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleOpenScript(router)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>MikroTik Cloud VPN & Setup Scripts</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Copy External Captive Portal URL for Access Points */}
                      <button
                        type="button"
                        onClick={() => {
                          const pUrl = `https://infotechwifi.com/?routerId=${router.id}&ap_vendor=${(router.device_type || 'generic').toLowerCase()}`;
                          navigator.clipboard.writeText(pUrl);
                          setPortalUrlCopiedId(router.id);
                          setTimeout(() => setPortalUrlCopiedId(null), 2500);
                        }}
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                        title="Nakili External Captive Portal URL ya kuweka kwenye AP yako"
                      >
                        {portalUrlCopiedId === router.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Imenakiliwa!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Nakili Portal URL</span>
                          </>
                        )}
                      </button>

                      {router.device_type === 'RUIJIE' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenScript(router)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Radio className="w-3.5 h-3.5 text-white" />
                          <span>Mwongozo wa Ruijie Cloud Portal & RADIUS</span>
                        </button>
                      ) : router.device_type === 'TPLINK_OMADA' ? (
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          {/* 1. Direct Check Adoption Button */}
                          <button
                            type="button"
                            disabled={checkingAdoptionId === router.id}
                            onClick={() => handleCheckAdoptionDirect(router)}
                            className="flex-1 py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-w-[140px]"
                            title="Kagua kama AP imeunganishwa (Check Adoption Status)"
                          >
                            {checkingAdoptionId === router.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                <span>Inakagua...</span>
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 text-teal-200" />
                                <span>🔄 Check Adoption</span>
                              </>
                            )}
                          </button>

                          {/* 2. Open Omada Adoption Wizard Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenOmadaModal(router)}
                            className="py-2 px-3 rounded-xl border border-teal-400 bg-teal-50/50 hover:bg-teal-100 text-teal-900 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            title="Fungua Wizard ya Kuunganisha Omada, Weka MAC, SSID na Password"
                          >
                            <Wifi className="w-3.5 h-3.5 text-teal-700" />
                            <span>Omada Wizard</span>
                          </button>

                          {/* 3. Soft Reboot Omada AP */}
                          <button
                            type="button"
                            onClick={() => handleRebootOmada(router)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs transition cursor-pointer"
                            title="Washa upya AP (Reboot Omada AP)"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          {/* 4. Configuration & RADIUS Guide */}
                          <button
                            type="button"
                            onClick={() => handleOpenScript(router)}
                            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <FileCode className="w-3.5 h-3.5 text-teal-300" />
                            <span>Mwongozo wa Inform URL & RADIUS Profile</span>
                          </button>
                        </div>
                      ) : router.device_type === 'OPENWRT_CUDY' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenScript(router)}
                          className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Terminal className="w-3.5 h-3.5 text-white" />
                          <span>Script ya CoovaChilli (Cudy / OpenWrt)</span>
                        </button>
                      ) : router.device_type === 'UBIQUITI_UNIFI' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenScript(router)}
                          className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-white" />
                          <span>Mwongozo wa UniFi Hotspot & RADIUS</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenScript(router)}
                          className="flex-1 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Server className="w-3.5 h-3.5 text-white" />
                          <span>Mwongozo wa D-Link / Generic Cloud RADIUS</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <TablePagination
            currentPage={routerPage}
            totalItems={filteredRouters.length}
            pageSize={routerPageSize}
            onPageChange={setRouterPage}
            onPageSizeChange={setRouterPageSize}
            itemName="vifaa vya mtandao"
          />
        </div>
      </>
    )}
  </div>
)}

      {/* Advanced Cloud VPN & Script Center Modal */}
      {selectedScriptRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2 flex-wrap">
                    <span>MikroTik Script & FreeRADIUS AAA Provisioning</span>
                    <span className="text-[11px] bg-indigo-500/25 text-indigo-300 font-mono font-bold px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                      {selectedScriptRouter.name}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Auto-generated RouterOS configuration scripts for VPN, Hotspot, and PPPoE with FreeRADIUS AAA & CoA
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeScriptTab !== 'instructions' && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownloadRsc}
                      className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Pakua .rsc</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Imenakiliwa!' : 'Nakili Script'}</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setGuideModalOpen(true)}
                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  title="Fungua na Pakua Mwongozo Kamili wa PDF"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Mwongozo wa PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScriptRouter(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hardware Identity & VPN Network Bar */}
            <div className="bg-slate-950/80 px-5 py-3 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-mono">Router Identity</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-400" />
                  {selectedScriptRouter.name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-mono">Assigned VPN Tunnel IP</span>
                <span className="font-mono font-bold text-cyan-400">
                  {selectedScriptRouter.vpn_assigned_ip || '100.108.0.2'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-mono">Connection Status</span>
                <span className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      selectedScriptRouter.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                  <span className={selectedScriptRouter.status === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedScriptRouter.status}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-mono">FreeRADIUS AAA / CoA</span>
                <span className="font-mono text-emerald-400 font-bold">
                  100.108.0.1:3799
                </span>
              </div>
            </div>

            {/* Quick 1-Click .rsc Download Actions */}
            <div className="bg-slate-900/90 px-5 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-300">
                📥 Direct .rsc File Downloads:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDownloadSpecific('vpn')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-semibold text-emerald-400 border border-slate-700 transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  vpn.rsc
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSpecific('hotspot')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-semibold text-cyan-400 border border-slate-700 transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  hotspot.rsc
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSpecific('pppoe')}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-semibold text-amber-400 border border-slate-700 transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  pppoe.rsc
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSpecific('all-in-one')}
                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-mono font-bold text-white transition flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  all-in-one.rsc
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSpecific('anti-tethering')}
                  className="px-2.5 py-1 rounded-md bg-rose-950/70 hover:bg-rose-900 text-[11px] font-mono font-bold text-rose-300 border border-rose-800 transition flex items-center gap-1"
                  title="Pakua kanuni za kuzuia simu kushare Wi-Fi Hotspot kwa wengine"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  anti-tethering.rsc
                </button>
              </div>
            </div>

            {/* Ecosystem Brand Tabs */}
            <div className="bg-slate-950 px-4 pt-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveScriptTab('allInOne')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  ['allInOne', 'vpn', 'hotspot', 'pppoe', 'antiTethering', 'wireguard', 'cloudPoll', 'sstp'].includes(activeScriptTab)
                    ? 'bg-slate-900 text-indigo-400 border-t-2 border-indigo-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔴 MikroTik RouterOS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('ruijie')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'ruijie'
                    ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟠 Ruijie Reyee Cloud AP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('omada')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'omada'
                    ? 'bg-slate-900 text-teal-400 border-t-2 border-teal-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟢 TP-Link Omada</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('cpe')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'cpe'
                    ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📡 TP-Link Pharos CPE</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('openwrt')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'openwrt'
                    ? 'bg-slate-900 text-sky-400 border-t-2 border-sky-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🔵 Cudy & OpenWrt</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('unifi')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'unifi'
                    ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🟣 Ubiquiti UniFi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('generic')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'generic'
                    ? 'bg-slate-900 text-purple-400 border-t-2 border-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⚪ D-Link & Generic AP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScriptTab('instructions')}
                className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeScriptTab === 'instructions'
                    ? 'bg-slate-900 text-violet-400 border-t-2 border-violet-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Mwongozo wa Ufungaji</span>
              </button>
            </div>

            {/* MikroTik Sub-Flavor Tabs if a MikroTik view is selected */}
            {['allInOne', 'vpn', 'hotspot', 'pppoe', 'antiTethering', 'wireguard', 'cloudPoll', 'sstp'].includes(activeScriptTab) && (
              <div className="bg-slate-900/90 px-4 py-1.5 border-b border-slate-800 flex items-center gap-1 overflow-x-auto text-[11px] font-mono">
                <span className="text-slate-400 font-sans font-bold pr-1">MikroTik RSC:</span>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('allInOne')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeScriptTab === 'allInOne' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  all-in-one.rsc
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('vpn')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeScriptTab === 'vpn' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  vpn.rsc
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('hotspot')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeScriptTab === 'hotspot' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  hotspot.rsc
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('pppoe')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeScriptTab === 'pppoe' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  pppoe.rsc
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('antiTethering')}
                  className={`px-2 py-0.5 rounded cursor-pointer flex items-center gap-1 ${
                    activeScriptTab === 'antiTethering' ? 'bg-rose-600 text-white font-bold' : 'text-rose-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3" />
                  anti-tethering.rsc (TTL=1)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('wireguard')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeScriptTab === 'wireguard' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  wireguard.rsc
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScriptTab('cloudPoll')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeScriptTab === 'cloudPoll' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  cloud-sync.rsc
                </button>
              </div>
            )}

            {/* Script Code Body or Brand Interactive Setup Panels */}
            <div className="p-4 bg-slate-950 flex-1 overflow-auto">
              {loadingScript ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span className="text-xs">Inatengeneza usanidi maalum wa kifaa chako...</span>
                </div>
              ) : activeScriptTab === 'ruijie' ? (
                /* RUIJIE REYEE INTERACTIVE GUIDE */
                <div className="space-y-4 text-xs text-slate-200 max-w-4xl">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <span className="text-2xl">🟠</span>
                    <div>
                      <h4 className="font-bold text-sm text-amber-300">Ruijie Reyee Cloud AP: Hakuna Haja ya MikroTik!</h4>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        Access Point yoyote ya Ruijie Reyee (k.m. RG-RAP2200, RG-RAP1200, au RG-EG105G) inajiunga moja kwa moja na mfumo wa malipo wa Cloud kupitia Reyee Cloud Portal na FreeRADIUS.
                      </p>
                    </div>
                  </div>

                  {/* Quick Copy Credentials for Ruijie Reyee */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">1. External Web Portal URL</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-400 truncate">
                          {deviceConfigData?.ruijie?.portalUrl || `https://infotechwifi.com/?routerId=${selectedScriptRouter.id}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(deviceConfigData?.ruijie?.portalUrl || `https://infotechwifi.com/?routerId=${selectedScriptRouter.id}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] shrink-0 font-sans"
                        >
                          {copied ? '✓ Nakili' : 'Nakili URL'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">2. Primary RADIUS Server IP</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-400">infotechwifi.com</span>
                        <span className="text-slate-400 text-[10px]">Auth: 1812 | Acct: 1813</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">3. RADIUS Shared Secret</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-cyan-400">
                          {selectedScriptRouter.radius_secret || 'radius_secret_2026'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedScriptRouter.radius_secret || 'radius_secret_2026');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] shrink-0 font-sans"
                        >
                          Nakili Secret
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">4. RADIUS CoA Port (RFC 5176)</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-indigo-400">Port 3799</span>
                        <span className="text-emerald-400 text-[10px]">Auto-Disconnect & Unlock</span>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-Step Instructions */}
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">✓</span>
                      <span>Hatua 5 za Kuunganisha Ruijie Reyee Cloud:</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-slate-300 leading-relaxed pl-1">
                      <li>Ingia kwenye akaunti yako ya <strong>cloud.ruijienetworks.com</strong> au kupitia app ya simu ya <strong>Ruijie Reyee</strong>.</li>
                      <li>Fungua Project yako → Nenda <strong>Configuration</strong> → <strong>Auth Portal</strong>.</li>
                      <li>Washa <strong>Captive Portal</strong>, chagua aina ya <strong>"External Web Portal"</strong> na ubandike ile <em>Portal URL</em> hapo juu.</li>
                      <li>Kwenye Authentication, chagua <strong>External RADIUS</strong>, weka IP: <code>infotechwifi.com</code>, Auth Port: <code>1812</code>, Secret: <code>{selectedScriptRouter.radius_secret || 'radius_secret_2026'}</code>.</li>
                      <li>Washa <strong>RADIUS CoA</strong> (Port 3799) na ubonyeze <strong>Save & Deliver</strong>. AP yako itaanza kusukuma wateja kwenye mfumo wa malipo papo hapo!</li>
                    </ol>
                  </div>
                </div>
              ) : activeScriptTab === 'omada' ? (
                /* TP-LINK OMADA INTERACTIVE GUIDE */
                <div className="space-y-4 text-xs text-slate-200 max-w-4xl">
                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-start gap-3">
                    <span className="text-2xl">🟢</span>
                    <div>
                      <h4 className="font-bold text-sm text-teal-300">TP-Link Omada Controller & AP: Hotspot Direct</h4>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        TP-Link Omada inakuruhusu kusanidi External Web Portal Server na External RADIUS Profile bila kutegemea router ya MikroTik.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">Portal Type</span>
                      <span className="font-bold text-teal-400">External Web Portal Server</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">External Portal URL</span>
                      <span className="font-bold text-emerald-400 truncate block">
                        {deviceConfigData?.omada?.portalUrl || `https://infotechwifi.com/?routerId=${selectedScriptRouter.id}`}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">RADIUS IP & Secret</span>
                      <span className="font-bold text-amber-400 block">
                        infotechwifi.com (Secret: {selectedScriptRouter.radius_secret || 'radius_secret_2026'})
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">RADIUS CoA Port</span>
                      <span className="font-bold text-indigo-400">Port 3799 (Active)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-sm text-white">Hatua za Omada Controller (v5.x+):</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                      <li>Kwenye Omada Controller (OC200 au Software), nenda <strong>Settings</strong> → <strong>Authentication</strong> → <strong>Hotspot</strong>.</li>
                      <li>Washa Hotspot kwenye SSID ya wateja (mfano <strong>{selectedScriptRouter.ssid || 'HOTSPOT-WIFI'}</strong>).</li>
                      <li>Chagua <strong>External Portal Server</strong> na ubandike ile URL ya mfumo wetu.</li>
                      <li>Unda <strong>RADIUS Profile</strong> yenye IP <code>infotechwifi.com</code> na Secret <code>{selectedScriptRouter.radius_secret || 'radius_secret_2026'}</code>.</li>
                      <li>Washa <strong>RADIUS CoA</strong> na uhifadhi (Apply). Kila mteja anayeunganisha TP-Link atalipia kwa simu!</li>
                    </ol>
                  </div>
                </div>
              ) : activeScriptTab === 'cpe' ? (
                /* TP-LINK PHAROS CPE (CPE210/CPE220/CPE510/CPE610/CPE710) GUIDE */
                <div className="space-y-4 text-xs text-slate-200 max-w-4xl">
                  {/* Warning banner about MAXtream */}
                  <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <h4 className="font-bold text-sm text-amber-300 uppercase tracking-tight">
                        Sheria Namba 1 ya PharOS: LAZIMA UZIME "MAXtream" Kwa Hotspot ya Simu!
                      </h4>
                    </div>
                    <p className="text-amber-100 text-[11px] leading-relaxed">
                      Kwenye TP-Link Pharos CPE (CPE210, CPE220, CPE510, CPE610, WBS210), mfumo huja na <strong>MAXtream (TDMA)</strong>. Ukiiacha imewashwa, simu za mkononi (Android, iPhone, Tecno, nk.) <strong>HAZITAWEZA</strong> kuunganisha Wi-Fi hata mteja akiwa chini ya mnara!
                    </p>
                    <p className="text-amber-200 font-bold text-[11px]">
                      ✅ Nenda: Web ya CPE (<code>http://192.168.0.254</code>) → Tab ya <strong>MAXtream</strong> → Ondoa alama ya tiki (<strong>Disable MAXtream</strong>) → Bofya Apply!
                    </p>
                  </div>

                  {/* Copyable Quick Values */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Default Web IP & Login</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-teal-400">http://192.168.0.254</span>
                        <span className="text-[10px] text-slate-400 font-sans">admin / admin</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">External Portal URL</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-400 truncate">
                          {deviceConfigData?.cpe?.portalUrl || `https://infotechwifi.com/?routerId=${selectedScriptRouter?.id}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(deviceConfigData?.cpe?.portalUrl || `https://infotechwifi.com/?routerId=${selectedScriptRouter?.id}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] shrink-0 font-sans cursor-pointer"
                        >
                          {copied ? '✓ Nakili' : 'Nakili URL'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">RADIUS Server IP & Secret</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-400">infotechwifi.com</span>
                        <span className="text-cyan-400 text-[10px] truncate max-w-[120px]">
                          {selectedScriptRouter?.radius_secret || 'radius_secret_2026'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans">Pendekezo la Channel Width</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sky-400">20MHz (Standard Mobile)</span>
                        <span className="text-[10px] text-slate-400 font-sans">Utulivu Juu</span>
                      </div>
                    </div>
                  </div>

                  {/* Dual Mode Step-by-Step Instructions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📡</span>
                        <h4 className="font-bold text-xs text-white">Njia A: CPE kama Hotspot ya Nje (AP Mode)</h4>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed pl-1">
                        <li>Chomeka port ya <strong>LAN</strong> ya PoE kwenye MikroTik Hotspot port.</li>
                        <li>Chomeka port ya <strong>POE</strong> kwenye kifaa cha CPE (CPE210 au CPE220).</li>
                        <li>Nenda <strong>Operation Mode</strong> → Chagua <strong>Access Point (AP)</strong>.</li>
                        <li>Nenda <strong>Wireless</strong> → SSID: <code>{selectedScriptRouter?.ssid || 'WIFI-HOTSPOT'}</code>, Channel Width: <strong>20MHz</strong>, Security: <strong>None</strong>.</li>
                        <li>Nenda <strong>MAXtream</strong> → Hakikisha <strong>Disable MAXtream</strong> imewashwa.</li>
                        <li>Nenda <strong>Network</strong> → Weka Static IP (mfano <code>192.168.88.254</code>).</li>
                      </ol>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🌉</span>
                        <h4 className="font-bold text-xs text-white">Njia B: PtP Wireless Bridge (Kusafirisha Mtandao)</h4>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed pl-1">
                        <li>Inafaa kwa <strong>CPE510 / CPE610 / CPE710 (5GHz Dish)</strong>.</li>
                        <li><strong>CPE 1 (Mnara wa Seva):</strong> Operation Mode = <strong>Access Point (AP)</strong>. Hapa unaweza kuwasha MAXtream.</li>
                        <li><strong>CPE 2 (Eneo la Wateja):</strong> Operation Mode = <strong>Client</strong>, tafuta SSID ya mnara mkuu (Survey) kisha unganisha.</li>
                        <li>Washa <strong>Bridge Mode</strong> ili data ipite bila kikwazo (Transparent L2).</li>
                        <li>Chomeka LAN ya Client kwenye Access Point ya wateja. Wateja watalipia M-Pesa kwa urahisi!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              ) : activeScriptTab === 'openwrt' ? (
                /* CUDY & OPENWRT COOVACHILLI GUIDE */
                <div className="space-y-4 text-xs text-slate-200 max-w-4xl">
                  <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-3">
                    <span className="text-2xl">🔵</span>
                    <div>
                      <h4 className="font-bold text-sm text-sky-300">Cudy & OpenWrt Hotspot Gateway (CoovaChilli)</h4>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        Router ya bei nafuu kama Cudy WR1300 au WR2100 yenye OpenWrt inafanya kazi kama Hotspot Box kamili kwa kuendesha CoovaChilli.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">1-Click Shell Script ya Kupaste kwenye Terminal ya Router:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const script = deviceConfigData?.openwrt?.installScript || '';
                          navigator.clipboard.writeText(script);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Imenakiliwa!' : 'Nakili Script Yote'}</span>
                      </button>
                    </div>

                    <pre className="p-3 bg-black/60 rounded-xl text-sky-400 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 border border-slate-800">
                      {deviceConfigData?.openwrt?.installScript || '# Inapakia script ya Cudy / OpenWrt...'}
                    </pre>
                  </div>
                </div>
              ) : activeScriptTab === 'unifi' ? (
                /* UBIQUITI UNIFI GUIDE */
                <div className="space-y-4 text-xs text-slate-200 max-w-4xl">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                    <span className="text-2xl">🟣</span>
                    <div>
                      <h4 className="font-bold text-sm text-blue-300">Ubiquiti UniFi Guest Hotspot Setup</h4>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        Kwenye UniFi Network Application, unawasha Hotspot Portal na kuunganisha External Portal na RADIUS profile.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                      <li>Kwenye UniFi Controller, fungua <strong>Settings</strong> → <strong>Guest Hotspot</strong>.</li>
                      <li>Chagua <strong>External Portal Server</strong> na weka Host: <code>infotechwifi.com</code> na Portal URL yenye Router ID.</li>
                      <li>Kwenye <strong>Profiles</strong> → Unda RADIUS Profile yenye IP: <code>infotechwifi.com</code> na Secret: <code>{selectedScriptRouter.radius_secret || 'radius_secret_2026'}</code>.</li>
                      <li>Hifadhi na utume kwenye Access Point zako za UniFi!</li>
                    </ol>
                  </div>
                </div>
              ) : activeScriptTab === 'generic' ? (
                /* D-LINK & GENERIC CLOUD RADIUS AP GUIDE */
                <div className="space-y-4 text-xs text-slate-200 max-w-4xl">
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-3">
                    <span className="text-2xl">⚪</span>
                    <div>
                      <h4 className="font-bold text-sm text-purple-300">D-Link, Grandstream, Tenda, Netgear & Generic Cloud RADIUS AP</h4>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        Access Point yoyote inayokubali <strong>External Web Portal (URL Redirection)</strong> na <strong>802.1X / RADIUS Authentication</strong> inafanya kazi moja kwa moja bila kuhitaji router ya MikroTik.
                      </p>
                    </div>
                  </div>

                  {/* Quick Copy Credentials for Generic AP */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">1. External Captive Portal URL</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-400 truncate">
                          {`https://infotechwifi.com/?routerId=${selectedScriptRouter.id}&ap_vendor=generic`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://infotechwifi.com/?routerId=${selectedScriptRouter.id}&ap_vendor=generic`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] shrink-0 font-sans cursor-pointer"
                        >
                          {copied ? '✓ Nakili' : 'Nakili URL'}
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">2. RADIUS Server IP</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-amber-400">infotechwifi.com</span>
                        <span className="text-slate-400 text-[10px]">Auth: 1812 | Acct: 1813</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">3. RADIUS Shared Secret</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-cyan-400">
                          {selectedScriptRouter.radius_secret || 'radius_secret_2026'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedScriptRouter.radius_secret || 'radius_secret_2026');
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] shrink-0 font-sans cursor-pointer"
                        >
                          Nakili Secret
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block uppercase">4. RADIUS CoA / Disconnect Port</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-indigo-400">Port 3799 (RFC 5176)</span>
                        <span className="text-emerald-400 text-[10px]">Papo kwa Papo</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                    <h4 className="font-bold text-sm text-white">Hatua za Kusanidi Access Point ya D-Link / Brand Nyingine:</h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-1">
                      <li>Ingia kwenye ukurasa wa web wa Access Point yako (k.m. <code>192.168.0.50</code> au app ya usimamizi).</li>
                      <li>Nenda kwenye menyu ya <strong>Captive Portal / Web Authentication / Hotspot</strong>.</li>
                      <li>Chagua aina ya <strong>External Web Portal</strong> na weka Portal URL hapo juu.</li>
                      <li>Kwenye <strong>RADIUS Server</strong>, weka IP: <code>infotechwifi.com</code>, Auth Port: <code>1812</code>, Secret: <code>{selectedScriptRouter.radius_secret || 'radius_secret_2026'}</code>.</li>
                      <li>Kwenye <strong>Walled Garden / Free Pass List</strong>, weka: <code>*.palmpesa.com</code>, <code>*.azampay.com</code>, <code>*.vodacom.co.tz</code>, <code>*.tigo.co.tz</code>, <code>*.airtel.co.tz</code>, na <code>infotechwifi.com</code>.</li>
                      <li>Hifadhi na uwasha Wi-Fi. Mteja akijiunga atapata ukurasa wa kulipia simu mara moja!</li>
                    </ol>
                  </div>
                </div>
              ) : activeScriptTab === 'instructions' ? (
                <div className="space-y-4 text-xs text-slate-300 p-2 max-w-3xl">
                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                      <span>Kuweka Script kwenye MikroTik (Winbox)</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-300 leading-relaxed pl-2">
                      <li>Fungua programu ya <strong>Winbox</strong> na uingie kwenye MikroTik Router yako.</li>
                      <li>Kwenye menyu ya kushoto, bonyeza <strong>New Terminal</strong>.</li>
                      <li>Nakili script kutoka tab ya <strong>"all-in-one.rsc"</strong> au <strong>"vpn.rsc"</strong> hapo juu.</li>
                      <li>Bonyeza kitufe cha kulia (Right-click) ndani ya Terminal na uchague <strong>Paste</strong>.</li>
                      <li>Subiri sekunde chache mpaka ujumbe wa uthibitisho uonekane.</li>
                    </ol>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">2</span>
                      <span>Kuweka Ruijie Reyee bila MikroTik</span>
                    </h4>
                    <p className="text-slate-300 leading-relaxed pl-2">
                      Fungua app ya <strong>Ruijie Reyee</strong> au <strong>cloud.ruijienetworks.com</strong>, chagua <em>Auth Portal → External Web Portal</em>, na ubandike ile Portal URL pamoja na RADIUS Server IP: infotechwifi.com.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <h4 className="font-bold text-sm text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">3</span>
                      <span>Kuweka TP-Link Omada Controller</span>
                    </h4>
                    <p className="text-slate-300 leading-relaxed pl-2">
                      Kwenye Omada Controller (OC200 au Cloud), nenda <em>Authentication → Hotspot → External Web Portal</em>, weka RADIUS profile yenye IP ya seva yetu na uhifadhi.
                    </p>
                  </div>
                </div>
              ) : (
                /* DEFAULT MIKROTIK RSC CODE BLOCK */
                <div className="space-y-3">
                  {activeScriptTab === 'antiTethering' && (
                    <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-rose-300 text-sm">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>Jinsi Ulinzi wa Anti-Tethering (TTL=1) Unavyofanya Kazi kwenye MikroTik:</span>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        Kanuni hii inatumia <strong>Mangle Change-TTL (Set TTL=1)</strong> kwenye vifurushi vinavyoelekea kwa simu ya mteja. Simu ya mteja inatumia intaneti kawaida bila hitilafu. Lakini mteja akiwasha <em>Mobile Hotspot / Wi-Fi Sharing</em> kusambazia wenzake, simu yake inalazimika kupunguza TTL kwa 1 (1 - 1 = 0), na kifurushi kinatupwa papo hapo (TTL Expired)! Simu za marafiki hazipati intaneti kabisa (No Internet Access).
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] font-mono flex-wrap">
                        <span className="bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
                          ✓ Outbound TTL = 1
                        </span>
                        <span className="bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
                          ✓ Drop Inbound Secondary Hops (TTL 63 & 127)
                        </span>
                        <span className="bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700/60">
                          ✓ addresses-per-mac = 1
                        </span>
                      </div>
                    </div>
                  )}
                  <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all font-semibold">
                    {getActiveScriptContent()}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Walled Garden inajumuisha Vodacom (*.vodacom.co.tz), Tigo (*.tigo.co.tz), Airtel (*.airtel.co.tz), Halopesa (*.halotel.co.tz), na AzamPay.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScriptRouter(null)}
                className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Funga (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Router / Access Point Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
                  <Server className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {editingRouter ? `Hariri Kifaa cha Wi-Fi: ${editingRouter.name}` : 'Ongeza Kifaa Kipya cha Wi-Fi (AP au Router)'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {editingRouter ? 'Badili anwani ya IP, jina la kifaa, SSID, na mipangilio ya router au AP hii' : 'Chagua mfumo wako: Ruijie Reyee, TP-Link Omada, Cudy, D-Link au MikroTik'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingRouter(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRouter} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {ownerId && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Akaunti Yako:</span> Kifaa hiki kitasajiliwa moja kwa moja kwenye biashara ya <strong>{ownerName || 'Biashara Yako'}</strong> na kitakuwa tayari kukusanya malipo ya M-Pesa na Tigo Pesa.
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">
                  {error}
                </div>
              )}

              {/* 1. BRAND / DEVICE ARCHITECTURE SELECTOR */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-800 block">
                  1. Chagua Aina / Chapa ya Kifaa Unachotaka Kuunganisha:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {([
                    {
                      id: 'RUIJIE' as DeviceType,
                      icon: '🟠',
                      label: 'Ruijie Reyee AP',
                      sub: 'Bila MikroTik (Cloud AP)',
                      color: 'border-amber-400 bg-amber-50/50 text-amber-900',
                      inactive: 'border-slate-200 hover:border-amber-300 bg-white text-slate-700',
                    },
                    {
                      id: 'TPLINK_OMADA' as DeviceType,
                      icon: '🟢',
                      label: 'TP-Link Omada',
                      sub: 'Bila MikroTik (Omada AP)',
                      color: 'border-teal-500 bg-teal-50/50 text-teal-900',
                      inactive: 'border-slate-200 hover:border-teal-300 bg-white text-slate-700',
                    },
                    {
                      id: 'OPENWRT_CUDY' as DeviceType,
                      icon: '🔵',
                      label: 'Cudy / OpenWrt',
                      sub: 'Bila MikroTik (CoovaChilli)',
                      color: 'border-sky-500 bg-sky-50/50 text-sky-900',
                      inactive: 'border-slate-200 hover:border-sky-300 bg-white text-slate-700',
                    },
                    {
                      id: 'GENERIC_RADIUS' as DeviceType,
                      icon: '⚪',
                      label: 'D-Link / Generic AP',
                      sub: 'Bila MikroTik (Cloud RADIUS)',
                      color: 'border-purple-500 bg-purple-50/50 text-purple-900',
                      inactive: 'border-slate-200 hover:border-purple-300 bg-white text-slate-700',
                    },
                    {
                      id: 'UBIQUITI_UNIFI' as DeviceType,
                      icon: '🟣',
                      label: 'Ubiquiti UniFi',
                      sub: 'Bila MikroTik (UniFi Hotspot)',
                      color: 'border-blue-500 bg-blue-50/50 text-blue-900',
                      inactive: 'border-slate-200 hover:border-blue-300 bg-white text-slate-700',
                    },
                    {
                      id: 'MIKROTIK' as DeviceType,
                      icon: '🔴',
                      label: 'MikroTik RouterOS',
                      sub: 'RouterOS Hardware (Winbox)',
                      color: 'border-indigo-600 bg-indigo-50/50 text-indigo-950',
                      inactive: 'border-slate-200 hover:border-indigo-300 bg-white text-slate-700',
                    },
                  ]).map((dev) => {
                    const isSelected = formData.device_type === dev.id;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => {
                          let defaultModel = formData.model_name;
                          let defaultName = formData.name;
                          let defaultIp = formData.ip_address;

                          if (dev.id === 'RUIJIE') {
                            defaultModel = 'Ruijie Reyee RG-RAP2200(E)';
                            defaultName = 'Ruijie-RAP2200-AP';
                            defaultIp = '192.168.110.1';
                          } else if (dev.id === 'TPLINK_OMADA') {
                            defaultModel = 'TP-Link Omada EAP225 / EAP610';
                            defaultName = 'Omada-EAP-AP';
                            defaultIp = '192.168.0.1';
                          } else if (dev.id === 'OPENWRT_CUDY') {
                            defaultModel = 'Cudy WR1300 / WR2100 (OpenWrt)';
                            defaultName = 'Cudy-WR1300-Gateway';
                            defaultIp = '192.168.1.1';
                          } else if (dev.id === 'GENERIC_RADIUS') {
                            defaultModel = 'D-Link / Grandstream / Tenda Cloud AP';
                            defaultName = 'DLink-Cloud-AP';
                            defaultIp = '192.168.0.1';
                          } else if (dev.id === 'UBIQUITI_UNIFI') {
                            defaultModel = 'Ubiquiti UniFi U6-Lite / Pro';
                            defaultName = 'UniFi-U6-AP';
                            defaultIp = '192.168.1.1';
                          } else if (dev.id === 'MIKROTIK') {
                            defaultModel = 'MikroTik hEX S / RB750Gr3';
                            defaultName = 'RB750Gr3-Hub';
                            defaultIp = '192.168.88.1';
                          }

                          setFormData({
                            ...formData,
                            device_type: dev.id,
                            model_name: defaultModel,
                            name: defaultName,
                            ip_address: defaultIp,
                          });
                        }}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSelected ? `${dev.color} border-2 shadow-xs ring-2 ring-indigo-500/20` : dev.inactive
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-lg">{dev.icon}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <div className="mt-1.5">
                          <div className="font-black text-xs">{dev.label}</div>
                          <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{dev.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informative Guidance Banner based on selection */}
              {formData.device_type !== 'MIKROTIK' ? (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
                  <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-emerald-900">
                      ✨ Hakuna Haja ya MikroTik! Inafanya kazi 100% moja kwa moja.
                    </div>
                    <div className="text-[11px] text-emerald-800 leading-relaxed">
                      Access Point yako ya <strong>{DEVICE_PROFILES[formData.device_type]?.name}</strong> itatumia ukurasa wetu wa mtandaoni (External Captive Portal) na Cloud RADIUS. Mteja akiunganisha Wi-Fi anapelekwa moja kwa moja kwenye ukurasa wa kulipia kwa <strong>M-Pesa, Tigo Pesa na Airtel Money</strong>!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
                  <Server className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-indigo-900">
                      🔴 MikroTik RouterOS Gateway & Cloud VPN
                    </div>
                    <div className="text-[11px] text-indigo-800 leading-relaxed">
                      Mfumo utatengeneza script kamili (.rsc) ya Winbox yenye Cloud VPN, Hotspot Profile, PPPoE Server, na Walled Garden ya malipo ya simu.
                    </div>
                  </div>
                </div>
              )}

              {/* 2. DEVICE MODEL SELECTION & CUSTOM MODEL */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-black text-slate-800 block">
                    2. Chagua Model ya Kifaa (Hardware Model) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomModel(!isCustomModel);
                      if (!isCustomModel) {
                        setCustomModelText('');
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                  >
                    {isCustomModel ? '📋 Chagua Kwenye Orodha ya Vifaa' : '✍️ Weka Custom Model (Model Nyingine)'}
                  </button>
                </div>

                {!isCustomModel ? (
                  <select
                    value={formData.model_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setIsCustomModel(true);
                        setCustomModelText('');
                      } else {
                        setFormData({ ...formData, model_name: val });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:border-indigo-600 focus:outline-none font-semibold text-slate-900"
                  >
                    <optgroup label="🔴 MikroTik RouterOS Series">
                      {ALL_DEVICE_MODELS.filter((m) => m.vendor === 'MIKROTIK').map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟢 TP-Link Omada EAP Series (Ceiling & Outdoor APs)">
                      {ALL_DEVICE_MODELS.filter((m) => m.category === 'TP-Link Omada EAP').map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="📡 TP-Link Pharos CPE Series (Outdoor Long Range / Hotspot & Bridge)">
                      {ALL_DEVICE_MODELS.filter((m) => m.category === 'TP-Link Pharos CPE').map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟠 Ruijie Reyee Cloud AP Series">
                      {ALL_DEVICE_MODELS.filter((m) => m.vendor === 'RUIJIE').map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🔵 Cudy & OpenWrt Gateways">
                      {ALL_DEVICE_MODELS.filter((m) => m.vendor === 'OPENWRT_CUDY').map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🟣 Ubiquiti UniFi & airMAX">
                      {ALL_DEVICE_MODELS.filter((m) => m.vendor === 'UBIQUITI_UNIFI').map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Custom / Model Nyingine">
                      <option value="CUSTOM">✍️ Weka Custom Model / Model Nyingine...</option>
                    </optgroup>
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-indigo-950">
                        Andika Model ya Kifaa Chako (Custom Model Name):
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">Mfano: CPE210 v3, RB4011, nk.</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={customModelText}
                      onChange={(e) => setCustomModelText(e.target.value)}
                      placeholder="mfano: TP-Link CPE210 v3.2, CPE220 High Power, Ubiquiti NanoStation, nk."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border-2 border-indigo-500 bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                    {/* Quick suggestion chips */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      <span className="text-slate-500 font-medium">Mapendekezo ya haraka:</span>
                      {[
                        'TP-Link CPE210 v3 (2.4GHz 9dBi)',
                        'TP-Link CPE220 (2.4GHz 12dBi)',
                        'TP-Link CPE510 (5GHz 13dBi)',
                        'TP-Link CPE610 (5GHz 23dBi Dish)',
                        'TP-Link CPE710 (5GHz AC Dish)',
                        'TP-Link Omada EAP610-Outdoor',
                        'MikroTik RB4011iGS+RM',
                        'Ubiquiti NanoStation Loco M2',
                      ].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setCustomModelText(sug)}
                          className="px-2 py-0.5 rounded-md bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-900 font-semibold cursor-pointer transition shadow-2xs"
                        >
                          + {sug.split(' ')[1] || sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TP-Link Pharos CPE Guidance Banner */}
                {((!isCustomModel && (formData.model_name.includes('CPE') || formData.model_name.includes('Pharos') || formData.model_name.includes('WBS'))) ||
                  (isCustomModel && (customModelText.toUpperCase().includes('CPE') || customModelText.toUpperCase().includes('PHAROS')))) && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-xs text-amber-950 mt-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-1.5 font-black text-amber-900">
                        <span className="text-base">📡</span>
                        <span>TP-Link Pharos CPE Imetambuliwa: Mwongozo wa PharOS (192.168.0.254)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setGuideInitialTab('PHAROS_CPE');
                          setGuideModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-300 transition cursor-pointer"
                      >
                        📖 Fungua Mwongozo Kamili wa CPE
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Vifaa vya <strong>Pharos CPE (CPE210, CPE220, CPE510, CPE610, CPE710)</strong> vinatumia mfumo wa <strong>PharOS</strong>.
                    </p>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-amber-900 font-medium">
                      <li>
                        <strong>Kama unatumia kama Hotspot (AP Mode):</strong> LAZIMA uzime <strong>MAXtream</strong> (kwenye tab ya MAXtream &rarr; Ondoa tiki ya Disable MAXtream) ili simu za wateja ziweze kujiunga na kupata ukurasa wa malipo ya M-Pesa!
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

              {/* 3. BRAND & SSID DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-xs font-black text-slate-800 block mb-1">
                    Jina la Hotspot / Biashara Yako <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="mfano: Kariakoo Cyber WiFi"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Jina litakaloonekana kwenye ukurasa wa wateja & vocha.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-800 block mb-1">
                    Jina la Wi-Fi (SSID)
                  </label>
                  <input
                    type="text"
                    value={formData.ssid}
                    onChange={(e) => setFormData({ ...formData, ssid: e.target.value })}
                    placeholder="mfano: KARIAKOO-FREE-WIFI"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 bg-white focus:border-indigo-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    SSID inayorushwa hewani na kifaa hiki.
                  </span>
                </div>
              </div>

              {/* 4. DEVICE HARDWARE SPECS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {formData.device_type === 'MIKROTIK' ? 'Jina la Router (Identity)' : 'Jina la Kifaa / AP Model'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.device_type === 'MIKROTIK' ? 'RB750Gr3-Hub' : 'Ruijie-RAP2200-AP'}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {formData.device_type === 'MIKROTIK' ? 'IP Address / DDNS' : 'IP ya Kifaa / Gateway IP'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    placeholder={formData.device_type === 'RUIJIE' ? '192.168.110.1' : formData.device_type === 'TPLINK_OMADA' ? '192.168.0.1' : '192.168.88.1'}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. MIKROTIK SPECIFIC OR CLOUD RADIUS AP SPECIFIC FIELDS */}
              {formData.device_type === 'MIKROTIK' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">API Port (Default 8728)</label>
                      <input
                        type="number"
                        required
                        value={formData.api_port}
                        onChange={(e) => setFormData({ ...formData, api_port: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">API Username</label>
                      <input
                        type="text"
                        required
                        value={formData.api_username}
                        onChange={(e) => setFormData({ ...formData, api_username: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">API Password</label>
                      <input
                        type="password"
                        value={formData.api_password_hash}
                        onChange={(e) => setFormData({ ...formData, api_password_hash: e.target.value })}
                        placeholder={editingRouter ? "Acha wazi usipobadili" : "Password ya MikroTik"}
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Hotspot Server Name</label>
                      <input
                        type="text"
                        value={formData.hotspot_server_name}
                        onChange={(e) => setFormData({ ...formData, hotspot_server_name: e.target.value })}
                        placeholder="hotspot1"
                        className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                /* Non-MikroTik Access Point Settings Preview */
                <div className="bg-slate-900 rounded-2xl p-4 text-xs font-mono text-slate-200 space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-sans text-slate-400 font-bold border-b border-slate-800 pb-2">
                    <span>📡 Cloud RADIUS & External Portal Parameters</span>
                    <span className="text-emerald-400">Papo kwa Papo</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 block">External Portal:</span>
                      <span className="text-emerald-400 font-semibold truncate block">
                        https://infotechwifi.com/?routerId=[Auto]&ap_vendor={(formData.device_type || 'generic').toLowerCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">FreeRADIUS Server IP:</span>
                      <span className="text-amber-400 font-semibold">infotechwifi.com (Auth: 1812 / Acct: 1813)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">RADIUS Shared Secret:</span>
                      <span className="text-cyan-400 font-semibold">{formData.radius_secret || 'radius_secret_2026'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">RADIUS CoA Port:</span>
                      <span className="text-indigo-400 font-semibold">Port 3799 (Auto-Disconnect & Unlock)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Eneo / Mahali Kifaa Kilipo (Location)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="mfano: Kariakoo Market, Dar es Salaam"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingRouter(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {editingRouter
                      ? '💾 Hifadhi Mabadiliko (Save Changes)'
                      : formData.device_type === 'MIKROTIK'
                      ? 'Hifadhi & Pata Script za MikroTik'
                      : `Hifadhi & Pata Mwongozo wa ${DEVICE_PROFILES[formData.device_type]?.name.split(' ')[0]}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Brand & SSID Modal */}
      {editingBrandRouter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-sm">Badili Jina la Brand & Wi-Fi SSID</h3>
                  <p className="text-[11px] text-indigo-200">Router: {editingBrandRouter.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBrandRouter(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrandEdit} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950">
                <span className="font-bold">Kumbuka:</span> Jina hili ndilo litakalotokea kwenye simu za wateja wanapofungua ukurasa wa kulipia (Captive Portal) na kwenye kadi za vocha za kuchapisha.
              </div>

              {brandEditError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {brandEditError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Jina la Hotspot / Biashara Yako (Brand Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editBrandName}
                  onChange={(e) => setEditBrandName(e.target.value)}
                  placeholder="mfano: Kariakoo Cyber WiFi"
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Jina la Wi-Fi (SSID)
                </label>
                <input
                  type="text"
                  value={editSsid}
                  onChange={(e) => setEditSsid(e.target.value)}
                  placeholder="mfano: KARIAKOO-FREE-WIFI"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Eneo / Mahali (Location)
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="mfano: Kariakoo Market, Dar es Salaam"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBrandRouter(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Ghairi (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingBrandEdit}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  {savingBrandEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Hifadhi Mabadiliko</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete AP to Payment PDF & Print Setup Guide Modal */}
      <ApSetupGuideModal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        brandName={ownerName}
        defaultRouterId={routers[0]?.id || 1}
        initialTab={guideInitialTab}
      />

      {/* TP-Link Omada AP Inform & Adoption Wizard Modal */}
      <OmadaAdoptionModal
        isOpen={omadaModalOpen}
        onClose={() => {
          setOmadaModalOpen(false);
          setSelectedOmadaRouter(null);
        }}
        onSuccess={(_adopted) => {
          fetchRouters();
        }}
        existingRouter={selectedOmadaRouter}
        ownerId={ownerId}
        ownerName={ownerName}
      />
    </div>
  );
};
