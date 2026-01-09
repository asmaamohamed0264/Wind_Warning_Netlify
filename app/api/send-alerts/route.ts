import { NextResponse } from 'next/server';
import { SendAlertRequestSchema } from '@/types/alerts';
import { rateLimit, getClientIp } from '@/lib/ratelimit';

// === Config din environment ===
const APP_ID: string =
  process.env.VITE_ONESIGNAL_APP_ID ??
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ??
  '';

const API_KEY: string = process.env.VITE_ONESIGNAL_API_KEY ?? '';

const EMAIL_FROM_NAME: string = process.env.EMAIL_FROM_NAME ?? 'Wind Alert';
const EMAIL_FROM_ADDRESS: string | undefined = process.env.EMAIL_FROM_ADDRESS;

const SMS_FROM: string | undefined =
  process.env.ONESIGNAL_SMS_FROM ?? process.env.TWILIO_PHONE_NUMBER;

// OneSignal REST endpoint
const OS_URL = 'https://onesignal.com/api/v1/notifications';

// === Utilitare ===
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
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${JSON.stringify(json)}`);
  return json;
}

function assertRuntimeConfig() {
  if (!APP_ID) {
    console.warn('[send-alerts] Missing APP_ID');
  }
  if (!API_KEY) {
    console.warn('[send-alerts] Missing API_KEY');
  }
}

// === Handler Next.js ===
export async function POST(request: Request) {
  try {
    // Rate limiting: 5 requests / minut / IP
    const clientIp = getClientIp(request.headers);
    const rateLimitResult = await rateLimit(clientIp, { requests: 5, window: 60000 });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      );
    }

    assertRuntimeConfig();

    // Validare request body cu Zod
    const body = await request.json();
    const validationResult = SendAlertRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { level = 'CAUTION', windSpeed, time, message, place = 'Aleea Someșul Cald' } = validationResult.data;

    const levelUpper = level.toUpperCase();
    const title = `Alertă vânt – ${levelUpper}`;
    const text = message || `Vânt ${Math.round(windSpeed)} km/h în ${place}.`;

    // Verifică configurația OneSignal
    if (!APP_ID || !API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: 'OneSignal server config missing: APP_ID și/sau API_KEY lipsesc.',
        },
        { status: 500 }
      );
    }

    // 1) PUSH – toți abonații push
    await osRequest({
      app_id: APP_ID,
      included_segments: ['Subscribed Users'],
      target_channel: 'push',
      headings: { en: title, ro: title },
      contents: { en: text, ro: text },
      data: { level: levelUpper, windSpeed, place, time },
    });

    // 2) EMAIL – toți abonații email
    await osRequest({
      app_id: APP_ID,
      included_segments: ['Total Subscriptions'],
      filters: [{ field: 'device_type', relation: '=', value: 'email' }],
      target_channel: 'email',
      email_subject: `【${levelUpper}】 ${text}`,
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

    // 3) SMS – toți abonații sms (dacă avem sender)
    if (SMS_FROM) {
      await osRequest({
        app_id: APP_ID,
        included_segments: ['Total Subscriptions'],
        filters: [{ field: 'device_type', relation: '=', value: 'sms' }],
        target_channel: 'sms',
        sms_from: SMS_FROM,
        sms_body: `ALERTĂ VÂNT ${levelUpper}: ${Math.round(windSpeed)} km/h în ${place}. Rămâneți în siguranță.`,
      });
    }

    return NextResponse.json(
      { ok: true, message: 'Notifications sent successfully' },
      {
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-alerts] error:', message);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
