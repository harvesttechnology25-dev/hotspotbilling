import React, { useEffect, useState } from 'react';
import { Plan } from '../../types/index.ts';
import { formatSecondsToTime, formatBytes } from '../../utils/carrierInfo.ts';
import { Wifi, Clock, Activity, LogOut, ShieldCheck, Smartphone } from 'lucide-react';

interface ActiveSessionCardProps {
  voucherCode: string;
  plan: Plan;
  onDisconnect: () => void;
  lang: 'sw' | 'en';
}

export const ActiveSessionCard: React.FC<ActiveSessionCardProps> = ({
  voucherCode,
  plan,
  onDisconnect,
  lang,
}) => {
  const [uptimeSeconds, setUptimeSeconds] = useState(120);
  const [bytesUsed, setBytesUsed] = useState(48200100); // ~46MB

  // Simulate live session incrementation
  useEffect(() => {
    const timer = setInterval(() => {
      setUptimeSeconds((s) => s + 1);
      setBytesUsed((b) => b + Math.floor(Math.random() * 50000) + 10000);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const totalLimit = plan.limit_uptime || plan.validity_period || 86400;
  const remainingSeconds = Math.max(totalLimit - uptimeSeconds, 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-lg">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                {lang === 'sw' ? 'Imeunganishwa Mtandaoni' : 'Connected & Active'}
              </span>
            </div>
            <h3 className="font-extrabold text-lg text-white">
              {plan.name.split('(')[0]}
            </h3>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono bg-white/15 px-2.5 py-1 rounded-full text-white">
            {plan.rate_limit}
          </span>
        </div>
      </div>

      {/* Stats Body */}
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {/* Remaining Time */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>{lang === 'sw' ? 'Muda Uliobaki' : 'Time Left'}</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">
              {formatSecondsToTime(remainingSeconds)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'sw' ? 'Umeunganishwa kwa' : 'Active for'} {formatSecondsToTime(uptimeSeconds)}
            </div>
          </div>

          {/* Data Used */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              <Activity className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang === 'sw' ? 'Data Iliyotumika' : 'Data Used'}</span>
            </div>
            <div className="text-lg font-black text-slate-900 font-mono">
              {formatBytes(bytesUsed)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {plan.limit_bytes_total ? formatBytes(plan.limit_bytes_total) : 'Unlimited'}
            </div>
          </div>
        </div>

        {/* Voucher & Device Details */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium text-slate-500">{lang === 'sw' ? 'Akaunti / Vocha:' : 'Voucher Account:'}</span>
            <span className="font-mono font-bold text-slate-900">{voucherCode}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium text-slate-500">{lang === 'sw' ? 'Anwani ya IP:' : 'IP Address:'}</span>
            <span className="font-mono text-slate-700">192.168.88.24</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium text-slate-500">MAC Address:</span>
            <span className="font-mono text-slate-700">BC:D0:74:11:2E:8A</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span className="font-medium text-slate-500">RouterOS Gateway:</span>
            <span className="font-semibold text-emerald-700">Mikrotik-Main-Dar</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onDisconnect}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'sw' ? 'Ondoka Kwenye Mtandao (Disconnect)' : 'Disconnect Session'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
