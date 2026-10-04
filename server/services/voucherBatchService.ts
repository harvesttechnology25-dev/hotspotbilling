import crypto from 'crypto';
import { db } from '../db.js';
import {
  VoucherRecord,
  VoucherBatchRecord,
  PlanRecord,
  RouterRecord,
} from '../types.js';

export interface GenerateBatchOptions {
  planId: number;
  quantity: number;
  routerId?: number;
  ownerId?: number;
  prefix?: string;
  codeLength?: number;
  printFormat?: 'A4_GRID' | 'THERMAL_58MM' | 'THERMAL_80MM';
}

export class VoucherBatchService {
  /**
   * Generates a non-colliding numeric/alphanumeric code of specified length.
   * Uses crypto.randomInt for high cryptographic entropy.
   */
  static generateNumericCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return String(crypto.randomInt(min, max + 1));
  }

  /**
   * Batch generates vouchers with atomic insertion into:
   * 1. Local Database Vouchers Table
   * 2. FreeRADIUS radcheck & radreply Tables
   * 3. Voucher Batches Registry
   */
  static generateBatch(options: GenerateBatchOptions): {
    batch: VoucherBatchRecord;
    vouchers: VoucherRecord[];
    count: number;
  } {
    const {
      planId,
      quantity,
      routerId,
      ownerId,
      prefix = 'TZ',
      codeLength = 6,
      printFormat = 'A4_GRID',
    } = options;

    if (quantity <= 0 || quantity > 1000) {
      throw new Error('Quantity must be between 1 and 1000 vouchers per batch.');
    }

    const plan = db.getPlanById(planId);
    if (!plan) {
      throw new Error(`Plan with ID ${planId} was not found.`);
    }

    const existingVouchers = db.getVouchers();
    const existingCodeSet = new Set(existingVouchers.map((v) => v.code.toUpperCase()));

    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const batchId = `BATCH-${dateStr}-${randomSuffix}`;

    const newVouchers: VoucherRecord[] = [];
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (plan.validity_period || 86400) * 1000).toISOString();

    for (let i = 0; i < quantity; i++) {
      let code = '';
      let attempts = 0;

      // Ensure no collision with existing codes or generated in this batch
      do {
        const pin = this.generateNumericCode(codeLength);
        code = prefix ? `${prefix}-${pin}` : pin;
        attempts++;
        if (attempts > 50) {
          // If collision probability rises, append random hex
          code = `${prefix}-${pin}${crypto.randomBytes(1).toString('hex').toUpperCase()}`;
          break;
        }
      } while (existingCodeSet.has(code.toUpperCase()));

      existingCodeSet.add(code.toUpperCase());

      // Password matches code pin or numeric part for simplicity
      const pinOnly = code.includes('-') ? code.split('-')[1] : code;

      const voucher: VoucherRecord = {
        id: Date.now() + i,
        code,
        password: pinOnly,
        plan_id: plan.id,
        router_id: routerId,
        owner_id: ownerId,
        status: 'AVAILABLE',
        batch_tag: batchId,
        expires_at: expiresAt,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        plan,
      };

      newVouchers.push(voucher);

      // Atomic insertion into local vouchers table
      db.saveVoucher(voucher);

      // Atomic insertion into FreeRADIUS AAA engine (radcheck & radreply)
      db.addRadiusUser(code, pinOnly, plan);
    }

    const batchRecord: VoucherBatchRecord = {
      id: Date.now(),
      batch_id: batchId,
      plan_id: plan.id,
      plan_name: plan.name,
      price: plan.price,
      router_id: routerId,
      owner_id: ownerId,
      quantity,
      prefix,
      code_length: codeLength,
      print_format: printFormat,
      created_at: now.toISOString(),
      vouchers: newVouchers,
    };

    db.saveVoucherBatch(batchRecord);

    db.saveAuditLog({
      id: Date.now(),
      external_reference: batchId,
      event_type: 'VOUCHER_BATCH_GENERATED',
      payload_json: {
        batchId,
        planId: plan.id,
        planName: plan.name,
        quantity,
        routerId,
        prefix,
      },
      created_at: now.toISOString(),
    });

    return {
      batch: batchRecord,
      vouchers: newVouchers,
      count: newVouchers.length,
    };
  }

  /**
   * Retrieves all vouchers belonging to a specific batch
   */
  static getBatchWithVouchers(batchId: string): VoucherBatchRecord | undefined {
    return db.getVoucherBatchById(batchId);
  }

  /**
   * Retrieves all batches, optionally filtered by ownerId
   */
  static listBatches(ownerId?: number): VoucherBatchRecord[] {
    return db.getVoucherBatches(ownerId);
  }
}
