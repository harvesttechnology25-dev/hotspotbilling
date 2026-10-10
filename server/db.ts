import fs from 'fs';
import path from 'path';
import {
  RouterRecord,
  PlanRecord,
  TransactionRecord,
  VoucherRecord,
  VoucherBatchRecord,
  RadCheckRecord,
  RadReplyRecord,
  NasRecord,
  TransactionAuditLog,
  NetworkProvider,
  GatewaySettings,
  PalmPesaConfig,
  DaliPayConfig,
  EmailGatewayConfig,
  HotspotOwner,
  FreeTrialClaimRecord,
  FreeTrialPackageConfig,
  DEFAULT_FREE_TRIAL_CONFIG,
  ManualSubscriptionRequest,
  CompanyPublicInfo,
  DEFAULT_COMPANY_INFO,
} from './types.js';
import { mysqlService } from './mysqlService.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

const DEFAULT_SETTINGS: GatewaySettings = {
  activeGateway: 'PALMPESA',
  webhookSecret: process.env.AZAMPAY_WEBHOOK_SECRET || 'tzwifi_secret_key_89230492',
  palmpesa: {
    userRef: process.env.PALMPESA_USER_REF || '',
    userId: process.env.PALMPESA_USER_ID || '',
    apiToken: process.env.PALMPESA_API_TOKEN || '',
    acceptHotspotStk: true,
    isSandbox: false,
  },
  dalipay: {
    keyId: process.env.DALIPAY_KEY_ID || 'y3hT9bs505Z6',
    publicKey: process.env.DALIPAY_PUBLIC_KEY || 'gw_pk_test_EoDvAZ',
    secretKey: process.env.DALIPAY_SECRET_KEY || 'gw_sk_test_IdufCg',
    apiEndpoint: process.env.DALIPAY_ENDPOINT || 'https://api.dalipay.com/v1',
    webhookSecret: process.env.DALIPAY_WEBHOOK_SECRET || 'gw_wh_test_secret_dalipay',
    isSandbox: true,
    availableKeys: [
      {
        keyId: 'y3hT9bs505Z6',
        publicKey: 'gw_pk_test_EoDvAZ',
        secretKey: 'gw_sk_test_IdufCg',
        status: 'Active',
        created: '29 Sept 2026 13:05',
        lastUsed: 'Never',
      },
      {
        keyId: 'd06TgZivMkzW',
        publicKey: 'gw_pk_test_AAY0S5',
        secretKey: 'gw_sk_test_tYAWZs',
        status: 'Active',
        created: '29 Sept 2026 13:03',
        lastUsed: 'Never',
      },
      {
        keyId: '56Jva2sXOfq',
        publicKey: 'gw_pk_test_pd5CNG',
        secretKey: 'gw_sk_test_gh_Xyw',
        status: 'Active',
        created: '29 Sept 2026 13:01',
        lastUsed: 'Never',
      },
    ],
  },
  azampay: {
    appName: process.env.AZAMPAY_APP_NAME || 'TZ-WIFI-PORTAL',
    clientId: process.env.AZAMPAY_CLIENT_ID || '',
    clientSecret: process.env.AZAMPAY_CLIENT_SECRET || '',
    apiKey: process.env.AZAMPAY_API_KEY || '',
    accountNumber: process.env.AZAMPAY_ACCOUNT_NUMBER || '255754000111',
    isSandbox: true,
  },
  vodacom: {
    apiKey: process.env.VODACOM_API_KEY || '',
    publicKey: process.env.VODACOM_PUBLIC_KEY || '',
    sessionToken: '',
    shortcode: process.env.VODACOM_SHORTCODE || '000000',
    isSandbox: true,
  },
  hotspotName: 'TZ-WIFI-HOTSPOT',
  supportPhone: '+255 754 000 111',
  autoLoginEnabled: true,
  requireRegistrationOtp: false,
  smsGateway: {
    provider: 'BEEM',
    senderId: 'INFOTECH',
    enabled: true,
    beemApiKey: process.env.BEEM_API_KEY || '',
    beemSecretKey: process.env.BEEM_SECRET_KEY || '',
    nextsmsUsername: process.env.NEXTSMS_USERNAME || '',
    nextsmsPassword: process.env.NEXTSMS_PASSWORD || '',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER || '',
    customWebhookUrl: process.env.SMS_WEBHOOK_URL || '',
    customApiKey: process.env.SMS_WEBHOOK_KEY || '',
  },
  emailGateway: {
    provider: 'EMAILJS',
    fromEmail: process.env.EMAIL_FROM || 'billing@tzwifi.co.tz',
    fromName: process.env.EMAIL_FROM_NAME || 'INFOTECH WiFi',
    emailjsServiceId: process.env.EMAILJS_SERVICE_ID || '',
    emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || '',
    emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY || '',
    emailjsPrivateKey: process.env.EMAILJS_PRIVATE_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    mailgunApiKey: process.env.MAILGUN_API_KEY || '',
    mailgunDomain: process.env.MAILGUN_DOMAIN || '',
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpSecure: false,
    enabled: true,
  },
};

class PersistentDatabase {
  private owners: HotspotOwner[] = [];
  private routers: RouterRecord[] = [];
  private plans: PlanRecord[] = [];
  private transactions: TransactionRecord[] = [];
  private vouchers: VoucherRecord[] = [];
  private voucherBatches: VoucherBatchRecord[] = [];
  private radcheck: RadCheckRecord[] = [];
  private radreply: RadReplyRecord[] = [];
  private nasList: NasRecord[] = [];
  private auditLogs: TransactionAuditLog[] = [];
  private freeTrialClaims: FreeTrialClaimRecord[] = [];
  private freeTrialConfig: FreeTrialPackageConfig = { ...DEFAULT_FREE_TRIAL_CONFIG };
  private manualSubRequests: ManualSubscriptionRequest[] = [];
  private companyInfo: CompanyPublicInfo = { ...DEFAULT_COMPANY_INFO };
  private settings: GatewaySettings = { ...DEFAULT_SETTINGS };

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.owners = parsed.owners || [];
        this.routers = parsed.routers || [];
        this.plans = parsed.plans || [];
        this.transactions = parsed.transactions || [];
        this.vouchers = parsed.vouchers || [];
        this.voucherBatches = parsed.voucherBatches || [];
        this.radcheck = parsed.radcheck || [];
        this.radreply = parsed.radreply || [];
        this.nasList = parsed.nasList || [];
        this.auditLogs = parsed.auditLogs || [];
        this.freeTrialClaims = parsed.freeTrialClaims || [];
        this.manualSubRequests = parsed.manualSubRequests || [];
        this.freeTrialConfig = {
          ...DEFAULT_FREE_TRIAL_CONFIG,
          ...(parsed.freeTrialConfig || {}),
        };
        this.companyInfo = {
          ...DEFAULT_COMPANY_INFO,
          ...(parsed.companyInfo || {}),
          services: parsed.companyInfo?.services || DEFAULT_COMPANY_INFO.services,
          stats: {
            ...DEFAULT_COMPANY_INFO.stats,
            ...(parsed.companyInfo?.stats || {}),
          },
          social_links: {
            ...DEFAULT_COMPANY_INFO.social_links,
            ...(parsed.companyInfo?.social_links || {}),
          },
        };
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
          palmpesa: { ...DEFAULT_SETTINGS.palmpesa, ...(parsed.settings?.palmpesa || {}) },
          dalipay: { ...DEFAULT_SETTINGS.dalipay, ...(parsed.settings?.dalipay || {}) },
          azampay: { ...DEFAULT_SETTINGS.azampay, ...(parsed.settings?.azampay || {}) },
          vodacom: { ...DEFAULT_SETTINGS.vodacom, ...(parsed.settings?.vodacom || {}) },
          emailGateway: { ...DEFAULT_SETTINGS.emailGateway, ...(parsed.settings?.emailGateway || {}) },
          requireRegistrationOtp: parsed.settings?.requireRegistrationOtp !== undefined ? Boolean(parsed.settings.requireRegistrationOtp) : true,
        };

        if (this.owners.length === 0) {
          this.seedOwners();
          this.saveToDisk();
        } else {
          // Ensure passwords, monthly_fee, and vendor fields exist
          let updated = false;

          // Backfill default demo hotspot owners if missing
          if (!this.owners.some((o) => o.id === 2)) {
            this.owners.push({
              id: 2,
              name: 'Japhet',
              business_name: 'Japhet Hotspot',
              email: 'harvesttechnology25@gmail.com',
              phone: '0623887886',
              password: '1234',
              role: 'HOTSPOT_OWNER',
              status: 'ACTIVE',
              assigned_router_ids: [1],
              commission_rate: 5,
              monthly_fee: 15000,
              subscription_fee: 15000,
              subscription_status: 'ACTIVE',
              subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            updated = true;
          }
          if (!this.owners.some((o) => o.id === 3)) {
            this.owners.push({
              id: 3,
              name: 'Juma Hasani',
              business_name: 'mbezi',
              email: 'harvesttechnology27@gmail.com',
              phone: '0623887889',
              password: '1234',
              role: 'HOTSPOT_OWNER',
              status: 'ACTIVE',
              assigned_router_ids: [2],
              commission_rate: 5,
              monthly_fee: 15000,
              subscription_fee: 15000,
              subscription_status: 'ACTIVE',
              subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            updated = true;
          }

          // Backfill default routers if empty
          if (this.routers.length === 0) {
            this.routers = [
              {
                id: 1,
                name: 'MikroTik Hotspot Gateway (Kariakoo)',
                model_name: 'MikroTik RB750Gr3 / hEX',
                brand_name: 'Japhet Hotspot',
                ssid: 'JAPHET-HOTSPOT-WIFI',
                ip_address: '192.168.88.1',
                api_port: 8728,
                api_username: 'admin',
                api_password_hash: '',
                location: 'Kariakoo, Dar es Salaam',
                hotspot_server_name: 'hotspot1',
                dns_name: 'wifi.japhet.hotspot',
                status: 'ONLINE',
                owner_id: 2,
                owner_name: 'Japhet',
                vpn_assigned_ip: '100.108.0.2',
                radius_secret: 'radius_secret_2026',
                vendor_name: 'PalmPesa',
                vendor_merchant_id: 'PP-MERCHANT-10002',
                platform_commission_percent: 5.0,
                payout_channel: 'PALMPESA',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 2,
                name: 'MikroTik Hotspot Gateway (Mbezi Beach)',
                model_name: 'MikroTik CCR2004-16G-2S+',
                brand_name: 'mbezi',
                ssid: 'MBEZI-HOTSPOT-WIFI',
                ip_address: '192.168.89.1',
                api_port: 8728,
                api_username: 'admin',
                api_password_hash: '',
                location: 'Mbezi Beach, Dar es Salaam',
                hotspot_server_name: 'hotspot2',
                dns_name: 'wifi.mbezi.hotspot',
                status: 'ONLINE',
                owner_id: 3,
                owner_name: 'Juma Hasani',
                vpn_assigned_ip: '100.108.0.3',
                radius_secret: 'radius_secret_2026',
                vendor_name: 'PalmPesa',
                vendor_merchant_id: 'PP-MERCHANT-10003',
                platform_commission_percent: 5.0,
                payout_channel: 'PALMPESA',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 3,
                name: 'MikroTik Hotspot Gateway (Mwenge Bus Stand)',
                model_name: 'MikroTik hAP ac3 / CCR',
                brand_name: 'Japhet Hotspot - Mwenge',
                ssid: 'JAPHET-MWENGE-WIFI',
                ip_address: '192.168.90.1',
                api_port: 8728,
                api_username: 'admin',
                api_password_hash: '',
                location: 'Mwenge Kituo cha Mabasi, Dar es Salaam',
                hotspot_server_name: 'hotspot3',
                dns_name: 'wifi.mwenge.hotspot',
                status: 'ONLINE',
                owner_id: 2,
                owner_name: 'Japhet',
                vpn_assigned_ip: '100.108.0.4',
                radius_secret: 'radius_secret_2026',
                vendor_name: 'PalmPesa',
                vendor_merchant_id: 'PP-MERCHANT-10002',
                platform_commission_percent: 5.0,
                payout_channel: 'PALMPESA',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ];
            updated = true;
          }
          for (const o of this.owners) {
            if (!o.password) {
              o.password = o.role === 'VENDOR_ADMIN' ? 'admin123' : '123456';
              updated = true;
            }
            if (o.role === 'VENDOR_ADMIN') {
              o.monthly_fee = 0;
              o.subscription_fee = 0;
              o.subscription_status = 'ACTIVE';
            } else {
              o.monthly_fee = 15000;
              o.subscription_fee = 15000;
              if (!o.subscription_status || !o.subscription_expires_at) {
                if (o.id === 3) {
                  // Neema Mwangi: Expired 2 days ago for easy testing
                  o.subscription_status = 'EXPIRED';
                  o.subscription_expires_at = new Date(Date.now() - 2 * 86400000).toISOString();
                } else {
                  o.subscription_status = 'ACTIVE';
                  o.subscription_expires_at = new Date(Date.now() + 28 * 86400000).toISOString();
                }
                updated = true;
              } else if (new Date(o.subscription_expires_at).getTime() < Date.now()) {
                if (o.subscription_status !== 'EXPIRED') {
                  o.subscription_status = 'EXPIRED';
                  updated = true;
                }
              }
            }
            if (!o.vendor_merchant_id && o.role === 'HOTSPOT_OWNER') {
              o.vendor_merchant_id = `PP-MERCHANT-${10000 + o.id}`;
              o.payout_channel = 'PALMPESA';
              o.wallet_account_number = o.phone;
              updated = true;
            }
          }
          for (const r of this.routers) {
            if (!r.vpn_assigned_ip) {
              r.vpn_assigned_ip = `100.108.0.${r.id + 1}`;
              r.radius_secret = 'radius_secret_2026';
              r.vendor_name = 'PalmPesa';
              r.vendor_merchant_id = `PP-MERCHANT-${10000 + (r.owner_id || 1)}`;
              r.platform_commission_percent = 5.0;
              r.payout_channel = 'PALMPESA';
              updated = true;
            }
            if (!r.brand_name) {
              const matchedOwner = this.owners.find((o) => o.id === r.owner_id);
              r.brand_name = matchedOwner?.business_name || (r.id === 1 ? 'Kariakoo Cyber & WiFi Point' : 'Clock Tower Arusha Lounge');
              updated = true;
            }
            if (!r.ssid) {
              r.ssid = `${(r.brand_name || r.name).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 16)}-WIFI`;
              updated = true;
            }
          }

          // Strict Multi-Tenant Backfill & Router Sync:
          for (const o of this.owners) {
            if (o.role === 'HOTSPOT_OWNER' && Array.isArray(o.assigned_router_ids)) {
              for (const rId of o.assigned_router_ids) {
                const matchedRouter = this.routers.find((r) => r.id === Number(rId));
                if (matchedRouter && matchedRouter.owner_id !== o.id) {
                  matchedRouter.owner_id = o.id;
                  updated = true;
                }
              }
            }
          }

          for (const b of this.voucherBatches) {
            if (b.owner_id == null && b.router_id) {
              const matchedRouter = this.routers.find((r) => r.id === b.router_id);
              if (matchedRouter?.owner_id) {
                b.owner_id = matchedRouter.owner_id;
                updated = true;
              }
            }
          }
          for (const v of this.vouchers) {
            // Unactivated vouchers from printed batches retain full shelf-life until scratched/activated
            if (!v.activated_at && (v.status === 'AVAILABLE' || (v.status as string) === 'UNUSED')) {
              if (v.expires_at && new Date(v.expires_at).getTime() < Date.now()) {
                v.expires_at = new Date(Date.now() + 365 * 86400000).toISOString();
                updated = true;
              }
            }
            if (v.owner_id == null) {
              if (v.batch_tag) {
                const matchedBatch = this.voucherBatches.find((b) => b.batch_id === v.batch_tag || (b as any).batch_tag === v.batch_tag);
                if (matchedBatch?.owner_id) {
                  v.owner_id = matchedBatch.owner_id;
                  updated = true;
                }
              }
              if (v.owner_id == null && v.router_id) {
                const matchedRouter = this.routers.find((r) => r.id === v.router_id);
                if (matchedRouter?.owner_id) {
                  v.owner_id = matchedRouter.owner_id;
                  updated = true;
                }
              }
            }
          }

          for (const p of this.plans) {
            if (!p.badge) {
              if (p.price === 1500) p.badge = 'POPULAR';
              else if (p.price === 5000) p.badge = 'BEST_VALUE';
              else if (p.price === 500) p.badge = 'HOT_DEAL';
              else p.badge = 'NONE';
              updated = true;
            }
            if (!p.features || p.features.length === 0) {
              if (p.price === 500) {
                p.features = ['Masaa 2 bila kikomo cha MB', 'Kasi ya 4 Mbps'];
              } else if (p.price === 1000) {
                p.features = ['Masaa 6 ya kazi & masomo', 'Kasi ya 6 Mbps', 'YouTube & TikTok bila kukwama'];
              } else if (p.price === 1500) {
                p.features = ['Saa 24 (siku 1) mfululizo', 'Kasi ya 8 Mbps', 'Inafaa kwa kupakua na kupiga simu'];
              } else if (p.price === 5000) {
                p.features = ['Siku 7 mfululizo bila kikomo', 'Kasi kubwa 10 Mbps', 'QoS prioritization kwa kazi'];
              } else {
                p.features = ['Intaneti ya kasi ya juu bila kikomo'];
              }
              updated = true;
            }
          }

          if (this.nasList.length === 0) {
            this.nasList = [
              {
                id: 1,
                nasname: '100.108.0.0/18',
                shortname: 'vpn-fleet',
                type: 'mikrotik',
                secret: 'radius_secret_2026',
                description: 'OpenVPN / SSTP MikroTik Fleet Subnet',
              },
            ];
            updated = true;
          }
          if (updated) {
            this.saveToDisk();
          }
        }
      } else {
        this.seedDefaults();
        this.saveToDisk();
      }
    } catch (err) {
      console.error('Failed to load database from disk, using defaults:', err);
      this.seedDefaults();
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        owners: this.owners,
        routers: this.routers,
        plans: this.plans,
        transactions: this.transactions,
        vouchers: this.vouchers,
        voucherBatches: this.voucherBatches,
        radcheck: this.radcheck,
        radreply: this.radreply,
        nasList: this.nasList,
        auditLogs: this.auditLogs.slice(0, 500),
        freeTrialClaims: this.freeTrialClaims,
        freeTrialConfig: this.freeTrialConfig,
        manualSubRequests: this.manualSubRequests,
        companyInfo: this.companyInfo,
        settings: this.settings,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving database to disk:', err);
    }
  }

  private seedOwners() {
    this.owners = [
      {
        id: 1,
        name: 'Kelvin Mrema (Vendor HQ)',
        business_name: 'INFOTECH WiFi Cloud Platform',
        email: 'vendor@tzwifi.co.tz',
        phone: '0754111222',
        password: '1234',
        role: 'VENDOR_ADMIN',
        status: 'ACTIVE',
        assigned_router_ids: [],
        commission_rate: 0,
        monthly_fee: 0,
        subscription_fee: 0,
        subscription_status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  private seedDefaults() {
    this.seedOwners();
    this.routers = [];
    this.plans = [
      {
        id: 1,
        name: 'Masaa 2 - Kasi ya Juu (2 Hours)',
        type: 'TIME_BASED',
        limit_uptime: 7200,
        limit_bytes_total: null,
        rate_limit: '2M/4M',
        price: 500,
        validity_period: 7200,
        shared_users: 1,
        is_active: true,
        description_sw: 'Masaa 2 ya intaneti isiyo na kikomo cha data kwa kasi ya 4Mbps',
        description_en: '2 Hours unlimited browsing at 4Mbps peak speed',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Masaa 6 - Standard (6 Hours)',
        type: 'TIME_BASED',
        limit_uptime: 21600,
        limit_bytes_total: null,
        rate_limit: '3M/6M',
        price: 1000,
        validity_period: 21600,
        shared_users: 1,
        is_active: true,
        description_sw: 'Masaa 6 ya kazi, video na kupakua maudhui mtandaoni',
        description_en: '6 Hours for remote work, streaming, and downloads',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        name: 'Masaa 24 (Siku 1) - Unlimited',
        type: 'TIME_BASED',
        limit_uptime: 86400,
        limit_bytes_total: null,
        rate_limit: '3M/8M',
        price: 1500,
        validity_period: 86400,
        shared_users: 1,
        is_active: true,
        description_sw: 'Siku 1 kamili (masaa 24) intaneti mfululizo bila kikomo',
        description_en: 'Full 24-hour unlimited connection at high speed',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        name: 'Siku 7 (Wiki 1) - Kasi Kubwa',
        type: 'TIME_BASED',
        limit_uptime: 604800,
        limit_bytes_total: null,
        rate_limit: '4M/10M',
        price: 5000,
        validity_period: 604800,
        shared_users: 1,
        is_active: true,
        description_sw: 'Wiki nzima (siku 7) intaneti kasi kubwa bila kukatika',
        description_en: '7 Days continuous broadband internet with prioritized QoS',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 5,
        name: 'Siku 30 (Mwezi 1) - Unlimited',
        type: 'TIME_BASED',
        limit_uptime: 2592000,
        limit_bytes_total: null,
        rate_limit: '5M/15M',
        price: 18000,
        validity_period: 2592000,
        shared_users: 2,
        is_active: true,
        description_sw: 'Mwezi mzima (siku 30) vifaa hadi 2 kwa wakati mmoja',
        description_en: 'Monthly unlimited internet package up to 2 simultaneous devices',
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    this.transactions = [
      {
        id: 1,
        phone_number: '255754123456',
        network_provider: 'VODACOM',
        amount: 1500,
        external_reference: 'TZWF-260924-A109',
        transaction_id: 'MP260924.0812.K10921',
        status: 'SUCCESS',
        plan_id: 3,
        router_id: 1,
        mac_address: 'BC:D0:74:11:2E:8A',
        gateway_provider: 'AZAMPAY',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3590000).toISOString(),
      },
      {
        id: 2,
        phone_number: '255713994021',
        network_provider: 'TIGO',
        amount: 500,
        external_reference: 'TZWF-260924-B882',
        transaction_id: 'TP260924.0920.L44910',
        status: 'SUCCESS',
        plan_id: 1,
        router_id: 1,
        mac_address: 'F0:18:98:5C:33:1B',
        gateway_provider: 'AZAMPAY',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date(Date.now() - 7190000).toISOString(),
      },
      {
        id: 3,
        phone_number: '255784112940',
        network_provider: 'AIRTEL',
        amount: 5000,
        external_reference: 'TZWF-260924-C901',
        transaction_id: 'AM260924.0715.M78129',
        status: 'SUCCESS',
        plan_id: 4,
        router_id: 2,
        mac_address: '44:65:0E:8F:A2:70',
        gateway_provider: 'AZAMPAY',
        created_at: new Date(Date.now() - 14400000).toISOString(),
        updated_at: new Date(Date.now() - 14380000).toISOString(),
      },
      {
        id: 4,
        phone_number: '255620993812',
        network_provider: 'HALOTEL',
        amount: 1000,
        external_reference: 'TZWF-260924-D442',
        transaction_id: 'HP260924.0610.N12345',
        status: 'SUCCESS',
        plan_id: 2,
        router_id: 1,
        mac_address: '38:F9:D3:55:10:9A',
        gateway_provider: 'AZAMPAY',
        created_at: new Date(Date.now() - 18000000).toISOString(),
        updated_at: new Date(Date.now() - 17980000).toISOString(),
      },
    ];

    this.vouchers = [
      {
        id: 1,
        code: 'TZ-74921',
        password: 'admin',
        plan_id: 3,
        router_id: 1,
        transaction_id: 1,
        mac_address: 'BC:D0:74:11:2E:8A',
        status: 'ACTIVE',
        activated_at: new Date(Date.now() - 3590000).toISOString(),
        expires_at: new Date(Date.now() + 82810000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        code: 'TZ-88301',
        password: 'admin',
        plan_id: 1,
        router_id: 1,
        transaction_id: 2,
        mac_address: 'F0:18:98:5C:33:1B',
        status: 'ACTIVE',
        activated_at: new Date(Date.now() - 7190000).toISOString(),
        expires_at: new Date(Date.now() + 10000).toISOString(),
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        code: 'TZ-90124',
        password: 'admin',
        plan_id: 1,
        router_id: 1,
        status: 'AVAILABLE',
        batch_tag: 'BATCH-2026-09-A',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 4,
        code: 'TZ-90125',
        password: 'admin',
        plan_id: 2,
        router_id: 1,
        status: 'AVAILABLE',
        batch_tag: 'BATCH-2026-09-A',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 5,
        code: 'TZ-MAN-501',
        password: 'admin',
        plan_id: 2,
        router_id: 1,
        status: 'ACTIVE',
        batch_tag: 'COUNTER_CASH_SALES',
        activated_at: new Date(Date.now() - 5400000).toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: new Date(Date.now() - 10800000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 6,
        code: 'TZ-MAN-502',
        password: 'admin',
        plan_id: 3,
        router_id: 1,
        status: 'ACTIVE',
        batch_tag: 'COUNTER_CASH_SALES',
        activated_at: new Date(Date.now() - 7200000).toISOString(),
        expires_at: new Date(Date.now() + 172800000).toISOString(),
        created_at: new Date(Date.now() - 14400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 7,
        code: 'TZ-MAN-503',
        password: 'admin',
        plan_id: 4,
        router_id: 2,
        status: 'ACTIVE',
        batch_tag: 'COUNTER_CASH_SALES',
        activated_at: new Date(Date.now() - 18000000).toISOString(),
        expires_at: new Date(Date.now() + 604800000).toISOString(),
        created_at: new Date(Date.now() - 21600000).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }

  // --- Settings ---
  getSettings(): GatewaySettings {
    return { ...this.settings };
  }

  saveSettings(newSettings: Partial<GatewaySettings>): GatewaySettings {
    const currentPalmpesa = this.settings.palmpesa || DEFAULT_SETTINGS.palmpesa!;
    const mergedPalmpesa: PalmPesaConfig = {
      ...currentPalmpesa,
      ...(newSettings.palmpesa || {}),
      userRef: newSettings.palmpesa?.userRef || currentPalmpesa.userRef,
      apiToken: newSettings.palmpesa?.apiToken ?? currentPalmpesa.apiToken,
      isSandbox: newSettings.palmpesa?.isSandbox ?? currentPalmpesa.isSandbox,
    };

    const currentDalipay = this.settings.dalipay || DEFAULT_SETTINGS.dalipay!;
    const mergedDalipay: DaliPayConfig = {
      ...currentDalipay,
      ...(newSettings.dalipay || {}),
      keyId: newSettings.dalipay?.keyId ?? currentDalipay.keyId,
      publicKey: newSettings.dalipay?.publicKey ?? currentDalipay.publicKey,
      secretKey: newSettings.dalipay?.secretKey ?? currentDalipay.secretKey,
      apiEndpoint: newSettings.dalipay?.apiEndpoint ?? currentDalipay.apiEndpoint,
      webhookSecret: newSettings.dalipay?.webhookSecret ?? currentDalipay.webhookSecret,
      isSandbox: newSettings.dalipay?.isSandbox ?? currentDalipay.isSandbox,
    };

    const currentEmail = this.settings.emailGateway || DEFAULT_SETTINGS.emailGateway!;
        const currentSms = this.settings.smsGateway || (DEFAULT_SETTINGS as any).smsGateway || {
      provider: 'BEEM',
      senderId: 'INFOTECH',
      enabled: true,
    };
    const mergedSms: any = {
      ...currentSms,
      ...(newSettings.smsGateway || {}),
      provider: newSettings.smsGateway?.provider || currentSms.provider,
      senderId: newSettings.smsGateway?.senderId || currentSms.senderId,
      enabled: newSettings.smsGateway?.enabled ?? currentSms.enabled,
    };
const mergedEmail: EmailGatewayConfig = {
      ...currentEmail,
      ...(newSettings.emailGateway || {}),
      provider: newSettings.emailGateway?.provider || currentEmail.provider,
      fromEmail: newSettings.emailGateway?.fromEmail || currentEmail.fromEmail,
      fromName: newSettings.emailGateway?.fromName || currentEmail.fromName,
      enabled: newSettings.emailGateway?.enabled ?? currentEmail.enabled,
    };

    this.settings = {
      ...this.settings,
      ...newSettings,
      requireRegistrationOtp: newSettings.requireRegistrationOtp !== undefined ? Boolean(newSettings.requireRegistrationOtp) : this.settings.requireRegistrationOtp,
      palmpesa: mergedPalmpesa,
      dalipay: mergedDalipay,
      azampay: { ...this.settings.azampay, ...(newSettings.azampay || {}) },
      vodacom: { ...this.settings.vodacom, ...(newSettings.vodacom || {}) },
      emailGateway: mergedEmail,
      smsGateway: mergedSms,
    };
    this.saveToDisk();
    return this.settings;
  }

  // --- Hotspot Owners / Tenants ---
  getOwners(): HotspotOwner[] {
    return [...this.owners];
  }

  getOwnerById(id: number): HotspotOwner | undefined {
    return this.owners.find((o) => o.id === id);
  }

  getNextOwnerId(): number {
    return this.owners.reduce((max, o) => (o.id > max ? o.id : max), 0) + 1;
  }

  saveOwner(owner: HotspotOwner): HotspotOwner {
    const idx = this.owners.findIndex((o) => o.id === owner.id);
    owner.updated_at = new Date().toISOString();
    if (idx >= 0) {
      this.owners[idx] = owner;
    } else {
      if (!owner.created_at) owner.created_at = new Date().toISOString();
      this.owners.push(owner);
    }
    this.saveToDisk();
    mysqlService.syncOwner(owner);
    return owner;
  }

  deleteOwner(id: number): boolean {
    const initialLen = this.owners.length;
    this.owners = this.owners.filter((o) => o.id !== id);
    if (this.owners.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- Routers ---
  getRouters(): RouterRecord[] {
    return [...this.routers];
  }

  getRouterById(id: number): RouterRecord | undefined {
    return this.routers.find((r) => r.id === id);
  }

  getNextRouterId(): number {
    return this.routers.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
  }

  saveRouter(router: RouterRecord): RouterRecord {
    const idx = this.routers.findIndex((r) => r.id === router.id);
    router.updated_at = new Date().toISOString();
    if (!router.brand_name && router.owner_id) {
      const owner = this.getOwnerById(router.owner_id);
      if (owner?.business_name) {
        router.brand_name = owner.business_name;
      }
    }
    if (!router.ssid) {
      router.ssid = `${(router.brand_name || router.name).replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 16)}-WIFI`;
    }
    if (idx >= 0) {
      this.routers[idx] = router;
    } else {
      if (!router.created_at) router.created_at = new Date().toISOString();
      this.routers.push(router);
    }
    // Auto-link any existing batch vouchers created by this owner before router was added
    if (router.owner_id) {
      for (const v of this.vouchers) {
        if (Number(v.owner_id) === Number(router.owner_id) && !v.router_id) {
          v.router_id = router.id;
        }
      }
      for (const b of this.voucherBatches) {
        if (Number(b.owner_id) === Number(router.owner_id) && !b.router_id) {
          b.router_id = router.id;
        }
      }
    }
    this.saveToDisk();
    mysqlService.syncRouter(router);
    return router;
  }

  deleteRouter(id: number): boolean {
    const initialLen = this.routers.length;
    this.routers = this.routers.filter((r) => r.id !== id);
    if (this.routers.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- Plans ---
  getPlans(): PlanRecord[] {
    return [...this.plans];
  }

  getPlanById(id: number): PlanRecord | undefined {
    return this.plans.find((p) => p.id === id);
  }

  getNextPlanId(): number {
    return this.plans.reduce((max, p) => (p.id > max ? p.id : max), 0) + 1;
  }

  savePlan(plan: PlanRecord): PlanRecord {
    const idx = this.plans.findIndex((p) => p.id === plan.id);
    plan.updated_at = new Date().toISOString();
    if (idx >= 0) {
      this.plans[idx] = plan;
    } else {
      if (!plan.created_at) plan.created_at = new Date().toISOString();
      this.plans.push(plan);
    }
    this.saveToDisk();
    return plan;
  }

  deletePlan(id: number): boolean {
    const initialLen = this.plans.length;
    this.plans = this.plans.filter((p) => p.id !== id);
    if (this.plans.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- Transactions ---
  getTransactions(): TransactionRecord[] {
    return [...this.transactions].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getTransactionById(id: number): TransactionRecord | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  getTransactionByReference(ref: string): TransactionRecord | undefined {
    return this.transactions.find((t) => t.external_reference === ref);
  }

  getNextTransactionId(): number {
    return this.transactions.reduce((max, t) => (t.id > max ? t.id : max), 0) + 1;
  }

  saveTransaction(tx: TransactionRecord): TransactionRecord {
    const idx = this.transactions.findIndex((t) => t.id === tx.id);
    tx.updated_at = new Date().toISOString();
    if (idx >= 0) {
      this.transactions[idx] = tx;
    } else {
      if (!tx.created_at) tx.created_at = new Date().toISOString();
      this.transactions.push(tx);
    }
    this.saveToDisk();
    mysqlService.syncTransaction(tx);
    return tx;
  }

  updateTransactionStatus(
    reference: string,
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    externalTxId?: string,
    failureReason?: string
  ): TransactionRecord | undefined {
    const tx = this.getTransactionByReference(reference);
    if (!tx) return undefined;
    tx.status = status;
    if (externalTxId) tx.transaction_id = externalTxId;
    if (failureReason) tx.failure_reason = failureReason;
    tx.updated_at = new Date().toISOString();
    this.saveTransaction(tx);
    return tx;
  }

  // --- Vouchers ---
  getVouchers(): VoucherRecord[] {
    return [...this.vouchers].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  getVoucherByCode(code: string): VoucherRecord | undefined {
    return this.vouchers.find(
      (v) => v.code.toUpperCase() === code.trim().toUpperCase()
    );
  }

  getVoucherByTransactionId(txId: number): VoucherRecord | undefined {
    return this.vouchers.find((v) => v.transaction_id === txId);
  }

  getNextVoucherId(): number {
    return this.vouchers.reduce((max, v) => (v.id > max ? v.id : max), 0) + 1;
  }

  saveVoucher(v: VoucherRecord): VoucherRecord {
    const idx = this.vouchers.findIndex((existing) => existing.id === v.id);
    v.updated_at = new Date().toISOString();
    if (idx >= 0) {
      this.vouchers[idx] = v;
    } else {
      if (!v.created_at) v.created_at = new Date().toISOString();
      this.vouchers.push(v);
    }
    this.saveToDisk();
    mysqlService.syncVoucher(v);
    return v;
  }

  deleteVoucher(id: number | string): boolean {
    const idStr = String(id).trim();
    const idNum = Number(id);
    const initialLen = this.vouchers.length;
    this.vouchers = this.vouchers.filter(
      (v) => String(v.id).trim() !== idStr && (!isNaN(idNum) ? Number(v.id) !== idNum : true)
    );
    if (this.vouchers.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  deleteVoucherByCode(code: string): boolean {
    if (!code) return false;
    const target = String(code).trim().toUpperCase();
    const initialLen = this.vouchers.length;
    this.vouchers = this.vouchers.filter(
      (v) => (v.code ? String(v.code).trim().toUpperCase() : '') !== target
    );
    if (this.vouchers.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- Audit Logs ---
  saveAuditLog(log: TransactionAuditLog): void {
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    this.saveToDisk();
  }

  getAuditLogs(): TransactionAuditLog[] {
    return [...this.auditLogs];
  }

  // --- Analytics ---
  getRevenueMetrics(
    ownerId?: number,
    options?: {
      preset?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'all' | 'custom';
      startDate?: string;
      endDate?: string;
      routerId?: number;
    }
  ) {
    let transactions = [...this.transactions];
    let vouchers = [...this.vouchers];
    const plansMap = new Map(this.plans.map((p) => [p.id, p]));

    if (ownerId) {
      const targetOwnerId = Number(ownerId);
      const owner = this.getOwnerById(targetOwnerId);
      const allowedRouters = new Set([
        ...(owner?.assigned_router_ids || []),
        ...this.routers.filter((r) => r.owner_id != null && Number(r.owner_id) === targetOwnerId).map((r) => r.id),
      ]);
      transactions = transactions.filter((t) => {
        if (t.owner_id != null) return Number(t.owner_id) === targetOwnerId;
        return t.router_id != null && allowedRouters.has(t.router_id);
      });
      vouchers = vouchers.filter((v) => {
        if (v.owner_id != null) return Number(v.owner_id) === targetOwnerId;
        if (v.batch_tag) {
          const b = this.voucherBatches.find((batch) => batch.batch_id === v.batch_tag);
          if (b && b.owner_id != null) return Number(b.owner_id) === targetOwnerId;
        }
        return v.router_id != null && allowedRouters.has(v.router_id);
      });
    }

    if (options?.routerId) {
      const targetRouterId = Number(options.routerId);
      transactions = transactions.filter((t) => t.router_id === targetRouterId);
      vouchers = vouchers.filter((v) => v.router_id === targetRouterId);
    }

    // Determine timestamp bounds
    const preset = options?.preset || 'all';
    const now = new Date();
    let startTime: number | null = null;
    let endTime: number | null = null;

    if (preset === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      startTime = d.getTime();
      const endD = new Date(now);
      endD.setHours(23, 59, 59, 999);
      endTime = endD.getTime();
    } else if (preset === 'yesterday') {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      startTime = d.getTime();
      const endD = new Date(d);
      endD.setHours(23, 59, 59, 999);
      endTime = endD.getTime();
    } else if (preset === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      startTime = d.getTime();
      endTime = now.getTime();
    } else if (preset === 'this_month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      startTime = d.getTime();
      endTime = now.getTime();
    } else if (preset === 'this_year') {
      const d = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      startTime = d.getTime();
      endTime = now.getTime();
    } else if (preset === 'custom') {
      if (options?.startDate) {
        startTime = new Date(options.startDate + (options.startDate.includes('T') ? '' : 'T00:00:00')).getTime();
      }
      if (options?.endDate) {
        endTime = new Date(options.endDate + (options.endDate.includes('T') ? '' : 'T23:59:59.999')).getTime();
      }
    }

    const inRange = (isoDate?: string) => {
      if (!isoDate) return true;
      if (startTime === null && endTime === null) return true;
      const t = new Date(isoDate).getTime();
      if (isNaN(t)) return true;
      if (startTime !== null && t < startTime) return false;
      if (endTime !== null && t > endTime) return false;
      return true;
    };

    // Filter transactions by range
    const rangeTransactions = transactions.filter((t) => inRange(t.created_at));

    // 1. Mobile Money Revenue (STK Push)
    const totalTransactions = rangeTransactions.length;
    const successfulTx = rangeTransactions.filter((t) => t.status === 'SUCCESS');
    const mobileRevenue = successfulTx.reduce((sum, t) => sum + t.amount, 0);

    const carrierBreakdown: Record<
      NetworkProvider,
      { count: number; revenue: number; percentage: number }
    > = {
      VODACOM: { count: 0, revenue: 0, percentage: 0 },
      TIGO: { count: 0, revenue: 0, percentage: 0 },
      AIRTEL: { count: 0, revenue: 0, percentage: 0 },
      HALOTEL: { count: 0, revenue: 0, percentage: 0 },
    };

    successfulTx.forEach((t) => {
      if (carrierBreakdown[t.network_provider]) {
        carrierBreakdown[t.network_provider].count += 1;
        carrierBreakdown[t.network_provider].revenue += t.amount;
      }
    });

    Object.keys(carrierBreakdown).forEach((k) => {
      const key = k as NetworkProvider;
      carrierBreakdown[key].percentage = mobileRevenue > 0
        ? Math.round((carrierBreakdown[key].revenue / mobileRevenue) * 100)
        : 0;
    });

    // 2. Manual Vouchers Revenue (Cash / Printed Vouchers)
    // Exclude vouchers tied to an automated mobile money transaction
    const manualVouchers = vouchers.filter((v) => !v.transaction_id);
    const rangeManualVouchers = manualVouchers.filter((v) => inRange(v.activated_at || v.created_at));

    const soldManualVouchers = rangeManualVouchers.filter(
      (v) => v.status === 'ACTIVE' || v.status === 'EXPIRED'
    );
    const manualVoucherRevenue = soldManualVouchers.reduce((sum, v) => {
      const plan = plansMap.get(v.plan_id);
      return sum + (plan ? plan.price : 1000);
    }, 0);

    // Stock value of available unsold manual vouchers
    const availableManualVouchers = vouchers.filter((v) => v.status === 'AVAILABLE');
    const manualVouchersStockValue = availableManualVouchers.reduce((sum, v) => {
      const plan = plansMap.get(v.plan_id);
      return sum + (plan ? plan.price : 1000);
    }, 0);

    // 3. Combined Total Gross Revenue
    const totalRevenue = mobileRevenue + manualVoucherRevenue;

    return {
      totalRevenue,
      mobileRevenue,
      manualVoucherRevenue,
      manualVouchersSold: soldManualVouchers.length,
      manualVouchersStockValue,
      totalTransactions,
      successfulCount: successfulTx.length,
      failedCount: rangeTransactions.filter((t) => t.status === 'FAILED').length,
      successRate: totalTransactions > 0
        ? Math.round((successfulTx.length / totalTransactions) * 100)
        : 100,
      carrierBreakdown,
      vouchersTotal: vouchers.length,
      vouchersActive: vouchers.filter((v) => v.status === 'ACTIVE').length,
      vouchersAvailable: vouchers.filter((v) => v.status === 'AVAILABLE').length,
      selectedRange: {
        preset,
        startDate: options?.startDate,
        endDate: options?.endDate,
      },
    };
  }

  // --- Voucher Batches ---
  getVoucherBatches(ownerId?: number): VoucherBatchRecord[] {
    let batches = [...this.voucherBatches];
    if (ownerId) {
      batches = batches.filter((b) => b.owner_id === ownerId);
    }
    return batches.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getVoucherBatchById(batchId: string): VoucherBatchRecord | undefined {
    const batch = this.voucherBatches.find((b) => b.batch_id === batchId);
    if (!batch) return undefined;
    // Attach vouchers for this batch
    const batchVouchers = this.vouchers.filter((v) => v.batch_tag === batchId);
    return {
      ...batch,
      vouchers: batchVouchers,
    };
  }

  saveVoucherBatch(batch: VoucherBatchRecord): void {
    this.voucherBatches.unshift(batch);
    this.saveToDisk();
  }

  deleteVoucherBatch(batchId: string): boolean {
    const rawBatchId = String(batchId).trim();
    const prevBatches = this.voucherBatches.length;
    const matchedBatch = this.voucherBatches.find(
      (b) => b.batch_id === rawBatchId || (b as any).batch_tag === rawBatchId
    );
    const validTags = new Set<string>([rawBatchId]);
    if (matchedBatch) {
      if (matchedBatch.batch_id) validTags.add(matchedBatch.batch_id);
      if ((matchedBatch as any).batch_tag) validTags.add((matchedBatch as any).batch_tag);
    }

    this.voucherBatches = this.voucherBatches.filter(
      (b) => !validTags.has(b.batch_id) && !validTags.has((b as any).batch_tag)
    );

    const prevVouchersLen = this.vouchers.length;
    const vouchersToRemove = this.vouchers.filter((v) => v.batch_tag && validTags.has(v.batch_tag));
    vouchersToRemove.forEach((v) => {
      if (v.code) {
        this.deleteRadiusUser(v.code);
      }
    });
    this.vouchers = this.vouchers.filter((v) => !v.batch_tag || !validTags.has(v.batch_tag));
    this.saveToDisk();
    return this.voucherBatches.length < prevBatches || this.vouchers.length < prevVouchersLen;
  }

  // --- FreeRADIUS AAA Methods ---
  addRadiusUser(username: string, password: string, plan: PlanRecord, macAddress?: string): void {
    // 1. Remove existing entry if any
    this.radcheck = this.radcheck.filter((r) => r.username !== username);
    this.radreply = this.radreply.filter((r) => r.username !== username);

    // 2. Authentication check: Cleartext-Password := password
    this.radcheck.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      username,
      attribute: 'Cleartext-Password',
      op: ':=',
      value: password,
    });

    // 3. Simultaneous-Use := 1 (no multi-device account sharing)
    this.radcheck.push({
      id: Date.now() + Math.floor(Math.random() * 1000) + 1,
      username,
      attribute: 'Simultaneous-Use',
      op: ':=',
      value: String(plan.shared_users || 1),
    });

    // 4. Time limit / uptime
    if (plan.limit_uptime) {
      this.radcheck.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 2,
        username,
        attribute: 'Max-All-Session',
        op: ':=',
        value: String(plan.limit_uptime),
      });
    }

    // 5. Calling-Station-Id (MAC Lock)
    if (macAddress) {
      this.radcheck.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 3,
        username,
        attribute: 'Calling-Station-Id',
        op: '==',
        value: macAddress,
      });
    }

    // 6. Reply attributes: MikroTik-Rate-Limit (Bandwidth queue)
    if (plan.rate_limit) {
      this.radreply.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 4,
        username,
        attribute: 'MikroTik-Rate-Limit',
        op: '=',
        value: plan.rate_limit,
      });
    }

    // 7. Session-Timeout (Wall-clock expiration in seconds)
    const timeout = plan.limit_uptime || plan.validity_period || 86400;
    this.radreply.push({
      id: Date.now() + Math.floor(Math.random() * 1000) + 5,
      username,
      attribute: 'Session-Timeout',
      op: '=',
      value: String(timeout),
    });

    // 8. MikroTik-Total-Limit (Data quota in bytes)
    if (plan.limit_bytes_total) {
      this.radreply.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 6,
        username,
        attribute: 'MikroTik-Total-Limit',
        op: '=',
        value: String(plan.limit_bytes_total),
      });
    }

    this.saveToDisk();

    // Sync FreeRADIUS records directly to MySQL radcheck & radreply tables
    const userChecks = this.radcheck.filter((r) => r.username === username);
    for (const rc of userChecks) {
      mysqlService.syncRadCheck(rc);
    }
    const userReplies = this.radreply.filter((r) => r.username === username);
    for (const rr of userReplies) {
      mysqlService.syncRadReply(rr);
    }
  }

  getRadiusUser(username: string): { check: RadCheckRecord[]; reply: RadReplyRecord[] } | null {
    const check = this.radcheck.filter((r) => r.username === username);
    const reply = this.radreply.filter((r) => r.username === username);
    if (check.length === 0 && reply.length === 0) return null;
    return { check, reply };
  }

  deleteRadiusUser(username: string): void {
    this.radcheck = this.radcheck.filter((r) => r.username !== username);
    this.radreply = this.radreply.filter((r) => r.username !== username);
    this.saveToDisk();
    mysqlService.deleteRadUser(username);
  }

  getNasList(): NasRecord[] {
    return [...this.nasList];
  }

  addNas(nas: NasRecord): void {
    this.nasList.push(nas);
    this.saveToDisk();
  }

  getSchemaSQL(): string {
    try {
      const schemaPath = path.resolve(process.cwd(), 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        return fs.readFileSync(schemaPath, 'utf8');
      }
    } catch {
      // fallback
    }
    return '-- MySQL schema file located at /schema.sql';
  }

  // --- Free Trial (15-Minute Lifetime Single-Use per MAC) ---
  normalizeMac(mac: string): string {
    if (!mac) return '';
    const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
    if (clean.length === 12) {
      return clean.match(/.{1,2}/g)!.join(':');
    }
    return mac.trim().toUpperCase();
  }

  getFreeTrialClaimByMac(mac: string): FreeTrialClaimRecord | undefined {
    const normalized = this.normalizeMac(mac);
    if (!normalized) return undefined;
    return this.freeTrialClaims.find((c) => this.normalizeMac(c.mac_address) === normalized);
  }

  getFreeTrialConfig(): FreeTrialPackageConfig {
    return { ...this.freeTrialConfig };
  }

  updateFreeTrialConfig(partial: Partial<FreeTrialPackageConfig>): FreeTrialPackageConfig {
    this.freeTrialConfig = {
      ...this.freeTrialConfig,
      ...partial,
      updated_at: new Date().toISOString(),
    };
    this.saveToDisk();
    return { ...this.freeTrialConfig };
  }

  getAllFreeTrialClaims(): FreeTrialClaimRecord[] {
    return [...this.freeTrialClaims].sort(
      (a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime()
    );
  }

  deleteFreeTrialClaimByMac(mac: string): boolean {
    const normalized = this.normalizeMac(mac);
    const initialLen = this.freeTrialClaims.length;
    this.freeTrialClaims = this.freeTrialClaims.filter(
      (c) => this.normalizeMac(c.mac_address) !== normalized
    );
    if (this.freeTrialClaims.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  clearAllFreeTrialClaims(): void {
    this.freeTrialClaims = [];
    this.saveToDisk();
  }

  async claimFreeTrial(
    rawMac: string,
    ip?: string,
    routerId?: number
  ): Promise<{
    success: boolean;
    claim?: FreeTrialClaimRecord;
    voucher?: VoucherRecord;
    error?: string;
  }> {
    try {
      // 1. Verify if free trial is currently enabled
      if (!this.freeTrialConfig.enabled) {
      return {
        success: false,
        error: 'Majaribio ya bure yamezimwa na msimamizi kwa sasa. Tafadhali chagua kifurushi cha kulipia.',
      };
    }

    const normalizedMac = this.normalizeMac(rawMac);
    if (!normalizedMac || normalizedMac.length < 11) {
      return {
        success: false,
        error: 'MAC Address ya kifaa chako haijatambulika. Tafadhali unganisha Wi-Fi upya kisha ujaribu tena.',
      };
    }

    // 2. Check lock policy (LIFETIME, DAILY, WEEKLY)
    const existingClaim = this.getFreeTrialClaimByMac(normalizedMac);
    if (existingClaim) {
      const claimDate = new Date(existingClaim.claimed_at);
      const claimDateStr = claimDate.toLocaleDateString('sw-TZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (this.freeTrialConfig.lock_policy === 'LIFETIME') {
        return {
          success: false,
          error: `Kifaa hiki chenye MAC (${normalizedMac}) kimeshatumia muda wa majaribio ya bure (tarehe ${claimDateStr}). Kila kifaa kinaruhusiwa mara 1 tu milele. Tafadhali nunua kifurushi ili uendelee kufurahia intaneti!`,
        };
      } else if (this.freeTrialConfig.lock_policy === 'DAILY') {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (claimDate.getTime() > oneDayAgo) {
          return {
            success: false,
            error: `Kifaa hiki (${normalizedMac}) kilitumia muda wa majaribio ndani ya saa 24 zilizopita. Jaribu tena baada ya saa 24 au nunua kifurushi sasa!`,
          };
        }
      } else if (this.freeTrialConfig.lock_policy === 'WEEKLY') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (claimDate.getTime() > sevenDaysAgo) {
          return {
            success: false,
            error: `Kifaa hiki (${normalizedMac}) kilitumia muda wa majaribio ndani ya wiki hii. Jaribu tena wiki ijayo au nunua kifurushi sasa!`,
          };
        }
      }
    }

    // Resolve target Router/AP
    const router = routerId ? this.getRouterById(routerId) : this.getRouters()[0];
    const durationMinutes = Math.max(1, this.freeTrialConfig.duration_minutes || 15);
    const durationSeconds = durationMinutes * 60;
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    const rateLimit = this.freeTrialConfig.rate_limit || '2M/4M';
    const quotaBytes = this.freeTrialConfig.quota_mb > 0 ? this.freeTrialConfig.quota_mb * 1024 * 1024 : null;

    // Generate high-entropy trial voucher
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const voucherCode = `FREE-${randomSuffix}`;

    // 1. Create and save Voucher Record
    const voucher: VoucherRecord = {
      id: this.getNextVoucherId(),
      code: voucherCode,
      password: voucherCode,
      plan_id: 1,
      router_id: router?.id,
      owner_id: router?.owner_id,
      mac_address: normalizedMac,
      status: 'ACTIVE',
      batch_tag: `FREE_TRIAL_${durationMinutes}MIN`,
      activated_at: new Date().toISOString(),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.saveVoucher(voucher);

    // 2. Add to FreeRADIUS AAA tables (radcheck and radreply)
    const baseRadId = Date.now();
    this.radcheck.push({
      id: baseRadId,
      username: voucherCode,
      attribute: 'Cleartext-Password',
      op: '==',
      value: voucherCode,
    });

    const replyAttributes: RadReplyRecord[] = [
      {
        id: baseRadId + 1,
        username: voucherCode,
        attribute: 'Session-Timeout',
        op: '=',
        value: String(durationSeconds),
      },
      {
        id: baseRadId + 2,
        username: voucherCode,
        attribute: 'Max-All-Session',
        op: '=',
        value: String(durationSeconds),
      },
    ];

    // Parse rx/tx from rateLimit e.g. "2M/4M" -> up 2M, down 4M
    const [upPart, downPart] = rateLimit.split('/');
    const parseSpeedToBytes = (part?: string, fallback = 2097152) => {
      if (!part) return fallback;
      const num = parseFloat(part);
      if (part.toUpperCase().includes('M')) return Math.round(num * 1048576);
      if (part.toUpperCase().includes('K')) return Math.round(num * 1024);
      return Math.round(num);
    };

    const downBytes = parseSpeedToBytes(downPart, 4194304);
    const upBytes = parseSpeedToBytes(upPart, 2097152);

    replyAttributes.push(
      {
        id: baseRadId + 3,
        username: voucherCode,
        attribute: 'WISPr-Bandwidth-Max-Down',
        op: '=',
        value: String(downBytes),
      },
      {
        id: baseRadId + 4,
        username: voucherCode,
        attribute: 'WISPr-Bandwidth-Max-Up',
        op: '=',
        value: String(upBytes),
      }
    );

    // If data quota limit configured, add RADIUS volume attributes
    if (quotaBytes) {
      replyAttributes.push({
        id: baseRadId + 5,
        username: voucherCode,
        attribute: 'ChilliSpot-Max-Total-Octets',
        op: '=',
        value: String(quotaBytes),
      });
    }

    this.radreply.push(...replyAttributes);

    // 3. Provision user to MikroTik RouterOS / AP
    if (router) {
      try {
        const { MikrotikService } = await import('./mikrotikService.js');
        await MikrotikService.provisionUser(router, {
          username: voucherCode,
          password: voucherCode,
          server: router.hotspot_server_name || 'hotspot1',
          limitUptimeSeconds: durationSeconds,
          limitBytesTotal: quotaBytes || undefined,
          rateLimit: rateLimit,
          macAddress: normalizedMac,
          comment: `TZ-WiFi Free Trial ${durationMinutes}m - MAC:${normalizedMac}`,
        });
      } catch (err) {
        console.error('[FreeTrial] Router provision user notice:', err);
      }
    }

    // 4. Record permanent claim or update existing
    const nextClaimId = this.freeTrialClaims.reduce((max, c) => (c.id > max ? c.id : max), 0) + 1;
    const newClaim: FreeTrialClaimRecord = {
      id: nextClaimId,
      mac_address: normalizedMac,
      user_ip: ip,
      router_id: router?.id,
      owner_id: router?.owner_id,
      voucher_code: voucherCode,
      duration_seconds: durationSeconds,
      rate_limit: rateLimit,
      claimed_at: new Date().toISOString(),
      expires_at: expiresAt,
    };

    // Remove old claim for this MAC if policy is daily/weekly
    this.freeTrialClaims = this.freeTrialClaims.filter(
      (c) => this.normalizeMac(c.mac_address) !== normalizedMac
    );
    this.freeTrialClaims.push(newClaim);
    this.saveToDisk();

    // 5. Audit log
    this.saveAuditLog({
      id: Date.now() + 10,
      external_reference: `TRIAL-${voucherCode}`,
      event_type: 'FREE_TRIAL_ACTIVATED',
      payload_json: {
        mac: normalizedMac,
        voucherCode,
        durationMinutes,
        durationSeconds,
        rateLimit,
        quotaBytes,
        routerId: router?.id,
      },
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      claim: newClaim,
      voucher,
    };
  } catch (err: any) {
    console.error('[FreeTrial] Failed to process claim:', err);
      return {
        success: false,
        error: err.message || 'Hitilafu ya kusajili majaribio ya bure. Tafadhali jaribu tena.',
      };
    }
  }

  public getDataSummary() {
    const totalTransactions = this.transactions.length;
    const totalRevenue = this.transactions
      .filter((t) => t.status === 'SUCCESS')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const vouchersCount = this.vouchers.length;
    const voucherBatchesCount = this.voucherBatches.length;
    const freeTrialClaimsCount = this.freeTrialClaims.length;
    const auditLogsCount = this.auditLogs.length;
    const hotspotOwnersCount = this.owners.filter((o) => o.role === 'HOTSPOT_OWNER').length;
    const routersCount = this.routers.length;
    const plansCount = this.plans.length;

    return {
      totalTransactions,
      totalRevenue,
      vouchersCount,
      voucherBatchesCount,
      freeTrialClaimsCount,
      auditLogsCount,
      hotspotOwnersCount,
      routersCount,
      plansCount,
    };
  }

  public resetSystemForLiveLaunch(options: {
    clearTransactions?: boolean;
    clearVouchers?: boolean;
    clearFreeTrials?: boolean;
    clearAuditLogs?: boolean;
    clearDemoOwners?: boolean;
    clearDemoRouters?: boolean;
    resetPlansToDefault?: boolean;
    resetGatewaySettings?: boolean;
  }) {
    const clearedTransactions = options.clearTransactions !== false ? this.transactions.length : 0;
    const clearedVouchers = options.clearVouchers !== false ? this.vouchers.length : 0;
    const clearedBatches = options.clearVouchers !== false ? this.voucherBatches.length : 0;
    const clearedTrials = options.clearFreeTrials !== false ? this.freeTrialClaims.length : 0;
    const clearedLogs = options.clearAuditLogs !== false ? this.auditLogs.length : 0;

    let clearedOwners = 0;
    let clearedRouters = 0;

    // 1. Purge Transactions (Resets revenue to 0)
    if (options.clearTransactions !== false) {
      this.transactions = [];
    }

    // 2. Purge Vouchers, Batches & RADIUS entries
    if (options.clearVouchers !== false) {
      this.vouchers = [];
      this.voucherBatches = [];
      this.radcheck = [];
      this.radreply = [];
    }

    // 3. Purge Free Trial claims
    if (options.clearFreeTrials !== false) {
      this.freeTrialClaims = [];
    }

    // 4. Purge Audit logs
    if (options.clearAuditLogs !== false) {
      this.auditLogs = [];
    }

    // 5. Purge ALL Owners, Staff, Managers, Cashiers, Technicians (Preserving ONLY Vendor Admin)
    if (options.clearDemoOwners) {
      clearedOwners = this.owners.filter((o) => o.role !== 'VENDOR_ADMIN').length;
      let vendorAdmin = this.owners.find((o) => o.role === 'VENDOR_ADMIN');
      if (!vendorAdmin) {
        vendorAdmin = {
          id: 1,
          name: 'Kelvin Mrema (Vendor HQ)',
          business_name: 'INFOTECH WiFi Cloud Platform',
          email: 'vendor@tzwifi.co.tz',
          phone: '0754111222',
          password: '1234',
          role: 'VENDOR_ADMIN' as const,
          status: 'ACTIVE' as const,
          assigned_router_ids: [],
          commission_rate: 0,
          monthly_fee: 0,
          subscription_fee: 0,
          subscription_status: 'ACTIVE' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      vendorAdmin.assigned_router_ids = [];
      this.owners = [vendorAdmin];
    }

    // 6. Purge Demo Routers
    if (options.clearDemoRouters) {
      clearedRouters = this.routers.length;
      this.routers = [];
    }

    // 7. Reset Plans to Standard Clean Defaults
    if (options.resetPlansToDefault) {
      this.plans = [
        {
          id: 1,
          name: 'Masaa 2 - Kasi ya Juu (2 Hours)',
          type: 'TIME_BASED',
          limit_uptime: 7200,
          limit_bytes_total: null,
          rate_limit: '2M/4M',
          price: 500,
          validity_period: 7200,
          shared_users: 1,
          is_active: true,
          badge: 'HOT_DEAL',
          badge_text: 'Majaribio / Kasi',
          features: ['Masaa 2 bila kikomo cha MB', 'Kasi ya 4 Mbps'],
          description_sw: 'Masaa 2 ya intaneti bila kikomo kwa kasi ya 4Mbps',
          description_en: '2 Hours unlimited browsing at 4Mbps',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'Masaa 6 - Standard (6 Hours)',
          type: 'TIME_BASED',
          limit_uptime: 21600,
          limit_bytes_total: null,
          rate_limit: '3M/6M',
          price: 1000,
          validity_period: 21600,
          shared_users: 1,
          is_active: true,
          badge: 'POPULAR',
          badge_text: 'Inapendwa Zaidi',
          features: ['Masaa 6 ya kazi & masomo', 'Kasi ya 6 Mbps', 'YouTube & TikTok bila kukwama'],
          description_sw: 'Masaa 6 ya kazi, video na kupakua maudhui mtandaoni',
          description_en: '6 Hours for remote work and streaming',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'Masaa 24 (Siku 1) - Unlimited',
          type: 'TIME_BASED',
          limit_uptime: 86400,
          limit_bytes_total: null,
          rate_limit: '3M/8M',
          price: 1500,
          validity_period: 86400,
          shared_users: 1,
          is_active: true,
          badge: 'BEST_VALUE',
          badge_text: 'Thamani Bora',
          features: ['Saa 24 (siku 1) mfululizo', 'Kasi ya 8 Mbps', 'Inafaa kwa kupakua na simu'],
          description_sw: 'Siku 1 kamili (masaa 24) intaneti mfululizo bila kikomo',
          description_en: 'Full 24-hour unlimited connection at high speed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 4,
          name: 'Siku 7 (Wiki 1) - Kasi Kubwa',
          type: 'TIME_BASED',
          limit_uptime: 604800,
          limit_bytes_total: null,
          rate_limit: '4M/10M',
          price: 5000,
          validity_period: 604800,
          shared_users: 1,
          is_active: true,
          badge: 'SUPER_FAST',
          badge_text: 'Kasi Kubwa',
          features: ['Siku 7 mfululizo bila kikomo', 'Kasi kubwa 10 Mbps', 'QoS prioritization kwa kazi'],
          description_sw: 'Wiki nzima (siku 7) intaneti kasi kubwa bila kukatika',
          description_en: '7 Days continuous broadband internet with QoS',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }

    // 8. Log the Reset Event
    this.saveAuditLog({
      id: Date.now(),
      external_reference: `FACTORY-RESET-${Date.now()}`,
      event_type: 'SYSTEM_FACTORY_RESET_FOR_LIVE_LAUNCH',
      payload_json: {
        timestamp: new Date().toISOString(),
        options,
        clearedTransactions,
        clearedVouchers,
        clearedBatches,
        clearedTrials,
        clearedLogs,
        clearedOwners,
        clearedRouters,
      },
      created_at: new Date().toISOString(),
    });

    this.saveToDisk();

    return {
      clearedTransactions,
      clearedVouchers,
      clearedBatches,
      clearedTrials,
      clearedLogs,
      clearedOwners,
      clearedRouters,
      remainingOwners: this.owners.length,
      remainingRouters: this.routers.length,
      remainingPlans: this.plans.length,
    };
  }

  // --- Manual Subscription Requests ---
  getManualSubscriptionRequests(): ManualSubscriptionRequest[] {
    return [...this.manualSubRequests];
  }

  getManualSubscriptionRequestById(id: number): ManualSubscriptionRequest | undefined {
    return this.manualSubRequests.find((r) => r.id === id);
  }

  getNextManualSubscriptionRequestId(): number {
    return this.manualSubRequests.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
  }

  saveManualSubscriptionRequest(req: ManualSubscriptionRequest): ManualSubscriptionRequest {
    const idx = this.manualSubRequests.findIndex((r) => r.id === req.id);
    req.updated_at = new Date().toISOString();
    if (idx >= 0) {
      this.manualSubRequests[idx] = req;
    } else {
      if (!req.created_at) req.created_at = new Date().toISOString();
      this.manualSubRequests.push(req);
    }
    this.saveToDisk();
    return req;
  }

  deleteManualSubscriptionRequest(id: number): boolean {
    const initialLen = this.manualSubRequests.length;
    this.manualSubRequests = this.manualSubRequests.filter((r) => r.id !== id);
    if (this.manualSubRequests.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // --- Company Public Information (About Us & Contacts) ---
  getCompanyInfo(): CompanyPublicInfo {
    return JSON.parse(JSON.stringify(this.companyInfo));
  }

  updateCompanyInfo(updates: Partial<CompanyPublicInfo>): CompanyPublicInfo {
    this.companyInfo = {
      ...this.companyInfo,
      ...updates,
      services: updates.services || this.companyInfo.services || DEFAULT_COMPANY_INFO.services,
      stats: {
        ...this.companyInfo.stats,
        ...(updates.stats || {}),
      },
      social_links: {
        ...this.companyInfo.social_links,
        ...(updates.social_links || {}),
      },
      coverage_locations: updates.coverage_locations || this.companyInfo.coverage_locations || DEFAULT_COMPANY_INFO.coverage_locations,
      updated_at: new Date().toISOString(),
    };
    this.saveToDisk();
    return this.getCompanyInfo();
  }


  getDatabaseHealthInfo() {
    let fileSizeKb = 0;
    let lastModified = new Date().toISOString();
    try {
      if (fs.existsSync(DB_FILE)) {
        const stats = fs.statSync(DB_FILE);
        fileSizeKb = Math.round((stats.size / 1024) * 10) / 10;
        lastModified = stats.mtime.toISOString();
      }
    } catch (e) {
      console.error('Error reading DB_FILE stats:', e);
    }

    return {
      status: 'CONNECTED',
      engine: 'Persistent Storage Engine & FreeRADIUS Engine (MySQL Compatible)',
      storagePath: DB_FILE,
      schemaFile: 'schema.sql',
      fileSizeKb,
      lastModified,
      uptimeSeconds: Math.floor(process.uptime()),
      tables: {
        hotspot_owners: {
          count: this.owners.length,
          description: 'Wamiliki wa Hotspot & Msimamizi Mkuu (Tenants)',
          schemaTable: 'hotspot_owners',
          lastRecordTime: this.owners[this.owners.length - 1]?.created_at || null,
        },
        routers: {
          count: this.routers.length,
          description: 'Vifaa vya Wi-Fi (MikroTik, Ruijie, Omada, OpenWrt, UniFi)',
          schemaTable: 'routers',
          lastRecordTime: this.routers[this.routers.length - 1]?.created_at || null,
        },
        billing_plans: {
          count: this.plans.length,
          description: 'Vifurushi vya Muda na Data (Time, Data, Unlimited)',
          schemaTable: 'billing_plans',
          lastRecordTime: this.plans[this.plans.length - 1]?.created_at || null,
        },
        transactions: {
          count: this.transactions.length,
          description: 'Miamala ya Malipo ya Wateja (PalmPesa, AzamPay, Vodacom)',
          schemaTable: 'transactions',
          lastRecordTime: this.transactions[this.transactions.length - 1]?.created_at || null,
        },
        vouchers: {
          count: this.vouchers.length,
          description: 'Vocha za Wi-Fi zilizozalishwa & Hali zake',
          schemaTable: 'vouchers',
          lastRecordTime: this.vouchers[this.vouchers.length - 1]?.created_at || null,
        },
        voucher_batches: {
          count: this.voucherBatches.length,
          description: 'Makundi ya Vocha za Kuchapisha (Voucher Batches)',
          schemaTable: 'voucher_batches',
          lastRecordTime: this.voucherBatches[this.voucherBatches.length - 1]?.created_at || null,
        },
        radcheck: {
          count: this.radcheck.length,
          description: 'FreeRADIUS AAA Auth Records (radcheck table)',
          schemaTable: 'radcheck',
          lastRecordTime: null,
        },
        radreply: {
          count: this.radreply.length,
          description: 'FreeRADIUS Attributes & Rate Limits (radreply table)',
          schemaTable: 'radreply',
          lastRecordTime: null,
        },
        nas: {
          count: this.nasList.length,
          description: 'FreeRADIUS Network Access Servers (nas table)',
          schemaTable: 'nas',
          lastRecordTime: null,
        },
        transaction_audit_logs: {
          count: this.auditLogs.length,
          description: 'Kumbukumbu za Ulinzi na Miamala (Audit Logs)',
          schemaTable: 'transaction_audit_logs',
          lastRecordTime: this.auditLogs[0]?.created_at || null,
        },
        free_trial_claims: {
          count: this.freeTrialClaims.length,
          description: 'Watumiaji waliotumia Jaribio la Bure (MAC & Phone Claims)',
          schemaTable: 'free_trial_claims',
          lastRecordTime: this.freeTrialClaims[this.freeTrialClaims.length - 1]?.claimed_at || null,
        },
        manual_sub_requests: {
          count: this.manualSubRequests.length,
          description: 'Maombi ya Uhakiki wa Usajili wa Wamiliki (Subscriptions)',
          schemaTable: 'manual_sub_requests',
          lastRecordTime: this.manualSubRequests[this.manualSubRequests.length - 1]?.created_at || null,
        },
      },
      env: {
        nodeVersion: process.version,
        platform: process.platform,
        dataDir: DATA_DIR,
      },
    };
  }

}

export const db = new PersistentDatabase();
