import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Wifi,
  Smartphone,
  CreditCard,
  Tag,
  CheckCircle2,
  Server,
  Radio,
  Lock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  HelpCircle,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

export type ApGuideTab = 'OVERVIEW' | 'AP_CONFIG' | 'PHAROS_CPE' | 'USSD_PAY' | 'VOUCHER' | 'TROUBLESHOOT';

interface ApSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
  defaultRouterId?: number;
  initialTab?: ApGuideTab;
}

export const ApSetupGuideModal: React.FC<ApSetupGuideModalProps> = ({
  isOpen,
  onClose,
  brandName = 'TZ-WiFi Hotspot Network',
  defaultRouterId = 1,
  initialTab = 'OVERVIEW',
}) => {
  const [activeTab, setActiveTab] = useState<ApGuideTab>(initialTab);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadOfflineHtml = () => {
    const content = `<!DOCTYPE html>
<html lang="sw">
<head>
  <meta charset="utf-8"/>
  <title>Mwongozo wa Ufungaji wa Access Point & Mfumo wa Malipo ya Hotspot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 900px; margin: 0 auto; padding: 24px; }
    h1 { color: #0f172a; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; font-size: 24px; }
    h2 { color: #1e1b4b; margin-top: 24px; font-size: 18px; border-left: 4px solid #4f46e5; padding-left: 10px; }
    h3 { color: #334155; font-size: 15px; margin-top: 16px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .highlight { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 12px; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <h1>📘 Mwongozo Kamili wa Kusanidi Access Point & Malipo ya Hotspot</h1>
  <p><strong>Mifumo Inayoungwa Mkono:</strong> Ruijie Reyee, TP-Link Omada, Cudy, D-Link, Ubiquiti UniFi, MikroTik</p>
  <p><strong>VPS RADIUS Server:</strong> <code>167.99.120.45</code> | <strong>Portal URL:</strong> <code>https://wifi.infotech.co.tz/?routerId=${defaultRouterId}</code></p>
  
  <h2>1. Muhtasari wa Jinsi Mfumo Unavyofanya Kazi</h2>
  <div class="box">
    <p>1. <strong>Mteja anaunganisha Wi-Fi:</strong> Simu yake inashikwa na AP na kuelekezwa kwenye Captive Portal.</p>
    <p>2. <strong>Mteja anachagua kifurushi:</strong> Anaweka namba ya simu (M-Pesa, Tigo, Airtel) au namba ya vocha.</p>
    <p>3. <strong>Malipo ya Papo kwa Papo (USSD Push):</strong> Mteja anapata ujumbe wa kuweka PIN ya simu.</p>
    <p>4. <strong>Kufunguliwa Intaneti:</strong> VPS inatuma amri ya RADIUS CoA (Port 3799) kwa AP na simu inafunguka mara moja bila kukwama!</p>
  </div>

  <h2>2. Vigezo Muhimu vya Kusanidi Kwenye AP Yako</h2>
  <table>
    <tr><th>Kipengele</th><th>Thamani ya Kuweka</th><th>Kazi Yake</th></tr>
    <tr><td>External Web Portal URL</td><td><code>https://wifi.infotech.co.tz/?routerId=${defaultRouterId}</code></td><td>Ukurasa wa kuingia wateja</td></tr>
    <tr><td>RADIUS Server IP</td><td><code>167.99.120.45</code></td><td>Inathibitisha watumiaji na vocha</td></tr>
    <tr><td>Authentication Port</td><td><code>1812</code> (UDP)</td><td>Inashughulikia maombi ya kuingia</td></tr>
    <tr><td>Accounting Port</td><td><code>1813</code> (UDP)</td><td>Inarekodi muda na data iliyotumika</td></tr>
    <tr><td>RADIUS CoA Port</td><td><code>3799</code> (RFC 5176)</td><td>Inafungua simu mara tu PIN ya M-Pesa inapowekwa</td></tr>
    <tr><td>RADIUS Secret</td><td><code>radius_secret_2026</code></td><td>Ulinzi wa mawasiliano ya AP na VPS</td></tr>
  </table>

  <h2>3. Hatua kwa Hatua: Ruijie Reyee & TP-Link Omada</h2>
  <div class="highlight">
    <p>1. Ingia kwenye Controller au App (Ruijie Reyee App au Omada Controller).</p>
    <p>2. Nenda <strong>Settings &rarr; Authentication &rarr; Hotspot / Auth Portal</strong>.</p>
    <p>3. Washa Hotspot na uchague <strong>External Web Portal Server</strong>, weka ile Portal URL hapo juu.</p>
    <p>4. Unda RADIUS Profile yenye IP <code>167.99.120.45</code>, Auth <code>1812</code>, Secret <code>radius_secret_2026</code>, na washa <strong>CoA Port 3799</strong>.</p>
    <p>5. Weka Walled Garden domains: <code>api.palmpesa.com, checkout.azampay.com, *.vodacom.co.tz, *.tigo.co.tz, *.airtel.co.tz</code>.</p>
    <p>6. Hifadhi. Kuanzia hapo mteja yeyote anayeunganisha Wi-Fi atalipia au kuweka vocha!</p>
  </div>

  <h2>4. TP-Link Pharos CPE (CPE210 / CPE220 / CPE510 / CPE610 / CPE710)</h2>
  <div class="box" style="border-left: 4px solid #f59e0b; background: #fffbeb;">
    <p><strong>⚠️ MUHIMU SANA - KUZIMA MAXTREAM:</strong></p>
    <p>Ukitumia CPE kama Hotspot ya wateja (AP Mode), <strong>LAZIMA UENDE KWENYE TAB YA 'MAXtream' NA UZIME (DISABLE MAXtream)</strong>! Usipozima, simu za wateja na laptop haziwezi kuunganisha Wi-Fi.</p>
    <p><strong>Hatua za PharOS (http://192.168.0.254):</strong></p>
    <p>1. Operation Mode: Chagua <strong>Access Point (AP)</strong>.</p>
    <p>2. Wireless: Weka SSID ya Hotspot, Channel Width: <strong>20MHz</strong>, Security: <strong>None</strong>.</p>
    <p>3. MAXtream: Hakikisha <strong>MAXtream IMEZIMWA (Disabled)</strong>.</p>
    <p>4. Network: Weka Static IP kwenye subnet ya MikroTik yako (mfano <code>192.168.88.254</code>, Gateway: <code>192.168.88.1</code>).</p>
    <p>5. Bofya Save juu kulia. Sasa wateja wataunganishwa na kufunguliwa ukurasa wa malipo ya simu mara moja!</p>
  </div>
</body>
</html>`;
    const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mwongozo_AP_Hotspot_${brandName.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const portalUrl = `https://wifi.infotech.co.tz/?routerId=${defaultRouterId}`;
  const radiusIp = '167.99.120.45';
  const radiusSecret = 'radius_secret_2026';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:z-auto print:backdrop-blur-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Header - Screen only */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Mwongozo Kamili: AP &rarr; Captive Portal &rarr; Malipo ya Simu
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  PDF & Print Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Mlolongo mzima kuanzia kusanidi Access Point, kumwelekeza mteja, kulipia kwa M-Pesa / Tigo, au kuingiza vocha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Chapisha au Hifadhi kama PDF kupitia browser"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Pakua / Chapisha PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadOfflineHtml}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Pakua faili la maelezo la kufungua bila intaneti"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Offline Doc</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher - Screen only */}
        <div className="bg-slate-900 px-4 pt-2 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto print:hidden scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'OVERVIEW'
                ? 'bg-white text-indigo-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>1. Muundo wa Mfumo (Architecture)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AP_CONFIG')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'AP_CONFIG'
                ? 'bg-white text-indigo-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-600" />
            <span>2. Kusanidi AP (Ruijie / Omada / Cudy)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PHAROS_CPE')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'PHAROS_CPE'
                ? 'bg-white text-indigo-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 text-teal-400" />
            <span>3. TP-Link Pharos CPE (CPE210 / CPE510 / CPE610)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('USSD_PAY')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'USSD_PAY'
                ? 'bg-white text-indigo-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span>4. Malipo ya Simu (USSD Push)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VOUCHER')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'VOUCHER'
                ? 'bg-white text-indigo-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-sky-600" />
            <span>5. Kuingiza Vocha Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TROUBLESHOOT')}
            className={`px-3.5 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'TROUBLESHOOT'
                ? 'bg-white text-indigo-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>5. Kutatua Hitilafu (Troubleshoot)</span>
          </button>
        </div>

        {/* PRINTABLE BODY CONTENT */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6 text-slate-800 print:p-0 print:overflow-visible print:text-black">
          
          {/* Print-Only Header Banner */}
          <div className="hidden print:block border-b-2 border-indigo-600 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  TZ-WiFi Cloud Hotspot Platform
                </h1>
                <p className="text-xs text-slate-600">
                  Mwongozo Kamili wa Kiufundi: Kusanidi Access Point & Process ya Malipo ya Wateja
                </p>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                Tarehe: {new Date().toLocaleDateString('sw-TZ')}
              </div>
            </div>
          </div>

          {/* Quick Parameters Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3 print:bg-slate-100 print:text-black print:border-slate-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 print:text-indigo-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4" />
                Vigezo Muhimu vya VPS (Vipimo vya Kuingiza Kwenye AP Yako)
              </span>
              <span className="text-[11px] text-emerald-400 print:text-emerald-800 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                100% Active Cloud RADIUS
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-400 block uppercase font-sans">External Portal URL</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700 truncate block mt-0.5">
                  {portalUrl}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(portalUrl, 'portal')}
                  className="mt-1 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-sans cursor-pointer print:hidden"
                >
                  {copiedText === 'portal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText === 'portal' ? 'Imenakiliwa!' : 'Nakili URL'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-400 block uppercase font-sans">RADIUS Server IP</span>
                <span className="font-bold text-amber-400 print:text-amber-800 block mt-0.5">
                  {radiusIp}
                </span>
                <span className="text-[10px] text-slate-400 font-sans block mt-1">
                  Auth: 1812 | Acct: 1813
                </span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-400 block uppercase font-sans">RADIUS Shared Secret</span>
                <span className="font-bold text-cyan-400 print:text-cyan-800 block mt-0.5">
                  {radiusSecret}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(radiusSecret, 'secret')}
                  className="mt-1 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 font-sans cursor-pointer print:hidden"
                >
                  {copiedText === 'secret' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedText === 'secret' ? 'Imenakiliwa!' : 'Nakili Secret'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 print:bg-white print:border-slate-300">
                <span className="text-[10px] text-slate-400 block uppercase font-sans">RADIUS CoA Port (RFC 5176)</span>
                <span className="font-bold text-indigo-400 print:text-indigo-800 block mt-0.5">
                  Port 3799 (UDP)
                </span>
                <span className="text-[10px] text-emerald-400 print:text-emerald-700 font-sans block mt-1">
                  Inafungua simu papo hapo
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: ARCHITECTURE & JOURNEY (Mlolongo wa Mfumo) */}
          {(activeTab === 'OVERVIEW' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Mlolongo Kamili wa Safari ya Mteja (Customer Journey Workflow)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">1. Mteja Anaunganisha</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Mteja anawasha Wi-Fi kwenye simu yake, anachagua SSID (mfano: <strong>KARIAKOO-FREE-WIFI</strong>). AP inampa IP ya ndani na kuzuia intaneti ya wazi.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                    <Radio className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">2. Redirection ya Portal</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Simu inapoanza kutafuta mtandao, AP inakamata ombi na kumfungulia ukurasa wa <strong>Captive Portal</strong> wa VPS yetu yenye vifurushi vya bei.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">3. Malipo au Vocha</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Mteja anachagua kifurushi na kuweka namba yake ya simu (M-Pesa/Tigo/Airtel) kupokea <strong>USSD Push</strong>, au anaingiza <strong>Namba ya Vocha</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">4. Kufunguliwa Papo Hapo</h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Baada ya PIN ya simu kukamilika, VPS inatuma pakiti ya <strong>RADIUS CoA (Port 3799)</strong> kwa AP na kumwachia mteja intaneti kamili mara moja!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: ACCESS POINT CONFIGURATION GUIDES */}
          {(activeTab === 'AP_CONFIG' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                  2
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Mwongozo wa Kusanidi Kulingana na Chapa ya Access Point (AP Brands)
                </h3>
              </div>

              {/* Ruijie Reyee Guide */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟠</span>
                  <h4 className="font-black text-slate-900 text-sm">
                    A. Ruijie Reyee Cloud AP (RAP2200, RAP1200, EG Series)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Bila MikroTik
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 leading-relaxed pl-1">
                  <li>Fungua app ya <strong>Ruijie Reyee</strong> kwenye simu au ingia <strong>cloud.ruijienetworks.com</strong>.</li>
                  <li>Fungua Project yako &rarr; Nenda <strong>Configuration</strong> &rarr; <strong>Auth Portal</strong>.</li>
                  <li>Washa <strong>Captive Portal</strong>, chagua aina ya <strong>"External Web Portal"</strong> na uweke URL: <code>{portalUrl}</code>.</li>
                  <li>Kwenye Authentication, chagua <strong>External RADIUS Server</strong>:
                    <ul className="list-disc list-inside pl-4 mt-1 text-slate-600 space-y-0.5">
                      <li>Primary IP: <code>{radiusIp}</code> | Auth Port: <code>1812</code> | Acct Port: <code>1813</code></li>
                      <li>Shared Secret: <code>{radiusSecret}</code></li>
                      <li>Washa <strong>RADIUS CoA (Port 3799)</strong>.</li>
                    </ul>
                  </li>
                  <li>Kwenye <strong>Walled Garden Whitelist</strong>, ongeza: <code>api.palmpesa.com, checkout.azampay.com, *.vodacom.co.tz, *.tigo.co.tz, *.airtel.co.tz, wifi.infotech.co.tz</code>.</li>
                  <li>Bonyeza <strong>Save & Deliver</strong>. AP itaanza kusukuma wateja kwenye mfumo mara moja!</li>
                </ol>
              </div>

              {/* TP-Link Omada Guide */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟢</span>
                    <h4 className="font-black text-slate-900 text-sm">
                      B. TP-Link Omada AP Adoption (Controller Inform URL & Check Adoption)
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                    EAP225, EAP245, EAP610, EAP650, OC200
                  </span>
                </div>

                <div className="p-3 bg-teal-950 text-white rounded-xl border border-teal-800 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-teal-400 font-bold uppercase text-[10px]">Controller Inform URL ya Kuweka Kwenye AP:</span>
                    <span className="text-[10px] text-slate-400">Port 29810 (UDP) / 29811 (TCP)</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700">
                    <span className="text-emerald-300 font-bold">http://167.99.120.45:29810/inform</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('http://167.99.120.45:29810/inform', 'inform_modal')}
                      className="text-[10px] text-teal-300 hover:text-white flex items-center gap-1 cursor-pointer font-sans"
                    >
                      {copiedText === 'inform_modal' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedText === 'inform_modal' ? 'Imenakiliwa!' : 'Nakili URL'}</span>
                    </button>
                  </div>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 leading-relaxed pl-1">
                  <li>
                    <strong>Hatua 1: Sajili MAC Address ya AP:</strong> Ingia kwenye mfumo wetu, bofya <em>"Omada AP Adoption"</em> na uweke MAC Address iliyo nyuma ya AP (mfano: <code>50:D4:F7:2B:8C:1A</code>).
                  </li>
                  <li>
                    <strong>Hatua 2: Weka Controller Inform URL:</strong> Ingia kwenye ukurasa wa AP (<code>http://192.168.0.254</code>) &rarr; Nenda <strong>Management / Settings</strong> &rarr; <strong>Controller Settings</strong> &rarr; Kwenye <strong>Controller Inform URL</strong> weka <code>http://167.99.120.45:29810/inform</code> kisha bofya <strong>Save</strong>.
                  </li>
                  <li>
                    <strong>Hatua 3: Weka SSID & Taarifa za AP:</strong> Kwenye mfumo wetu, weka jina la Wi-Fi (SSID, mfano: <code>KARIAKOO-FREE-WIFI</code>) na uweke Device Username na Password ulizoweka kwenye AP.
                  </li>
                  <li>
                    <strong>Hatua 4: Bofya "Check Adoption":</strong> Bofya kitufe cha <strong>"Check Adoption & Adopt AP"</strong>. Mfumo utaungana na AP, kusukuma SSID na Captive Portal ya malipo, na AP itakuwa <strong>CONNECTED</strong> papo hapo!
                  </li>
                </ol>
              </div>

              {/* Cudy & OpenWrt Guide */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🔵</span>
                  <h4 className="font-black text-slate-900 text-sm">
                    C. Cudy & OpenWrt Router (WR1300, WR2100, GL.iNet, D-Link Flashed)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                    1-Click CoovaChilli Script
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cudy na router zenye OpenWrt zinatekeleza Hotspot Box kamili kwa kuendesha CoovaChilli. Ingia kwenye router kupitia SSH (mfano <code>ssh root@192.168.1.1</code>) na ubandike ile script iliyo kwenye tab ya <strong>Cudy & OpenWrt</strong> kwenye mfumo wetu. Script hiyo itaweka kifurushi cha CoovaChilli na kujiunga moja kwa moja na Cloud RADIUS.
                </p>
              </div>

              {/* D-Link & Generic AP Guide */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚪</span>
                  <h4 className="font-black text-slate-900 text-sm">
                    D. D-Link, Grandstream GWN, Tenda & Generic Cloud APs
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                    Standard RFC 2865 / 5176
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kwenye ukurasa wa usimamizi wa AP yoyote (Web Admin / Cloud): Washa <strong>Web Authentication / Captive Portal</strong> &rarr; Chagua <strong>External Web Portal</strong> &rarr; Weka URL ya VPS yetu &rarr; Unganisha na RADIUS Server <code>{radiusIp}</code> (Port 1812/1813, Secret: <code>{radiusSecret}</code>) na uwashe CoA Port <code>3799</code>.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: TP-LINK PHAROS CPE OUTDOOR AP & WIRELESS BRIDGE */}
          {(activeTab === 'PHAROS_CPE' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs">
                  3
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Mwongozo wa TP-Link Pharos CPE (CPE210, CPE220, CPE510, CPE610, CPE710)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Vifaa vya nje vya masafa marefu (Outdoor Long-Range AP & Point-to-Point Wireless Bridge) vinavyotumia mfumo wa PharOS
                  </p>
                </div>
              </div>

              {/* CRITICAL MAXTREAM ADVISORY BANNER */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-slate-900 space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <h4 className="font-black text-amber-950 text-sm uppercase tracking-tight">
                    Sheria Namba 1 ya TP-Link CPE Hotspot: LAZIMA UZIME "MAXtream"!
                  </h4>
                </div>
                <div className="text-xs text-amber-950 leading-relaxed space-y-1.5 pl-6">
                  <p>
                    Kwenye mfumo wa <strong>PharOS</strong>, TP-Link huweka teknolojia ya kipekee inayoitwa <strong>MAXtream (TDMA)</strong>. Teknolojia hii inatumika pale tu unapo-link kifaa cha TP-Link na kifaa kingine cha TP-Link (PtP link).
                  </p>
                  <p className="font-bold text-rose-900 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    🛑 UKIACHA MAXTREAM IMEWASHWA: Simu za wateja (Android, iPhone, Tecno, Samsung, nk.) na laptop HAZITAWEZA kuona wala kuunganisha Wi-Fi hata mteja akiwa chini ya mnara!
                  </p>
                  <p>
                    ✅ <strong>SULUHU:</strong> Ingia kwenye ukurasa wa AP (<code>http://192.168.0.254</code>) &rarr; Bofya tab ya <strong>"MAXtream"</strong> &rarr; Ondoa alama ya tiki (<strong>Disable MAXtream</strong>) &rarr; Bofya <strong>Apply</strong>. Sasa simu zote zitaunganisha kwa urahisi hadi umbali wa mita 200 - 500+ na kufunguliwa ukurasa wa malipo ya simu!
                  </p>
                </div>
              </div>

              {/* CPE Usage Breakdown: AP Hotspot vs PtP Bridge */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Mode A: Hotspot AP */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                      <Wifi className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        A. CPE kama Hotspot ya Nje (AP Mode)
                      </h4>
                      <span className="text-[10px] text-teal-700 font-bold">
                        Inafaa sana: CPE210 (2.4GHz 9dBi) & CPE220 (12dBi High-Power)
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Inatumika kurusha Wi-Fi ya bure/ya kulipia moja kwa moja kwa simu za wateja waliopo sokoni, stendi ya mabasi, shuleni, au uwanjani kwa mwelekeo wa nyuzi 60 (sector coverage).
                  </p>

                  <div className="space-y-1.5 text-slate-800 text-[11px]">
                    <div className="font-bold text-slate-900">Hatua za Kusanidi Kwenye PharOS (192.168.0.254):</div>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700">
                      <li>Unganisha port ya <strong>"LAN"</strong> ya PoE adapter kwenye MikroTik Hotspot port (mfano ether2).</li>
                      <li>Unganisha port ya <strong>"POE"</strong> ya PoE adapter kwenye CPE.</li>
                      <li>Ingia <code>http://192.168.0.254</code> (Username: <code>admin</code> / Password: <code>admin</code>).</li>
                      <li>Nenda <strong>Operation Mode</strong> &rarr; Chagua <strong>"Access Point (AP)"</strong> &rarr; Bofya Apply.</li>
                      <li>Nenda <strong>Wireless</strong> &rarr; Weka SSID: <code>{brandName ? `${brandName.split(' ')[0].toUpperCase()}-WIFI` : 'KARIAKOO-FREE-WIFI'}</code>.</li>
                      <li>Kwenye <strong>Channel Width</strong>, chagua <strong>20MHz</strong> (Inaleta utulivu mkubwa kwa simu za mkononi kuliko 40MHz).</li>
                      <li>Security: Chagua <strong>None</strong> (Open Hotspot yenye Captive Portal).</li>
                      <li>Nenda <strong>MAXtream</strong> &rarr; Hakikisha <strong>MAXtream IMEZIMWA (Disabled)</strong>.</li>
                      <li>Nenda <strong>Network</strong> &rarr; Weka Static IP: <code>192.168.88.254</code>, Gateway: <code>192.168.88.1</code> ili uweze kui-manage ukiwa popote.</li>
                      <li>Bofya <strong>Save</strong> (juu kulia) ili kuhifadhi mipangilio.</li>
                    </ol>
                  </div>
                </div>

                {/* Mode B: PtP Wireless Bridge */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">
                        B. Wireless Bridge ya Masafa Marefu (PtP / PtMP)
                      </h4>
                      <span className="text-[10px] text-indigo-700 font-bold">
                        Inafaa sana: CPE510 (13dBi), CPE610 (23dBi Dish), CPE710 (AC Dish)
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Inatumika kusafirisha mtandao wa intaneti na Hotspot bila nyaya kutoka mnara mkuu au ofisi yako hadi kijiji au soko lililopo kilomita 1 hadi 20+ mbali!
                  </p>

                  <div className="space-y-1.5 text-slate-800 text-[11px]">
                    <div className="font-bold text-slate-900">Mlolongo wa Ufungaji:</div>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700">
                      <li>
                        <strong>Kifaa cha Kwanza (Mnara wa Seva / Master):</strong> Weka Operation Mode = <strong>"Access Point (AP)"</strong>. Hapa unaweza kuwasha MAXtream kwa spidi kubwa.
                      </li>
                      <li>
                        <strong>Kifaa cha Pili (Eneo la Wateja / Client):</strong> Weka Operation Mode = <strong>"Client"</strong>, bonyeza "Survey" na uunganishe na CPE ya mnara mkuu.
                      </li>
                      <li>
                        Washa <strong>Bridge Mode</strong> ili data ipite bila kuzuiliwa (Transparent Layer 2).
                      </li>
                      <li>
                        Kwenye eneo la pili, chomeka waya wa LAN kutoka kwenye PoE ya Client kwenda kwenye Access Point ya wateja (mfano Omada EAP au CPE210).
                      </li>
                      <li>
                        Wateja wote wa eneo hilo watapata anwani za IP moja kwa moja kutoka kwenye MikroTik ya mnara mkuu na kulipia kwa M-Pesa kama kawaida!
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Maintenance & Ping Watchdog */}
              <div className="p-4 rounded-2xl bg-teal-950 text-white border border-teal-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Ping Watchdog (Kuzuia CPE Kuganda 24/7 Bila Kupanda Mnara)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Auto-Self-Healing</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Ili kuzuia fundi kupanda mnara wakati CPE inapoganda kwa sababu ya radi au joto kali: Nenda <strong>Management &rarr; Ping Watchdog</strong> &rarr; Washa (Enable), weka IP ya kuping (mfano IP ya MikroTik <code>192.168.88.1</code>). CPE ikiona haipati majibu kwa dakika 3 mfululizo, itajizima na kuwaka upya (Auto Reboot) kiotomatiki na kurejesha mawasiliano!
                </p>
              </div>
            </div>
          )}

          {/* SECTION 4: MOBILE MONEY PAYMENT (USSD PUSH) */}
          {(activeTab === 'USSD_PAY' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                  4
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Mteja Kulipia kwa Simu (M-Pesa, Tigo Pesa, Airtel Money, Halopesa)
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-700" />
                  <span>Hatua kwa Hatua: Jinsi Mteja Anavyolipia Kwenye Simu Yake:</span>
                </h4>
                
                <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed pl-1">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p>
                      Mteja anafungua ukurasa wa Captive Portal na kuchagua kifurushi anachotaka (k.m. <strong>Saa 3 kwa TZS 1,000</strong>).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p>
                      Mteja anaandika namba yake ya simu (mfano <code>0754 123 456</code>). Mfumo unatambua kiotomatiki kama ni <strong>Vodacom M-Pesa</strong>, <strong>Tigo Pesa</strong>, au <strong>Airtel Money</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p>
                      Mteja anabonyeza kitufe cha <strong>"Lipa Sasa kwa Simu"</strong>. Mfumo unawasiliana na Geti la Malipo (PalmPesa au AzamPay) kuanzisha STK Push.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <p>
                      Ndani ya sekunde 2-4, skrini ya simu ya mteja inawaka ujumbe wa mtandao: <em>"Weka PIN yako ya M-Pesa kuthibitisha malipo ya TZS 1,000 kwenda Hotspot..."</em>
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">5</span>
                    <p>
                      Mteja anapoingiza PIN yake, mtandao wa simu unathibitisha malipo na kutuma <strong>Instant Webhook</strong> kwenye VPS yetu.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">6</span>
                    <p>
                      VPS inatuma ujumbe wa <strong>RADIUS CoA (Port 3799)</strong> kwa Access Point au inamruhusu mteja kupitia browser yake. Skrini ya simu inabadilika mara moja na kuonyesha: <strong>"Umefanikiwa! Intaneti Iko Hewani"</strong> pamoja na saa ya kuhesabu muda wake uliobaki.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: MANUAL VOUCHER LOGIN */}
          {(activeTab === 'VOUCHER' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs">
                  5
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Mteja Kuingiza Vocha ya Karatasi (Manual Voucher Login)
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3">
                <h4 className="font-bold text-sky-950 text-sm flex items-center gap-2">
                  <Tag className="w-4 h-4 text-sky-700" />
                  <span>Jinsi Mteja Anavyotumia Vocha ya Karatasi (Scratch Card / Kadi ya Kuchapa):</span>
                </h4>

                <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed pl-1">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p>
                      Mteja anaponunua kadi ya vocha dukani (iliyochapishwa kupitia kitufe cha <strong>"Vocha & Uchapishaji"</strong> kwenye mfumo wetu).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p>
                      Kwenye Captive Portal, mteja anabonyeza tab ya <strong>"Ingiza Vocha (Voucher)"</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p>
                      Mteja anachapa namba ya vocha (mfano: <code>8421-9503</code>) au ana-scan <strong>QR Code</strong> iliyopo kwenye kadi yake kwa kutumia kamera ya simu.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                    <p>
                      Anabonyeza <strong>"Unganisha Sasa"</strong>. Mfumo unathibitisha vocha kwenye FreeRADIUS database:
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-sky-200 text-[11px] font-mono text-slate-800 space-y-1 ml-7">
                    <div>&bull; Kama vocha haijawahi kutumika: Inawashwa (Status &rarr; ACTIVE), muda wake unaanza kuhesabiwa, na mteja anapewa intaneti mara moja.</div>
                    <div>&bull; Kama vocha imeisha muda wake: Mfumo unakataa na kumtaarifu mteja: <em>"Vocha hii imeisha muda wake."</em></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: TROUBLESHOOTING & WALLED GARDEN */}
          {(activeTab === 'TROUBLESHOOT' || window.matchMedia?.('print').matches) && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-xs">
                  6
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Walled Garden & Masuala ya Kawaida (Troubleshooting)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Kwa Nini Walled Garden ni Muhimu?</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Kabla mteja hajalipia, hana intaneti. Walled Garden inaruhusu simu yake kuwasiliana na seva za malipo za <strong>M-Pesa, Tigo Pesa, Airtel Money, na PalmPesa</strong> bila kukatwa au kuzuiliwa, ili mchakato wa malipo ukamilike salama.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <span>Simu Haifunguki Baada ya Kulipa?</span>
                  </h4>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Hakikisha kwenye AP yako umewasha <strong>RADIUS CoA (Port 3799)</strong> na umeweka RADIUS Secret sahihi (<code>radius_secret_2026</code>). Hii ndiyo inayoruhusu VPS kumwamuru AP kumwachia mteja mara moja.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Print Footer */}
          <div className="hidden print:block border-t border-slate-300 pt-4 mt-8 text-center text-xs text-slate-500">
            Imetengenezwa na TZ-WiFi Cloud Hotspot Platform &bull; Hati Rasmi ya Kusanidi Access Point &bull; 
            Mawasiliano ya Msaada: info@tzwifi.co.tz
          </div>
        </div>

        {/* Modal Footer (Screen only) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
          <div className="text-slate-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Unaweza kubonyeza <strong>"Pakua / Chapisha PDF"</strong> hapo juu na uchague <strong>"Save as PDF"</strong> kwenye kompyuta au simu yako.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Pakua / Chapisha PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition cursor-pointer"
            >
              Funga (Close)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
