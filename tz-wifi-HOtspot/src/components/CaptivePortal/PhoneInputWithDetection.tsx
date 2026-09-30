import React, { useEffect, useState } from 'react';
import { NetworkProvider } from '../../types/index.ts';
import { CARRIERS, detectCarrierFromInput } from '../../utils/carrierInfo.ts';
import { Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (val: string) => void;
  selectedCarrier: NetworkProvider | null;
  onCarrierDetected: (carrier: NetworkProvider) => void;
  lang: 'sw' | 'en';
}

export const PhoneInputWithDetection: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  selectedCarrier,
  onCarrierDetected,
  lang,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Live prefix auto-detection
  useEffect(() => {
    if (value) {
      const detected = detectCarrierFromInput(value);
      if (detected && detected !== selectedCarrier) {
        onCarrierDetected(detected);
      }
    }
  }, [value, selectedCarrier, onCarrierDetected]);

  const cleanDigits = value.replace(/\D/g, '');
  const isValidLength = cleanDigits.length === 10 && cleanDigits.startsWith('0') ||
    cleanDigits.length === 12 && cleanDigits.startsWith('255') ||
    cleanDigits.length === 9 && (cleanDigits.startsWith('7') || cleanDigits.startsWith('6'));

  const activeCarrierInfo = selectedCarrier ? CARRIERS[selectedCarrier] : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-slate-500" />
          {lang === 'sw' ? 'Nambari ya Simu ya Malipo' : 'Mobile Money Phone Number'}
        </label>
        {activeCarrierInfo && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {activeCarrierInfo.name}
          </span>
        )}
      </div>

      <div
        className={`relative flex items-center rounded-xl border-2 transition-all bg-white overflow-hidden ${
          isFocused
            ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Country Code & Flag */}
        <div className="flex items-center gap-1.5 pl-3.5 pr-2 py-2.5 bg-slate-50 border-r border-slate-200 text-slate-700 font-semibold text-sm select-none">
          <span className="text-base leading-none">🇹🇿</span>
          <span>+255</span>
        </div>

        {/* Input */}
        <input
          type="tel"
          value={value}
          onChange={(e) => {
            // Allow numbers, spaces, plus
            const raw = e.target.value;
            onChange(raw);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={lang === 'sw' ? 'Weka namba ya simu...' : 'Enter phone number...'}
          className="flex-1 px-3 py-2.5 text-base sm:text-lg font-mono font-medium tracking-wide text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />

        {/* Dynamic Carrier Badge inside input right */}
        {activeCarrierInfo && (
          <div className="pr-3 pl-1">
            <span
              className="text-[10px] font-bold px-2 py-1 rounded text-white shadow-xs"
              style={{ backgroundColor: activeCarrierInfo.brandColor }}
            >
              {activeCarrierInfo.name}
            </span>
          </div>
        )}
      </div>

      {/* Validation feedback if incomplete */}
      {value.length > 3 && !isValidLength && (
        <div className="flex justify-end text-[11px] px-1">
          <span className="text-amber-600 flex items-center gap-1 font-medium">
            <AlertCircle className="w-3 h-3" />
            {cleanDigits.length}/10 {lang === 'sw' ? 'tarakimu' : 'digits'}
          </span>
        </div>
      )}
    </div>
  );
};
