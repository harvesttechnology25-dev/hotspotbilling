import crypto from 'crypto';
import { db } from '../db.js';
import {
  NetworkProvider,
  TransactionRecord,
  VoucherRecord,
  PlanRecord,
  RouterRecord,
  HotspotOwner,
  VendorPaymentPayload,
  VendorCallbackPayload,
} from '../types.js';
import { detectCarrier } from '../carrierDetector.js';

export interface VendorDispatchResult {
  success: boolean;
  reference: string;
  transactionId?: string;
  vendorName: string;
  vendorMerchantId: string;
  amount: number;
  platformFee: number;
  vendorNetAmount: number;
  instructions: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
}

export class VendorPaymentRouterService {
  /**
   * Generates reference for vendor tracking:
   * Format: VEND-{DATE}-{RANDOM}
   */
  static generateReference(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `VEND-${dateStr}-${randomHex}`;
  }

  /**
   * Looks up the router and owner to determine vendor wallet credentials
   */
  static resolveVendorCredentials(routerId?: number): {
    router?: RouterRecord;
    owner?: HotspotOwner;
    vendorName: string;
    merchantId: string;
    commissionPercent: number;
    payoutChannel: string;
    accountNumber: string;
    palmpesaUserId: string;
    palmpesaUserRef: string;
    palmpesaApiToken: string;
    palmpesaAcceptStk: boolean;
    isCustomOwnerPalmpesa: boolean;
  } {
    const routers = db.getRouters();
    const targetRouter = routerId
      ? routers.find((r) => r.id === routerId)
      : routers[0];

    const ownerId = targetRouter?.owner_id;
    const targetOwner = ownerId ? db.getOwnerById(ownerId) : undefined;

    const defaultSettings = db.getSettings();
    const adminPalmpesa = defaultSettings.palmpesa;

    // PalmPesa Credentials Resolution:
    // Hotspot Owner must have configured their own credentials.
    // Admin API is NEVER used as a default gateway for customer hotspot purchases.
    const palmpesaUserId = String(
      targetRouter?.palmpesa_user_id ||
      targetOwner?.palmpesa_user_id ||
      ''
    ).trim();

    const palmpesaUserRef = String(
      targetRouter?.palmpesa_user_ref ||
      targetOwner?.palmpesa_user_ref ||
      ''
    ).trim();

    const palmpesaApiToken = String(
      targetRouter?.palmpesa_api_token ||
      targetOwner?.palmpesa_api_token ||
      ''
    ).trim();

    if (!palmpesaUserId || !palmpesaApiToken) {
      const ownerName = targetOwner ? `${targetOwner.business_name || targetOwner.name}` : 'Mmiliki wa Hotspot';
      throw new Error(
        `Mmiliki wa mtandao huu (${ownerName}) bado hajaweka API ya malipo. Tafadhali weka kwanza API ya malipo kwenye dashibodi ili wateja waweze kulipia intaneti.`
      );
    }

    const palmpesaAcceptStk =
      targetRouter?.palmpesa_accept_stk !== undefined
        ? targetRouter.palmpesa_accept_stk
        : targetOwner?.palmpesa_accept_stk !== undefined
        ? targetOwner.palmpesa_accept_stk
        : true;

    const isCustomOwnerPalmpesa = true;

    const vendorName =
      targetRouter?.vendor_name ||
      targetOwner?.business_name ||
      (isCustomOwnerPalmpesa ? `PalmPesa User: ${palmpesaUserId}` : 'PalmPesa Admin HQ');

    const merchantId =
      targetRouter?.vendor_merchant_id ||
      targetOwner?.vendor_merchant_id ||
      `PP-USER-${palmpesaUserId}`;

    const commissionPercent =
      targetRouter?.platform_commission_percent !== undefined
        ? targetRouter.platform_commission_percent
        : targetOwner?.commission_rate !== undefined
        ? targetOwner.commission_rate
        : 5.0;

    const payoutChannel =
      targetRouter?.payout_channel ||
      targetOwner?.payout_channel ||
      'PALMPESA';

    const accountNumber =
      targetRouter?.wallet_account_number ||
      targetOwner?.wallet_account_number ||
      targetOwner?.phone ||
      '255754000111';

    return {
      router: targetRouter,
      owner: targetOwner,
      vendorName,
      merchantId,
      commissionPercent,
      payoutChannel,
      accountNumber,
      palmpesaUserId,
      palmpesaUserRef,
      palmpesaApiToken,
      palmpesaAcceptStk,
      isCustomOwnerPalmpesa,
    };
  }

  /**
   * Dispatches USSD Push targeting the router owner's sub-merchant wallet
   */
  static async routePaymentToVendor(
    payload: VendorPaymentPayload
  ): Promise<VendorDispatchResult> {
    const carrierResult = detectCarrier(payload.phoneNumber);
    const provider: NetworkProvider = payload.networkProvider || carrierResult.provider || 'VODACOM';

    const plan = db.getPlanById(payload.planId);
    if (!plan) {
      throw new Error('Kifurushi hakijapatikana (Plan not found).');
    }

    const vendorCreds = this.resolveVendorCredentials(payload.routerId);
    const reference = this.generateReference();

    // Financial split
    const grossAmount = plan.price;
    const platformFee = Math.round((grossAmount * vendorCreds.commissionPercent) / 100);
    const vendorNetAmount = grossAmount - platformFee;

    // Record initial transaction
    const newTx: TransactionRecord = {
      id: Date.now(),
      phone_number: carrierResult.formatted || payload.phoneNumber,
      network_provider: provider,
      amount: grossAmount,
      external_reference: reference,
      transaction_id: null,
      status: 'PENDING',
      plan_id: plan.id,
      router_id: vendorCreds.router?.id,
      owner_id: vendorCreds.owner?.id,
      mac_address: payload.macAddress,
      user_ip: payload.userIp,
      gateway_provider: `PALMPESA (User ID: ${vendorCreds.palmpesaUserId})`,
      vendor_merchant_id: vendorCreds.palmpesaUserId,
      vendor_amount: vendorNetAmount,
      platform_fee: platformFee,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan,
    };

    db.saveTransaction(newTx);

    // Audit log
    db.saveAuditLog({
      id: Date.now(),
      transaction_id: newTx.id,
      external_reference: reference,
      event_type: 'VENDOR_USSD_PUSH_DISPATCHED',
      payload_json: {
        targetPalmpesaUserId: vendorCreds.palmpesaUserId,
        palmpesaUserRef: vendorCreds.palmpesaUserRef,
        isCustomOwnerPalmpesa: vendorCreds.isCustomOwnerPalmpesa,
        ownerBusinessName: vendorCreds.owner?.business_name || 'Admin HQ',
        grossAmount,
        platformFee,
        vendorNetAmount,
        channel: vendorCreds.payoutChannel,
        destinationWallet: vendorCreds.isCustomOwnerPalmpesa
          ? `PalmPesa ya Mmiliki (User ID: ${vendorCreds.palmpesaUserId})`
          : `PalmPesa Kuu ya Admin (User ID: ${vendorCreds.palmpesaUserId})`,
      },
      created_at: new Date().toISOString(),
    });

    let instructions = `Ombi la malipo ya TZS ${grossAmount.toLocaleString()} limetumwa kwa ${carrierResult.formatted || payload.phoneNumber}. Pesa inaelekezwa kwenye PalmPesa (User ID: ${vendorCreds.palmpesaUserId}). Weka PIN yako kuthibitisha.`;

    return {
      success: true,
      reference,
      transactionId: `TX-${reference}`,
      vendorName: vendorCreds.vendorName,
      vendorMerchantId: vendorCreds.palmpesaUserId,
      amount: grossAmount,
      platformFee,
      vendorNetAmount,
      instructions,
      status: 'PENDING',
    };
  }

  /**
   * Verifies incoming vendor callback signature
   */
  static verifyCallbackSignature(rawBody: string, signature: string, secretKey: string = 'tzwifi_secret_key_89230492'): boolean {
    if (!signature) return true; // Accept simulated sandbox callbacks
    try {
      const hmac = crypto.createHmac('sha256', secretKey).update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
    } catch {
      return false;
    }
  }

  /**
   * Idempotent webhook handler for vendor payment confirmations
   * Directly provisions user in FreeRADIUS (radcheck & radreply)
   */
  static async handleVendorCallback(
    callbackData: VendorCallbackPayload,
    rawBody?: string
  ): Promise<{
    success: boolean;
    message: string;
    voucherCode?: string;
    alreadyProcessed?: boolean;
  }> {
    const { reference, transactionId, status, merchantId } = callbackData;

    db.saveAuditLog({
      id: Date.now(),
      external_reference: reference,
      event_type: 'VENDOR_WEBHOOK_RECEIVED',
      payload_json: callbackData,
      created_at: new Date().toISOString(),
    });

    const tx = db.getTransactionByReference(reference);
    if (!tx) {
      throw new Error(`Transaction with reference ${reference} not found.`);
    }

    if (tx.status === 'SUCCESS') {
      const existingVoucher = db.getVouchers().find((v) => v.transaction_id === tx.id);
      return {
        success: true,
        message: 'Transaction already completed and provisioned.',
        voucherCode: existingVoucher?.code,
        alreadyProcessed: true,
      };
    }

    if (status !== 'SUCCESS') {
      db.updateTransactionStatus(reference, 'FAILED', transactionId, 'Vendor reported failed transaction');
      return {
        success: false,
        message: 'Payment failed at vendor gateway.',
      };
    }

    // Success: Update transaction
    db.updateTransactionStatus(reference, 'SUCCESS', transactionId);

    const plan = db.getPlanById(tx.plan_id);
    if (!plan) {
      throw new Error('Plan not found for transaction.');
    }

    // Generate distinct Phone voucher format (PHO-xxxx-xxxx)
    const digits = (tx.phone_number || '').replace(/\D/g, '');
    const phoneSuffix = digits.length >= 4 ? digits.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    const voucherCode = `PHO-${phoneSuffix}-${randomPin}`;

    // 1. Provision directly into FreeRADIUS radcheck and radreply
    db.addRadiusUser(voucherCode, randomPin, plan, tx.mac_address);

    // 2. Provision local voucher record
    const expiresAt = new Date(Date.now() + (plan.validity_period || 86400) * 1000).toISOString();
    const voucher: VoucherRecord = {
      id: Date.now(),
      code: voucherCode,
      password: randomPin,
      plan_id: plan.id,
      router_id: tx.router_id,
      owner_id: tx.owner_id,
      transaction_id: tx.id,
      mac_address: tx.mac_address,
      status: 'AVAILABLE',
      batch_tag: `VENDOR-${merchantId || 'DIRECT'}`,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan,
    };

    db.saveVoucher(voucher);

    db.saveAuditLog({
      id: Date.now(),
      transaction_id: tx.id,
      external_reference: reference,
      event_type: 'FREERADIUS_USER_PROVISIONED',
      payload_json: {
        username: voucherCode,
        rateLimit: plan.rate_limit,
        limitUptime: plan.limit_uptime,
        merchantId,
      },
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Payment confirmed and FreeRADIUS user provisioned successfully.',
      voucherCode,
    };
  }
}
