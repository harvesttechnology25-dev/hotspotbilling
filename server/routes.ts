import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { detectCarrier } from './carrierDetector.js';
import { PaymentGatewayService } from './paymentGateway.js';
import { MikrotikService } from './mikrotikService.js';
import { VoucherBatchService } from './services/voucherBatchService.js';
import { VendorPaymentRouterService } from './services/vendorPaymentRouter.js';
import { ScriptGeneratorService } from './services/scriptGenerator.js';
import { OmadaAdoptionService } from './services/omadaAdoptionService.js';
import { EmailService } from './emailService.js';
import { db } from './db.js';
import {
  InitiatePaymentPayload,
  WebhookPayload,
  NetworkProvider,
  VoucherRecord,
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

// Initiate Mobile Money Push
apiRouter.post('/payments/initiate', async (req: Request, res: Response) => {
  try {
    const payload: InitiatePaymentPayload = req.body;
    if (!payload.phoneNumber || !payload.planId) {
      return res.status(400).json({
        error: 'Tafadhali weka nambari ya simu na uchague kifurushi (Phone number and plan are required).',
      });
    }

    const result = await PaymentGatewayService.initiateMobileMoneyPush({
      phoneNumber: payload.phoneNumber,
      networkProvider: payload.networkProvider,
      planId: Number(payload.planId),
      routerId: payload.routerId ? Number(payload.routerId) : undefined,
      macAddress: payload.macAddress,
      userIp: payload.userIp || req.ip,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Payment initiation failed.' });
  }
});

// Carrier / Aggregator Webhook Callback (Compatible with PalmPesa, AzamPay, Billnass & Vodacom)
const handleIncomingWebhook = async (req: Request, res: Response) => {
  try {
    const signatureHeader = req.headers['x-signature'] as string | undefined;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    const isValid = PaymentGatewayService.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid HMAC signature header.' });
    }

    const rawStatus = String(req.body.status || req.body.result || req.body.state || '').toUpperCase();
    const isSuccess =
      rawStatus === 'SUCCESS' ||
      rawStatus === 'COMPLETED' ||
      rawStatus === 'PAID' ||
      req.body.success === true ||
      req.body.status === 1 ||
      req.body.status === '1';

    const webhookPayload: WebhookPayload = {
      externalReference:
        req.body.externalReference ||
        req.body.reference ||
        req.body.external_reference ||
        req.body.ref ||
        req.body.bill_ref ||
        req.body.user_ref,
      transactionId:
        req.body.transactionId ||
        req.body.trans_id ||
        req.body.transaction_id ||
        req.body.receipt ||
        req.body.receipt_no ||
        `MNO-${Date.now()}`,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      amount: Number(req.body.amount || req.body.trans_amount || 0),
      currency: req.body.currency || 'TZS',
      phoneNumber: req.body.phoneNumber || req.body.msisdn || req.body.phone || '',
      carrier: req.body.carrier || req.body.operator || req.body.network || '',
      timestamp: req.body.timestamp || new Date().toISOString(),
      message: req.body.message || req.body.desc,
    };

    if (!webhookPayload.externalReference) {
      return res.status(400).json({ error: 'Missing externalReference in webhook payload.' });
    }

    const result = await PaymentGatewayService.processWebhookCallback(
      webhookPayload,
      signatureHeader,
      rawBody
    );

    res.status(result.success ? 200 : 400).json(result);
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

// DaliPay Sandbox Test Push Endpoint
apiRouter.post('/payments/dalipay/test-push', async (req: Request, res: Response) => {
  try {
    const { keyId, phoneNumber = '0754123456', amount = 1000, carrier = 'VODACOM' } = req.body;
    const settings = db.getSettings();
    const dali = settings.dalipay;
    const activeKeyId = keyId || dali?.keyId || 'y3hT9bs505Z6';

    const testRef = `DALI-TEST-${Date.now().toString().slice(-6)}`;
    const txId = `GW-TX-${activeKeyId}-${Date.now().toString().slice(-6)}`;

    // Create a transaction record so voucher/flow can be verified
    const tx: TransactionRecord = {
      id: db.getNextTransactionId(),
      phone_number: phoneNumber,
      network_provider: carrier,
      amount: Number(amount),
      external_reference: testRef,
      transaction_id: txId,
      status: 'PENDING',
      plan_id: 1,
      gateway_provider: `DALIPAY (${activeKeyId})`,
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
        publicKey: dali?.publicKey,
        amount,
        phoneNumber,
        carrier,
        environment: 'Test environment (Simulated transactions, no real money movement)',
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
      environment: 'Test environment (Simulated transactions, no real money movement)',
      message: `Jaribio la ombi la malipo (USSD Push) kupitia DaliPay (Key: ${activeKeyId}) limetumwa kwa namba ${phoneNumber}!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya jaribio la DaliPay.' });
  }
});

// Check Payment Status (Polling endpoint for Captive Portal)
apiRouter.get('/payments/status/:reference', (req: Request, res: Response) => {
  const { reference } = req.params;
  const transaction = db.getTransactionByReference(reference);

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const voucher = transaction.status === 'SUCCESS'
    ? db.getVoucherByTransactionId(transaction.id)
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
  const { externalReference, status } = req.body;
  if (!externalReference) {
    return res.status(400).json({ error: 'externalReference is required.' });
  }

  const transaction = db.getTransactionByReference(externalReference);
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found.' });
  }

  const simulatedPayload: WebhookPayload = {
    externalReference,
    transactionId: `${transaction.network_provider.slice(0, 2)}${Date.now()}`,
    status: status === 'FAILED' ? 'FAILED' : 'SUCCESS',
    amount: transaction.amount,
    currency: 'TZS',
    phoneNumber: transaction.phone_number,
    carrier: transaction.network_provider,
    timestamp: new Date().toISOString(),
    message: status === 'FAILED' ? 'User cancelled USSD prompt' : 'Payment approved by customer',
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
// Plans Endpoints (CRUD)
// =============================================================================
apiRouter.get('/plans', (_req: Request, res: Response) => {
  res.json(db.getPlans());
});

apiRouter.post('/plans', (req: Request, res: Response) => {
  try {
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
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Jina la kifurushi na bei vinahitajika.' });
    }

    const newPlan: PlanRecord = {
      id: db.getNextPlanId(),
      name,
      type,
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
  const id = Number(req.params.id);
  const existing = db.getPlanById(id);
  if (!existing) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const updated: PlanRecord = {
    ...existing,
    ...req.body,
    id,
    price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
    features: req.body.features !== undefined ? (Array.isArray(req.body.features) ? req.body.features : []) : existing.features,
    updated_at: new Date().toISOString(),
  };

  db.savePlan(updated);
  res.json({ success: true, plan: updated });
});

apiRouter.delete('/plans/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ok = db.deletePlan(id);
  res.json({ success: ok });
});

// =============================================================================
// Voucher Endpoints
// =============================================================================
apiRouter.get('/vouchers', (req: Request, res: Response) => {
  let vouchers = db.getVouchers();
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : null;
  if (ownerId) {
    const owner = db.getOwnerById(ownerId);
    if (owner && owner.role === 'HOTSPOT_OWNER') {
      const allowed = new Set(owner.assigned_router_ids);
      vouchers = vouchers.filter((v) => v.router_id && allowed.has(v.router_id));
    }
  }

  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));
  const enriched = vouchers.map((v) => ({
    ...v,
    plan: plansMap.get(v.plan_id),
  }));
  res.json(enriched);
});

apiRouter.post('/vouchers/redeem', async (req: Request, res: Response) => {
  const { code, macAddress } = req.body;
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
  const router = voucher.router_id ? db.getRouterById(voucher.router_id) : db.getRouters()[0];

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

    const result = VoucherBatchService.generateBatch({
      planId: Number(planId),
      quantity: Number(quantity),
      routerId: routerId ? Number(routerId) : undefined,
      ownerId: ownerId ? Number(ownerId) : undefined,
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
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const batches = VoucherBatchService.listBatches(ownerId);
  res.json(batches);
});

apiRouter.get('/vouchers/batches/:batchId', (req: Request, res: Response) => {
  const { batchId } = req.params;
  const batch = VoucherBatchService.getBatchWithVouchers(batchId);
  if (!batch) {
    return res.status(404).json({ error: 'Voucher batch not found.' });
  }
  res.json(batch);
});

apiRouter.post('/vouchers/batch-generate', async (req: Request, res: Response) => {
  const { planId, quantity, prefix = 'TZ', routerId } = req.body;
  if (!planId || !quantity) {
    return res.status(400).json({ error: 'Plan ID and quantity are required.' });
  }

  const plan = db.getPlanById(Number(planId));
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found.' });
  }

  const count = Math.min(Math.max(Number(quantity), 1), 100);
  const batchTag = `BATCH-${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 900 + 100)}`;
  const generated: VoucherRecord[] = [];
  const router = routerId ? db.getRouterById(Number(routerId)) : db.getRouters()[0];

  const actualPrefix = prefix && prefix !== 'TZ' ? prefix : 'VCH';
  for (let i = 0; i < count; i++) {
    const code = PaymentGatewayService.generateManualVoucherCode(actualPrefix);
    const voucher: VoucherRecord = {
      id: db.getNextVoucherId(),
      code,
      password: code,
      plan_id: plan.id,
      router_id: router?.id,
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

    // Check username aliases 'admin' (Vendor HQ) and 'user' (Regular Hotspot Owner)
    if (cleanInput === 'admin') {
      user = owners.find((o) => o.role === 'VENDOR_ADMIN') || owners[0];
    } else if (cleanInput === 'user') {
      user = owners.find((o) => o.role === 'HOTSPOT_OWNER') || owners[1];
    } else {
      const matches = owners.filter((o) => {
        const emailMatch = o.email && o.email.toLowerCase() === cleanInput;
        const phoneMatch = o.phone && o.phone.replace(/\D/g, '') === cleanInput.replace(/\D/g, '');
        const nameMatch = o.name && o.name.toLowerCase().includes(cleanInput);
        return emailMatch || phoneMatch || nameMatch;
      });

      if (matches.length > 0) {
        user = requestedRole ? matches.find((m) => m.role === requestedRole) || matches[0] : matches[0];
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
        palmpesa_user_id: user.palmpesa_user_id,
        palmpesa_user_ref: user.palmpesa_user_ref,
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
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Hitilafu ya kusajili akaunti.' });
  }
});

// =============================================================================
// Hotspot Owners & Multi-Tenant User Management with Granular Privileges
// =============================================================================
apiRouter.get('/owners', (req: Request, res: Response) => {
  let owners = db.getOwners();
  const { parentOwnerId, role, status, excludeParent } = req.query;

  if (parentOwnerId) {
    const pId = Number(parentOwnerId);
    if (excludeParent === 'true') {
      owners = owners.filter((o) => o.parent_owner_id === pId);
    } else {
      // Include parent and all their staff/subusers
      owners = owners.filter((o) => o.id === pId || o.parent_owner_id === pId);
    }
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

    let resolvedBusinessName = business_name;
    let resolvedParentId = parent_owner_id ? Number(parent_owner_id) : undefined;
    let resolvedRouters = Array.isArray(assigned_router_ids) ? assigned_router_ids.map(Number) : [];

    if (resolvedParentId && !resolvedBusinessName) {
      const parent = db.getOwnerById(resolvedParentId);
      if (parent) {
        resolvedBusinessName = parent.business_name;
        if (resolvedRouters.length === 0) {
          resolvedRouters = [...parent.assigned_router_ids];
        }
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
      business_name: String(resolvedBusinessName || name).trim(),
      email: email ? String(email).trim() : `${String(phone).replace(/\D/g, '')}@tzwifi.local`,
      phone: String(phone).trim(),
      password: password ? String(password).trim() : '123456',
      role: role as UserRole,
      status: status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      parent_owner_id: resolvedParentId,
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.saveOwner(owner);

    // Sync assigned routers with owner info
    for (const rId of owner.assigned_router_ids) {
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

  const updated: HotspotOwner = {
    ...existing,
    ...req.body,
    id,
    name: req.body.name ? String(req.body.name).trim() : existing.name,
    business_name: req.body.business_name ? String(req.body.business_name).trim() : existing.business_name,
    email: req.body.email ? String(req.body.email).trim() : existing.email,
    phone: req.body.phone ? String(req.body.phone).trim() : existing.phone,
    password: req.body.password ? String(req.body.password).trim() : existing.password,
    role: req.body.role ? (req.body.role as UserRole) : existing.role,
    status: req.body.status ? (req.body.status as 'ACTIVE' | 'SUSPENDED') : existing.status,
    staff_title: req.body.staff_title !== undefined ? req.body.staff_title : existing.staff_title,
    parent_owner_id: req.body.parent_owner_id !== undefined ? (req.body.parent_owner_id ? Number(req.body.parent_owner_id) : undefined) : existing.parent_owner_id,
    privileges: req.body.privileges !== undefined ? { ...(existing.privileges || {}), ...req.body.privileges } : existing.privileges,
    monthly_fee: req.body.monthly_fee !== undefined ? Number(req.body.monthly_fee) : existing.monthly_fee ?? 10000,
    palmpesa_user_id: req.body.palmpesa_user_id !== undefined ? (req.body.palmpesa_user_id ? String(req.body.palmpesa_user_id).trim() : undefined) : existing.palmpesa_user_id,
    palmpesa_user_ref: req.body.palmpesa_user_ref !== undefined ? (req.body.palmpesa_user_ref ? String(req.body.palmpesa_user_ref).trim() : undefined) : existing.palmpesa_user_ref,
    palmpesa_api_token: req.body.palmpesa_api_token !== undefined ? (req.body.palmpesa_api_token ? String(req.body.palmpesa_api_token).trim() : undefined) : existing.palmpesa_api_token,
    palmpesa_accept_stk: req.body.palmpesa_accept_stk !== undefined ? Boolean(req.body.palmpesa_accept_stk) : (existing.palmpesa_accept_stk ?? true),
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

apiRouter.delete('/owners/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const ok = db.deleteOwner(id);
  res.json({ success: ok });
});

// =============================================================================
// MikroTik RouterOS Management Endpoints (CRUD & Live Test)
// =============================================================================
apiRouter.get('/routers', (req: Request, res: Response) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : null;
  const routers = db.getRouters();
  if (ownerId) {
    const owner = db.getOwnerById(ownerId);
    if (owner && owner.role === 'HOTSPOT_OWNER') {
      return res.json(routers.filter((r) => r.owner_id === ownerId || owner.assigned_router_ids.includes(r.id)));
    }
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
  const ip = req.query.ip ? String(req.query.ip) : undefined;

  const routers = db.getRouters();
  let matched = routers[0];

  if (routerId) {
    const found = routers.find((r) => r.id === routerId);
    if (found) matched = found;
  } else if (ip) {
    const found = routers.find((r) => r.ip_address === ip || ip.startsWith(r.ip_address.slice(0, 7)));
    if (found) matched = found;
  }

  const owner = matched?.owner_id ? db.getOwnerById(matched.owner_id) : undefined;
  const brandName = matched?.brand_name || owner?.business_name || matched?.name || 'INFOTECH WiFi';
  const ssid = matched?.ssid || `${brandName.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 16)}-WIFI`;

  const activeTheme: PortalThemeConfig = {
    ...DEFAULT_SERVER_PORTAL_THEME,
    brandName,
    supportPhone: owner?.phone || matched?.ip_address || '+255 754 000 111',
    ...(owner?.portal_theme || matched?.portal_theme || {}),
  };

  res.json({
    platformName: 'INFOTECH WiFi',
    router: matched,
    routerId: matched?.id,
    brandName,
    ssid,
    ownerBusinessName: owner?.business_name || brandName,
    location: matched?.location || 'Tanzania',
    supportPhone: owner?.phone || '+255 754 000 111',
    portalTheme: activeTheme,
    routers: routers.map((r) => ({
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
  } else if (routerId) {
    const router = db.getRouterById(routerId);
    if (router) {
      if (router.portal_theme) {
        theme = { ...theme, ...router.portal_theme };
      } else {
        theme.brandName = router.brand_name || router.name;
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
        if (r.owner_id === owner.id || owner.assigned_router_ids.includes(r.id)) {
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

  const fee = owner.subscription_fee || 15000;
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
    const keyId = dali?.keyId || 'y3hT9bs505Z6';
    const isConfigured = Boolean(dali?.publicKey && dali?.secretKey);
    return {
      gateway: 'DALIPAY' as any,
      aggregatorName: `DaliPay Aggregator (Key: ${keyId})`,
      merchantId: keyId,
      receivingAccount: dali?.publicKey || 'gw_pk_test_EoDvAZ',
      isConfigured,
      isSandbox: Boolean(dali?.isSandbox),
      destinationSummary: `Akaunti ya DaliPay ya Vendor (Key ID: ${keyId}, Environment: ${dali?.isSandbox ? 'Test Sandbox' : 'Live'})`,
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

apiRouter.post('/subscription/initiate', async (req: Request, res: Response) => {
  try {
    const { ownerId, phoneNumber, carrier } = req.body;
    if (!ownerId || !phoneNumber) {
      return res.status(400).json({ error: 'Nambari ya simu na akaunti ya mmiliki vinahitajika.' });
    }

    const owner = db.getOwnerById(Number(ownerId));
    if (!owner) {
      return res.status(404).json({ error: 'Mmiliki wa Hotspot hajapatikana.' });
    }

    const detectedCarrier = carrier || detectCarrier(phoneNumber).provider || 'VODACOM';
    const amount = owner.subscription_fee || 15000;
    const externalReference = `SUB-${owner.id}-${Date.now()}`;
    const vendorAggregator = resolveVendorAggregatorForSubscription();

    // Clean, direct telecom USSD instructions for hotspot user (no vendor internal details or aggregator IDs shown)
    let instructions = `Pop-up ya malipo imetumwa kwenye simu yako (${phoneNumber}). Weka PIN yako kukamilisha malipo ya TSh ${amount.toLocaleString()}.`;
    if (detectedCarrier === 'VODACOM') {
      instructions = `Pop-up ya M-Pesa imetumwa kwa namba ${phoneNumber}. Weka PIN yako kukubali malipo ya TSh ${amount.toLocaleString()}.`;
    } else if (detectedCarrier === 'TIGO') {
      instructions = `Ujumbe wa Tigo Pesa umetumwa kwa namba ${phoneNumber}. Weka PIN kulipa TSh ${amount.toLocaleString()}.`;
    } else if (detectedCarrier === 'AIRTEL') {
      instructions = `Ujumbe wa Airtel Money umetumwa kwa namba ${phoneNumber}. Weka PIN kulipa TSh ${amount.toLocaleString()}.`;
    } else if (detectedCarrier === 'HALOTEL') {
      instructions = `Pop-up ya Halopesa imetumwa kwa namba ${phoneNumber}. Weka PIN kulipa TSh ${amount.toLocaleString()}.`;
    }

    // Save initial pending transaction crediting Vendor Aggregator
    const initialTx: TransactionRecord = {
      id: db.getNextTransactionId(),
      phone_number: phoneNumber,
      network_provider: detectedCarrier,
      amount,
      external_reference: externalReference,
      transaction_id: null,
      status: 'PENDING',
      plan_id: 1,
      owner_id: owner.id,
      vendor_merchant_id: vendorAggregator.merchantId,
      vendor_amount: amount, // 100% of subscription goes to vendor aggregator behind the scenes
      platform_fee: 0,
      gateway_provider: vendorAggregator.aggregatorName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.saveTransaction(initialTx);

    // Save audit log
    db.saveAuditLog({
      id: Date.now(),
      transaction_id: initialTx.id,
      external_reference: externalReference,
      event_type: 'VENDOR_SUBSCRIPTION_INITIATED',
      payload_json: {
        ownerId: owner.id,
        ownerBusinessName: owner.business_name,
        amount,
        carrier: detectedCarrier,
        phoneNumber,
        vendorAggregator,
        destinationWallet: vendorAggregator.destinationSummary,
      },
      created_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      externalReference,
      amount,
      carrier: detectedCarrier,
      phoneNumber,
      instructions,
      message: `Ombi la malipo ya ada ya kila mwezi (TSh ${amount.toLocaleString()}) limetumwa kwenye simu yako! Weka PIN yako kukamilisha.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Hitilafu ya kuanzisha malipo ya subscription.' });
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
    const fee = owner.subscription_fee || 15000;

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
        plan_id: 1,
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

// Subscription Status Polling / Verification Endpoint
apiRouter.get('/subscription/verify/:reference', (req: Request, res: Response) => {
  const { reference } = req.params;
  const transaction = db.getTransactionByReference(reference);

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
      plan_id: 1,
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
      if (owner && !owner.assigned_router_ids.includes(router.id)) {
        owner.assigned_router_ids.push(router.id);
        db.saveOwner(owner);
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

    if (!apPassword) {
      return res.status(400).json({
        success: false,
        error: 'Tafadhali weka Password ya AP (Device Account Password) uliyoweka kwenye AP yako au Controller.',
      });
    }

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
      apPassword,
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

// 7. Omada AP Inform Heartbeat Endpoint
apiRouter.post('/omada/inform', (req: Request, res: Response) => {
  res.json({
    success: true,
    result: 0,
    msg: 'success',
    timestamp: Date.now(),
  });
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
apiRouter.get('/routers/:id/all-users', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const users = await MikrotikService.getAllHotspotUsers(router);
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
    status: 'ACTIVE',
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
apiRouter.delete('/routers/:id/users/:username', async (req: Request, res: Response) => {
  const routerId = Number(req.params.id);
  const { username } = req.params;
  const router = db.getRouterById(routerId);
  if (!router) {
    return res.status(404).json({ error: 'Router not found.' });
  }

  const result = await MikrotikService.deleteUser(router, username);
  res.json(result);
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
  const { carrier, status, search, ownerId } = req.query;
  let txs = db.getTransactions();

  if (ownerId) {
    const owner = db.getOwnerById(Number(ownerId));
    if (owner && owner.role === 'HOTSPOT_OWNER') {
      const allowed = new Set(owner.assigned_router_ids);
      txs = txs.filter((t) => (t.router_id && allowed.has(t.router_id)) || t.owner_id === owner.id);
    }
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

  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));
  const enriched = txs.map((t) => ({
    ...t,
    plan: plansMap.get(t.plan_id),
  }));

  res.json(enriched);
});

// CSV Export for transactions reconciliation
apiRouter.get('/export/transactions/csv', (_req: Request, res: Response) => {
  const txs = db.getTransactions();
  const plansMap = new Map(db.getPlans().map((p) => [p.id, p]));

  let csv = 'ID,Date,Phone,Carrier,Amount (TZS),Plan,Status,External Reference,MNO Transaction ID\n';
  txs.forEach((t) => {
    const plan = plansMap.get(t.plan_id);
    csv += `"${t.id}","${t.created_at}","${t.phone_number}","${t.network_provider}",${t.amount},"${plan?.name || ''}","${t.status}","${t.external_reference}","${t.transaction_id || ''}"\n`;
  });

  res.setHeader('Content-Disposition', 'attachment; filename="tzwifi_transactions.csv"');
  res.setHeader('Content-Type', 'text/csv');
  res.send(csv);
});

// CSV Export for vouchers
apiRouter.get('/export/vouchers/csv', (_req: Request, res: Response) => {
  const vouchers = db.getVouchers();
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
  const preset = req.query.preset as any;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  const metrics = db.getRevenueMetrics(ownerId, { preset, startDate, endDate });
  res.json(metrics);
});

apiRouter.get('/system/schema', (_req: Request, res: Response) => {
  const schemaSQL = db.getSchemaSQL();
  res.type('text/plain').send(schemaSQL);
});

apiRouter.get('/system/audit-logs', (_req: Request, res: Response) => {
  res.json(db.getAuditLogs());
});

// System Data Summary for Live Launch preparation
apiRouter.get('/system/data-summary', (_req: Request, res: Response) => {
  res.json(db.getDataSummary());
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


