import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Copy,
  Check,
  Download,
  Terminal,
  Zap,
  RefreshCw,
  Router,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { HotspotOwner, RouterItem } from '../../types/index.ts';

interface OwnerAllInOneScriptProps {
  currentUser: HotspotOwner | null;
  lang?: 'sw' | 'en';
}

export const OwnerAllInOneScript: React.FC<OwnerAllInOneScriptProps> = ({
  currentUser,
  lang = 'sw',
}) => {
  const [routers, setRouters] = useState<RouterItem[]>([]);
  const [selectedRouterId, setSelectedRouterId] = useState<number | null>(null);
  const [scriptContent, setScriptContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedTerminalCommand, setCopiedTerminalCommand] = useState<boolean>(false);

  // 1. Fetch Routers belonging to this Hotspot Owner
  useEffect(() => {
    const fetchRouters = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/routers');
        if (res.ok) {
          const allRouters: RouterItem[] = await res.json();
          // Filter routers for this owner if not vendor
          const ownerRouters = currentUser?.role === 'VENDOR_ADMIN'
            ? allRouters
            : allRouters.filter((r) => r.owner_id === currentUser?.id);

          setRouters(ownerRouters);
          if (ownerRouters.length > 0) {
            setSelectedRouterId(ownerRouters[0].id);
          } else {
            // If no routers registered yet, fetch generic all-in-one script
            fetchScript();
          }
        }
      } catch (err) {
        console.error('Error fetching routers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRouters();
  }, [currentUser]);

  // 2. Fetch All-in-One script whenever selected router changes
  const fetchScript = async (routerId?: number) => {
    try {
      setLoading(true);
      const url = routerId
        ? `/api/v1/scripts/all-in-one.rsc?routerId=${routerId}`
        : '/api/v1/scripts/all-in-one.rsc';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setScriptContent(data.script || '');
      }
    } catch (err) {
      console.error('Error fetching all-in-one script:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRouterId) {
      fetchScript(selectedRouterId);
    }
  }, [selectedRouterId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const selectedRouter = routers.find((r) => r.id === selectedRouterId);
    const filename = selectedRouter
      ? `${selectedRouter.name.replace(/\s+/g, '_')}_all-in-one.rsc`
      : 'all-in-one.rsc';
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedRouter = routers.find((r) => r.id === selectedRouterId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>{lang === 'sw' ? 'Script ya Moja kwa Moja (All-in-One)' : 'One-Click MikroTik Script'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <Terminal className="w-6 h-6 text-indigo-400" />
              <span>{lang === 'sw' ? 'Script ya All-in-One ya MikroTik' : 'MikroTik All-in-One Script'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lang === 'sw'
                ? 'Hii ndiyo script kuu ya kuweka kwenye router yako ya MikroTik. Inasanidi kiotomatiki VPN ya Cloud, Hotspot Server, FreeRADIUS AAA, na Anti-Tethering kwa kubonyeza mara 1 tu!'
                : 'Master automated configuration script for your MikroTik Router. Configures VPN tunnel, Hotspot Server, FreeRADIUS AAA integration, and anti-tethering.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !scriptContent}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? (lang === 'sw' ? 'Imenakiliwa!' : 'Copied!') : (lang === 'sw' ? 'Nakili Script' : 'Copy Script')}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !scriptContent}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{lang === 'sw' ? 'Pakua .rsc' : 'Download .rsc'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Router Selector Card */}
      {routers.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <Router className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {lang === 'sw' ? 'Chagua Router Yako' : 'Select Your Router'}
              </div>
              <div className="text-sm font-black text-slate-900">
                {selectedRouter ? selectedRouter.name : (lang === 'sw' ? 'Chagua kifaa' : 'Select device')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRouterId || ''}
              onChange={(e) => setSelectedRouterId(Number(e.target.value))}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {routers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.model_name || 'MikroTik'} - {r.ip_address})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => selectedRouterId && fetchScript(selectedRouterId)}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title={lang === 'sw' ? 'Pakia upya script' : 'Reload script'}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Instructions Card: Jinsi ya Kutumia */}
      <div className="bg-emerald-50/70 rounded-3xl p-5 sm:p-6 border border-emerald-200/80 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          <span>{lang === 'sw' ? 'Jinsi ya Kuweka Script Kwenye MikroTik Yako (Hatua 3 Tu)' : 'How to Run on MikroTik (3 Simple Steps)'}</span>
        </h3>
        <ol className="text-xs text-emerald-950 space-y-2 list-decimal list-inside font-medium leading-relaxed">
          <li>
            {lang === 'sw' ? 'Fungua Winbox au ingia kwenye WebFig/SSH ya router yako ya MikroTik.' : 'Open Winbox or connect via SSH to your MikroTik router.'}
          </li>
          <li>
            {lang === 'sw' ? 'Fungua dirisha la ' : 'Open the '}
            <strong className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300">Terminal</strong>
            {lang === 'sw' ? ' kwenye Winbox.' : ' window in Winbox.'}
          </li>
          <li>
            {lang === 'sw' ? 'Bofya ' : 'Click '}
            <strong className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">"Nakili Script"</strong>
            {lang === 'sw' ? ' hapo juu, kisha ' : ' above, then '}
            <strong className="font-black text-slate-900">Paste (Bandika)</strong>
            {lang === 'sw' ? ' kwenye Terminal na ubonyeze ' : ' into the Terminal and press '}
            <strong className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-emerald-300">ENTER</strong>.
          </li>
        </ol>
      </div>

      {/* Script Code Viewer */}
      <div className="bg-slate-950 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300 font-bold">
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            <span>all-in-one.rsc</span>
            {selectedRouter && (
              <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 text-[10px] border border-indigo-700/50">
                {selectedRouter.name}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            RouterOS v7+ Script
          </span>
        </div>

        <div className="p-5 overflow-auto max-h-[550px]">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all">
            {loading ? (lang === 'sw' ? 'Inatengeneza script ya all-in-one...' : 'Generating all-in-one script...') : scriptContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
