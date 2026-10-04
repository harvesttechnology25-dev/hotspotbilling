-- =============================================================================
-- Multi-Carrier Hotspot Wi-Fi Billing & Multi-Vendor AAA System
-- Target Engines: MySQL 8.0+ / MariaDB 10.5+
-- Compatible Hardware: Ruijie Reyee, TP-Link Omada, MikroTik RouterOS, OpenWrt/Cudy, Ubiquiti UniFi
-- Mobile Money Aggregators: PalmPesa, AzamPay, Selcom, Vodacom M-Pesa, Tigo Pesa, Airtel Money, Halopesa
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `hotspot_billing` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `hotspot_billing`;

-- -----------------------------------------------------------------------------
-- 1. Table: hotspot_owners
-- Multi-tenant vendors/sub-merchants who own Access Points & Routers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hotspot_owners` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'Owner full name or contact person',
  `business_name` VARCHAR(150) NOT NULL COMMENT 'Business or Hotspot brand name e.g. Kariakoo Free WiFi',
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `phone` VARCHAR(25) NOT NULL COMMENT 'Format 2557XXXXXXXX',
  `password_hash` VARCHAR(255) NULL,
  `role` ENUM('VENDOR_ADMIN', 'HOTSPOT_OWNER') NOT NULL DEFAULT 'HOTSPOT_OWNER',
  `status` ENUM('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  `commission_rate` DECIMAL(5, 2) NOT NULL DEFAULT 5.00 COMMENT 'Platform revenue share %',
  `monthly_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'SaaS subscription fee in TZS',
  `subscription_status` ENUM('ACTIVE', 'EXPIRED', 'TRIAL') NOT NULL DEFAULT 'TRIAL',
  `subscription_expires_at` DATETIME NULL,
  `subscription_fee` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `vendor_merchant_id` VARCHAR(100) NULL COMMENT 'Sub-merchant ID in aggregator system',
  `payout_channel` ENUM('PALMPESA', 'AZAMPAY_SUB', 'VODACOM_DIRECT', 'TIGO_DIRECT', 'AIRTEL_DIRECT', 'MANUAL') NOT NULL DEFAULT 'PALMPESA',
  `wallet_account_number` VARCHAR(64) NULL COMMENT 'MSISDN or Bank Account for automated payouts',
  `parent_owner_id` INT UNSIGNED NULL COMMENT 'Parent owner if this user is a staff member or cashier',
  `is_sub_user` BOOLEAN NOT NULL DEFAULT FALSE,
  `staff_title` VARCHAR(100) NULL,
  `privileges_json` JSON NULL,
  -- Sub-merchant PalmPesa Credentials (Allows direct deposit into owner wallet)
  `palmpesa_user_id` VARCHAR(100) NULL,
  `palmpesa_user_ref` VARCHAR(100) NULL,
  `palmpesa_api_token` VARCHAR(255) NULL,
  `palmpesa_accept_stk` BOOLEAN NOT NULL DEFAULT TRUE,
  -- Sub-merchant DaliPay Credentials
  `dalipay_api_endpoint` VARCHAR(255) NULL,
  `dalipay_key_id` VARCHAR(100) NULL,
  `dalipay_public_key` VARCHAR(255) NULL,
  `dalipay_secret_key` VARCHAR(255) NULL,
  `dalipay_webhook_secret` VARCHAR(255) NULL,
  `portal_theme_json` JSON NULL COMMENT 'Custom branding, colors, and welcome messages',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_owner_phone` (`phone`),
  INDEX `idx_owner_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: routers
-- Physical or Cloud Access Points, Controllers, and MikroTik Routers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `routers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'Descriptive identifier, e.g. Ruijie-Kariakoo-01 or Mikrotik-CBD',
  `device_type` ENUM('MIKROTIK', 'RUIJIE', 'TPLINK_OMADA', 'OPENWRT_CUDY', 'UBIQUITI_UNIFI', 'GENERIC_RADIUS') NOT NULL DEFAULT 'RUIJIE',
  `model_name` VARCHAR(100) NULL COMMENT 'e.g. RG-RAP2200(E), EAP610, hEX RB750Gr3',
  `nas_identifier` VARCHAR(100) NULL COMMENT 'RADIUS NAS-Identifier sent by AP in Access-Request',
  `brand_name` VARCHAR(100) NULL COMMENT 'Custom Wi-Fi brand displayed on captive portal',
  `ssid` VARCHAR(100) NULL COMMENT 'Broadcasted Wi-Fi SSID name e.g. @Bure_Kariakoo_WiFi',
  `ip_address` VARCHAR(45) NOT NULL COMMENT 'Public IP or local IP of AP / Controller',
  `vpn_assigned_ip` VARCHAR(45) NOT NULL DEFAULT '100.108.0.2' COMMENT 'Assigned VPN IP in 100.108.0.0/18',
  `api_port` SMALLINT UNSIGNED NOT NULL DEFAULT 8728 COMMENT 'Management port (API 8728/8729, HTTP 80, HTTPS 443)',
  `api_username` VARCHAR(64) NOT NULL DEFAULT 'admin',
  `api_password_hash` VARCHAR(255) NOT NULL COMMENT 'Device administrative secret or hash',
  `radius_secret` VARCHAR(64) NOT NULL DEFAULT 'radius_secret_2026' COMMENT 'Shared secret matching FreeRADIUS clients.conf',
  `location` VARCHAR(150) NULL COMMENT 'Physical installation address',
  `hotspot_server_name` VARCHAR(64) NOT NULL DEFAULT 'hotspot1',
  `dns_name` VARCHAR(100) NOT NULL DEFAULT 'wifi.hotspot.lan',
  `status` ENUM('ONLINE', 'OFFLINE', 'MAINTENANCE') NOT NULL DEFAULT 'ONLINE',
  `owner_id` INT UNSIGNED NULL COMMENT 'Foreign key linking router to hotspot owner',
  `vendor_name` VARCHAR(100) NULL,
  `vendor_merchant_id` VARCHAR(100) NULL,
  `vendor_api_key_encrypted` VARCHAR(255) NULL,
  `platform_commission_percent` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  `wallet_account_number` VARCHAR(64) NULL,
  `payout_channel` ENUM('PALMPESA', 'AZAMPAY_SUB', 'VODACOM_DIRECT', 'TIGO_DIRECT', 'AIRTEL_DIRECT', 'MANUAL') NOT NULL DEFAULT 'PALMPESA',
  -- Router-specific PalmPesa override (if distinct from owner's default)
  `palmpesa_user_id` VARCHAR(100) NULL,
  `palmpesa_user_ref` VARCHAR(100) NULL,
  `palmpesa_api_token` VARCHAR(255) NULL,
  `palmpesa_accept_stk` BOOLEAN NOT NULL DEFAULT TRUE,
  `portal_theme_json` JSON NULL,
  `last_seen_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_routers_owner` FOREIGN KEY (`owner_id`) REFERENCES `hotspot_owners` (`id`) ON DELETE SET NULL,
  INDEX `idx_routers_status` (`status`),
  INDEX `idx_routers_type` (`device_type`),
  INDEX `idx_routers_vpn_ip` (`vpn_assigned_ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: plans
-- Hotspot bandwidth, uptime, and quota pricing bundles (in TZS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `plans` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL COMMENT 'e.g. 2 Hours Fast, 24 Hours Unlimited, 7 Days Mega',
  `type` ENUM('TIME_BASED', 'DATA_CAPPED', 'HYBRID') NOT NULL DEFAULT 'TIME_BASED',
  `limit_uptime` INT UNSIGNED NULL COMMENT 'Uptime duration in seconds (e.g. 7200 for 2h, 86400 for 24h)',
  `limit_bytes_total` BIGINT UNSIGNED NULL COMMENT 'Total quota in bytes (e.g. 1073741824 for 1GB)',
  `rate_limit` VARCHAR(32) NOT NULL DEFAULT '2M/5M' COMMENT 'Bandwidth rate rx/tx e.g. 2M/5M or 5M/10M',
  `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Price in TZS (Tanzanian Shilling)',
  `validity_period` INT UNSIGNED NOT NULL DEFAULT 86400 COMMENT 'Validity window in seconds after activation',
  `shared_users` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Concurrent devices allowed',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `description_sw` VARCHAR(255) NULL COMMENT 'Swahili description for captive portal',
  `description_en` VARCHAR(255) NULL COMMENT 'English description for captive portal',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_plans_active_price` (`is_active`, `price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: transactions
-- Multi-carrier mobile money transactions (USSD Push STK & Webhook Callbacks)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `phone_number` VARCHAR(25) NOT NULL COMMENT 'Format 2557XXXXXXXX or 07XXXXXXXX',
  `network_provider` ENUM('VODACOM', 'TIGO', 'AIRTEL', 'HALOTEL') NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL COMMENT 'Paid amount in TZS',
  `external_reference` VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique system order reference e.g. TZWF-2026-XXXX',
  `transaction_id` VARCHAR(100) NULL COMMENT 'Carrier/Aggregator reference e.g. PP260928.1234.H00001',
  `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
  `plan_id` INT UNSIGNED NOT NULL,
  `router_id` INT UNSIGNED NULL,
  `owner_id` INT UNSIGNED NULL COMMENT 'Owner credited with payment',
  `mac_address` VARCHAR(17) NULL COMMENT 'Customer device MAC address for Zero-Touch auto login',
  `user_ip` VARCHAR(45) NULL COMMENT 'Customer device IP in captive portal subnet',
  `gateway_provider` VARCHAR(50) NOT NULL DEFAULT 'PALMPESA' COMMENT 'PALMPESA, AZAMPAY, SELCOM, or DIRECT',
  `failure_reason` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tx_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tx_router` FOREIGN KEY (`router_id`) REFERENCES `routers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tx_owner` FOREIGN KEY (`owner_id`) REFERENCES `hotspot_owners` (`id`) ON DELETE SET NULL,
  INDEX `idx_tx_phone` (`phone_number`),
  INDEX `idx_tx_provider` (`network_provider`),
  INDEX `idx_tx_status` (`status`),
  INDEX `idx_tx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: vouchers
-- Wi-Fi credentials for PIN login and Scratch Cards
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(32) NOT NULL UNIQUE COMMENT 'PIN or Username used on captive portal',
  `password` VARCHAR(32) NOT NULL COMMENT 'Matching RADIUS password',
  `plan_id` INT UNSIGNED NOT NULL,
  `router_id` INT UNSIGNED NULL,
  `owner_id` INT UNSIGNED NULL,
  `transaction_id` INT UNSIGNED NULL COMMENT 'Associated payment if purchased online via mobile money',
  `mac_address` VARCHAR(17) NULL COMMENT 'Bound device MAC (Lock to MAC security)',
  `status` ENUM('AVAILABLE', 'ACTIVE', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'AVAILABLE',
  `batch_tag` VARCHAR(50) NULL COMMENT 'Batch identifier for scratchcard printing',
  `activated_at` DATETIME NULL COMMENT 'First login timestamp',
  `expires_at` DATETIME NULL COMMENT 'Hard expiration timestamp calculated at activation',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_voucher_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_voucher_router` FOREIGN KEY (`router_id`) REFERENCES `routers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_voucher_owner` FOREIGN KEY (`owner_id`) REFERENCES `hotspot_owners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_voucher_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  INDEX `idx_voucher_code` (`code`),
  INDEX `idx_voucher_status` (`status`),
  INDEX `idx_voucher_mac` (`mac_address`),
  INDEX `idx_voucher_batch` (`batch_tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: transaction_audit_logs
-- Immutable ledger for webhooks, STK push payloads, and verification signatures
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `transaction_audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `transaction_id` INT UNSIGNED NULL,
  `external_reference` VARCHAR(100) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL COMMENT 'WEBHOOK_RECEIVED, USSD_PUSH_SENT, COA_TRIGGERED, SIGNATURE_ERROR',
  `payload_json` JSON NOT NULL,
  `signature_header` VARCHAR(255) NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_tx` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE SET NULL,
  INDEX `idx_audit_ref` (`external_reference`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: hotspot_active_sessions
-- Live snapshot of currently connected Wi-Fi users across all APs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hotspot_active_sessions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `router_id` INT UNSIGNED NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `mac_address` VARCHAR(17) NOT NULL,
  `uptime_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
  `bytes_in` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `bytes_out` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `rate_limit` VARCHAR(32) NULL,
  `session_id` VARCHAR(64) NULL,
  `last_synced_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_session_router` FOREIGN KEY (`router_id`) REFERENCES `routers` (`id`) ON DELETE CASCADE,
  INDEX `idx_session_user` (`username`),
  INDEX `idx_session_mac` (`mac_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: voucher_batches
-- Scratchcard batches for A4 / POS Thermal 58mm/80mm printing
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `voucher_batches` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `batch_id` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique batch tag e.g. BATCH-2026-XXXX',
  `plan_id` INT UNSIGNED NOT NULL,
  `router_id` INT UNSIGNED NULL,
  `owner_id` INT UNSIGNED NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `prefix` VARCHAR(10) NOT NULL DEFAULT 'TZ',
  `code_length` TINYINT UNSIGNED NOT NULL DEFAULT 6,
  `print_format` ENUM('A4_GRID', 'THERMAL_58MM', 'THERMAL_80MM') NOT NULL DEFAULT 'A4_GRID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_batch_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_batch_router` FOREIGN KEY (`router_id`) REFERENCES `routers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_batch_owner` FOREIGN KEY (`owner_id`) REFERENCES `hotspot_owners` (`id`) ON DELETE SET NULL,
  INDEX `idx_batch_owner` (`owner_id`),
  INDEX `idx_batch_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table: free_trial_claims
-- Permanently stores claimed MAC addresses for 1-click 15-minute free trials
-- Ensures single lifetime use per physical device MAC
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `free_trial_claims` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `mac_address` VARCHAR(17) NOT NULL UNIQUE COMMENT 'Device MAC address permanently locked from claiming trial again',
  `user_ip` VARCHAR(45) NULL,
  `router_id` INT UNSIGNED NULL,
  `owner_id` INT UNSIGNED NULL,
  `voucher_code` VARCHAR(32) NOT NULL,
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 900 COMMENT '15 minutes = 900s',
  `rate_limit` VARCHAR(32) NOT NULL DEFAULT '2M/4M',
  `claimed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  CONSTRAINT `fk_ft_router` FOREIGN KEY (`router_id`) REFERENCES `routers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ft_owner` FOREIGN KEY (`owner_id`) REFERENCES `hotspot_owners` (`id`) ON DELETE SET NULL,
  INDEX `idx_ft_mac` (`mac_address`),
  INDEX `idx_ft_created` (`claimed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table: system_settings
-- System-wide key-value storage for Payment Gateways, SMTP, and Branding
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(64) NOT NULL UNIQUE,
  `setting_value` JSON NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- FREERADIUS 3.x CORE SCHEMA (MySQL AAA Engine for Hotspot & Wireless APs)
-- Standard FreeRADIUS mods-config/sql/main/mysql/schema.sql
-- =============================================================================

-- Table: radcheck (Authentication & Credentials)
CREATE TABLE IF NOT EXISTS `radcheck` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL DEFAULT '',
  `attribute` VARCHAR(64) NOT NULL DEFAULT '',
  `op` CHAR(2) NOT NULL DEFAULT '==',
  `value` VARCHAR(253) NOT NULL DEFAULT '',
  INDEX `idx_radcheck_user` (`username`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: radreply (Bandwidth Queues, Session Timeouts, and CoA attributes)
CREATE TABLE IF NOT EXISTS `radreply` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL DEFAULT '',
  `attribute` VARCHAR(64) NOT NULL DEFAULT '',
  `op` CHAR(2) NOT NULL DEFAULT '=',
  `value` VARCHAR(253) NOT NULL DEFAULT '',
  INDEX `idx_radreply_user` (`username`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: radusergroup (Group associations)
CREATE TABLE IF NOT EXISTS `radusergroup` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL DEFAULT '',
  `groupname` VARCHAR(64) NOT NULL DEFAULT '',
  `priority` INT NOT NULL DEFAULT 1,
  INDEX `idx_radusergroup_user` (`username`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: radgroupcheck (Group level authentication checks)
CREATE TABLE IF NOT EXISTS `radgroupcheck` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `groupname` VARCHAR(64) NOT NULL DEFAULT '',
  `attribute` VARCHAR(64) NOT NULL DEFAULT '',
  `op` CHAR(2) NOT NULL DEFAULT '==',
  `value` VARCHAR(253) NOT NULL DEFAULT '',
  INDEX `idx_radgroupcheck_group` (`groupname`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: radgroupreply (Group rate-limits, WISPr attributes, and VLAN tags)
CREATE TABLE IF NOT EXISTS `radgroupreply` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `groupname` VARCHAR(64) NOT NULL DEFAULT '',
  `attribute` VARCHAR(64) NOT NULL DEFAULT '',
  `op` CHAR(2) NOT NULL DEFAULT '=',
  `value` VARCHAR(253) NOT NULL DEFAULT '',
  INDEX `idx_radgroupreply_group` (`groupname`(32))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: radacct (RADIUS Accounting & Real-time Live Session Records)
CREATE TABLE IF NOT EXISTS `radacct` (
  `radacctid` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `acctsessionid` VARCHAR(64) NOT NULL DEFAULT '',
  `acctuniqueid` VARCHAR(32) NOT NULL DEFAULT '',
  `username` VARCHAR(64) NOT NULL DEFAULT '',
  `realm` VARCHAR(64) DEFAULT '',
  `nasipaddress` VARCHAR(45) NOT NULL DEFAULT '',
  `nasportid` VARCHAR(32) DEFAULT NULL,
  `nasporttype` VARCHAR(32) DEFAULT NULL,
  `acctstarttime` DATETIME DEFAULT NULL,
  `acctupdatetime` DATETIME DEFAULT NULL,
  `acctstoptime` DATETIME DEFAULT NULL,
  `acctinterval` INT DEFAULT NULL,
  `acctsessiontime` INT UNSIGNED DEFAULT NULL,
  `acctauthentic` VARCHAR(32) DEFAULT NULL,
  `connectinfo_start` VARCHAR(50) DEFAULT NULL,
  `connectinfo_stop` VARCHAR(50) DEFAULT NULL,
  `acctinputoctets` BIGINT DEFAULT NULL,
  `acctoutputoctets` BIGINT DEFAULT NULL,
  `calledstationid` VARCHAR(50) NOT NULL DEFAULT '',
  `callingstationid` VARCHAR(50) NOT NULL DEFAULT '',
  `acctterminatecause` VARCHAR(32) NOT NULL DEFAULT '',
  `servicetype` VARCHAR(32) DEFAULT NULL,
  `framedprotocol` VARCHAR(32) DEFAULT NULL,
  `framedipaddress` VARCHAR(45) NOT NULL DEFAULT '',
  INDEX `idx_radacct_user` (`username`),
  INDEX `idx_radacct_session` (`acctsessionid`),
  INDEX `idx_radacct_nasip` (`nasipaddress`),
  INDEX `idx_radacct_start` (`acctstarttime`),
  INDEX `idx_radacct_stop` (`acctstoptime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: nas (Authorized Client APs / Routers with Shared Secret)
CREATE TABLE IF NOT EXISTS `nas` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `nasname` VARCHAR(128) NOT NULL COMMENT 'IP or CIDR subnet e.g. 0.0.0.0/0, 100.108.0.0/18 or specific AP IP',
  `shortname` VARCHAR(32) DEFAULT NULL,
  `type` VARCHAR(30) DEFAULT 'other',
  `ports` INT DEFAULT NULL,
  `secret` VARCHAR(60) NOT NULL DEFAULT 'radius_secret_2026',
  `server` VARCHAR(64) DEFAULT NULL,
  `community` VARCHAR(50) DEFAULT NULL,
  `description` VARCHAR(200) DEFAULT 'Universal Hotspot AP / Router',
  INDEX `idx_nas_name` (`nasname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA: Pre-configured Owners, Routers/APs, Plans, and Universal NAS
-- =============================================================================

-- 1. Seed Authorized NAS Clients (Accepts all connected APs using radius_secret_2026)
INSERT INTO `nas` (`nasname`, `shortname`, `type`, `secret`, `description`)
VALUES 
('0.0.0.0/0', 'universal-aps', 'other', 'radius_secret_2026', 'Universal Access Point Client (Ruijie, Omada, Cudy, UniFi)'),
('100.108.0.0/18', 'vpn-fleet', 'mikrotik', 'radius_secret_2026', 'OpenVPN / SSTP MikroTik Fleet Subnet')
ON DUPLICATE KEY UPDATE `secret` = VALUES(`secret`);

-- 2. Seed Default Hotspot Owner (Bwana Juma)
INSERT INTO `hotspot_owners` (`id`, `name`, `business_name`, `email`, `phone`, `role`, `status`, `commission_rate`, `payout_channel`, `wallet_account_number`, `palmpesa_user_id`, `palmpesa_user_ref`, `palmpesa_api_token`)
VALUES 
(1, 'Juma Rashid', 'Kariakoo Express Wi-Fi', 'juma@kariakoowifi.co.tz', '255754000111', 'HOTSPOT_OWNER', 'ACTIVE', 5.00, 'PALMPESA', '255754000111', '770', 'USR-B2510CD582DF', '1NhdI6PhhHHY9kYmnSoUUszx7qm8nSYrnewbfxeDYyONiMzGGTdRhIJjj2Hq')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Seed Default Hardware Devices (Ruijie AP and MikroTik Router)
INSERT INTO `routers` (`id`, `name`, `device_type`, `model_name`, `brand_name`, `ssid`, `ip_address`, `api_port`, `api_username`, `api_password_hash`, `radius_secret`, `location`, `hotspot_server_name`, `dns_name`, `status`, `owner_id`)
VALUES 
(1, 'Ruijie Reyee - Kariakoo Soko', 'RUIJIE', 'RG-RAP2200(E)', 'Kariakoo High-Speed Wi-Fi', '@Kariakoo_WiFi_Bure', '192.168.110.1', 80, 'admin', 'admin', 'radius_secret_2026', 'Kariakoo Market, Dar es Salaam', 'hotspot1', 'wifi.hotspot.lan', 'ONLINE', 1),
(2, 'MikroTik - Branch Arusha', 'MIKROTIK', 'hEX RB750Gr3', 'Arusha ClockTower Wi-Fi', '@Arusha_ClockTower_WiFi', '10.5.50.1', 8728, 'billing_api', '$2a$12$eImiTXuWVxfM37uY4JANjOL.oUebgpv7J5513qeb8KYgkdN1g.21C', 'radius_secret_2026', 'Clock Tower, Arusha', 'hotspot1', 'arusha.hotspot.lan', 'ONLINE', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Seed Standard Tanzanian Wi-Fi Bundles (TZS)
INSERT INTO `plans` (`id`, `name`, `type`, `limit_uptime`, `limit_bytes_total`, `rate_limit`, `price`, `validity_period`, `shared_users`, `is_active`, `description_sw`, `description_en`)
VALUES
(1, 'Masaa 2 - Kasi ya Juu', 'TIME_BASED', 7200, NULL, '2M/4M', 500.00, 7200, 1, TRUE, 'Masaa 2 ya intaneti isiyo na kikomo cha data', '2 Hours unlimited data high-speed Wi-Fi'),
(2, 'Masaa 6 - Standard', 'TIME_BASED', 21600, NULL, '3M/6M', 1000.00, 21600, 1, TRUE, 'Masaa 6 ya kazi na kupakua maudhui', '6 Hours of stable work and streaming access'),
(3, 'Masaa 24 (Siku 1) - Unlimited', 'TIME_BASED', 86400, NULL, '3M/8M', 1500.00, 86400, 1, TRUE, 'Siku 1 kamili (masaa 24) intaneti mfululizo', 'Full 24 hours unlimited high-speed browsing'),
(4, 'Wiki 1 (Siku 7) - Mega Pack', 'TIME_BASED', 604800, NULL, '5M/10M', 5000.00, 604800, 1, TRUE, 'Wiki nzima kwa ajili ya ofisi au matumizi ya nyumbani', '7 Days mega pass with priority bandwidth'),
(5, 'Mwezi 1 (Siku 30) - Pro', 'TIME_BASED', 2592000, NULL, '8M/15M', 20000.00, 2592000, 2, TRUE, 'Mwezi 1 kamili wa intaneti ya kasi, vifaa 2', '30 Days ultra high-speed connection for 2 devices'),
(6, 'GB 3 - Kifurushi cha Data', 'DATA_CAPPED', NULL, 3221225472, '5M/10M', 3000.00, 2592000, 1, TRUE, 'GB 3 za data inayotumika hadi ziishe ndani ya siku 30', '3GB quota valid for 30 days at maximum speed')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
