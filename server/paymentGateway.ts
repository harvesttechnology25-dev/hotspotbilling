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
  static generateReference(prefix: string = 'TZWF'): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${dateStr}-${randomHex}`;
  }

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
      throw new Error('Nambari ya simu haijatambuliwa. Chagua Vodacom, Tigo, Airtel au Halotel.');
    }

    const plan = db.getPlanById(params.planId);
    if (!plan) {
      throw new Error('Kifurushi hakijapatikana.');
    }

    const router = params.routerId ? db.getRouterById(params.routerId) : db.getRouters()[0];
    const settings = db.getSettings();
    const externalRef = this.generateReference('TZWF');

    let gatewayMode: 'LIVE' | 'SANDBOX' = 'LIVE';
    let externalTransactionId: string | null = null;
    const activeGateway = settings.activeGateway || 'DALIPAY';

    if (activeGateway === 'DALIPAY') {
      const dalipayConfig = settings.dalipay;
      if (!dalipayConfig || (!dalipayConfig.publicKey && !dalipayConfig.secretKey)) {
        throw new Error(
          'Mipangilio ya API ya DaliPay haijasanidiwa. Weka DaliPay Key ID, Public Key, na Secret Key kwenye Admin kabla ya kuanzisha malipo.'
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
        throw new Error(
          err.message?.includes('Hitilafu kutoka DaliPay')
            ? err.message
            : `Imeshindikana kuunganishwa na DaliPay API: ${err.message || 'Mtandao haujajibu'}.`
        );
      }
    }

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

    let instructions = '';
    switch (provider) {
      case 'VODACOM':
        instructions = `Ombi la M-Pesa limetumwa kwenda ${carrierResult.formatted || params.phoneNumber}. Weka PIN ya M-Pesa kuthibitisha malipo ya TZS ${plan.price.toLocaleString()}.`;
        break;
      case 'TIGO':
        instructions = `Ombi la Tigo Pesa limetumwa kwa ${carrierResult.formatted || params.phoneNumber}. Ingiza PIN ya Tigo Pesa kuthibitisha TZS ${plan.price.toLocaleString()}.`;
        break;
      case 'AIRTEL':
        instructions = `Ombi la Airtel Money limetumwa kwa ${carrierResult.formatted || params.phoneNumber}. Ingiza PIN ya Airtel Money kuthibitisha TZS ${plan.price.toLocaleString()}.`;
        break;
      case 'HALOTEL':
        instructions = `Ombi la Halopesa limetumwa kwa ${carrierResult.formatted || params.phoneNumber}. Weka PIN ya Halopesa kuthibitisha TZS ${plan.price.toLocaleString()}.`;
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

  static verifyWebhookSignature(payloadRaw: string, signatureHeader?: string): boolean {
    if (!signatureHeader) return true;
    try {
      const secret = db.getSettings().webhookSecret || 'tzwifi_secret_key_89230492';
      const computedHash = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(signatureHeader, 'utf8'));
    } catch {
      return false;
    }
  }

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
    const { externalReference, transactionId, status } = payload;
    const transaction = db.getTransactionByReference(externalReference);
    if (!transaction) return { success: false, message: 'Transaction not found' };

    if (transaction.status === 'SUCCESS') {
      return { success: true, message: 'Already processed', voucher: db.getVoucherByTransactionId(transaction.id) };
    }

    if (status !== 'SUCCESS') {
      transaction.status = 'FAILED';
      transaction.updated_at = new Date().toISOString();
      db.saveTransaction(transaction);
      return { success: false, message: 'Payment failed' };
    }

    transaction.status = 'SUCCESS';
    transaction.transaction_id = transactionId;
    transaction.updated_at = new Date().toISOString();
    db.saveTransaction(transaction);

    if (externalReference.startsWith('SUB-') || (transaction.owner_id && !transaction.router_id)) {
      if (transaction.owner_id) {
        const owner = db.getOwnerById(transaction.owner_id);
        if (owner) {
          const current = owner.subscription_expires_at ? new Date(owner.subscription_expires_at).getTime() : 0;
          const base = current > Date.now() ? current : Date.now();
          owner.subscription_expires_at = new Date(base + 30 * 86400000).toISOString();
          owner.subscription_status = 'ACTIVE';
          owner.updated_at = new Date().toISOString();
          db.saveOwner(owner);
        }
      }
      return { success: true, message: 'Subscription activated' };
    }

    const plan = db.getPlanById(transaction.plan_id);
    const router = transaction.router_id ? db.getRouterById(transaction.router_id) : db.getRouters()[0];

    const voucherCode = this.generatePhoneVoucherCode(transaction.phone_number);
    const voucher: VoucherRecord = {
      id: db.getNextVoucherId(),
      code: voucherCode,
      password: voucherCode,
      plan_id: transaction.plan_id,
      router_id: router?.id,
      transaction_id: transaction.id,
      mac_address: transaction.mac_address,
      status: 'ACTIVE',
      batch_tag: 'PHONE_AUTO_LOGIN',
      activated_at: new Date().toISOString(),
      expires_at: plan?.validity_period ? new Date(Date.now() + plan.validity_period * 1000).toISOString() : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveVoucher(voucher);

    if (router && plan) {
      await MikrotikService.provisionUser(router, {
        username: voucherCode,
        password: voucherCode,
        server: router.hotspot_server_name,
        limitUptimeSeconds: plan.limit_uptime,
        limitBytesTotal: plan.limit_bytes_total,
        rateLimit: plan.rate_limit,
        macAddress: transaction.mac_address,
        comment: `TZ-WiFi Paid via ${transaction.network_provider} (${transaction.phone_number})`,
      });
    }

    return { success: true, message: 'User provisioned', voucher };
  }
}
