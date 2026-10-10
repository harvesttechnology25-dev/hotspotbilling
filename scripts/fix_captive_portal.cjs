const fs = require('fs');

console.log('>>> [1/3] Kufunga Router kwa Mmiliki...');
try {
  const dbPath = fs.existsSync('data/database.json') ? 'data/database.json' : 'data/db.json';
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const owners = dbData.owners || [];
  const daliOwner = owners.find(o => o.dalipay_key_id || o.dalipay_public_key) || owners.find(o => o.role === 'HOTSPOT_OWNER');
  
  if (daliOwner) {
    if (dbData.routers && dbData.routers.length > 0) {
      dbData.routers.forEach(r => {
        r.owner_id = daliOwner.id;
        r.owner_name = daliOwner.name + ' (' + (daliOwner.business_name || daliOwner.name) + ')';
      });
      fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
      console.log('✅ Router zimefungwa kwa mmiliki: ' + (daliOwner.business_name || daliOwner.name) + ' (ID: ' + daliOwner.id + ')');
    }
  }
} catch (e) {
  console.log('DB Note:', e.message);
}

console.log('>>> [2/3] Kusanidi PaymentGateway...');
try {
  let g = fs.readFileSync('server/paymentGateway.ts', 'utf8');
  if (g.indexOf('activeDaliOwner') === -1) {
    g = g.replace(
      'let effectiveOwnerId = params.ownerId || router?.owner_id;',
      'let effectiveOwnerId = params.ownerId || router?.owner_id;\n    const allOwners = db.getOwners();\n    const activeDaliOwner = allOwners.find(o => o.dalipay_key_id || o.dalipay_public_key) || allOwners.find(o => o.role === "HOTSPOT_OWNER");\n    if (!effectiveOwnerId && activeDaliOwner) { effectiveOwnerId = activeDaliOwner.id; }\n    if (router && activeDaliOwner && !router.owner_id) { router.owner_id = activeDaliOwner.id; db.saveRouter(router); }'
    );
    fs.writeFileSync('server/paymentGateway.ts', g);
    console.log('✅ paymentGateway.ts: Auto-binding imewashwa!');
  } else {
    console.log('✅ paymentGateway.ts: Tayari imesanidiwa.');
  }
} catch (e) {
  console.log('PaymentGateway Note:', e.message);
}

console.log('>>> [3/3] Kusanidi Captive Portal Info...');
try {
  let r = fs.readFileSync('server/routes.ts', 'utf8');
  if (r.indexOf('portalDaliOwner') === -1) {
    r = r.replace(
      'let owner = (ownerId ? db.getOwnerById(ownerId) : undefined) || (matched?.owner_id ? db.getOwnerById(matched.owner_id) : undefined);',
      'let owner = (ownerId ? db.getOwnerById(ownerId) : undefined) || (matched?.owner_id ? db.getOwnerById(matched.owner_id) : undefined);\n  const portalDaliOwner = owners.find((o) => o.dalipay_public_key || o.dalipay_key_id) || owners.find((o) => o.role === "HOTSPOT_OWNER");\n  if (!owner && portalDaliOwner) { owner = portalDaliOwner; }'
    );
    fs.writeFileSync('server/routes.ts', r);
    console.log('✅ routes.ts: /portal/info inatambua mmiliki!');
  } else {
    console.log('✅ routes.ts: Tayari imesanidiwa.');
  }
} catch (e) {
  console.log('Routes Note:', e.message);
}

console.log('>>> Kazi imekamilika!');
