import React, { useState, useEffect } from 'react';
import {
  Server,
  Terminal,
  Shield,
  Copy,
  Check,
  Download,
  ExternalLink,
  Cpu,
  Database,
  Radio,
  Network,
  Lock,
  Zap,
  CheckCircle2,
  RefreshCw,
  Sliders,
  BookOpen,
  Smartphone,
  ArrowRight,
  Wifi,
  Layers,
  FileCode,
  HardDrive,
  Github,
  GitBranch,
  GitPullRequest,
  Globe,
} from 'lucide-react';

interface ServerStatus {
  platform: string;
  vpsSubnet: string;
  vpsGatewayIp: string;
  radiusPorts: {
    auth: number;
    acct: number;
    coa: number;
  };
  activeNasCount: number;
  registeredRouters: number;
  openvpnPort: number;
  sstpPort: number;
}

export const VpsDevopsManager: React.FC = () => {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedBash, setCopiedBash] = useState(false);
  const [copiedMysqlCmd, setCopiedMysqlCmd] = useState(false);
  const [copiedSqlSchema, setCopiedSqlSchema] = useState(false);
  const [sqlContent, setSqlContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'guide' | 'domain_ssl' | 'database' | 'github' | 'overview' | 'bashScript' | 'freeradius' | 'openvpn' | 'security'
  >('guide');
  const [copiedGithub, setCopiedGithub] = useState(false);
  const [copiedGitUpdate, setCopiedGitUpdate] = useState(false);
  const [copiedOneLineGit, setCopiedOneLineGit] = useState(false);
  const [copiedSslCmd, setCopiedSslCmd] = useState(false);
  const [customDomain, setCustomDomain] = useState('wifi.kampuniyako.com');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/devops/server-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/v1/system/schema');
      if (res.ok) {
        const text = await res.text();
        setSqlContent(text);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSchema();
  }, []);

  const vpsInstallCommand = `curl -fsSL ${window.location.origin}/api/v1/devops/vps-script | sudo bash`;

  const mysqlSetupScript = `# 1. Sakinisha MySQL Server kwenye VPS
sudo apt update && sudo apt install -y mysql-server

# 2. Fungua MySQL na uunde database pamoja na mtumiaji
sudo mysql -e "CREATE DATABASE IF NOT EXISTS hotspot_billing DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'hotspot_user'@'localhost' IDENTIFIED BY 'TzWifiSecure2026!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON hotspot_billing.* TO 'hotspot_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

# 3. Pakua na ingiza schema ya mfumo mara moja
curl -fsSL ${window.location.origin}/api/v1/system/schema -o schema.sql
mysql -u hotspot_user -p'TzWifiSecure2026!' hotspot_billing < schema.sql

# 4. Thibitisha kuwa majedwali yameingia vizuri
mysql -u hotspot_user -p'TzWifiSecure2026!' -e "USE hotspot_billing; SHOW TABLES;"`;

  const handleCopyInstallCommand = () => {
    navigator.clipboard.writeText(vpsInstallCommand);
    setCopiedBash(true);
    setTimeout(() => setCopiedBash(false), 2000);
  };

  const handleCopyMysqlCommands = () => {
    navigator.clipboard.writeText(mysqlSetupScript);
    setCopiedMysqlCmd(true);
    setTimeout(() => setCopiedMysqlCmd(false), 2000);
  };

  const githubCloneScript = `# 1. Sakinisha Git, Node.js 20 & PM2 kwenye VPS (Ubuntu 22.04 / 24.04)
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 tsx

# 2. Shusha msimbo kutoka GitHub moja kwa moja kwenye VPS
sudo mkdir -p /var/www/tz-wifi-billing
sudo chown -R $USER:$USER /var/www/tz-wifi-billing
git clone https://github.com/USERNAME/REPO_NAME.git /var/www/tz-wifi-billing
cd /var/www/tz-wifi-billing

# 3. Sakinisha vifurushi na jenga Frontend (Production Build)
npm install
npm run build

# 4. Unda faili la .env na ujaze taarifa zako za AzamPay / MikroTik
cp .env.example .env
nano .env

# 5. Washa mfumo kwa PM2 uwe hewani 24/7 (hata VPS ikipata reboot)
pm2 start server.ts --name "tz-wifi-billing" --interpreter tsx
pm2 startup
pm2 save`;

  const githubUpdateScript = `# Njia ya 1: Amri ya Moja kwa Moja ya 1-Click Script (Inashauriwa):
cd /var/www/tz-wifi-billing && sudo bash deploy/update.sh

# Njia ya 2: Amri za Mkono (Hatua kwa Hatua):
cd /var/www/tz-wifi-billing
git pull origin main
npm install
npm run build
pm2 reload tz-wifi-billing || pm2 restart tz-wifi-billing`;

  const oneLineGithubDeploy = `git clone https://github.com/USERNAME/REPO_NAME.git /var/www/tz-wifi-billing && cd /var/www/tz-wifi-billing && sudo bash deploy/quick-deploy.sh`;

  const handleCopyOneLineGit = () => {
    navigator.clipboard.writeText(oneLineGithubDeploy);
    setCopiedOneLineGit(true);
    setTimeout(() => setCopiedOneLineGit(false), 2000);
  };

  const handleCopyGithubCommands = () => {
    navigator.clipboard.writeText(githubCloneScript);
    setCopiedGithub(true);
    setTimeout(() => setCopiedGithub(false), 2000);
  };

  const handleCopyGitUpdate = () => {
    navigator.clipboard.writeText(githubUpdateScript);
    setCopiedGitUpdate(true);
    setTimeout(() => setCopiedGitUpdate(false), 2000);
  };

  const sslSetupScript = `sudo bash deploy/setup-ssl.sh ${customDomain || 'wifi.kampuniyako.com'}`;

  const handleCopySslCmd = () => {
    navigator.clipboard.writeText(sslSetupScript);
    setCopiedSslCmd(true);
    setTimeout(() => setCopiedSslCmd(false), 2000);
  };

  const handleCopySqlSchema = () => {
    if (sqlContent) {
      navigator.clipboard.writeText(sqlContent);
      setCopiedSqlSchema(true);
      setTimeout(() => setCopiedSqlSchema(false), 2000);
    }
  };

  const handleDownloadSchemaFile = () => {
    if (!sqlContent) return;
    const blob = new Blob([sqlContent], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotspot_billing_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Ubuntu 22.04 LTS Cloud Stack (MySQL 8 + FreeRADIUS + WireGuard)</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              INFOTECH WiFi: Cloud VPS, MySQL Database & DevOps Center
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Mwongozo kamili wa kiutendaji: Kusimika MySQL Database, FreeRADIUS 3.x, WireGuard / SSTP VPN, na kuwaunganisha wateja wa simu (M-Pesa, Tigo, Airtel, Halopesa) na vocha za karatasi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchStatus}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/api/v1/devops/vps-script"
              download="setup-vps.sh"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download setup-vps.sh</span>
            </a>
          </div>
        </div>

        {/* 1-Click Terminal Deploy Command Box */}
        <div className="mt-5 p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 flex flex-col gap-2 font-mono text-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden w-full">
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400 select-none">$</span>
              <span className="text-emerald-300 truncate selection:bg-emerald-800 select-all">
                {vpsInstallCommand}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyInstallCommand}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-sans font-bold flex items-center justify-center gap-1.5 transition shrink-0 border border-slate-700 cursor-pointer"
            >
              {copiedBash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copiedBash ? 'Imenakiliwa!' : 'Nakili 1-Line Setup'}</span>
            </button>
          </div>
          <p className="text-[11px] font-sans text-amber-300/90 font-normal">
            💡 <strong>Kumbuka ya VPS:</strong> Kwenye VPS mpya (Contabo/Hetzner/DigitalOcean), njia bora na ya uhakika 100% ni ku-clone kutoka GitHub au kuweka amri za moja kwa moja zilizopo kwenye tab ya <strong>"Mwongozo wa Hatua kwa Hatua"</strong> hapa chini.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap rounded-2xl bg-white p-1 border border-slate-200 text-xs font-bold text-slate-600 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'guide'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Mwongozo wa Hatua kwa Hatua (A to Z)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('domain_ssl')}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'domain_ssl'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Domain & HTTPS (SSL)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'database'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-indigo-700 hover:bg-indigo-50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>MySQL Database & Schema.sql</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('github')}
          className={`py-2 px-4 rounded-xl transition flex items-center gap-1.5 ${
            activeTab === 'github'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Github className="w-3.5 h-3.5" />
          <span>GitHub Deploy & CI/CD</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 rounded-xl transition ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'hover:text-slate-900'
          }`}
        >
          Seva Metrics
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bashScript')}
          className={`py-2 px-4 rounded-xl transition ${
            activeTab === 'bashScript'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'hover:text-slate-900'
          }`}
        >
          Bash Installer (setup-vps.sh)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('freeradius')}
          className={`py-2 px-4 rounded-xl transition ${
            activeTab === 'freeradius'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'hover:text-slate-900'
          }`}
        >
          FreeRADIUS & CoA
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('openvpn')}
          className={`py-2 px-4 rounded-xl transition ${
            activeTab === 'openvpn'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'hover:text-slate-900'
          }`}
        >
          VPN Fleet Subnet
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`py-2 px-4 rounded-xl transition ${
            activeTab === 'security'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'hover:text-slate-900'
          }`}
        >
          Firewall (UFW)
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: END-TO-END STEP-BY-STEP OPERATIONAL GUIDE */}
      {/* ===================================================================== */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          {/* Guide Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-3xl text-white border border-emerald-800/40 shadow-xl space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Mwongozo Kamili wa Utekelezaji (End-to-End Operational Guide)</span>
            </div>
            <h3 className="text-xl font-black text-white">
              Hatua kwa Hatua: Kuanzia Kusanidi VPS, Domain, SSL, MySQL, MikroTik mpaka Mteja Kupata Intaneti
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Fuata hatua hizi 7 ili kuunganisha seva yako ya Cloud VPS, kusanidi Domain & HTTPS (SSL), kusimika MySQL Database, kuunganisha MikroTik Router, na kuanzisha mfumo wa kutoa intaneti kwa simu au vocha za karatasi.
            </p>
          </div>

          {/* Step 1 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                1
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                Pata Cloud VPS ya Ubuntu 22.04 LTS
              </h4>
            </div>
            <div className="text-xs text-slate-600 space-y-2 pl-11">
              <p>
                Sajili VPS kutoka kampuni yoyote ya Cloud (mfano: <strong>DigitalOcean</strong>, <strong>Hetzner</strong>, <strong>Linode</strong>, au <strong>AWS Lightsail</strong>):
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                <li><strong>Operating System:</strong> Ubuntu 22.04 LTS (x86_64)</li>
                <li><strong>RAM & CPU:</strong> 1 vCPU / 2GB RAM (Inatosha hadi router 500 na watumiaji 20,000)</li>
                <li><strong>Storage:</strong> 25GB SSD au zaidi</li>
                <li><strong>IP:</strong> 1 Dedicated Public IPv4</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                2
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span>Sambaza Mfumo kwenye VPS: GitHub (Inayopendekezwa) au 1-Line Script</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Unaweza kutumia GitHub kwa usimamizi rahisi wa msimbo na updates, au kutumia script ya moja kwa moja.
                </p>
              </div>
            </div>

            <div className="space-y-4 pl-11 text-xs text-slate-600">
              {/* Method A: GitHub Deployment */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-white">
                    <Github className="w-4 h-4 text-emerald-400" />
                    <span>Chaguo A (Inayopendekezwa): Sambaza kwa Kutumia GitHub & PM2</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                      Production Standard
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyGithubCommands}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition"
                  >
                    {copiedGithub ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGithub ? 'Imenakiliwa!' : 'Nakili Amri Zote za GitHub'}</span>
                  </button>
                </div>

                {/* 1-Line All-in-One Command */}
                <div className="p-3 bg-gradient-to-r from-emerald-950 via-slate-950 to-indigo-950 rounded-xl border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>AMRI 1 TU YA GITHUB (Copy, Paste & Done):</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOneLineGit}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center gap-1 transition"
                    >
                      {copiedOneLineGit ? <Check className="w-3 h-3 text-slate-950" /> : <Copy className="w-3 h-3 text-slate-950" />}
                      <span>{copiedOneLineGit ? 'Imenakiliwa!' : 'Nakili Amri Hii 1'}</span>
                    </button>
                  </div>
                  <pre className="p-2 bg-slate-950 text-yellow-300 font-mono text-[11px] rounded-lg border border-slate-800 overflow-x-auto select-all">
{oneLineGithubDeploy}
                  </pre>
                  <p className="text-[10px] text-slate-400">
                    * Badilisha <code className="text-yellow-300">USERNAME/REPO_NAME</code> na link ya GitHub yako. Amri hii inashusha msimbo, inaweka Node.js & PM2, inajenga frontend na kuwasha mfumo mara moja!
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 pt-1">
                  Au endesha amri hizi hatua kwa hatua kama unataka kuona kila kinachoendelea:
                </div>

                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{githubCloneScript}
                </pre>

                {/* Updating Section */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    <span><strong>Kusasisha Baadaye (Updates):</strong> Endesha <code>git pull && npm run build && pm2 restart tz-wifi-billing</code></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyGitUpdate}
                    className="text-[11px] text-indigo-300 hover:text-indigo-200 underline font-mono"
                  >
                    {copiedGitUpdate ? 'Imenakiliwa!' : 'Nakili Amri ya Update'}
                  </button>
                </div>
              </div>

              {/* Method B: 1-Line Script */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <Terminal className="w-4 h-4 text-indigo-600" />
                    <span>Chaguo B: Kusanidi Kiotomatiki kwa Amri 1 ya Haraka (Automated Bash)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInstallCommand}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                  >
                    {copiedBash ? 'Imenakiliwa!' : 'Nakili Amri'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  Kama unataka script yetu iweke kila kitu kiotomatiki (Firewall, FreeRADIUS, OpenVPN, Node.js, PM2, Nginx) bila kuandika amri nyingi:
                </p>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300 select-all overflow-x-auto">
                  {vpsInstallCommand}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 3: DOMAIN & HTTPS (SSL) SETUP STEP */}
          <div className="p-6 bg-white rounded-3xl border-2 border-emerald-200 shadow-md space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl">
              Salama & Kisasa / SSL HTTPS
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                3
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Kupata Domain Name & Kuwasha HTTPS / SSL ya Bure (Let's Encrypt)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Kuwa na domain na HTTPS kunaondoa onyo la "Not Secure" kwenye simu za wateja na kunaruhusu Webhook za AzamPay kufanya kazi.
                </p>
              </div>
            </div>

            <div className="space-y-4 pl-11 text-xs text-slate-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3.1 Domain Name */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block text-xs">
                    Hatua A: Pata Domain Name (au Tumia Subdomain ya Bure)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kama tayari una tovuti ya biashara yako (mfano <code>kampuni.com</code>), tengeneza tu <strong>Subdomain ya bure</strong> kama <code>wifi.kampuni.com</code>. Kama huna, nunua jina kutoka Truehost.co.tz, Namecheap au Extreme Web kwa takriban TZS 20,000/mwaka.
                  </p>
                </div>

                {/* 3.2 DNS Record */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-900 block text-xs">
                    Hatua B: Elekeza DNS A-Record Kwenye IP ya VPS
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kwenye Dashibodi ya Domain yako (cPanel/Cloudflare/Namecheap), weka <strong>A Record</strong>:
                  </p>
                  <div className="bg-white p-2 rounded-xl border border-slate-200 font-mono text-[10px] space-y-1">
                    <div>Type: <strong className="text-indigo-600">A</strong> | Host: <strong className="text-indigo-600">wifi</strong></div>
                    <div>Value: <strong className="text-emerald-600">&lt;IP_YA_VPS_YAKO&gt;</strong></div>
                  </div>
                </div>
              </div>

              {/* 3.3 1-Command SSL Automation */}
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Hatua C: Washa HTTPS kwa Amri Moja Tu ya Kiotomatiki (Let's Encrypt + Nginx)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySslCmd}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition"
                  >
                    {copiedSslCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSslCmd ? 'Imenakiliwa!' : 'Nakili Amri ya SSL'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-400 font-mono">Domain Yako:</label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="wifi.kampuniyako.com"
                    className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-xl border border-slate-800 overflow-x-auto leading-relaxed">
{sslSetupScript}
                </pre>
                <p className="text-[11px] text-slate-400">
                  ⚡ Script hii itaweka Nginx, itasanidi Reverse Proxy, itachukua cheti cha bure cha SSL kutoka Let's Encrypt, na itafanya cheti kijisasishe kiotomatiki (auto-renew) kila baada ya miezi 3 bila malipo!
                </p>
              </div>
            </div>
          </div>

          {/* STEP 4: DEDICATED DATABASE SETUP STEP */}
          <div className="p-6 bg-white rounded-3xl border-2 border-indigo-200 shadow-md space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider rounded-bl-xl">
              Muhimu Sana / Database Setup
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                4
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Sanidi Database ya MySQL & Ingiza Majedwali (schema.sql)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  MySQL inahifadhi routers, vifurushi, miamala ya M-Pesa/Tigo/Airtel, vocha, na majedwali ya FreeRADIUS (radcheck & radreply).
                </p>
              </div>
            </div>

            <div className="space-y-4 pl-11 text-xs text-slate-600">
              <p>
                Kama hujatumia ile 1-Line script na unataka kuweka MySQL mwenyewe, au unataka kuingiza majedwali ya hivi punde, bandika amri hizi kwenye Terminal ya VPS yako:
              </p>

              {/* Code block with copy button */}
              <div className="relative group">
                <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-2xl border border-slate-800 overflow-x-auto leading-relaxed">
                  <span className="text-emerald-400"># 1. Sakinisha na Washa MySQL</span>{'\n'}
                  sudo apt update && sudo apt install -y mysql-server{'\n'}{'\n'}
                  <span className="text-emerald-400"># 2. Unda Database ya hotspot_billing na mtumiaji wa mfumo</span>{'\n'}
                  sudo mysql -e "CREATE DATABASE IF NOT EXISTS hotspot_billing DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"{'\n'}
                  sudo mysql -e "CREATE USER IF NOT EXISTS 'hotspot_user'@'localhost' IDENTIFIED BY 'TzWifiSecure2026!';"{'\n'}
                  sudo mysql -e "GRANT ALL PRIVILEGES ON hotspot_billing.* TO 'hotspot_user'@'localhost';"{'\n'}
                  sudo mysql -e "FLUSH PRIVILEGES;"{'\n'}{'\n'}
                  <span className="text-emerald-400"># 3. Pakua na Ingiza Majedwali (schema.sql)</span>{'\n'}
                  curl -fsSL {window.location.origin}/api/v1/system/schema -o schema.sql{'\n'}
                  mysql -u hotspot_user -p'TzWifiSecure2026!' hotspot_billing &lt; schema.sql{'\n'}{'\n'}
                  <span className="text-emerald-400"># 4. Angalia Majedwali Yaliyoundwa</span>{'\n'}
                  mysql -u hotspot_user -p'TzWifiSecure2026!' -e "USE hotspot_billing; SHOW TABLES;"
                </pre>

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMysqlCommands}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow-xs"
                  >
                    {copiedMysqlCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMysqlCmd ? 'Imenakiliwa!' : 'Nakili Amri za MySQL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSchemaFile}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pakua schema.sql</span>
                  </button>
                </div>
              </div>

              {/* Database Tables Summary Badges */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <span className="font-bold text-xs text-indigo-950 block">
                  Majedwali Makuu Yanayoingizwa Kwenye MySQL:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">routers</strong>
                    <span className="text-[10px] text-slate-500 font-sans">MikroTik IP & API Tokens</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">plans</strong>
                    <span className="text-[10px] text-slate-500 font-sans">Vifurushi vya TZS & Speed</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">transactions</strong>
                    <span className="text-[10px] text-slate-500 font-sans">Malipo ya Simu (M-Pesa n.k)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">vouchers</strong>
                    <span className="text-[10px] text-slate-500 font-sans">Kadi za Vocha & PIN</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">radcheck</strong>
                    <span className="text-[10px] text-slate-500 font-sans">FreeRADIUS PIN Authentication</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">radreply</strong>
                    <span className="text-[10px] text-slate-500 font-sans">Rate Limits (e.g. 2M/5M)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">hotspot_sessions</strong>
                    <span className="text-[10px] text-slate-500 font-sans">Wateja waliopo hewani</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-indigo-200">
                    <strong className="text-indigo-700 block">audit_logs</strong>
                    <span className="text-[10px] text-slate-500 font-sans">Webhook & Callback Security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                5
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                Weka Script ya Configuration kwenye MikroTik Router (Winbox)
              </h4>
            </div>
            <div className="text-xs text-slate-600 space-y-3 pl-11">
              <p>
                Nenda kwenye sehemu ya <strong>MikroTik Routers</strong> kwenye jopo hili la Admin na uchague router yako:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>Bonyeza kitufe cha <strong>"MikroTik Cloud Scripts (.rsc)"</strong>.</li>
                <li>Chagua tab ya <strong>"all-in-one.rsc"</strong> au <strong>"WireGuard VPN"</strong> kisha bonyeza <strong>"Nakili Script"</strong> au pakua faili.</li>
                <li>Fungua programu ya <strong>Winbox</strong> kwenye kompyuta yako na uingie kwenye MikroTik Router.</li>
                <li>Kwenye menyu ya kushoto ya Winbox, bonyeza <strong>New Terminal</strong>.</li>
                <li>Bonyeza kitufe cha kulia cha kipanya (Right Click) na uchague <strong>Paste</strong>, kisha bonyeza <strong>Enter</strong>.</li>
              </ol>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <strong>Matokeo ya Haraka:</strong>
                <p>
                  Router itatengeneza handaki la siri la VPN kwenda kwenye VPS, itawasha Walled Garden ya mitandao ya simu (M-Pesa, Tigo, Airtel, Halopesa), na itaunganisha Cloud Heartbeat ya kusawazisha vocha kila sekunde 10!
                </p>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm">
                6
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                Weka Ukurasa wa Kuelekeza Wateja (login.html) kwenye MikroTik (Yenye HTTPS)
              </h4>
            </div>
            <div className="text-xs text-slate-600 space-y-3 pl-11">
              <p>
                Ili mteja anayejiunga na Wi-Fi aelekezwe moja kwa moja kwenye ukurasa wako salama wa <strong>HTTPS</strong>:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>Kwenye kadi ya router, bonyeza kitufe cha <strong>"Pakua login.html"</strong> (itakuwa na link yako ya HTTPS ya domain).</li>
                <li>Kwenye Winbox, bonyeza menyu ya <strong>Files</strong>.</li>
                <li>Tafuta folda inayoitwa <strong>hotspot</strong>.</li>
                <li>Buruta na uweke (Drag and Drop) faili la <strong>login.html</strong> ndani ya folda hiyo ya <code>hotspot/</code>.</li>
              </ol>
            </div>
          </div>

          {/* Step 7 */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                7
              </div>
              <h4 className="font-extrabold text-base text-slate-900">
                Jinsi Mteja Anavyolipia na Kupata Intaneti Papo Hapo
              </h4>
            </div>
            <div className="text-xs text-slate-600 space-y-4 pl-11">
              <p>Mteja anapounganisha kifaa chake (Simu au Kompyuta) kwenye mtandao wa Wi-Fi:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Method A */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-950">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Njia A: Malipo ya Simu (USSD / STK Push)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                    <li>Mteja anachagua kifurushi (mfano: <strong>2 Hours - TZS 1,000</strong>).</li>
                    <li>Anajaza namba yake ya simu (mfano <code>0754 000 111</code> au <code>0713 000 222</code>).</li>
                    <li>Mfumo unatambua mtandao kiotomatiki (Vodacom M-Pesa, Tigo Pesa, Airtel Money, au Halopesa).</li>
                    <li>Mteja anabonyeza <strong>"Lipa Sasa"</strong> &rarr; Dirisha la USSD PIN linatokea kwenye simu yake.</li>
                    <li>Mteja anathibitisha kwa kuweka PIN yake ya mtandao wa simu.</li>
                    <li><strong>Papo hapo:</strong> Mfumo unapokea uthibitisho wa pesa, unaandika vocha kwenye MySQL, na mteja anaunganishwa mtandaoni sekunde hiyo hiyo bila kuandika nenosiri (Zero-Touch Login)!</li>
                  </ol>
                </div>

                {/* Method B */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                    <Wifi className="w-4 h-4 text-emerald-600" />
                    <span>Njia B: Kuweka Vocha ya Karatasi (PIN / QR)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 text-[11px] leading-relaxed">
                    <li>Mmiliki anazalisha na kuchapisha vocha kupitia <strong>Voucher Station</strong> (A4 au Thermal POS).</li>
                    <li>Mteja ananunua kadi ya vocha dukani au kwa wakala.</li>
                    <li>Kwenye ukurasa wa Captive Portal, anachagua tab ya <strong>"Weka Vocha / Enter Voucher"</strong>.</li>
                    <li>Anaandika namba ya siri (mfano <code>TZ-74921</code>) au anabonyeza <strong>Scan QR</strong> kwa kamera ya simu.</li>
                    <li>Anabonyeza <strong>"Unganisha Mtandao"</strong>.</li>
                    <li>MySQL na FreeRADIUS zinathibitisha namba hiyo na kumpa kasi iliyopangwa (Rate Limit) na muda sahihi wa kutumia.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: DOMAIN NAME & HTTPS SSL (LET'S ENCRYPT) */}
      {/* ===================================================================== */}
      {activeTab === 'domain_ssl' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white border border-emerald-800/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Domain & SSL (HTTPS) Architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono font-bold">
                  Let's Encrypt SSL (100% Free)
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[11px] px-2.5 py-1 rounded-lg border border-indigo-500/30 font-mono font-bold">
                  Auto-Renew Every 90 Days
                </span>
              </div>
            </div>
            <h3 className="text-xl font-black text-white">
              Kusanidi Domain Name na Kuwasha HTTPS / SSL ya Bure
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Simu za kisasa za Android na iOS (iPhone) zinahitaji ukurasa uwe na cheti cha usalama (SSL HTTPS) ili zifungue Captive Portal bila kuonyesha ujumbe wa tahadhari (*"Not Secure"*). Pia kampuni za malipo (AzamPay, Vodacom, Selcom) zinahitaji Webhook URL ya HTTPS ili kutuma miamala salama.
            </p>
          </div>

          {/* Interactive Domain Customizer */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span>Kiwanda cha Amri ya SSL (Interactive 1-Command SSL Setup)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Andika jina la domain yako hapa chini, kisha nakili amri iliyoandaliwa kwa ajili ya VPS yako:
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySslCmd}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition shrink-0"
              >
                {copiedSslCmd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSslCmd ? 'Imenakiliwa!' : 'Nakili Amri ya Kuwasha SSL'}</span>
              </button>
            </div>

            {/* Input Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Domain au Subdomain Yako:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="wifi.kampuniyako.com"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Mfano: <code>wifi.hotspotyako.com</code> au <code>hotspot.biashara.co.tz</code>
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Port ya Mfumo (Backend):</label>
                <div className="px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-mono text-sm font-bold flex items-center justify-between">
                  <span>Port 3000 (Node.js)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-sans font-bold">Proxy</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Nginx itaelekeza kiotomatiki port 443 (HTTPS) kwenda port 3000.
                </p>
              </div>
            </div>

            {/* Terminal Command Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-2 text-emerald-400">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Paste Amri Hii Kwenye Terminal ya VPS (Root):</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-bold">1-Command Automatic</span>
              </div>
              <pre className="text-emerald-300 text-sm leading-relaxed overflow-x-auto py-2 font-bold">
{sslSetupScript}
              </pre>
              <p className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 font-sans">
                💡 Amri hii itafanya: (1) Kusakinisha Nginx & Certbot, (2) Kusanidi Reverse Proxy kwa Node.js port 3000, (3) Kupakua cheti cha SSL kutoka Let's Encrypt, na (4) Kuanzisha auto-renewal ya miezi 3 bila gharama yoyote.
              </p>
            </div>
          </div>

          {/* 3 Columns: DNS, Mikrotik URL, AzamPay Callback */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. DNS Setup */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span>1. DNS Management</span>
              </div>
              <p className="text-xs text-slate-600">
                Kwenye akaunti ulikonunua domain yako (cPanel, Cloudflare, au Namecheap), weka <strong>A-Record</strong>:
              </p>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 font-mono text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Record Type:</span>
                  <strong className="text-indigo-600">A</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Host / Name:</span>
                  <strong className="text-indigo-600">{customDomain.split('.')[0] || 'wifi'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Points to (Value):</span>
                  <strong className="text-emerald-600 font-bold">&lt;IP_YA_VPS&gt;</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TTL:</span>
                  <span className="text-slate-700">Auto / 300s</span>
                </div>
              </div>
            </div>

            {/* 2. MikroTik Login.html */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>2. MikroTik login.html URL</span>
              </div>
              <p className="text-xs text-slate-600">
                Kwenye faili la <code>login.html</code> la MikroTik Router yako, elekeza kwa URL hii ya HTTPS:
              </p>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-emerald-300 font-mono text-[11px] break-all leading-relaxed">
                https://{customDomain || 'wifi.kampuniyako.com'}/?mac=$(mac)&ip=$(ip)
              </div>
              <p className="text-[11px] text-slate-500">
                Simu zote zitafungua ukurasa huu zikiwa na kufuli salama ya kijani!
              </p>
            </div>

            {/* 3. AzamPay Webhook Callback */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>3. AzamPay Webhook URL</span>
              </div>
              <p className="text-xs text-slate-600">
                Kwenye Dashibodi ya AzamPay/Selcom, weka Callback URL hii ya HTTPS:
              </p>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-emerald-300 font-mono text-[11px] break-all leading-relaxed">
                https://{customDomain || 'wifi.kampuniyako.com'}/api/v1/payment/callback/azampay
              </div>
              <p className="text-[11px] text-slate-500">
                AzamPay inahitaji HTTPS URL ili kutuma majibu ya mteja aliyelipa kwa M-Pesa/Tigo.
              </p>
            </div>
          </div>

          {/* Educational Guide: Where to buy domain */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Mwongozo wa Wapi pa Kupata Domain Name (Tanzania & Kimataifa)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <strong className="text-indigo-950 font-bold block text-sm">
                  1. Kama tayari unamiliki Domain (Bure Kabisa):
                </strong>
                <p className="leading-relaxed">
                  Kama una tovuti ya kawaida ya biashara au ofisi yako (mfano <code>jinalako.com</code>), huhitaji kulipa chochote! Fungua DNS ya domain hiyo na uunde <strong>Subdomain ya bure</strong> kama <code>wifi.jinalako.com</code> au <code>hotspot.jinalako.com</code>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2">
                <strong className="text-emerald-950 font-bold block text-sm">
                  2. Kama unataka kununua Domain mpya:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  <li><strong>Tanzania (.co.tz, .tz, .com):</strong> Truehost.co.tz, Extreme Web Technologies, Web4Africa (takriban TZS 20,000 - 30,000 kwa mwaka).</li>
                  <li><strong>Kimataifa (.com, .net):</strong> Namecheap.com, Cloudflare Registrar (takriban $8 - $10 kwa mwaka).</li>
                  <li>Malipo yanafanyika kirahisi kupitia M-Pesa, Tigo Pesa, au Kadi ya Visa/Mastercard.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: DEDICATED MYSQL DATABASE & SCHEMA TAB */}
      {/* ===================================================================== */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <span>MySQL 8.0+ / MariaDB Database Architecture</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Muundo kamili wa uhifadhi wa data kwa ajili ya Cloud VPS ya uzalishaji (Production).
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyMysqlCommands}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {copiedMysqlCmd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedMysqlCmd ? 'Imenakiliwa!' : 'Nakili Amri za VPS'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySqlSchema}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  {copiedSqlSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copiedSqlSchema ? 'Imenakiliwa!' : 'Nakili DDL Schema'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSchemaFile}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Pakua schema.sql</span>
                </button>
              </div>
            </div>

            {/* Quick Setup Terminal Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span># Amri za Haraka za Kuingiza Kwenye VPS (Copy & Paste):</span>
                <span className="text-[11px] text-emerald-400 font-bold">Ubuntu 22.04 LTS</span>
              </div>
              <pre className="text-emerald-400 leading-relaxed overflow-x-auto text-[11px]">
{mysqlSetupScript}
              </pre>
            </div>

            {/* Environment Variables Reference */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-xs text-indigo-950 uppercase tracking-wide">
                  Mipangilio ya Kuunganisha (Environment Variables kwenye .env ya VPS):
                </span>
              </div>
              <pre className="p-3 bg-white rounded-xl border border-indigo-200 font-mono text-xs text-slate-800">
{`DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=hotspot_billing
DB_USER=hotspot_user
DB_PASSWORD=TzWifiSecure2026!`}
              </pre>
              <p className="text-[11px] text-indigo-800">
                Seva ya Node.js backend inapowashwa kwenye VPS, inasoma vigezo hivi ili kuwasiliana na MySQL.
              </p>
            </div>

            {/* Schema SQL Viewer Preview */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Msimbo wa Faili la schema.sql:</span>
                <span className="text-[11px] text-slate-400 font-mono">{sqlContent.length} characters</span>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed border border-slate-800">
                {sqlContent || '-- Loading schema.sql...'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: GITHUB PRODUCTION DEPLOYMENT & CI/CD */}
      {/* ===================================================================== */}
      {activeTab === 'github' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                <Github className="w-4 h-4 text-white" />
                <span>GitHub CI/CD & DevOps Pipeline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/30 font-mono font-bold">
                  Git v2.30+ Compatible
                </span>
                <span className="bg-indigo-500/20 text-indigo-300 text-[11px] px-2.5 py-1 rounded-lg border border-indigo-500/30 font-mono font-bold">
                  Node.js 20 LTS + PM2
                </span>
              </div>
            </div>
            <h3 className="text-xl font-black text-white">
              Mwongozo wa Kudeploy Mfumo kwa Kutumia GitHub kwenye VPS
            </h3>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Kutumia GitHub ndiyo kiwango cha kimataifa cha uzalishaji (Production Standard). Inakuwezesha kusimamia msimbo wako salama, kufanya mabadiliko bila kupoteza data, na kusasisha seva yako kwa amri moja tu ya <code className="text-emerald-400 font-mono">git pull</code>.
            </p>
          </div>

          {/* Step 1: Fresh Deployment Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-indigo-600" />
                  <span>Hatua ya Kwanza: Kuweka Mfumo kwenye VPS Kutoka GitHub (Fresh Deployment)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Endesha amri hizi kwenye Terminal ya VPS yako (Ubuntu 22.04 au 24.04 LTS):
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyGithubCommands}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-2 shadow-xs transition shrink-0"
              >
                {copiedGithub ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGithub ? 'Imenakiliwa!' : 'Nakili Amri Zote za Git Clone'}</span>
              </button>
            </div>

            {/* 1-Line All-in-One Command */}
            <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-950 to-indigo-950 rounded-2xl border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Amri 1 Tu ya Haraka (1-Line Instant Deploy):</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyOneLineGit}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition"
                >
                  {copiedOneLineGit ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5 text-slate-950" />}
                  <span>{copiedOneLineGit ? 'Imenakiliwa!' : 'Nakili Amri Hii 1'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-950 text-yellow-300 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto select-all leading-relaxed">
{oneLineGithubDeploy}
              </pre>
              <p className="text-[11px] text-slate-400">
                Amri hii moja inashusha mradi wako kutoka GitHub, inaweka Node.js 20, inajenga frontend, na inawasha PM2 24/7 bila haja ya kuandika amri nyingi.
              </p>
            </div>

            {/* Terminal Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SSH Terminal / Root Command Sequence:</span>
                </span>
                <span className="text-[11px] text-emerald-400 font-bold">Bash (Ubuntu)</span>
              </div>
              <pre className="text-emerald-300 leading-relaxed overflow-x-auto text-[11px] py-1">
{githubCloneScript}
              </pre>
            </div>
          </div>

          {/* Step 2: Environment Variables Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>Usanidi wa Faili la .env (Kwenye VPS)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Baada ya kufanya <code>git clone</code>, tengeneza faili la <code>.env</code> kwa kupiga <code>cp .env.example .env && nano .env</code> kisha weka siri zako:
              </p>
              <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 font-mono text-[11px] leading-relaxed overflow-x-auto">
{`PORT=3000
NODE_ENV=production

# Taarifa za AzamPay / Mobile Money Gateway
AZAMPAY_APP_NAME="TZ-WIFI-HOTSPOT"
AZAMPAY_CLIENT_ID="your_azampay_client_id"
AZAMPAY_CLIENT_SECRET="your_azampay_client_secret"
AZAMPAY_API_KEY="your_azampay_api_key"
AZAMPAY_ACCOUNT_NUMBER="255754000111"
AZAMPAY_WEBHOOK_SECRET="tzwifi_secret_key_89230492"

# Taarifa za MikroTik Hardware API
MIKROTIK_HOST="192.168.88.1"
MIKROTIK_API_PORT="8728"
MIKROTIK_USER="billing_api"
MIKROTIK_PASSWORD="SecureRouterPassword2026!"`}
              </pre>
              <p className="text-[11px] text-slate-500">
                🔒 <strong>Muhimu:</strong> Faili la <code>.env</code> halipaswi kusukumwa (never commit) kwenye GitHub ili kulinda nenosiri na API keys zako.
              </p>
            </div>

            {/* Updates / CI/CD Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    <span>Kusasisha Mfumo (Deploy Updates kwa Sekunde 10)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopyGitUpdate}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    {copiedGitUpdate ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedGitUpdate ? 'Imenakiliwa' : 'Nakili'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kila unapoingiza marekebisho au maboresho kwenye GitHub repo yako, unahitaji tu kuendesha amri hizi kwenye VPS:
                </p>
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed space-y-1.5">
                  <div className="text-slate-400 font-sans font-bold flex items-center justify-between border-b border-slate-800 pb-1">
                    <span>⚡ Njia ya 1 (Haraka Zaidi): 1-Click Auto Update Script</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Inayopendekezwa</span>
                  </div>
                  <p className="text-emerald-300 font-bold">cd /var/www/tz-wifi-billing && sudo bash deploy/update.sh</p>
                  
                  <div className="text-slate-400 font-sans font-bold pt-2 border-t border-slate-800/80">
                    <span>🛠️ Njia ya 2: Hatua kwa Hatua (Manual Commands):</span>
                  </div>
                  <p className="text-slate-300">cd /var/www/tz-wifi-billing</p>
                  <p className="text-slate-300">git pull origin main</p>
                  <p className="text-slate-300">npm install && npm run build</p>
                  <p className="text-slate-300">pm2 reload tz-wifi-billing</p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Zero Downtime (Bila Kukatisha Mtandao):</strong> <code>pm2 reload</code> inasasisha msimbo bila kukata mawasiliano ya wateja waliopo hewani wala kukatisha miamala ya M-Pesa/Tigo Pesa!
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Nginx Reverse Proxy & Domain SSL */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Nginx Reverse Proxy & Cheti cha Bure cha SSL (HTTPS via Let's Encrypt)</span>
            </h4>
            <p className="text-xs text-slate-600">
              Ili wateja wanaoingia kwenye Captive Portal wapate muonekano salama wa <strong>HTTPS (Kufuli ya Kijani)</strong> bila simu kuleta onyo la usalama:
            </p>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto space-y-2">
              <p className="text-slate-400"># 1. Weka Nginx na Certbot:</p>
              <p className="text-emerald-300">sudo apt install -y nginx certbot python3-certbot-nginx</p>
              <p className="text-slate-400 pt-2"># 2. Tengeneza cheti cha SSL cha bure kwa ajili ya Domain yako (mfano: wifi.kampuniyako.com):</p>
              <p className="text-emerald-300">sudo certbot --nginx -d wifi.kampuniyako.com</p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: INFRASTRUCTURE METRICS OVERVIEW */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* VPN Subnet */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>Central VPN Subnet</span>
                <Network className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                {status?.vpsSubnet || '100.108.0.0/18'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Gateway: <strong className="font-mono text-slate-800">{status?.vpsGatewayIp || '100.108.0.1'}</strong>
              </div>
            </div>

            {/* RADIUS CoA Port */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>RADIUS CoA Listener</span>
                <Radio className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                UDP: {status?.radiusPorts.coa || 3799}
              </div>
              <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Disconnect-Requests Active</span>
              </div>
            </div>

            {/* RADIUS AAA Ports */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>AAA Ports (Auth/Acct)</span>
                <Lock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                1812 / 1813
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Isolated to VPN subnet
              </div>
            </div>

            {/* Fleet Routers Linked */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                <span>NAS Router Clients</span>
                <Server className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono mt-2">
                {status?.registeredRouters || 2} Routers
              </div>
              <div className="text-[11px] text-indigo-600 font-medium mt-1">
                Auto-authorized via 100.108.0.0/18
              </div>
            </div>
          </div>

          {/* Architecture Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <span>High-Availability ISP Architecture</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every client MikroTik router establishes an encrypted WireGuard/OpenVPN tunnel into the Cloud VPS. The router is allocated a dedicated virtual IP inside <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-800">100.108.0.0/18</code>. FreeRADIUS connects directly over this private tunnel on port 1812/1813, while the Cloud VPS sends real-time disconnect requests (CoA) back to the router on port 3799 when vouchers expire or users are kicked.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Central FreeRADIUS 3.x</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  SQL driver query pool for radcheck and radreply with sub-second authentication latency.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Network className="w-4 h-4 text-emerald-600" />
                  <span>Carrier Tunnel Subnet</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Virtual 100.108.0.0/18 private network bypasses CGNAT and public dynamic IP issues on cellular modems.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>CoA Instant Disconnect</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Cloud VPS can disconnect or rate-limit active user sessions instantly via UDP port 3799.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: BASH SCRIPT */}
      {/* ===================================================================== */}
      {activeTab === 'bashScript' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                deploy/setup-vps.sh (Automated Provisioning Script)
              </h3>
              <p className="text-xs text-slate-500">
                Execute on any vanilla Ubuntu 22.04 LTS instance to deploy the entire production stack in ~3 minutes.
              </p>
            </div>
            <a
              href="/api/v1/devops/vps-script"
              download="setup-vps.sh"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </a>
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 text-slate-200 font-mono text-xs overflow-x-auto max-h-[500px]">
            <pre className="text-emerald-400">
{`# Run this on a fresh Ubuntu 22.04 LTS VPS (DigitalOcean, Hetzner, AWS, Linode):
curl -fsSL ${window.location.origin}/api/v1/devops/vps-script | sudo bash

# What setup-vps.sh executes automatically:
# 1. Installs Node.js 20 LTS, git, build-essential, ufw, nginx, certbot
# 2. Configures UFW firewall isolating RADIUS 1812/1813 & CoA 3799 to 100.108.0.0/18
# 3. Installs & initializes MySQL 8 database 'radius' & 'tzwifi_billing'
# 4. Configures FreeRADIUS 3.x with MySQL rlm_sql driver & clients.conf
# 5. Generates OpenVPN Easy-RSA 3 PKI, server certs, and tun 100.108.0.0/18
# 6. Sets up Nginx reverse proxy with SSL, WebSocket proxying, and SPA serving
# 7. Configures PM2 systemd daemon for automatic restarts on boot`}
            </pre>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: FREERADIUS */}
      {/* ===================================================================== */}
      {activeTab === 'freeradius' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">
            FreeRADIUS 3.x & CoA Architecture
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-xs text-slate-800">/etc/freeradius/3.0/clients.conf</span>
              <pre className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-800">
{`client vpn-fleet {
    ipaddr = 100.108.0.0/18
    secret = radius_secret_2026
    shortname = mikrotik-fleet
    nas_type = mikrotik
    require_message_authenticator = no
}`}
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-xs text-slate-800">CoA / Disconnect Listener (Port 3799)</span>
              <pre className="text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-slate-800">
{`server coa {
    listen {
        type = coa
        ipaddr = *
        port = 3799
    }
    recv-coa { ok }
    send-coa { ok }
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: OPENVPN */}
      {/* ===================================================================== */}
      {activeTab === 'openvpn' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">
            OpenVPN Fleet Routing (100.108.0.0/18)
          </h3>
          <p className="text-xs text-slate-600">
            OpenVPN creates a high-capacity virtual class B subnet allowing up to 16,382 concurrent MikroTik routers to connect securely to the billing controller.
          </p>

          <pre className="text-[11px] font-mono bg-slate-950 text-slate-200 p-4 rounded-2xl border border-slate-800">
{`port 1195
proto udp
dev tun
topology subnet
server 100.108.0.0 255.255.192.0
client-config-dir /etc/openvpn/ccd
client-to-client
cipher AES-256-GCM
auth SHA256`}
          </pre>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: SECURITY */}
      {/* ===================================================================== */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">
            Firewall Rules (UFW Port Hardening)
          </h3>
          <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Port / Protocol</th>
                <th className="p-3">Service</th>
                <th className="p-3">Allowed Origin</th>
                <th className="p-3">Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-mono font-bold">22/tcp</td>
                <td className="p-3">SSH Management</td>
                <td className="p-3">Anywhere</td>
                <td className="p-3 text-emerald-600 font-bold">ALLOW</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold">80/tcp, 443/tcp</td>
                <td className="p-3">Nginx HTTP/HTTPS</td>
                <td className="p-3">Anywhere (Public)</td>
                <td className="p-3 text-emerald-600 font-bold">ALLOW</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold">1195/udp</td>
                <td className="p-3">OpenVPN Server</td>
                <td className="p-3">Anywhere (Public Routers)</td>
                <td className="p-3 text-emerald-600 font-bold">ALLOW</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold">1812/udp, 1813/udp</td>
                <td className="p-3">FreeRADIUS Auth/Acct</td>
                <td className="p-3 font-mono text-indigo-700 font-bold">100.108.0.0/18 ONLY</td>
                <td className="p-3 text-emerald-600 font-bold">ISOLATED</td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-bold">3799/udp</td>
                <td className="p-3">FreeRADIUS CoA</td>
                <td className="p-3 font-mono text-indigo-700 font-bold">100.108.0.0/18 ONLY</td>
                <td className="p-3 text-emerald-600 font-bold">ISOLATED</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
