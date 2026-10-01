import React, { useEffect, useState } from 'react';
import { Database, Copy, Check, Download, Layers, ShieldCheck, Key } from 'lucide-react';

export const MySQLSchemaViewer: React.FC = () => {
  const [sqlContent, setSqlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/v1/system/schema')
      .then((res) => res.text())
      .then((text) => setSqlContent(text))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">
              MySQL Relational Schema & DDL Scripts
            </h2>
            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
              MySQL 8.0+ / MariaDB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Production database definition with foreign keys, indexes, triggers, and audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied SQL' : 'Copy DDL'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .sql</span>
          </button>
        </div>
      </div>

      {/* Relational Entity Architecture Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase mb-1">
            <Layers className="w-4 h-4" />
            <span>routers</span>
          </div>
          <p className="text-[11px] text-slate-500">
            MikroTik API hardware endpoints, IP addresses, credentials, and locations.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase mb-1">
            <Layers className="w-4 h-4" />
            <span>plans</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Time-based and data-capped packages, rate-limits (e.g. 2M/5M), validity windows, prices in TZS.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>transactions</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Multi-carrier payments (Vodacom, Tigo, Airtel, Halotel), status, external reference, carrier IDs.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase mb-1">
            <Key className="w-4 h-4" />
            <span>vouchers</span>
          </div>
          <p className="text-[11px] text-slate-500">
            High-entropy credentials provisioned directly into MikroTik <code>/ip/hotspot/user</code>.
          </p>
        </div>
      </div>

      {/* SQL Script Viewer */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <Database className="w-4 h-4 text-indigo-400" />
            <span>schema.sql</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            UTF-8 • utf8mb4_unicode_ci
          </span>
        </div>

        <div className="p-4 overflow-auto max-h-[500px]">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all">
            {loading ? 'Loading schema script...' : sqlContent}
          </pre>
        </div>
      </div>
    </div>
  );
};
