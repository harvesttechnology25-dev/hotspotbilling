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

  constructor() {
    this.initPool();
  }

  private initPool() {
    const host = process.env.MYSQL_HOST || 'localhost';
    const user = process.env.MYSQL_USER || 'hotspot_user';
    const password = process.env.MYSQL_PASSWORD || 'TzWifiSecure2026!';
    const database = process.env.MYSQL_DATABASE || 'hotspot_billing';
    const port = Number(process.env.MYSQL_PORT) || 3306;

    try {
      this.pool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 15,
        queueLimit: 0,
      });

      // Test connectivity asynchronously
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
      conn.release();
      this.isConnected = true;
      console.log('✓ [MySQL] Connected to MySQL database (hotspot_billing) in real-time mode!');
    } catch (err: any) {
      this.isConnected = false;
      console.log(`[MySQL] Standby mode (MySQL server not running locally or credentials not configured: ${err.message})`);
    }
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
