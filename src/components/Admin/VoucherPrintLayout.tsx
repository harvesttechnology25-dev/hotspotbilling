import React, { useState, useEffect } from 'react';
import { Voucher, Plan } from '../../types/index.ts';
import { formatTzs } from '../../utils/carrierInfo.ts';
import { generateQrCodeUrl } from '../../utils/qrHelper.ts';
import {
  Printer,
  X,
  Scissors,
  Wifi,
  QrCode,
  Sparkles,
  FileText,
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';

interface VoucherPrintLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: Voucher[];
  plan?: Plan;
  batchId?: string;
  hotspotName?: string;
  portalUrl?: string;
}

export const VoucherPrintLayout: React.FC<VoucherPrintLayoutProps> = ({
  isOpen,
  onClose,
  vouchers,
  plan,
  batchId,
  hotspotName = 'INFOTECH WiFi HIGH-SPEED',
  portalUrl = 'http://192.168.88.1/login',
}) => {
  const [printFormat, setPrintFormat] = useState<'A4_GRID' | 'THERMAL_58MM' | 'THERMAL_80MM'>('A4_GRID');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [showQr, setShowQr] = useState(true);

  // Pre-generate QR codes for fast display & instant printing
  useEffect(() => {
    if (!isOpen || vouchers.length === 0) return;

    let isMounted = true;
    const generateAllQrs = async () => {
      const qrs: Record<string, string> = {};
      for (const v of vouchers.slice(0, 100)) {
        const loginUrl = `${portalUrl}?username=${encodeURIComponent(v.code)}&password=${encodeURIComponent(v.password || v.code)}`;
        try {
          qrs[v.code] = await generateQrCodeUrl(loginUrl);
        } catch (e) {
          // ignore
        }
      }
      if (isMounted) {
        setQrMap(qrs);
      }
    };

    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [isOpen, vouchers, portalUrl]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('printing-vouchers');
    } else {
      document.body.classList.remove('printing-vouchers');
    }
    return () => {
      document.body.classList.remove('printing-vouchers');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerPrint = () => {
    try {
      const printableElement = document.getElementById('voucher-printable-area');
      if (printableElement) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
          const contentHtml = printableElement.innerHTML;
          iframeDoc.open();
          iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <title>Vouchers - ${hotspotName}</title>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { margin: 4mm; size: auto; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #000000; margin: 0; padding: 4px; }
    .tear-card { break-inside: avoid; page-break-inside: avoid; }
    .voucher-page { margin: 0 auto; }
  </style>
</head>
<body class="bg-white">
  ${contentHtml}
</body>
</html>`);
          iframeDoc.close();

          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              try {
                document.body.removeChild(iframe);
              } catch (e) {
                // ignore
              }
            }, 1000);
          }, 350);
          return;
        }
      }
    } catch (e) {
      console.warn('Iframe print fallback to window.print', e);
    }
    window.print();
  };

  const voucherPlan = plan || vouchers[0]?.plan;

  return (
    <div id="voucher-print-modal" className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:z-auto print:backdrop-blur-none">
      {/* Container Card */}
      <div id="voucher-print-dialog" className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Hidden during actual print) */}
        <div id="voucher-print-controls" className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Voucher Print Station & Layout Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold font-mono">
                  {vouchers.length} Vouchers
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Batch: {batchId || 'Ad-Hoc Selection'} • Plan: {voucherPlan?.name || 'Standard'}
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Format Toggle Buttons */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-700">
              <button
                type="button"
                onClick={() => setPrintFormat('A4_GRID')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printFormat === 'A4_GRID'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                📄 A4 Tear-Off Grid
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('THERMAL_58MM')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printFormat === 'THERMAL_58MM'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                🧾 Thermal (58mm)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('THERMAL_80MM')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  printFormat === 'THERMAL_80MM'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                🧾 POS (80mm)
              </button>
            </div>

            {/* Toggle QR */}
            <button
              type="button"
              onClick={() => setShowQr(!showQr)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              {showQr ? '✓ QR Enabled' : 'No QR'}
            </button>

            {/* Print Trigger Button */}
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now (Ctrl+P)</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area with CSS @media print */}
        <div id="voucher-printable-area" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 print:bg-white print:p-0 print:overflow-visible">
          {/* Inject Dedicated Print Style Sheet */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              header, nav, footer, .print\\:hidden {
                display: none !important;
              }
              .voucher-page {
                page-break-after: always;
                margin: 0 !important;
                padding: 0 !important;
              }
              .tear-card {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          `}} />

          {/* 1. A4 GRID SHEET LAYOUT */}
          {printFormat === 'A4_GRID' && (
            <div className="voucher-page max-w-[210mm] mx-auto bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-2">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 print:grid-cols-2 print:gap-3">
                {vouchers.map((voucher, index) => {
                  const qr = qrMap[voucher.code];
                  return (
                    <div
                      key={voucher.id || index}
                      className="tear-card relative rounded-2xl border-2 border-dashed border-slate-400 bg-white p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs print:border-slate-800 print:shadow-none"
                    >
                      {/* Scissor icon along dashed line */}
                      <div className="absolute -top-2.5 -right-2 text-slate-500 bg-white px-1">
                        <Scissors className="w-3.5 h-3.5 rotate-90" />
                      </div>

                      {/* Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs print:bg-black">
                            <Wifi className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-black text-xs text-slate-900 tracking-tight">
                              {hotspotName}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono">
                              High-Speed Wi-Fi Hotspot
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-indigo-700 font-mono print:text-black">
                            {formatTzs(voucherPlan?.price || 1000)}
                          </div>
                          <div className="text-[9px] text-slate-500 font-medium truncate max-w-[100px]">
                            {voucherPlan?.name.split('(')[0] || 'Standard Plan'}
                          </div>
                        </div>
                      </div>

                      {/* Code Center Section */}
                      <div className="my-2.5 flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 print:bg-slate-100 print:border-slate-400">
                        <div className="flex-1">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            VOUCHER PIN / CODE:
                          </div>
                          <div className="font-mono text-xl sm:text-2xl font-black tracking-widest text-slate-900 select-all">
                            {voucher.code}
                          </div>
                          {voucher.password && voucher.password !== voucher.code && (
                            <div className="text-[10px] text-slate-600 font-mono">
                              Pass: <strong>{voucher.password}</strong>
                            </div>
                          )}
                        </div>

                        {showQr && qr && (
                          <div className="shrink-0 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                            <img src={qr} alt="QR Login" className="w-14 h-14" />
                          </div>
                        )}
                      </div>

                      {/* Footer instructions */}
                      <div className="flex items-center justify-between text-[8px] text-slate-500 pt-1 border-t border-slate-100">
                        <span>1. Unganisha Wi-Fi</span>
                        <span>2. Weka PIN</span>
                        <span className="text-[8px] text-slate-400 font-sans">Powered by <strong>INFOTECH WiFi</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. THERMAL POS 58MM SLIP LAYOUT */}
          {printFormat === 'THERMAL_58MM' && (
            <div className="voucher-page max-w-[58mm] mx-auto bg-white p-2 rounded-xl border border-slate-300 font-mono text-[10px] text-slate-900 print:border-none print:p-0">
              {vouchers.map((voucher, index) => {
                const qr = qrMap[voucher.code];
                return (
                  <div
                    key={voucher.id || index}
                    className="tear-card py-3 border-b-2 border-dashed border-slate-400 text-center space-y-1.5 print:border-black"
                  >
                    <div className="font-black text-xs uppercase tracking-tight">
                      {hotspotName}
                    </div>
                    <div className="text-[9px] text-slate-600">
                      High-Speed Wi-Fi Hotspot
                    </div>
                    <div className="border-t border-b border-black py-1 my-1">
                      <div className="text-[9px] uppercase font-bold text-slate-600">
                        {voucherPlan?.name || 'Wi-Fi Access'}
                      </div>
                      <div className="text-sm font-black">
                        {formatTzs(voucherPlan?.price || 1000)}
                      </div>
                    </div>

                    <div className="py-1">
                      <div className="text-[8px] uppercase tracking-wider text-slate-500">
                        HOTSPOT VOUCHER PIN
                      </div>
                      <div className="text-lg font-black tracking-widest my-0.5">
                        {voucher.code}
                      </div>
                    </div>

                    {showQr && qr && (
                      <div className="flex justify-center my-1">
                        <img src={qr} alt="Login QR" className="w-24 h-24 mx-auto" />
                      </div>
                    )}

                    <div className="text-[8px] leading-tight text-slate-600">
                      Scan QR au unganisha Wi-Fi na weka PIN hapo juu.
                    </div>
                    <div className="text-[7px] text-slate-400 pt-0.5">
                      Powered by INFOTECH WiFi • Ref: {batchId || voucher.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. THERMAL POS 80MM RECEIPT LAYOUT */}
          {printFormat === 'THERMAL_80MM' && (
            <div className="voucher-page max-w-[80mm] mx-auto bg-white p-3 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-900 print:border-none print:p-0">
              {vouchers.map((voucher, index) => {
                const qr = qrMap[voucher.code];
                return (
                  <div
                    key={voucher.id || index}
                    className="tear-card py-4 border-b-2 border-dashed border-slate-500 text-center space-y-2 print:border-black"
                  >
                    <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                      <Wifi className="w-4 h-4" />
                      <span>{hotspotName}</span>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      MikroTik Multi-Carrier Wireless Hotspot
                    </div>

                    <div className="bg-slate-100 border border-slate-300 py-1.5 px-2 rounded-lg my-1 print:bg-white print:border-black">
                      <div className="text-[10px] font-bold">
                        {voucherPlan?.name || 'Wi-Fi Internet Plan'}
                      </div>
                      <div className="text-base font-black">
                        {formatTzs(voucherPlan?.price || 1000)}
                      </div>
                    </div>

                    <div className="py-1">
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-slate-600">
                        VOUCHER USERNAME / PIN:
                      </div>
                      <div className="text-2xl font-black tracking-widest my-1 select-all">
                        {voucher.code}
                      </div>
                    </div>

                    {showQr && qr && (
                      <div className="flex flex-col items-center justify-center my-1.5">
                        <img src={qr} alt="Auto Login QR" className="w-28 h-28 mx-auto border border-slate-300 p-1 rounded" />
                        <span className="text-[8px] text-slate-500 mt-1">Scan for 1-Tap Auto Login</span>
                      </div>
                    )}

                    <div className="text-[9px] text-slate-600 leading-normal border-t border-slate-200 pt-1">
                      SSID: <strong>TZ-WIFI-HOTSPOT</strong> • Rate: <strong>{voucherPlan?.rate_limit || '3M/6M'}</strong>
                      <br />
                      Support: +255 754 000 111
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
