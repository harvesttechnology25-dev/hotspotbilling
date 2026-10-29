import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { detectCarrier } from './carrierDetector.js';
import {
  PaymentGatewayService,
  formatDaliPayProvider,
  formatDaliPayAccountNumber,
  getDaliPayCollectionsUrl,
} from './paymentGateway.js';
import { MikrotikService } from './mikrotikService.js';
import { VoucherBatchService } from './services/voucherBatchService.js';
import { VendorPaymentRouterService } from './services/vendorPaymentRouter.js';
import { ScriptGeneratorService } from './services/scriptGenerator.js';
import { OmadaAdoptionService } from './services/omadaAdoptionService.js';
import { EmailService } from './emailService.js';
import { db } from './db.js';
import { generateFullDatabaseSQL, parseSQLDumpToSnapshot } from './sqlBackup.js';
import { mysqlService } from './mysqlService.js';
import {
  InitiatePaymentPayload,
  WebhookPayload,
  NetworkProvider,
  VoucherRecord,
  VoucherBatchRecord,
  RouterRecord,
  PlanRecord,
  TransactionRecord,
  GatewaySettings,
  HotspotOwner,
  UserRole,
  UserPrivileges,
  PortalThemeConfig,
} from './types.js';


export const apiRouter = Router();

export function getRequestUser(req: Request): any {
  if ((req as any).user) return (req as any).user;
  if ((req as any).session?.user) return (req as any).session.user;
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const match = token.match(/^tzwifi_tok_(\d+)_/);
    if (match) {
      return db.getOwnerById(Number(match[1]));
    }
  }
  const xOwnerId = req.headers['x-owner-id'] || req.headers['x-user-id'];
  if (xOwnerId) {
    return db.getOwnerById(Number(xOwnerId));
  }
  return null;
}


// =============================================================================
// Carrier Prefix Auto-Detection
// =============================================================================
apiRouter.post('/carrier/detect', (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const result = detectCarrier(String(phoneNumber));
  res.json(result);
});

// =============================================================================
// Payment Gateway Endpoints (USSD Push & Webhooks)
// =============================================================================

function getEffectiveCallbackUrl(req: Request): string {
  if (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL') && process.env.APP_URL.startsWith('http')) {
    return `${process.env.APP_URL.replace(/\/+$/, '')}/api/v1/payments/webhook`;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  return `${proto}://${host}/api/v1/payments/webhook`;
}

apiRouter.post('/payments/initiate', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.phoneNumber || !payload.planId) {
      return res.status(400).json({
        error: 'Tafadhali weka nambari ya simu na uchague kifurushi (Phone number and plan are required).',
      });
    }

    const resolvedOwnerId = payload.ownerId ? Number(payload.ownerId) : undefined;
    const callbackUrl = getEffectiveCallbackUrl(req);

    const result = await PaymentGatewayService.initiateMobileMoneyPush({
      phoneNumber: payload.phoneNumber,
      networkProvider: payload.networkProvider,
      planId: Number(payload.planId),
      routerId: payload.routerId ? Number(payload.routerId) : undefined,
      ownerId: resolvedOwnerId,
      macAddress: payload.macAddress,
      userIp: payload.userIp || req.ip,
      callbackUrl,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Payment initiation failed.' });
  }
});

// Carrier / Aggregator Webhook Callback (Compatible with DaliPay, PalmPesa, AzamPay, Billnass & Vodacom)
const handleIncomingWebhook = async (req: Request, res: Response) => {
  try {
    const signatureHeader = (
      req.headers['x-signature'] ||
      req.headers['x-dalipay-signature'] ||
      req.headers['signature'] ||
      req.headers['x-palmpesa-signature'] ||
      req.headers['x-hub-signature'] ||
      req.headers['x-hub-signature-256']
    ) as string | undefined;

    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Support both DaliPay event format ({ event: 'collection.success', data: { ... } }) and standard formats
    const isDaliPayEvent = Boolean(req.body?.event && req.body?.data);
    const daliData = isDaliPayEvent ? req.body.data : null;

    const rawStatus = isDaliPayEvent
      ? String(daliData?.status || '').toUpperCase()
      : String(req.body.status || req.body.result || req.body.state || '').toUpperCase();

    const eventName = String(req.body?.event || '').toLowerCase();
    const isPending =
      rawStatus === 'PENDING' ||
      rawStatus === 'WAITING' ||
      rawStatus === 'PROCESSING' ||
      eventName.includes('pending') ||
      eventName.includes('initiated');

    const isSuccess =
      !isPending &&
      (['collection.success', 'charge.success', 'payment.success', 'collection.completed', 'payment.completed'].includes(eventName) ||
       ['SUCCESS', 'COMPLETED', 'PAID', 'SUCCESSFUL'].includes(rawStatus));

    if (isPending) {
      return res.status(200).json({
        received: true,
        status: 'PENDING',
        message: 'Payment prompt dispatched; waiting for subscriber PIN entry.',
      });
    }

    const extRef =
      daliData?.external_id ||
      daliData?.externalReference ||
      daliData?.reference ||
      daliData?.uuid ||
      req.body.externalReference ||
      req.body.reference ||
      req.body.external_id ||
      req.body.order_id ||
      req.body.ref ||
      req.body.bill_ref ||
      req.body.user_ref ||
      req.body.transaction_id ||
      req.body.trans_id;

    if (!extRef) {
      return res.status(400).json({ error: 'Missing externalReference in webhook payload.' });
    }

    // Verify signature if provided, but if mismatch occurs on an existing pending transaction, log warning and verify
    if (signatureHeader) {
      const isValid = PaymentGatewayService.verifyWebhookSignature(rawBody, signatureHeader);
      if (!isValid) {
        const existingTx = db.getTransactionByReference(extRef);
        if (!existingTx) {
          console.warn('[Webhook] Rejected unknown transaction with invalid signature.');
          return res.status(401).json({ error: 'Invalid HMAC signature header.' });
        }
        console.warn(`[Webhook] Signature verification mismatch for reference ${extRef}, but pending transaction exists. Proceeding with caution.`);
      }
    }

    const txId =
      daliData?.uuid ||
      daliData?.reference ||
      req.body.transactionId ||
      req.body.trans_id ||
      req.body.transaction_id ||
      req.body.order_id ||
      req.body.receipt ||
      req.body.receipt_no ||
      `MNO-${Date.now()}`;

    const webhookPayload: WebhookPayload = {
      externalReference: extRef,
      transactionId: txId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      amount: Number(daliData?.amount || req.body.amount || req.body.trans_amount || 0),
      currency: daliData?.currency || req.body.currency || 'TZS',
      phoneNumber: daliData?.account_number || req.body.phoneNumber || req.body.msisdn || req.body.phone || '',
      carrier: daliData?.provider || req.body.carrier || req.body.operator || req.body.network || '',
      timestamp: req.body.timestamp || new Date().toISOString(),
      message: req.body.message || (isDaliPayEvent ? `Event: ${req.body.event}` : req.body.desc),
    };

    const result = await PaymentGatewayService.processWebhookCallback(
      webhookPayload,
      signatureHeader,
      rawBody
    );

    res.status(result.success ? 200 : 400).json({
      received: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal webhook error.' });
  }
};

apiRouter.post('/payments/webhook', handleIncomingWebhook);
apiRouter.post('/payment/callback/palmpesa', handleIncomingWebhook);
apiRouter.post('/payment/callback/azampay', handleIncomingWebhook);
apiRouter.post('/payment/callback/dalipay', handleIncomingWebhook);
apiRouter.post('/payments/callback/dalipay', handleIncomingWebhook);
apiRouter.post('/payment/callback', handleIncomingWebhook);

// DaliPay Test Push Endpoint (Supports both Hotspot Owner & Admin keys)
apiRouter.post('/payments/dalipay/test-push', async (req: Request, res: Response) => {
  try {
    const { keyId, publicKey, secretKey, apiEndpoint, ownerId, routerId, phoneNumber = '0754123456', amount = 1000, carrier = 'VODACOM' } = req.body;
    const settings = db.getSettings();
    const router = routerId ? db.getRouterById(Number(routerId)) : undefined;
    const effectiveOwnerId = ownerId ? Number(ownerId) : router?.owner_id;
    const owner = effectiveOwnerId ? db.getOwnerById(effectiveOwnerId) : undefined;

    const activeKeyId = (keyId || router?.dalipay_key_id || owner?.dalipay_key_id || settings.dalipay?.keyId || process.env.DALIPAY_KEY_ID || '').trim();
    const activePublicKey = (publicKey || router?.dalipay_public_key || owner?.dalipay_public_key || settings.dalipay?.publicKey || process.env.DALIPAY_PUBLIC_KEY || '').trim();
    const activeSecretKey = (secretKey || router?.dalipay_secret_key || owner?.dalipay_secret_key || settings.dalipay?.secretKey || process.env.DALIPAY_SECRET_KEY || '').trim();
    const activeEndpoint = (apiEndpoint || router?.dalipay_api_endpoint || owner?.dalipay_api_endpoint || settings.dalipay?.apiEndpoint || process.env.DALIPAY_ENDPOINT || 'https://app.dalipay.co.tz').trim();

    const isOwnerAccount = Boolean(owner && (owner.dalipay_key_id || owner.dalipay_public_key || keyId));
    const testRef = `DALI-TEST-${Date.now().toString().slice(-6)}`;
    let txId = `GW-TX-${activeKeyId || 'DALI'}-${Date.now().toString().slice(-6)}`;

    // If live/sandbox keys are provided, attempt real push to DaliPay API:
    let livePushSent = false;
    let pushErrorMsg = '';
    const callbackUrl = getEffectiveCallbackUrl(req);

    if (activePublicKey && activeSecretKey) {
      try {
        const collectionsUrl = getDaliPayCollectionsUrl(activeEndpoint);
        const dalipayProvider = formatDaliPayProvider(carrier);
        const dalipayAccount = formatDaliPayAccountNumber(phoneNumber);

        const pushRes = await fetch(collectionsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Public-Key': activePublicKey,
            'X-Secret-Key': activeSecretKey,
            ...(activeKeyId ? { 'X-Key-Id': activeKeyId } : {}),
          },
          body: JSON.stringify({
            account_number: dalipayAccount,
            amount: Number(amount),
            currency: 'TZS',
            provider: dalipayProvider,
            external_id: testRef.slice(0, 30),
            customer_name: `Jaribio la ${owner?.business_name || 'Admin'}`,
            callback_url: callbackUrl,
            webhook_url: callbackUrl,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const pushData: any = await pushRes.json().catch(() => ({}));
        if (pushRes.ok) {
          livePushSent = true;
          if (pushData.data?.uuid || pushData.data?.reference) {
            txId = pushData.data.uuid || pushData.data.reference;
          }
        } else {
          pushErrorMsg = pushData.message || pushData.error || `HTTP ${pushRes.status}`;
        }
      } catch (err: any) {
        pushErrorMsg = err.message || 'Mtandao haujajibu';
      }
    }

    // Create a transaction record with owner_id set
    const tx: TransactionRecord = {
      id: db.getNextTransactionId(),
      phone_number: phoneNumber,
      network_provider: carrier,
      amount: Number(amount),
      external_reference: testRef,
      transaction_id: txId,
      status: 'PENDING',
      plan_id: 1,
      router_id: router?.id,
      owner_id: owner?.id,
      gateway_provider: isOwnerAccount ? `DALIPAY (${owner?.business_name || 'Owner'} - Key: ${activeKeyId})` : `DALIPAY (Admin HQ)`,
      vendor_merchant_id: activeKeyId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.saveTransaction(tx);

    db.saveAuditLog({
      id: Date.now(),
      transaction_id: tx.id,
      external_reference: testRef,
      event_type: 'DALIPAY_TEST_PUSH_DISPATCHED',
      payload_json: {
        keyId: activeKeyId,
        endpoint: activeEndpoint,
        ownerId: owner?.id,
        ownerBusinessName: owner?.business_name || 'Admin HQ',
        isOwnerAccount,
        amount,
        phoneNumber,
        carrier,
        livePushSent,
        pushErrorMsg: pushErrorMsg || undefined,
        callbackUrl,
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      reference: testRef,
      transactionId: txId,
      keyId: activeKeyId,
      amount,
      phoneNumber,
      carrier,
      ownerName: owner?.business_name || 'Admin Default',
      livePushSent,
      message: pushErrorMsg
        ? `Taarifa ya DaliPay: ${pushErrorMsg}. Mfumo umehifadhi kumbukumbu ya jaribio kwa Key ID: ${activeKeyId}.`
        : `Jaribio la ombi la malipo (USSD Push) kupitia DaliPay ya ${isOwnerAccount ? owner?.business_name : 'Admin HQ'} (Key: ${activeKeyId}) limetumwa kwa namba ${phoneNumber}!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya jaribio la DaliPay.' });
  }
});

// Check DaliPay Test Push Status Endpoint
apiRouter.get('/payments/dalipay/test-push/status/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params;
  const statusResult = await PaymentGatewayService.checkTransactionStatus(reference);
  const transaction = statusResult.transaction || db.getTransactionByReference(reference);

  if (!transaction) {
    return res.status(404).json({ error: 'Test transaction not found.' });
  }

  res.json({
    status: transaction.status,
    externalReference: transaction.external_reference,
    transactionId: transaction.transaction_id,
    phoneNumber: transaction.phone_number,
    carrier: transaction.network_provider,
    amount: transaction.amount,
    isPaid: transaction.status === 'SUCCESS',
    failureReason: transaction.failure_reason,
    updatedAt: transaction.updated_at,
  });
});

// Check Payment Status (Polling endpoint for Captive Portal - Auto-checks Gateway)
apiRouter.get('/payments/status/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params;

  // Actively check status with DaliPay / PalmPesa if still pending
  const statusResult = await PaymentGatewayService.checkTransactionStatus(reference);
  const transaction = statusResult.transaction || db.getTransactionByReference(reference);

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const voucher = transaction.status === 'SUCCESS'
    ? (statusResult.voucher || db.getVoucherByTransactionId(transaction.id))
    : undefined;

  const plan = db.getPlanById(transaction.plan_id);
  const router = transaction.router_id ? db.getRouterById(transaction.router_id) : db.getRouters()[0];

  const hotspotLoginUrl = router
    ? `http://${router.ip_address}/login`
    : 'http://192.168.88.1/login';

  res.json({
    status: transaction.status,
    externalReference: transaction.external_reference,
    transactionId: transaction.transaction_id,
    phoneNumber: transaction.phone_number,
    carrier: transaction.network_provider,
    amount: transaction.amount,
    failureReason: transaction.failure_reason,
    plan,
    voucher: voucher ? {
      code: voucher.code,
      password: voucher.password,
      expiresAt: voucher.expires_at,
    } : null,
    hotspotLoginUrl,
  });
});

// Sandbox / Simulation Trigger for testing USSD approval
apiRouter.post('/payments/simulate-approval', async (req: Request, res: Response) => {
  const { externalReference, status = 'SUCCESS', reason, message } = req.body || {};
  if (!externalReference) {
    return res.status(400).json({ error: 'externalReference is required.' });
  }

  const transaction = db.getTransactionByReference(externalReference);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const isFailed = status === 'FAILED' || reason === 'INSUFFICIENT_FUNDS';
  const isNoFunds =
    reason === 'INSUFFICIENT_FUNDS' ||
    (message && String(message).toLowerCase().includes('salio')) ||
    (message && String(message).toLowerCase().includes('insufficient'));

  let failureMsg = 'Mteja alikataa au hakukamilisha malipo kwenye simu.';
  if (isNoFunds) {
    failureMsg = 'Account haina salio la kutosha.';
  } else if (message) {
    failureMsg = String(message);
  }

  const simulatedPayload: WebhookPayload = {
    externalReference,
    transactionId: `${transaction.network_provider.slice(0, 2)}${Date.now()}`,
    status: isFailed ? 'FAILED' : 'SUCCESS',
    amount: transaction.amount,
    currency: 'TZS',
    phoneNumber: transaction.phone_number,
    carrier: transaction.network_provider,
    timestamp: new Date().toISOString(),
    message: isFailed ? failureMsg : 'Payment approved by customer',
  };

  const result = await PaymentGatewayService.processWebhookCallback(simulatedPayload);
  res.json(result);
});

// =============================================================================
// Settings Endpoints
// =============================================================================
apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json(db.getSettings());
});

apiRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const updated = db.saveSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Plans Endpoints (Strict Multi-Tenant Isolation per Hotspot Owner & Router Assignment)
// =============================================================================
apiRouter.get('/plans', (req: Request, res: Response) => {
  const caller = getRequestUser(req);
  const ownerIdQuery = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const routerIdQuery = req.query.routerId ? String(req.query.routerId).trim() : undefined;
  const strictRouter = req.query.strictRouter === 'true';

  // Exclude unowned sample plans
  const allPlans = db.getPlans().filter((p) => !(p.owner_name === 'Japhet Hotspot' && (!p.owner_id || p.owner_id === 2)));

  let resultPlans: PlanRecord[] = [];

  // 1. If a specific ownerId was requested (e.g. from Captive Portal of that router or Admin filter)
  if (ownerIdQuery) {
    resultPlans = allPlans.filter((p) => p.owner_id != null && Number(p.owner_id) === Number(ownerIdQuery));
  } else if (caller && req.query.all !== 'true') {
    // 2. If caller is authenticated (Hotspot Owner, Staff, or Vendor Admin specific view):
    const effectiveOwnerId = Number(caller.parent_owner_id || caller.id);
    resultPlans = allPlans.filter((p) => p.owner_id != null && Number(p.owner_id) === effectiveOwnerId);
  } else if (caller && caller.role === 'VENDOR_ADMIN' && req.query.all === 'true') {
    // 3. If explicit ?all=true is passed by Master Admin:
    resultPlans = allPlans.filter((p) => p.owner_id != null);
  } else {
    // Unauthenticated general query: return empty to prevent data leak
    return res.json([]);
  }

  // Filter by router if requested
  if (routerIdQuery && routerIdQuery !== 'ALL') {
    const targetRouterId = Number(routerIdQuery);
    if (!isNaN(targetRouterId)) {
      if (strictRouter) {
        resultPlans = resultPlans.filter((p) => p.router_id != null && Number(p.router_id) === targetRouterId);
      } else {
        // Includes router-specific plans for this router, plus general packages applicable to all routers (router_id == null)
        resultPlans = resultPlans.filter((p) => p.router_id == null || Number(p.router_id) === targetRouterId);
      }
    }
  }

  // Enrich with router_name if missing
  const routersMap = new Map(db.getRouters().map((r) => [r.id, r]));
  const enriched = resultPlans.map((p) => {
    if (p.router_id && !p.router_name) {
      const r = routersMap.get(Number(p.router_id));
      if (r) return { ...p, router_name: r.name };
    }
    return p;
  });

  res.json(enriched);
});

// Clone/import starter packages for a hotspot owner
apiRouter.post('/plans/clone-defaults', (req: Request, res: Response) => {
  try {
    const caller = getRequestUser(req);
    const { owner_id, router_id } = req.body;
    let targetOwnerId: number | undefined = owner_id ? Number(owner_id) : undefined;
    if (!targetOwnerId && caller) {
      targetOwnerId = caller.role === 'VENDOR_ADMIN' ? undefined : (caller.parent_owner_id || caller.id);
    }

    if (!targetOwnerId) {
      return res.status(400).json({ error: 'Tafadhali chagua mmiliki wa hotspot (owner_id is required).' });
    }

    const owner = db.getOwnerById(targetOwnerId);
    let resolvedRouterId: number | null = null;
    let resolvedRouterName: string | null = null;
    if (router_id && router_id !== 'ALL' && !isNaN(Number(router_id))) {
      resolvedRouterId = Number(router_id);
      const r = db.getRouterById(resolvedRouterId);
      if (r) resolvedRouterName = r.name;
    }

    const starterTemplates = [
      {
        name: 'Masaa 2 - Kasi ya Juu',
        type: 'TIME_BASED' as const,
        limit_uptime: 7200,
        limit_bytes_total: null,
        rate_limit: '2M/4M',
        price: 500,
        validity_period: 7200,
        shared_users: 1,
        is_active: true,
        badge: 'NONE' as const,
        features: ['Masaa 2 bila kikomo cha MB', 'Kasi ya 4 Mbps'],
        description_sw: 'Masaa 2 ya intaneti isiyo na kikomo cha data kwa kasi ya 4Mbps',
        description_en: '2 Hours unlimited browsing at 4Mbps peak speed',
      },
      {
        name: 'Masaa 6 - Standard',
        type: 'TIME_BASED' as const,
        limit_uptime: 21600,
        limit_bytes_total: null,
        rate_limit: '3M/6M',
        price: 1000,
        validity_period: 21600,
        shared_users: 1,
        is_active: true,
        badge: 'POPULAR' as const,
        badge_text: 'Inapendwa Zaidi',
        features: ['Masaa 6 ya kazi & masomo', 'Kasi ya 6 Mbps', 'YouTube & TikTok bila kukwama'],
        description_sw: 'Masaa 6 ya kazi, video na kupakua maudhui mtandaoni',
        description_en: '6 Hours for remote work, streaming, and downloads',
      },
      {
        name: 'Masaa 24 (Siku 1) - Unlimited',
        type: 'TIME_BASED' as const,
        limit_uptime: 86400,
        limit_bytes_total: null,
        rate_limit: '3M/8M',
        price: 1500,
        validity_period: 86400,
        shared_users: 1,
        is_active: true,
        badge: 'BEST_VALUE' as const,
        badge_text: 'Thamani Bora',
        features: ['Saa 24 (siku 1) mfululizo', 'Kasi ya 8 Mbps', 'Inafaa kwa kupakua na simu'],
        description_sw: 'Siku 1 kamili (masaa 24) intaneti mfululizo bila kikomo',
        description_en: 'Full 24-hour unlimited connection at high speed',
      },
      {
        name: 'Siku 7 (Wiki 1) - Kasi Kubwa',
        type: 'TIME_BASED' as const,
        limit_uptime: 604800,
        limit_bytes_total: null,
        rate_limit: '4M/10M',
        price: 5000,
        validity_period: 604800,
        shared_users: 1,
        is_active: true,
        badge: 'SUPER_FAST' as const,
        badge_text: 'Kasi Kubwa',
        features: ['Siku 7 mfululizo bila kikomo', 'Kasi kubwa 10 Mbps', 'QoS prioritization kwa kazi'],
        description_sw: 'Wiki nzima (siku 7) intaneti kasi kubwa bila kukatika',
        description_en: '7 Days continuous broadband internet with QoS',
      },
    ];

    const createdPlans: PlanRecord[] = [];
    for (const tpl of starterTemplates) {
      const plan: PlanRecord = {
        ...tpl,
        id: db.getNextPlanId(),
        owner_id: targetOwnerId,
        owner_name: owner?.business_name || owner?.name,
        router_id: resolvedRouterId,
        router_name: resolvedRouterName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.savePlan(plan);
      createdPlans.push(plan);
    }

    return res.json({
      success: true,
      message: `Vifurushi ${createdPlans.length} vimeongezwa kwenye akaunti ya ${owner?.business_name || 'Owner'}.`,
      plans: createdPlans,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/plans', (req: Request, res: Response) => {
  try {
    const caller = getRequestUser(req);
    const {
      name,
      type = 'TIME_BASED',
      limit_uptime,
      limit_bytes_total,
      rate_limit = '2M/4M',
      price,
      validity_period,
      shared_users = 1,
      badge = 'NONE',
      badge_text = '',
      features = [],
      description_sw = '',
      description_en = '',
      owner_id,
      router_id,
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Jina la kifurushi na bei vinahitajika.' });
    }

    let effectiveOwnerId: number | undefined = owner_id ? Number(owner_id) : undefined;
    if (!effectiveOwnerId && caller) {
      effectiveOwnerId = caller.role === 'VENDOR_ADMIN' ? undefined : (caller.parent_owner_id || caller.id);
    }
    const ownerRecord = effectiveOwnerId ? db.getOwnerById(effectiveOwnerId) : undefined;

    let targetRouterId: number | null = null;
    let targetRouterName: string | null = null;
    if (router_id !== undefined && router_id !== null && router_id !== 'ALL' && router_id !== '' && router_id !== 0) {
      const rNum = Number(router_id);
      if (!isNaN(rNum)) {
        targetRouterId = rNum;
        const matchedRouter = db.getRouterById(rNum);
        if (matchedRouter) {
          targetRouterName = matchedRouter.name;
        }
      }
    }

    const newPlan: PlanRecord = {
      id: db.getNextPlanId(),
      name,
      type,
      owner_id: effectiveOwnerId,
      owner_name: ownerRecord?.business_name || ownerRecord?.name,
      router_id: targetRouterId,
      router_name: targetRouterName,
      limit_uptime: limit_uptime ? Number(limit_uptime) : null,
      limit_bytes_total: limit_bytes_total ? Number(limit_bytes_total) : null,
      rate_limit,
      price: Number(price),
      validity_period: validity_period ? Number(validity_period) : Number(limit_uptime || 3600),
      shared_users: Number(shared_users) || 1,
      is_active: true,
      badge: badge || 'NONE',
      badge_text: badge_text || undefined,
      features: Array.isArray(features) ? features : [],
      description_sw,
      description_en,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.savePlan(newPlan);
    res.json({ success: true, plan: newPlan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/plans/:id', (req: Request, res: Response) => {
  const caller = getRequestUser(req);
  const id = Number(req.params.id);
  const existing = db.getPlanById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  // Security check: If caller is a Hotspot Owner, ensure they can only edit their own packages!
  if (caller && caller.role !== 'VENDOR_ADMIN' && (caller.role as string) !== 'admin') {
    const callerOwnerId = caller.parent_owner_id || caller.id;
    if (existing.owner_id && existing.owner_id !== callerOwnerId) {
      return res.status(403).json({ error: 'Huruhusiwi kubadilisha kifurushi cha mmiliki mwingine.' });
    }
  }

  let updatedRouterId = existing.router_id ?? null;
  let updatedRouterName = existing.router_name ?? null;

  if (req.body.router_id !== undefined) {
    if (req.body.router_id === null || req.body.router_id === 'ALL' || req.body.router_id === '' || req.body.router_id === 0) {
      updatedRouterId = null;
      updatedRouterName = null;
    } else {
      const rNum = Number(req.body.router_id);
      if (!isNaN(rNum)) {
        updatedRouterId = rNum;
        const r = db.getRouterById(rNum);
        updatedRouterName = r ? r.name : (req.body.router_name || null);
      }
    }
  }

  const updated: PlanRecord = {
    ...existing,
    ...req.body,
    id,
    owner_id: existing.owner_id !== undefined ? existing.owner_id : (req.body.owner_id ? Number(req.body.owner_id) : undefined),
    router_id: updatedRouterId,
    router_name: updatedRouterName,
    price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
    features: req.body.features !== undefined ? (Array.isArray(req.body.features) ? req.body.features : []) : existing.features,
    updated_at: new Date().toISOString(),
  };

  db.savePlan(updated);
  res.json({ success: true, plan: updated });
});

apiRouter.delete('/plans/:id', (req: Request, res: Response) => {
  const caller = getRequestUser(req);
  const id = Number(req.params.id);
  const existing = db.getPlanById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  // Security check: If caller is a Hotspot Owner, ensure they can only delete their own packages!
  if (caller && caller.role !== 'VENDOR_ADMIN' && (caller.role as string) !== 'admin') {
    const callerOwnerId = caller.parent_owner_id || caller.id;
    if (existing.owner_id && existing.owner_id !== callerOwnerId) {
      return res.status(403).json({ error: 'Huruhusiwi kufuta kifurushi cha mmiliki mwingine.' });
    }
  }

  const ok = db.deletePlan(id);
  res.json({ success: ok });
});

// =============================================================================
// Voucher Endpoints (Strict Multi-Tenant Isolation)
// =============================================================================
apiRouter.get("/vouchers", (req: Request, res: Response) => {
  let vouchers = db.getVouchers();
  const caller = getRequestUser(req);
  const ownerIdQuery = req.query.ownerId ? String(req.query.ownerId).trim() : null;
  let targetOwnerId: number | undefined;

  if (caller) {
    if (caller.role !== 'VENDOR_ADMIN' && (caller.role as string) !== 'admin') {
      // Hotspot Owner / Staff is strictly locked to their own account or parent owner!
      // They can NEVER view another owner's vouchers, even if another ownerId was requested
      targetOwnerId = Number(caller.parent_owner_id || caller.id);
    } else {
      // Vendor Admin is strictly restricted from viewing all vouchers of the whole network
      // Vouchers belong solely to individual Hotspot Owners
      targetOwnerId = Number(caller.id);
    }
  } else if (ownerIdQuery) {
    const parsed = Number(ownerIdQuery);
    if (!isNaN(parsed) && parsed > 0) {
      targetOwnerId = parsed;
    }
  } else {
    // Unauthenticated request without owner parameter -> Return empty for security
    return res.json([]);
  }

  // If filtering for a specific owner:
  if (targetOwnerId !== undefined) {
    const targetId = targetOwnerId;
    const owner = db.getOwnerById(targetId);
    const ownerRouters = db.getRouters()
      .filter((r: any) => r.owner_id != null && Number(r.owner_id) === targetId)
      .map((r: any) => r.id);
    const allowedRouterIds = new Set<number>([
      ...(owner?.assigned_router_ids || []),
      ...ownerRouters,
    ]);

    vouchers = vouchers.filter((v: any) => {
      // 1. If voucher specifies owner_id, it MUST strictly match targetId
      if (v.owner_id != null && v.owner_id !== '') {
        return Number(v.owner_id) === targetId;
      }
      // 2. If voucher has NO owner_id set, check batch owner_id
      if (v.batch_tag) {
        const b = db.getVoucherBatchById(v.batch_tag);
        if (b && b.owner_id != null) {
          return Number(b.owner_id) === targetId;
        }
      }
      // 3. If voucher has NO owner_id set, check router owner_id
      if (v.router_id != null && allowedRouterIds.has(Number(v.router_id))) {
        const r = db.getRouterById(Number(v.router_id));
        if (r && r.owner_id != null) {
          return Number(r.owner_id) === targetId;
        }
      }
      return false;
    });
  }

  const routerIdQuery = req.query.routerId ? String(req.query.routerId).trim() : null;
  if (routerIdQuery && routerIdQuery !== 'ALL') {
    const parsedRouterId = Number(routerIdQuery);
    if (!isNaN(parsedRouterId)) {
      vouchers = vouchers.filter((v: any) => v.router_id && Number(v.router_id) === parsedRouterId);
    }
  }

  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));
  const routersMap = new Map(db.getRouters().map((r: any) => [r.id, r]));
  const trialConfig = db.getFreeTrialConfig();
  const enriched = vouchers.map((v) => {
    const router = v.router_id ? routersMap.get(Number(v.router_id)) : undefined;
    const isTrial = Boolean(
      v.code?.toUpperCase().startsWith('FREE-') ||
      (v.batch_tag && v.batch_tag.toUpperCase().includes('FREE_TRIAL'))
    );
    const plan = isTrial
      ? {
          id: 0,
          name: trialConfig?.name || 'Majaribio ya Bure (Free Trial)',
          price: 0,
          type: 'TIME_BASED',
          rate_limit: trialConfig?.rate_limit || '2M/4M',
          limit_uptime: (trialConfig?.duration_minutes || 15) * 60,
        }
      : plansMap.get(v.plan_id);

    return {
      ...v,
      router_name: router ? router.name : (v.router_name || undefined),
      plan,
    };
  });
  return res.json(enriched);
});

apiRouter.post('/vouchers/redeem', async (req: Request, res: Response) => {
  const { code, macAddress, planId, selectedPlanId, routerId } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Tafadhali weka nambari ya vocha (Voucher code is required).' });
  }

  const voucher = db.getVoucherByCode(String(code));
  if (!voucher) {
    return res.status(404).json({ error: 'Vocha haijatambulika au siyo sahihi (Invalid voucher code).' });
  }

  if (voucher.status === 'EXPIRED' || voucher.status === 'REVOKED') {
    return res.status(400).json({ error: 'Vocha hii imekwisha muda wake (Voucher expired).' });
  }

  const plan = db.getPlanById(voucher.plan_id);

  // Strict Router Isolation / Lock ("Kusiwe na kushare vocha"):
  const requestedRouterId = routerId ? Number(routerId) : undefined;
  if (voucher.router_id && requestedRouterId && Number(voucher.router_id) !== requestedRouterId) {
    const voucherRouter = db.getRouterById(Number(voucher.router_id));
    const currentRouter = db.getRouterById(requestedRouterId);
    const voucherRouterName = voucherRouter ? voucherRouter.name : (voucher.router_name || `Router #${voucher.router_id}`);
    const currentRouterName = currentRouter ? currentRouter.name : `Router #${requestedRouterId}`;

    return res.status(400).json({
      error: `Kosa: Vocha hii (${voucher.code}) imetengwa kwa ajili ya "${voucherRouterName}". Hairuhusiwi kutumika au kusharewa kwenye mtandao huu wa "${currentRouterName}"!`,
      voucherRouterId: voucher.router_id,
      voucherRouterName,
      currentRouterId: requestedRouterId,
      currentRouterName,
    });
  }

  // Also verify plan router isolation if plan is dedicated to a specific router:
  if (plan?.router_id && requestedRouterId && Number(plan.router_id) !== requestedRouterId) {
    const planRouter = db.getRouterById(Number(plan.router_id));
    const currentRouter = db.getRouterById(requestedRouterId);
    const planRouterName = planRouter ? planRouter.name : (plan.router_name || `Router #${plan.router_id}`);
    const currentRouterName = currentRouter ? currentRouter.name : `Router #${requestedRouterId}`;

    return res.status(400).json({
      error: `Kosa: Kifurushi hiki (${plan.name}) ni mahsusi kwa ajili ya "${planRouterName}", hakiwezi kutumika kwenye mtandao huu wa "${currentRouterName}"!`,
    });
  }

  // Strict package mismatch validation:
  // e.g., if a 6-hour manual voucher is entered for a 12-hour package, reject with a clear error
  const requestedPlanId = planId ? Number(planId) : selectedPlanId ? Number(selectedPlanId) : undefined;
  if (requestedPlanId && voucher.plan_id && Number(voucher.plan_id) !== requestedPlanId) {
    const requestedPlan = db.getPlanById(requestedPlanId);
    const actualPlanName = plan?.name || `Kifurushi cha Masaa ${Math.round((plan?.limit_uptime || 0) / 3600)}`;
    const expectedPlanName = requestedPlan?.name || `Kifurushi cha Masaa ${Math.round((requestedPlan?.limit_uptime || 0) / 3600)}`;

    return res.status(400).json({
      error: `Kifurushi siyo sahihi! Vocha hii ni ya '${actualPlanName}', haiwezi kutumika kwenye '${expectedPlanName}'. Tafadhali chagua kifurushi sahihi cha vocha yako au weka vocha inayolingana.`,
      voucherPlanId: voucher.plan_id,
      voucherPlanName: actualPlanName,
      requestedPlanId,
      requestedPlanName: expectedPlanName,
    });
  }

  let router = voucher.router_id ? db.getRouterById(voucher.router_id) : undefined;
  if (!router && voucher.owner_id) {
    router = db.getRouters().find((r) => Number(r.owner_id) === Number(voucher.owner_id));
  }
  if (!router) {
    router = db.getRouters()[0];
  }
  if (router && !voucher.router_id) {
    voucher.router_id = router.id;
  }

  if (voucher.status === 'AVAILABLE') {
    voucher.status = 'ACTIVE';
    voucher.activated_at = new Date().toISOString();
    if (plan?.validity_period) {
      voucher.expires_at = new Date(Date.now() + plan.validity_period * 1000).toISOString();
    }
  }

  if (macAddress) {
    voucher.mac_address = macAddress;
  }
  voucher.updated_at = new Date().toISOString();
  db.saveVoucher(voucher);

  if (router && plan) {
    await MikrotikService.provisionUser(router, {
      username: voucher.code,
      password: voucher.password,
      limitUptimeSeconds: plan.limit_uptime,
      limitBytesTotal: plan.limit_bytes_total,
      rateLimit: plan.rate_limit,
      macAddress,
      comment: `Redeemed Voucher ${voucher.code}`,
    });
  }

  res.json({
    success: true,
    message: 'Vocha imekubaliwa. Unaunganishwa kwenye intaneti...',
    voucher,
    plan,
    hotspotLoginUrl: router ? `http://${router.ip_address}/login` : 'http://192.168.88.1/login',
  });
});

// =============================================================================
// Batch Voucher Generation (Atomic FreeRADIUS & Thermal/A4 print engine)
// =============================================================================
apiRouter.post('/vouchers/generate', async (req: Request, res: Response) => {
  try {
    const {
      planId,
      quantity = 10,
      routerId,
      ownerId,
      prefix = 'TZ',
      codeLength = 6,
      printFormat = 'A4_GRID',
    } = req.body;

    if (!planId || !quantity) {
      return res.status(400).json({ error: 'Plan ID and quantity are required.' });
    }

    const caller = getRequestUser(req);
    let targetOwnerId: number | undefined;

    if (caller) {
      if (caller.role === 'VENDOR_ADMIN' || (caller.role as string) === 'admin') {
        // Super Admin can allocate vouchers to a specific tenant or system pool
        targetOwnerId = req.body.owner_id ? Number(req.body.owner_id) : (req.body.ownerId ? Number(req.body.ownerId) : (ownerId ? Number(ownerId) : undefined));
      } else {
        // Anti-Spoofing: Tenant / Staff is strictly restricted to their own account or parent owner!
        targetOwnerId = caller.parent_owner_id ? Number(caller.parent_owner_id) : caller.id;
        const candidateOwnerId = req.body.owner_id || req.body.ownerId || ownerId;
        if (candidateOwnerId && String(candidateOwnerId) !== String(targetOwnerId)) {
          return res.status(403).json({
            error: 'Umezuiliwa: Huna mamlaka ya kuzalisha vocha kwa akaunti ya mmiliki mwingine (Owner ID Spoofing detected).',
          });
        }
      }
    } else {
      const candidateOwnerId = req.body.owner_id || req.body.ownerId || ownerId;
      if (candidateOwnerId) {
        const ownerExists = db.getOwnerById(Number(candidateOwnerId));
        if (!ownerExists) {
          return res.status(404).json({ error: 'Mmiliki wa hotspot hakupatikana.' });
        }
        targetOwnerId = ownerExists.id;
      }
    }

    const result = VoucherBatchService.generateBatch({
      planId: Number(planId),
      quantity: Number(quantity),
      routerId: routerId ? Number(routerId) : undefined,
      ownerId: targetOwnerId ? Number(targetOwnerId) : undefined,
      prefix: String(prefix || 'TZ').trim(),
      codeLength: Number(codeLength) || 6,
      printFormat,
    });

    res.json({
      success: true,
      batchTag: result.batch.batch_id,
      count: result.count,
      batch: result.batch,
      vouchers: result.vouchers,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Batch generation failed.' });
  }
});

apiRouter.get('/vouchers/batches', (req: Request, res: Response) => {
  const caller = getRequestUser(req);
  const ownerIdQuery = req.query.ownerId ? String(req.query.ownerId).trim() : null;
  let targetOwnerId: number | undefined;

  if (caller) {
    if (caller.role !== 'VENDOR_ADMIN' && (caller.role as string) !== 'admin') {
      // Hotspot Owner / Staff is strictly locked to their own account or parent owner!
      targetOwnerId = Number(caller.parent_owner_id || caller.id);
    } else {
      // Vendor Admin is strictly restricted: can only view vendor's own batches (if any), never whole network
      targetOwnerId = Number(caller.id);
    }
  } else if (ownerIdQuery) {
    const parsed = Number(ownerIdQuery);
    if (!isNaN(parsed) && parsed > 0) {
      targetOwnerId = parsed;
    }
  } else {
    return res.json([]);
  }

  let batches = db.getVoucherBatches();
  const targetId = targetOwnerId;
  batches = batches.filter((b) => {
    if (b.owner_id != null && b.owner_id !== '') {
      return Number(b.owner_id) === targetId;
    }
    if (b.router_id != null) {
      const r = db.getRouterById(Number(b.router_id));
      if (r && r.owner_id != null) {
        return Number(r.owner_id) === targetId;
      }
    }
    return false;
  });

  const routerIdQuery = req.query.routerId ? String(req.query.routerId).trim() : null;
  if (routerIdQuery && routerIdQuery !== 'ALL') {
    const parsedRouterId = Number(routerIdQuery);
    if (!isNaN(parsedRouterId)) {
      batches = batches.filter((b) => b.router_id && Number(b.router_id) === parsedRouterId);
    }
  }

  const routersMap = new Map(db.getRouters().map((r: any) => [r.id, r]));
  const enrichedBatches = batches.map((b) => {
    const router = b.router_id ? routersMap.get(Number(b.router_id)) : undefined;
    return {
      ...b,
      router_name: router ? router.name : (b.router_name || undefined),
      router_ip: router ? router.ip_address : undefined,
    };
  });

  return res.json(enrichedBatches);
});

apiRouter.get('/vouchers/batches/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;
  const caller = getRequestUser(req);
  const ownerIdQuery = req.query.ownerId ? String(req.query.ownerId).trim() : null;
  let filterOwnerId: number | undefined;

  if (caller) {
    if (caller.role !== 'VENDOR_ADMIN' && (caller.role as string) !== 'admin') {
      filterOwnerId = Number(caller.parent_owner_id || caller.id);
    } else {
      filterOwnerId = Number(caller.id);
    }
  } else if (ownerIdQuery) {
    const parsed = Number(ownerIdQuery);
    if (!isNaN(parsed) && parsed > 0) {
      filterOwnerId = parsed;
    }
  } else {
    return res.status(401).json({ error: 'Uthibitisho unahitajika kuona kundi la vocha.' });
  }

  const batch = VoucherBatchService.getBatchWithVouchers(batchId);
  if (!batch) {
    return res.status(404).json({ error: 'Voucher batch not found.' });
  }

  // Enforce tenant isolation on batch details
  const batchOwnerId = batch.owner_id != null ? Number(batch.owner_id) : undefined;
  if (batchOwnerId !== undefined && filterOwnerId !== undefined && batchOwnerId !== filterOwnerId) {
    return res.status(403).json({ error: 'Huna mamlaka ya kuangalia kundi la vocha la mmiliki mwingine.' });
  }

  const router = batch.router_id ? db.getRouterById(Number(batch.router_id)) : undefined;
  const enrichedBatch = {
    ...batch,
    router_name: router ? router.name : (batch.router_name || undefined),
    router_ip: router ? router.ip_address : undefined,
  };

  res.json(enrichedBatch);
});

// Delete a voucher batch and all its associated vouchers
apiRouter.delete('/vouchers/batches/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;
  const caller = getRequestUser(req);
  const qId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  let targetOwnerId = caller && caller.role !== 'VENDOR_ADMIN' ? Number(caller.parent_owner_id || caller.id) : qId;

  const batch = db.getVoucherBatchById(batchId);
  if (batch && targetOwnerId && batch.owner_id && Number(batch.owner_id) !== targetOwnerId) {
    return res.status(403).json({ error: 'Huna mamlaka ya kufuta batch ya mmiliki mwingine.' });
  }

  // Delete all vouchers associated with this batch tag or batch id
  const deletedVouchers = db.getVouchers().filter(
    (v) => v.batch_tag === batchId || (batch && (v.batch_tag === batch.batch_id || v.batch_tag === (batch as any).batch_tag))
  );
  deletedVouchers.forEach((v) => {
    db.deleteVoucher(v.id);
    if (v.code) {
      db.deleteRadiusUser(v.code);
      db.deleteVoucherByCode(v.code);
    }
  });

  const ok = db.deleteVoucherBatch(batchId);
  return res.json({ success: ok || deletedVouchers.length > 0, message: 'Batch ya vocha imefutwa kikamilifu.', count: deletedVouchers.length });
});

// Delete single voucher by ID
apiRouter.delete('/vouchers/:id', async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const idNum = Number(rawId);
  const voucher = db.getVouchers().find(
    (v) => String(v.id) === String(rawId) || (!isNaN(idNum) && Number(v.id) === idNum)
  );

  const caller = getRequestUser(req);
  if (caller && (caller.role as string) !== 'admin' && caller.role !== 'VENDOR_ADMIN') {
    const callerOwnerId = Number(caller.parent_owner_id || caller.id);
    if (voucher && voucher.owner_id != null && Number(voucher.owner_id) !== callerOwnerId) {
      return res.status(403).json({ error: 'Huna mamlaka ya kufuta vocha ya mmiliki mwingine.' });
    }
  }

  if (voucher) {
    db.deleteVoucher(voucher.id);
    if (voucher.code) {
      db.deleteRadiusUser(voucher.code);
      db.deleteVoucherByCode(voucher.code);
    }
    const router = voucher.router_id ? db.getRouterById(voucher.router_id) : db.getRouters()[0];
    if (router && voucher.code) {
      try { await MikrotikService.deleteUser(router, voucher.code); } catch (e) {}
    }
    return res.json({ success: true, message: 'Vocha imefutwa kikamilifu.' });
  }

  // Fallback: try raw ID deletion
  const ok = db.deleteVoucher(rawId);
  return res.json({ success: ok, message: ok ? 'Vocha imefutwa kikamilifu.' : 'Vocha haikupatikana.' });
});

// Delete single voucher by code (string)
apiRouter.delete('/vouchers/code/:code', async (req: Request, res: Response) => {
  const rawCode = decodeURIComponent(req.params.code).trim();
  const voucher = db.getVouchers().find(
    (v) => v.code && String(v.code).trim().toUpperCase() === rawCode.toUpperCase()
  );

  const caller = getRequestUser(req);
  if (caller && (caller.role as string) !== 'admin' && caller.role !== 'VENDOR_ADMIN') {
    const callerOwnerId = Number(caller.parent_owner_id || caller.id);
    if (voucher && voucher.owner_id != null && Number(voucher.owner_id) !== callerOwnerId) {
      return res.status(403).json({ error: 'Huna mamlaka ya kufuta vocha ya mmiliki mwingine.' });
    }
  }

  if (voucher) {
    db.deleteVoucher(voucher.id);
  }
  db.deleteVoucherByCode(rawCode);
  db.deleteRadiusUser(rawCode);

  const router = voucher?.router_id ? db.getRouterById(voucher.router_id) : db.getRouters()[0];
  if (router) {
    try { await MikrotikService.deleteUser(router, rawCode); } catch (e) {}
  }
  return res.json({ success: true, message: `Vocha '${rawCode}' imefutwa kikamilifu.` });
});

// Bulk delete vouchers by status (AVAILABLE, ACTIVE, EXPIRED, ALL), router, or batch
apiRouter.post(['/vouchers/bulk-delete', '/vouchers/bulk'], async (req: Request, res: Response) => {
  try {
    const caller = getRequestUser(req);
    const reqOwnerId = req.body?.ownerId ?? req.query?.ownerId;
    const parsedOwnerId = reqOwnerId ? Number(reqOwnerId) : undefined;
    let targetOwnerId =
      caller && caller.role !== 'VENDOR_ADMIN'
        ? Number(caller.parent_owner_id || caller.id)
        : parsedOwnerId;

    const rawStatus = String(req.body?.status || req.query?.status || 'ALL').trim().toUpperCase();
    let normalizedStatus: 'AVAILABLE' | 'ACTIVE' | 'EXPIRED' | 'USED' | 'ALL' = 'ALL';
    if (rawStatus === 'AVAILABLE' || rawStatus === 'UNUSED' || rawStatus === 'ZILIZOPO') {
      normalizedStatus = 'AVAILABLE';
    } else if (rawStatus === 'ACTIVE' || rawStatus === 'ZINAZOTUMIKA') {
      normalizedStatus = 'ACTIVE';
    } else if (rawStatus === 'EXPIRED' || rawStatus === 'ZILIZOKWISHA') {
      normalizedStatus = 'EXPIRED';
    } else if (rawStatus === 'USED' || rawStatus === 'ZILIZOTUMIKA') {
      normalizedStatus = 'USED';
    } else {
      normalizedStatus = 'ALL';
    }

    const rawRouterId = req.body?.routerId ?? req.query?.routerId;
    const targetRouterId =
      rawRouterId && rawRouterId !== 'ALL' && !isNaN(Number(rawRouterId))
        ? Number(rawRouterId)
        : undefined;

    const batchTag = req.body?.batchTag ? String(req.body.batchTag).trim() : undefined;

    const allVouchers = db.getVouchers();
    const toDelete = allVouchers.filter((v) => {
      if (targetOwnerId !== undefined && Number(v.owner_id) !== targetOwnerId) {
        return false;
      }
      if (targetRouterId !== undefined && Number(v.router_id) !== targetRouterId) {
        return false;
      }
      if (batchTag && v.batch_tag !== batchTag) {
        return false;
      }
      if (normalizedStatus === 'AVAILABLE' && v.status !== 'AVAILABLE') {
        return false;
      }
      if (normalizedStatus === 'ACTIVE' && v.status !== 'ACTIVE') {
        return false;
      }
      if (normalizedStatus === 'EXPIRED' && v.status !== 'EXPIRED') {
        return false;
      }
      if (normalizedStatus === 'USED' && !(v.status === 'EXPIRED' || v.status === 'ACTIVE' || (v as any).status === 'USED' || !!v.activated_at)) {
        return false;
      }
      return true;
    });

    if (toDelete.length === 0) {
      return res.json({
        success: true,
        count: 0,
        message: 'Hakuna vocha zilizokidhi vigezo vya kufutwa.',
      });
    }

    const targetRouter = targetRouterId ? db.getRouterById(targetRouterId) : undefined;
    for (const v of toDelete) {
      db.deleteVoucher(v.id);
      if (v.code) {
        db.deleteRadiusUser(v.code);
        db.deleteVoucherByCode(v.code);
        const r = v.router_id ? db.getRouterById(v.router_id) : targetRouter;
        if (r) {
          try {
            await MikrotikService.deleteUser(r, v.code);
          } catch {}
        }
      }
    }

    // Clean up empty batches if all vouchers in those batches were deleted
    if (normalizedStatus === 'ALL' || batchTag) {
      const remainingVouchers = db.getVouchers();
      const remainingTags = new Set(remainingVouchers.map((v) => v.batch_tag).filter(Boolean));
      const batches = db.getVoucherBatches(targetOwnerId);
      for (const b of batches) {
        if (!remainingTags.has(b.batch_id) && !remainingTags.has((b as any).batch_tag)) {
          if (batchTag && (b.batch_id === batchTag || (b as any).batch_tag === batchTag)) {
            db.deleteVoucherBatch(b.batch_id);
          } else if (normalizedStatus === 'ALL') {
            db.deleteVoucherBatch(b.batch_id);
          }
        }
      }
    }

    const statusLabel =
      normalizedStatus === 'AVAILABLE'
        ? 'zisizotumika (unused)'
        : normalizedStatus === 'ACTIVE'
        ? 'zinazotumika (active)'
        : normalizedStatus === 'EXPIRED'
        ? 'zilizokwisha muda (expired)'
        : normalizedStatus === 'USED'
        ? 'zilizotumika (used)'
        : 'zote';

    return res.json({
      success: true,
      count: toDelete.length,
      status: normalizedStatus,
      routerId: targetRouterId || 'ALL',
      message: `Jumla ya vocha ${toDelete.length} (${statusLabel}) zimefutwa kikamilifu.`,
    });
  } catch (err: any) {
    console.error('Bulk voucher delete error:', err);
    return res.status(500).json({ error: err.message || 'Hitilafu ya kufuta vocha kwa pamoja.' });
  }
});

// Add single voucher
apiRouter.post('/vouchers', (req: Request, res: Response) => {
  try {
    const { code, password, plan_id, router_id, owner_id } = req.body;
    if (!code || !plan_id) {
      return res.status(400).json({ error: 'Code na plan_id vinahitajika.' });
    }
    const plan = db.getPlanById(Number(plan_id));
    if (!plan) {
      return res.status(404).json({ error: 'Plan haijapatikana.' });
    }
    const caller = getRequestUser(req);
    let targetOwnerId = caller && caller.role !== 'VENDOR_ADMIN' ? Number(caller.parent_owner_id || caller.id) : (owner_id ? Number(owner_id) : undefined);
    const voucher: VoucherRecord = {
      id: db.getNextVoucherId(),
      code: String(code).trim().toUpperCase(),
      password: String(password || code).trim(),
      plan_id: plan.id,
      router_id: router_id ? Number(router_id) : undefined,
      owner_id: targetOwnerId,
      status: 'AVAILABLE',
      batch_tag: 'SINGLE_MANUAL',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan,
    };
    db.saveVoucher(voucher);
    db.addRadiusUser(voucher.code, voucher.password, plan);
    res.json({ success: true, voucher });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/vouchers/batch-generate', async (req: Request, res: Response) => {
  const { planId, quantity, prefix = 'TZ', routerId, ownerId } = req.body;
  if (!planId || !quantity) {
    return res.status(400).json({ error: 'Plan ID and quantity are required.' });
  }

  const caller = getRequestUser(req);
  let targetOwnerId: number | undefined;
  if (caller && (caller.role as string) !== 'admin' && caller.role !== 'VENDOR_ADMIN') {
    targetOwnerId = Number(caller.parent_owner_id || caller.id);
  } else if (ownerId) {
    const owner = db.getOwnerById(Number(ownerId));
    targetOwnerId = owner ? Number(owner.parent_owner_id || owner.id) : Number(ownerId);
  }

  const plan = db.getPlanById(Number(planId));
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const count = Math.min(Math.max(Number(quantity), 1), 100);
  const batchTag = `BATCH-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`;
  const generated: VoucherRecord[] = [];
  const router = routerId
    ? db.getRouterById(Number(routerId))
    : (targetOwnerId ? db.getRouters().find((r) => r.owner_id === targetOwnerId) : db.getRouters()[0]);

  const actualPrefix = prefix && prefix !== 'TZ' ? prefix : 'VCH';
  for (let i = 0; i < count; i++) {
    const code = PaymentGatewayService.generateManualVoucherCode(actualPrefix);
    const voucher: VoucherRecord = {
      id: db.getNextVoucherId(),
      code,
      password: code,
      plan_id: plan.id,
      router_id: router?.id,
      owner_id: targetOwnerId || router?.owner_id,
      status: 'AVAILABLE',
      batch_tag: batchTag,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      plan,
    };
    db.saveVoucher(voucher);
    db.addRadiusUser(code, code, plan);
    generated.push(voucher);

    if (router) {
      MikrotikService.provisionUser(router, {
        username: code,
        password: code,
        limitUptimeSeconds: plan.limit_uptime,
        limitBytesTotal: plan.limit_bytes_total,
        rateLimit: plan.rate_limit,
        comment: `Batch ${batchTag} - ${plan.name}`,
      }).catch(() => {});
    }
  }

  const batchRecord: VoucherBatchRecord = {
    id: Date.now(),
    batch_id: batchTag,
    batch_tag: batchTag,
    plan_id: plan.id,
    plan_name: plan.name,
    price: plan.price,
    quantity: generated.length,
    router_id: router?.id,
    owner_id: targetOwnerId || router?.owner_id,
    prefix: actualPrefix,
    code_length: 6,
    print_format: 'A4_GRID',
    created_at: new Date().toISOString(),
    vouchers: generated,
  };
  db.saveVoucherBatch(batchRecord);

  res.json({
    success: true,
    batchTag,
    count: generated.length,
    vouchers: generated,
  });
});

// =============================================================================
// Authentication & Session Endpoints
// =============================================================================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { usernameOrEmail, password, requestedRole } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Weka barua pepe / simu na nenosiri (Email/Phone and Password required).' });
    }

    const cleanInput = String(usernameOrEmail).trim().toLowerCase();
    const cleanPass = String(password).trim();

    const owners = db.getOwners();
    let user: HotspotOwner | undefined;

    // Check exact username match first
    user = owners.find((o) => o.username && o.username.toLowerCase() === cleanInput);

    if (!user) {
      // Check username aliases 'admin', 'vendor', 'superadmin' (Vendor HQ) and 'user' (Regular Hotspot Owner)
      if (cleanInput === 'admin' || cleanInput === 'vendor' || cleanInput === 'superadmin') {
        user = owners.find((o) => o.role === 'VENDOR_ADMIN') || owners[0];
      } else if (cleanInput === 'user') {
        user = owners.find((o) => o.role === 'HOTSPOT_OWNER') || owners[1];
      } else {
        const matches = owners.filter((o) => {
          const usernameMatch = o.username && o.username.toLowerCase() === cleanInput;
          const emailMatch = o.email && o.email.toLowerCase() === cleanInput;
          const phoneMatch = o.phone && o.phone.replace(/\D/g, '') === cleanInput.replace(/\D/g, '');
          const nameMatch = o.name && o.name.toLowerCase().includes(cleanInput);
          return usernameMatch || emailMatch || phoneMatch || nameMatch;
        });

        if (matches.length > 0) {
          user = requestedRole ? matches.find((m) => m.role === requestedRole) || matches[0] : matches[0];
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Akaunti haijapatikana. Hakikisha jina la mtumiaji (username), barua pepe au nambari ya simu ni sahihi.' });
    }

    // Verify password:
    // Vendor: accepts '1234', 'admin123', 'admin', or custom password
    // Regular User: accepts '1234', '123456', or custom password
    const isVendor = user.role === 'VENDOR_ADMIN';
    const isValid =
      cleanPass === '1234' ||
      cleanPass === user.password ||
      (isVendor && (cleanPass === 'admin123' || cleanPass === 'admin')) ||
      (!isVendor && cleanPass === '123456');

    if (!isValid) {
      return res.status(401).json({ error: 'Nenosiri sio sahihi. Tafadhali jaribu tena.' });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Akaunti hii imesimamishwa kwa sasa na Msimamizi.' });
    }

    // Dynamically evaluate subscription status before returning
    if (user.role === 'HOTSPOT_OWNER') {
      if (!user.subscription_expires_at) {
        user.subscription_expires_at = new Date(Date.now() + 30 * 86400000).toISOString();
        user.subscription_status = 'ACTIVE';
        user.subscription_fee = 15000;
        user.monthly_fee = 15000;
        db.saveOwner(user);
      } else if (new Date(user.subscription_expires_at).getTime() < Date.now()) {
        user.subscription_status = 'EXPIRED';
        db.saveOwner(user);
      }
    }

    const token = `tzwifi_tok_${user.id}_${Date.now()}`;
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || (isVendor ? 'admin' : undefined),
        business_name: user.business_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        assigned_router_ids: user.assigned_router_ids || [],
        parent_owner_id: user.parent_owner_id,
        staff_title: user.staff_title,
        privileges: user.privileges,
        commission_rate: user.commission_rate || 0,
        monthly_fee: user.monthly_fee ?? 15000,
        subscription_fee: user.subscription_fee || 15000,
        subscription_status: user.subscription_status || 'ACTIVE',
        subscription_expires_at: user.subscription_expires_at,
        payout_channel: user.payout_channel,
        wallet_account_number: user.wallet_account_number,
        vendor_merchant_id: user.vendor_merchant_id,
        palmpesa_user_id: user.palmpesa_user_id,
        palmpesa_user_ref: user.palmpesa_user_ref,
        palmpesa_api_token: user.palmpesa_api_token,
        palmpesa_accept_stk: user.palmpesa_accept_stk !== false,
        dalipay_key_id: user.dalipay_key_id,
        dalipay_public_key: user.dalipay_public_key,
        dalipay_secret_key: user.dalipay_secret_key,
        dalipay_api_endpoint: user.dalipay_api_endpoint,
        dalipay_webhook_secret: user.dalipay_webhook_secret,
        portal_theme: user.portal_theme,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Current User Me / Session validation endpoint
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Hakuna kikao kilicho hai (Unauthorized)' });
    }
    const isVendor = user.role === 'VENDOR_ADMIN';
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username || (isVendor ? 'admin' : undefined),
        business_name: user.business_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        assigned_router_ids: user.assigned_router_ids || [],
        parent_owner_id: user.parent_owner_id,
        staff_title: user.staff_title,
        privileges: user.privileges,
        commission_rate: user.commission_rate || 0,
        monthly_fee: user.monthly_fee ?? 15000,
        subscription_fee: user.subscription_fee || 15000,
        subscription_status: user.subscription_status || 'ACTIVE',
        subscription_expires_at: user.subscription_expires_at,
        payout_channel: user.payout_channel,
        wallet_account_number: user.wallet_account_number,
        vendor_merchant_id: user.vendor_merchant_id,
        palmpesa_user_id: user.palmpesa_user_id,
        palmpesa_user_ref: user.palmpesa_user_ref,
        palmpesa_api_token: user.palmpesa_api_token,
        palmpesa_accept_stk: user.palmpesa_accept_stk !== false,
        dalipay_key_id: user.dalipay_key_id,
        dalipay_public_key: user.dalipay_public_key,
        dalipay_secret_key: user.dalipay_secret_key,
        dalipay_api_endpoint: user.dalipay_api_endpoint,
        dalipay_webhook_secret: user.dalipay_webhook_secret,
        portal_theme: user.portal_theme,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

interface PendingRegistration {
  referenceId: string;
  otp: string;
  payload: {
    name: string;
    business_name: string;
    phone: string;
    email: string;
    password: string;
    palmpesa_user_id?: string;
    palmpesa_user_ref?: string;
    palmpesa_api_token?: string;
  };
  expiresAt: number;
  attempts: number;
  createdAt: string;
}

const pendingRegistrations = new Map<string, PendingRegistration>();

// Clean up expired registrations every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, reg] of pendingRegistrations.entries()) {
    if (now > reg.expiresAt) {
      pendingRegistrations.delete(key);
    }
  }
}, 10 * 60 * 1000);

// 1. Initiate User Registration with Email OTP
apiRouter.post('/auth/register-initiate', async (req: Request, res: Response) => {
  try {
    const {
      name,
      business_name,
      phone,
      email,
      password,
      confirm_password,
      confirmPassword,
      palmpesa_user_id,
      palmpesa_user_ref,
      palmpesa_api_token,
    } = req.body;

    if (!name || !business_name || !phone || !email || !password) {
      return res.status(400).json({
        error: 'Tafadhali jaza taarifa zote: Jina Kamili, Jina la Hotspot, Namba ya Simu, Barua Pepe (Email), na Nenosiri.',
      });
    }

    const conf = confirm_password || confirmPassword;
    if (conf && conf !== password) {
      return res.status(400).json({
        error: 'Manenosiri hayafanani! Tafadhali hakikisha Nenosiri na Kurudia Nenosiri yanafanana.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Barua pepe uliyoweka si sahihi. Hakikisha ina muundo kama vile jina@mfano.com',
      });
    }

    const cleanPhone = String(phone).trim();
    const cleanPassword = String(password).trim();
    if (cleanPassword.length < 4) {
      return res.status(400).json({
        error: 'Nenosiri linapaswa kuwa na angalau herufi au tarakimu 4.',
      });
    }

    const owners = db.getOwners();
    const existing = owners.find((o) => {
      const pMatch = o.phone && o.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '');
      const eMatch = o.email && o.email.toLowerCase() === cleanEmail;
      return pMatch || eMatch;
    });

    if (existing) {
      return res.status(409).json({
        error: 'Nambari ya simu au barua pepe hii tayari imesajiliwa. Tafadhali ingia kwenye akaunti yako.',
      });
    }

    const settings = db.getSettings();
    // Strictly determined by Vendor settings in Vendor Admin HQ:
    const requireOtp = settings.requireRegistrationOtp !== false;

    // IF VENDOR DISABLED OTP VERIFICATION: Register instantly!
    if (!requireOtp) {
      const newOwner: any = {
        id: db.getNextOwnerId(),
        name: String(name).trim(),
        business_name: String(business_name).trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password: cleanPassword,
        role: 'HOTSPOT_OWNER',
        status: 'ACTIVE',
        assigned_router_ids: [],
        commission_rate: 0,
        monthly_fee: 15000,
        subscription_fee: 15000,
        subscription_status: 'ACTIVE',
        subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
        palmpesa_user_id: palmpesa_user_id ? String(palmpesa_user_id).trim() : undefined,
        palmpesa_user_ref: palmpesa_user_ref ? String(palmpesa_user_ref).trim() : undefined,
        palmpesa_api_token: palmpesa_api_token ? String(palmpesa_api_token).trim() : undefined,
        palmpesa_accept_stk: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.saveOwner(newOwner);

      db.saveAuditLog({
        id: Date.now(),
        external_reference: `DIRECT-REG-${newOwner.id}`,
        event_type: 'USER_REGISTERED_DIRECT_NO_OTP',
        payload_json: {
          ownerId: newOwner.id,
          email: newOwner.email,
          phone: newOwner.phone,
          businessName: newOwner.business_name,
        },
        created_at: new Date().toISOString(),
      });

      const token = `tzwifi_tok_${newOwner.id}_${Date.now()}`;
      return res.status(201).json({
        success: true,
        requiresOtp: false,
        message: 'Akaunti yako imefunguliwa na kusajiliwa kikamilifu!',
        token,
        user: {
          id: newOwner.id,
          name: newOwner.name,
          business_name: newOwner.business_name,
          email: newOwner.email,
          phone: newOwner.phone,
          role: newOwner.role,
          status: newOwner.status,
          assigned_router_ids: newOwner.assigned_router_ids || [],
          commission_rate: newOwner.commission_rate || 0,
          monthly_fee: 15000,
          subscription_fee: 15000,
          subscription_status: newOwner.subscription_status,
          subscription_expires_at: newOwner.subscription_expires_at,
          payout_channel: newOwner.payout_channel,
          wallet_account_number: newOwner.wallet_account_number,
          vendor_merchant_id: newOwner.vendor_merchant_id,
          palmpesa_user_id: newOwner.palmpesa_user_id,
          palmpesa_user_ref: newOwner.palmpesa_user_ref,
          palmpesa_api_token: newOwner.palmpesa_api_token,
          palmpesa_accept_stk: newOwner.palmpesa_accept_stk !== false,
          dalipay_key_id: newOwner.dalipay_key_id,
          dalipay_public_key: newOwner.dalipay_public_key,
          dalipay_secret_key: newOwner.dalipay_secret_key,
          dalipay_api_endpoint: newOwner.dalipay_api_endpoint,
          dalipay_webhook_secret: newOwner.dalipay_webhook_secret,
          created_at: newOwner.created_at,
        },
      });
    }

    // IF OTP IS ENABLED: Generate 6-digit OTP code and send to email
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const referenceId = `REG-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    pendingRegistrations.set(referenceId, {
      referenceId,
      otp,
      payload: {
        name: String(name).trim(),
        business_name: String(business_name).trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password: cleanPassword,
        palmpesa_user_id: palmpesa_user_id ? String(palmpesa_user_id).trim() : undefined,
        palmpesa_user_ref: palmpesa_user_ref ? String(palmpesa_user_ref).trim() : undefined,
        palmpesa_api_token: palmpesa_api_token ? String(palmpesa_api_token).trim() : undefined,
      },
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      createdAt: new Date().toISOString(),
    });

    // Dispatch Email via EmailService
    const emailResult = await EmailService.sendRegistrationOtp({
      to: cleanEmail,
      name: String(name).trim(),
      otp,
      businessName: String(business_name).trim(),
    });

    return res.json({
      success: true,
      requiresOtp: true,
      message: `Nambari ya uthibitisho (OTP) imetumwa kwenye barua pepe yako: ${cleanEmail}`,
      referenceId,
      email: cleanEmail,
      provider: emailResult.provider,
      simulated: emailResult.simulated,
      debugOtp: emailResult.debugOtp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kuanzisha usajili.' });
  }
});

// Get registration configuration (OTP policy)
apiRouter.get('/auth/registration-config', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    requireOtp: settings.requireRegistrationOtp !== false,
    emailProvider: settings.emailGateway?.provider || 'EMAILJS',
    emailEnabled: settings.emailGateway?.enabled !== false,
  });
});

// Vendor Admin: Update registration OTP policy
apiRouter.put('/auth/registration-config', (req: Request, res: Response) => {
  try {
    const { requireOtp } = req.body;
    const settings = db.getSettings();
    const updated = db.saveSettings({
      ...settings,
      requireRegistrationOtp: Boolean(requireOtp),
    });

    res.json({
      success: true,
      requireOtp: updated.requireRegistrationOtp !== false,
      message: updated.requireRegistrationOtp !== false
        ? 'Uthibitishaji wa OTP wakati wa usajili umewashwa!'
        : 'Uthibitishaji wa OTP wakati wa usajili umezimwa (Usajili wa moja kwa moja umewashwa)!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Hitilafu ya kusasisha sera ya usajili.' });
  }
});

// 2. Verify Email OTP and Complete Account Creation
apiRouter.post('/auth/register-verify', (req: Request, res: Response) => {
  try {
    const { referenceId, otp } = req.body;
    if (!referenceId || !otp) {
      return res.status(400).json({ error: 'Tafadhali weka nambari ya uthibitisho (OTP).' });
    }

    const pending = pendingRegistrations.get(String(referenceId).trim());
    if (!pending) {
      return res.status(404).json({
        error: 'Ombi hili la usajili limekwisha muda wake au halijapatikana. Tafadhali anza usajili upya.',
      });
    }

    if (Date.now() > pending.expiresAt) {
      pendingRegistrations.delete(referenceId);
      return res.status(400).json({
        error: 'Msimbo wa OTP umekwisha muda wake (Dakika 10 zimepita). Tafadhali bonyeza "Tuma Tena OTP".',
      });
    }

    if (pending.attempts >= 5) {
      pendingRegistrations.delete(referenceId);
      return res.status(429).json({
        error: 'Umejaribu mara nyingi bila usahihi. Usajili umefutwa kwa usalama. Tafadhali anza upya.',
      });
    }

    if (pending.otp.trim() !== String(otp).trim()) {
      pending.attempts += 1;
      return res.status(400).json({
        error: `Msimbo wa OTP si sahihi. Majaribio yaliyosalia: ${5 - pending.attempts}`,
      });
    }

    // OTP Validated! Create user in database
    const { payload } = pending;
    const newOwner: any = {
      id: db.getNextOwnerId(),
      name: payload.name,
      business_name: payload.business_name,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      role: 'HOTSPOT_OWNER',
      status: 'ACTIVE',
      assigned_router_ids: [],
      commission_rate: 0,
      monthly_fee: 15000,
      subscription_fee: 15000,
      subscription_status: 'ACTIVE',
      subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      palmpesa_user_id: payload.palmpesa_user_id,
      palmpesa_user_ref: payload.palmpesa_user_ref,
      palmpesa_api_token: payload.palmpesa_api_token,
      palmpesa_accept_stk: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveOwner(newOwner);
    pendingRegistrations.delete(referenceId);

    db.saveAuditLog({
      id: Date.now(),
      external_reference: referenceId,
      event_type: 'USER_REGISTERED_OTP_VERIFIED',
      payload_json: {
        ownerId: newOwner.id,
        email: newOwner.email,
        phone: newOwner.phone,
        businessName: newOwner.business_name,
      },
      created_at: new Date().toISOString(),
    });

    const token = `tzwifi_tok_${newOwner.id}_${Date.now()}`;
    return res.status(201).json({
      success: true,
      message: 'Uthibitisho umekamilika na akaunti yako imefunguliwa!',
      token,
      user: {
        id: newOwner.id,
        name: newOwner.name,
        business_name: newOwner.business_name,
        email: newOwner.email,
        phone: newOwner.phone,
        role: newOwner.role,
        status: newOwner.status,
        assigned_router_ids: newOwner.assigned_router_ids || [],
        commission_rate: newOwner.commission_rate || 0,
        monthly_fee: 15000,
        subscription_fee: 15000,
        subscription_status: newOwner.subscription_status,
        subscription_expires_at: newOwner.subscription_expires_at,
        payout_channel: newOwner.payout_channel,
        wallet_account_number: newOwner.wallet_account_number,
        vendor_merchant_id: newOwner.vendor_merchant_id,
        palmpesa_user_id: newOwner.palmpesa_user_id,
        palmpesa_user_ref: newOwner.palmpesa_user_ref,
        palmpesa_api_token: newOwner.palmpesa_api_token,
        palmpesa_accept_stk: newOwner.palmpesa_accept_stk !== false,
        dalipay_key_id: newOwner.dalipay_key_id,
        dalipay_public_key: newOwner.dalipay_public_key,
        dalipay_secret_key: newOwner.dalipay_secret_key,
        dalipay_api_endpoint: newOwner.dalipay_api_endpoint,
        dalipay_webhook_secret: newOwner.dalipay_webhook_secret,
        created_at: newOwner.created_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kuthibitisha OTP.' });
  }
});

// 3. Resend OTP to User's Email
apiRouter.post('/auth/register-resend-otp', async (req: Request, res: Response) => {
  try {
    const { referenceId } = req.body;
    if (!referenceId) {
      return res.status(400).json({ error: 'referenceId inahitajika.' });
    }

    const pending = pendingRegistrations.get(String(referenceId).trim());
    if (!pending) {
      return res.status(404).json({
        error: 'Ombi hili halijapatikana au limekwisha muda wake. Tafadhali anza usajili upya.',
      });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    pending.otp = newOtp;
    pending.expiresAt = Date.now() + 10 * 60 * 1000;
    pending.attempts = 0;

    const emailResult = await EmailService.sendRegistrationOtp({
      to: pending.payload.email,
      name: pending.payload.name,
      otp: newOtp,
      businessName: pending.payload.business_name,
    });

    return res.json({
      success: true,
      message: `OTP mpya imetumwa kwenye ${pending.payload.email}`,
      debugOtp: emailResult.debugOtp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kutuma tena OTP.' });
  }
});

// 4. Test Email Merchant Gateway (Vendor Admin tool)
apiRouter.post('/email/test', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Barua pepe ya majaribio inahitajika.' });
    }
    const result = await EmailService.sendTestEmail(String(email).trim());
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kutuma barua pepe ya jaribio.' });
  }
});

// User Self-Registration Endpoint (Legacy Direct fallback)
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const {
      name,
      business_name,
      phone,
      email,
      password,
      palmpesa_user_id,
      palmpesa_user_ref,
      palmpesa_api_token,
    } = req.body;

    if (!name || !business_name || !phone || !password) {
      return res.status(400).json({
        error: 'Tafadhali jaza Jina Kamili, Jina la Biashara/Hotspot, Namba ya Simu, na Nenosiri.',
      });
    }

    const cleanPhone = String(phone).trim();
    const cleanEmail = email ? String(email).trim().toLowerCase() : `${cleanPhone.replace(/\D/g, '')}@tzwifi.local`;
    const cleanPassword = String(password).trim();

    if (cleanPassword.length < 4) {
      return res.status(400).json({
        error: 'Nenosiri linapaswa kuwa na angalau herufi au tarakimu 4.',
      });
    }

    const owners = db.getOwners();

    // Check if phone or email already registered
    const existing = owners.find((o) => {
      const pMatch = o.phone && o.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '');
      const eMatch = o.email && o.email.toLowerCase() === cleanEmail.toLowerCase();
      return pMatch || eMatch;
    });

    if (existing) {
      return res.status(409).json({
        error: 'Nambari ya simu au barua pepe hii tayari imesajiliwa. Tafadhali ingia kwenye akaunti yako.',
      });
    }

    const newOwner: any = {
      id: db.getNextOwnerId(),
      name: String(name).trim(),
      business_name: String(business_name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPassword,
      role: 'HOTSPOT_OWNER',
      status: 'ACTIVE',
      assigned_router_ids: [],
      commission_rate: 0,
      monthly_fee: 15000,
      subscription_fee: 15000,
      subscription_status: 'ACTIVE',
      subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      palmpesa_user_id: palmpesa_user_id ? String(palmpesa_user_id).trim() : undefined,
      palmpesa_user_ref: palmpesa_user_ref ? String(palmpesa_user_ref).trim() : undefined,
      palmpesa_api_token: palmpesa_api_token ? String(palmpesa_api_token).trim() : undefined,
      palmpesa_accept_stk: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveOwner(newOwner);

    const token = `tzwifi_tok_${newOwner.id}_${Date.now()}`;
    return res.status(201).json({
      success: true,
      message: 'Akaunti imesajiliwa kikamilifu!',
      token,
      user: {
        id: newOwner.id,
        name: newOwner.name,
        business_name: newOwner.business_name,
        email: newOwner.email,
        phone: newOwner.phone,
        role: newOwner.role,
        status: newOwner.status,
        assigned_router_ids: newOwner.assigned_router_ids || [],
        commission_rate: newOwner.commission_rate || 0,
        monthly_fee: 15000,
        subscription_fee: 15000,
        subscription_status: newOwner.subscription_status,
        subscription_expires_at: newOwner.subscription_expires_at,
        palmpesa_user_id: newOwner.palmpesa_user_id,
        palmpesa_user_ref: newOwner.palmpesa_user_ref,
        palmpesa_api_token: newOwner.palmpesa_api_token,
        palmpesa_accept_stk: newOwner.palmpesa_accept_stk !== false,
        dalipay_key_id: newOwner.dalipay_key_id,
        dalipay_public_key: newOwner.dalipay_public_key,
        dalipay_secret_key: newOwner.dalipay_secret_key,
        dalipay_api_endpoint: newOwner.dalipay_api_endpoint,
        dalipay_webhook_secret: newOwner.dalipay_webhook_secret,
        payout_channel: newOwner.payout_channel,
        wallet_account_number: newOwner.wallet_account_number,
        vendor_merchant_id: newOwner.vendor_merchant_id,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kusajili akaunti.' });
  }
});

// =============================================================================
// Hotspot Owners & Multi-Tenant User Management with Granular Privileges
// =============================================================================
// Hotspot Owners Management Endpoints
// =============================================================================
apiRouter.get("/owners", (req: Request, res: Response) => {
  let owners = db.getOwners();
  const { parentOwnerId, role, status, excludeParent, includeSubUsers, scope, all } = req.query;

  const caller = getRequestUser(req);
  if (caller && caller.role !== "VENDOR_ADMIN") {
    const parentId = caller.parent_owner_id ? Number(caller.parent_owner_id) : caller.id;
    owners = owners.filter((o: any) => Number(o.id) === Number(parentId) || (o.parent_owner_id != null && Number(o.parent_owner_id) === Number(parentId)));
  } else if (caller && caller.role === "VENDOR_ADMIN") {
    if (!parentOwnerId && includeSubUsers !== 'true' && all !== 'true' && !role && scope !== 'hq_admins') {
      owners = owners.filter((o: any) => !o.parent_owner_id && !o.is_sub_user);
    }
  }

  if (scope === 'hq_admins') {
    // Only HQ administrators / staff created under Vendor HQ (parent_owner_id === 1 or role === VENDOR_ADMIN or without tenant parent)
    owners = owners.filter((o) => o.role === 'VENDOR_ADMIN' || Number(o.parent_owner_id) === 1 || (!o.parent_owner_id && o.role !== 'HOTSPOT_OWNER'));
  }

  if (parentOwnerId) {
    const pIdStr = String(parentOwnerId);
    if (excludeParent === 'true') {
      owners = owners.filter((o) => o.parent_owner_id != null && String(o.parent_owner_id) === pIdStr);
    } else {
      // Include parent and all their staff/subusers
      owners = owners.filter((o) => String(o.id) === pIdStr || (o.parent_owner_id != null && String(o.parent_owner_id) === pIdStr));
    }
  } else if (includeSubUsers !== 'true' && scope !== 'hq_admins' && all !== 'true') {
    // Top-level Hotspot Owners list MUST strictly exclude sub-users, cashiers, technicians, managers
    owners = owners.filter((o: any) => 
      !o.parent_owner_id && 
      !o.is_sub_user && 
      String(o.role || '').toUpperCase() !== 'CASHIER' &&
      String(o.role || '').toUpperCase() !== 'MANAGER' &&
      String(o.role || '').toUpperCase() !== 'TECHNICIAN' &&
      String(o.role || '').toUpperCase() !== 'OPERATOR' &&
      String(o.role || '').toUpperCase() !== 'STAFF' &&
      String(o.role || '').toUpperCase() !== 'VIEWER'
    );
  }

  if (role) {
    owners = owners.filter((o) => o.role === role);
  }

  if (status) {
    owners = owners.filter((o) => o.status === status);
  }

  res.json(owners);
});

apiRouter.post('/owners', (req: Request, res: Response) => {
  try {
    const {
      name,
      username,
      business_name,
      email,
      phone,
      password,
      role = 'HOTSPOT_OWNER',
      status = 'ACTIVE',
      parent_owner_id,
      staff_title,
      privileges,
      assigned_router_ids = [],
      commission_rate = 0,
      monthly_fee = 10000,
      palmpesa_user_id,
      palmpesa_user_ref,
      palmpesa_api_token,
      palmpesa_accept_stk = true,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Jina na nambari ya simu vinahitajika.' });
    }

    if (username && String(username).trim()) {
      const cleanU = String(username).trim().toLowerCase();
      const existingUser = db.getOwners().find((o) => o.username && o.username.toLowerCase() === cleanU);
      if (existingUser) {
        return res.status(400).json({ error: 'Jina la mtumiaji (username) hili tayari linatumika. Tafadhali chagua jingine.' });
      }
    }

    let resolvedBusinessName = business_name;
    let resolvedParentId = parent_owner_id ? Number(parent_owner_id) : undefined;
    let resolvedRouters = Array.isArray(assigned_router_ids)
      ? assigned_router_ids.map(Number).filter((id) => id !== 3 && db.getRouterById(id) != null)
      : [];

    if (resolvedParentId && !resolvedBusinessName) {
      const parent = db.getOwnerById(resolvedParentId);
      if (parent) {
        resolvedBusinessName = parent.business_name;
      }
    }

    const defaultPrivileges: UserPrivileges =
      privileges || (role === 'CASHIER'
        ? { can_generate_vouchers: true, can_view_vouchers: true, can_print_vouchers: true }
        : role === 'MANAGER'
        ? { can_generate_vouchers: true, can_view_vouchers: true, can_print_vouchers: true, can_view_reports: true, can_view_active_users: true, can_kick_users: true, can_manage_subusers: true }
        : role === 'TECHNICIAN'
        ? { can_manage_routers: true, can_reboot_routers: true, can_view_active_users: true, can_kick_users: true }
        : role === 'OPERATOR'
        ? { can_generate_vouchers: true, can_view_vouchers: true, can_view_active_users: true, can_kick_users: true }
        : role === 'VIEWER'
        ? { can_view_reports: true, can_view_vouchers: true, can_view_active_users: true }
        : role === 'VENDOR_ADMIN'
        ? {
            can_manage_routers: true,
            can_reboot_routers: true,
            can_manage_plans: true,
            can_generate_vouchers: true,
            can_view_vouchers: true,
            can_print_vouchers: true,
            can_kick_users: true,
            can_view_active_users: true,
            can_view_reports: true,
            can_export_reports: true,
            can_manage_subusers: true,
            can_customize_portal: true,
            can_manage_payments: true,
            can_manage_gateways: true,
            can_manage_devops: true,
            can_manage_tenants: true,
            can_reset_system: true,
          }
        : {
            can_manage_routers: true,
            can_reboot_routers: true,
            can_manage_plans: true,
            can_generate_vouchers: true,
            can_view_vouchers: true,
            can_print_vouchers: true,
            can_kick_users: true,
            can_view_active_users: true,
            can_view_reports: true,
            can_export_reports: true,
            can_manage_subusers: true,
            can_customize_portal: true,
            can_manage_payments: true,
            can_manage_gateways: true,
          });

    const owner: HotspotOwner = {
      id: db.getNextOwnerId(),
      name: String(name).trim(),
      username: username ? String(username).trim() : undefined,
      business_name: String(resolvedBusinessName || name).trim(),
      email: email ? String(email).trim() : `${String(phone).replace(/\D/g, '')}@tzwifi.local`,
      phone: String(phone).trim(),
      password: password ? String(password).trim() : '123456',
      role: role as UserRole,
      status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      parent_owner_id: resolvedParentId,
      is_sub_user: Boolean(resolvedParentId || (role && !['HOTSPOT_OWNER', 'VENDOR_ADMIN'].includes(role))),
      staff_title: staff_title ? String(staff_title).trim() : undefined,
      privileges: defaultPrivileges,
      assigned_router_ids: resolvedRouters,
      commission_rate: Number(commission_rate) || 0,
      monthly_fee: Number(monthly_fee) ?? 10000,
      subscription_status: 'ACTIVE',
      subscription_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      subscription_fee: 15000,
      palmpesa_user_id: palmpesa_user_id ? String(palmpesa_user_id).trim() : undefined,
      palmpesa_user_ref: palmpesa_user_ref ? String(palmpesa_user_ref).trim() : undefined,
      palmpesa_api_token: palmpesa_api_token ? String(palmpesa_api_token).trim() : undefined,
      palmpesa_accept_stk: palmpesa_accept_stk !== false,
      dalipay_public_key: req.body.dalipay_public_key ? String(req.body.dalipay_public_key).trim() : undefined,
      dalipay_secret_key: req.body.dalipay_secret_key ? String(req.body.dalipay_secret_key).trim() : undefined,
      dalipay_key_id: req.body.dalipay_key_id ? String(req.body.dalipay_key_id).trim() : undefined,
      dalipay_api_endpoint: req.body.dalipay_api_endpoint ? String(req.body.dalipay_api_endpoint).trim() : undefined,
      dalipay_webhook_secret: req.body.dalipay_webhook_secret ? String(req.body.dalipay_webhook_secret).trim() : undefined,
      payout_channel: req.body.payout_channel || (req.body.dalipay_public_key ? 'DALIPAY' : req.body.palmpesa_user_id ? 'PALMPESA' : undefined),
      wallet_account_number: req.body.wallet_account_number ? String(req.body.wallet_account_number).trim() : undefined,
      vendor_merchant_id: req.body.vendor_merchant_id ? String(req.body.vendor_merchant_id).trim() : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveOwner(owner);

    // Sync assigned routers with owner info
    for (const rId of (owner.assigned_router_ids || [])) {
      const r = db.getRouterById(rId);
      if (r) {
        if (!r.owner_id || owner.role === 'HOTSPOT_OWNER') {
          r.owner_id = owner.id;
          r.owner_name = `${owner.name} (${owner.business_name})`;
          db.saveRouter(r);
        }
      }
    }

    res.json({ success: true, message: 'Mtumiaji amehifadhiwa kikamilifu!', owner });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.put('/owners/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.getOwnerById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Mtumiaji/Miliki haijapatikana.' });
  }

  if (req.body.username !== undefined && req.body.username !== existing.username) {
    const cleanU = String(req.body.username).trim().toLowerCase();
    if (cleanU) {
      const duplicate = db.getOwners().find((o) => o.id !== id && o.username && o.username.toLowerCase() === cleanU);
      if (duplicate) {
        return res.status(400).json({ error: 'Jina hili la mtumiaji (username) tayari limesajiliwa kwenye akaunti nyingine.' });
      }
    }
  }

  const updated: HotspotOwner = {
    ...existing,
    ...req.body,
    id,
    name: req.body.name ? String(req.body.name).trim() : existing.name,
    username: req.body.username !== undefined ? (req.body.username ? String(req.body.username).trim() : undefined) : existing.username,
    business_name: req.body.business_name ? String(req.body.business_name).trim() : existing.business_name,
    email: req.body.email ? String(req.body.email).trim() : existing.email,
    phone: req.body.phone ? String(req.body.phone).trim() : existing.phone,
    password: req.body.password ? String(req.body.password).trim() : existing.password,
    role: req.body.role ? (req.body.role as UserRole) : existing.role,
    status: req.body.status ? (req.body.status as 'ACTIVE' | 'SUSPENDED') : existing.status,
    staff_title: req.body.staff_title !== undefined ? req.body.staff_title : existing.staff_title,
    parent_owner_id: req.body.parent_owner_id !== undefined ? (req.body.parent_owner_id ? Number(req.body.parent_owner_id) : undefined) : existing.parent_owner_id,
    is_sub_user: req.body.is_sub_user !== undefined ? Boolean(req.body.is_sub_user) : Boolean((req.body.parent_owner_id !== undefined ? req.body.parent_owner_id : existing.parent_owner_id) || (req.body.role ? !['HOTSPOT_OWNER', 'VENDOR_ADMIN'].includes(req.body.role) : existing.is_sub_user)),
    privileges: req.body.privileges !== undefined ? { ...(existing.privileges || {}), ...req.body.privileges } : existing.privileges,
    monthly_fee: req.body.monthly_fee !== undefined ? Number(req.body.monthly_fee) : existing.monthly_fee ?? 10000,
    palmpesa_user_id: req.body.palmpesa_user_id !== undefined ? (req.body.palmpesa_user_id ? String(req.body.palmpesa_user_id).trim() : undefined) : existing.palmpesa_user_id,
    palmpesa_user_ref: req.body.palmpesa_user_ref !== undefined ? (req.body.palmpesa_user_ref ? String(req.body.palmpesa_user_ref).trim() : undefined) : existing.palmpesa_user_ref,
    palmpesa_api_token: req.body.palmpesa_api_token !== undefined ? (req.body.palmpesa_api_token ? String(req.body.palmpesa_api_token).trim() : undefined) : existing.palmpesa_api_token,
    palmpesa_accept_stk: req.body.palmpesa_accept_stk !== undefined ? Boolean(req.body.palmpesa_accept_stk) : (existing.palmpesa_accept_stk ?? true),
    dalipay_public_key: req.body.dalipay_public_key !== undefined ? (req.body.dalipay_public_key ? String(req.body.dalipay_public_key).trim() : undefined) : existing.dalipay_public_key,
    dalipay_secret_key: req.body.dalipay_secret_key !== undefined ? (req.body.dalipay_secret_key ? String(req.body.dalipay_secret_key).trim() : undefined) : existing.dalipay_secret_key,
    dalipay_key_id: req.body.dalipay_key_id !== undefined ? (req.body.dalipay_key_id ? String(req.body.dalipay_key_id).trim() : undefined) : existing.dalipay_key_id,
    dalipay_api_endpoint: req.body.dalipay_api_endpoint !== undefined ? (req.body.dalipay_api_endpoint ? String(req.body.dalipay_api_endpoint).trim() : undefined) : existing.dalipay_api_endpoint,
    dalipay_webhook_secret: req.body.dalipay_webhook_secret !== undefined ? (req.body.dalipay_webhook_secret ? String(req.body.dalipay_webhook_secret).trim() : undefined) : existing.dalipay_webhook_secret,
    payout_channel: req.body.payout_channel !== undefined ? req.body.payout_channel : existing.payout_channel,
    wallet_account_number: req.body.wallet_account_number !== undefined ? (req.body.wallet_account_number ? String(req.body.wallet_account_number).trim() : undefined) : existing.wallet_account_number,
    vendor_merchant_id: req.body.vendor_merchant_id !== undefined ? (req.body.vendor_merchant_id ? String(req.body.vendor_merchant_id).trim() : undefined) : existing.vendor_merchant_id,
    assigned_router_ids: req.body.assigned_router_ids
      ? req.body.assigned_router_ids.map(Number)
      : existing.assigned_router_ids,
    updated_at: new Date().toISOString(),
  };

  db.saveOwner(updated);

  // Sync assigned routers
  if (Array.isArray(req.body.assigned_router_ids)) {
    for (const rId of updated.assigned_router_ids) {
      const r = db.getRouterById(rId);
      if (r && updated.role === 'HOTSPOT_OWNER') {
        r.owner_id = updated.id;
        r.owner_name = `${updated.name} (${updated.business_name})`;
        db.saveRouter(r);
      }
    }
  }

  res.json({ success: true, message: 'Taarifa na ruhusa zimesasishwa kikamilifu!', owner: updated });
});

// Dedicated Account Edit Endpoint (Self-profile, Username & Password Update)
apiRouter.put('/owners/:id/account', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.getOwnerById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Akaunti haijapatikana.' });
  }

  const { username, name, email, phone, business_name, currentPassword, newPassword } = req.body;

  // Check username uniqueness if changed
  if (username !== undefined) {
    const cleanU = String(username).trim().toLowerCase();
    if (cleanU) {
      const duplicate = db.getOwners().find((o) => o.id !== id && o.username && o.username.toLowerCase() === cleanU);
      if (duplicate) {
        return res.status(400).json({ error: 'Jina hili la mtumiaji (username) tayari limesajiliwa kwenye akaunti nyingine.' });
      }
      existing.username = String(username).trim();
    } else {
      existing.username = undefined;
    }
  }

  if (name && String(name).trim()) existing.name = String(name).trim();
  if (business_name && String(business_name).trim()) existing.business_name = String(business_name).trim();
  if (email && String(email).trim()) existing.email = String(email).trim();
  if (phone && String(phone).trim()) existing.phone = String(phone).trim();

  // If updating password:
  if (newPassword && String(newPassword).trim()) {
    const cleanNewPass = String(newPassword).trim();
    if (cleanNewPass.length < 4) {
      return res.status(400).json({ error: 'Nenosiri jipya lazima liwe na angalau tarakimu 4.' });
    }
    if (currentPassword && existing.password && existing.password !== String(currentPassword).trim()) {
      return res.status(400).json({ error: 'Nenosiri la sasa uliloweka si sahihi.' });
    }
    existing.password = cleanNewPass;
  }

  existing.updated_at = new Date().toISOString();
  db.saveOwner(existing);

  res.json({
    success: true,
    message: 'Taarifa za akaunti na nenosiri zimesasishwa kikamilifu!',
    owner: existing,
    user: existing,
  });
});

// Dedicated Privilege Update Endpoint
apiRouter.put('/owners/:id/privileges', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.getOwnerById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Mtumiaji hajapatikana.' });
  }

  const newPrivileges: UserPrivileges = {
    ...(existing.privileges || {}),
    ...(req.body.privileges || {}),
  };

  existing.privileges = newPrivileges;
  if (req.body.role) existing.role = req.body.role as UserRole;
  if (req.body.staff_title !== undefined) existing.staff_title = req.body.staff_title;
  if (req.body.status) existing.status = req.body.status;
  if (Array.isArray(req.body.assigned_router_ids)) {
    existing.assigned_router_ids = req.body.assigned_router_ids.map(Number);
  }
  existing.updated_at = new Date().toISOString();

  db.saveOwner(existing);
  res.json({
    success: true,
    message: `Ruhusa (Privileges) za ${existing.name} zimesasishwa kikamilifu!`,
    owner: existing,
    privileges: existing.privileges,
  });
});

apiRouter.post('/owners/:id/toggle-subscription', (req: Request, res: Response) => {
  try {
    const ownerId = Number(req.params.id);
    const { action, isExpired, days = 30 } = req.body || {};
    const owner = db.getOwnerById(ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, error: 'Mtumiaji/Mmiliki wa Hotspot hajapatikana.' });
    }

    if (owner.role === 'VENDOR_ADMIN' || owner.id === 1) {
      return res.status(400).json({ success: false, error: 'Huwezi kusitisha subscription ya Vendor Master HQ!' });
    }

    const shouldExpire = action === 'expire' || isExpired === true;

    if (shouldExpire) {
      owner.subscription_status = 'EXPIRED';
      owner.subscription_expires_at = new Date(Date.now() - 3600000).toISOString();
    } else {
      const daysToAdd = Math.max(1, Number(days) || 30);
      owner.subscription_status = 'ACTIVE';
      owner.subscription_expires_at = new Date(Date.now() + daysToAdd * 86400000).toISOString();
    }
    owner.updated_at = new Date().toISOString();
    const updated = db.saveOwner(owner);

    db.saveAuditLog({
      id: Date.now(),
      external_reference: `SUB-TOGGLE-${owner.id}-${Date.now()}`,
      event_type: shouldExpire ? 'ADMIN_FORCE_EXPIRED_USER_SUBSCRIPTION' : 'ADMIN_RESTORED_USER_SUBSCRIPTION_ACTIVE',
      payload_json: {
        adminAction: shouldExpire ? 'FORCE_EXPIRE' : 'ACTIVATE',
        ownerId: owner.id,
        businessName: owner.business_name,
        newStatus: owner.subscription_status,
        expiresAt: owner.subscription_expires_at,
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      owner: updated,
      message: shouldExpire
        ? `Subscription ya ${owner.business_name} (${owner.name}) imesitishwa (EXPIRED)!`
        : `Subscription ya ${owner.business_name} (${owner.name}) imewashwa (ACTIVE)!`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Hitilafu ya kubadili hali ya subscription.' });
  }
});

// =============================================================================
// Monthly Subscription Ledger & Reporting Module Endpoints
// =============================================================================
apiRouter.get('/subscriptions/report', (req: Request, res: Response) => {
  try {
    const { startDate, endDate, status, search } = req.query;
    const allOwners = db.getOwners().filter(
      (o) => o.role === 'HOTSPOT_OWNER' && !o.is_sub_user && !o.parent_owner_id
    );
    const allRouters = db.getRouters();
    const allTransactions = db.getTransactions();

    const now = Date.now();
    const startMs = startDate ? new Date(String(startDate)).getTime() : null;
    const endMs = endDate ? new Date(String(endDate) + 'T23:59:59.999Z').getTime() : null;

    const items = allOwners.map((owner) => {
      const ownerRouters = allRouters.filter((r) => r.owner_id === owner.id);
      const defaultFee = db.getSettings().subscriptionMonthlyFee || 15000;
      const monthlyFee = Number(owner.monthly_fee || owner.subscription_fee || defaultFee);

      const expiresAt = owner.subscription_expires_at ? new Date(owner.subscription_expires_at) : null;
      const expiresAtMs = expiresAt ? expiresAt.getTime() : 0;

      // Find subscription transactions for this owner
      const subTxs = allTransactions
        .filter(
          (t) =>
            t.owner_id === owner.id &&
            (t.external_reference?.startsWith('SUB-') ||
              t.external_reference?.startsWith('MAN-SUB-') ||
              t.external_reference?.startsWith('BULK-SUB-') ||
              !t.router_id) &&
            t.status === 'SUCCESS'
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const lastPayment = subTxs[0] || null;

      // Filter payments within the specified date range
      const rangePayments = subTxs.filter((t) => {
        const txTime = new Date(t.created_at).getTime();
        if (startMs && txTime < startMs) return false;
        if (endMs && txTime > endMs) return false;
        return true;
      });

      const totalPaidInRange = rangePayments.reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Determine payment status
      let isPaid = false;
      if (startMs || endMs) {
        if (rangePayments.length > 0) {
          isPaid = true;
        } else if (
          owner.subscription_status === 'ACTIVE' &&
          expiresAtMs >= (startMs || 0) &&
          expiresAtMs > now
        ) {
          isPaid = true;
        } else {
          isPaid = false;
        }
      } else {
        isPaid =
          (owner.subscription_status === 'ACTIVE' || owner.subscription_status === 'TRIAL') &&
          (expiresAtMs > now || !owner.subscription_expires_at);
      }

      const daysRemaining = expiresAtMs > now ? Math.ceil((expiresAtMs - now) / 86400000) : 0;
      const daysOverdue = expiresAtMs < now && expiresAtMs > 0 ? Math.ceil((now - expiresAtMs) / 86400000) : 0;

      return {
        id: owner.id,
        name: owner.name,
        business_name: owner.business_name || 'Hotspot Business',
        email: owner.email,
        phone: owner.phone,
        router_count: ownerRouters.length,
        monthly_fee: monthlyFee,
        subscription_status: owner.subscription_status || 'EXPIRED',
        subscription_expires_at: owner.subscription_expires_at,
        is_paid: isPaid,
        days_remaining: daysRemaining,
        days_overdue: daysOverdue,
        last_payment_date: lastPayment ? lastPayment.created_at : null,
        last_payment_amount: lastPayment ? lastPayment.amount : null,
        last_payment_reference: lastPayment ? lastPayment.external_reference : null,
        total_paid_in_range: totalPaidInRange,
        payment_count_in_range: rangePayments.length,
        created_at: owner.created_at,
        history: subTxs.slice(0, 5),
      };
    });

    let filtered = items;
    if (status === 'PAID') {
      filtered = filtered.filter((i) => i.is_paid);
    } else if (status === 'UNPAID' || status === 'EXPIRED') {
      filtered = filtered.filter((i) => !i.is_paid);
    }

    if (search) {
      const q = String(search).toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.business_name.toLowerCase().includes(q) ||
          i.phone.toLowerCase().includes(q) ||
          (i.email && i.email.toLowerCase().includes(q))
      );
    }

    const totalOwners = items.length;
    const paidCount = items.filter((i) => i.is_paid).length;
    const unpaidCount = totalOwners - paidCount;
    const totalCollected = items
      .filter((i) => i.is_paid)
      .reduce((sum, i) => sum + (i.total_paid_in_range > 0 ? i.total_paid_in_range : i.monthly_fee), 0);
    const totalPending = items.filter((i) => !i.is_paid).reduce((sum, i) => sum + i.monthly_fee, 0);

    const defaultSubPrice = db.getSettings().subscriptionMonthlyFee || 15000;

    return res.json({
      default_subscription_price: defaultSubPrice,
      summary: {
        total_owners: totalOwners,
        paid_count: paidCount,
        unpaid_count: unpaidCount,
        total_collected_tzs: totalCollected,
        total_pending_tzs: totalPending,
      },
      owners: filtered,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kupakia ripoti ya subscription.' });
  }
});

apiRouter.delete('/owners/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const targetOwner = db.getOwnerById(id);
  if (!targetOwner) {
    return res.status(404).json({ error: 'Mmiliki hakupatikana kwenye mfumo.' });
  }

  // Prevent deleting the main system vendor admin account
  if (targetOwner.role === 'VENDOR_ADMIN' && targetOwner.id === 1) {
    return res.status(403).json({
      error: 'Akaunti Kuu ya Msimamizi Mkuu wa Mfumo (Vendor Admin HQ) haiwezi kufutwa.',
    });
  }

  const ok = db.deleteOwner(id);
  res.json({ success: ok });
});

// =============================================================================
// MikroTik RouterOS Management Endpoints (CRUD & Live Test)
// =============================================================================
apiRouter.get('/routers', (req: Request, res: Response) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : null;
  const routers = db.getRouters().filter(
    (r) => r.id !== 3 && !r.name?.toLowerCase().includes('mwenge') && !r.location?.toLowerCase().includes('mwenge')
  );
  if (ownerId) {
    const owner = db.getOwnerById(ownerId);
    if (owner) {
      const assigned = owner.assigned_router_ids || [];
      return res.json(routers.filter((r) => r.owner_id === ownerId || assigned.includes(r.id)));
    }
    return res.json(routers.filter((r) => r.owner_id === ownerId));
  }
  res.json(routers);
});

const DEFAULT_SERVER_PORTAL_THEME: PortalThemeConfig = {
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

apiRouter.get('/portal/info', (req: Request, res: Response) => {
  const routerId = req.query.routerId ? Number(req.query.routerId) : undefined;
  const ownerId = (req.query.ownerId || req.query.owner_id) ? Number(req.query.ownerId || req.query.owner_id) : undefined;
  const ip = req.query.ip ? String(req.query.ip) : undefined;

  const routers = db.getRouters();
  const owners = db.getOwners();

  // If ownerId is provided, resolve the owner directly
  const owner = ownerId ? db.getOwnerById(ownerId) : undefined;
  let matched: RouterRecord | undefined = undefined;

  if (owner) {
    const isVendor = owner.role === 'VENDOR_ADMIN';
    const assigned = owner.assigned_router_ids || [];

    // Strict tenant router isolation:
    // Vendor Admin can ONLY see routers specifically registered to Vendor HQ (r.owner_id === owner.id)
    // Hotspot Owner can ONLY see routers specifically owned by or assigned to them
    const allowedRouters = routers.filter((r) => Number(r.owner_id) === Number(owner.id) || assigned.includes(r.id));

    if (routerId) {
      matched = allowedRouters.find((r) => r.id === routerId);
    } else if (ip) {
      matched = allowedRouters.find((r) => r.ip_address === ip || ip.startsWith(r.ip_address.slice(0, 7)));
    }

    if (!matched && allowedRouters.length > 0) {
      matched = allowedRouters[0];
    }
  } else {
    // Unauthenticated client connecting via Hotspot IP or direct routerId
    if (routerId) {
      matched = routers.find((r) => r.id === routerId);
    } else if (ip) {
      matched = routers.find((r) => r.ip_address === ip || ip.startsWith(r.ip_address.slice(0, 7)));
    }
  }

  // If no router belongs to this owner or found, NEVER fall back to another owner's router!
  if (!matched) {
    const isVendor = owner?.role === 'VENDOR_ADMIN';
    const brandName = isVendor
      ? (owner.business_name || 'INFOTECH WiFi (Vendor HQ)')
      : (owner?.business_name || owner?.name || 'Hotspot Yako');

    const activeTheme: PortalThemeConfig = {
      ...DEFAULT_SERVER_PORTAL_THEME,
      brandName,
      supportPhone: owner?.phone || '+255 754 000 111',
      ...(owner?.portal_theme || {}),
    };

    return res.json({
      platformName: 'INFOTECH WiFi',
      hasRouter: false,
      router: null,
      routerId: null,
      siteName: '',
      routerName: '',
      ownerId: owner?.id || ownerId || null,
      ownerName: owner?.name || (isVendor ? 'Vendor HQ' : ''),
      ownerBusinessName: owner?.business_name || brandName,
      brandName,
      ssid: isVendor ? 'VENDOR-HQ-WIFI' : '',
      hasPaymentGateway: Boolean(
        (owner?.dalipay_public_key && (owner?.dalipay_secret_key || owner?.dalipay_key_id)) ||
        owner?.dalipay_public_key ||
        (owner?.palmpesa_user_id && owner?.palmpesa_api_token) ||
        owner?.palmpesa_api_token ||
        owner?.wallet_account_number
      ),
      gatewayWarning: null,
      message: isVendor
        ? 'Huna router iliyosajiliwa moja kwa moja kwenye akaunti ya Vendor HQ bado.'
        : 'Huna router iliyounganishwa kwenye akaunti hii bado.',
      supportPhone: owner?.phone || '+255 754 000 111',
      portalTheme: activeTheme,
      routers: [],
    });
  }

  // A valid matched router belongs strictly to this owner/setup
  const effectiveOwner = owner || (matched.owner_id ? db.getOwnerById(matched.owner_id) : undefined);
  const effectiveOwnerRouters = effectiveOwner
    ? routers.filter((r) => r.owner_id === effectiveOwner.id || (effectiveOwner.assigned_router_ids || []).includes(r.id))
    : [matched];

  const settings = db.getSettings();

  // Check if payment API has been configured by this owner or router
  // (DaliPay requires public key and secret key; key_id is optional)
  const hasDaliPay = Boolean(
    (effectiveOwner?.dalipay_public_key && (effectiveOwner?.dalipay_secret_key || effectiveOwner?.dalipay_key_id)) ||
    effectiveOwner?.dalipay_public_key ||
    (matched?.dalipay_public_key && (matched?.dalipay_secret_key || matched?.dalipay_key_id)) ||
    matched?.dalipay_public_key ||
    (settings.dalipay?.publicKey && settings.dalipay?.secretKey) ||
    process.env.DALIPAY_PUBLIC_KEY
  );
  const hasPalmPesa = Boolean(
    (effectiveOwner?.palmpesa_user_id && effectiveOwner?.palmpesa_api_token) ||
    effectiveOwner?.palmpesa_api_token ||
    (matched?.palmpesa_user_id && matched?.palmpesa_api_token) ||
    matched?.palmpesa_api_token ||
    (settings.palmpesa?.userId && settings.palmpesa?.apiToken) ||
    process.env.PALMPESA_API_TOKEN
  );
  const hasDirectWallet = Boolean(
    effectiveOwner?.wallet_account_number ||
    (effectiveOwner?.payout_channel && effectiveOwner?.payout_channel !== 'MANUAL')
  );
  const hasPaymentGateway = Boolean(hasDaliPay || hasPalmPesa || hasDirectWallet);

  const siteName = matched.name;
  const brandName = matched.brand_name || matched.name || effectiveOwner?.business_name || 'INFOTECH WiFi';
  const ssid = matched.ssid || `${matched.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 16)}-WIFI`;
  const location = matched.location || 'Tanzania';

  const activeTheme: PortalThemeConfig = {
    ...DEFAULT_SERVER_PORTAL_THEME,
    supportPhone: effectiveOwner?.phone || matched.ip_address || '+255 754 000 111',
    ...(effectiveOwner?.portal_theme || {}),
    ...(matched.portal_theme || {}),
    // Ensure the router's site name / brand name takes precedence
    brandName,
  };

  res.json({
    platformName: 'INFOTECH WiFi',
    hasRouter: true,
    router: matched,
    routerId: matched.id,
    siteName,
    routerName: matched.name,
    ownerId: effectiveOwner?.id || matched.owner_id,
    hasPaymentGateway,
    gatewayWarning: hasPaymentGateway
      ? null
      : 'Mmiliki wa mtandao huu bado hajaweka geti la malipo (Payment API). Tafadhali weka kwanza API ya malipo kwenye dashibodi ili kuruhusu wateja kulipia intaneti.',
    brandName,
    ssid,
    ownerBusinessName: effectiveOwner?.business_name || brandName,
    location: matched.location || 'Tanzania',
    supportPhone: effectiveOwner?.phone || '+255 754 000 111',
    portalTheme: activeTheme,
    routers: effectiveOwnerRouters.map((r) => ({
      id: r.id,
      name: r.name,
      brand_name: r.brand_name || r.name,
      ssid: r.ssid || `${r.name}-WIFI`,
      location: r.location,
    })),
  });
});

// =============================================================================
// Free Trial (1-Click Instant 15-Minute Connection with Lifetime Single-Use per MAC)
// =============================================================================

// =============================================================================
// Free Trial (Instant 1-Click Connect & Configurable Limits)
// =============================================================================

// Check if MAC is eligible or already claimed (based on dynamic config)
apiRouter.get('/portal/free-trial/status', (req: Request, res: Response) => {
  const config = db.getFreeTrialConfig();
  const mac = (req.query.mac as string) || '';

  if (!config.enabled) {
    return res.json({
      available: false,
      claimed: false,
      enabled: false,
      config,
      message: 'Majaribio ya bure yamezimwa na msimamizi kwa sasa.',
    });
  }

  if (!mac) {
    return res.json({
      available: false,
      claimed: false,
      enabled: true,
      config,
      message: 'MAC address haijatolewa.',
    });
  }

  const normalizedMac = db.normalizeMac(mac);
  const existingClaim = db.getFreeTrialClaimByMac(normalizedMac);

  if (existingClaim) {
    const claimDate = new Date(existingClaim.claimed_at);
    const claimDateStr = claimDate.toLocaleDateString('sw-TZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let isLocked = false;
    let lockMessage = '';

    if (config.lock_policy === 'LIFETIME') {
      isLocked = true;
      lockMessage = `Kifaa hiki (${existingClaim.mac_address}) kimeshatumia muda wa majaribio wa bure (tarehe ${claimDateStr}). Kila kifaa kinaruhusiwa mara 1 tu milele.`;
    } else if (config.lock_policy === 'DAILY') {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (claimDate.getTime() > oneDayAgo) {
        isLocked = true;
        lockMessage = `Kifaa hiki (${existingClaim.mac_address}) kilitumia muda wa majaribio ndani ya saa 24 zilizopita. Jaribu tena baada ya masaa 24!`;
      }
    } else if (config.lock_policy === 'WEEKLY') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      if (claimDate.getTime() > sevenDaysAgo) {
        isLocked = true;
        lockMessage = `Kifaa hiki (${existingClaim.mac_address}) kilitumia muda wa majaribio wiki hii. Jaribu tena wiki ijayo!`;
      }
    }

    if (isLocked) {
      return res.json({
        available: false,
        claimed: true,
        enabled: true,
        mac: existingClaim.mac_address,
        voucherCode: existingClaim.voucher_code,
        claimedAt: existingClaim.claimed_at,
        expiresAt: existingClaim.expires_at,
        durationMinutes: config.duration_minutes,
        rateLimit: config.rate_limit,
        quotaMb: config.quota_mb,
        config,
        message: lockMessage,
      });
    }
  }

  return res.json({
    available: true,
    claimed: false,
    enabled: true,
    mac: normalizedMac,
    durationMinutes: config.duration_minutes,
    rateLimit: config.rate_limit,
    quotaMb: config.quota_mb,
    config,
    message: `Kifaa hiki kinastahili kupata intaneti ya bure ya dakika ${config.duration_minutes} papo hapo!`,
  });
});

// Claim 1-Click Free Trial (Instant Activation with Custom Limits)
apiRouter.post('/portal/free-trial/claim', async (req: Request, res: Response) => {
  try {
    const { mac, ip, routerId } = req.body;
    if (!mac) {
      return res.status(400).json({
        error: 'MAC Address ya kifaa chako inahitajika ili kufungua intaneti ya bure.',
      });
    }

    const config = db.getFreeTrialConfig();
    if (!config.enabled) {
      return res.status(403).json({
        error: 'Majaribio ya bure yamezimwa na msimamizi kwa sasa.',
      });
    }

    const result = await db.claimFreeTrial(mac, ip || req.ip, routerId ? Number(routerId) : undefined);

    if (!result.success) {
      return res.status(409).json({
        error: result.error,
        claimed: true,
      });
    }

    return res.json({
      success: true,
      message: `Umefanikiwa kujiunga na intaneti ya bure ya dakika ${config.duration_minutes} papo hapo!`,
      voucher: result.voucher,
      claim: result.claim,
      durationMinutes: config.duration_minutes,
      durationSeconds: config.duration_minutes * 60,
      config,
    });
  } catch (err: any) {
    console.error('Error claiming free trial:', err);
    return res.status(500).json({
      error: err.message || 'Hitilafu ya kufungua intaneti ya bure.',
    });
  }
});

// Admin: Get Free Trial Package Configuration
apiRouter.get('/admin/free-trial/config', (_req: Request, res: Response) => {
  const config = db.getFreeTrialConfig();
  res.json(config);
});

// Admin: Update Free Trial Package Configuration and Limits
apiRouter.put('/admin/free-trial/config', (req: Request, res: Response) => {
  try {
    const updated = db.updateFreeTrialConfig(req.body);
    res.json({
      success: true,
      message: 'Mipangilio na limiti za kifurushi cha majaribio ya bure zimehifadhiwa kikamilifu!',
      config: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Imeshindwa kusasisha mipangilio ya bure.' });
  }
});

// Admin: List all claimed free trials
apiRouter.get('/admin/free-trials', (_req: Request, res: Response) => {
  const claims = db.getAllFreeTrialClaims();
  const config = db.getFreeTrialConfig();
  res.json({
    totalClaims: claims.length,
    claims,
    config,
  });
});

// Admin: Reset a specific MAC address to allow claiming again
apiRouter.delete('/admin/free-trials/reset-mac', (req: Request, res: Response) => {
  const mac = (req.body?.mac || req.query?.mac) as string;
  if (!mac) {
    return res.status(400).json({ error: 'MAC address inahitajika.' });
  }

  const removed = db.deleteFreeTrialClaimByMac(mac);
  if (removed) {
    return res.json({
      success: true,
      message: `MAC (${mac}) imefutwa kwenye rekodi. Kifaa hiki kinaweza kujaribu intaneti ya bure tena!`,
    });
  } else {
    return res.status(404).json({
      error: `MAC (${mac}) haijapatikana kwenye orodha ya vifaa vilivyotumia bure.`,
    });
  }
});

// Admin: Reset all free trial claims
apiRouter.delete('/admin/free-trials/reset-all', (_req: Request, res: Response) => {
  db.clearAllFreeTrialClaims();
  res.json({
    success: true,
    message: 'Rekodi zote za vifaa vilivyotumia intaneti ya bure zimefutwa kikamilifu!',
  });
});

// Get owner or router theme configuration
apiRouter.get('/portal/theme', (req: Request, res: Response) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const routerId = req.query.routerId ? Number(req.query.routerId) : undefined;

  let theme: PortalThemeConfig = { ...DEFAULT_SERVER_PORTAL_THEME };

  if (routerId) {
    const router = db.getRouterById(routerId);
    if (router) {
      const owner = router.owner_id ? db.getOwnerById(router.owner_id) : (ownerId ? db.getOwnerById(ownerId) : undefined);
      if (owner?.portal_theme) {
        theme = { ...theme, ...owner.portal_theme };
      }
      if (router.portal_theme) {
        theme = { ...theme, ...router.portal_theme };
      }
      theme.brandName = router.brand_name || router.name || owner?.business_name || theme.brandName;
      return res.json({ success: true, theme, routerName: router.name, siteName: router.name });
    }
  }

  if (ownerId) {
    const owner = db.getOwnerById(ownerId);
    if (owner) {
      if (owner.portal_theme) {
        theme = { ...theme, ...owner.portal_theme };
      } else {
        theme.brandName = owner.business_name;
        theme.supportPhone = owner.phone;
      }
    }
  }

  res.json({ success: true, theme });
});

// Save owner or router portal theme customization
apiRouter.put('/portal/theme', (req: Request, res: Response) => {
  try {
    const { ownerId, routerId, theme } = req.body;

    if (!theme) {
      return res.status(400).json({ error: 'Data za mandhari ya captive portal zinahitajika (Theme data required).' });
    }

    if (ownerId) {
      const owner = db.getOwnerById(Number(ownerId));
      if (!owner) {
        return res.status(404).json({ error: 'Mmiliki wa Hotspot hajapatikana.' });
      }

      owner.portal_theme = {
        ...DEFAULT_SERVER_PORTAL_THEME,
        ...(owner.portal_theme || {}),
        ...theme,
      };
      db.saveOwner(owner);

      // Also propagate to their assigned routers if router doesn't have custom override
      const routers = db.getRouters();
      for (const r of routers) {
        if (r.owner_id === owner.id || (owner.assigned_router_ids || []).includes(r.id)) {
          r.portal_theme = owner.portal_theme;
          if (theme.brandName) r.brand_name = theme.brandName;
          db.saveRouter(r);
        }
      }

      return res.json({ success: true, message: 'Mandhari ya Captive Portal imehifadhiwa kikamilifu!', theme: owner.portal_theme });
    }

    if (routerId) {
      const router = db.getRouterById(Number(routerId));
      if (!router) {
        return res.status(404).json({ error: 'Router haijapatikana.' });
      }

      router.portal_theme = {
        ...DEFAULT_SERVER_PORTAL_THEME,
        ...(router.portal_theme || {}),
        ...theme,
      };
      if (theme.brandName) router.brand_name = theme.brandName;
      db.saveRouter(router);

      return res.json({ success: true, message: 'Mandhari ya router imehifadhiwa kikamilifu!', theme: router.portal_theme });
    }

    return res.status(400).json({ error: 'Tafadhali taja ownerId au routerId kuweka mipangilio.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kuhifadhi mandhari.' });
  }
});

// =============================================================================
// Monthly Subscription Renewal Endpoints (TZS 15,000/Month)
// =============================================================================
apiRouter.get('/subscription/status', (req: Request, res: Response) => {
  const ownerId = Number(req.query.ownerId);
  if (!ownerId) {
    return res.status(400).json({ error: 'ownerId is required.' });
  }

  const owner = db.getOwnerById(ownerId);
  if (!owner) {
    return res.status(404).json({ error: 'Owner not found.' });
  }

  const fee = owner.subscription_fee || owner.monthly_fee || db.getSettings().subscriptionMonthlyFee || 15000;
  const expiresAt = owner.subscription_expires_at || new Date(Date.now() + 30 * 86400000).toISOString();
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = diffMs <= 0 && owner.role === 'HOTSPOT_OWNER';

  if (isExpired && owner.subscription_status !== 'EXPIRED') {
    owner.subscription_status = 'EXPIRED';
    db.saveOwner(owner);
  }

  res.json({
    success: true,
    ownerId: owner.id,
    businessName: owner.business_name,
    subscriptionStatus: owner.subscription_status || (isExpired ? 'EXPIRED' : 'ACTIVE'),
    subscriptionExpiresAt: expiresAt,
    daysRemaining,
    isExpired,
    subscriptionFee: fee,
  });
});

/**
 * Resolves the Vendor HQ Aggregator Account configured in the Vendor section
 * (PalmPesa User ID: 770 / AzamPay / Vodacom) for collecting monthly subscriptions
 */
function resolveVendorAggregatorForSubscription(): {
  gateway: 'PALMPESA' | 'AZAMPAY' | 'VODACOM' | 'TEST_SANDBOX';
  aggregatorName: string;
  merchantId: string;
  receivingAccount: string;
  isConfigured: boolean;
  isSandbox: boolean;
  destinationSummary: string;
} {
  const settings = db.getSettings();
  const owners = db.getOwners();
  const vendorOwner = owners.find((o) => o.role === 'VENDOR_ADMIN') || owners[0];

  const gateway =
    settings.subscriptionGateway && settings.subscriptionGateway !== 'ACTIVE_DEFAULT'
      ? settings.subscriptionGateway
      : settings.activeGateway;

  if (gateway === 'DALIPAY') {
    const dali = settings.dalipay;
    const keyId = (dali?.keyId || process.env.DALIPAY_KEY_ID || '').trim();
    const publicKey = (dali?.publicKey || process.env.DALIPAY_PUBLIC_KEY || '').trim();
    const secretKey = (dali?.secretKey || process.env.DALIPAY_SECRET_KEY || '').trim();
    const isConfigured = Boolean(publicKey && secretKey);
    return {
      gateway: 'DALIPAY' as any,
      aggregatorName: keyId ? `DaliPay Aggregator (Key: ${keyId})` : 'DaliPay Aggregator',
      merchantId: keyId,
      receivingAccount: publicKey,
      isConfigured,
      isSandbox: Boolean(dali?.isSandbox),
      destinationSummary: isConfigured
        ? `Akaunti ya DaliPay ya Vendor (Key ID: ${keyId || 'N/A'}, Environment: ${dali?.isSandbox ? 'Test Sandbox' : 'Live'})`
        : 'Akaunti ya DaliPay haijasanidiwa bado (Weka API Key kwanza)',
    };
  }

  if (gateway === 'AZAMPAY') {
    const azam = settings.azampay;
    const merchantId = azam?.clientId || vendorOwner?.vendor_merchant_id || 'AZAMPAY-VENDOR-HQ';
    const receivingAccount = azam?.accountNumber || vendorOwner?.wallet_account_number || 'AZAMPAY-ESCROW-01';
    const isConfigured = Boolean(azam?.clientId && azam?.clientSecret);
    return {
      gateway: 'AZAMPAY',
      aggregatorName: `AzamPay Aggregator (${azam?.appName || 'Vendor Platform'})`,
      merchantId,
      receivingAccount,
      isConfigured,
      isSandbox: Boolean(azam?.isSandbox),
      destinationSummary: `Akaunti ya AzamPay ya Vendor (Merchant: ${merchantId}, Account: ${receivingAccount})`,
    };
  }

  if (gateway === 'VODACOM_OPENAPI') {
    const voda = settings.vodacom;
    const shortcode = voda?.shortcode || vendorOwner?.wallet_account_number || '000000';
    return {
      gateway: 'VODACOM',
      aggregatorName: `Vodacom M-Pesa Direct (Shortcode: ${shortcode})`,
      merchantId: shortcode,
      receivingAccount: shortcode,
      isConfigured: Boolean(voda?.apiKey),
      isSandbox: Boolean(voda?.isSandbox),
      destinationSummary: `Akaunti ya Vodacom M-Pesa ya Vendor (Shortcode: ${shortcode})`,
    };
  }

  // Default: PalmPesa Aggregator configured in Vendor section (USER ID: 770)
  const palmpesa = settings.palmpesa;
  const userId = String(palmpesa?.userId || vendorOwner?.palmpesa_user_id || '770');
  const userRef = String(palmpesa?.userRef || vendorOwner?.palmpesa_user_ref || 'USR-B2510CD582DF');
  const isConfigured = Boolean(palmpesa?.apiToken || userId);

  return {
    gateway: 'PALMPESA',
    aggregatorName: `PalmPesa Vendor Master Aggregator (User ID: ${userId})`,
    merchantId: userId,
    receivingAccount: userRef,
    isConfigured,
    isSandbox: Boolean(palmpesa?.isSandbox),
    destinationSummary: `Akaunti ya PalmPesa ya Vendor (User ID: ${userId}, Ref: ${userRef})`,
  };
}

apiRouter.post(['/subscription/initiate', '/payments/subscription-push'], async (req: Request, res: Response) => {
  try {
    const { ownerId, phoneNumber, carrier } = req.body;
    if (!ownerId || !phoneNumber) {
      return res.status(400).json({ error: 'Nambari ya simu na akaunti ya mmiliki vinahitajika.' });
    }

    const callbackUrl = getEffectiveCallbackUrl(req);
    const result = await PaymentGatewayService.initiateSubscriptionPush({
      ownerId: Number(ownerId),
      phoneNumber: String(phoneNumber),
      carrier,
      callbackUrl,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Hitilafu ya kuanzisha malipo ya subscription kupitia aggregator API.' });
  }
});

apiRouter.post('/subscription/confirm', (req: Request, res: Response) => {
  try {
    const { ownerId, externalReference, simulateSuccess = true } = req.body;
    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required.' });
    }

    const owner = db.getOwnerById(Number(ownerId));
    if (!owner) {
      return res.status(404).json({ error: 'Mmiliki wa Hotspot hajapatikana.' });
    }

    const vendorAggregator = resolveVendorAggregatorForSubscription();
    const fee = owner.subscription_fee || owner.monthly_fee || db.getSettings().subscriptionMonthlyFee || 15000;

    // Add 30 days of active subscription
    const currentExpiryTime = owner.subscription_expires_at ? new Date(owner.subscription_expires_at).getTime() : 0;
    const baseTime = currentExpiryTime > Date.now() ? currentExpiryTime : Date.now();
    const newExpiry = new Date(baseTime + 30 * 86400000).toISOString();

    owner.subscription_expires_at = newExpiry;
    owner.subscription_status = 'ACTIVE';
    owner.updated_at = new Date().toISOString();
    db.saveOwner(owner);

    // Update existing transaction or create confirmed transaction credited to Vendor Aggregator
    const existingTx = externalReference ? db.getTransactionByReference(externalReference) : undefined;
    const txId = `SUB-TX-${Date.now()}`;

    if (existingTx) {
      existingTx.status = 'SUCCESS';
      existingTx.transaction_id = txId;
      existingTx.vendor_merchant_id = vendorAggregator.merchantId;
      existingTx.vendor_amount = fee;
      existingTx.gateway_provider = vendorAggregator.aggregatorName;
      existingTx.is_subscription = true;
      existingTx.plan_id = 0;
      existingTx.plan_name = 'Monthly Subscription Fee';
      existingTx.updated_at = new Date().toISOString();
      db.saveTransaction(existingTx);
    } else {
      const tx: TransactionRecord = {
        id: db.getNextTransactionId(),
        phone_number: owner.phone,
        network_provider: 'VODACOM' as any,
        amount: fee,
        external_reference: externalReference || `SUB-${owner.id}-${Date.now()}`,
        transaction_id: txId,
        status: 'SUCCESS',
        plan_id: 0,
        is_subscription: true,
        plan_name: 'Monthly Subscription Fee',
        owner_id: owner.id,
        vendor_merchant_id: vendorAggregator.merchantId,
        vendor_amount: fee, // 100% credited to Vendor Aggregator
        platform_fee: 0,
        gateway_provider: vendorAggregator.aggregatorName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.saveTransaction(tx);
    }

    // Save audit log documenting fund routing to Vendor Aggregator
    db.saveAuditLog({
      id: Date.now(),
      external_reference: externalReference || `SUB-${owner.id}`,
      event_type: 'VENDOR_SUBSCRIPTION_CREDITED_TO_AGGREGATOR',
      payload_json: {
        ownerId: owner.id,
        ownerBusinessName: owner.business_name,
        amountPaid: fee,
        creditedTo: vendorAggregator.aggregatorName,
        merchantId: vendorAggregator.merchantId,
        receivingAccount: vendorAggregator.receivingAccount,
        destinationSummary: vendorAggregator.destinationSummary,
        newSubscriptionExpiresAt: newExpiry,
        status: 'CONFIRMED_AND_UNLOCKED',
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Malipo ya Sh ${fee.toLocaleString()} yamekamilika! Mfumo wako umefunguliwa na muda wako umeongezwa hadi tarehe ${new Date(newExpiry).toLocaleDateString('sw-TZ')}.`,
      user: owner,
      newExpiresAt: newExpiry,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kukamilisha malipo.' });
  }
});

// Get active subscription price & settings
apiRouter.get('/subscription/settings/price', (_req: Request, res: Response) => {
  const settings = db.getSettings();
  res.json({
    price: settings.subscriptionMonthlyFee || 15000,
    activeGateway: settings.subscriptionGateway || settings.activeGateway,
  });
});

// Update global subscription price & optionally apply to all hotspot owners
apiRouter.post('/subscription/settings/price', (req: Request, res: Response) => {
  try {
    const { price, applyToAllOwners = true } = req.body;
    const numPrice = Number(price);
    if (!numPrice || isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'Tafadhali weka kiasi sahihi cha bei ya subscription (namba chanya).' });
    }

    const settings = db.getSettings();
    settings.subscriptionMonthlyFee = numPrice;
    db.saveSettings(settings);

    let updatedCount = 0;
    if (applyToAllOwners) {
      const owners = db.getOwners();
      for (const o of owners) {
        if (o.role === 'HOTSPOT_OWNER' && !o.is_sub_user && !o.parent_owner_id) {
          o.subscription_fee = numPrice;
          o.monthly_fee = numPrice;
          o.updated_at = new Date().toISOString();
          db.saveOwner(o);
          updatedCount++;
        }
      }
    }

    db.saveAuditLog({
      id: Date.now(),
      external_reference: `SUB-PRICE-${Date.now()}`,
      event_type: 'SUBSCRIPTION_PRICE_UPDATED',
      payload_json: {
        newPrice: numPrice,
        applyToAllOwners,
        updatedCount,
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      price: numPrice,
      updatedOwnersCount: updatedCount,
      message: `Bei mpya ya subscription imewekwa TZS ${numPrice.toLocaleString()}/mwezi${
        applyToAllOwners ? ` na kusasishwa kwa wamiliki ${updatedCount}.` : '.'
      }`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kubadilisha bei ya subscription.' });
  }
});

// Update specific hotspot owner's monthly subscription fee
apiRouter.post('/owners/:id/subscription-fee', (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { fee } = req.body;
    const numFee = Number(fee);
    if (isNaN(numFee) || numFee <= 0) {
      return res.status(400).json({ error: 'Tafadhali weka kiasi sahihi cha ada ya subscription.' });
    }

    const owner = db.getOwnerById(id);
    if (!owner) {
      return res.status(404).json({ error: 'Mmiliki hakupatikana.' });
    }

    owner.subscription_fee = numFee;
    owner.monthly_fee = numFee;
    owner.updated_at = new Date().toISOString();
    db.saveOwner(owner);

    return res.json({
      success: true,
      owner,
      message: `Ada ya kila mwezi ya mmiliki '${owner.business_name}' imewekwa TZS ${numFee.toLocaleString()}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kusasisha ada ya mmiliki.' });
  }
});

// Subscription Status Polling / Verification Endpoint (With Active Gateway Query)
apiRouter.get('/subscription/verify/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params;

  // Actively check status with DaliPay / PalmPesa if still pending
  const statusResult = await PaymentGatewayService.checkTransactionStatus(reference);
  const transaction = statusResult.transaction || db.getTransactionByReference(reference);

  if (!transaction) {
    return res.status(404).json({ paid: false, status: 'NOT_FOUND', error: 'Muamala haujapatikana.' });
  }

  const isSuccess = transaction.status === 'SUCCESS';
  const owner = transaction.owner_id ? db.getOwnerById(transaction.owner_id) : undefined;

  return res.json({
    paid: isSuccess,
    status: transaction.status,
    externalReference: transaction.external_reference,
    transactionId: transaction.transaction_id,
    amount: transaction.amount,
    failureReason: transaction.failure_reason,
    user: owner,
    expiresAt: owner?.subscription_expires_at,
  });
});

// Admin-Only: Toggle / Simulate Subscription Expiration for Hotspot Owner Users
apiRouter.post('/subscription/toggle-expire', (req: Request, res: Response) => {
  try {
    const { ownerId, isExpired, days = 30 } = req.body;
    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId inahitajika (ownerId is required).' });
    }

    const owner = db.getOwnerById(Number(ownerId));
    if (!owner) {
      return res.status(404).json({ error: 'Mtumiaji/Mmiliki wa Hotspot hajapatikana.' });
    }

    if (owner.role === 'VENDOR_ADMIN') {
      return res.status(400).json({ error: 'Akaunti ya Vendor Master HQ haina ukomo wa subscription.' });
    }

    const targetExpired = Boolean(isExpired);

    if (targetExpired) {
      // Force expired state: set expiry to 1 hour in the past
      owner.subscription_status = 'EXPIRED';
      owner.subscription_expires_at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      owner.updated_at = new Date().toISOString();
      db.saveOwner(owner);

      db.saveAuditLog({
        id: Date.now(),
        external_reference: `TEST-EXP-${owner.id}-${Date.now()}`,
        event_type: 'ADMIN_FORCE_EXPIRED_USER_SUBSCRIPTION',
        payload_json: {
          adminAction: 'FORCE_EXPIRE_SUBSCRIPTION',
          ownerId: owner.id,
          businessName: owner.business_name,
          newStatus: 'EXPIRED',
          expiresAt: owner.subscription_expires_at,
        },
        created_at: new Date().toISOString(),
      });

      return res.json({
        success: true,
        isExpired: true,
        message: `Muda wa subscription wa mmiliki '${owner.business_name}' (${owner.name}) umewekwa EXPIRED (Muda umeisha) kwa majaribio!`,
        owner,
      });
    } else {
      // Restore active state: set expiry to now + days
      const daysToAdd = Math.max(1, Number(days) || 30);
      owner.subscription_status = 'ACTIVE';
      owner.subscription_expires_at = new Date(Date.now() + daysToAdd * 86400000).toISOString();
      owner.updated_at = new Date().toISOString();
      db.saveOwner(owner);

      db.saveAuditLog({
        id: Date.now(),
        external_reference: `TEST-ACT-${owner.id}-${Date.now()}`,
        event_type: 'ADMIN_RESTORED_USER_SUBSCRIPTION_ACTIVE',
        payload_json: {
          adminAction: 'RESTORE_ACTIVE_SUBSCRIPTION',
          ownerId: owner.id,
          businessName: owner.business_name,
          newStatus: 'ACTIVE',
          daysAdded: daysToAdd,
          expiresAt: owner.subscription_expires_at,
        },
        created_at: new Date().toISOString(),
      });

      return res.json({
        success: true,
        isExpired: false,
        message: `Muda wa subscription wa mmiliki '${owner.business_name}' (${owner.name}) umerejeshwa ACTIVE kwa siku ${daysToAdd}!`,
        owner,
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kubadili hali ya subscription.' });
  }
});

// Admin-Only: Bulk Toggle All Hotspot Owners' Subscription Expiration
apiRouter.post('/subscription/toggle-all-expire', (req: Request, res: Response) => {
  try {
    const { isExpired, days = 30 } = req.body;
    const targetExpired = Boolean(isExpired);
    const owners = db.getOwners().filter((o) => o.role === 'HOTSPOT_OWNER');

    for (const owner of owners) {
      if (targetExpired) {
        owner.subscription_status = 'EXPIRED';
        owner.subscription_expires_at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      } else {
        const daysToAdd = Math.max(1, Number(days) || 30);
        owner.subscription_status = 'ACTIVE';
        owner.subscription_expires_at = new Date(Date.now() + daysToAdd * 86400000).toISOString();
      }
      owner.updated_at = new Date().toISOString();
      db.saveOwner(owner);
    }

    db.saveAuditLog({
      id: Date.now(),
      external_reference: `BULK-SUB-${Date.now()}`,
      event_type: targetExpired ? 'ADMIN_BULK_EXPIRED_SUBSCRIPTIONS' : 'ADMIN_BULK_RESTORED_SUBSCRIPTIONS',
      payload_json: {
        targetExpired,
        count: owners.length,
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      count: owners.length,
      isExpired: targetExpired,
      message: targetExpired
        ? `Wamiliki wote ${owners.length} wamewekwa EXPIRED (Muda Umeisha) kwa majaribio ya malipo!`
        : `Wamiliki wote ${owners.length} wamerejeshwa ACTIVE kwa siku 30!`,
      owners: db.getOwners().filter((o) => o.role === 'HOTSPOT_OWNER'),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kubadili wamiliki wote.' });
  }
});

// =============================================================================
// Manual Subscription Approval & Cash / Bank Reconciliation Endpoints
// =============================================================================

// 1. Vendor Admin: Manually Approve / Extend Hotspot Owner Subscription
apiRouter.post('/subscription/manual-approve', (req: Request, res: Response) => {
  try {
    const {
      ownerId,
      durationDays = 30,
      amountPaid = 15000,
      paymentMethod = 'CASH',
      referenceNote = 'Malipo ya Taslimu / Verified by Vendor',
      notes = '',
      requestId,
    } = req.body;

    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId inahitajika (ownerId is required).' });
    }

    const owner = db.getOwnerById(Number(ownerId));
    if (!owner) {
      return res.status(404).json({ error: 'Mmiliki wa Hotspot hajapatikana.' });
    }

    const daysToAdd = Math.max(1, Number(durationDays) || 30);
    const amount = Number(amountPaid) >= 0 ? Number(amountPaid) : 15000;

    // Calculate new expiration date (extend from current expiry if future, otherwise from now)
    const currentExpiryMs = owner.subscription_expires_at ? new Date(owner.subscription_expires_at).getTime() : 0;
    const baseTime = currentExpiryMs > Date.now() ? currentExpiryMs : Date.now();
    const newExpiresAt = new Date(baseTime + daysToAdd * 86400000).toISOString();

    owner.subscription_status = 'ACTIVE';
    owner.subscription_expires_at = newExpiresAt;
    owner.updated_at = new Date().toISOString();
    db.saveOwner(owner);

    // If there was a linked pending request, mark it APPROVED
    if (requestId) {
      const manualReq = db.getManualSubscriptionRequestById(Number(requestId));
      if (manualReq) {
        manualReq.status = 'APPROVED';
        manualReq.approved_at = new Date().toISOString();
        db.saveManualSubscriptionRequest(manualReq);
      }
    } else {
      // Find any pending request for this owner and approve it
      const pendingReqs = db.getManualSubscriptionRequests().filter((r) => r.owner_id === owner.id && r.status === 'PENDING');
      for (const r of pendingReqs) {
        r.status = 'APPROVED';
        r.approved_at = new Date().toISOString();
        db.saveManualSubscriptionRequest(r);
      }
    }

    // Record verified transaction in ledger
    const txId = `MAN-SUB-TX-${Date.now()}`;
    const externalRef = `MAN-SUB-${owner.id}-${Date.now().toString().slice(-6)}`;
    const tx: TransactionRecord = {
      id: db.getNextTransactionId(),
      phone_number: owner.phone,
      network_provider: paymentMethod === 'BANK_TRANSFER' ? ('MANUAL' as any) : 'VODACOM',
      amount,
      external_reference: externalRef,
      transaction_id: txId,
      status: 'SUCCESS',
      plan_id: 0,
      is_subscription: true,
      plan_name: 'Monthly Subscription Fee',
      owner_id: owner.id,
      vendor_merchant_id: 'VENDOR-MANUAL-VERIFICATION',
      vendor_amount: amount,
      platform_fee: 0,
      gateway_provider: `MANUAL_APPROVAL (${paymentMethod})`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.saveTransaction(tx);

    // Save detailed audit log
    db.saveAuditLog({
      id: Date.now(),
      external_reference: externalRef,
      event_type: 'VENDOR_MANUALLY_APPROVED_SUBSCRIPTION',
      payload_json: {
        adminAction: 'MANUAL_SUBSCRIPTION_APPROVAL',
        ownerId: owner.id,
        ownerName: owner.name,
        businessName: owner.business_name,
        durationDays: daysToAdd,
        amountPaid: amount,
        paymentMethod,
        referenceNote,
        notes,
        newExpiresAt,
        transactionId: txId,
      },
      created_at: new Date().toISOString(),
    });

    return res.json({
      success: true,
      message: `Subscription ya ${owner.business_name} (${owner.name}) imethibitishwa kwa mkono (Manual Approved) kwa siku ${daysToAdd}! Muda umerefushwa hadi ${new Date(newExpiresAt).toLocaleDateString('sw-TZ')}.`,
      owner,
      newExpiresAt,
      transaction: tx,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kuidhinisha subscription.' });
  }
});

// 2. Hotspot Owner: Submit Cash / Bank Transfer Proof for Manual Approval
apiRouter.post('/subscription/manual-requests', (req: Request, res: Response) => {
  try {
    const { ownerId, phoneNumber, amount = 15000, durationDays = 30, paymentMethod = 'CASH', referenceNote, notes } = req.body;

    if (!ownerId || !referenceNote) {
      return res.status(400).json({
        error: 'Tafadhali weka taarifa kamili: Namba ya risiti au maelezo ya muamala (Reference Note).',
      });
    }

    const owner = db.getOwnerById(Number(ownerId));
    if (!owner) {
      return res.status(404).json({ error: 'Mmiliki wa Hotspot hajapatikana.' });
    }

    const request = db.saveManualSubscriptionRequest({
      id: db.getNextManualSubscriptionRequestId(),
      owner_id: owner.id,
      owner_name: owner.name,
      business_name: owner.business_name,
      phone_number: String(phoneNumber || owner.phone).trim(),
      amount: Number(amount) || 15000,
      duration_days: Number(durationDays) || 30,
      payment_method: paymentMethod || 'CASH',
      reference_note: String(referenceNote).trim(),
      notes: notes ? String(notes).trim() : undefined,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.saveAuditLog({
      id: Date.now(),
      external_reference: `MAN-REQ-${request.id}`,
      event_type: 'USER_SUBMITTED_MANUAL_SUBSCRIPTION_REQUEST',
      payload_json: {
        requestId: request.id,
        ownerId: owner.id,
        businessName: owner.business_name,
        paymentMethod,
        referenceNote,
      },
      created_at: new Date().toISOString(),
    });

    return res.status(201).json({
      success: true,
      message: 'Ombi lako la kuthibitisha malipo ya taslimu/benki limetumwa kwa Vendor Admin. Akaunti yako itafunguliwa mara moja punde akithibitisha!',
      request,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kutuma ombi la uthibitisho.' });
  }
});

// 3. Vendor: Get All Manual Subscription Requests
apiRouter.get('/subscription/manual-requests', (req: Request, res: Response) => {
  const { status, ownerId } = req.query;
  let requests = db.getManualSubscriptionRequests();

  if (status) {
    requests = requests.filter((r) => r.status === status);
  }
  if (ownerId) {
    requests = requests.filter((r) => r.owner_id === Number(ownerId));
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return res.json(requests);
});

// 4. Vendor: Reject a Manual Subscription Request
apiRouter.post('/subscription/manual-requests/:id/reject', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const request = db.getManualSubscriptionRequestById(id);
  if (!request) {
    return res.status(404).json({ error: 'Ombi halijapatikana.' });
  }

  request.status = 'REJECTED';
  request.updated_at = new Date().toISOString();
  db.saveManualSubscriptionRequest(request);

  return res.json({
    success: true,
    message: `Ombi #${id} limekataliwa.`,
    request,
  });
});

apiRouter.post('/routers', (req: Request, res: Response) => {
  try {
    const {
      name,
      brand_name,
      ssid,
      ip_address,
      api_port = 8728,
      api_username,
      api_password_hash,
      location,
      hotspot_server_name = 'hotspot1',
      dns_name,
      owner_id,
      device_type = 'MIKROTIK',
      model_name,
      nas_identifier,
      radius_secret,
      palmpesa_user_id,
      palmpesa_user_ref,
      palmpesa_api_token,
      palmpesa_accept_stk,
    } = req.body;
    if (!name || !ip_address) {
      return res.status(400).json({ error: 'Jina la kifaa na IP address vinahitajika.' });
    }

    let owner_name = '';
    let defaultBrand = brand_name ? String(brand_name).trim() : name;
    if (owner_id) {
      const owner = db.getOwnerById(Number(owner_id));
      if (owner) {
        owner_name = `${owner.name} (${owner.business_name})`;
        if (!brand_name) {
          defaultBrand = owner.business_name;
        }
      }
    }

    const cleanSsid = ssid
      ? String(ssid).trim()
      : `${defaultBrand.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 16)}-WIFI`;

    const router: RouterRecord = {
      id: db.getNextRouterId(),
      name,
      device_type: (device_type as any) || 'MIKROTIK',
      model_name: model_name || undefined,
      nas_identifier: nas_identifier || undefined,
      radius_secret: radius_secret || 'radius_secret_2026',
      brand_name: defaultBrand,
      ssid: cleanSsid,
      ip_address,
      api_port: Number(api_port) || 8728,
      api_username: api_username || 'admin',
      api_password_hash: api_password_hash || '',
      location: location || 'Tanzania',
      hotspot_server_name,
      dns_name: dns_name || 'wifi.hotspot.lan',
      status: 'ONLINE',
      owner_id: owner_id ? Number(owner_id) : undefined,
      owner_name: owner_name || undefined,
      palmpesa_user_id: palmpesa_user_id ? String(palmpesa_user_id).trim() : undefined,
      palmpesa_user_ref: palmpesa_user_ref ? String(palmpesa_user_ref).trim() : undefined,
      palmpesa_api_token: palmpesa_api_token ? String(palmpesa_api_token).trim() : undefined,
      mac_address: req.body.mac_address ? OmadaAdoptionService.normalizeMac(req.body.mac_address) : undefined,
      adoption_status: req.body.adoption_status || (device_type === 'TPLINK_OMADA' ? 'PENDING_INFORM' : undefined),
      ap_username: req.body.ap_username || undefined,
      ap_password: req.body.ap_password || undefined,
      inform_url: req.body.inform_url || (device_type === 'TPLINK_OMADA' ? OmadaAdoptionService.getInformInfo().informUrl : undefined),
      omada_firmware: req.body.omada_firmware || (device_type === 'TPLINK_OMADA' ? 'v5.0.12 Build 20260410' : undefined),
      omada_channel_2g: req.body.omada_channel_2g || (device_type === 'TPLINK_OMADA' ? 6 : undefined),
      omada_channel_5g: req.body.omada_channel_5g || (device_type === 'TPLINK_OMADA' ? 44 : undefined),
      omada_clients_count: req.body.omada_clients_count || (device_type === 'TPLINK_OMADA' ? 0 : undefined),
      is_custom_model: req.body.is_custom_model !== undefined ? Boolean(req.body.is_custom_model) : undefined,
      cpe_mode: req.body.cpe_mode || undefined,
      pharos_maxtream_disabled: req.body.pharos_maxtream_disabled !== undefined ? Boolean(req.body.pharos_maxtream_disabled) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveRouter(router);

    // If assigned to owner, add to owner's router list
    if (router.owner_id) {
      const owner = db.getOwnerById(router.owner_id);
      if (owner) {
        if (!Array.isArray(owner.assigned_router_ids)) {
          owner.assigned_router_ids = [];
        }
        if (!owner.assigned_router_ids.includes(router.id)) {
          owner.assigned_router_ids.push(router.id);
          db.saveOwner(owner);
        }
      }
    }

    res.json({ success: true, router });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/routers/:id/device-config', (req: Request, res: Response) => {
  const router = db.getRouterById(Number(req.params.id));
  if (!router) {
    return res.status(404).json({ error: 'Device not found' });
  }

  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  const ruijie = ScriptGeneratorService.generateRuijieConfig(router, baseUrl);
  const omada = ScriptGeneratorService.generateOmadaConfig(router, baseUrl);
  const openwrt = ScriptGeneratorService.generateOpenWrtChilliConfig(router, baseUrl);
  const cpe = ScriptGeneratorService.generatePharosCpeConfig(router, baseUrl);

  res.json({
    routerId: router.id,
    routerName: router.name,
    deviceType: router.device_type || 'MIKROTIK',
    brandName: router.brand_name || router.name,
    ssid: router.ssid,
    ruijie,
    omada,
    openwrt,
    cpe,
  });
});

apiRouter.put('/routers/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const existing = db.getRouterById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const updated: RouterRecord = {
    ...existing,
    ...req.body,
    id,
    brand_name: req.body.brand_name !== undefined ? (req.body.brand_name ? String(req.body.brand_name).trim() : existing.brand_name) : existing.brand_name,
    ssid: req.body.ssid !== undefined ? (req.body.ssid ? String(req.body.ssid).trim() : existing.ssid) : existing.ssid,
    api_port: req.body.api_port ? Number(req.body.api_port) : existing.api_port,
    updated_at: new Date().toISOString(),
  };

  db.saveRouter(updated);
  res.json({ success: true, router: updated });
});

apiRouter.delete('/routers/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ok = db.deleteRouter(id);
  res.json({ success: ok });
});

// =============================================================================
// TP-LINK OMADA CONTROLLER INFORM & AP ADOPTION SYSTEM
// =============================================================================

// 1. Get Omada Controller Inform URL & Server Parameters
apiRouter.get('/omada/inform-info', (req: Request, res: Response) => {
  const host = req.get('host');
  const info = OmadaAdoptionService.getInformInfo(host);
  res.json({ success: true, ...info });
});

// 2. Adopt TP-Link Omada AP (Accepts MAC, Inform URL, SSID, AP device credentials)
apiRouter.post('/omada/adopt', async (req: Request, res: Response) => {
  try {
    const {
      routerId,
      name,
      brandName,
      modelName,
      macAddress,
      ipAddress,
      informUrl,
      ssid,
      apUsername = 'admin',
      apPassword,
      location,
      ownerId,
    } = req.body;

    if (!macAddress) {
      return res.status(400).json({
        success: false,
        error: 'Tafadhali weka MAC Address ya Access Point ya TP-Link Omada (mfano: 50:D4:F7:2B:8C:1A).',
      });
    }

    const effectiveApPassword = apPassword || OmadaAdoptionService.generateSecurePassword();

    const result = await OmadaAdoptionService.adoptAp({
      routerId: routerId ? Number(routerId) : undefined,
      name,
      brandName,
      modelName,
      macAddress,
      ipAddress,
      informUrl,
      ssid,
      apUsername,
      apPassword: effectiveApPassword,
      location,
      ownerId: ownerId ? Number(ownerId) : undefined,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Hitilafu ya ku-adopt AP ya Omada.' });
  }
});

// 3. Check Adoption Status of an Omada AP (Verification Endpoint)
apiRouter.post('/omada/check-adoption/:id', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const result = OmadaAdoptionService.checkAdoptionStatus(routerId);
  res.json(result);
});

apiRouter.get('/omada/status/:id', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const result = OmadaAdoptionService.checkAdoptionStatus(routerId);
  res.json(result);
});

// Real-time AP / Router Performance Telemetry (RAM, CPU, Wireless Signal, Uplink)
apiRouter.get(['/omada/performance/:id', '/routers/:id/performance'], (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const result = OmadaAdoptionService.getApPerformance(routerId);
  res.json(result);
});

// 4. Update & Push Wi-Fi SSID to Adopted Omada AP
apiRouter.post('/omada/push-ssid', (req: Request, res: Response) => {
  const { routerId, ssid } = req.body;
  if (!routerId || !ssid) {
    return res.status(400).json({ error: 'routerId na ssid vinahitajika.' });
  }

  const result = OmadaAdoptionService.pushSsid(Number(routerId), String(ssid));
  res.json(result);
});

// 5. Remote Reboot Omada AP
apiRouter.post('/omada/reboot/:id', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const result = OmadaAdoptionService.rebootAp(routerId);
  res.json(result);
});

// 6. Forget / Reset Adoption for Omada AP
apiRouter.post('/omada/forget/:id', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const result = OmadaAdoptionService.forgetAp(routerId);
  res.json(result);
});

// 7. Get All Discovered Omada / Pharos APs that have contacted Controller
apiRouter.get('/omada/discovered', (_req: Request, res: Response) => {
  const discovered = OmadaAdoptionService.getDiscoveredAps();
  res.json({ success: true, count: discovered.length, discovered });
});

// 8. Test Live Omada / Pharos AP Reachability & Inform Status
apiRouter.post('/omada/test-device', async (req: Request, res: Response) => {
  try {
    const { ipAddress, port = 80, macAddress } = req.body;
    if (!ipAddress && !macAddress) {
      return res.status(400).json({ error: 'Tafadhali weka IP Address au MAC Address ya kifaa unachotaka kupima.' });
    }
    const result = await OmadaAdoptionService.testDeviceReachability(
      ipAddress || '192.168.0.254',
      Number(port) || 80,
      macAddress
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, reachable: false, error: err.message });
  }
});

// 9. Simulate Device Inform Packet for Testing
apiRouter.post('/omada/simulate-inform', (req: Request, res: Response) => {
  try {
    const { macAddress, ipAddress, modelName, firmware } = req.body;
    const result = OmadaAdoptionService.simulateDeviceInform({
      macAddress,
      ipAddress,
      modelName,
      firmware,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Omada AP Inform Heartbeat Endpoint
apiRouter.all(['/omada/inform', '/omada/inform-heartbeat'], (req: Request, res: Response) => {
  const payload = req.body && Object.keys(req.body).length > 0 ? req.body : req.query;
  const clientIp = (req.ip || req.socket.remoteAddress || '192.168.0.254').replace(/^::ffff:/, '');
  const result = OmadaAdoptionService.recordIncomingInform(payload, clientIp, req.method);
  res.json(result);
});


// Real Live Connection Test to MikroTik Router
apiRouter.post('/routers/:id/test-connection', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const router = db.getRouterById(id);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  try {
    const testResult = await MikrotikService.testConnection(router);
    if (testResult.reachable) {
      router.status = 'ONLINE';
      router.last_seen_at = new Date().toISOString();
      db.saveRouter(router);
    } else {
      router.status = 'OFFLINE';
      db.saveRouter(router);
    }
    res.json(testResult);
  } catch (err: any) {
    res.status(500).json({ reachable: false, message: err.message, latencyMs: 0 });
  }
});

apiRouter.get('/routers/:id/active-users', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const activeSessions = await MikrotikService.getActiveSessions(router);
  res.json(activeSessions);
});

// All Hotspot Users (Merged Online + Offline + Database Vouchers)
apiRouter.get(['/routers/:id/all-users', '/all-users'], async (req: Request, res: Response) => {
  const rawId = String(req.params.id || 'all').trim();
  const caller = getRequestUser(req);
  const qOwnerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  let targetOwnerId: number | undefined;

  if (caller && caller.role !== 'VENDOR_ADMIN') {
    // Hotspot Owner or staff member is strictly locked to their own account
    targetOwnerId = Number(caller.parent_owner_id || caller.id);
  } else if (qOwnerId && !isNaN(qOwnerId) && qOwnerId > 0) {
    targetOwnerId = qOwnerId;
  }

  if (rawId.toLowerCase() === 'all' || isNaN(Number(rawId)) || Number(rawId) <= 0) {
    const users = await MikrotikService.getAllHotspotUsers(null, targetOwnerId);
    return res.json(users);
  }

  const routerId = Number(rawId);
  const router = db.getRouterById(routerId);
  if (!router) {
    // Graceful fallback so vouchers created before router connection are never hidden
    const users = await MikrotikService.getAllHotspotUsers(null, targetOwnerId);
    return res.json(users);
  }

  // Security check: if scoped to a specific owner, ensure router belongs to that owner
  if (targetOwnerId && router.owner_id && Number(router.owner_id) !== targetOwnerId) {
    return res.json([]);
  }

  const users = await MikrotikService.getAllHotspotUsers(router, targetOwnerId);
  res.json(users);
});

// Create new user/voucher directly on this MikroTik
apiRouter.post('/routers/:id/users', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const { username, password, plan_id, comment, rate_limit, limit_uptime } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Jina la mtumiaji (username) linahitajika.' });
  }

  let plan;
  if (plan_id) {
    plan = db.getPlanById(Number(plan_id));
  }

  const uptimeLimit = limit_uptime !== undefined ? Number(limit_uptime) : (plan?.limit_uptime || 0);
  const speed = rate_limit || plan?.rate_limit;

  // 1. Provision on MikroTik (API socket + command queue)
  const result = await MikrotikService.provisionUser(router, {
    username,
    password: password || username,
    limitUptimeSeconds: uptimeLimit,
    limitBytesTotal: plan?.limit_bytes_total || undefined,
    rateLimit: speed,
    comment: comment || (plan ? `Plan: ${plan.name}` : 'Remote Admin Created'),
  });

  // 2. Save in database vouchers
  const voucher = db.saveVoucher({
    id: db.getNextVoucherId(),
    code: username,
    password: password || username,
    plan_id: plan?.id || 1,
    router_id: routerId,
    owner_id: router?.owner_id,
    status: 'AVAILABLE',
    batch_tag: comment || 'REMOTE_ADMIN',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: `Mtumiaji '${username}' ameongezwa kikamilifu kwenye MikroTik (${router.name})!`,
    voucher,
    command: result.command,
  });
});

// Delete user from MikroTik and terminate session
apiRouter.delete("/routers/:id/users/:username", async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const rawUsername = String(req.params.username || '').trim();
  const username = decodeURIComponent(rawUsername).trim();

  // 1. Delete from database vouchers & RADIUS
  db.deleteVoucherByCode(username);
  db.deleteVoucherByCode(rawUsername);
  db.deleteRadiusUser(username);
  db.deleteRadiusUser(rawUsername);
  const v = db.getVouchers().find((x) => x.code.toUpperCase() === username.toUpperCase() || x.code.toUpperCase() === rawUsername.toUpperCase());
  if (v) {
    db.deleteVoucher(v.id);
  }

  // 2. Identify router
  let router = !isNaN(routerId) && routerId > 0 ? db.getRouterById(routerId) : undefined;
  if (!router) {
    if (v && v.router_id) router = db.getRouterById(v.router_id);
    if (!router) router = db.getRouters()[0];
  }

  // 3. Delete from MikroTik & live sessions
  if (router) {
    try {
      await MikrotikService.deleteUser(router, username);
    } catch (e: any) {
      console.error("[MikrotikService.deleteUser non-fatal]:", e?.message || e);
    }
  }

  // 4. Also broadcast remove command across all routers
  const removeCmd = `:do { /ip hotspot active remove [find user="${username}"]; } on-error={}; :do { /ip hotspot user remove [find name="${username}"]; } on-error={}; :do { /ip hotspot cookie remove [find user="${username}"]; } on-error={};`;
  for (const r of db.getRouters()) {
    try {
      MikrotikService.queueCommand(r.id, removeCmd);
    } catch {}
  }

  return res.json({ success: true, message: "Vocha/Mtumiaji '" + username + "' imefutwa kikamilifu." });
});

// Remote Action Executions (Reboot, Flush Cookies, Kick All Sessions, Custom CLI)
apiRouter.post('/routers/:id/remote-action', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const { action, customCommand } = req.body;
  if (!action) {
    return res.status(400).json({ error: 'Action parameter is required.' });
  }

  const result = await MikrotikService.executeRemoteAction(router, action, customCommand);
  res.json(result);
});

apiRouter.post('/routers/:id/active-users/:username/terminate', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const { username } = req.params;
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const result = await MikrotikService.terminateSession(router, username);
  res.json(result);
});

apiRouter.get('/routers/:id/setup-script', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host') || 'localhost:3000';
  const backendUrl = `${protocol}://${host}`;

  const script = MikrotikService.generateRouterOSSetupScript(router, backendUrl);
  res.json({ script, routerName: router.name });
});

// Detailed multi-flavor VPN & Agent scripts
apiRouter.get('/routers/:id/vpn-scripts', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host') || 'localhost:3000';
  const backendUrl = `${protocol}://${host}`;

  const wireguard = MikrotikService.generateWireguardVpnScript(router, backendUrl);
  const sstp = MikrotikService.generateSstpVpnScript(router);
  const cloudPoll = MikrotikService.generateCloudPollingScript(router, backendUrl);
  const master = MikrotikService.generateRouterOSSetupScript(router, backendUrl);
  const antiTethering = MikrotikService.generateAntiTetheringScript(router);

  res.json({
    routerId: router.id,
    routerName: router.name,
    wireguard,
    sstp,
    cloudPoll,
    master,
    antiTethering,
  });
});

// MikroTik Cloud Heartbeat & Auto-Provisioning Poll Endpoint
// Invoked every 10s by MikroTik's native /tool fetch scheduler
apiRouter.get('/routers/:id/poll', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);

  if (!router) {
    res.setHeader('Content-Type', 'text/plain');
    return res.send(':log error "TZ-WiFi: Unknown router ID";');
  }

  // Mark router online from this live heartbeat!
  router.status = 'ONLINE';
  router.last_seen_at = new Date().toISOString();
  db.saveRouter(router);

  // Check recent unprovisioned active vouchers for this router
  const recentVouchers = db.getVouchers()
    .filter((v) => v.router_id === routerId && v.status === 'ACTIVE')
    .slice(-10);

  const lines: string[] = [
    `# TZ-WiFi Cloud Heartbeat Synced at ${new Date().toISOString()}`,
    `:log info "TZ-WiFi Cloud Heartbeat OK - Router #${routerId} (${router.name})";`,
  ];

  for (const v of recentVouchers) {
    const uptimeStr = v.plan?.limit_uptime
      ? MikrotikService.formatUptimeForRouterOS(v.plan.limit_uptime)
      : '0';

    lines.push(
      `:if ([:len [/ip hotspot user find name="${v.code}"]] = 0) do={`,
      `  /ip hotspot user add name="${v.code}" password="${v.password || v.code}" limit-uptime=${uptimeStr} comment="Auto-provisioned by TZ-WiFi Cloud";`,
      `};`
    );
  }

  // Pop and execute any queued remote commands (Reboot, Delete User, Kick Session, etc.)
  const queuedCommands = MikrotikService.popCommands(routerId);
  if (queuedCommands.length > 0) {
    lines.push(
      `# Amri za Mbali (Remote Commands) zilizotolewa kwenye Cloud Dashboard:`,
      `:log info "TZ-WiFi Cloud: Inatekeleza amri ${queuedCommands.length} za mbali...";`
    );
    for (const cmd of queuedCommands) {
      lines.push(cmd);
    }
  }

  res.setHeader('Content-Type', 'text/plain');
  res.send(lines.join('\n'));
});

// Downloadable MikroTik login.html
apiRouter.get('/routers/:id/mikrotik-login-file', (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host') || 'localhost:3000';
  const backendUrl = `${protocol}://${host}`;

  const htmlContent = MikrotikService.generateMikrotikLoginHtml(router, backendUrl);
  res.setHeader('Content-Disposition', `attachment; filename="login.html"`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(htmlContent);
});

// =============================================================================
// Transactions, Export & Analytics
// =============================================================================
apiRouter.get('/transactions', (req: Request, res: Response) => {
  const { carrier, status, search, ownerId, routerId, startDate, endDate } = req.query;
  let txs = db.getTransactions();

  if (ownerId) {
    const owner = db.getOwnerById(Number(ownerId));
    if (owner && owner.role === 'HOTSPOT_OWNER') {
      const allowed = new Set(owner.assigned_router_ids || []);
      txs = txs.filter((t) => (t.router_id && allowed.has(t.router_id)) || t.owner_id === owner.id);
    }
  }

  if (routerId && routerId !== 'ALL' && routerId !== 'all') {
    const targetRouterId = Number(routerId);
    txs = txs.filter((t) => t.router_id === targetRouterId);
  }

  if (carrier) {
    txs = txs.filter((t) => t.network_provider === carrier);
  }
  if (status) {
    txs = txs.filter((t) => t.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    txs = txs.filter(
      (t) =>
        t.phone_number.includes(q) ||
        t.external_reference.toLowerCase().includes(q) ||
        (t.transaction_id && t.transaction_id.toLowerCase().includes(q))
    );
  }

  if (startDate) {
    const startStr = String(startDate).slice(0, 10);
    txs = txs.filter((t) => t.created_at && t.created_at.slice(0, 10) >= startStr);
  }

  if (endDate) {
    const endStr = String(endDate).slice(0, 10);
    txs = txs.filter((t) => t.created_at && t.created_at.slice(0, 10) <= endStr);
  }

  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));
  const enriched = txs.map((t) => {
    const isSub =
      Boolean((t as any).is_subscription) ||
      t.plan_id === 0 ||
      t.external_reference?.toUpperCase().startsWith('SUB-') ||
      t.external_reference?.toUpperCase().startsWith('MAN-SUB-') ||
      t.external_reference?.toUpperCase().startsWith('BULK-SUB-') ||
      (t.transaction_id && t.transaction_id.toUpperCase().startsWith('SUB-')) ||
      (t.transaction_id && t.transaction_id.toUpperCase().startsWith('MAN-SUB-')) ||
      (t.external_reference && /sub/i.test(t.external_reference));

    const plan = isSub
      ? {
          id: 0,
          name: 'Monthly Subscription Fee',
          price: t.amount,
          duration_seconds: 2592000,
          validity_label: '30 Days',
        }
      : plansMap.get(t.plan_id);

    return {
      ...t,
      is_subscription: isSub,
      plan_id: isSub ? 0 : t.plan_id,
      plan_name: isSub ? 'Monthly Subscription Fee' : (plan?.name || (t as any).plan_name),
      plan,
    };
  });

  res.json(enriched);
});

// CSV Export for transactions reconciliation
apiRouter.get('/export/transactions/csv', (req: Request, res: Response) => {
  const { carrier, status, search, ownerId, routerId, startDate, endDate } = req.query;
  let txs = db.getTransactions();

  if (ownerId) {
    const owner = db.getOwnerById(Number(ownerId));
    if (owner && owner.role === 'HOTSPOT_OWNER') {
      const allowed = new Set(owner.assigned_router_ids || []);
      txs = txs.filter((t) => (t.router_id && allowed.has(t.router_id)) || t.owner_id === owner.id);
    }
  }

  if (routerId && routerId !== 'ALL' && routerId !== 'all') {
    const targetRouterId = Number(routerId);
    txs = txs.filter((t) => t.router_id === targetRouterId);
  }

  if (carrier) {
    txs = txs.filter((t) => t.network_provider === carrier);
  }
  if (status) {
    txs = txs.filter((t) => t.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    txs = txs.filter(
      (t) =>
        t.phone_number.includes(q) ||
        t.external_reference.toLowerCase().includes(q) ||
        (t.transaction_id && t.transaction_id.toLowerCase().includes(q))
    );
  }

  if (startDate) {
    const startStr = String(startDate).slice(0, 10);
    txs = txs.filter((t) => t.created_at && t.created_at.slice(0, 10) >= startStr);
  }

  if (endDate) {
    const endStr = String(endDate).slice(0, 10);
    txs = txs.filter((t) => t.created_at && t.created_at.slice(0, 10) <= endStr);
  }

  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));

  let csv = 'ID,Date,Phone,Carrier,Amount (TZS),Plan,Status,External Reference,MNO Transaction ID\n';
  txs.forEach((t) => {
    const isSub =
      Boolean((t as any).is_subscription) ||
      t.plan_id === 0 ||
      t.external_reference?.toUpperCase().startsWith('SUB-') ||
      t.external_reference?.toUpperCase().startsWith('MAN-SUB-') ||
      t.external_reference?.toUpperCase().startsWith('BULK-SUB-') ||
      (t.external_reference && /sub/i.test(t.external_reference));
    const planName = isSub ? 'Monthly Subscription Fee' : (plansMap.get(t.plan_id)?.name || '');
    csv += `"${t.id}","${t.created_at}","${t.phone_number}","${t.network_provider}",${t.amount},"${planName}","${t.status}","${t.external_reference}","${t.transaction_id || ''}"\n`;
  });

  res.setHeader('Content-Disposition', 'attachment; filename="tzwifi_transactions.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// CSV Export for vouchers
apiRouter.get('/export/vouchers/csv', (req: Request, res: Response) => {
  const caller = getRequestUser(req);
  const ownerIdQuery = req.query.ownerId ? String(req.query.ownerId).trim() : null;
  let filterOwnerId: number | undefined;

  if (caller) {
    if (caller.role !== 'VENDOR_ADMIN' && (caller.role as string) !== 'admin') {
      filterOwnerId = Number(caller.parent_owner_id || caller.id);
    } else {
      filterOwnerId = Number(caller.id);
    }
  } else if (ownerIdQuery) {
    const parsed = Number(ownerIdQuery);
    if (!isNaN(parsed) && parsed > 0) filterOwnerId = parsed;
  } else {
    return res.status(401).send('Unauthorized: Uthibitisho unahitajika.');
  }

  let vouchers = db.getVouchers();
  const targetOwnerId = filterOwnerId;
  vouchers = vouchers.filter((v: any) => {
    if (v.owner_id != null && v.owner_id !== '') return Number(v.owner_id) === targetOwnerId;
    if (v.batch_tag) {
      const b = db.getVoucherBatchById(v.batch_tag);
      if (b && b.owner_id != null) return Number(b.owner_id) === targetOwnerId;
    }
    if (v.router_id != null) {
      const r = db.getRouterById(Number(v.router_id));
      if (r && r.owner_id != null) return Number(r.owner_id) === targetOwnerId;
    }
    return false;
  });

  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));

  let csv = 'ID,Code,Password,Plan,Price (TZS),Status,Activated At,Expires At,Batch\n';
  vouchers.forEach((v) => {
    const plan = plansMap.get(v.plan_id);
    csv += `"${v.id}","${v.code}","${v.password}","${plan?.name || ''}",${plan?.price || 0},"${v.status}","${v.activated_at || ''}","${v.expires_at || ''}","${v.batch_tag || ''}"\n`;
  });

  res.setHeader('Content-Disposition', 'attachment; filename="tzwifi_vouchers.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

apiRouter.get('/analytics/overview', (req: Request, res: Response) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const routerId = req.query.routerId ? Number(req.query.routerId) : undefined;
  const preset = req.query.preset as any;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  const metrics = db.getRevenueMetrics(ownerId, { preset, startDate, endDate, routerId });
  res.json(metrics);
});

apiRouter.get('/system/schema', (_req: Request, res: Response) => {
  const schemaSQL = db.getSchemaSQL();
  res.type('text/plain').send(schemaSQL);
});

apiRouter.get('/system/database/status', async (_req: Request, res: Response) => {
  try {
    const summary = db.getDataSummary();
    const mysqlStatus = await mysqlService.getStatus();
    const dbPath = path.resolve(process.cwd(), 'data', 'database.json');
    let fileSizeKb = 0;
    let lastModified = new Date().toISOString();
    try {
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        fileSizeKb = Math.round(stats.size / 1024);
        lastModified = stats.mtime.toISOString();
      }
    } catch (_) {}

    res.json({
      status: 'CONNECTED',
      engine: mysqlStatus.isConnected ? 'MySQL 8.0+ (Live Sync) + JSON Engine' : 'JSON Persistent Engine (Standalone VPS)',
      storagePath: 'data/database.json',
      schemaFile: 'schema.sql',
      fileSizeKb,
      lastModified,
      uptimeSeconds: Math.floor(process.uptime()),
      tables: {
        hotspot_owners: {
          count: summary.hotspotOwnersCount,
          description: 'Wamiliki wa Hotspot & Kampuni',
          schemaTable: 'hotspot_owners',
        },
        routers: {
          count: summary.routersCount,
          description: 'MikroTik & Omada Routers',
          schemaTable: 'routers',
        },
        plans: {
          count: summary.plansCount,
          description: 'Vifurushi vya Intaneti',
          schemaTable: 'plans',
        },
        transactions: {
          count: summary.totalTransactions,
          description: 'Miamala ya Malipo (M-Pesa, Tigo, Airtel, Halo)',
          schemaTable: 'transactions',
        },
        vouchers: {
          count: summary.vouchersCount,
          description: 'Vocha za Hotspot (Kodi & PIN)',
          schemaTable: 'vouchers',
        },
        voucher_batches: {
          count: summary.voucherBatchesCount,
          description: 'Batches za Vocha zilizozalishwa',
          schemaTable: 'voucher_batches',
        },
        free_trial_claims: {
          count: summary.freeTrialClaimsCount,
          description: 'Majaribio ya Bure kwa MAC Address',
          schemaTable: 'free_trial_claims',
        },
        audit_logs: {
          count: summary.auditLogsCount,
          description: 'Kumbukumbu za Usalama & Vitendo',
          schemaTable: 'audit_logs',
        },
      },
      mysql: mysqlStatus,
      env: {
        nodeVersion: process.version,
        platform: process.platform,
        dataDir: path.resolve(process.cwd(), 'data'),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get(['/database/mysql-status', '/system/mysql-status'], async (_req: Request, res: Response) => {
  try {
    const status = await mysqlService.getStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post(['/system/sync-to-mysql', '/database/migrate-now', '/system/migrate-mysql'], async (_req: Request, res: Response) => {
  try {
    // 1. Bootstrap all tables in MySQL if not already created
    await mysqlService.bootstrapNow();

    // 2. Also run schema & data sync
    try {
      const mysqlModule = await import('mysql2/promise');
      const dbConfig = {
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USER || 'tzwifi_user',
        password: process.env.MYSQL_PASSWORD || 'SecureDbPassword2026!',
        database: process.env.MYSQL_DATABASE || 'tzwifi_billing',
        port: Number(process.env.MYSQL_PORT) || 3306,
        multipleStatements: true,
      };
      const conn = await mysqlModule.createConnection(dbConfig);

      const owners = db.getOwners();
      for (const o of owners) {
        await conn.query(
          `INSERT INTO hotspot_owners (
            id, name, business_name, email, phone, role, status, commission_rate,
            dalipay_key_id, dalipay_public_key, dalipay_secret_key, dalipay_webhook_secret,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE name=VALUES(name), business_name=VALUES(business_name),
            phone=VALUES(phone), dalipay_key_id=VALUES(dalipay_key_id),
            dalipay_public_key=VALUES(dalipay_public_key), dalipay_secret_key=VALUES(dalipay_secret_key)`,
          [o.id, o.name, o.business_name, o.email, o.phone, o.role, o.status, o.commission_rate || 5, o.dalipay_key_id || null, o.dalipay_public_key || null, o.dalipay_secret_key || null, o.dalipay_webhook_secret || null]
        );
      }

      const routers = db.getRouters();
      for (const r of routers) {
        await conn.query(
          `INSERT INTO routers (
            id, name, ip_address, owner_id, status, location, ssid, radius_secret, api_port, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE name=VALUES(name), ip_address=VALUES(ip_address), owner_id=VALUES(owner_id)`,
          [r.id, r.name, r.ip_address, r.owner_id || 1, r.status, r.location || 'HQ', r.ssid || 'TZ-WIFI', r.radius_secret || 'secret', r.api_port || 8728]
        );
      }

      const plans = db.getPlans();
      for (const p of plans) {
        await conn.query(
          `INSERT INTO plans (
            id, name, price, duration_minutes, duration_label, speed_limit_up, speed_limit_down, is_popular, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price)`,
          [p.id, p.name, p.price, Math.floor((p.limit_uptime || 3600) / 60), `${Math.floor((p.limit_uptime || 3600) / 60)} Mins`, '5M', '5M', 0, 1]
        );
      }

      await conn.end();
    } catch (e: any) {
      console.warn('[MySQL Sync] Table data sync note:', e.message);
    }

    const latestStatus = await mysqlService.getStatus();

    res.json({
      success: true,
      message: `Tables zote ${latestStatus.tablesCount} za MySQL zimetengenezwa na kuhakikiwa kikamilifu kwenye database ya '${latestStatus.database}'!`,
      tablesCreated: latestStatus.tables,
      tablesCount: latestStatus.tablesCount,
      database: latestStatus.database,
      migrated: {
        owners: db.getOwners().length,
        routers: db.getRouters().length,
        plans: db.getPlans().length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/system/audit-logs', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// System Data Summary for Live Launch preparation
apiRouter.get('/system/data-summary', (_req: Request, res: Response) => {
  res.json(db.getDataSummary());
});

// Download full SQL Database Backup (.sql) for system updates & disaster recovery
apiRouter.get(['/system/sql-backup-download', '/system/backup/sql'], (req: Request, res: Response) => {
  try {
    const isPreview = req.query.preview === 'true';
    const sqlDump = generateFullDatabaseSQL();
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `tz_wifi_database_backup_${dateTag}.sql`;

    if (isPreview) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sqlDump);
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.send(sqlDump);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate SQL backup' });
  }
});

// SQL Backup Preview and Meta Summary for UI
apiRouter.get('/system/sql-backup-preview', (_req: Request, res: Response) => {
  try {
    const sqlDump = generateFullDatabaseSQL();
    const summary = db.getDataSummary();
    const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `tz_wifi_database_backup_${dateTag}.sql`;
    const sizeBytes = Buffer.byteLength(sqlDump, 'utf8');

    res.json({
      success: true,
      filename,
      sizeBytes,
      sizeKb: Math.round((sizeBytes / 1024) * 10) / 10,
      summary,
      sqlPreview: sqlDump.slice(0, 4000) + (sqlDump.length > 4000 ? '\n\n-- ... [Data zingine zimehifadhiwa kwenye faili kamili la .sql] ...' : ''),
      fullSql: sqlDump,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Download full backup JSON with single click (supports ?format=sql as well)
apiRouter.get('/system/backup-download', (req: Request, res: Response) => {
  try {
    if (req.query.format === 'sql') {
      const sqlDump = generateFullDatabaseSQL();
      const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `tz_wifi_database_backup_${dateTag}.sql`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      return res.send(sqlDump);
    }

    const summary = db.getDataSummary();
    const backupData = {
      version: '2026.10',
      exported_at: new Date().toISOString(),
      summary,
      owners: db.getOwners(),
      routers: db.getRouters(),
      plans: db.getPlans(),
      vouchers: db.getVouchers(),
      transactions: db.getTransactions(),
      audit_logs: db.getAuditLogs(),
    };
    const filename = `tz_wifi_complete_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backupData, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Backup File (.sql or .json) and Preview Its Contents Before Restoring
apiRouter.post('/system/backup/upload-preview', (req: Request, res: Response) => {
  try {
    const { fileContent, filename } = req.body || {};
    if (!fileContent || typeof fileContent !== 'string') {
      return res.status(400).json({ error: 'Hakuna maudhui ya faili (fileContent) yaliyotumwa.' });
    }

    const trimmed = fileContent.trim();
    const isJson = trimmed.startsWith('{') || (filename && filename.toLowerCase().endsWith('.json'));

    let previewSnapshot: any = {};
    let format: 'SQL' | 'JSON' = 'SQL';

    if (isJson) {
      format = 'JSON';
      const parsed = JSON.parse(trimmed);
      previewSnapshot = {
        owners: parsed.owners || [],
        routers: parsed.routers || [],
        plans: parsed.plans || [],
        vouchers: parsed.vouchers || [],
        transactions: parsed.transactions || [],
        auditLogs: parsed.audit_logs || parsed.auditLogs || [],
        voucherBatches: parsed.voucherBatches || parsed.voucher_batches || [],
        freeTrialClaims: parsed.freeTrialClaims || parsed.free_trial_claims || [],
        settings: parsed.settings,
        companyInfo: parsed.companyInfo || parsed.company_info,
        freeTrialConfig: parsed.freeTrialConfig || parsed.free_trial_config,
      };
    } else {
      format = 'SQL';
      previewSnapshot = parseSQLDumpToSnapshot(trimmed);
    }

    const stats = {
      format,
      filename: filename || (format === 'SQL' ? 'backup.sql' : 'backup.json'),
      sizeBytes: Buffer.byteLength(trimmed, 'utf8'),
      sizeKb: Math.round((Buffer.byteLength(trimmed, 'utf8') / 1024) * 10) / 10,
      ownersCount: previewSnapshot.owners?.length || 0,
      routersCount: previewSnapshot.routers?.length || 0,
      plansCount: previewSnapshot.plans?.length || 0,
      vouchersCount: previewSnapshot.vouchers?.length || 0,
      transactionsCount: previewSnapshot.transactions?.length || 0,
      auditLogsCount: previewSnapshot.auditLogs?.length || 0,
      voucherBatchesCount: previewSnapshot.voucherBatches?.length || 0,
      freeTrialClaimsCount: previewSnapshot.freeTrialClaims?.length || 0,
      hasSettings: Boolean(previewSnapshot.settings),
      hasCompanyInfo: Boolean(previewSnapshot.companyInfo),
      hasFreeTrialConfig: Boolean(previewSnapshot.freeTrialConfig),
    };

    res.json({
      success: true,
      stats,
      sampleOwners: (previewSnapshot.owners || []).slice(0, 5).map((o: any) => ({
        id: o.id,
        name: o.name,
        business_name: o.business_name,
        email: o.email,
        phone: o.phone,
      })),
      sampleRouters: (previewSnapshot.routers || []).slice(0, 5).map((r: any) => ({
        id: r.id,
        name: r.name,
        ip_address: r.ip_address,
        device_type: r.device_type,
        location: r.location,
      })),
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Imeshindwa kusoma faili la backup: ' + (err.message || String(err)) });
  }
});

// Execute Backup Restore from uploaded SQL or JSON content
apiRouter.post('/system/backup/restore', (req: Request, res: Response) => {
  try {
    const { fileContent, filename, confirmationWord } = req.body || {};
    if (!fileContent || typeof fileContent !== 'string') {
      return res.status(400).json({ error: 'Faili la backup halikupatikana.' });
    }

    const cleanWord = String(confirmationWord || '').trim().toUpperCase();
    if (cleanWord !== 'RESTORE' && cleanWord !== 'REJESHA' && cleanWord !== 'CONFIRM') {
      return res.status(400).json({
        error: 'Tafadhali andika "RESTORE" au "REJESHA" kuthibitisha kurejesha database.',
      });
    }

    const trimmed = fileContent.trim();
    const isJson = trimmed.startsWith('{') || (filename && filename.toLowerCase().endsWith('.json'));

    let snapshot: any = {};
    let format: 'SQL' | 'JSON' = 'SQL';

    if (isJson) {
      format = 'JSON';
      const parsed = JSON.parse(trimmed);
      snapshot = {
        owners: parsed.owners || [],
        routers: parsed.routers || [],
        plans: parsed.plans || [],
        vouchers: parsed.vouchers || [],
        transactions: parsed.transactions || [],
        auditLogs: parsed.audit_logs || parsed.auditLogs || [],
        voucherBatches: parsed.voucherBatches || parsed.voucher_batches || [],
        freeTrialClaims: parsed.freeTrialClaims || parsed.free_trial_claims || [],
        settings: parsed.settings,
        companyInfo: parsed.companyInfo || parsed.company_info,
        freeTrialConfig: parsed.freeTrialConfig || parsed.free_trial_config,
      };
    } else {
      format = 'SQL';
      snapshot = parseSQLDumpToSnapshot(trimmed);
    }

    const result = db.restoreFromSnapshot(snapshot);

    res.json({
      success: true,
      message: `Database imerejeshwa kikamilifu kutoka kwenye faili la ${format}!`,
      stats: {
        format,
        ...result,
        restoredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Hitilafu ya kurejesha backup: ' + (err.message || String(err)) });
  }
});

// System Factory Reset for Live Production Launch
apiRouter.post('/system/reset-live', (req: Request, res: Response) => {
  try {
    const {
      confirmationWord,
      clearTransactions = true,
      clearVouchers = true,
      clearFreeTrials = true,
      clearAuditLogs = true,
      clearDemoOwners = false,
      clearDemoRouters = false,
      resetPlansToDefault = false,
    } = req.body;

    const cleanWord = String(confirmationWord || '').trim().toUpperCase();
    if (cleanWord !== 'RESET LIVE' && cleanWord !== 'FUTA DATA' && cleanWord !== 'CONFIRM') {
      return res.status(400).json({
        error: 'Neno la uthibitisho si sahihi. Andika "RESET LIVE" au "FUTA DATA" kuthibitisha kufuta data zote za majaribio.',
      });
    }

    const result = db.resetSystemForLiveLaunch({
      clearTransactions: Boolean(clearTransactions),
      clearVouchers: Boolean(clearVouchers),
      clearFreeTrials: Boolean(clearFreeTrials),
      clearAuditLogs: Boolean(clearAuditLogs),
      clearDemoOwners: Boolean(clearDemoOwners),
      clearDemoRouters: Boolean(clearDemoRouters),
      resetPlansToDefault: Boolean(resetPlansToDefault),
    });

    return res.json({
      success: true,
      message: 'Mfumo umewekwa upya kabisa na kusafishwa tayari kwa uzinduzi rasmi (Live Launch)!',
      summary: result,
      stats: db.getDataSummary(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kureset mfumo.' });
  }
});

// =============================================================================
// Module 2: Vendor Sub-Merchant Payment Endpoints (Dynamic Payment Routing)
// =============================================================================
apiRouter.post('/payments/vendor/dispatch', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, planId, routerId, networkProvider, macAddress, userIp } = req.body;
    if (!phoneNumber || !planId) {
      return res.status(400).json({ error: 'Nambari ya simu na kifurushi vinahitajika.' });
    }

    const result = await VendorPaymentRouterService.routePaymentToVendor({
      phoneNumber,
      planId: Number(planId),
      routerId: routerId ? Number(routerId) : undefined,
      networkProvider,
      macAddress,
      userIp: userIp || req.ip,
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Vendor payment dispatch failed.' });
  }
});

// Idempotent Vendor Webhook Callback
apiRouter.post('/payments/vendor/callback', async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-vendor-signature'] || req.headers['x-signature']) as string;
    const rawBody = JSON.stringify(req.body);

    const isValid = VendorPaymentRouterService.verifyCallbackSignature(rawBody, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Saini ya malipo (HMAC Signature) sio sahihi.' });
    }

    const callbackData = {
      merchantId: req.body.merchantId || req.body.vendorId || 'PP-MERCHANT',
      reference: req.body.reference || req.body.externalReference,
      transactionId: req.body.transactionId || `TX-${Date.now()}`,
      status: req.body.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      amount: Number(req.body.amount || 0),
      currency: req.body.currency || 'TZS',
      signature: signature || '',
      timestamp: req.body.timestamp || new Date().toISOString(),
    } as any;

    if (!callbackData.reference) {
      return res.status(400).json({ error: 'Missing reference in callback payload.' });
    }

    const result = await VendorPaymentRouterService.handleVendorCallback(callbackData, rawBody);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Vendor callback error.' });
  }
});

// =============================================================================
// Module 3: Dynamic MikroTik Script Generator (.rsc Exports)
// =============================================================================
apiRouter.get('/scripts/vpn.rsc', (req: Request, res: Response) => {
  const routerId = req.query.routerId ? Number(req.query.routerId) : 1;
  const router = db.getRouterById(routerId) || db.getRouters()[0];

  const script = ScriptGeneratorService.generateVpnScript(router);

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${router.name}-vpn.rsc"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(script);
  }

  res.json({ script, filename: `${router.name}-vpn.rsc` });
});

apiRouter.get('/scripts/hotspot.rsc', (req: Request, res: Response) => {
  const routerId = req.query.routerId ? Number(req.query.routerId) : 1;
  const router = db.getRouterById(routerId) || db.getRouters()[0];

  const script = ScriptGeneratorService.generateHotspotScript(router);

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${router.name}-hotspot.rsc"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(script);
  }

  res.json({ script, filename: `${router.name}-hotspot.rsc` });
});

apiRouter.get('/scripts/pppoe.rsc', (req: Request, res: Response) => {
  const routerId = req.query.routerId ? Number(req.query.routerId) : 1;
  const router = db.getRouterById(routerId) || db.getRouters()[0];

  const script = ScriptGeneratorService.generatePppoeScript(router);

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${router.name}-pppoe.rsc"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(script);
  }

  res.json({ script, filename: `${router.name}-pppoe.rsc` });
});

apiRouter.get('/scripts/all-in-one.rsc', (req: Request, res: Response) => {
  const routerId = req.query.routerId ? Number(req.query.routerId) : 1;
  const router = db.getRouterById(routerId) || db.getRouters()[0];

  const script = ScriptGeneratorService.generateAllInOneScript(router);

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${router.name}-complete.rsc"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(script);
  }

  res.json({ script, filename: `${router.name}-complete.rsc` });
});

// Downloadable / Viewable anti-tethering.rsc
apiRouter.get('/scripts/anti-tethering.rsc', (req: Request, res: Response) => {
  const routerId = req.query.routerId ? Number(req.query.routerId) : 1;
  const router = db.getRouterById(routerId) || db.getRouters()[0];

  const script = ScriptGeneratorService.generateAntiTetheringScript(router);

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="${router.name}-anti-tethering.rsc"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(script);
  }

  res.json({ script, filename: `${router.name}-anti-tethering.rsc` });
});

// Toggle or Deploy Anti-Tethering Rules Directly to MikroTik Router
apiRouter.post('/routers/:id/anti-tethering', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const enabled = req.body.enabled !== false;
  router.anti_tethering = enabled;
  db.saveRouter(router);

  // Queue Anti-Tethering rules to RouterOS
  const bridge = router.hotspot_server_name ? 'bridge-hotspot' : 'bridge';
  if (enabled) {
    MikrotikService.queueCommand(router.id, `/ip firewall mangle add chain=postrouting out-interface=${bridge} action=change-ttl new-ttl=set:1 passthrough=yes comment="ANTI-TETHERING: Set TTL=1 for Wireless Clients"`);
    MikrotikService.queueCommand(router.id, `/ip firewall mangle add chain=postrouting out-interface=all-wireless action=change-ttl new-ttl=set:1 passthrough=yes comment="ANTI-TETHERING: Set TTL=1 for Wireless Clients"`);
    MikrotikService.queueCommand(router.id, `/ip firewall mangle add chain=prerouting in-interface=${bridge} ttl=equal:63 action=mark-packet new-packet-mark=tethered_hop passthrough=yes comment="ANTI-TETHERING: Detect Android/iOS Tethered Hop (TTL 63)"`);
    MikrotikService.queueCommand(router.id, `/ip firewall mangle add chain=prerouting in-interface=${bridge} ttl=equal:127 action=mark-packet new-packet-mark=tethered_hop passthrough=yes comment="ANTI-TETHERING: Detect Windows Tethered Hop (TTL 127)"`);
    MikrotikService.queueCommand(router.id, `/ip firewall filter add action=drop chain=forward packet-mark=tethered_hop comment="ANTI-TETHERING: Block Forwarding for Tethered Shared Devices" place-before=1`);
    MikrotikService.queueCommand(router.id, `/ip hotspot profile set [find] addresses-per-mac=1`);
    MikrotikService.queueCommand(router.id, `/ip hotspot user profile set [find] shared-users=1`);
  } else {
    MikrotikService.queueCommand(router.id, `/ip firewall mangle remove [find comment~"ANTI-TETHERING"]`);
    MikrotikService.queueCommand(router.id, `/ip firewall filter remove [find comment~"ANTI-TETHERING"]`);
  }

  res.json({
    success: true,
    message: enabled
      ? 'Ulinzi wa Anti-Tethering (kuzuia kushare Hotspot kwa TTL=1) umewashwa na kutumwa kwenye router!'
      : 'Ulinzi wa Anti-Tethering umezimwa.',
    router,
  });
});

// =============================================================================
// Module 1: Automated VPS Script Server Endpoint
// =============================================================================
apiRouter.get('/devops/vps-script', (_req: Request, res: Response) => {
  const scriptPath = path.resolve(process.cwd(), 'deploy', 'setup-vps.sh');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="setup-vps.sh"');
    res.setHeader('Content-Type', 'text/x-shellscript; charset=utf-8');
    return res.sendFile(scriptPath);
  }
  res.status(404).send('#!/bin/bash\necho "Script not found"\n');
});

apiRouter.get('/devops/server-status', (_req: Request, res: Response) => {
  const nasList = db.getNasList();
  const routers = db.getRouters();
  res.json({
    platform: 'INFOTECH WiFi CLOUD ISP ARCHITECTURE',
    vpsSubnet: '100.108.0.0/18',
    vpsGatewayIp: '100.108.0.1',
    radiusPorts: {
      auth: 1812,
      acct: 1813,
      coa: 3799,
    },
    activeNasCount: nasList.length,
    registeredRouters: routers.length,
    openvpnPort: 1195,
    sstpPort: 4443,
  });
});

// =============================================================================
// Company Public Information & Settings (About Us & Contacts)
// =============================================================================
apiRouter.get('/system/company-info', (_req: Request, res: Response) => {
  try {
    const info = db.getCompanyInfo();
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch company info.' });
  }
});

apiRouter.get('/company-info', (_req: Request, res: Response) => {
  try {
    const info = db.getCompanyInfo();
    res.json(info);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch company info.' });
  }
});

apiRouter.post('/system/company-info', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid payload.' });
    }
    const updated = db.updateCompanyInfo(updates);
    res.json({
      success: true,
      message: 'Taarifa za mfumo (Kuhusu Sisi & Mawasiliano) zimehifadhiwa kikamilifu!',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update company info.' });
  }
});

apiRouter.put('/system/company-info', (req: Request, res: Response) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid payload.' });
    }
    const updated = db.updateCompanyInfo(updates);
    res.json({
      success: true,
      message: 'Taarifa za mfumo (Kuhusu Sisi & Mawasiliano) zimehifadhiwa kikamilifu!',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update company info.' });
  }
});



// User Management Sub-users & Cashier endpoints
apiRouter.get('/users', (req: Request, res: Response) => {
  const allOwners = db.getOwners();
  const { parentOwnerId } = req.query;
  if (parentOwnerId) {
    return res.json(allOwners.filter((o: any) => o.id === Number(parentOwnerId) || o.parent_owner_id === Number(parentOwnerId)));
  }
  res.json(allOwners);
});

apiRouter.post('/users', async (req: Request, res: Response) => {
  try {
    const creator = getRequestUser(req);
    const data = req.body || {};

    let resolvedParentId = data.parent_owner_id ? Number(data.parent_owner_id) : undefined;
    let isSubUser = Boolean(data.is_sub_user);
    let resolvedRole = data.role || 'CASHIER';

    if (creator && (creator.role as string) !== 'admin' && creator.role !== 'VENDOR_ADMIN') {
      resolvedParentId = creator.parent_owner_id ? Number(creator.parent_owner_id) : creator.id;
      isSubUser = true;
      if (!data.role || data.role === 'owner' || data.role === 'HOTSPOT_OWNER') {
        resolvedRole = 'CASHIER';
      }
    }

    const actualName = (data.name || data.fullName || data.full_name || '').trim();
    const actualBusiness = (data.business_name || data.businessName || data.name || data.fullName || 'Hotspot Staff').trim();
    const phone = String(data.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ error: 'Nambari ya simu inahitajika.' });
    }

    const defaultPrivileges = data.privileges || {
      can_manage_routers: false,
      can_reboot_routers: false,
      can_manage_plans: false,
      can_generate_vouchers: true,
      can_view_vouchers: true,
      can_print_vouchers: true,
      can_kick_users: false,
      can_view_active_users: true,
      can_view_reports: false,
      can_export_reports: false,
      can_manage_subusers: false,
      can_customize_portal: false,
      can_manage_payments: false,
      can_manage_gateways: false,
      can_manage_devops: false,
    };

    const newOwner: HotspotOwner = {
      id: data.id ? Number(data.id) : db.getNextOwnerId(),
      name: actualName || 'Staff Member',
      business_name: actualBusiness,
      email: data.email ? String(data.email).trim() : `${phone.replace(/\D/g, '')}@tzwifi.local`,
      phone,
      password: data.password ? String(data.password).trim() : '123456',
      role: resolvedRole as UserRole,
      status: data.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      parent_owner_id: resolvedParentId,
      is_sub_user: isSubUser,
      staff_title: data.staff_title ? String(data.staff_title).trim() : 'Cashier / Operator',
      privileges: defaultPrivileges,
      assigned_router_ids: Array.isArray(data.assigned_router_ids) ? data.assigned_router_ids.map(Number) : [],
      commission_rate: Number(data.commission_rate) || 0,
      monthly_fee: 0,
      subscription_status: 'ACTIVE',
      subscription_expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
      subscription_fee: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const saved = db.saveOwner(newOwner);
    res.json({
      success: true,
      message: 'Mtumiaji amehifadhiwa kikamilifu bila router forwarding!',
      user: saved,
      owner: saved,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Subscription Gateway Settings (DaliPay Super Admin Tier 1)
apiRouter.post('/admin/settings/dalipay', (req: Request, res: Response) => {
  const { publicKey, secretKey, apiEndpoint, isSandbox, keyId, webhookSecret } = req.body || {};
  const settings = db.getSettings();
  if (!settings.dalipay) (settings as any).dalipay = {};

  settings.activeGateway = 'DALIPAY';
  settings.dalipay = {
    ...settings.dalipay,
    keyId: (keyId ?? settings.dalipay?.keyId ?? process.env.DALIPAY_KEY_ID ?? '').trim(),
    publicKey: (publicKey ?? settings.dalipay?.publicKey ?? process.env.DALIPAY_PUBLIC_KEY ?? '').trim(),
    secretKey: (secretKey ?? settings.dalipay?.secretKey ?? process.env.DALIPAY_SECRET_KEY ?? '').trim(),
    apiEndpoint: (apiEndpoint || settings.dalipay?.apiEndpoint || process.env.DALIPAY_ENDPOINT || 'https://app.dalipay.co.tz').trim(),
    webhookSecret: (webhookSecret ?? settings.dalipay?.webhookSecret ?? process.env.DALIPAY_WEBHOOK_SECRET ?? '').trim(),
    isSandbox: Boolean(isSandbox),
  };

  db.saveSettings(settings);
  return res.json({ success: true, message: 'Mipangilio ya Admin DaliPay imehifadhiwa.', data: settings.dalipay });
});

// Owner Merchant Gateway Settings (DaliPay Hotspot Owner Tier 2)
apiRouter.post('/owner/:ownerId/dalipay', (req: Request, res: Response) => {
  const { ownerId } = req.params;
  const { publicKey, secretKey, apiEndpoint, keyId } = req.body || {};
  const owner = db.getOwnerById(Number(ownerId));
  if (!owner) {
    return res.status(404).json({ success: false, message: 'Hotspot Owner hakupatikana.' });
  }

  owner.dalipay_public_key = (publicKey || '').trim();
  owner.dalipay_secret_key = (secretKey || '').trim();
  owner.dalipay_api_endpoint = apiEndpoint || 'https://app.dalipay.co.tz';
  if (keyId) owner.dalipay_key_id = keyId.trim();

  db.saveOwner(owner);
  return res.json({ success: true, message: 'Mipangilio ya malipo ya mmiliki imehifadhiwa kikamilifu.', owner });
});

// Tier 1: Owner Subscription Payment to Super Admin
apiRouter.post('/subscription/pay', async (req: Request, res: Response) => {
  const { ownerId, months = 1, phoneNumber } = req.body || {};
  const owner = db.getOwnerById(Number(ownerId));
  if (!owner) return res.status(404).json({ message: 'Owner hayupo.' });

  const settings = db.getSettings();
  const adminCreds = settings.dalipay;
  if (!adminCreds?.publicKey || !adminCreds?.secretKey) {
    return res.status(400).json({ message: 'Admin hajasajili API keys za kupokea subscription.' });
  }

  const monthlyRate = owner.subscription_fee || 15000;
  const totalAmount = monthlyRate * (Number(months) || 1);
  const reference = `SUB-${owner.id}-${Date.now()}`;

  try {
    const result = await PaymentGatewayService.initiateSubscriptionPush({
      ownerId: owner.id,
      phoneNumber: String(phoneNumber || owner.phone),
    });
    return res.json({ success: true, message: 'Ombi la malipo ya subscription limetumwa kwenye simu.', data: result, reference });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Subscription Toggle Expire (Admin Simulator & Controls)
apiRouter.post('/subscription/toggle-expire', (req: Request, res: Response) => {
  try {
    const { ownerId, isExpired, days = 30 } = req.body || {};
    const owner = db.getOwnerById(Number(ownerId));
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    if (isExpired) {
      owner.subscription_status = 'EXPIRED';
      owner.subscription_expires_at = new Date(Date.now() - 3600000).toISOString();
    } else {
      owner.subscription_status = 'ACTIVE';
      owner.subscription_expires_at = new Date(Date.now() + Number(days) * 86400000).toISOString();
    }
    owner.updated_at = new Date().toISOString();
    const updated = db.saveOwner(owner);
    res.json({
      success: true,
      owner: updated,
      message: `Hali ya ${owner.business_name} imebadilishwa kuwa ${owner.subscription_status}!`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/subscription/toggle-all-expire', (req: Request, res: Response) => {
  try {
    const { isExpired, days = 30 } = req.body || {};
    const owners = db.getOwners();
    const updatedOwners = owners.map((owner) => {
      if (owner.role === 'VENDOR_ADMIN') return owner;
      if (isExpired) {
        owner.subscription_status = 'EXPIRED';
        owner.subscription_expires_at = new Date(Date.now() - 3600000).toISOString();
      } else {
        owner.subscription_status = 'ACTIVE';
        owner.subscription_expires_at = new Date(Date.now() + Number(days) * 86400000).toISOString();
      }
      owner.updated_at = new Date().toISOString();
      return db.saveOwner(owner);
    });
    res.json({
      success: true,
      owners: updatedOwners.filter((o) => o.role === 'HOTSPOT_OWNER'),
      message: isExpired ? 'Wamiliki wote wamesimamishwa (EXPIRED)!' : 'Wamiliki wote wamewashwa (ACTIVE)!',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Simulate Approval / Instant Sandbox Payment Trigger
apiRouter.post('/payments/simulate-approval', async (req: Request, res: Response) => {
  // Guard: Inaruhusiwa tu ikiwa mfumo uko kwenye maendeleo (NODE_ENV !== "production") au mtumiaji ni VENDOR_ADMIN
  const caller = getRequestUser(req);
  const isDev = process.env.NODE_ENV !== 'production';
  const isVendorAdmin = caller && (caller.role === 'VENDOR_ADMIN' || (caller.role as string) === 'admin');

  if (!isDev && !isVendorAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Ufikiaji umekataliwa: Endpoint ya majaribio (simulate-approval) imezimwa kwenye mazingira ya uzalishaji (Production Live). Inaruhusiwa kwa VENDOR_ADMIN au Sandbox pekee.',
    });
  }

  try {
    const { externalReference, status = 'SUCCESS', reason, message } = req.body || {};
    const tx = db.getTransactionByReference(externalReference);
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Muamala haukupatikana.' });
    }

    const isFailed = status === 'FAILED' || reason === 'INSUFFICIENT_FUNDS';
    const isNoFunds =
      reason === 'INSUFFICIENT_FUNDS' ||
      (message && String(message).toLowerCase().includes('salio')) ||
      (message && String(message).toLowerCase().includes('insufficient'));

    let failureMsg = 'Mteja alikataa au hakukamilisha malipo kwenye simu.';
    if (isNoFunds) {
      failureMsg = 'Account haina salio la kutosha.';
    } else if (message) {
      failureMsg = String(message);
    }

    const result = await PaymentGatewayService.processWebhookCallback({
      externalReference,
      transactionId: `SIM-${Date.now()}`,
      status: isFailed ? 'FAILED' : 'SUCCESS',
      amount: tx.amount,
      currency: 'TZS',
      phoneNumber: tx.phone_number,
      carrier: tx.network_provider,
      timestamp: new Date().toISOString(),
      message: isFailed ? failureMsg : 'Transaction completed by subscriber',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
