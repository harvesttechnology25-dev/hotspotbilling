import express, { Request, Response } from 'express';
import { PaymentGatewayService, DaliPayCredentials } from './paymentGateway.js';
import { db } from './db.js';

export const apiRouter = express.Router();

apiRouter.get('/owners', (_req: Request, res: Response) => {
  res.json(db.getOwners());
});

apiRouter.get('/routers', (req: Request, res: Response) => {
  let list = db.getRouters();
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  if (ownerId) {
    list = list.filter((r: any) => r.owner_id === ownerId);
  }
  res.json(list);
});

apiRouter.get('/settings', (_req: Request, res: Response) => {
  res.json(db.getSettings());
});


// 1. ENDPOINT YA ADMIN: Kusave API Keys za Mfumo Mkuu (Admin Subscription)
apiRouter.post('/admin/settings/dalipay', (req: Request, res: Response) => {
  const { publicKey, secretKey, apiEndpoint, isSandbox } = req.body;

  const settings = db.getSettings();
  if (!settings.dalipay) settings.dalipay = {};

  settings.activeGateway = "DALIPAY";
  settings.dalipay = {
    publicKey: (publicKey || '').trim(),
    secretKey: (secretKey || '').trim(),
    apiEndpoint: apiEndpoint || 'https://app.dalipay.co.tz',
    isSandbox: Boolean(isSandbox)
  };

  db.saveSettings(settings);
  return res.json({ success: true, message: "Mipangilio ya Admin DaliPay imehifadhiwa.", data: settings.dalipay });
});

// 2. ENDPOINT YA HOTSPOT OWNER: Kusave API Keys za Mmiliki wa Router
apiRouter.post('/owner/:ownerId/dalipay', (req: Request, res: Response) => {
  const { ownerId } = req.params;
  const { publicKey, secretKey, apiEndpoint } = req.body;

  const owner = db.getOwnerById(Number(ownerId));
  if (!owner) {
    return res.status(404).json({ success: false, message: "Hotspot Owner hakupatikana." });
  }

  owner.dalipay_public_key = (publicKey || '').trim();
  owner.dalipay_secret_key = (secretKey || '').trim();
  owner.dalipay_api_endpoint = apiEndpoint || 'https://app.dalipay.co.tz';

  db.saveOwner(owner);
  return res.json({ success: true, message: "Mipangilio ya malipo ya mmiliki imehifadhiwa kikamilifu.", owner });
});

// 3. TIER 1: SUBSCRIPTION YA OWNER KWENDA KWA ADMIN
apiRouter.post('/subscription/pay', async (req: Request, res: Response) => {
  const { ownerId, months, phoneNumber } = req.body;

  const owner = db.getOwnerById(Number(ownerId));
  if (!owner) return res.status(404).json({ message: "Owner hayupo." });

  const settings = db.getSettings();
  const adminCreds: DaliPayCredentials = {
    publicKey: settings.dalipay?.publicKey || '',
    secretKey: settings.dalipay?.secretKey || '',
    apiEndpoint: settings.dalipay?.apiEndpoint
  };

  if (!adminCreds.publicKey || !adminCreds.secretKey) {
    return res.status(400).json({ message: "Admin hajasajili API keys za kupokea subscription." });
  }

  const monthlyRate = 25000;
  const totalAmount = monthlyRate * (Number(months) || 1);
  const reference = `SUB-${ownerId}-${Date.now()}`;

  try {
    const response = await PaymentGatewayService.initiateDaliPayPush(adminCreds, {
      amount: totalAmount,
      phoneNumber,
      reference,
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/callbacks/subscription`,
      customerName: `Subscription: ${owner.business_name || owner.name}`
    });

    return res.json({ success: true, message: "Ombi la malipo ya subscription limetumwa kwenye simu.", data: response });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. TIER 2: MTEJA WA KAWAIDA KUNUNUA VOCHA (INAPENDA KWENYE ACCOUNT YA OWNER)
apiRouter.post('/payments/initiate', async (req: Request, res: Response) => {
  const { routerId, packageId, phoneNumber, macAddress, amount } = req.body;

  // Tafuta router na mmiliki wake
  const router = db.getRouterById(Number(routerId));
  const ownerId = router?.owner_id || req.body.ownerId;
  const owner = ownerId ? db.getOwnerById(Number(ownerId)) : undefined;

  // Kagua kama owner ana API keys zake
  let targetCreds: DaliPayCredentials;

  if (owner && owner.dalipay_public_key && owner.dalipay_secret_key) {
    // Inapeleka pesa moja kwa moja kwa Owner
    targetCreds = {
      publicKey: owner.dalipay_public_key,
      secretKey: owner.dalipay_secret_key,
      apiEndpoint: owner.dalipay_api_endpoint || 'https://app.dalipay.co.tz'
    };
  } else {
    return res.status(400).json({ 
      success: false, 
      message: "Mmiliki wa mtandao huu hajaweka mfumo wa malipo bado. Wasiliana na msimamizi." 
    });
  }

  const pkg = db.getPlanById(Number(packageId));
  const finalAmount = pkg ? pkg.price : Number(amount);
  const reference = `VOUCH-${Date.now()}`;

  try {
    const result = await PaymentGatewayService.initiateDaliPayPush(targetCreds, {
      amount: finalAmount,
      phoneNumber,
      reference,
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/callbacks/voucher?ownerId=${owner.id}`,
      customerName: `WiFi Voucher (${pkg?.name || 'Package'})`
    });

    return res.json({ success: true, message: "Push imetumwa kwenye simu ya mteja.", data: result, reference });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});
