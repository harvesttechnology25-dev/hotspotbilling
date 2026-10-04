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
          let updated = false;
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
    this.transactions = [];
    this.vouchers = [];
  }

  // --- Settings ---
  getSettings(): GatewaySettings {
    return { ...this.settings };
  }

  saveSettings(newSettings: Partial): GatewaySettings {
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
    this.saveToDisk();
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
    return v;
  }

  deleteVoucher(id: number): boolean {
    const initialLen = this.vouchers.length;
    this.vouchers = this.vouchers.filter((v) => v.id !== id);
    if (this.vouchers.length !== initialLen) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  deleteVoucherByCode(code: string): boolean {
    const initialLen = this.vouchers.length;
    this.vouchers = this.vouchers.filter(
      (v) => v.code.toUpperCase() !== code.trim().toUpperCase()
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
    }
  ) {
    let transactions = [...this.transactions];
    let vouchers = [...this.vouchers];
    const plansMap = new Map(this.plans.map((p) => [p.id, p]));

    if (ownerId) {
      const owner = this.getOwnerById(ownerId);
      if (owner && owner.role === 'HOTSPOT_OWNER') {
        const allowedRouters = new Set(owner.assigned_router_ids);
        transactions = transactions.filter((t) => t.router_id && allowedRouters.has(t.router_id));
        vouchers = vouchers.filter((v) => v.router_id && allowedRouters.has(v.router_id));
      }
    }

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

    const rangeTransactions = transactions.filter((t) => inRange(t.created_at));
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

    const manualVouchers = vouchers.filter((v) => !v.transaction_id);
    const rangeManualVouchers = manualVouchers.filter((v) => inRange(v.activated_at || v.created_at));
    const soldManualVouchers = rangeManualVouchers.filter(
      (v) => v.status === 'ACTIVE' || v.status === 'EXPIRED'
    );
    const manualVoucherRevenue = soldManualVouchers.reduce((sum, v) => {
      const plan = plansMap.get(v.plan_id);
      return sum + (plan ? plan.price : 1000);
    }, 0);

    const availableManualVouchers = vouchers.filter((v) => v.status === 'AVAILABLE');
    const manualVouchersStockValue = availableManualVouchers.reduce((sum, v) => {
      const plan = plansMap.get(v.plan_id);
      return sum + (plan ? plan.price : 1000);
    }, 0);

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
    const prevBatches = this.voucherBatches.length;
    this.voucherBatches = this.voucherBatches.filter((b) => b.batch_id !== batchId && b.batch_tag !== batchId);
    const vouchersToRemove = this.vouchers.filter((v) => v.batch_tag === batchId);
    vouchersToRemove.forEach((v) => {
      this.deleteRadiusUser(v.code);
    });
    this.vouchers = this.vouchers.filter((v) => v.batch_tag !== batchId);
    this.saveToDisk();
    return this.voucherBatches.length < prevBatches;
  }

  // --- FreeRADIUS AAA Methods ---
  addRadiusUser(username: string, password: string, plan: PlanRecord, macAddress?: string): void {
    this.radcheck = this.radcheck.filter((r) => r.username !== username);
    this.radreply = this.radreply.filter((r) => r.username !== username);

    this.radcheck.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      username,
      attribute: 'Cleartext-Password',
      op: ':=',
      value: password,
    });

    this.radcheck.push({
      id: Date.now() + Math.floor(Math.random() * 1000) + 1,
      username,
      attribute: 'Simultaneous-Use',
      op: ':=',
      value: String(plan.shared_users || 1),
    });

    if (plan.limit_uptime) {
      this.radcheck.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 2,
        username,
        attribute: 'Max-All-Session',
        op: ':=',
        value: String(plan.limit_uptime),
      });
    }

    if (macAddress) {
      this.radcheck.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 3,
        username,
        attribute: 'Calling-Station-Id',
        op: '==',
        value: macAddress,
      });
    }

    if (plan.rate_limit) {
      this.radreply.push({
        id: Date.now() + Math.floor(Math.random() * 1000) + 4,
        username,
        attribute: 'MikroTik-Rate-Limit',
        op: '=',
        value: plan.rate_limit,
      });
    }

    const timeout = plan.limit_uptime || plan.validity_period || 86400;
    this.radreply.push({
      id: Date.now() + Math.floor(Math.random() * 1000) + 5,
      username,
      attribute: 'Session-Timeout',
      op: '=',
      value: String(timeout),
    });

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

  updateFreeTrialConfig(partial: Partial): FreeTrialPackageConfig {
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
            error: `Kifaa hiki chenye MAC (\({normalizedMac}) kimeshatumia muda wa majaribio ya bure (tarehe\){claimDateStr}). Kila kifaa kinaruhusiwa mara 1 tu milele. Tafadhali nunua kifurushi ili uendelee kufurahia intaneti!`,
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

      const router = routerId ? this.getRouterById(routerId) : this.getRouters()[0];
      const durationMinutes = Math.max(1, this.freeTrialConfig.duration_minutes || 15);
      const durationSeconds = durationMinutes * 60;
      const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
      const rateLimit = this.freeTrialConfig.rate_limit || '2M/4M';
      const quotaBytes = this.freeTrialConfig.quota_mb > 0 ? this.freeTrialConfig.quota_mb * 1024 * 1024 : null;

      const randomSuffix = Math.floor(10000 + Math.random() * 90000);
      const voucherCode = `FREE-${randomSuffix}`;

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
            comment: `TZ-WiFi Free Trial \({durationMinutes}m - MAC:\){normalizedMac}`,
          });
        } catch (err) {
          console.error('[FreeTrial] Router provision user notice:', err);
        }
      }

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

      this.freeTrialClaims = this.freeTrialClaims.filter(
        (c) => this.normalizeMac(c.mac_address) !== normalizedMac
      );
      this.freeTrialClaims.push(newClaim);
      this.saveToDisk();

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

  // --- System Summary & Reset ---
  getDataSummary() {
    return {
      totalOwners: this.owners.length,
      totalRouters: this.routers.length,
      totalPlans: this.plans.length,
      totalTransactions: this.transactions.length,
      totalVouchers: this.vouchers.length,
      totalFreeTrialClaims: this.freeTrialClaims.length,
      totalAuditLogs: this.auditLogs.length,
    };
  }

  resetSystemForLiveLaunch(options: {
    clearTransactions?: boolean;
    clearVouchers?: boolean;
    clearFreeTrials?: boolean;
    clearAuditLogs?: boolean;
    clearDemoOwners?: boolean;
    clearDemoRouters?: boolean;
    resetPlansToDefault?: boolean;
  }) {
    if (options.clearTransactions) {
      this.transactions = [];
    }
    if (options.clearVouchers) {
      this.vouchers = [];
      this.voucherBatches = [];
      this.radcheck = [];
      this.radreply = [];
    }
    if (options.clearFreeTrials) {
      this.freeTrialClaims = [];
    }
    if (options.clearAuditLogs) {
      this.auditLogs = [];
    }
    if (options.clearDemoOwners) {
      this.owners = this.owners.filter((o) => o.role === 'VENDOR_ADMIN');
    }
    if (options.clearDemoRouters) {
      this.routers = [];
    }
    if (options.resetPlansToDefault) {
      this.seedDefaults();
    }
    this.saveToDisk();
    return this.getDataSummary();
  }

  // --- Company Public Information ---
  getCompanyInfo(): CompanyPublicInfo {
    return { ...this.companyInfo };
  }

  updateCompanyInfo(updates: Partial): CompanyPublicInfo {
    this.companyInfo = {
      ...this.companyInfo,
      ...updates,
      services: updates.services || this.companyInfo.services,
      stats: {
        ...this.companyInfo.stats,
        ...(updates.stats || {}),
      },
      social_links: {
        ...this.companyInfo.social_links,
        ...(updates.social_links || {}),
      },
      updated_at: new Date().toISOString(),
    };
    this.saveToDisk();
    return { ...this.companyInfo };
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
}

export const db = new PersistentDatabase();