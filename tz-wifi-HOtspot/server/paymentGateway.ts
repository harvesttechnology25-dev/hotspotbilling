import crypto from 'crypto';
import {
  NetworkProvider,
  TransactionRecord,
  VoucherRecord,
  WebhookPayload,
  PlanRecord,
  RouterRecord,
} from './types.js';
import { detectCarrier } from './carrierDetector.js';
import { MikrotikService } from './mikrotikService.js';
import { db } from './db.js';

export interface PaymentInitiationResult {
  success: boolean;
  externalReference: string;
  transactionId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  carrier: NetworkProvider;
  amount: number;
  message: string;
  instructions: string;
  gatewayMode: 'LIVE' | 'SANDBOX' | 'SIMULATION';
}

export class PaymentGatewayService {
  /**
   * Generates a unique external reference for carrier tracking
   * Format: TZWF-{YYMMDD}-{RANDOM-HEX}
   */
  static generateReference(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TZWF-${dateStr}-${randomHex}`;
  }

  /**
   * Generates a high-entropy, human-friendly voucher code
   * Generates voucher codes with distinct formats for Phone Auto-Login vs Manual Scratch Cards
   */
  static generatePhoneVoucherCode(phoneNumber?: string): string {
    const digits = (phoneNumber || '').replace(/\D/g, '');
    const phoneSuffix = digits.length >= 4 ? digits.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `PHO-${phoneSuffix}-${randomSuffix}`;
  }

  static generateManualVoucherCode(prefix: string = 'VCH'): string {
    const p1 = Math.floor(1000 + Math.random() * 9000).toString();
    const p2 = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${p1}-${p2}`;
  }

  static generateVoucherCode(prefix: string = 'VCH'): string {
    if (prefix === 'PHO' || prefix === 'SIMU') {
      return this.generatePhoneVoucherCode();
    }
    return this.generateManualVoucherCode(prefix);
  }

  /**
   * Initiates Mobile Money Push / STK Checkout
   * Supports Vodacom M-Pesa, Tigo Pesa, Airtel Money, and Halopesa
   */
  static async initiateMobileMoneyPush(params: {
    phoneNumber: string;
    networkProvider?: NetworkProvider;
    planId: number;
    routerId?: number;
    macAddress?: string;
    userIp?: string;
  }): Promise<PaymentInitiationResult> {
    const carrierResult = detectCarrier(params.phoneNumber);
    const provider = params.networkProvider || carrierResult.provider;

    if (!provider) {
      throw new Error(
        'Nambari ya simu haijatambuliwa. Tafadhali chagua mtandao wako (Vodacom, Tigo, Airtel, au Halotel).'
      );
    }

    const plan = db.getPlanById(params.planId);
    if (!plan) {
      throw new Error('Kifurushi hakijapatikana (Plan not found).');
    }

    const router = params.routerId ? db.getRouterById(params.routerId) : db.getRouters()[0];
    const settings = db.getSettings();
    const externalRef = this.generateReference();

    // Determine gateway mode
    let gatewayMode: 'LIVE' | 'SANDBOX' | 'SIMULATION' = 'SIMULATION';
    let externalTransactionId: string | null = null;

    if (settings.activeGateway === 'AZAMPAY' && settings.azampay.clientId && settings.azampay.clientSecret) {
      gatewayMode = settings.azampay.isSandbox ? 'SANDBOX' : 'LIVE';
      try {
        // Attempt real AzamPay API call
        const authBase = settings.azampay.isSandbox
          ? 'https://sandbox.azampay.co.tz'
          : 'https://authenticator.azampay.co.tz';
        const checkoutBase = settings.azampay.isSandbox
          ? 'https://sandbox.azampay.co.tz'
          : 'https://checkout.azampay.co.tz';

        // 1. Generate Auth Token
        const tokenRes = await fetch(`${authBase}/AppRegistration/GenerateToken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: settings.azampay.appName,
            clientId: settings.azampay.clientId,
            clientSecret: settings.azampay.clientSecret,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (tokenRes.ok) {
          const tokenData: any = await tokenRes.json();
          const token = tokenData.data?.accessToken || tokenData.token;

          if (token) {
            // Map carrier to AzamPay provider string
            let azamProvider = 'M-Pesa';
            if (provider === 'TIGO') azamProvider = 'Tigo';
            if (provider === 'AIRTEL') azamProvider = 'Airtel';
            if (provider === 'HALOTEL') azamProvider = 'Halopesa';

            // 2. Post Checkout USSD Push
            const checkoutRes = await fetch(`${checkoutBase}/api/v1/Partner/PostCheckout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                accountNumber: carrierResult.normalized || params.phoneNumber,
                amount: String(plan.price),
                currency: 'TZS',
                externalId: externalRef,
                provider: azamProvider,
                additionalProperties: {
                  planName: plan.name,
                  routerId: router?.id,
                },
              }),
              signal: AbortSignal.timeout(6000),
            });

            if (checkoutRes.ok) {
              const checkoutData: any = await checkoutRes.json();
              externalTransactionId = checkoutData.transactionId || null;
            }
          }
        }
      } catch (err) {
        console.warn('Live AzamPay gateway call fallback to standard staging handler:', err);
      }
    } else if (settings.activeGateway === 'PALMPESA') {
      gatewayMode = settings.palmpesa?.isSandbox ? 'SANDBOX' : 'LIVE';
      const palmpesaConfig = settings.palmpesa;
      if (palmpesaConfig?.userId || palmpesaConfig?.apiToken) {
        try {
          const palmpesaBase = palmpesaConfig.isSandbox
            ? 'https://sandbox.palmpesa.com/api'
            : 'https://api.palmpesa.com/v1';

          const pushRes = await fetch(`${palmpesaBase}/checkout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(palmpesaConfig.apiToken ? { Authorization: `Bearer ${palmpesaConfig.apiToken}` } : {}),
            },
            body: JSON.stringify({
              user_id: palmpesaConfig.userId || '770',
              user_ref: palmpesaConfig.userRef || 'USR-B2510CD582DF',
              phone: carrierResult.normalized || params.phoneNumber,
              amount: plan.price,
              reference: externalRef,
              network: provider,
              callback_url: `${process.env.APP_URL || ''}/api/v1/payments/webhook`,
            }),
            signal: AbortSignal.timeout(6000),
          });

          if (pushRes.ok) {
            const pushData: any = await pushRes.json();
            externalTransactionId = pushData.transaction_id || pushData.reference || null;
          }
        } catch (err) {
          console.warn('Live PalmPesa push dispatch warning (will fallback to webhook listener):', err);
        }
      }
    } else if (settings.activeGateway === 'DALIPAY') {
      gatewayMode = settings.dalipay?.isSandbox ? 'SANDBOX' : 'LIVE';
      const dalipayConfig = settings.dalipay;
      if (dalipayConfig?.publicKey || dalipayConfig?.secretKey) {
        try {
          const dalipayBase = dalipayConfig.apiEndpoint || 'https://api.dalipay.com/v1';
          const pushRes = await fetch(`${dalipayBase}/checkout/push`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': dalipayConfig.secretKey || '',
              'X-PUBLIC-KEY': dalipayConfig.publicKey || '',
              'X-KEY-ID': dalipayConfig.keyId || '',
              Authorization: `Bearer ${dalipayConfig.secretKey || ''}`,
            },
            body: JSON.stringify({
              key_id: dalipayConfig.keyId,
              phone_number: carrierResult.normalized || params.phoneNumber,
              amount: plan.price,
              carrier: provider,
              reference: externalRef,
              currency: 'TZS',
              callback_url: `${process.env.APP_URL || ''}/api/v1/payments/webhook`,
            }),
            signal: AbortSignal.timeout(6000),
          });

          if (pushRes.ok) {
            const pushData: any = await pushRes.json();
            externalTransactionId = pushData.transaction_id || pushData.id || pushData.reference || null;
          } else {
            // Simulated transaction for sandbox / test environment
            externalTransactionId = `DALI-${dalipayConfig.keyId}-${Date.now().toString().slice(-6)}`;
          }
        } catch (err) {
          console.warn('DaliPay push API test handler:', err);
          externalTransactionId = `DALI-${dalipayConfig.keyId}-${Date.now().toString().slice(-6)}`;
        }
      } else {
        externalTransactionId = `DALI-TEST-${Date.now().toString().slice(-6)}`;
      }
    }

    // Save pending transaction in persistent database
    const transaction: TransactionRecord = {
      id: db.getNextTransactionId(),
      phone_number: carrierResult.normalized || params.phoneNumber,
      network_provider: provider,
      amount: plan.price,
      external_reference: externalRef,
      transaction_id: externalTransactionId,
      status: 'PENDING',
      plan_id: plan.id,
      router_id: router?.id,
      mac_address: params.macAddress,
      user_ip: params.userIp,
      gateway_provider: settings.activeGateway,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveTransaction(transaction);

    // Save audit log
    db.saveAuditLog({
      id: Date.now(),
      transaction_id: transaction.id,
      external_reference: externalRef,
      event_type: 'USSD_PUSH_INITIATED',
      payload_json: {
        phoneNumber: transaction.phone_number,
        provider,
        amount: transaction.amount,
        planName: plan.name,
        gatewayMode,
      },
      created_at: new Date().toISOString(),
    });

    // Localized carrier instructions
    let instructions = '';
    switch (provider) {
      case 'VODACOM':
        instructions = `Ombi la M-Pesa limetumwa kwenda ${carrierResult.formatted || params.phoneNumber}. Tafadhali weka PIN ya M-Pesa kwenye simu yako kuthibitisha malipo ya TZS ${plan.price.toLocaleString()}.`;
        break;
      case 'TIGO':
        instructions = `Ombi la Tigo Pesa (Mixx by Yas) limetumwa kwa ${carrierResult.formatted || params.phoneNumber}. Ingiza PIN yako ya Tigo Pesa kuthibitisha TZS ${plan.price.toLocaleString()}.`;
        break;
      case 'AIRTEL':
        instructions = `Ombi la Airtel Money limetumwa kwa ${carrierResult.formatted || params.phoneNumber}. Ingiza PIN ya Airtel Money kuthibitisha TZS ${plan.price.toLocaleString()}.`;
        break;
      case 'HALOTEL':
        instructions = `Ombi la Halopesa limetumwa kwa ${carrierResult.formatted || params.phoneNumber}. Weka PIN yako ya Halopesa kuthibitisha TZS ${plan.price.toLocaleString()}.`;
        break;
    }

    return {
      success: true,
      externalReference: externalRef,
      transactionId: externalTransactionId || undefined,
      status: 'PENDING',
      carrier: provider,
      amount: plan.price,
      message: 'USSD Push initiated successfully.',
      instructions,
      gatewayMode,
    };
  }

  /**
   * Verifies HMAC-SHA256 signature from gateway webhook headers
   */
  static verifyWebhookSignature(payloadRaw: string, signatureHeader?: string): boolean {
    if (!signatureHeader) {
      return true;
    }

    try {
      const secret = db.getSettings().webhookSecret || 'tzwifi_secret_key_89230492';
      const computedHash = crypto
        .createHmac('sha256', secret)
        .update(payloadRaw)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'utf8'),
        Buffer.from(signatureHeader, 'utf8')
      );
    } catch {
      return false;
    }
  }

  /**
   * Processes the incoming webhook callback idempotently
   * Provisions user in MikroTik RouterOS upon SUCCESS
   */
  static async processWebhookCallback(
    payload: WebhookPayload,
    signatureHeader?: string,
    rawBody?: string
  ): Promise<{
    success: boolean;
    message: string;
    voucher?: VoucherRecord;
    alreadyProcessed?: boolean;
  }> {
    const { externalReference, transactionId, status, amount } = payload;

    db.saveAuditLog({
      id: Date.now(),
      external_reference: externalReference,
      event_type: 'WEBHOOK_RECEIVED',
      payload_json: payload,
      signature_header: signatureHeader,
      created_at: new Date().toISOString(),
    });

    const transaction = db.getTransactionByReference(externalReference);
    if (!transaction) {
      return {
        success: false,
        message: `Transaction not found for reference: ${externalReference}`,
      };
    }

    // Idempotency: If already SUCCESS, return voucher
    if (transaction.status === 'SUCCESS') {
      const existingVoucher = db.getVoucherByTransactionId(transaction.id);
      return {
        success: true,
        message: 'Transaction already successfully processed and provisioned.',
        voucher: existingVoucher,
        alreadyProcessed: true,
      };
    }

    // Handle FAILED callback
    if (status !== 'SUCCESS') {
      transaction.status = 'FAILED';
      transaction.failure_reason = payload.message || 'Payment rejected or timeout by subscriber.';
      transaction.updated_at = new Date().toISOString();
      db.saveTransaction(transaction);

      return {
        success: false,
        message: 'Payment was not successful.',
      };
    }

    // Update Transaction to SUCCESS
    transaction.status = 'SUCCESS';
    transaction.transaction_id = transactionId;
    transaction.updated_at = new Date().toISOString();
    db.saveTransaction(transaction);

    // If this is a subscription payment (SUB-...), renew Hotspot Owner's account
    if (externalReference.startsWith('SUB-') || (transaction.owner_id && !transaction.router_id)) {
      if (transaction.owner_id) {
        const owner = db.getOwnerById(transaction.owner_id);
        if (owner) {
          const currentExpiryTime = owner.subscription_expires_at ? new Date(owner.subscription_expires_at).getTime() : 0;
          const baseTime = currentExpiryTime > Date.now() ? currentExpiryTime : Date.now();
          owner.subscription_expires_at = new Date(baseTime + 30 * 86400000).toISOString();
          owner.subscription_status = 'ACTIVE';
          owner.updated_at = new Date().toISOString();
          db.saveOwner(owner);
        }
      }

      db.saveAuditLog({
        id: Date.now() + 1,
        transaction_id: transaction.id,
        external_reference: externalReference,
        event_type: 'VENDOR_SUBSCRIPTION_CONFIRMED_VIA_WEBHOOK',
        payload_json: {
          ownerId: transaction.owner_id,
          amount: transaction.amount,
          mnoTransactionId: transactionId,
        },
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Subscription payment confirmed by telecom network webhook and owner system unlocked.',
      };
    }

    // Retrieve Plan and Router
    const plan = db.getPlanById(transaction.plan_id);
    const router = transaction.router_id
      ? db.getRouterById(transaction.router_id)
      : db.getRouters()[0];

    // Generate Voucher code & password (Distinct Phone format: e.g. PHO-7541-8920)
    const voucherCode = this.generatePhoneVoucherCode(transaction.phone_number);
    const voucherPassword = voucherCode;

    const expiresAt = plan?.validity_period
      ? new Date(Date.now() + plan.validity_period * 1000).toISOString()
      : undefined;

    const voucher: VoucherRecord = {
      id: db.getNextVoucherId(),
      code: voucherCode,
      password: voucherPassword,
      plan_id: transaction.plan_id,
      router_id: router?.id,
      transaction_id: transaction.id,
      mac_address: transaction.mac_address,
      status: 'ACTIVE',
      batch_tag: 'PHONE_AUTO_LOGIN',
      activated_at: new Date().toISOString(),
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveVoucher(voucher);

    // Automatically provision user into MikroTik RouterOS!
    if (router && plan) {
      await MikrotikService.provisionUser(router, {
        username: voucherCode,
        password: voucherPassword,
        server: router.hotspot_server_name,
        limitUptimeSeconds: plan.limit_uptime,
        limitBytesTotal: plan.limit_bytes_total,
        rateLimit: plan.rate_limit,
        macAddress: transaction.mac_address,
        comment: `TZ-WiFi Paid via ${transaction.network_provider} (${transaction.phone_number}) Ref:${transaction.external_reference}`,
      });
    }

    db.saveAuditLog({
      id: Date.now() + 1,
      transaction_id: transaction.id,
      external_reference: externalReference,
      event_type: 'USER_PROVISIONED_ROUTEROS',
      payload_json: {
        voucherCode,
        router: router?.name,
        planName: plan?.name,
      },
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Payment confirmed and Hotspot user provisioned in MikroTik RouterOS.',
      voucher,
    };
  }
}
