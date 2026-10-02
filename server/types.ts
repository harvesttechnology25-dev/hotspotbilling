export type NetworkProvider = 'VODACOM' | 'TIGO' | 'AIRTEL' | 'HALOTEL';

export type PlanType = 'TIME_BASED' | 'DATA_CAPPED' | 'HYBRID';

export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';

export type VoucherStatus = 'AVAILABLE' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export type RouterStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';

export type PortalThemePresetId =
  | 'emerald'
  | 'midnight'
  | 'royal_indigo'
  | 'sunset_amber'
  | 'crimson_rose'
  | 'neo_brutalist'
  | 'glassmorphism'
  | 'cyberpunk'
  | 'custom';

export type CardStyleType =
  | 'modern_rounded'
  | 'glassmorphism'
  | 'neo_brutalist'
  | 'flat_minimal'
  | 'gradient_bordered';

export type CardRadiusType = 'sharp' | 'medium' | 'rounded' | 'extra' | 'pill';
export type CardShadowType = 'none' | 'sm' | 'md' | 'lg' | 'colored' | 'brutal';
export type CardBorderThickness = 'thin' | 'medium' | 'thick';

export interface PortalThemeConfig {
  themeId: PortalThemePresetId;
  themeName?: string;
  // Colors
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  // Card customization
  cardStyle: CardStyleType;
  cardRadius: CardRadiusType;
  cardBgColor: string;
  cardBorderColor: string;
  cardBorderThickness: CardBorderThickness;
  cardActiveBgColor: string;
  cardActiveBorderColor: string;
  cardShadow: CardShadowType;
  cardTextColor?: string;
  priceTagColor?: string;
  // Header & branding
  brandName?: string;
  tagline?: string;
  supportPhone?: string;
  logoIcon: 'wifi' | 'zap' | 'radio' | 'globe' | 'rocket' | 'flame' | 'shield' | 'coffee' | 'sparkles';
  customLogoUrl?: string;
  badgeText?: string;
  welcomeMessageSw?: string;
  welcomeMessageEn?: string;
  showCarrierLogos: boolean;
  showSupportBadge: boolean;
  headerStyle: 'standard' | 'centered' | 'compact' | 'gradient_banner';
}

export type UserRole =
  | 'VENDOR_ADMIN'
  | 'HOTSPOT_OWNER'
  | 'MANAGER'
  | 'OPERATOR'
  | 'TECHNICIAN'
  | 'CASHIER'
  | 'VIEWER';

export interface UserPrivileges {
  can_manage_routers?: boolean;
  can_reboot_routers?: boolean;
  can_manage_plans?: boolean;
  can_generate_vouchers?: boolean;
  can_view_vouchers?: boolean;
  can_print_vouchers?: boolean;
  can_kick_users?: boolean;
  can_view_active_users?: boolean;
  can_view_reports?: boolean;
  can_export_reports?: boolean;
  can_manage_subusers?: boolean;
  can_customize_portal?: boolean;
  can_manage_payments?: boolean;
  can_manage_gateways?: boolean;
  can_manage_devops?: boolean;
}

export interface HotspotOwner {
  id: number;
  name: string;
  business_name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  assigned_router_ids: number[];
  parent_owner_id?: number;
  staff_title?: string;
  privileges?: UserPrivileges;
  commission_rate?: number;
  monthly_fee?: number;
  subscription_status?: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  subscription_expires_at?: string;
  subscription_fee?: number;
  vendor_merchant_id?: string;
  payout_channel?: 'PALMPESA' | 'DALIPAY' | 'AZAMPAY_SUB' | 'VODACOM_DIRECT' | 'TIGO_DIRECT' | 'AIRTEL_DIRECT' | 'MANUAL';
  wallet_account_number?: string;
  // PalmPesa Client Account Credentials
  palmpesa_user_id?: string;
  palmpesa_user_ref?: string;
  palmpesa_api_token?: string;
  dalipay_api_endpoint?: string;
  dalipay_key_id?: string;
  dalipay_public_key?: string;
  dalipay_secret_key?: string;
  dalipay_webhook_secret?: string;
  palmpesa_accept_stk?: boolean;
  portal_theme?: PortalThemeConfig;
  created_at: string;
  updated_at: string;
}

export type DeviceType = 'MIKROTIK' | 'RUIJIE' | 'TPLINK_OMADA' | 'OPENWRT_CUDY' | 'UBIQUITI_UNIFI' | 'GENERIC_RADIUS';

export interface RouterRecord {
  id: number;
  name: string;
  device_type?: DeviceType;
  model_name?: string;
  nas_identifier?: string;
  ip_address: string;
  vpn_assigned_ip?: string;
  api_port: number;
  api_username: string;
  api_password_hash: string;
  radius_secret?: string;
  location: string;
  brand_name?: string;
  ssid?: string;
  hotspot_server_name: string;
  dns_name: string;
  status: RouterStatus;
  owner_id?: number;
  owner_name?: string;
  vendor_name?: string;
  vendor_merchant_id?: string;
  vendor_api_key_encrypted?: string;
  platform_commission_percent?: number;
  wallet_account_number?: string;
  payout_channel?: 'PALMPESA' | 'DALIPAY' | 'AZAMPAY_SUB' | 'VODACOM_DIRECT' | 'TIGO_DIRECT' | 'AIRTEL_DIRECT' | 'MANUAL';
  // Optional Router-Specific PalmPesa Override
  palmpesa_user_id?: string;
  palmpesa_user_ref?: string;
  palmpesa_api_token?: string;
  dalipay_api_endpoint?: string;
  dalipay_key_id?: string;
  dalipay_public_key?: string;
  dalipay_secret_key?: string;
  dalipay_webhook_secret?: string;
  palmpesa_accept_stk?: boolean;
  portal_theme?: PortalThemeConfig;
  anti_tethering?: boolean;
  mac_address?: string;
  adoption_status?: 'PENDING_INFORM' | 'ADOPTING' | 'ADOPTED' | 'FAILED' | 'DISCONNECTED';
  ap_username?: string;
  ap_password?: string;
  inform_url?: string;
  omada_firmware?: string;
  omada_channel_2g?: number;
  omada_channel_5g?: number;
  omada_clients_count?: number;
  is_custom_model?: boolean;
  cpe_mode?: 'HOTSPOT_AP' | 'PTP_BRIDGE_MASTER' | 'PTP_BRIDGE_CLIENT' | 'REPEATER' | 'WISP_ROUTER';
  pharos_maxtream_disabled?: boolean;
  last_adopted_at?: string;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PlanRecord {
  id: number;
  name: string;
  type: PlanType;
  limit_uptime: number | null; // in seconds
  limit_bytes_total: number | null; // in bytes
  rate_limit: string; // e.g. '2M/4M'
  price: number; // in TZS
  validity_period: number; // in seconds
  shared_users: number;
  is_active: boolean;
  badge?: 'POPULAR' | 'BEST_VALUE' | 'SUPER_FAST' | 'HOT_DEAL' | 'CUSTOM' | 'NONE';
  badge_text?: string;
  features?: string[];
  description_sw: string;
  description_en: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionRecord {
  id: number;
  phone_number: string;
  network_provider: NetworkProvider;
  amount: number;
  external_reference: string;
  transaction_id: string | null;
  status: TransactionStatus;
  plan_id: number;
  router_id?: number;
  owner_id?: number;
  mac_address?: string;
  user_ip?: string;
  gateway_provider: string;
  vendor_merchant_id?: string;
  vendor_amount?: number;
  platform_fee?: number;
  failure_reason?: string;
  created_at: string;
  updated_at: string;
  plan?: PlanRecord;
  voucher?: VoucherRecord;
}

export interface VoucherRecord {
  id: number;
  code: string;
  password: string;
  plan_id: number;
  router_id?: number;
  owner_id?: number;
  transaction_id?: number;
  mac_address?: string;
  status: VoucherStatus;
  batch_tag?: string;
  activated_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  plan?: PlanRecord;
}

export interface VoucherBatchRecord {
  id: number;
  batch_id: string;
  plan_id: number;
  plan_name: string;
  price: number;
  router_id?: number;
  owner_id?: number;
  quantity: number;
  prefix: string;
  code_length: number;
  print_format: 'A4_GRID' | 'THERMAL_58MM' | 'THERMAL_80MM';
  created_at: string;
  vouchers?: VoucherRecord[];
}

export interface RadCheckRecord {
  id: number;
  username: string;
  attribute: string;
  op: string;
  value: string;
}

export interface RadReplyRecord {
  id: number;
  username: string;
  attribute: string;
  op: string;
  value: string;
}

export interface NasRecord {
  id: number;
  nasname: string;
  shortname: string;
  type: string;
  secret: string;
  description?: string;
}

export interface VendorPaymentPayload {
  phoneNumber: string;
  networkProvider?: NetworkProvider;
  planId: number;
  routerId?: number;
  macAddress?: string;
  userIp?: string;
  vendorMerchantId?: string;
}

export interface VendorCallbackPayload {
  merchantId: string;
  reference: string;
  transactionId: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  signature: string;
  timestamp: string;
}

export interface TransactionAuditLog {
  id: number;
  transaction_id?: number;
  external_reference: string;
  event_type: string;
  payload_json: Record<string, any>;
  signature_header?: string;
  ip_address?: string;
  created_at: string;
}

export interface HotspotActiveSession {
  id: number;
  router_id: number;
  username: string;
  ip_address: string;
  mac_address: string;
  uptime_seconds: number;
  bytes_in: number;
  bytes_out: number;
  rate_limit?: string;
  session_id?: string;
  last_synced_at: string;
}

export interface CarrierDetectionResult {
  provider: NetworkProvider | null;
  normalized: string;
  valid: boolean;
  formatted: string;
  brandName: string;
  shortCode: string;
}

export interface InitiatePaymentPayload {
  phoneNumber: string;
  networkProvider?: NetworkProvider;
  planId: number;
  routerId?: number;
  macAddress?: string;
  userIp?: string;
}

export interface WebhookPayload {
  externalReference: string;
  transactionId: string;
  status: 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  phoneNumber: string;
  carrier: string;
  timestamp: string;
  message?: string;
}

export interface AzamPayConfig {
  appName: string;
  clientId: string;
  clientSecret: string;
  apiKey: string;
  accountNumber: string;
  isSandbox: boolean;
}

export interface VodacomConfig {
  apiKey: string;
  publicKey: string;
  sessionToken: string;
  shortcode: string;
  isSandbox: boolean;
}

export interface PalmPesaConfig {
  userRef: string;
  userId?: string | number;
  apiToken: string;
  acceptHotspotStk?: boolean;
  isSandbox: boolean;
}

export interface DaliPayKeyItem {
  keyId: string;
  publicKey: string;
  secretKey: string;
  status: 'Active' | 'Inactive';
  created?: string;
  lastUsed?: string;
}

export interface DaliPayConfig {
  keyId: string;
  publicKey: string;
  secretKey: string;
  apiEndpoint?: string;
  webhookSecret?: string;
  isSandbox: boolean;
  availableKeys?: DaliPayKeyItem[];
}

export type EmailMerchantProvider = 'EMAILJS' | 'RESEND' | 'SENDGRID' | 'MAILGUN' | 'SMTP' | 'SIMULATION';

export interface EmailGatewayConfig {
  provider: EmailMerchantProvider;
  fromEmail: string;
  fromName: string;
  // EmailJS API
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  emailjsPrivateKey?: string;
  // Resend API
  resendApiKey?: string;
  // SendGrid API
  sendgridApiKey?: string;
  // Mailgun API
  mailgunApiKey?: string;
  mailgunDomain?: string;
  // Custom SMTP
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  enabled: boolean;
}


export type SmsMerchantProvider = 'BEEM' | 'NEXTSMS' | 'TWILIO' | 'CUSTOM_HTTP';

export interface SmsGatewayConfig {
  provider: SmsMerchantProvider;
  senderId: string;
  enabled: boolean;
  // Beem Africa
  beemApiKey?: string;
  beemSecretKey?: string;
  // NextSMS
  nextsmsUsername?: string;
  nextsmsPassword?: string;
  // Twilio
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  // Custom HTTP
  customWebhookUrl?: string;
  customApiKey?: string;
}

export interface GatewaySettings {
  adminUsername?: string;
  adminPassword?: string;
  activeGateway: 'PALMPESA' | 'DALIPAY' | 'AZAMPAY' | 'VODACOM_OPENAPI' | 'SELCOM' | 'TEST_SANDBOX';
  subscriptionGateway?: 'PALMPESA' | 'DALIPAY' | 'AZAMPAY' | 'VODACOM_OPENAPI' | 'ACTIVE_DEFAULT';
  subscriptionAggregatorAccount?: string;
  webhookSecret: string;
  palmpesa?: PalmPesaConfig;
  dalipay?: DaliPayConfig;
  azampay: AzamPayConfig;
  vodacom: VodacomConfig;
  smsGateway?: SmsGatewayConfig;
  emailGateway?: EmailGatewayConfig;
  hotspotName: string;
  supportPhone: string;
  autoLoginEnabled: boolean;
  requireRegistrationOtp?: boolean;
}

export interface RouterConnectionTestResult {
  reachable: boolean;
  latencyMs: number;
  apiType: 'REST' | 'SOCKET' | 'HTTP' | 'NONE';
  message: string;
  routerIdentity?: string;
  softwareVersion?: string;
}

export interface HotspotUserDetail {
  id: string | number;
  router_id: number;
  username: string;
  password?: string;
  is_online: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'EXPIRED' | 'AVAILABLE';
  ip_address?: string;
  mac_address?: string;
  uptime_seconds?: number;
  bytes_in?: number;
  bytes_out?: number;
  rate_limit?: string;
  limit_uptime?: number;
  limit_bytes_total?: number;
  comment?: string;
  plan_id?: number;
  plan_name?: string;
  plan_price?: number;
  created_at?: string;
  expires_at?: string;
  login_method?: 'PHONE' | 'MANUAL';
  phone_number?: string;
  voucher_status?: 'UNUSED' | 'USED' | 'EXPIRED' | 'ACTIVE';
}

export interface FreeTrialClaimRecord {
  id: number;
  mac_address: string;
  user_ip?: string;
  router_id?: number;
  owner_id?: number;
  voucher_code: string;
  duration_seconds: number;
  rate_limit: string;
  claimed_at: string;
  expires_at: string;
}

export interface FreeTrialPackageConfig {
  enabled: boolean;
  name: string;
  duration_minutes: number;
  rate_limit: string;
  quota_mb: number; // 0 = unlimited
  lock_policy: 'LIFETIME' | 'DAILY' | 'WEEKLY';
  button_text: string;
  description_sw: string;
  description_en: string;
  shared_users: number;
  updated_at?: string;
}

export const DEFAULT_FREE_TRIAL_CONFIG: FreeTrialPackageConfig = {
  enabled: true,
  name: 'Majaribio ya Bure (Free Trial)',
  duration_minutes: 15,
  rate_limit: '2M/4M',
  quota_mb: 0,
  lock_policy: 'LIFETIME',
  button_text: '⚡ Jiunge Bure Sasa',
  description_sw: 'Jaribu intaneti yetu ya kasi ya juu bila malipo yoyote!',
  description_en: 'Test our high-speed Wi-Fi free of charge!',
  shared_users: 1,
};

export interface ManualSubscriptionRequest {
  id: number;
  owner_id: number;
  owner_name: string;
  business_name: string;
  phone_number: string;
  amount: number;
  duration_days: number;
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'MANUAL_MPESA' | 'MANUAL_TIGO' | 'MANUAL_AIRTEL' | 'VENDOR_OVERRIDE' | 'CHEQUE';
  reference_note: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyServiceItem {
  id: string;
  title_sw: string;
  title_en: string;
  description_sw: string;
  description_en: string;
  icon?: string;
}

export interface CompanyFaqItem {
  id: string;
  question_sw: string;
  question_en: string;
  answer_sw: string;
  answer_en: string;
}

export interface CompanyPublicInfo {
  company_name: string;
  tagline_sw: string;
  tagline_en: string;
  about_title_sw: string;
  about_title_en: string;
  about_description_sw: string;
  about_description_en: string;
  mission_sw: string;
  mission_en: string;
  vision_sw: string;
  vision_en: string;
  services: CompanyServiceItem[];
  faqs?: CompanyFaqItem[];
  stats: {
    active_hotspots: string;
    daily_users: string;
    coverage_regions: string;
    uptime_percentage: string;
  };
  coverage_locations: string[];
  contact_phone_primary: string;
  contact_phone_secondary?: string;
  contact_whatsapp: string;
  contact_email_primary: string;
  contact_email_support: string;
  office_address_sw: string;
  office_address_en: string;
  working_hours_sw: string;
  working_hours_en: string;
  social_links: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp_group?: string;
    telegram?: string;
    website?: string;
  };
  support_note_sw?: string;
  support_note_en?: string;
  updated_at?: string;
}

export const DEFAULT_COMPANY_INFO: CompanyPublicInfo = {
  company_name: 'INFOTECH WiFi Tanzania',
  tagline_sw: 'Mtandao wa Kisasa wa Hotspot Billing & MikroTik Cloud nchini Tanzania',
  tagline_en: 'Next-Gen Hotspot Billing & MikroTik Cloud Platform in Tanzania',
  about_title_sw: 'Kuhusu INFOTECH WiFi',
  about_title_en: 'About INFOTECH WiFi',
  about_description_sw: 'INFOTECH WiFi ni mfumo bunifu na wa kisasa uliotengenezwa mahsusi kuwawezesha wamiliki wa Hotspot, migahawa, hoteli, vyuo, na wafanyabiashara wa intaneti nchini Tanzania kuuza na kudhibiti intaneti ya WiFi kwa njia rahisi ya simu (M-Pesa, Tigo Pesa, Airtel Money, Halopesa) na vocha zilizochapishwa kupitia MikroTik, Ruijie, na TP-Link Omada.',
  about_description_en: 'INFOTECH WiFi is an innovative telecommunications and hotspot billing management platform empowering business owners, ISPs, cafes, hotels, and cyber cafes across Tanzania to automate mobile money billing (M-Pesa, Tigo Pesa, Airtel Money, Halopesa) and print vouchers seamlessly with MikroTik, Ruijie, and TP-Link Omada routers.',
  mission_sw: 'Kurahisisha uuzaji na usambazaji wa intaneti ya kasi ya juu kwa kila mfanyabiashara na mtumiaji nchini Tanzania kwa njia ya malipo ya kidijitali ya papo hapo bila usumbufu.',
  mission_en: 'To democratize and streamline high-speed internet delivery and monetization for businesses across Tanzania through effortless instant mobile money payments.',
  vision_sw: 'Kuwa jukwaa nambari moja na la kuaminika zaidi la Hotspot Billing na Usimamizi wa MikroTik katika ukanda mzima wa Afrika Mashariki.',
  vision_en: 'To be the leading, most reliable Hotspot Billing and MikroTik Cloud automation platform across East Africa.',
  services: [
    {
      id: 'srv_1',
      title_sw: 'Malipo ya Papo kwa Papo (USSD Push)',
      title_en: 'Instant USSD Mobile Money Push',
      description_sw: 'Wateja wanalipia kwa M-Pesa, Tigo Pesa, Airtel Money, na Halopesa ambapo simu inaleta pop-up ya PIN moja kwa moja.',
      description_en: 'Instant USSD payment push directly prompting customers for PIN on Vodacom, Tigo, Airtel, and Halotel.'
    },
    {
      id: 'srv_2',
      title_sw: 'Usimamizi wa MikroTik & Fleet Cloud',
      title_en: 'MikroTik & Router Fleet Cloud Control',
      description_sw: 'Unganisha router nyingi (MikroTik, Ruijie, TP-Link) popote zilipo Tanzania kupitia FreeRADIUS na VPN bila Static IP.',
      description_en: 'Connect and remotely manage MikroTik and multi-brand router fleets across Tanzania via FreeRADIUS & Cloud VPN.'
    },
    {
      id: 'srv_3',
      title_sw: 'Uchapishaji wa Vocha (Voucher Station)',
      title_en: 'Thermal & Batch Voucher Printing',
      description_sw: 'Tengeneza na chapisha kadi za vocha zenye QR Code kwa printa za kawaida au za risiti (Thermal 58mm/80mm).',
      description_en: 'Batch-generate and print beautiful branded voucher tickets with QR codes on standard paper or POS thermal rolls.'
    },
    {
      id: 'srv_4',
      title_sw: 'Kugawa Bandwidth & Rate Limiting (QoS)',
      title_en: 'Bandwidth QoS & Rate Limiting',
      description_sw: 'Dhibiti kasi ya kila kifurushi ili kuzuia wateja wachache kumaliza kasi ya mtandao na kuhakikisha huduma bora.',
      description_en: 'Precise bandwidth control, queues, and fair-usage policies per user or ticket to ensure blazing speeds.'
    }
  ],
  stats: {
    active_hotspots: '1,450+',
    daily_users: '85,000+',
    coverage_regions: '15+ Mikoa',
    uptime_percentage: '99.98%'
  },
  coverage_locations: [
    'Dar es Salaam',
    'Arusha',
    'Mwanza',
    'Dodoma',
    'Mbeya',
    'Morogoro',
    'Zanzibar',
    'Tanga',
    'Kilimanjaro',
    'Iringa',
    'Tabora',
    'Kigoma'
  ],
  contact_phone_primary: '+255 754 000 111',
  contact_phone_secondary: '+255 784 999 222',
  contact_whatsapp: '+255 754 000 111',
  contact_email_primary: 'info@tzwifi.co.tz',
  contact_email_support: 'support@tzwifi.co.tz',
  office_address_sw: 'Kariakoo Business Center, Ghorofa ya 4, Mtaa wa Lumumba / Uhuru, Dar es Salaam, Tanzania',
  office_address_en: 'Kariakoo Business Center, 4th Floor, Lumumba & Uhuru St, Dar es Salaam, Tanzania',
  working_hours_sw: 'Jumatatu - Jumamosi: Saa 2:00 Asubuhi - 12:00 Jioni | Msaada wa Kiufundi: Masaa 24/7',
  working_hours_en: 'Monday - Saturday: 8:00 AM - 6:00 PM | Technical Support: 24/7 Non-stop',
  social_links: {
    whatsapp_group: 'https://wa.me/255754000111',
    instagram: 'https://instagram.com/infotechwifi_tz',
    facebook: 'https://facebook.com/infotechwifitz',
    twitter: 'https://twitter.com/infotechwifi_tz',
    telegram: 'https://t.me/infotechwifi_support',
    website: 'https://tzwifi.co.tz'
  },
  support_note_sw: 'Tuko tayari kukuhudumia wakati wowote. Wasiliana nasi kwa simu, WhatsApp, au fika ofisini kwetu kwa msaada wa kusanidi router yako!',
  support_note_en: 'We are ready to assist you anytime. Contact us via phone, WhatsApp, or visit our office for router setup support!'
};


