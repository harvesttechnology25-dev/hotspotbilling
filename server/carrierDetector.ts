import { NetworkProvider, CarrierDetectionResult } from './types.js';

/**
 * Tanzanian Mobile Operator Carrier Prefix Database
 * Covers all licensed Mobile Network Operators (MNOs) under TCRA.
 */
interface CarrierInfo {
  provider: NetworkProvider;
  brandName: string;
  shortCode: string;
  brandColor: string;
  prefixes: string[]; // 3-digit local prefixes without country code e.g. "075", "074"
}

export const TANZANIA_CARRIERS: Record<NetworkProvider, CarrierInfo> = {
  VODACOM: {
    provider: 'VODACOM',
    brandName: 'Vodacom M-Pesa',
    shortCode: 'M-PESA',
    brandColor: '#E60000',
    prefixes: ['074', '075', '076'],
  },
  TIGO: {
    provider: 'TIGO',
    brandName: 'Tigo Pesa (Mixx by Yas)',
    shortCode: 'TIGO-PESA',
    brandColor: '#00377B',
    prefixes: ['071', '065', '067', '077'],
  },
  AIRTEL: {
    provider: 'AIRTEL',
    brandName: 'Airtel Money',
    shortCode: 'AIRTEL-MONEY',
    brandColor: '#FF0000',
    prefixes: ['078', '068', '069'],
  },
  HALOTEL: {
    provider: 'HALOTEL',
    brandName: 'Halopesa (Halotel)',
    shortCode: 'HALOPESA',
    brandColor: '#FF6600',
    prefixes: ['062', '061'],
  },
};

/**
 * Normalizes input phone string to:
 * - Local 10-digit format: "0754123456"
 * - International MSISDN: "255754123456"
 */
export function normalizePhoneNumber(rawPhone: string): {
  clean: string;
  local10: string;
  msisdn255: string;
} {
  // Strip non-numeric characters except leading +
  let cleaned = rawPhone.trim().replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+255')) {
    cleaned = cleaned.substring(1); // remove + -> 255...
  }

  let local10 = '';
  let msisdn255 = '';

  if (cleaned.startsWith('255')) {
    msisdn255 = cleaned;
    local10 = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0')) {
    local10 = cleaned;
    msisdn255 = '255' + cleaned.substring(1);
  } else if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('6'))) {
    local10 = '0' + cleaned;
    msisdn255 = '255' + cleaned;
  } else {
    local10 = cleaned;
    msisdn255 = cleaned;
  }

  return { clean: cleaned, local10, msisdn255 };
}

/**
 * Detects the Tanzanian Telco carrier from a phone number prefix.
 * Supports partial inputs (as the user types 075... or 25575...) as well as full 10/12-digit numbers.
 */
export function detectCarrier(rawPhone: string): CarrierDetectionResult {
  const { local10, msisdn255 } = normalizePhoneNumber(rawPhone);

  if (!local10 || local10.length < 3) {
    return {
      provider: null,
      normalized: msisdn255,
      valid: false,
      formatted: rawPhone,
      brandName: '',
      shortCode: '',
    };
  }

  const prefix3 = local10.substring(0, 3);

  let detectedProvider: NetworkProvider | null = null;
  let detectedInfo: CarrierInfo | null = null;

  for (const [providerKey, info] of Object.entries(TANZANIA_CARRIERS) as [NetworkProvider, CarrierInfo][]) {
    if (info.prefixes.includes(prefix3)) {
      detectedProvider = providerKey;
      detectedInfo = info;
      break;
    }
  }

  const isValidLength = local10.length === 10 && /^[0-9]+$/.test(local10);
  const isValid = Boolean(detectedProvider && isValidLength);

  // Friendly formatted presentation: e.g. "0754 123 456"
  let formatted = local10;
  if (local10.length >= 4) {
    formatted = `${local10.slice(0, 4)} ${local10.slice(4, 7)} ${local10.slice(7, 10)}`.trim();
  }

  return {
    provider: detectedProvider,
    normalized: msisdn255,
    valid: isValid,
    formatted,
    brandName: detectedInfo ? detectedInfo.brandName : '',
    shortCode: detectedInfo ? detectedInfo.shortCode : '',
  };
}
