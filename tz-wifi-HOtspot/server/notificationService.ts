/**
 * Real Multi-Provider Email & SMS Sender for Tanzania WiFi Hotspot Billing Platform
 * Supports:
 * - Resend API (Real HTTP dispatch)
 * - SendGrid API v3 (Real HTTP dispatch)
 * - Mailgun API v3 (Real HTTP dispatch)
 * - EmailJS REST API (Real HTTP dispatch)
 * - Beem Africa SMS API (Real Tanzania SMS dispatch to Vodacom, Airtel, Tigo, Halotel)
 * - NextSMS Tanzania SMS API (Real Tanzania SMS dispatch)
 * - Twilio SMS API (Global & Tanzania SMS dispatch)
 * - Generic Webhook / Custom SMS Gateway (Real HTTP POST dispatch)
 */

export interface EmailSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  otpCode?: string;
}

export interface SmsSendOptions {
  toPhone: string;
  message: string;
  senderId?: string;
}

/**
 * Format Tanzania phone numbers to international E.164 without plus:
 * e.g., '0754111222' -> '255754111222'
 * '+255754111222' -> '255754111222'
 */
export function formatTanzaniaPhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0') && clean.length === 10) {
    clean = '255' + clean.slice(1);
  } else if (clean.startsWith('255') && clean.length === 12) {
    // Already 255...
  }
  return clean;
}

/**
 * Send real email via selected provider
 */
export async function sendRealEmail(
  config: any,
  options: EmailSendOptions
): Promise<{ success: boolean; messageId?: string; error?: string; provider: string }> {
  const provider = config?.provider || 'RESEND';
  const fromEmail = config?.fromEmail || 'onboarding@resend.dev';
  const fromName = config?.fromName || 'INFOTECH WiFi';
  const fromFormatted = `"${fromName}" <${fromEmail}>`;

  // 1. RESEND (Official REST API: https://api.resend.com/emails)
  if (provider === 'RESEND') {
    const apiKey = config?.resendApiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'API Key ya Resend haijawekwa kwenye mipangilio ya Email Gateway.',
        provider: 'RESEND',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.message || resData?.error || `Resend HTTP error ${response.status}`);
      }

      return {
        success: true,
        messageId: resData.id,
        provider: 'RESEND',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya Resend: ${err.message}`,
        provider: 'RESEND',
      };
    }
  }

  // 2. SENDGRID (Official v3 REST API: https://api.sendgrid.com/v3/mail/send)
  if (provider === 'SENDGRID') {
    const apiKey = config?.sendgridApiKey || process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'API Key ya SendGrid haijawekwa kwenye mipangilio.',
        provider: 'SENDGRID',
      };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
              subject: options.subject,
            },
          ],
          from: { email: fromEmail, name: fromName },
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API ${response.status}: ${errorText}`);
      }

      return {
        success: true,
        messageId: `sendgrid-${Date.now()}`,
        provider: 'SENDGRID',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya SendGrid: ${err.message}`,
        provider: 'SENDGRID',
      };
    }
  }

  // 3. MAILGUN (Official v3 REST API)
  if (provider === 'MAILGUN') {
    const apiKey = config?.mailgunApiKey || process.env.MAILGUN_API_KEY;
    const domain = config?.mailgunDomain || process.env.MAILGUN_DOMAIN;
    if (!apiKey || !domain) {
      return {
        success: false,
        error: 'API Key au Domain ya Mailgun haijawekwa kwenye mipangilio.',
        provider: 'MAILGUN',
      };
    }

    try {
      const basicAuth = Buffer.from(`api:${apiKey}`).toString('base64');
      const formData = new URLSearchParams();
      formData.append('from', fromFormatted);
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('html', options.html);
      if (options.text) formData.append('text', options.text);

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.message || `Mailgun HTTP ${response.status}`);
      }

      return {
        success: true,
        messageId: resData.id,
        provider: 'MAILGUN',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya Mailgun: ${err.message}`,
        provider: 'MAILGUN',
      };
    }
  }

  // 4. EMAILJS (Official REST API: https://api.emailjs.com/api/v1.0/email/send)
  if (provider === 'EMAILJS') {
    const serviceId = config?.emailjsServiceId || process.env.EMAILJS_SERVICE_ID;
    const templateId = config?.emailjsTemplateId || process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = config?.emailjsPublicKey || process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = config?.emailjsPrivateKey || process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey) {
      return {
        success: false,
        error: 'Taarifa za EmailJS (Service ID, Template ID, Public Key) hazijakamilika.',
        provider: 'EMAILJS',
      };
    }

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          accessToken: privateKey,
          template_params: {
            to_email: options.to,
            subject: options.subject,
            otp_code: options.otpCode || '',
            message: options.text || options.subject,
            html_content: options.html,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`EmailJS ${response.status}: ${text}`);
      }

      return {
        success: true,
        messageId: `emailjs-${Date.now()}`,
        provider: 'EMAILJS',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya EmailJS: ${err.message}`,
        provider: 'EMAILJS',
      };
    }
  }

  // Fallback if not configured
  return {
    success: false,
    error: `Mtoa huduma wa barua pepe (${provider}) hajatambuliwa au haujawezeshwa.`,
    provider,
  };
}

/**
 * Send real SMS via selected Tanzania or International SMS Gateway
 */
export async function sendRealSms(
  config: any,
  options: SmsSendOptions
): Promise<{ success: boolean; messageId?: string; error?: string; provider: string }> {
  const provider = config?.provider || 'BEEM';
  const cleanPhone = formatTanzaniaPhone(options.toPhone);
  const senderId = options.senderId || config?.senderId || 'INFOTECH';

  // 1. BEEM AFRICA (Tanzania's #1 SMS Gateway)
  // Endpoint: https://api.beem.africa/v1/send
  if (provider === 'BEEM') {
    const apiKey = config?.beemApiKey || process.env.BEEM_API_KEY;
    const secretKey = config?.beemSecretKey || process.env.BEEM_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return {
        success: false,
        error: 'API Key au Secret Key ya Beem Africa haijawekwa kwenye SMS Gateway.',
        provider: 'BEEM',
      };
    }

    try {
      const basicAuth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
      const response = await fetch('https://api.beem.africa/v1/send', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_addr: senderId,
          schedule_time: '',
          encoding: '0',
          message: options.message,
          recipients: [
            {
              recipient_id: 1,
              dest_addr: cleanPhone,
            },
          ],
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.code !== 100) {
        throw new Error(resData?.message || `Beem Error Code ${resData?.code}`);
      }

      return {
        success: true,
        messageId: `beem-${Date.now()}`,
        provider: 'BEEM',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya Beem Africa SMS: ${err.message}`,
        provider: 'BEEM',
      };
    }
  }

  // 2. NEXTSMS TANZANIA
  // Endpoint: https://messaging-service.co.tz/api/sms/v1/text/single
  if (provider === 'NEXTSMS') {
    const username = config?.nextsmsUsername || process.env.NEXTSMS_USERNAME;
    const password = config?.nextsmsPassword || process.env.NEXTSMS_PASSWORD;

    if (!username || !password) {
      return {
        success: false,
        error: 'Username au Password ya NextSMS haijawekwa kwenye mipangilio.',
        provider: 'NEXTSMS',
      };
    }

    try {
      const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await fetch('https://messaging-service.co.tz/api/sms/v1/text/single', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          from: senderId,
          to: cleanPhone,
          text: options.message,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.description || `NextSMS HTTP ${response.status}`);
      }

      return {
        success: true,
        messageId: resData?.messages?.[0]?.messageId || `nextsms-${Date.now()}`,
        provider: 'NEXTSMS',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya NextSMS: ${err.message}`,
        provider: 'NEXTSMS',
      };
    }
  }

  // 3. TWILIO SMS
  if (provider === 'TWILIO') {
    const accountSid = config?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = config?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = config?.twilioFromNumber || process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        error: 'Taarifa za Twilio (Account SID, Auth Token, From Number) hazijakamilika.',
        provider: 'TWILIO',
      };
    }

    try {
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', '+' + cleanPhone);
      params.append('From', fromNumber);
      params.append('Body', options.message);

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        }
      );

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData?.message || `Twilio HTTP ${response.status}`);
      }

      return {
        success: true,
        messageId: resData.sid,
        provider: 'TWILIO',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya Twilio SMS: ${err.message}`,
        provider: 'TWILIO',
      };
    }
  }

  // 4. CUSTOM WEBHOOK / HTTP SMS GATEWAY
  if (provider === 'CUSTOM_HTTP') {
    const webhookUrl = config?.customWebhookUrl;
    if (!webhookUrl) {
      return {
        success: false,
        error: 'URL ya Custom SMS Webhook haijawekwa.',
        provider: 'CUSTOM_HTTP',
      };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.customApiKey ? { Authorization: `Bearer ${config.customApiKey}` } : {}),
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: options.message,
          senderId,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom SMS Gateway ilirudisha HTTP ${response.status}`);
      }

      return {
        success: true,
        messageId: `custom-sms-${Date.now()}`,
        provider: 'CUSTOM_HTTP',
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Hitilafu ya Custom SMS Gateway: ${err.message}`,
        provider: 'CUSTOM_HTTP',
      };
    }
  }

  return {
    success: false,
    error: `Mtoa huduma wa SMS (${provider}) hajatambuliwa.`,
    provider,
  };
}
