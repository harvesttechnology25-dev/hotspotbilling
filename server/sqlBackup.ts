import fs from 'fs';
import path from 'path';
import { db } from './db.js';

function escapeSql(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 'NULL' : String(val);
  }
  if (typeof val === 'boolean') {
    return val ? '1' : '0';
  }
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val);
    const escaped = jsonStr
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "''")
      .replace(/\0/g, '\\0');
    return `'${escaped}'`;
  }
  const str = String(val);
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `'${escaped}'`;
}

/**
 * Generates a complete, production-ready SQL dump file (.sql)
 * containing both the DDL schema and all stored table records.
 * Perfect for backup before system updates, VPS migration, or restoring.
 */
export function generateFullDatabaseSQL(): string {
  const now = new Date();
  const timestampStr = now.toISOString().replace('T', ' ').slice(0, 19);

  // Read base schema DDL (DDL CREATE TABLE statements only, without static seed inserts)
  let schemaDDL = '';
  try {
    const schemaPath = path.resolve(process.cwd(), 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const fullSchema = fs.readFileSync(schemaPath, 'utf8');
      const seedMarker = fullSchema.indexOf('-- SEED DATA:');
      schemaDDL = seedMarker !== -1 ? fullSchema.slice(0, seedMarker).trim() : fullSchema.trim();
    }
  } catch {
    schemaDDL = '-- schema.sql missing';
  }

  const owners = db.getOwners();
  const routers = db.getRouters();
  const plans = db.getPlans();
  const vouchers = db.getVouchers();
  const voucherBatches = db.getVoucherBatches();
  const transactions = db.getTransactions();
  const auditLogs = db.getAuditLogs();
  const freeTrialClaims = db.getAllFreeTrialClaims();
  const freeTrialConfig = db.getFreeTrialConfig();
  const companyInfo = db.getCompanyInfo();
  const settings = db.getSettings();
  const radcheck = db.getRadCheckList();
  const radreply = db.getRadReplyList();
  const nasList = db.getNasList();

  const totalRecords =
    owners.length +
    routers.length +
    plans.length +
    vouchers.length +
    voucherBatches.length +
    transactions.length +
    auditLogs.length +
    freeTrialClaims.length +
    radcheck.length +
    radreply.length +
    nasList.length +
    3; // system_settings keys

  const lines: string[] = [];

  // 1. Header Information & MySQL Compatibility Setup
  lines.push(`-- =============================================================================`);
  lines.push(`-- Multi-Carrier Hotspot Wi-Fi Billing & Multi-Vendor AAA System`);
  lines.push(`-- DATABASE SQL BACKUP DUMP (KWA AJILI YA KU-UPDATE NA KUREJESHA MFUMO)`);
  lines.push(`-- =============================================================================`);
  lines.push(`-- Tarehe ya Backup   : ${timestampStr} UTC`);
  lines.push(`-- Toleo la Mfumo     : Tz-WiFi Enterprise v2026.10`);
  lines.push(`-- Database Lengwa    : hotspot_billing (MySQL 8.0+ / MariaDB 10.5+)`);
  lines.push(`-- Jumla ya Rekodi    : ${totalRecords} zilizojumuishwa`);
  lines.push(`-- =============================================================================`);
  lines.push(`-- MAELEKEZO YA MATUMIZI PINDI UNAPOTAKA KU-UPDATE MFUMO:`);
  lines.push(`-- 1. Hifadhi faili hili la .sql kabla ya ku-update mfumo kwenye VPS au server.`);
  lines.push(`-- 2. Ili kurejesha (restore) data zote kwenye MySQL ya VPS, endesha amri hii:`);
  lines.push(`--    mysql -u root -p hotspot_billing < tz_wifi_backup_${now.toISOString().slice(0, 10)}.sql`);
  lines.push(`-- 3. Au ingiza kwenye phpMyAdmin / DBeaver / HeidiSQL kwa kubonyeza 'Import'.`);
  lines.push(`-- =============================================================================\n`);

  lines.push(`/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;`);
  lines.push(`/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;`);
  lines.push(`/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;`);
  lines.push(`/*!50503 SET NAMES utf8mb4 */;`);
  lines.push(`/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;`);
  lines.push(`/*!40103 SET TIME_ZONE='+03:00' */;`);
  lines.push(`/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;`);
  lines.push(`/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;`);
  lines.push(`/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;`);
  lines.push(`/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;\n`);

  lines.push(`CREATE DATABASE /*!32312 IF NOT EXISTS*/ \`hotspot_billing\` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;\nUSE \`hotspot_billing\`;\n`);

  // 2. Schema DDL Tables
  lines.push(`-- -----------------------------------------------------------------------------`);
  lines.push(`-- MUUNDO WA TABLES (SCHEMA DDL DEFINITION)`);
  lines.push(`-- -----------------------------------------------------------------------------\n`);
  lines.push(schemaDDL.trim());
  lines.push(`\n-- -----------------------------------------------------------------------------`);
  lines.push(`-- DATA HALISI ZILIZOHIFADHIWA KWENYE MFUMO (TABLE DATA DUMP)`);
  lines.push(`-- -----------------------------------------------------------------------------\n`);

  // Helper to chunk inserts
  function appendTableInserts(
    tableName: string,
    columns: string[],
    rows: any[][],
    comment: string
  ) {
    lines.push(`-- Table: \`${tableName}\` (${rows.length} records) - ${comment}`);
    if (rows.length === 0) {
      lines.push(`-- Hakuna rekodi kwa sasa.\n`);
      return;
    }
    lines.push(`LOCK TABLES \`${tableName}\` WRITE;`);
    lines.push(`/*!40000 ALTER TABLE \`${tableName}\` DISABLE KEYS */;`);

    const colList = columns.map((c) => `\`${c}\``).join(', ');
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const valuesSql = batch
        .map((row) => `(${row.map((val) => escapeSql(val)).join(', ')})`)
        .join(',\n  ');
      lines.push(`INSERT INTO \`${tableName}\` (${colList}) VALUES\n  ${valuesSql}\nON DUPLICATE KEY UPDATE \`updated_at\`=VALUES(\`updated_at\`);`);
    }

    lines.push(`/*!40000 ALTER TABLE \`${tableName}\` ENABLE KEYS */;`);
    lines.push(`UNLOCK TABLES;\n`);
  }

  // 1. hotspot_owners
  const ownerCols = [
    'id', 'name', 'business_name', 'email', 'phone', 'password_hash',
    'role', 'status', 'commission_rate', 'monthly_fee', 'subscription_status',
    'subscription_expires_at', 'subscription_fee', 'vendor_merchant_id',
    'payout_channel', 'wallet_account_number', 'parent_owner_id', 'is_sub_user',
    'staff_title', 'privileges_json', 'palmpesa_user_id', 'palmpesa_user_ref',
    'palmpesa_api_token', 'palmpesa_accept_stk', 'dalipay_api_endpoint',
    'dalipay_key_id', 'dalipay_public_key', 'dalipay_secret_key',
    'dalipay_webhook_secret', 'portal_theme_json', 'created_at', 'updated_at'
  ];
  const ownerRows = owners.map((o) => [
    o.id,
    o.name,
    o.business_name,
    o.email,
    o.phone,
    (o as any).password_hash || o.password || null,
    o.role,
    o.status,
    o.commission_rate ?? 5.0,
    o.monthly_fee ?? 0.0,
    o.subscription_status ?? 'ACTIVE',
    o.subscription_expires_at || null,
    o.subscription_fee ?? 0.0,
    o.vendor_merchant_id || null,
    o.payout_channel || 'PALMPESA',
    o.wallet_account_number || null,
    o.parent_owner_id || null,
    o.is_sub_user ? 1 : 0,
    o.staff_title || null,
    (o as any).privileges_json || o.privileges || null,
    o.palmpesa_user_id || null,
    o.palmpesa_user_ref || null,
    o.palmpesa_api_token || null,
    o.palmpesa_accept_stk ? 1 : 0,
    o.dalipay_api_endpoint || null,
    o.dalipay_key_id || null,
    o.dalipay_public_key || null,
    o.dalipay_secret_key || null,
    o.dalipay_webhook_secret || null,
    (o as any).portal_theme_json || o.portal_theme || null,
    o.created_at || timestampStr,
    o.updated_at || timestampStr
  ]);
  appendTableInserts('hotspot_owners', ownerCols, ownerRows, 'Wamiliki wa Hotspot & Msimamizi Mkuu');

  // 2. routers
  const routerCols = [
    'id', 'name', 'device_type', 'model_name', 'nas_identifier', 'brand_name',
    'ssid', 'ip_address', 'vpn_assigned_ip', 'api_port', 'api_username',
    'api_password_hash', 'radius_secret', 'location', 'hotspot_server_name',
    'dns_name', 'status', 'owner_id', 'vendor_name', 'vendor_merchant_id',
    'vendor_api_key_encrypted', 'platform_commission_percent',
    'wallet_account_number', 'payout_channel', 'palmpesa_user_id',
    'palmpesa_user_ref', 'palmpesa_api_token', 'palmpesa_accept_stk',
    'portal_theme_json', 'last_seen_at', 'created_at', 'updated_at'
  ];
  const routerRows = routers.map((r) => [
    r.id,
    r.name,
    r.device_type || 'MIKROTIK',
    r.model_name || null,
    r.nas_identifier || null,
    r.brand_name || null,
    r.ssid || 'Hotspot WiFi',
    r.ip_address,
    r.vpn_assigned_ip || '100.108.0.2',
    r.api_port || 8728,
    r.api_username || 'admin',
    r.api_password_hash || '',
    r.radius_secret || 'radius_secret_2026',
    r.location || null,
    r.hotspot_server_name || 'hotspot1',
    r.dns_name || 'wifi.hotspot.lan',
    r.status || 'ONLINE',
    r.owner_id || null,
    r.vendor_name || null,
    r.vendor_merchant_id || null,
    r.vendor_api_key_encrypted || null,
    r.platform_commission_percent ?? 5.0,
    r.wallet_account_number || null,
    r.payout_channel || 'PALMPESA',
    r.palmpesa_user_id || null,
    r.palmpesa_user_ref || null,
    r.palmpesa_api_token || null,
    r.palmpesa_accept_stk ? 1 : 0,
    (r as any).portal_theme_json || (r as any).portal_theme || null,
    r.last_seen_at || null,
    r.created_at || timestampStr,
    r.updated_at || timestampStr
  ]);
  appendTableInserts('routers', routerCols, routerRows, 'Vifaa vya MikroTik, Ruijie, Omada & APs');

  // 3. plans
  const planCols = [
    'id', 'name', 'type', 'limit_uptime', 'limit_bytes_total', 'rate_limit',
    'price', 'validity_period', 'shared_users', 'is_active', 'description_sw',
    'description_en', 'created_at', 'updated_at'
  ];
  const planRows = plans.map((p) => [
    p.id,
    p.name,
    p.type || 'TIME_BASED',
    p.limit_uptime || 3600,
    p.limit_bytes_total || null,
    p.rate_limit || '2M/5M',
    p.price,
    p.validity_period || 86400,
    p.shared_users ?? 1,
    p.is_active ? 1 : 0,
    p.description_sw || null,
    p.description_en || null,
    p.created_at || timestampStr,
    p.updated_at || timestampStr
  ]);
  appendTableInserts('plans', planCols, planRows, 'Vifurushi vya Internet & Bei');

  // 4. transactions
  const txCols = [
    'id', 'phone_number', 'network_provider', 'amount', 'external_reference',
    'transaction_id', 'status', 'plan_id', 'router_id', 'owner_id',
    'mac_address', 'user_ip', 'gateway_provider', 'failure_reason',
    'created_at', 'updated_at'
  ];
  const txRows = transactions.map((t) => [
    t.id,
    t.phone_number,
    t.network_provider,
    t.amount,
    t.external_reference,
    t.transaction_id || null,
    t.status,
    t.plan_id,
    t.router_id || null,
    t.owner_id || null,
    t.mac_address || null,
    t.user_ip || null,
    t.gateway_provider || 'PALMPESA',
    t.failure_reason || null,
    t.created_at || timestampStr,
    t.updated_at || timestampStr
  ]);
  appendTableInserts('transactions', txCols, txRows, 'Miamala ya Malipo ya Simu (M-Pesa, Tigo, n.k.)');

  // 5. vouchers
  const voucherCols = [
    'id', 'code', 'password', 'plan_id', 'router_id', 'owner_id',
    'transaction_id', 'mac_address', 'status', 'batch_tag',
    'activated_at', 'expires_at', 'created_at', 'updated_at'
  ];
  const voucherRows = vouchers.map((v) => [
    v.id,
    v.code,
    v.password,
    v.plan_id,
    v.router_id || null,
    v.owner_id || null,
    v.transaction_id || null,
    v.mac_address || null,
    v.status || 'AVAILABLE',
    v.batch_tag || null,
    v.activated_at || null,
    v.expires_at || null,
    v.created_at || timestampStr,
    v.updated_at || timestampStr
  ]);
  appendTableInserts('vouchers', voucherCols, voucherRows, 'Vocha & Nambari za PIN za Hotspot');

  // 6. voucher_batches
  const batchCols = [
    'id', 'batch_id', 'plan_id', 'router_id', 'owner_id', 'quantity',
    'prefix', 'code_length', 'print_format', 'created_at'
  ];
  const batchRows = voucherBatches.map((b) => [
    b.id,
    b.batch_id,
    b.plan_id,
    b.router_id || null,
    b.owner_id || null,
    b.quantity,
    b.prefix || 'TZ',
    b.code_length || 6,
    b.print_format || 'A4_GRID',
    b.created_at || timestampStr
  ]);
  appendTableInserts('voucher_batches', batchCols, batchRows, 'Makundi ya Vocha za Kuchapisha (Batches)');

  // 7. free_trial_claims
  const trialCols = [
    'id', 'mac_address', 'user_ip', 'router_id', 'owner_id', 'voucher_code',
    'duration_seconds', 'rate_limit', 'claimed_at', 'expires_at'
  ];
  const trialRows = freeTrialClaims.map((tc, idx) => [
    idx + 1,
    tc.mac_address,
    tc.user_ip || null,
    tc.router_id || null,
    tc.owner_id || null,
    tc.voucher_code,
    tc.duration_seconds || 900,
    tc.rate_limit || '2M/4M',
    tc.claimed_at || timestampStr,
    tc.expires_at || timestampStr
  ]);
  appendTableInserts('free_trial_claims', trialCols, trialRows, 'Watumiaji Waliodai Free Trial (Permanent Lock)');

  // 8. transaction_audit_logs
  const auditCols = [
    'id', 'transaction_id', 'external_reference', 'event_type', 'payload_json',
    'signature_header', 'ip_address', 'created_at'
  ];
  const auditRows = auditLogs.map((a) => [
    a.id,
    a.transaction_id || null,
    a.external_reference,
    a.event_type,
    a.payload_json || {},
    a.signature_header || null,
    a.ip_address || null,
    a.created_at || timestampStr
  ]);
  appendTableInserts('transaction_audit_logs', auditCols, auditRows, 'Kumbukumbu za Webhook & Malipo (Audit)');

  // 9. system_settings
  const settingsCols = ['id', 'setting_key', 'setting_value', 'description', 'updated_at'];
  const settingsRows = [
    [1, 'gateway_settings', settings, 'Payment Gateways & API Credentials', timestampStr],
    [2, 'company_info', companyInfo, 'Company Profile, Contacts & Social Media', timestampStr],
    [3, 'free_trial_config', freeTrialConfig, 'Free Trial Duration & Bandwidth Policy', timestampStr],
  ];
  appendTableInserts('system_settings', settingsCols, settingsRows, 'Mipangilio ya Mfumo & Mawasiliano');

  // 10. radcheck (FreeRADIUS)
  const radcheckCols = ['id', 'username', 'attribute', 'op', 'value'];
  const radcheckRows = radcheck.map((rc, idx) => [
    rc.id || idx + 1,
    rc.username,
    rc.attribute,
    rc.op || '==',
    rc.value
  ]);
  appendTableInserts('radcheck', radcheckCols, radcheckRows, 'FreeRADIUS AAA Auth Records (radcheck)');

  // 11. radreply (FreeRADIUS)
  const radreplyCols = ['id', 'username', 'attribute', 'op', 'value'];
  const radreplyRows = radreply.map((rr, idx) => [
    rr.id || idx + 1,
    rr.username,
    rr.attribute,
    rr.op || ':=',
    rr.value
  ]);
  appendTableInserts('radreply', radreplyCols, radreplyRows, 'FreeRADIUS AAA Rate Limit & Uptime Replies');

  // 12. nas (FreeRADIUS Network Access Servers)
  const nasCols = ['id', 'nasname', 'shortname', 'type', 'secret', 'description'];
  const nasRows = nasList.map((n, idx) => [
    n.id || idx + 1,
    n.nasname,
    n.shortname,
    n.type || 'other',
    n.secret,
    n.description || 'Access Point'
  ]);
  appendTableInserts('nas', nasCols, nasRows, 'FreeRADIUS NAS Clients (Access Points / MikroTik)');

  // 3. Footer restoration
  lines.push(`-- -----------------------------------------------------------------------------`);
  lines.push(`-- MWISHO WA DATA DUMP`);
  lines.push(`-- -----------------------------------------------------------------------------\n`);
  lines.push(`/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;`);
  lines.push(`/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;`);
  lines.push(`/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;`);
  lines.push(`/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;`);
  lines.push(`/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;`);
  lines.push(`/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;`);
  lines.push(`/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;`);
  lines.push(`/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;`);
  lines.push(`\n-- DUMP IMEKAMILIKA KWA MAFANIKIO KWA TAREHE ${timestampStr} UTC --`);

  return lines.join('\n');
}

/**
 * Parses SQL statements (INSERT INTO) from an uploaded SQL dump file
 * and converts them into structured tables for restoration into the database.
 */
export function parseSQLDumpToSnapshot(sqlText: string): {
  owners?: any[];
  routers?: any[];
  plans?: any[];
  transactions?: any[];
  vouchers?: any[];
  voucherBatches?: any[];
  radcheck?: any[];
  radreply?: any[];
  nasList?: any[];
  auditLogs?: any[];
  freeTrialClaims?: any[];
  freeTrialConfig?: any;
  companyInfo?: any;
  settings?: any;
} {
  const tableData: Record<string, any[]> = {};

  const insertRegex = /INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?)(?:ON\s+DUPLICATE|;|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = insertRegex.exec(sqlText)) !== null) {
    const tableName = match[1].toLowerCase();
    const colNames = match[2].split(',').map((c) => c.trim().replace(/^`|`$/g, ''));
    const valuesBody = match[3].trim();

    if (!tableData[tableName]) tableData[tableName] = [];

    let i = 0;
    while (i < valuesBody.length) {
      while (i < valuesBody.length && /\s/.test(valuesBody[i])) i++;
      if (i >= valuesBody.length) break;

      if (valuesBody[i] === '(') {
        i++; // skip '('
        const rowObj: Record<string, any> = {};
        let colIdx = 0;

        while (i < valuesBody.length && valuesBody[i] !== ')') {
          while (i < valuesBody.length && /\s/.test(valuesBody[i])) i++;
          if (i >= valuesBody.length || valuesBody[i] === ')') break;

          let parsedVal: any = null;
          if (valuesBody[i] === "'") {
            i++; // skip open quote
            let strVal = '';
            while (i < valuesBody.length) {
              if (valuesBody[i] === '\\' && i + 1 < valuesBody.length) {
                const nextChar = valuesBody[i + 1];
                if (nextChar === 'n') strVal += '\n';
                else if (nextChar === 'r') strVal += '\r';
                else if (nextChar === 't') strVal += '\t';
                else if (nextChar === '\\') strVal += '\\';
                else if (nextChar === "'") strVal += "'";
                else strVal += nextChar;
                i += 2;
              } else if (valuesBody[i] === "'") {
                if (i + 1 < valuesBody.length && valuesBody[i + 1] === "'") {
                  strVal += "'";
                  i += 2;
                } else {
                  i++; // end of string
                  break;
                }
              } else {
                strVal += valuesBody[i];
                i++;
              }
            }
            parsedVal = strVal;
          } else {
            let token = '';
            while (i < valuesBody.length && valuesBody[i] !== ',' && valuesBody[i] !== ')') {
              token += valuesBody[i];
              i++;
            }
            token = token.trim();
            if (token.toUpperCase() === 'NULL' || token === '') {
              parsedVal = null;
            } else if (token === '1') {
              parsedVal = 1;
            } else if (token === '0') {
              parsedVal = 0;
            } else if (!isNaN(Number(token))) {
              parsedVal = Number(token);
            } else {
              parsedVal = token;
            }
          }

          if (colIdx < colNames.length) {
            rowObj[colNames[colIdx]] = parsedVal;
          }
          colIdx++;

          while (i < valuesBody.length && /\s/.test(valuesBody[i])) i++;
          if (valuesBody[i] === ',') i++;
        }

        if (valuesBody[i] === ')') i++;
        tableData[tableName].push(rowObj);

        while (i < valuesBody.length && (/\s/.test(valuesBody[i]) || valuesBody[i] === ',')) i++;
      } else {
        i++;
      }
    }
  }

  const snapshot: any = {};

  // 1. hotspot_owners
  if (tableData['hotspot_owners'] && tableData['hotspot_owners'].length > 0) {
    snapshot.owners = tableData['hotspot_owners'].map((o: any) => {
      let theme = o.portal_theme_json;
      if (typeof theme === 'string') {
        try { theme = JSON.parse(theme); } catch {}
      }
      let privs = o.privileges_json;
      if (typeof privs === 'string') {
        try { privs = JSON.parse(privs); } catch {}
      }
      return {
        ...o,
        portal_theme: theme,
        privileges: privs,
        is_sub_user: Boolean(o.is_sub_user),
        palmpesa_accept_stk: Boolean(o.palmpesa_accept_stk),
      };
    });
  }

  // 2. routers
  if (tableData['routers'] && tableData['routers'].length > 0) {
    snapshot.routers = tableData['routers'].map((r: any) => {
      let theme = r.portal_theme_json;
      if (typeof theme === 'string') {
        try { theme = JSON.parse(theme); } catch {}
      }
      return {
        ...r,
        portal_theme: theme,
        palmpesa_accept_stk: Boolean(r.palmpesa_accept_stk),
      };
    });
  }

  // 3. plans
  if (tableData['plans'] && tableData['plans'].length > 0) {
    snapshot.plans = tableData['plans'].map((p: any) => ({
      ...p,
      is_active: Boolean(p.is_active),
    }));
  }

  // 4. transactions
  if (tableData['transactions'] && tableData['transactions'].length > 0) {
    snapshot.transactions = tableData['transactions'];
  }

  // 5. vouchers
  if (tableData['vouchers'] && tableData['vouchers'].length > 0) {
    snapshot.vouchers = tableData['vouchers'];
  }

  // 6. voucher_batches
  if (tableData['voucher_batches'] && tableData['voucher_batches'].length > 0) {
    snapshot.voucherBatches = tableData['voucher_batches'];
  }

  // 7. free_trial_claims
  if (tableData['free_trial_claims'] && tableData['free_trial_claims'].length > 0) {
    snapshot.freeTrialClaims = tableData['free_trial_claims'];
  }

  // 8. transaction_audit_logs
  if (tableData['transaction_audit_logs'] && tableData['transaction_audit_logs'].length > 0) {
    snapshot.auditLogs = tableData['transaction_audit_logs'].map((a: any) => {
      let payload = a.payload_json;
      if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch {}
      }
      return { ...a, payload_json: payload };
    });
  }

  // 9. radcheck
  if (tableData['radcheck'] && tableData['radcheck'].length > 0) {
    snapshot.radcheck = tableData['radcheck'];
  }

  // 10. radreply
  if (tableData['radreply'] && tableData['radreply'].length > 0) {
    snapshot.radreply = tableData['radreply'];
  }

  // 11. nas
  if (tableData['nas'] && tableData['nas'].length > 0) {
    snapshot.nasList = tableData['nas'];
  }

  // 12. system_settings
  if (tableData['system_settings'] && tableData['system_settings'].length > 0) {
    for (const s of tableData['system_settings']) {
      let val = s.setting_value;
      if (typeof val === 'string') {
        try { val = JSON.parse(val); } catch {}
      }
      if (s.setting_key === 'gateway_settings') {
        snapshot.settings = val;
      } else if (s.setting_key === 'company_info') {
        snapshot.companyInfo = val;
      } else if (s.setting_key === 'free_trial_config') {
        snapshot.freeTrialConfig = val;
      }
    }
  }

  return snapshot;
}
