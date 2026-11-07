/**
 * Helper ya Kutengeneza Unique Captive Portal URL kwa kila Access Point (AP)
 * =========================================================================
 * Kila AP (TP-Link Omada, Ruijie, CPE, MikroTik) inakuwa na URL yake ya kipekee
 * inayobeba MAC Address ya AP hiyo, Router ID, Site ID, na Vendor tag.
 *
 * Mfano:
 * https://infotechwifi.com/?apMac=50:D4:F7:2A:B1:0C&routerId=102&siteId=Kariakoo-Hub&ap_vendor=omada
 * au:
 * https://infotechwifi.com/portal/ap/50D4F72AB10C
 */

export function normalizeMac(mac?: string): string {
  if (!mac) return '';
  const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  const pairs = clean.match(/.{1,2}/g);
  return pairs ? pairs.join(':') : clean;
}

export function cleanMacSlug(mac?: string): string {
  if (!mac) return '';
  return mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
}

export interface UniqueApPortalParams {
  routerId?: number | string | null;
  macAddress?: string | null;
  siteId?: string | null;
  vendor?: string | null;
  baseUrl?: string;
  usePathFormat?: boolean;
}

export function getUniqueApPortalUrl({
  routerId,
  macAddress,
  siteId,
  vendor = 'omada',
  baseUrl,
  usePathFormat = false,
}: UniqueApPortalParams): string {
  const effectiveBase = (
    baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'https://infotechwifi.com'
  ).replace(/\/+$/, '');

  const formattedMac = normalizeMac(macAddress || undefined);
  const cleanSlug = cleanMacSlug(macAddress || undefined);
  const effectiveVendor = (vendor || 'omada').toLowerCase().replace('tplink_', '');

  if (usePathFormat && cleanSlug) {
    const q = new URLSearchParams();
    if (routerId) q.set('routerId', String(routerId));
    if (siteId) q.set('siteId', String(siteId));
    if (effectiveVendor) q.set('ap_vendor', effectiveVendor);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return `${effectiveBase}/portal/ap/${cleanSlug}${qs}`;
  }

  const query = new URLSearchParams();
  if (formattedMac) {
    query.set('apMac', formattedMac);
  }
  if (routerId) {
    query.set('routerId', String(routerId));
  }
  if (siteId) {
    query.set('siteId', String(siteId));
  }
  if (effectiveVendor) {
    query.set('ap_vendor', effectiveVendor);
  }

  const qs = query.toString();
  return `${effectiveBase}/${qs ? `?${qs}` : ''}`;
}
