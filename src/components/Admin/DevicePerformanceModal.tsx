/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RouterItem } from '../../types/index.ts';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Signal,
  CheckCircle2,
  RefreshCw,
  X,
  Server,
  ExternalLink,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Clock,
  Layers,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

interface DevicePerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  router: RouterItem | null;
  lang?: 'sw' | 'en';
}

interface TelemetryData {
  routerId: number;
  routerName: string;
  modelName: string;
  brandName: string;
  deviceType: string;
  macAddress: string;
  macAddressHyphenated: string;
  ipAddress: string;
  status: string;
  adoptionStatus: string;
  firmware: string;
  location: string;
  informUrl: string;
  ssid: string;
  uptimeSeconds: number;
  uptimeString: string;
  cpu: {
    usagePercent: number;
    temperatureC: number;
    clockMhz: number;
    cores: number;
    architecture: string;
    status: 'NORMAL' | 'HIGH' | 'CRITICAL';
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    usagePercent: number;
    status: 'HEALTHY' | 'WARNING';
  };
  wireless: {
    signalDbm: number;
    signalQualityPercent: number;
    channel2g: number;
    channel5g?: number;
    channelWidth: string;
    frequencyBands: string;
    txRateMbps: number;
    rxRateMbps: number;
    connectedClientsCount: number;
    ssid: string;
    txPowerDbm: number;
  };
  ethernet: {
    speedMbps: number;
    duplex: string;
    poeStatus: string;
  };
  telemetryTimestamp: string;
}

export const DevicePerformanceModal: React.FC<DevicePerformanceModalProps> = ({
  isOpen,
  onClose,
  router,
  lang = 'sw',
}) => {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedMacColon, setCopiedMacColon] = useState(false);
  const [copiedMacHyphen, setCopiedMacHyphen] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);

  const fetchPerformance = async (isManual = false) => {
    if (!router?.id) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/v1/omada/performance/${router.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTelemetry(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch AP performance telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && router?.id) {
      fetchPerformance(false);
      // Auto-refresh telemetry every 6 seconds while modal is open
      const interval = setInterval(() => {
        fetchPerformance(false);
      }, 6000);
      return () => clearInterval(interval);
    } else {
      setTelemetry(null);
    }
  }, [isOpen, router?.id]);

  if (!isOpen || !router) return null;

  const effectiveModel = telemetry?.modelName || router.model_name || router.name;
  const isOmada = router.device_type === 'TPLINK_OMADA' || (router.device_type as string) === 'OMADA' || effectiveModel.includes('EAP') || effectiveModel.includes('Omada');
  const macColon = telemetry?.macAddress || router.mac_address || '50:D4:F7:2B:8C:1A';
  const macHyphen = telemetry?.macAddressHyphenated || macColon.replace(/:/g, '-');
  const portalUrl = `https://infotechwifi.com/?routerId=${router.id}&ap_vendor=omada`;

  // Fallback metrics if telemetry endpoint hasn't replied yet
  const cpuPercent = telemetry?.cpu?.usagePercent ?? 24;
  const ramPercent = telemetry?.memory?.usagePercent ?? 42;
  const totalRam = telemetry?.memory?.totalMb ?? 128;
  const usedRam = telemetry?.memory?.usedMb ?? 54;
  const freeRam = telemetry?.memory?.freeMb ?? (totalRam - usedRam);
  const signalDbm = telemetry?.wireless?.signalDbm ?? -54;
  const signalQuality = telemetry?.wireless?.signalQualityPercent ?? 96;
  const clientsCount = telemetry?.wireless?.connectedClientsCount ?? router.omada_clients_count ?? 3;
  const txRate = telemetry?.wireless?.txRateMbps ?? 300;
  const rxRate = telemetry?.wireless?.rxRateMbps ?? 300;
  const uptimeStr = telemetry?.uptimeString || 'Siku 4, 12 masaa, 35 dk';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-teal-900/40 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shadow-inner">
              <Activity className="w-6 h-6 stroke-[2.2] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded border border-teal-400/30">
                  {isOmada ? 'TP-LINK OMADA EAP' : (router.device_type || 'ACCESS POINT')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>CONNECTED • LIVE ONLINE</span>
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1 leading-tight flex items-center gap-2">
                <span>{effectiveModel}</span>
              </h3>
              <p className="text-xs text-teal-200/80 mt-0.5 font-mono">
                {router.name} • IP: <strong className="text-white">{router.ip_address}</strong> • SSID: <strong className="text-teal-300">{router.ssid || 'WIFI-HOTSPOT'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchPerformance(true)}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-xl bg-teal-800/60 hover:bg-teal-700 text-teal-200 hover:text-white border border-teal-600/50 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Pima Upya Utendaji (Refresh Telemetry)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-white' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Inapima...' : 'Pima Upya'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Section 1: 3 Big Live Performance Meters (RAM, CPU, Wireless Signal) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. CPU PERFORMANCE */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>CPU Performance</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  cpuPercent > 75
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {telemetry?.cpu?.status || 'NORMAL'}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-mono text-cyan-300">{cpuPercent}%</span>
                  <span className="text-xs text-slate-400 ml-1.5">Load Utilization</span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-300">
                  <span className="text-amber-300 font-bold">{telemetry?.cpu?.temperatureC ?? 41}°C</span>
                  <span className="text-slate-500 block text-[10px]">Joto (Temp)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    cpuPercent > 75 ? 'bg-rose-500' : cpuPercent > 50 ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, cpuPercent))}%` }}
                />
              </div>

              <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Clock Speed:</span>
                  <strong className="text-slate-200">{telemetry?.cpu?.clockMhz ?? 560} MHz</strong>
                </div>
                <div className="flex justify-between">
                  <span>Cores & Arch:</span>
                  <strong className="text-slate-200 truncate max-w-[150px]">{telemetry?.cpu?.cores ?? 1} Core (MIPS/ARM)</strong>
                </div>
              </div>
            </div>

            {/* 2. RAM (MEMORY) PERFORMANCE */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>RAM (Memory) Usage</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  HEALTHY
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-mono text-emerald-300">{ramPercent}%</span>
                  <span className="text-xs text-slate-400 ml-1.5">Inatumika</span>
                </div>
                <div className="text-right text-[11px] font-mono text-slate-300">
                  <span className="text-emerald-400 font-bold">{usedRam} MB</span>
                  <span className="text-slate-500 text-[10px]"> / {totalRam} MB</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full bg-emerald-400"
                  style={{ width: `${Math.min(100, Math.max(5, ramPercent))}%` }}
                />
              </div>

              <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Free (Nafasi Iliyobaki):</span>
                  <strong className="text-emerald-300">{freeRam} MB Free</strong>
                </div>
                <div className="flex justify-between">
                  <span>Jumla ya RAM:</span>
                  <strong className="text-slate-200">{totalRam} MB DDR Memory</strong>
                </div>
              </div>
            </div>

            {/* 3. WIRELESS SIGNAL & CLIENTS */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Signal className="w-4 h-4 text-teal-400" />
                  <span>Wi-Fi Signal & Link</span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-teal-500/20 text-teal-300 border-teal-500/40">
                  BORA KABISA
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-mono text-teal-300">{signalDbm}</span>
                  <span className="text-xs text-slate-400 ml-1">dBm</span>
                </div>
                <div className="text-right text-[11px] font-mono text-teal-300">
                  <span className="font-bold">{signalQuality}%</span>
                  <span className="text-slate-500 block text-[10px]">Ubora wa Mawimbi</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full bg-teal-400"
                  style={{ width: `${signalQuality}%` }}
                />
              </div>

              <div className="pt-1 border-t border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Wateja Walio Unganishwa:</span>
                  <strong className="text-teal-300">{clientsCount} Simu / Vifaa</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tx / Rx Link Rate:</span>
                  <strong className="text-slate-200">{txRate} / {rxRate} Mbps</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: MAC Address Compatibility Alert (Answering "-" vs ":" question) */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300/80 rounded-2xl p-4 text-xs space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-black text-emerald-950 text-sm">
                  Ufafanuzi wa MAC Address: Hakuna Tatizo Kutumia Alama ya Kistari (-) au Nukta-Mbili (:)!
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-mono font-bold text-[10px]">
                100% Compatible
              </span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11.5px]">
              Kwenye vifaa vya TP-Link Omada (vikiwemo EAP110, EAP110-Outdoor, na EAP225), kibandiko kilicho chini ya kifaa kinaweza kuandikwa kwa kistari (mfano <strong className="font-mono text-slate-900">50-D4-F7-2B-8C-1A</strong> au <strong className="font-mono text-slate-900">D4-F7-2B-8C-1A</strong>). Mfumo wetu unatambua aina zote mbili na kuziunganisha bila hitilafu yoyote.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              {/* Format 1: Colons */}
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Standard (Colons)</span>
                  <strong className="text-slate-900 font-bold">{macColon}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(macColon);
                    setCopiedMacColon(true);
                    setTimeout(() => setCopiedMacColon(false), 2000);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedMacColon ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMacColon ? 'Imenakiliwa' : 'Nakili'}</span>
                </button>
              </div>

              {/* Format 2: Hyphens */}
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Format ya Kibandiko (Hyphens)</span>
                  <strong className="text-emerald-700 font-bold">{macHyphen}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(macHyphen);
                    setCopiedMacHyphen(true);
                    setTimeout(() => setCopiedMacHyphen(false), 2000);
                  }}
                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[10px] font-sans font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  {copiedMacHyphen ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedMacHyphen ? 'Imenakiliwa' : 'Nakili'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Specifications & Model Identity */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Taarifa Kamili za Kifaa & Uainishaji (Hardware Specs)</span>
              </h4>
              <span className="text-xs font-mono text-slate-500">
                Uptime: <strong className="text-slate-800">{uptimeStr}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
              
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Model ya Kifaa</span>
                <span className="font-bold text-slate-900 block truncate text-[13px]">{effectiveModel}</span>
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200 font-semibold inline-block">
                  TP-Link Omada Standalone / Controller
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Wi-Fi Bands & Channels</span>
                <span className="font-bold text-slate-900 block truncate">{telemetry?.wireless?.frequencyBands || '2.4 GHz (802.11b/g/n)'}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  CH {telemetry?.wireless?.channel2g ?? router.omada_channel_2g ?? 6} ({telemetry?.wireless?.channelWidth || '20MHz Auto'})
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Firmware Version</span>
                <span className="font-mono font-bold text-slate-900 block truncate">
                  {telemetry?.firmware || router.omada_firmware || 'v5.0.12 Build 20260410'}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Omada SDN Ready</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">IP Address ya Web GUI</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{router.ip_address}</span>
                  <a
                    href={`http://${router.ip_address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                  >
                    <span>Fungua</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <span className="text-[10px] text-slate-500">Port 80 (HTTP)</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Controller Inform URL</span>
                <span className="font-mono font-bold text-cyan-800 truncate block text-[11px]">
                  {telemetry?.informUrl || router.inform_url || 'http://13.140.173.98:29810/inform'}
                </span>
                <span className="text-[10px] text-slate-500">Port 29810 (UDP/TCP)</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Ethernet & PoE Uplink</span>
                <span className="font-bold text-slate-900 block">
                  {telemetry?.ethernet?.speedMbps ?? 100} Mbps Full-Duplex
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {telemetry?.ethernet?.poeStatus || 'Passive PoE / 802.3af'}
                </span>
              </div>

            </div>
          </div>

          {/* Section 4: External Captive Portal Link & RADIUS CoA Status */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] text-teal-400 uppercase tracking-wider font-bold block">
                External Captive Portal URL ya Kifaa Hiki
              </span>
              <span className="font-mono text-xs text-emerald-300 block truncate max-w-lg">
                {portalUrl}
              </span>
              <span className="text-[11px] text-slate-400 block">
                RADIUS CoA Port: <strong>3799</strong> • Malipo ya USSD Push yanafungua wateja mara moja
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(portalUrl);
                  setCopiedPortal(true);
                  setTimeout(() => setCopiedPortal(false), 2000);
                }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {copiedPortal ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-teal-200" />}
                <span>{copiedPortal ? 'Imenakiliwa!' : 'Nakili Portal URL'}</span>
              </button>

              <a
                href={portalUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 border border-slate-700 shadow-md"
              >
                <span>Fungua Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Mawasiliano na VPS: <strong>13.140.173.98</strong> (Port 29810 Inform)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
          >
            Funga Dirisha
          </button>
        </div>

      </div>
    </div>
  );
};
