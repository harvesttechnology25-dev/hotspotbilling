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

export function isInsufficientBalance(msg?: string, code?: string | number): boolean {
  if (!msg && !code) return false;
  const combined = `${msg || ''} ${code || ''}`.toLowerCase();
  return (
    combined.includes('insufficient') ||
    combined.includes('salio') ||
    combined.includes('halitoshi') ||
    combined.includes('not enough') ||
    combined.includes('low balance') ||
    combined.includes('low_balance') ||
    combined.includes('not_enough') ||
    combined.includes('haina salio') ||
    combined.includes('hakuna salio') ||
    combined.includes('collection.failed') ||
    combined.includes('collection_failed') ||
    combined.includes('1001') ||
    combined.includes('1006') ||
    (combined.includes('balance') && (combined.includes('low') || combined.includes('exceed') || combined.includes('not')))
  );
}

export function isUserCancelled(msg?: string, code?: string | number): boolean {
  if (!msg && !code) return false;
  const combined = `${msg || ''} ${code || ''}`.toLowerCase();
  return (
    combined.includes('cancel') ||
    combined.includes('kataa') ||
    combined.includes('ghairi') ||
    combined.includes('reject') ||
    combined.includes('denied') ||
    combined.includes('declined') ||
    combined.includes('user_cancel') ||
    combined.includes('user cancelled') ||
    combined.includes('subscriber_cancel') ||
    combined.includes('1002') ||
    combined.includes('1003')
  );
}

export function isTimedOut(msg?: string, code?: string | number): boolean {
  if (!msg && !code) return false;
  const combined = `${msg || ''} ${code || ''}`.toLowerCase();
  return (
    combined.includes('timeout') ||
    combined.includes('muda') ||
    combined.includes('expire') ||
    combined.includes('time out') ||
    combined.includes('time_out') ||
    combined.includes('1004') ||
    combined.includes('1005')
  );
}

export function isWrongPin(msg?: string, code?: string | number): boolean {
  if (!msg && !code) return false;
  const combined = `${msg || ''} ${code || ''}`.toLowerCase();
  return (
    combined.includes('wrong pin') ||
    combined.includes('invalid pin') ||
    combined.includes('pin error') ||
    combined.includes('incorrect pin')
  );
}

export interface TransactionReasonInfo {
  title: string;
  subtitle: string;
  shortBadge: string;
  type: 'success' | 'pending' | 'insufficient' | 'cancelled' | 'timeout' | 'wrong_pin' | 'other';
}

export function getTransactionReasonDetails(
  reason?: string,
  status?: string
): TransactionReasonInfo {
  const normStatus = (status || '').toUpperCase();

  if (normStatus === 'SUCCESS') {
    return {
      title: 'Malipo Yamethibitishwa (Paid & Verified)',
      subtitle: 'Muamala umekamilika kikamilifu na vocha imetolewa.',
      shortBadge: 'Imelipwa (Paid)',
      type: 'success',
    };
  }

  if (normStatus === 'PENDING') {
    return {
      title: 'Inasubiri PIN ya Mteja (Waiting for STK Push)',
      subtitle: 'Ombi la STK Push limetumwa kwenye simu ya mteja kusubiri namba ya siri.',
      shortBadge: 'Inasubiri PIN',
      type: 'pending',
    };
  }

  // FAILED state
  if (isInsufficientBalance(reason)) {
    return {
      title: 'Salio Halitoshi (Insufficient Funds)',
      subtitle: 'Mteja hana salio la kutosha kwenye akaunti yake ya simu.',
      shortBadge: 'Salio Halitoshi',
      type: 'insufficient',
    };
  }

  if (isUserCancelled(reason)) {
    return {
      title: 'Mteja Alighairi / Alikataa STK Push',
      subtitle: 'Mteja amecancel au amekataa kuingiza namba ya siri kwenye simu yake.',
      shortBadge: 'Alighairi STK Push',
      type: 'cancelled',
    };
  }

  if (isTimedOut(reason)) {
    return {
      title: 'Muda wa STK Push Umekwisha (Timeout)',
      subtitle: 'Muda wa kuingiza PIN ya malipo kwenye simu umekwisha kabla ya kujibiwa.',
      shortBadge: 'Muda Umekwisha',
      type: 'timeout',
    };
  }

  if (isWrongPin(reason)) {
    return {
      title: 'Namba ya Siri (PIN) Si Sahihi',
      subtitle: 'Mteja aliweka PIN isiyo sahihi kwenye ombi la malipo.',
      shortBadge: 'PIN Si Sahihi',
      type: 'wrong_pin',
    };
  }

  const cleanReason = (reason || '')
    .replace(/^Event:\s*/i, '')
    .replace(/collection\.failed/gi, 'Salio halitoshi au muamala ulikataliwa')
    .trim();

  return {
    title: cleanReason || 'Malipo Hayakukamilika',
    subtitle: cleanReason || 'Mtandao haukukamilisha muamala wa mteja.',
    shortBadge: cleanReason ? (cleanReason.length > 20 ? cleanReason.slice(0, 18) + '...' : cleanReason) : 'Imefeli',
    type: 'other',
  };
}

