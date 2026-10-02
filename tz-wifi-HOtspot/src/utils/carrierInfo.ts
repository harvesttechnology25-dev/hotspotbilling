import { NetworkProvider, CarrierBadgeInfo } from '../types/index.ts';

export const CARRIERS: Record<NetworkProvider, CarrierBadgeInfo> = {
  VODACOM: {
    provider: 'VODACOM',
    name: 'M-Pesa',
    subText: 'Vodacom Tanzania',
    brandColor: '#E60000',
    bgColor: 'bg-red-50 hover:bg-red-100 text-red-950',
    borderColor: 'border-red-500',
    textColor: 'text-red-600',
    prefixes: ['074', '075', '076'],
  },
  TIGO: {
    provider: 'TIGO',
    name: 'Tigo Pesa',
    subText: 'Mixx by Yas / Tigo',
    brandColor: '#00377B',
    bgColor: 'bg-blue-50 hover:bg-blue-100 text-blue-950',
    borderColor: 'border-blue-600',
    textColor: 'text-blue-700',
    prefixes: ['071', '065', '067', '077'],
  },
  AIRTEL: {
    provider: 'AIRTEL',
    name: 'Airtel Money',
    subText: 'Airtel Tanzania',
    brandColor: '#DC2626',
    bgColor: 'bg-rose-50 hover:bg-rose-100 text-rose-950',
    borderColor: 'border-rose-600',
    textColor: 'text-rose-600',
    prefixes: ['078', '068', '069'],
  },
  HALOTEL: {
    provider: 'HALOTEL',
    name: 'Halopesa',
    subText: 'Halotel Tanzania',
    brandColor: '#EA580C',
    bgColor: 'bg-orange-50 hover:bg-orange-100 text-orange-950',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-600',
    prefixes: ['062', '061'],
  },
};

export function detectCarrierFromInput(input: string): NetworkProvider | null {
  const digits = input.replace(/\D/g, '');
  let localPrefix = '';

  if (digits.startsWith('255') && digits.length >= 5) {
    localPrefix = '0' + digits.slice(3, 5);
  } else if (digits.startsWith('0') && digits.length >= 3) {
    localPrefix = digits.slice(0, 3);
  } else if ((digits.startsWith('7') || digits.startsWith('6')) && digits.length >= 2) {
    localPrefix = '0' + digits.slice(0, 2);
  }

  for (const [provider, info] of Object.entries(CARRIERS) as [NetworkProvider, CarrierBadgeInfo][]) {
    if (info.prefixes.some((p) => localPrefix.startsWith(p) || p.startsWith(localPrefix))) {
      return provider;
    }
  }

  return null;
}

export function formatTzs(amount: number): string {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    maximumFractionDigits: 0,
  }).format(amount).replace('TZS', 'TZS ');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatSecondsToTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  return parts.join(' ');
}
