// netlify/functions/send-alerts-onesignal.ts
import type { Handler } from '@netlify/functions';

// === Config din environment (Netlify injectează env-urile la build/runtime) ===
const APP_ID: string =
  process.env.VITE_ONESIGNAL_APP_ID ??
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ??
  '';

const API_KEY: string = process.env.VITE_ONESIGNAL_API_KEY ?? '';

const ALLOWED_ORIGIN: string = process.env.ALLOWED_ORIGIN ?? '*';

const EMAIL_FROM_NAME: string = process.env.EMAIL_FROM_NAME ?? 'Wind Alert';
const EMAIL_FROM_ADDRESS: string | undefined = process.env.EMAIL_FROM_ADDRESS; // ex: alerts@domeniu.ro

// Prefer OneSignal SMS sender; dacă lipsește, folosește Twilio sender dacă există
const SMS_FROM: string | undefined =
  process.env.ONESIGNAL_SMS_FROM ?? process.env.TWILIO_PHONE_NUMBER;

// REST endpoint OneSignal
const OS_URL = 'https://onesignal.com/api/v1/notifications';

// === Utilitare ===
function corsHeaders(origin: string) {
  // dacă pui un origin specific, îl întoarcem ca atare; altfel '*'
  const allowOrigin = origin === '*' ? '*' : origin;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json',
  };
}

async function osRequest(payload: unknown) {
  const res = await fetch(OS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} – ${JSON.stringify(json)}`);
  }
  return json;
}

function assertRuntimeConfig() {
  if (!APP_ID) {
    console.warn(
      '[send-alerts-onesignal] Missing APP_ID (set VITE_ONESIGNAL_APP_ID sau NEXT_PUBLIC_ONESIGNAL_APP_ID).'
    );
  }
  if (!API_KEY) {
    console.warn('[send-alerts-onesignal] Missing API_KEY (set VITE_ONESIGNAL_API_KEY).');
  }
}

// === Handler Netlify ===
export const handler: Handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(ALLOWED_ORIGIN), body: '' };
  }

  const headers = corsHeaders(ALLOWED_ORIGIN);

  try {
    assertRuntimeConfig();

    // Parse body
    const body = event.body ? JSON.parse(event.body) : {};
    const level = String(body.level ?? 'TEST').toUpperCase(); // TEST | CAUTION | WARNING | DANGER
    const wind = Number(body.wind ?? 35);
    const place = String(body.place ?? 'Aleea Someșul Cald');

    const title = `Alertă vânt – ${level}`;
    const text = `Vânt ${Number.isFinite(wind) ? wind : 0} km/h în ${place}.`;

    // Securitate minimă: dacă lipsesc cheile esențiale, nu încercăm request-urile
    if (!APP_ID || !API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error:
            'OneSignal server config missing: APP_ID și/sau API_KEY lipsesc. Verifică variabilele de mediu Netlify.',
        }),
      };
    }

    // 1) PUSH – toți abonații push
    await osRequest({
      app_id: APP_ID,
      included_segments: ['Subscribed Users'],
      target_channel: 'push',
      headings: { en: title, ro: title },
      contents: { en: text, ro: text },
      data: { level, wind, place },
    });

    // 2) EMAIL – toți abonații email
    await osRequest({
      app_id: APP_ID,
      included_segments: ['Total Subscriptions'],
      // Filtrăm doar dispozitivele tip email
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

    // 3) SMS – toți abonații sms (doar dacă avem un sender configurat)
    if (SMS_FROM) {
      await osRequest({
        app_id: APP_ID,
        included_segments: ['Total Subscriptions'],
        filters: [{ field: 'device_type', relation: '=', value: 'sms' }],
        target_channel: 'sms',
        sms_from: SMS_FROM, // ex: +40712345678 sau număr OneSignal/Twilio configurat
        sms_body: `ALERTĂ VÂNT ${level}: ${wind} km/h în ${place}. Rămâneți în siguranță.`,
      });
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-alerts-onesignal] error:', message);
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: message }) };
  }
};
