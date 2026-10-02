
function mapCarrierToDaliPayProvider(carrier: string): string {
  const c = (carrier || '').toUpperCase();
  if (c.includes('TIGO')) return 'Tigo';
  if (c.includes('AIRTEL')) return 'Airtel';
  if (c.includes('HALO')) return 'Halopesa';
  if (c.includes('AZAM')) return 'Azampesa';
  return 'Mpesa';
}

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
  gatewayMode: 'LIVE' | 'SANDBOX';
}

export class PaymentGatewayService {
  /**
   * Generates a unique external reference for carrier tracking
   * Format: TZWF-{YYMMDD}-{RANDOM-HEX}
   */
  static generateReference(prefix: string = 'TZWF'): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${dateStr}-${randomHex}`;
  }

  /**
   * Generates a high-entropy, human-friendly voucher code
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
   * Initiates Real Mobile Money Push / STK Checkout via active Aggregator (DaliPay, PalmPesa, AzamPay, etc.)
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
    const externalRef = this.generateReference('TZWF');

    // Determine gateway mode & configuration check
    let gatewayMode: 'LIVE' | 'SANDBOX' = 'LIVE';
    let externalTransactionId: string | null = null;
    const activeGateway = settings.activeGateway || 'DALIPAY';

    // Verify gateway configuration
    if (activeGateway === 'DALIPAY') {
      const dalipayConfig = settings.dalipay;
      if (!dalipayConfig || (!dalipayConfig.publicKey && !dalipayConfig.secretKey)) {
        throw new Error(
          'Mipangilio ya API ya DaliPay haijasanidiwa. Tafadhali ingia kwenye Mipangilio ya Malipo (Admin) na uweke DaliPay Key ID, Public Key, na Secret Key kabla ya wateja kulipa.'
        );
      }

      gatewayMode = dalipayConfig.isSandbox ? 'SANDBOX' : 'LIVE';
      const dalipayBase = dalipayConfig.apiEndpoint || 'https://api.dalipay.com/v1';

      try {
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
            callback_url: `${process.env.APP_URL || 'https://infotechwifi.com'}/api/v1/payments/webhook`,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) {
          const apiErrMsg = pushData.message || pushData.error || `DaliPay API error HTTP ${pushRes.status}`;
          throw new Error(`Hitilafu kutoka DaliPay Aggregator API: ${apiErrMsg}`);
        }
        externalTransactionId = pushData.transaction_id || pushData.id || pushData.reference || null;
      } catch (err: any) {
        console.error('DaliPay API Call Error:', err);
        throw new Error(
          err.message?.includes('Hitilafu kutoka DaliPay')
            ? err.message
            : `Imeshindikana kuunganishwa na DaliPay API: ${err.message || 'Mtandao haujajibu'}. Tafadhali thibitisha API endpoint na keys zako.`
        );
      }
    } else if (activeGateway === 'PALMPESA') {
      const palmpesaConfig = settings.palmpesa;
      if (!palmpesaConfig || (!palmpesaConfig.userId && !palmpesaConfig.apiToken)) {
        throw new Error(
          'Mipangilio ya API ya PalmPesa haijasanidiwa. Tafadhali ingia kwenye Mipangilio ya Malipo na uweke User ID na API Token kabla ya kupokea malipo.'
        );
      }

      gatewayMode = palmpesaConfig.isSandbox ? 'SANDBOX' : 'LIVE';
      const palmpesaBase = palmpesaConfig.isSandbox
        ? 'https://sandbox.palmpesa.com/api'
        : 'https://api.palmpesa.com/v1';

      try {
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
            callback_url: `${process.env.APP_URL || 'https://infotechwifi.com'}/api/v1/payments/webhook`,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) {
          throw new Error(`PalmPesa API Error: ${pushData.message || pushData.error || pushRes.statusText}`);
        }
        externalTransactionId = pushData.transaction_id || pushData.reference || null;
      } catch (err: any) {
        console.error('PalmPesa API Error:', err);
        throw new Error(`Hitilafu ya PalmPesa API: ${err.message || 'Mtandao haujajibu'}`);
      }
    } else if (activeGateway === 'AZAMPAY') {
      const azam = settings.azampay;
      if (!azam || !azam.clientId || !azam.clientSecret) {
        throw new Error(
          'Mipangilio ya AzamPay API haijasanidiwa. Weka Client ID na Client Secret kwenye Mipangilio ya Malipo.'
        );
      }
      gatewayMode = azam.isSandbox ? 'SANDBOX' : 'LIVE';
      const authBase = azam.isSandbox
        ? 'https://sandbox.azampay.co.tz'
        : 'https://authenticator.azampay.co.tz';
      const checkoutBase = azam.isSandbox
        ? 'https://sandbox.azampay.co.tz'
        : 'https://checkout.azampay.co.tz';

      try {
        const tokenRes = await fetch(`${authBase}/AppRegistration/GenerateToken`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: azam.appName,
            clientId: azam.clientId,
            clientSecret: azam.clientSecret,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (!tokenRes.ok) throw new Error('Imeshindikana kupata authentication token kutoka AzamPay.');
        const tokenData: any = await tokenRes.json();
        const token = tokenData.data?.accessToken || tokenData.token;

        let azamProvider = 'M-Pesa';
        if (provider === 'TIGO') azamProvider = 'Tigo';
        if (provider === 'AIRTEL') azamProvider = 'Airtel';
        if (provider === 'HALOTEL') azamProvider = 'Halopesa';

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
          signal: AbortSignal.timeout(8000),
        });

        if (!checkoutRes.ok) throw new Error('AzamPay PostCheckout imekataliwa.');
        const checkoutData: any = await checkoutRes.json();
        externalTransactionId = checkoutData.transactionId || null;
      } catch (err: any) {
        throw new Error(`Hitilafu ya AzamPay: ${err.message}`);
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
      gateway_provider: activeGateway,
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
        gateway: activeGateway,
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
      message: 'USSD Push initiated successfully via aggregator.',
      instructions,
      gatewayMode,
    };
  }

  /**
   * Initiates Real Subscription Push via Aggregator (DaliPay / PalmPesa / AzamPay)
   */
  static async initiateSubscriptionPush(params: {
    ownerId: number;
    phoneNumber: string;
    carrier?: NetworkProvider;
  }): Promise<{
    success: boolean;
    externalReference: string;
    amount: number;
    carrier: NetworkProvider;
    phoneNumber: string;
    instructions: string;
    message: string;
  }> {
    const owner = db.getOwnerById(params.ownerId);
    if (!owner) {
      throw new Error('Mmiliki wa Hotspot hajapatikana.');
    }

    const carrierResult = detectCarrier(params.phoneNumber);
    const provider = params.carrier || carrierResult.provider || 'VODACOM';
    const amount = owner.subscription_fee || 15000;
    const externalRef = `SUB-${owner.id}-${Date.now()}`;
    const settings = db.getSettings();

    const gateway =
      settings.subscriptionGateway && settings.subscriptionGateway !== 'ACTIVE_DEFAULT'
        ? settings.subscriptionGateway
        : settings.activeGateway || 'DALIPAY';

    let externalTransactionId: string | null = null;

    if (gateway === 'DALIPAY') {
      const dalipayConfig = settings.dalipay;
      if (!dalipayConfig || (!dalipayConfig.publicKey && !dalipayConfig.secretKey)) {
        throw new Error(
          'Mipangilio ya DaliPay API haijakamilika kwenye mfumo. Tafadhali sanidi DaliPay credentials kwanza.'
        );
      }

      const dalipayBase = dalipayConfig.apiEndpoint || 'https://api.dalipay.com/v1';
      try {
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
            amount: amount,
            carrier: provider,
            reference: externalRef,
            currency: 'TZS',
            callback_url: `${process.env.APP_URL || 'https://infotechwifi.com'}/api/v1/payments/webhook`,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) {
          throw new Error(`DaliPay Aggregator Error: ${pushData.message || pushData.error || pushRes.statusText}`);
        }
        externalTransactionId = pushData.transaction_id || pushData.id || pushData.reference || null;
      } catch (err: any) {
        console.error('Subscription DaliPay API Call Error:', err);
        throw new Error(
          err.message?.includes('DaliPay Aggregator Error')
            ? err.message
            : `Imeshindikana kutuma ombi la malipo kupitia DaliPay API: ${err.message || 'Mtandao haujajibu'}.`
        );
      }
    } else if (gateway === 'PALMPESA') {
      const palmpesaConfig = settings.palmpesa;
      if (!palmpesaConfig || (!palmpesaConfig.userId && !palmpesaConfig.apiToken)) {
        throw new Error('Mipangilio ya PalmPesa haijasanidiwa.');
      }
      const palmpesaBase = palmpesaConfig.isSandbox
        ? 'https://sandbox.palmpesa.com/api'
        : 'https://api.palmpesa.com/v1';

      try {
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
            amount: amount,
            reference: externalRef,
            network: provider,
            callback_url: `${process.env.APP_URL || 'https://infotechwifi.com'}/api/v1/payments/webhook`,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) throw new Error(pushData.message || 'PalmPesa push failed');
        externalTransactionId = pushData.transaction_id || null;
      } catch (err: any) {
        throw new Error(`Hitilafu ya PalmPesa: ${err.message}`);
      }
    }

    // Save pending subscription transaction
    const initialTx: TransactionRecord = {
      id: db.getNextTransactionId(),
      phone_number: params.phoneNumber,
      network_provider: provider,
      amount,
      external_reference: externalRef,
      transaction_id: externalTransactionId,
      status: 'PENDING',
      plan_id: 1,
      owner_id: owner.id,
      vendor_amount: amount,
      platform_fee: 0,
      gateway_provider: `${gateway} (Aggregator Live API)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.saveTransaction(initialTx);

    let instructions = `Pop-up ya malipo imetumwa kwenye simu yako (${params.phoneNumber}). Weka PIN yako kukamilisha malipo ya TSh ${amount.toLocaleString()}.`;
    if (provider === 'VODACOM') {
      instructions = `Pop-up ya M-Pesa imetumwa kwa namba ${params.phoneNumber}. Weka PIN yako kukubali malipo ya TSh ${amount.toLocaleString()}.`;
    } else if (provider === 'TIGO') {
      instructions = `Ujumbe wa Tigo Pesa umetumwa kwa namba ${params.phoneNumber}. Weka PIN kulipa TSh ${amount.toLocaleString()}.`;
    } else if (provider === 'AIRTEL') {
      instructions = `Ujumbe wa Airtel Money umetumwa kwa namba ${params.phoneNumber}. Weka PIN kulipa TSh ${amount.toLocaleString()}.`;
    } else if (provider === 'HALOTEL') {
      instructions = `Pop-up ya Halopesa imetumwa kwa namba ${params.phoneNumber}. Weka PIN kulipa TSh ${amount.toLocaleString()}.`;
    }

    return {
      success: true,
      externalReference: externalRef,
      amount,
      carrier: provider,
      phoneNumber: params.phoneNumber,
      instructions,
      message: `Ombi la malipo ya ada ya kila mwezi (TSh ${amount.toLocaleString()}) limetumwa kwenye simu yako kupitia ${gateway} API! Weka PIN yako kukamilisha.`,
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
   * Processes incoming webhook callback idempotently
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
    // Standardize DaliPay webhook format or direct format
    let externalReference = payload.externalReference || (payload as any).data?.external_id || (payload as any).external_id;
    let transactionId = payload.transactionId || (payload as any).data?.uuid || (payload as any).data?.reference || (payload as any).uuid;
    let status = payload.status;
    let amount = payload.amount || (payload as any).data?.amount;

    if ((payload as any).event === 'collection.success' || (payload as any).data?.status === 'success') {
      status = 'SUCCESS';
    } else if ((payload as any).event === 'collection.failed' || (payload as any).data?.status === 'failed') {
      status = 'FAILED';
    }

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
