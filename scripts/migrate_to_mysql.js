/**
 * TZ-WiFi Billing System - MySQL Database Migration & Sync Tool
 * Migrates existing data from data/database.json into MySQL 8.0+ / MariaDB
 * Targets: hotspot_billing (schema.sql)
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_FILE = path.resolve(process.cwd(), 'data/database.json');
const SCHEMA_FILE = path.resolve(process.cwd(), 'schema.sql');

// Load environment variables or defaults
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'hotspot_user',
  password: process.env.MYSQL_PASSWORD || 'TzWifiSecure2026!',
  database: process.env.MYSQL_DATABASE || 'hotspot_billing',
  port: Number(process.env.MYSQL_PORT) || 3306,
  multipleStatements: true,
};

async function runMigration() {
  console.log('=====================================================');
  console.log('TZ-WIFI BILLING: MYSQL DATABASE MIGRATION SYSTEM');
  console.log('=====================================================');
  console.log(`Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}...`);

  let connection;
  try {
    // 1. First test root/basic connection to ensure database exists
    const adminConfig = { ...dbConfig };
    delete adminConfig.database;

    try {
      const initConn = await mysql.createConnection(adminConfig);
      await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await initConn.end();
      console.log(`✓ Database '${dbConfig.database}' verified/created successfully.`);
    } catch (e) {
      console.log(`(Notice: Skipping CREATE DATABASE, connecting directly to '${dbConfig.database}')`);
    }

    // 2. Connect to the target database
    connection = await mysql.createConnection(dbConfig);
    console.log(`✓ Connected to MySQL database '${dbConfig.database}' successfully!`);

    // 3. Apply schema.sql if present
    if (fs.existsSync(SCHEMA_FILE)) {
      console.log(`Applying schema structure from ${SCHEMA_FILE}...`);
      const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
      await connection.query(schemaSql);
      console.log(`✓ MySQL schema and tables created/verified successfully!`);
    } else {
      console.warn(`! schema.sql not found at ${SCHEMA_FILE}, continuing with existing tables.`);
    }

    // 4. Read database.json
    if (!fs.existsSync(DB_FILE)) {
      console.log(`! No database.json found at ${DB_FILE}. Migration completed.`);
      await connection.end();
      return;
    }

    const jsonRaw = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(jsonRaw);

    console.log('\n--- Migrating Data from database.json into MySQL ---');

    // A. Migrate Owners
    if (Array.isArray(data.owners) && data.owners.length > 0) {
      console.log(`Migrating ${data.owners.length} Hotspot Owners...`);
      for (const o of data.owners) {
        await connection.query(
          `INSERT INTO hotspot_owners (
            id, name, business_name, email, phone, role, status,
            commission_rate, monthly_fee, subscription_status,
            subscription_expires_at, dalipay_key_id, dalipay_public_key,
            dalipay_secret_key, dalipay_webhook_secret, portal_theme_json,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name=VALUES(name), business_name=VALUES(business_name),
            email=VALUES(email), phone=VALUES(phone), role=VALUES(role),
            status=VALUES(status), dalipay_key_id=VALUES(dalipay_key_id),
            dalipay_public_key=VALUES(dalipay_public_key),
            dalipay_secret_key=VALUES(dalipay_secret_key),
            dalipay_webhook_secret=VALUES(dalipay_webhook_secret),
            updated_at=NOW()`,
          [
            o.id,
            o.name || 'Owner',
            o.business_name || 'WiFi Spot',
            o.email || `owner_${o.id}@tzwifi.local`,
            o.phone || '255700000000',
            o.role || 'HOTSPOT_OWNER',
            o.status || 'ACTIVE',
            o.commission_rate || 5.0,
            o.monthly_fee || 0,
            o.subscription_status || 'ACTIVE',
            o.subscription_expires_at ? new Date(o.subscription_expires_at) : null,
            o.dalipay_key_id || null,
            o.dalipay_public_key || null,
            o.dalipay_secret_key || null,
            o.dalipay_webhook_secret || null,
            o.portalTheme ? JSON.stringify(o.portalTheme) : null,
            o.created_at ? new Date(o.created_at) : new Date(),
            o.updated_at ? new Date(o.updated_at) : new Date(),
          ]
        );
      }
      console.log(`✓ Owners migrated: ${data.owners.length}`);
    }

    // B. Migrate Routers
    if (Array.isArray(data.routers) && data.routers.length > 0) {
      console.log(`Migrating ${data.routers.length} Routers / APs...`);
      for (const r of data.routers) {
        await connection.query(
          `INSERT INTO routers (
            id, name, ip_address, mac_address, router_type,
            device_type, owner_id, status, is_online, location,
            ssid, radius_secret, api_port, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name=VALUES(name), ip_address=VALUES(ip_address),
            owner_id=VALUES(owner_id), status=VALUES(status),
            is_online=VALUES(is_online), location=VALUES(location),
            ssid=VALUES(ssid), radius_secret=VALUES(radius_secret),
            updated_at=NOW()`,
          [
            r.id,
            r.name || 'MikroTik Gateway',
            r.ip_address || '192.168.88.1',
            r.mac_address || null,
            r.router_type || 'MIKROTIK',
            r.device_type || 'mikrotik_standard',
            r.owner_id || 1,
            r.status || 'ACTIVE',
            r.is_online ? 1 : 0,
            r.location || 'HQ',
            r.ssid || 'TZ-WIFI',
            r.radius_secret || 'radius_secret_2026',
            r.api_port || 8728,
            r.created_at ? new Date(r.created_at) : new Date(),
            r.updated_at ? new Date(r.updated_at) : new Date(),
          ]
        );
      }
      console.log(`✓ Routers migrated: ${data.routers.length}`);
    }

    // C. Migrate Plans
    if (Array.isArray(data.plans) && data.plans.length > 0) {
      console.log(`Migrating ${data.plans.length} Wi-Fi Plans...`);
      for (const p of data.plans) {
        await connection.query(
          `INSERT INTO plans (
            id, name, price, duration_minutes, duration_label,
            speed_limit, speed_limit_up, speed_limit_down,
            rate_limit_display, is_popular, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name=VALUES(name), price=VALUES(price),
            duration_minutes=VALUES(duration_minutes),
            duration_label=VALUES(duration_label),
            speed_limit_up=VALUES(speed_limit_up),
            speed_limit_down=VALUES(speed_limit_down),
            rate_limit_display=VALUES(rate_limit_display),
            is_popular=VALUES(is_popular), is_active=VALUES(is_active)`,
          [
            p.id,
            p.name,
            p.price,
            p.duration_minutes || 60,
            p.duration_label || `${p.duration_minutes || 60} Mins`,
            p.speed_limit || '5M/5M',
            p.speed_limit_up || '5M',
            p.speed_limit_down || '5M',
            p.rate_limit_display || p.speed_limit || '5 Mbps',
            p.is_popular ? 1 : 0,
            p.is_active !== false ? 1 : 0,
            p.created_at ? new Date(p.created_at) : new Date(),
          ]
        );
      }
      console.log(`✓ Plans migrated: ${data.plans.length}`);
    }

    // D. Migrate FreeRADIUS Tables: radcheck & radreply
    if (Array.isArray(data.radcheck) && data.radcheck.length > 0) {
      console.log(`Migrating ${data.radcheck.length} FreeRADIUS radcheck records...`);
      for (const rc of data.radcheck) {
        await connection.query(
          `INSERT IGNORE INTO radcheck (id, username, attribute, op, value)
           VALUES (?, ?, ?, ?, ?)`,
          [rc.id, rc.username, rc.attribute || 'Cleartext-Password', rc.op || ':=', rc.value]
        );
      }
      console.log(`✓ radcheck records migrated: ${data.radcheck.length}`);
    }

    if (Array.isArray(data.radreply) && data.radreply.length > 0) {
      console.log(`Migrating ${data.radreply.length} FreeRADIUS radreply records...`);
      for (const rr of data.radreply) {
        await connection.query(
          `INSERT IGNORE INTO radreply (id, username, attribute, op, value)
           VALUES (?, ?, ?, ?, ?)`,
          [rr.id, rr.username, rr.attribute, rr.op || '=', rr.value]
        );
      }
      console.log(`✓ radreply records migrated: ${data.radreply.length}`);
    }

    // E. Migrate Vouchers
    if (Array.isArray(data.vouchers) && data.vouchers.length > 0) {
      console.log(`Migrating ${data.vouchers.length} Vouchers...`);
      for (const v of data.vouchers) {
        await connection.query(
          `INSERT IGNORE INTO vouchers (
            id, code, batch_id, plan_id, router_id, owner_id,
            status, duration_minutes, speed_limit, price,
            transaction_id, customer_phone, mac_address,
            created_at, activated_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            v.id,
            v.code,
            v.batch_id || null,
            v.plan_id,
            v.router_id || null,
            v.owner_id || null,
            v.status || 'UNUSED',
            v.duration_minutes || 60,
            v.speed_limit || '5M/5M',
            v.price || 0,
            v.transaction_id || null,
            v.customer_phone || null,
            v.mac_address || null,
            v.created_at ? new Date(v.created_at) : new Date(),
            v.activated_at ? new Date(v.activated_at) : null,
            v.expires_at ? new Date(v.expires_at) : null,
          ]
        );
      }
      console.log(`✓ Vouchers migrated: ${data.vouchers.length}`);
    }

    // F. Migrate Transactions
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      console.log(`Migrating ${data.transactions.length} Payment Transactions...`);
      for (const t of data.transactions) {
        await connection.query(
          `INSERT IGNORE INTO transactions (
            id, reference, external_reference, plan_id, router_id,
            owner_id, customer_phone, network_provider, amount,
            status, payment_gateway, gateway_response, created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            t.id,
            t.reference,
            t.external_reference || null,
            t.plan_id,
            t.router_id || null,
            t.owner_id || null,
            t.customer_phone,
            t.network_provider || 'VODACOM',
            t.amount,
            t.status || 'SUCCESS',
            t.payment_gateway || 'DALIPAY',
            t.gateway_response ? JSON.stringify(t.gateway_response) : null,
            t.created_at ? new Date(t.created_at) : new Date(),
            t.completed_at ? new Date(t.completed_at) : null,
          ]
        );
      }
      console.log(`✓ Transactions migrated: ${data.transactions.length}`);
    }

    console.log('\n=====================================================');
    console.log('✓ ALL DATA SUCCESSFULLY MIGRATED TO MYSQL DATABASE!');
    console.log('=====================================================');
  } catch (error) {
    console.error('\n✗ Error during MySQL migration:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
