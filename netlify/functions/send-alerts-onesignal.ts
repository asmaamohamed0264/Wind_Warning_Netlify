// netlify/functions/send-alerts-onesignal.ts
import type { Handler } from '@netlify/functions';

const APP_ID  = process.env.VITE_ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const API_KEY = process.env.VITE_ONESIGNAL_API_KEY!; // REST API KEY (server-side only)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const EMAIL_FROM_NAME    = process.env.EMAIL_FROM_NAME || 'Wind Alert';
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS; // ex: alerts@domeniu.ro
const SMS_FROM = process.env.ONESIGNAL_SMS_FROM || process.env.TWILIO_PHONE_NUMBER; // +407...

const OS_URL = 'https://onesignal.com/api/v1/notifications';

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin === '*' ? '*' : origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
}

async function osRequest(payload: any) {
  const res = await fetch(OS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${JSON.stringify(json)}`);
  return json;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(ALLOWED_ORIGIN), body: '' };
  }

  const headers = corsHeaders(ALLOWED_ORIGIN);

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const level = String(body.level || 'TEST').toUpperCase(); // TEST/CAUTION/WARNING/DANGER
    const wind  = Number(body.wind || 35);
    const place = String(body.place || 'Aleea Someșul Cald');
    const title = `Alertă vânt – ${level}`;
    const text  = `Vânt ${wind} km/h în ${place}.`;

    // 1) PUSH
    await osRequest({
      app_id: APP_ID,
      included_segments: ['Subscribed Users'],
      target_channel: 'push',
      headings: { en: title, ro: title },
      contents: { en: text,  ro: text  },
      data: { level, wind, place },
    });

    // 2) EMAIL (toți abonații email)
    await osRequest({
      app_id: APP_ID,
      included_segments: ['Total Subscriptions'],
      filters: [{ field: 'device_type', relation: '=', value: 'email' }],
      target_channel: 'email',
      email_subject: `【${level}】 ${text}`,
      email_body: `
        <html><body style="font-family:Arial,sans-serif">
          <h2>${title}</h2>
          <p>${text}</p>
          <p>Recomandări: rămâneți în interior, securizați obiectele ușoare.</p>
          <hr/>
          <p style="color:#666">Monitor Vânt – Aleea Someșul Cald</p>
        </body></html>
      `,
      email_from_name: EMAIL_FROM_NAME,
      ...(EMAIL_FROM_ADDRESS ? { email_from_address: EMAIL_FROM_ADDRESS } : {}),
    });

    // 3) SMS (toți abonații sms)
    if (SMS_FROM) {
      await osRequest({
        app_id: APP_ID,
        included_segments: ['Total Subscriptions'],
        filters: [{ field: 'device_type', relation: '=', value: 'sms' }],
        target_channel: 'sms',
        sms_from: SMS_FROM, // ex: +40712345678
        sms_body: `ALERTĂ VÂNT ${level}: ${wind} km/h în ${place}. Rămâneți în siguranță.`,
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    console.error('[send-alerts-onesignal] error:', err?.message || err);
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: String(err?.message || err) }) };
  }
};
