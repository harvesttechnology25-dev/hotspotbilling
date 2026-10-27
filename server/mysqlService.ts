/**
 * MySQL Database Service for TZ-WiFi Hotspot & FreeRADIUS
 * Handles real-time persistence to MySQL 8.0+ / MariaDB
 */

import mysql from 'mysql2/promise';
import {
  HotspotOwner,
  RouterRecord,
  VoucherRecord,
  TransactionRecord,
  RadCheckRecord,
  RadReplyRecord,
} from './types.js';

class MySQLService {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private host: string = '';
  private user: string = '';
  private databaseName: string = '';
  private portNum: number = 3306;

  constructor() {
    this.initPool();
  }

  private initPool() {
    this.host = process.env.MYSQL_HOST || 'localhost';
    this.user = process.env.MYSQL_USER || 'tzwifi_user';
    const password = process.env.MYSQL_PASSWORD || 'SecureDbPassword2026!';
    this.databaseName = process.env.MYSQL_DATABASE || 'tzwifi_billing';
    this.portNum = Number(process.env.MYSQL_PORT) || 3306;

    try {
      this.pool = mysql.createPool({
        host: this.host,
        user: this.user,
        password,
        database: this.databaseName,
        port: this.portNum,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
        multipleStatements: true,
      });

      // Test connectivity asynchronously and bootstrap tables if needed
      this.testConnection();
    } catch (err) {
      console.warn('[MySQL] Failed to initialize connection pool:', err);
    }
  }

  private async testConnection() {
    if (!this.pool) return;
    try {
      const conn = await this.pool.getConnection();
      await conn.ping();

      // Check if tables exist in the database
      const [rows]: any = await conn.query('SHOW TABLES');
      const tableCount = Array.isArray(rows) ? rows.length : 0;

      if (tableCount === 0) {
        console.log(`[MySQL] Connected to '${this.databaseName}', but 0 tables found. Automatically bootstrapping schema...`);
        await this.bootstrapSchema(conn);
      } else {
        console.log(`✓ [MySQL] Connected to database '${this.databaseName}' in real-time mode (${tableCount} tables ready).`);
      }

      conn.release();
      this.isConnected = true;
    } catch (err: any) {
      this.isConnected = false;
      console.log(`[MySQL] Standby mode (MySQL server not running or credentials not matching: ${err.message})`);
    }
  }

  public async bootstrapSchema(conn?: mysql.PoolConnection): Promise<{ success: boolean; tablesCreated: string[] }> {
    let localConn: mysql.PoolConnection;
    let shouldRelease = false;
    if (!conn) {
      if (!this.pool) throw new Error('MySQL connection pool not initialized.');
      localConn = await this.pool.getConnection();
      shouldRelease = true;
    } else {
      localConn = conn;
    }

    const createdTables: string[] = [];

    try {
      // 1. Table: hotspot_owners
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`hotspot_owners\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL,
          \`business_name\` VARCHAR(150) NOT NULL,
          \`email\` VARCHAR(100) NOT NULL UNIQUE,
          \`phone\` VARCHAR(25) NOT NULL,
          \`password_hash\` VARCHAR(255) NULL,
          \`role\` ENUM('VENDOR_ADMIN', 'HOTSPOT_OWNER') NOT NULL DEFAULT 'HOTSPOT_OWNER',
          \`status\` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
          \`commission_rate\` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
          \`monthly_fee\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`subscription_status\` ENUM('ACTIVE', 'EXPIRED', 'TRIAL') NOT NULL DEFAULT 'TRIAL',
          \`subscription_expires_at\` DATETIME NULL,
          \`subscription_fee\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`vendor_merchant_id\` VARCHAR(100) NULL,
          \`payout_channel\` ENUM('PALMPESA', 'DALIPAY', 'AZAMPAY_SUB', 'VODACOM_DIRECT', 'TIGO_DIRECT', 'AIRTEL_DIRECT', 'MANUAL') NOT NULL DEFAULT 'DALIPAY',
          \`wallet_account_number\` VARCHAR(64) NULL,
          \`parent_owner_id\` INT UNSIGNED NULL,
          \`is_sub_user\` BOOLEAN NOT NULL DEFAULT FALSE,
          \`staff_title\` VARCHAR(100) NULL,
          \`privileges_json\` JSON NULL,
          \`palmpesa_user_id\` VARCHAR(100) NULL,
          \`palmpesa_user_ref\` VARCHAR(100) NULL,
          \`palmpesa_api_token\` VARCHAR(255) NULL,
          \`palmpesa_accept_stk\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`dalipay_api_endpoint\` VARCHAR(255) NULL,
          \`dalipay_key_id\` VARCHAR(100) NULL,
          \`dalipay_public_key\` VARCHAR(255) NULL,
          \`dalipay_secret_key\` VARCHAR(255) NULL,
          \`dalipay_webhook_secret\` VARCHAR(255) NULL,
          \`portal_theme_json\` JSON NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_owner_phone\` (\`phone\`),
          INDEX \`idx_owner_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('hotspot_owners');

      // 2. Table: routers
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`routers\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL,
          \`device_type\` ENUM('MIKROTIK', 'RUIJIE', 'TPLINK_OMADA', 'OPENWRT_CUDY', 'UBIQUITI_UNIFI', 'GENERIC_RADIUS') NOT NULL DEFAULT 'MIKROTIK',
          \`model_name\` VARCHAR(100) NULL,
          \`nas_identifier\` VARCHAR(100) NULL,
          \`brand_name\` VARCHAR(100) NULL,
          \`ssid\` VARCHAR(100) NULL,
          \`ip_address\` VARCHAR(45) NOT NULL,
          \`vpn_assigned_ip\` VARCHAR(45) NOT NULL DEFAULT '100.108.0.2',
          \`api_port\` SMALLINT UNSIGNED NOT NULL DEFAULT 8728,
          \`api_username\` VARCHAR(64) NOT NULL DEFAULT 'admin',
          \`api_password_hash\` VARCHAR(255) NULL,
          \`radius_secret\` VARCHAR(64) NOT NULL DEFAULT 'radius_secret_2026',
          \`location\` VARCHAR(150) NULL,
          \`hotspot_server_name\` VARCHAR(64) NOT NULL DEFAULT 'hotspot1',
          \`dns_name\` VARCHAR(100) NOT NULL DEFAULT 'wifi.hotspot.lan',
          \`status\` ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE') NOT NULL DEFAULT 'ONLINE',
          \`owner_id\` INT UNSIGNED NULL,
          \`vendor_name\` VARCHAR(100) NULL,
          \`vendor_merchant_id\` VARCHAR(100) NULL,
          \`platform_commission_percent\` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
          \`wallet_account_number\` VARCHAR(64) NULL,
          \`payout_channel\` VARCHAR(50) NOT NULL DEFAULT 'DALIPAY',
          \`dalipay_key_id\` VARCHAR(100) NULL,
          \`dalipay_public_key\` VARCHAR(255) NULL,
          \`dalipay_secret_key\` VARCHAR(255) NULL,
          \`dalipay_api_endpoint\` VARCHAR(255) NULL,
          \`palmpesa_user_id\` VARCHAR(100) NULL,
          \`palmpesa_user_ref\` VARCHAR(100) NULL,
          \`palmpesa_api_token\` VARCHAR(255) NULL,
          \`palmpesa_accept_stk\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`portal_theme_json\` JSON NULL,
          \`last_seen_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_routers_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('routers');

      // 3. Table: plans
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`plans\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`name\` VARCHAR(100) NOT NULL,
          \`type\` ENUM('TIME_BASED', 'DATA_CAPPED', 'HYBRID') NOT NULL DEFAULT 'TIME_BASED',
          \`limit_uptime\` INT UNSIGNED NULL,
          \`limit_bytes_total\` BIGINT UNSIGNED NULL,
          \`rate_limit\` VARCHAR(32) NOT NULL DEFAULT '2M/5M',
          \`price\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`validity_period\` INT UNSIGNED NOT NULL DEFAULT 86400,
          \`shared_users\` TINYINT UNSIGNED NOT NULL DEFAULT 1,
          \`owner_id\` INT UNSIGNED NULL,
          \`router_id\` INT UNSIGNED NULL,
          \`is_active\` BOOLEAN NOT NULL DEFAULT TRUE,
          \`badge\` VARCHAR(50) NULL DEFAULT 'NONE',
          \`badge_text\` VARCHAR(100) NULL,
          \`features_json\` JSON NULL,
          \`description_sw\` VARCHAR(255) NULL,
          \`description_en\` VARCHAR(255) NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_plans_active_price\` (\`is_active\`, \`price\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('plans');

      // 4. Table: transactions
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`transactions\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`phone_number\` VARCHAR(25) NOT NULL,
          \`network_provider\` VARCHAR(30) NOT NULL,
          \`amount\` DECIMAL(12, 2) NOT NULL,
          \`external_reference\` VARCHAR(100) NOT NULL UNIQUE,
          \`transaction_id\` VARCHAR(100) NULL,
          \`status\` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
          \`plan_id\` INT UNSIGNED NOT NULL,
          \`router_id\` INT UNSIGNED NULL,
          \`owner_id\` INT UNSIGNED NULL,
          \`mac_address\` VARCHAR(17) NULL,
          \`user_ip\` VARCHAR(45) NULL,
          \`gateway_provider\` VARCHAR(50) NOT NULL DEFAULT 'DALIPAY',
          \`gateway_response\` TEXT NULL,
          \`failure_reason\` VARCHAR(255) NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`completed_at\` DATETIME NULL,
          INDEX \`idx_tx_phone\` (\`phone_number\`),
          INDEX \`idx_tx_ref\` (\`external_reference\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('transactions');

      // 5. Table: vouchers
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`vouchers\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`code\` VARCHAR(64) NOT NULL UNIQUE,
          \`password\` VARCHAR(64) NOT NULL,
          \`batch_id\` VARCHAR(64) NULL,
          \`plan_id\` INT UNSIGNED NOT NULL,
          \`router_id\` INT UNSIGNED NULL,
          \`owner_id\` INT UNSIGNED NULL,
          \`status\` ENUM('AVAILABLE', 'ACTIVE', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'AVAILABLE',
          \`duration_minutes\` INT UNSIGNED NOT NULL DEFAULT 60,
          \`speed_limit\` VARCHAR(32) NOT NULL DEFAULT '5M/5M',
          \`price\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`transaction_id\` INT UNSIGNED NULL,
          \`customer_phone\` VARCHAR(25) NULL,
          \`mac_address\` VARCHAR(17) NULL,
          \`activated_at\` DATETIME NULL,
          \`expires_at\` DATETIME NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX \`idx_vouchers_code\` (\`code\`),
          INDEX \`idx_vouchers_status\` (\`status\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('vouchers');

      // 6. Table: voucher_batches
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`voucher_batches\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`batch_id\` VARCHAR(64) NOT NULL UNIQUE,
          \`plan_id\` INT UNSIGNED NOT NULL,
          \`plan_name\` VARCHAR(100) NULL,
          \`price\` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
          \`quantity\` INT UNSIGNED NOT NULL DEFAULT 10,
          \`router_id\` INT UNSIGNED NULL,
          \`owner_id\` INT UNSIGNED NULL,
          \`prefix\` VARCHAR(16) NOT NULL DEFAULT 'TZ',
          \`code_length\` TINYINT UNSIGNED NOT NULL DEFAULT 6,
          \`print_format\` VARCHAR(32) NOT NULL DEFAULT 'A4_GRID',
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('voucher_batches');

      // 7. Table: FreeRADIUS radcheck
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`radcheck\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`username\` VARCHAR(64) NOT NULL DEFAULT '',
          \`attribute\` VARCHAR(64) NOT NULL DEFAULT 'Cleartext-Password',
          \`op\` CHAR(2) NOT NULL DEFAULT ':=',
          \`value\` VARCHAR(253) NOT NULL DEFAULT '',
          INDEX \`idx_radcheck_user\` (\`username\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('radcheck');

      // 8. Table: FreeRADIUS radreply
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`radreply\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`username\` VARCHAR(64) NOT NULL DEFAULT '',
          \`attribute\` VARCHAR(64) NOT NULL DEFAULT '',
          \`op\` CHAR(2) NOT NULL DEFAULT '=',
          \`value\` VARCHAR(253) NOT NULL DEFAULT '',
          INDEX \`idx_radreply_user\` (\`username\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('radreply');

      // 9. Table: FreeRADIUS nas
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`nas\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`nasname\` VARCHAR(128) NOT NULL,
          \`shortname\` VARCHAR(32) NULL,
          \`type\` VARCHAR(30) NOT NULL DEFAULT 'other',
          \`ports\` INT NULL,
          \`secret\` VARCHAR(60) NOT NULL DEFAULT 'radius_secret_2026',
          \`server\` VARCHAR(64) NULL,
          \`community\` VARCHAR(50) NULL,
          \`description\` VARCHAR(200) NOT NULL DEFAULT 'RADIUS Client',
          INDEX \`idx_nas_name\` (\`nasname\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('nas');

      // 10. Table: audit_logs
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`audit_logs\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`external_reference\` VARCHAR(100) NULL,
          \`event_type\` VARCHAR(100) NOT NULL,
          \`payload_json\` JSON NULL,
          \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('audit_logs');

      // 11. Table: free_trial_claims
      await localConn.query(`
        CREATE TABLE IF NOT EXISTS \`free_trial_claims\` (
          \`id\` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          \`mac_address\` VARCHAR(17) NOT NULL UNIQUE,
          \`ip_address\` VARCHAR(45) NULL,
          \`router_id\` INT UNSIGNED NULL,
          \`voucher_code\` VARCHAR(64) NULL,
          \`claimed_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`expires_at\` DATETIME NOT NULL,
          INDEX \`idx_trial_mac\` (\`mac_address\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      createdTables.push('free_trial_claims');

      console.log(`✓ [MySQL] Bootstrapped ${createdTables.length} tables in database '${this.databaseName}'!`);
    } catch (err: any) {
      console.error('[MySQL] Error while bootstrapping tables:', err);
      throw err;
    } finally {
      if (shouldRelease && localConn) {
        localConn.release();
      }
    }

    return { success: true, tablesCreated: createdTables };
  }

  public async getStatus(): Promise<{
    isConnected: boolean;
    database: string;
    host: string;
    port: number;
    tablesCount: number;
    tables: string[];
    error?: string;
  }> {
    if (!this.pool) {
      return {
        isConnected: false,
        database: this.databaseName || 'tzwifi_billing',
        host: this.host || 'localhost',
        port: this.portNum || 3306,
        tablesCount: 0,
        tables: [],
        error: 'MySQL pool is not configured.',
      };
    }

    try {
      const conn = await this.pool.getConnection();
      const [rows]: any = await conn.query('SHOW TABLES');
      conn.release();
      const tableNames = Array.isArray(rows)
        ? rows.map((r: any) => Object.values(r)[0] as string)
        : [];
      return {
        isConnected: true,
        database: this.databaseName,
        host: this.host,
        port: this.portNum,
        tablesCount: tableNames.length,
        tables: tableNames,
      };
    } catch (err: any) {
      return {
        isConnected: false,
        database: this.databaseName,
        host: this.host,
        port: this.portNum,
        tablesCount: 0,
        tables: [],
        error: err.message || 'Cannot connect to MySQL server',
      };
    }
  }

  public async bootstrapNow(): Promise<{
    success: boolean;
    message: string;
    tablesCount: number;
    tables: string[];
  }> {
    if (!this.pool) {
      this.initPool();
    }
    const result = await this.bootstrapSchema();
    const status = await this.getStatus();
    return {
      success: true,
      message: `Tables ${status.tablesCount} zimetengenezwa kikamilifu kwenye database ya '${this.databaseName}'!`,
      tablesCount: status.tablesCount,
      tables: status.tables,
    };
  }

  public isAvailable(): boolean {
    return this.isConnected && this.pool !== null;
  }

  // --- Real-Time Sync Handlers ---

  async syncVoucher(v: VoucherRecord): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query(
        `INSERT INTO vouchers (
          id, code, batch_id, plan_id, router_id, owner_id,
          status, duration_minutes, speed_limit, price,
          transaction_id, customer_phone, mac_address,
          created_at, activated_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status=VALUES(status), activated_at=VALUES(activated_at),
          expires_at=VALUES(expires_at), mac_address=VALUES(mac_address)`,
        [
          v.id,
          v.code,
          v.batch_tag || null,
          v.plan_id,
          v.router_id || null,
          v.owner_id ? Number(v.owner_id) : null,
          v.status,
          Math.floor((v.plan?.limit_uptime || 3600) / 60),
          v.plan?.rate_limit || '5M/5M',
          v.plan?.price || 0,
          v.transaction_id || null,
          null,
          v.mac_address || null,
          v.created_at ? new Date(v.created_at) : new Date(),
          v.activated_at ? new Date(v.activated_at) : null,
          v.expires_at ? new Date(v.expires_at) : null,
        ]
      );
    } catch (e: any) {
      console.error('[MySQL] Error syncing voucher:', e.message);
    }
  }

  async syncTransaction(t: TransactionRecord): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query(
        `INSERT INTO transactions (
          id, reference, external_reference, plan_id, router_id,
          owner_id, customer_phone, network_provider, amount,
          status, payment_gateway, gateway_response, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          status=VALUES(status), external_reference=VALUES(external_reference),
          completed_at=VALUES(completed_at)`,
        [
          t.id,
          t.external_reference,
          t.transaction_id || null,
          t.plan_id,
          t.router_id || null,
          t.owner_id || null,
          t.phone_number,
          t.network_provider || 'VODACOM',
          t.amount,
          t.status,
          t.gateway_provider || 'DALIPAY',
          null,
          t.created_at ? new Date(t.created_at) : new Date(),
          t.status === 'SUCCESS' ? new Date(t.updated_at) : null,
        ]
      );
    } catch (e: any) {
      console.error('[MySQL] Error syncing transaction:', e.message);
    }
  }

  async syncRadCheck(rc: RadCheckRecord): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query(
        `INSERT INTO radcheck (id, username, attribute, op, value)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value=VALUES(value)`,
        [rc.id, rc.username, rc.attribute || 'Cleartext-Password', rc.op || ':=', rc.value]
      );
    } catch (e: any) {
      console.error('[MySQL] Error syncing radcheck:', e.message);
    }
  }

  async syncRadReply(rr: RadReplyRecord): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query(
        `INSERT INTO radreply (id, username, attribute, op, value)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value=VALUES(value)`,
        [rr.id, rr.username, rr.attribute, rr.op || '=', rr.value]
      );
    } catch (e: any) {
      console.error('[MySQL] Error syncing radreply:', e.message);
    }
  }

  async deleteRadUser(username: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query('DELETE FROM radcheck WHERE username = ?', [username]);
      await this.pool!.query('DELETE FROM radreply WHERE username = ?', [username]);
    } catch (e: any) {
      console.error('[MySQL] Error deleting rad user:', e.message);
    }
  }

  async syncOwner(o: HotspotOwner): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query(
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
          o.name,
          o.business_name,
          o.email,
          o.phone,
          o.role,
          o.status,
          o.commission_rate || 5.0,
          o.monthly_fee || 0,
          o.subscription_status || 'ACTIVE',
          o.subscription_expires_at ? new Date(o.subscription_expires_at) : null,
          o.dalipay_key_id || null,
          o.dalipay_public_key || null,
          o.dalipay_secret_key || null,
          o.dalipay_webhook_secret || null,
          o.portal_theme ? JSON.stringify(o.portal_theme) : null,
          o.created_at ? new Date(o.created_at) : new Date(),
          o.updated_at ? new Date(o.updated_at) : new Date(),
        ]
      );
    } catch (e: any) {
      console.error('[MySQL] Error syncing owner:', e.message);
    }
  }

  async syncRouter(r: RouterRecord): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.pool!.query(
        `INSERT INTO routers (
          id, name, ip_address, mac_address, router_type,
          device_type, owner_id, status, is_online, location,
          ssid, radius_secret, api_port, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name=VALUES(name), ip_address=VALUES(ip_address),
          owner_id=VALUES(owner_id), status=VALUES(status),
          location=VALUES(location), ssid=VALUES(ssid),
          radius_secret=VALUES(radius_secret), updated_at=NOW()`,
        [
          r.id,
          r.name,
          r.ip_address,
          null,
          'MIKROTIK',
          r.device_type || 'mikrotik_standard',
          r.owner_id || 1,
          r.status,
          r.status === 'ONLINE' ? 1 : 0,
          r.location || 'Default',
          r.ssid || 'TZ-WIFI',
          r.radius_secret || 'radius_secret_2026',
          r.api_port || 8728,
          new Date(),
          new Date(),
        ]
      );
    } catch (e: any) {
      console.error('[MySQL] Error syncing router:', e.message);
    }
  }
}

export const mysqlService = new MySQLService();
