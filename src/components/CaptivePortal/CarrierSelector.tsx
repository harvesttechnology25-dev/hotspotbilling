import React from 'react';
import { CARRIERS } from '../../utils/carrierInfo.ts';
import { NetworkProvider } from '../../types/index.ts';
import { Check } from 'lucide-react';

interface CarrierSelectorProps {
  selected: NetworkProvider | null;
  onSelect: (provider: NetworkProvider) => void;
  lang: 'sw' | 'en';
}

export const CarrierSelector: React.FC<CarrierSelectorProps> = ({
  selected,
  onSelect,
  lang,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          {lang === 'sw' ? 'Chagua Mtandao wa Malipo' : 'Select Payment Carrier'}
        </label>
        <span className="text-[11px] text-slate-600 font-medium">
          {lang === 'sw' ? 'Inatambua kiotomatiki' : 'Auto-detected by prefix'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(Object.keys(CARRIERS) as NetworkProvider[]).map((key) => {
          const carrier = CARRIERS[key];
          const isSelected = selected === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-150 text-left ${
                isSelected
                  ? `${carrier.borderColor} bg-white shadow-md ring-2 ring-offset-1 ring-slate-400`
                  : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
              }`}
            >
              {isSelected && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: carrier.brandColor }}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}

              {/* Carrier Pill Brand */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-inner mb-1.5"
                style={{ backgroundColor: carrier.brandColor }}
              >
                {key === 'VODACOM' && 'M-P'}
                {key === 'TIGO' && 'TIGO'}
                {key === 'AIRTEL' && 'AIR'}
                {key === 'HALOTEL' && 'HALO'}
              </div>

              <span className="text-xs font-bold text-slate-800 leading-tight text-center truncate max-w-full">
                {carrier.name}
              </span>
              <span className="text-[10px] text-slate-600 mt-0.5 font-mono text-center break-words max-w-full">
                {carrier.prefixes.map((p) => p + 'x').join(', ')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
