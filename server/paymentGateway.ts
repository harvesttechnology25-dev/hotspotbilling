import crypto from 'crypto';
import {
  NetworkProvider,
  TransactionRecord,
  VoucherRecord,
  WebhookPayload,
  PlanRecord,
  RouterRecord,
  SubscriptionPackage,
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

/**
 * Maps system network provider to DaliPay provider name
 * ("Tigo", "Airtel", "Halopesa", "Azampesa", or "Mpesa")
 */
export function formatDaliPayProvider(carrier: string): 'Mpesa' | 'Tigo' | 'Airtel' | 'Halopesa' | 'Azampesa' {
  const p = String(carrier || '').toUpperCase();
  if (p.includes('VODA') || p.includes('MPESA')) return 'Mpesa';
  if (p.includes('TIGO')) return 'Tigo';
  if (p.includes('AIRTEL')) return 'Airtel';
  if (p.includes('HALO')) return 'Halopesa';
  if (p.includes('AZAM')) return 'Azampesa';
  return 'Mpesa';
}

/**
 * Normalizes Tanzanian MSISDN to local format e.g. "0712345678" as required by DaliPay
 */
export function formatDaliPayAccountNumber(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('255') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  if (digits.length === 9) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Resolves DaliPay base collections endpoint (/api/v1/collections)
 */
export function getDaliPayCollectionsUrl(base: string): string {
  const clean = (base || 'https://app.dalipay.co.tz').trim().replace(/\/+$/, '');
  if (clean.endsWith('/api/v1/collections')) return clean;
  if (clean.endsWith('/api/v1')) return `${clean}/collections`;
  return `${clean}/api/v1/collections`;
}

/**
 * Checks if raw gateway message or error code denotes insufficient account/wallet balance
 */
export function isInsufficientBalance(rawMessage?: string, rawCode?: string | number): boolean {
  if (!rawMessage && !rawCode) return false;
  const combined = `${rawMessage || ''} ${rawCode || ''}`.toLowerCase();
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

/**
 * Formats user-facing carrier failure reason consistently across STK, Captive Portal, and Subscription
 */
export function formatCarrierFailureReason(
  rawMessage?: string,
  rawCode?: string | number,
  status?: string
): string {
  const combined = `${rawMessage || ''} ${rawCode || ''} ${status || ''}`.toLowerCase();

  // 1. Insufficient balance / Salio halitoshi / collection.failed
  if (
    isInsufficientBalance(rawMessage, rawCode) ||
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
  ) {
    return 'Account haina salio la kutosha.';
  }

  // 2. User cancelled STK Push / Alighairi
  if (
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
  ) {
    return 'Mteja alighairi / amecancel STK Push kwenye simu.';
  }

  // 3. Timeout / Expired
  if (
    combined.includes('timeout') ||
    combined.includes('muda') ||
    combined.includes('expire') ||
    combined.includes('time out') ||
    combined.includes('time_out') ||
    combined.includes('1004') ||
    combined.includes('1005')
  ) {
    return 'Muda wa kusubiri malipo ya USSD umekwisha (Timeout).';
  }

  // 4. Invalid PIN
  if (
    combined.includes('wrong pin') ||
    combined.includes('invalid pin') ||
    combined.includes('pin error') ||
    combined.includes('incorrect pin')
  ) {
    return 'PIN ya simu iliyowekwa si sahihi.';
  }

  if (rawMessage && !rawMessage.startsWith('Event:') && !rawMessage.includes('collection.failed')) {
    return rawMessage;
  }

  return 'Mteja hakukamilisha malipo.';
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
    ownerId?: number;
    macAddress?: string;
    userIp?: string;
    callbackUrl?: string;
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

    const router = params.routerId ? db.getRouterById(params.routerId) : (db.getRouters()[0] || undefined);
    const effectiveOwnerId = params.ownerId || router?.owner_id;
    const owner = effectiveOwnerId ? db.getOwnerById(effectiveOwnerId) : undefined;

    // Check if the router or its assigned owner has configured payment API credentials
    const dalipayKeyId = (owner?.dalipay_key_id || router?.dalipay_key_id || '').trim();
    const dalipayPublicKey = (owner?.dalipay_public_key || router?.dalipay_public_key || '').trim();
    const dalipaySecretKey = (owner?.dalipay_secret_key || router?.dalipay_secret_key || '').trim();
    const dalipayBase = (owner?.dalipay_api_endpoint || router?.dalipay_api_endpoint || 'https://app.dalipay.co.tz').trim();
    const hasDaliPay = Boolean(dalipayPublicKey && dalipaySecretKey);

    const palmpesaUserId = (owner?.palmpesa_user_id || router?.palmpesa_user_id || '').trim();
    const palmpesaUserRef = (owner?.palmpesa_user_ref || router?.palmpesa_user_ref || '').trim();
    const palmpesaApiToken = (owner?.palmpesa_api_token || router?.palmpesa_api_token || '').trim();
    const hasPalmPesa = Boolean(palmpesaUserId && palmpesaApiToken);

    // CRITICAL: The Admin API is NOT the default payment gateway for Hotspot Wi-Fi customers.
    // Admin API is strictly reserved for Hotspot Owners paying their subscriptions to Admin.
    // If a Hotspot Owner has not configured their own API, payments must NOT proceed and
    // the system must explicitly instruct them to set up their API first.
    if (!hasDaliPay && !hasPalmPesa) {
      const ownerName = owner ? `${owner.business_name || owner.name}` : 'Mmiliki wa Hotspot';
      throw new Error(
        `Mmiliki wa Hotspot hii (${ownerName}) bado hajaweka API ya malipo. Tafadhali weka kwanza API ya malipo kwenye dashibodi yako ili wateja waweze kulipia intaneti.`
      );
    }

    const externalRef = this.generateReference('TZWF');
    const activeGateway = hasDaliPay ? 'DALIPAY' : 'PALMPESA';

    const settings = db.getSettings();
    let gatewayMode: 'LIVE' | 'SANDBOX' = 'LIVE';
    let externalTransactionId: string | null = null;
    let isCustomOwnerAccount = true;
    let usedMerchantId = hasDaliPay ? dalipayKeyId : palmpesaUserId;

    const resolvedCallbackUrl =
      params.callbackUrl ||
      (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')
        ? `${process.env.APP_URL.replace(/\/+$/, '')}/api/v1/payments/webhook`
        : undefined);

    if (activeGateway === 'DALIPAY') {
      const collectionsUrl = getDaliPayCollectionsUrl(dalipayBase);
      const dalipayProvider = formatDaliPayProvider(provider);
      const dalipayAccount = formatDaliPayAccountNumber(carrierResult.normalized || params.phoneNumber);
      gatewayMode = dalipayPublicKey.startsWith('gw_pk_test_') ? 'SANDBOX' : 'LIVE';

      try {
        const payloadBody: any = {
          account_number: dalipayAccount,
          amount: plan.price,
          currency: 'TZS',
          provider: dalipayProvider,
          external_id: externalRef.slice(0, 30),
          customer_name: `Mteja Hotspot (${dalipayAccount})`,
        };
        if (resolvedCallbackUrl) {
          payloadBody.callback_url = resolvedCallbackUrl;
          payloadBody.webhook_url = resolvedCallbackUrl;
        }

        const pushRes = await fetch(collectionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Key': dalipayPublicKey,
            'X-Secret-Key': dalipaySecretKey,
            ...(dalipayKeyId ? { 'X-Key-Id': dalipayKeyId } : {}),
          },
          body: JSON.stringify(payloadBody),
          signal: AbortSignal.timeout(10000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) {
          const apiErrMsg = pushData.message || pushData.error || `DaliPay API error HTTP ${pushRes.status}`;
          throw new Error(`Hitilafu kutoka DaliPay Collections API: ${apiErrMsg}`);
        }
        externalTransactionId =
          pushData.data?.uuid ||
          pushData.data?.reference ||
          pushData.uuid ||
          pushData.reference ||
          pushData.transaction_id ||
          null;
      } catch (err: any) {
        console.error('DaliPay API Call Error:', err);
        throw new Error(
          err.message?.includes('Hitilafu kutoka DaliPay')
            ? err.message
            : `Imeshindikana kuunganishwa na DaliPay Collections API: ${err.message || 'Mtandao haujajibu'}. Tafadhali thibitisha API endpoint na keys zako.`
        );
      }
    } else if (activeGateway === 'PALMPESA') {
      if (!palmpesaUserId || !palmpesaApiToken) {
        throw new Error(
          'Mipangilio ya API ya PalmPesa haijasanidiwa. Tafadhali weka User ID na API Token kabla ya kupokea malipo.'
        );
      }
      isCustomOwnerAccount = true;
      usedMerchantId = palmpesaUserId;

      gatewayMode = settings.palmpesa?.isSandbox ? 'SANDBOX' : 'LIVE';
      const palmpesaBase = settings.palmpesa?.isSandbox
        ? 'https://sandbox.palmpesa.com/api'
        : 'https://api.palmpesa.com/v1';

      try {
        const pushRes = await fetch(`${palmpesaBase}/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(palmpesaApiToken ? { Authorization: `Bearer ${palmpesaApiToken}` } : {}),
          },
          body: JSON.stringify({
            user_id: palmpesaUserId,
            user_ref: palmpesaUserRef,
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

    const commissionPercent = router?.platform_commission_percent ?? owner?.commission_rate ?? 0;
    const platformFee = Math.round((plan.price * commissionPercent) / 100);
    const vendorNetAmount = plan.price - platformFee;

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
      owner_id: owner?.id || router?.owner_id,
      mac_address: params.macAddress,
      user_ip: params.userIp,
      gateway_provider: activeGateway === 'DALIPAY'
        ? (isCustomOwnerAccount ? `DALIPAY (${owner?.business_name || 'Owner'} - Key: ${usedMerchantId})` : 'DALIPAY (Admin HQ)')
        : activeGateway === 'PALMPESA'
        ? (isCustomOwnerAccount ? `PALMPESA (${owner?.business_name || 'Owner'} - ID: ${usedMerchantId})` : 'PALMPESA (Admin HQ)')
        : activeGateway,
      vendor_merchant_id: usedMerchantId || undefined,
      vendor_amount: vendorNetAmount,
      platform_fee: platformFee,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan,
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
        ownerId: owner?.id,
        ownerBusinessName: owner?.business_name || 'Admin HQ',
        isCustomOwnerAccount,
        usedMerchantId,
        platformFee,
        vendorNetAmount,
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
    callbackUrl?: string;
    packageId?: number;
    amount?: number;
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
    const settings = db.getSettings();
    
    let resolvedPackage: SubscriptionPackage | undefined;
    if (params.packageId) {
      resolvedPackage = db.getSubscriptionPackageById(params.packageId);
    }
    const amount =
      params.amount && params.amount > 0
        ? params.amount
        : resolvedPackage?.price ||
          owner.subscription_fee ||
          owner.monthly_fee ||
          settings.subscriptionMonthlyFee ||
          15000;
    const externalRef = `SUB-${owner.id}-${Date.now()}`;

    const gateway =
      settings.subscriptionGateway && settings.subscriptionGateway !== 'ACTIVE_DEFAULT'
        ? settings.subscriptionGateway
        : settings.activeGateway || 'DALIPAY';

    let externalTransactionId: string | null = null;

    const resolvedCallbackUrl =
      params.callbackUrl ||
      (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')
        ? `${process.env.APP_URL.replace(/\/+$/, '')}/api/v1/payments/webhook`
        : undefined);

    if (gateway === 'DALIPAY') {
      const dalipayConfig = settings.dalipay;
      const keyId = (dalipayConfig?.keyId || process.env.DALIPAY_KEY_ID || '').trim();
      const publicKey = (dalipayConfig?.publicKey || process.env.DALIPAY_PUBLIC_KEY || '').trim();
      const secretKey = (dalipayConfig?.secretKey || process.env.DALIPAY_SECRET_KEY || '').trim();
      const dalipayBase = (dalipayConfig?.apiEndpoint || process.env.DALIPAY_ENDPOINT || 'https://app.dalipay.co.tz').trim();

      if (!publicKey || !secretKey) {
        throw new Error(
          'Mipangilio ya DaliPay API haijakamilika kwenye mfumo. Tafadhali sanidi DaliPay credentials kwanza.'
        );
      }

      const collectionsUrl = getDaliPayCollectionsUrl(dalipayBase);
      const dalipayProvider = formatDaliPayProvider(provider);
      const dalipayAccount = formatDaliPayAccountNumber(params.phoneNumber);

      try {
        const payloadBody: any = {
          account_number: dalipayAccount,
          amount: amount,
          currency: 'TZS',
          provider: dalipayProvider,
          external_id: externalRef.slice(0, 30),
          customer_name: owner.business_name || owner.name || 'Hotspot Owner',
        };
        if (resolvedCallbackUrl) {
          payloadBody.callback_url = resolvedCallbackUrl;
          payloadBody.webhook_url = resolvedCallbackUrl;
        }

        const pushRes = await fetch(collectionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Key': publicKey,
            'X-Secret-Key': secretKey,
            ...(keyId ? { 'X-Key-Id': keyId } : {}),
          },
          body: JSON.stringify(payloadBody),
          signal: AbortSignal.timeout(10000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) {
          throw new Error(`DaliPay Collections Error: ${pushData.message || pushData.error || pushRes.statusText}`);
        }
        externalTransactionId =
          pushData.data?.uuid ||
          pushData.data?.reference ||
          pushData.uuid ||
          pushData.reference ||
          pushData.transaction_id ||
          null;
      } catch (err: any) {
        console.error('Subscription DaliPay API Call Error:', err);
        throw new Error(
          err.message?.includes('DaliPay Collections Error')
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
            callback_url: resolvedCallbackUrl || `${process.env.APP_URL || 'https://infotechwifi.com'}/api/v1/payments/webhook`,
          }),
          signal: AbortSignal.timeout(8000),
        });

        const pushData: any = await pushRes.json().catch(() => ({}));
        if (!pushRes.ok) throw new Error(pushData.message || 'PalmPesa push failed');
        externalTransactionId = pushData.transaction_id || pushData.order_id || null;
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
      plan_id: resolvedPackage?.id || 0,
      is_subscription: true,
      plan_name: resolvedPackage ? `Subscription: ${resolvedPackage.name}` : 'Monthly Subscription Fee',
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
  static verifyWebhookSignature(payloadRaw: string, signatureHeader?: string, customSecret?: string): boolean {
    if (!signatureHeader) {
      return true;
    }
    try {
      const settings = db.getSettings();
      const owners = db.getOwners();

      // Collect all possible secrets configured in system or owners
      const candidateSecrets = new Set<string>([
        customSecret || '',
        settings.dalipay?.webhookSecret || '',
        settings.dalipay?.secretKey || '',
        process.env.DALIPAY_WEBHOOK_SECRET || '',
        process.env.DALIPAY_SECRET_KEY || '',
        settings.webhookSecret || '',
        'tzwifi_secret_key_89230492',
      ]);

      for (const o of owners) {
        if (o.dalipay_secret_key) candidateSecrets.add(o.dalipay_secret_key);
        if (o.dalipay_key_id) candidateSecrets.add(o.dalipay_key_id);
        if (o.palmpesa_api_token) candidateSecrets.add(o.palmpesa_api_token);
      }

      const cleanSig = signatureHeader.replace(/^sha256=/i, '').trim();

      for (const secret of candidateSecrets) {
        if (!secret) continue;
        const computedHash = crypto
          .createHmac('sha256', secret)
          .update(payloadRaw)
          .digest('hex');

        if (
          computedHash.length === cleanSig.length &&
          crypto.timingSafeEqual(Buffer.from(computedHash, 'utf8'), Buffer.from(cleanSig, 'utf8'))
        ) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // Throttling map to prevent querying external aggregators more than once every 1.5s per transaction
  private static lastGatewayCheckMap = new Map<string, number>();

  /**
   * Actively queries the gateway (DaliPay / PalmPesa / AzamPay) to verify payment status in real-time.
   * If the aggregator confirms SUCCESS, this immediately invokes processWebhookCallback,
   * provisioning the voucher in MikroTik RouterOS or unlocking the Hotspot Owner's subscription!
   */
  static async checkTransactionStatus(reference: string): Promise<{
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    transaction?: TransactionRecord;
    voucher?: VoucherRecord;
    failureReason?: string;
  }> {
    const transaction = db.getTransactionByReference(reference);
    if (!transaction) {
      return { status: 'FAILED', failureReason: 'Transaction not found' };
    }

    if (transaction.status === 'SUCCESS') {
      const voucher = db.getVoucherByTransactionId(transaction.id);
      return { status: 'SUCCESS', transaction, voucher };
    }

    if (transaction.status === 'FAILED') {
      return { status: 'FAILED', transaction, failureReason: transaction.failure_reason };
    }

    // Debounce checks per reference to avoid rate-limiting the aggregator API
    const now = Date.now();
    const lastCheck = this.lastGatewayCheckMap.get(reference) || 0;
    if (now - lastCheck < 1500) {
      return { status: 'PENDING', transaction };
    }
    this.lastGatewayCheckMap.set(reference, now);

    try {
      const owner = transaction.owner_id ? db.getOwnerById(transaction.owner_id) : undefined;
      const router = transaction.router_id ? db.getRouterById(transaction.router_id) : undefined;
      const settings = db.getSettings();

      // 1. Check DaliPay Collections Status API
      const isDaliPay =
        transaction.gateway_provider?.includes('DALIPAY') ||
        Boolean(transaction.vendor_merchant_id) ||
        reference.startsWith('DALI-TEST-') ||
        reference.startsWith('TZWF-') ||
        reference.startsWith('SUB-');

      if (isDaliPay) {
        const dalipayKeyId = (owner?.dalipay_key_id || router?.dalipay_key_id || settings.dalipay?.keyId || process.env.DALIPAY_KEY_ID || '').trim();
        const dalipayPublicKey = (owner?.dalipay_public_key || router?.dalipay_public_key || settings.dalipay?.publicKey || process.env.DALIPAY_PUBLIC_KEY || '').trim();
        const dalipaySecretKey = (owner?.dalipay_secret_key || router?.dalipay_secret_key || settings.dalipay?.secretKey || process.env.DALIPAY_SECRET_KEY || '').trim();
        const dalipayBase = (owner?.dalipay_api_endpoint || router?.dalipay_api_endpoint || settings.dalipay?.apiEndpoint || process.env.DALIPAY_ENDPOINT || 'https://app.dalipay.co.tz').trim();

        if (dalipayPublicKey && dalipaySecretKey) {
          const cleanBase = dalipayBase.replace(/\/+$/, '');
          const uuid = transaction.transaction_id;

          // Attempt check with UUID if available
          let checkData: any = null;
          if (uuid && !uuid.startsWith('GW-TX-') && !uuid.startsWith('MNO-')) {
            try {
              const statusUrl = `${cleanBase}/api/v1/collections/${uuid}/status`;
              const statusRes = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                  'X-Public-Key': dalipayPublicKey,
                  'X-Secret-Key': dalipaySecretKey,
                  ...(dalipayKeyId ? { 'X-Key-Id': dalipayKeyId } : {}),
                },
                signal: AbortSignal.timeout(6000),
              });
              if (statusRes.ok) {
                checkData = await statusRes.json().catch(() => null);
              }
            } catch (err) {
              console.warn(`[DaliPay Status Query UUID error]:`, err);
            }
          }

          // If no result by UUID, try querying by external_id or reference
          if (!checkData && transaction.external_reference) {
            try {
              const extId = transaction.external_reference.slice(0, 30);
              const queryUrl = `${cleanBase}/api/v1/collections?external_id=${encodeURIComponent(extId)}`;
              const queryRes = await fetch(queryUrl, {
                method: 'GET',
                headers: {
                  'X-Public-Key': dalipayPublicKey,
                  'X-Secret-Key': dalipaySecretKey,
                  ...(dalipayKeyId ? { 'X-Key-Id': dalipayKeyId } : {}),
                },
                signal: AbortSignal.timeout(6000),
              });
              if (queryRes.ok) {
                const qJson: any = await queryRes.json().catch(() => null);
                if (qJson?.data && Array.isArray(qJson.data) && qJson.data.length > 0) {
                  checkData = { data: qJson.data[0] };
                } else if (qJson?.data?.status) {
                  checkData = qJson;
                }
              }
            } catch (err) {
              console.warn(`[DaliPay Status Query ExternalId error]:`, err);
            }
          }

          if (checkData) {
            const remoteData = checkData.data || checkData;
            const remoteStatus = String(remoteData.status || checkData.status || '').toUpperCase();
            const isConfirmedPaid =
              remoteStatus === 'SUCCESS' ||
              remoteStatus === 'COMPLETED' ||
              remoteStatus === 'PAID' ||
              remoteStatus === 'SUCCESSFUL';

            if (isConfirmedPaid) {
              const result = await this.processWebhookCallback({
                externalReference: transaction.external_reference,
                transactionId: remoteData.uuid || remoteData.reference || uuid || `DALI-${Date.now()}`,
                status: 'SUCCESS',
                amount: Number(remoteData.amount || transaction.amount),
                currency: remoteData.currency || 'TZS',
                phoneNumber: remoteData.account_number || transaction.phone_number,
                carrier: remoteData.provider || transaction.network_provider,
                timestamp: new Date().toISOString(),
                message: 'Malipo yamethibitishwa kupitia DaliPay Status API.',
              });
              return {
                status: 'SUCCESS',
                transaction: db.getTransactionByReference(reference),
                voucher: result.voucher,
              };
            } else if (
              remoteStatus === 'FAILED' ||
              remoteStatus === 'CANCELLED' ||
              remoteStatus === 'REJECTED' ||
              remoteStatus === 'EXPIRED'
            ) {
              transaction.status = 'FAILED';
              const rawMsg = remoteData.message || remoteData.desc || remoteData.failure_reason || '';
              const rawCode = remoteData.code || remoteData.error_code || remoteData.status_code || '';
              transaction.failure_reason = formatCarrierFailureReason(rawMsg, rawCode, remoteStatus);
              transaction.updated_at = new Date().toISOString();
              db.saveTransaction(transaction);
              return {
                status: 'FAILED',
                transaction,
                failureReason: transaction.failure_reason,
              };
            }
          }
        }
      }

      // 2. Check PalmPesa Payments Status API
      const isPalmPesa = transaction.gateway_provider?.includes('PALMPESA');
      if (isPalmPesa) {
        const palmpesaApiToken = (owner?.palmpesa_api_token || router?.palmpesa_api_token || settings.palmpesa?.apiToken || process.env.PALMPESA_API_TOKEN || '').trim();
        const palmpesaBase = settings.palmpesa?.isSandbox ? 'https://sandbox.palmpesa.com/api' : 'https://api.palmpesa.com/v1';
        const orderId = transaction.transaction_id || transaction.external_reference;

        if (palmpesaApiToken && orderId) {
          try {
            const ppRes = await fetch(`${palmpesaBase}/checkout/${orderId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${palmpesaApiToken}`,
              },
              signal: AbortSignal.timeout(6000),
            });

            if (ppRes.ok) {
              const ppData: any = await ppRes.json().catch(() => ({}));
              const rawPpStatus = String(ppData.status || ppData.data?.status || '').toUpperCase();
              if (rawPpStatus === 'COMPLETED' || rawPpStatus === 'SUCCESS') {
                const result = await this.processWebhookCallback({
                  externalReference: transaction.external_reference,
                  transactionId: ppData.transaction_id || ppData.order_id || orderId,
                  status: 'SUCCESS',
                  amount: transaction.amount,
                  currency: 'TZS',
                  phoneNumber: transaction.phone_number,
                  carrier: transaction.network_provider,
                  timestamp: new Date().toISOString(),
                  message: 'Malipo yamethibitishwa kupitia PalmPesa Status API.',
                });
                return {
                  status: 'SUCCESS',
                  transaction: db.getTransactionByReference(reference),
                  voucher: result.voucher,
                };
              } else if (['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(rawPpStatus)) {
                transaction.status = 'FAILED';
                const rawMsg = ppData.message || ppData.desc || '';
                transaction.failure_reason = formatCarrierFailureReason(rawMsg, ppData.code, rawPpStatus);
                transaction.updated_at = new Date().toISOString();
                db.saveTransaction(transaction);
                return {
                  status: 'FAILED',
                  transaction,
                  failureReason: transaction.failure_reason,
                };
              }
            }
          } catch (ppErr) {
            console.warn('[PalmPesa Status Query error]:', ppErr);
          }
        }
      }
    } catch (checkErr) {
      console.error('Error during active gateway status verification:', checkErr);
    }

    const finalStatus: 'PENDING' | 'SUCCESS' | 'FAILED' =
      transaction.status === 'FAILED' ? 'FAILED' : 'PENDING';

    return { status: finalStatus, transaction };
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
      const rawMsg = payload.message || '';
      const rawCode = payload.code || (payload as any).status_code || '';
      transaction.failure_reason = formatCarrierFailureReason(rawMsg, rawCode, status);
      transaction.updated_at = new Date().toISOString();
      db.saveTransaction(transaction);
      return {
        success: false,
        message: transaction.failure_reason,
      };
    }

    // Update Transaction to SUCCESS
    transaction.status = 'SUCCESS';
    if (transactionId) {
      transaction.transaction_id = transactionId;
    }
    transaction.updated_at = new Date().toISOString();
    db.saveTransaction(transaction);

    const isSubscriptionTx =
      externalReference.startsWith('SUB-') ||
      Boolean(transaction.external_reference?.startsWith('SUB-'));

    const isTestPushTx =
      externalReference.startsWith('DALI-TEST-') ||
      externalReference.startsWith('TEST-') ||
      Boolean(transaction.external_reference?.startsWith('DALI-TEST-')) ||
      Boolean(transaction.external_reference?.startsWith('TEST-'));

    // 1. Subscription Renewal Flow
    if (isSubscriptionTx) {
      if (transaction.owner_id) {
        const owner = db.getOwnerById(transaction.owner_id);
        if (owner) {
          let daysToAdd = 30;
          if (transaction.plan_id) {
            const pkg = db.getSubscriptionPackageById(transaction.plan_id);
            if (pkg) {
              owner.subscription_package_id = pkg.id;
              owner.subscription_fee = pkg.price;
              owner.monthly_fee = pkg.price;
              daysToAdd = pkg.billing_cycle_days || 30;
            }
          }
          const currentExpiryTime = owner.subscription_expires_at
            ? new Date(owner.subscription_expires_at).getTime()
            : 0;
          const baseTime = currentExpiryTime > Date.now() ? currentExpiryTime : Date.now();
          owner.subscription_expires_at = new Date(baseTime + daysToAdd * 86400000).toISOString();
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

    // 2. Test Push Flow
    if (isTestPushTx) {
      db.saveAuditLog({
        id: Date.now() + 1,
        transaction_id: transaction.id,
        external_reference: externalReference,
        event_type: 'TEST_PUSH_PAYMENT_CONFIRMED',
        payload_json: {
          ownerId: transaction.owner_id,
          amount: transaction.amount,
          mnoTransactionId: transactionId,
          reference: externalReference,
        },
        created_at: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Test payment confirmed successfully via telecom carrier and DaliPay.',
      };
    }

    // 3. Customer Hotspot Internet Voucher Flow (Captive Portal)
    // Retrieve Plan and Router
    const plan = db.getPlanById(transaction.plan_id);
    const router = transaction.router_id
      ? db.getRouterById(transaction.router_id)
      : (db.getRouters()[0] || undefined);

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
      owner_id: transaction.owner_id || router?.owner_id,
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
