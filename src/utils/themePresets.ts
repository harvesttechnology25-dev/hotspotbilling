import { PortalThemeConfig } from '../types/index.ts';

export const DEFAULT_PORTAL_THEME: PortalThemeConfig = {
  themeId: 'emerald',
  themeName: 'Kijani Safi (Modern Emerald)',
  primaryColor: '#059669', // emerald-600
  accentColor: '#10b981', // emerald-500
  backgroundColor: '#f8fafc', // slate-50
  textColor: '#0f172a', // slate-900
  cardStyle: 'modern_rounded',
  cardRadius: 'medium',
  cardBgColor: '#ffffff',
  cardBorderColor: '#e2e8f0',
  cardBorderThickness: 'medium',
  cardActiveBgColor: '#f0fdf4',
  cardActiveBorderColor: '#059669',
  cardShadow: 'md',
  cardTextColor: '#0f172a',
  priceTagColor: '#0f172a',
  brandName: 'Kariakoo Fast Wi-Fi',
  tagline: 'Mtandao wa Kasi ya Juu | Malipo ya Simu Papo Hapo',
  supportPhone: '+255 754 000 111',
  logoIcon: 'wifi',
  badgeText: 'HOTSPOT YA UHAKIKA',
  welcomeMessageSw: 'Karibu kwenye Mtandao Wetu wa Hotspot! Chagua kifurushi hapa chini na ulipie kwa simu yako upate intaneti ya kasi ya haraka papo hapo.',
  welcomeMessageEn: 'Welcome to our high-speed Hotspot! Select a package below and pay with mobile money for instant internet access.',
  showCarrierLogos: true,
  showSupportBadge: true,
  headerStyle: 'standard',
};

export const THEME_PRESETS: PortalThemeConfig[] = [
  {
    themeId: 'emerald',
    themeName: 'Kijani Safi (Modern Emerald)',
    primaryColor: '#059669',
    accentColor: '#10b981',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    cardStyle: 'modern_rounded',
    cardRadius: 'medium',
    cardBgColor: '#ffffff',
    cardBorderColor: '#e2e8f0',
    cardBorderThickness: 'medium',
    cardActiveBgColor: '#f0fdf4',
    cardActiveBorderColor: '#059669',
    cardShadow: 'md',
    cardTextColor: '#0f172a',
    priceTagColor: '#059669',
    logoIcon: 'wifi',
    badgeText: 'HOTSPOT YA UHAKIKA',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'standard',
  },
  {
    themeId: 'midnight',
    themeName: 'Giza la Usiku (Midnight Cyber OLED)',
    primaryColor: '#06b6d4',
    accentColor: '#3b82f6',
    backgroundColor: '#0a0f1d',
    textColor: '#f1f5f9',
    cardStyle: 'glassmorphism',
    cardRadius: 'rounded',
    cardBgColor: 'rgba(15, 23, 42, 0.75)',
    cardBorderColor: 'rgba(51, 65, 85, 0.7)',
    cardBorderThickness: 'thin',
    cardActiveBgColor: 'rgba(6, 182, 212, 0.12)',
    cardActiveBorderColor: '#06b6d4',
    cardShadow: 'colored',
    cardTextColor: '#f8fafc',
    priceTagColor: '#38bdf8',
    logoIcon: 'zap',
    badgeText: 'CYBER ULTRA-SPEED',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'gradient_banner',
  },
  {
    themeId: 'royal_indigo',
    themeName: 'Bluu ya Kifalme (Royal Indigo)',
    primaryColor: '#4f46e5',
    accentColor: '#6366f1',
    backgroundColor: '#f4f6fd',
    textColor: '#1e1b4b',
    cardStyle: 'modern_rounded',
    cardRadius: 'rounded',
    cardBgColor: '#ffffff',
    cardBorderColor: '#e0e7ff',
    cardBorderThickness: 'medium',
    cardActiveBgColor: '#eef2ff',
    cardActiveBorderColor: '#4f46e5',
    cardShadow: 'md',
    cardTextColor: '#1e1b4b',
    priceTagColor: '#4f46e5',
    logoIcon: 'radio',
    badgeText: 'ENTERPRISE HOTSPOT',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'standard',
  },
  {
    themeId: 'sunset_amber',
    themeName: 'Jua la Machweo (Sunset Amber Gold)',
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    textColor: '#451a03',
    cardStyle: 'modern_rounded',
    cardRadius: 'medium',
    cardBgColor: '#ffffff',
    cardBorderColor: '#fde68a',
    cardBorderThickness: 'medium',
    cardActiveBgColor: '#fef3c7',
    cardActiveBorderColor: '#d97706',
    cardShadow: 'md',
    cardTextColor: '#451a03',
    priceTagColor: '#b45309',
    logoIcon: 'flame',
    badgeText: 'MTANDAO WA KASI',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'centered',
  },
  {
    themeId: 'crimson_rose',
    themeName: 'Nyekundu ya Kifahari (Crimson Rose)',
    primaryColor: '#e11d48',
    accentColor: '#f43f5e',
    backgroundColor: '#fff1f2',
    textColor: '#881337',
    cardStyle: 'modern_rounded',
    cardRadius: 'extra',
    cardBgColor: '#ffffff',
    cardBorderColor: '#fecdd3',
    cardBorderThickness: 'medium',
    cardActiveBgColor: '#ffe4e6',
    cardActiveBorderColor: '#e11d48',
    cardShadow: 'md',
    cardTextColor: '#881337',
    priceTagColor: '#be123c',
    logoIcon: 'sparkles',
    badgeText: 'PREMIUM ZONE',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'centered',
  },
  {
    themeId: 'neo_brutalist',
    themeName: 'Mstari Mkali (Neo-Brutalist 3D)',
    primaryColor: '#000000',
    accentColor: '#10b981',
    backgroundColor: '#fefce8', // warm punchy yellow tint
    textColor: '#000000',
    cardStyle: 'neo_brutalist',
    cardRadius: 'sharp',
    cardBgColor: '#ffffff',
    cardBorderColor: '#000000',
    cardBorderThickness: 'thick',
    cardActiveBgColor: '#dcfce7',
    cardActiveBorderColor: '#000000',
    cardShadow: 'brutal',
    cardTextColor: '#000000',
    priceTagColor: '#000000',
    logoIcon: 'rocket',
    badgeText: 'POPULAR CHOICE',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'standard',
  },
  {
    themeId: 'glassmorphism',
    themeName: 'Kioo chenye Ukungu (Frosted Glass)',
    primaryColor: '#8b5cf6',
    accentColor: '#a855f7',
    backgroundColor: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
    textColor: '#ffffff',
    cardStyle: 'glassmorphism',
    cardRadius: 'extra',
    cardBgColor: 'rgba(255, 255, 255, 0.12)',
    cardBorderColor: 'rgba(255, 255, 255, 0.22)',
    cardBorderThickness: 'thin',
    cardActiveBgColor: 'rgba(255, 255, 255, 0.26)',
    cardActiveBorderColor: '#c084fc',
    cardShadow: 'lg',
    cardTextColor: '#ffffff',
    priceTagColor: '#e9d5ff',
    logoIcon: 'sparkles',
    badgeText: 'FROSTED VIP',
    showCarrierLogos: true,
    showSupportBadge: true,
    headerStyle: 'compact',
  },
];

export function getCardRadiusClass(radius?: string): string {
  switch (radius) {
    case 'sharp':
      return 'rounded-md';
    case 'medium':
      return 'rounded-xl';
    case 'extra':
      return 'rounded-3xl';
    case 'pill':
      return 'rounded-full';
    case 'rounded':
    default:
      return 'rounded-2xl';
  }
}

export function getCardShadowStyle(shadow?: string, color?: string): string {
  switch (shadow) {
    case 'none':
      return 'none';
    case 'sm':
      return '0 1px 3px rgba(0,0,0,0.06)';
    case 'lg':
      return '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)';
    case 'colored':
      return `0 8px 20px -4px ${color ? color + '40' : 'rgba(16,185,129,0.25)'}`;
    case 'brutal':
      return '4px 4px 0px #000000';
    case 'md':
    default:
      return '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)';
  }
}

export function getBorderWidth(thickness?: string): string {
  switch (thickness) {
    case 'thin':
      return '1px';
    case 'thick':
      return '3px';
    case 'medium':
    default:
      return '2px';
  }
}
