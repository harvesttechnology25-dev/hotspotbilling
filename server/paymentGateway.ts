import crypto from 'crypto';

export interface DaliPayCredentials {
  publicKey: string;
  secretKey: string;
  apiEndpoint?: string;
  isSandbox?: boolean;
}

export interface PaymentInitiateRequest {
  amount: number;
  phoneNumber: string;
  reference: string;
  callbackUrl: string;
  customerName?: string;
}

export class PaymentGatewayService {
  /**
   * Kuanzisha muamala wa DaliPay (USSD Push / STK Push)
   * Inapokea credentials maalum kulingana na anayelipwa (Admin au Owner)
   */
  static async initiateDaliPayPush(
    creds: DaliPayCredentials,
    payment: PaymentInitiateRequest
  ) {
    if (!creds.publicKey || !creds.secretKey) {
      throw new Error("API Keys za malipo hazijasanidiwa ipasavyo.");
    }

    const endpoint = (creds.apiEndpoint || 'https://app.dalipay.co.tz').replace(/\/+$/, '');
    const cleanPhone = payment.phoneNumber.replace(/[^0-9]/g, '');

    const payload = {
      amount: Math.round(payment.amount),
      phone: cleanPhone,
      currency: "TZS",
      reference: payment.reference,
      callback_url: payment.callbackUrl,
      description: payment.customerName ? `Payment for ${payment.customerName}` : "WiFi Payment"
    };

    try {
      const response = await fetch(`${endpoint}/api/v1/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": creds.publicKey.trim(),
          "X-Secret-Key": creds.secretKey.trim()
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Hitilafu kutoka DaliPay: ${response.statusText}`);
      }

      return data;
    } catch (error: any) {
      console.error("DaliPay Execution Error:", error.message);
      throw error;
    }
  }
}
