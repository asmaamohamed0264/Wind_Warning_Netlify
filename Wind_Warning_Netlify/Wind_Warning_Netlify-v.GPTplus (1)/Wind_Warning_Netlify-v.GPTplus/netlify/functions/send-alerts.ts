import type { Handler } from "@netlify/functions";
import * as OneSignal from '@onesignal/node-onesignal';

/**
 * ENV (Netlify):
 *  - VITE_ONESIGNAL_API_KEY = <REST API Key>
 *  - VITE_ONESIGNAL_APP_ID  = <App ID>
 *  - ALLOWED_ORIGIN         = "*" sau domeniul tău
 */

// Acces ENV safe (evităm substituții la build)
const getEnv = (key: string) =>
  (globalThis as any)?.['process']?.['env']?.[key] as string | undefined;

const ONESIGNAL_API_KEY = getEnv('VITE_ONESIGNAL_API_KEY') || "";
const ONESIGNAL_APP_ID  = getEnv('VITE_ONESIGNAL_APP_ID')  || "";
const ALLOWED_ORIGIN    = getEnv('ALLOWED_ORIGIN')         || "*";

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

const json = (statusCode: number, data: unknown) => ({
  statusCode,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// OneSignal client
const configuration = OneSignal.createConfiguration({
  authMethods: {
    rest_api_key: {
      tokenProvider: { getToken() { return ONESIGNAL_API_KEY; } },
    },
  },
});
const onesignalClient = new OneSignal.DefaultApi(configuration);

// map nivel -> stil
function getAlertConfig(level: string) {
  const configs = {
    danger:  { priority: 10, color: "#ef4444", emoji: "🚨", urgency: "high"  as const, sound: "alarm" },
    warning: { priority:  8, color: "#f59e0b", emoji: "⚠️",  urgency: "high"  as const, sound: "notification" },
    caution: { priority:  6, color: "#f97316", emoji: "💨",  urgency: "normal"as const, sound: "notification" },
    default: { priority:  4, color: "#3b82f6", emoji: "🌪️",  urgency: "normal"as const, sound: "default" },
  };
  return configs[level as keyof typeof configs] || configs.default;
}

function formatAlertTitle(level: string, windSpeed: number): string {
  const c = getAlertConfig(level);
  if (level === 'danger')  return `${c.emoji} PERICOL MAJOR - Vânt ${windSpeed} km/h`;
  if (level === 'warning') return `${c.emoji} AVERTIZARE VÂNT - ${windSpeed} km/h`;
  if (level === 'caution') return `${c.emoji} ATENȚIE VÂNT - ${windSpeed} km/h`;
  return `${c.emoji} Monitor Vânt - ${windSpeed} km/h`;
}

function formatAlertMessage(level: string, windSpeed: number): string {
  const base = `Aleea Someșul Cald, București`;
  if (level === 'danger')  return `${base}\n\n🚨 PERICOL MAJOR! Vânturi de până la ${windSpeed} km/h. Rămâi în interior și fixează obiectele mobile.`;
  if (level === 'warning') return `${base}\n\n⚠️ Vânturi puternice prognozate! Până la ${windSpeed} km/h. Exercită precauție extremă.`;
  if (level === 'caution') return `${base}\n\n💨 Vânturi moderate. Până la ${windSpeed} km/h. Fii atent la schimbările de condiții.`;
  return `${base}\n\nMonitorizare vânt: ${windSpeed} km/h`;
}

function normalizePayload(input: any) {
  const nowISO = new Date().toISOString();
  const wind = Number(input?.windSpeed ?? 0);
  let level = input?.level;
  if (!level) {
    if (wind >= 80) level = "danger";
    else if (wind >= 65) level = "warning";
    else if (wind >= 50) level = "caution";
    else level = "normal";
  }
  return {
    level,
    windSpeed: wind,
    time: input?.time || nowISO,
    message: input?.message || formatAlertMessage(level, wind),
    title: input?.title || formatAlertTitle(level, wind),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    return json(500, {
      ok: false,
      error: "OneSignal is not configured on server",
      detail: {
        ONESIGNAL_API_KEY: ONESIGNAL_API_KEY ? "set" : "missing",
        ONESIGNAL_APP_ID : ONESIGNAL_APP_ID  ? "set" : "missing",
      },
    });
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const wind = Number(body?.windSpeed ?? 0);
  if (Number.isNaN(wind) || wind <= 0) {
    return json(400, { ok: false, error: "windSpeed must be a positive number" });
  }

  const payload = normalizePayload(body);
  const config  = getAlertConfig(payload.level);

  // canale dorite
  const channelsInput = Array.isArray(body?.channels)
    ? body.channels.map((c: any) => String(c).toLowerCase())
    : null;
  const wantPush  = !channelsInput || channelsInput.includes('push');
  const wantEmail = !channelsInput || channelsInput.includes('email');
  const wantSMS   = !channelsInput || channelsInput.includes('sms');

  // ținte explicite (dacă le-ai trimis din client)
  const subscriptionId  = typeof body?.subscriptionId === 'string' && body.subscriptionId.trim() ? body.subscriptionId.trim() : null;
  const emailToken      = typeof body?.email === 'string' && body.email.includes('@') ? body.email.trim() : null;
  const phoneE164       = typeof body?.phoneE164 === 'string' && body.phoneE164.startsWith('+') ? body.phoneE164.trim() : null;

  try {
    const n = new OneSignal.Notification();
    n.app_id = ONESIGNAL_APP_ID;

    // Conținut push
    if (wantPush) {
      n.headings = { en: payload.title } as any;
      n.contents = { en: payload.message } as any;
    }

    // Config avansate (iconițe, culori)
    n.priority              = config.priority;
    n.android_accent_color  = config.color;
    n.chrome_web_badge      = "/1000088934-modified.png";
    n.chrome_web_icon       = "/1000088934-modified.png";
    n.firefox_icon          = "/1000088934-modified.png";
    n.url                   = getEnv('URL') || "https://admirable-sherbet-bfa64f.netlify.app";

    if (payload.level === 'danger') {
      n.android_sound      = "alarm";
      n.ios_sound          = "alarm.wav";
      n.android_led_color  = "FFFF0000";
      n.android_visibility = 1;
    }

    // Date custom
    n.data = {
      type: "wind_alert",
      level: payload.level,
      windSpeed: payload.windSpeed,
      location: "Aleea Someșul Cald",
      timestamp: payload.time
    } as any;

    // Email (dacă vrei și email)
    if (wantEmail && payload.level !== 'normal') {
      n.email_subject = payload.title;
      n.email_body    = generateEmailHTML(payload);
    }

    // SMS (dacă vrei și sms)
    if (wantSMS && payload.level !== 'normal') {
      // OneSignal folosește sender-ul din Settings → SMS → Sender (nu un env local)
      // Setăm textul prin contents / sms-specific data
      // (fără atașamente aici)
    }

    // Țintire:
    // 1) Push țintit dacă ai subscriptionId
    if (subscriptionId && wantPush) {
      (n as any).include_subscription_ids = [subscriptionId];
    }

    // 2) Email/SMS țintit dacă ai tokenuri
    if (emailToken && wantEmail) {
      (n as any).include_email_tokens = [emailToken];
    }
    if (phoneE164 && wantSMS) {
      (n as any).include_phone_numbers = [phoneE164];
    }

    // 3) Fallback: dacă nu ai ținte deloc, trimite către segmentul implicit
    const hasAnyDirectTarget =
      (n as any).include_subscription_ids ||
      (n as any).include_email_tokens ||
      (n as any).include_phone_numbers;

    if (!hasAnyDirectTarget) {
      n.included_segments = ["Subscribed Users"]; // push clasic
    }

    // Limitează canalul dacă ai cerut exact unul
    if (channelsInput && channelsInput.length === 1) {
      const only = channelsInput[0];
      if (only === 'push' || only === 'email' || only === 'sms') {
        (n as any).target_channel = only;
      }
    }

    console.log(
      `Sending OS notification: level=${payload.level} wind=${payload.windSpeed} ` +
      `targets: subId=${subscriptionId ?? '-'} email=${emailToken ?? '-'} phone=${phoneE164 ?? '-'}`
    );

    const resp = await onesignalClient.createNotification(n as any);
    const anyRes: any = resp as any;

    return json(200, {
      ok: true,
      provider: "OneSignal",
      appId: ONESIGNAL_APP_ID,
      notificationId: anyRes?.id ?? anyRes?.data?.id ?? null,
      recipients: anyRes?.recipients ?? anyRes?.data?.recipients ?? undefined,
      directTargets: {
        push: Boolean(subscriptionId),
        email: Boolean(emailToken),
        sms: Boolean(phoneE164),
      }
    });

  } catch (err: any) {
    console.error("OneSignal notification failed:", err?.message || err);
    if (err?.response?.data) {
      console.error("OneSignal API Error:", JSON.stringify(err.response.data, null, 2));
    }
    return json(500, {
      ok: false,
      error: "Failed to send notification via OneSignal",
      detail: String(err?.message || err),
      provider: "OneSignal"
    });
  }
};

// HTML pentru email
function generateEmailHTML(payload: any): string {
  const c = getAlertConfig(payload.level);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Alertă Vânt</title></head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f3f4f6">
    <div style="max-width:600px;margin:0 auto;background:#fff">
      <div style="background:linear-gradient(135deg,#1f2937 0%,#374151 100%);padding:20px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">${c.emoji} Monitor Vânt Aleea Someșul Cald</h1>
        <p style="color:#d1d5db;margin:8px 0 0 0;font-size:14px">Alertă ${payload.level.toUpperCase()} - ${payload.windSpeed} km/h</p>
      </div>
      <div style="background:${c.color};color:#fff;padding:20px;text-align:center">
        <h2 style="margin:0;font-size:18px">${payload.title}</h2>
      </div>
      <div style="padding:20px">
        <p style="color:#374151;line-height:1.6;white-space:pre-line;">${payload.message}</p>
        <div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:6px;color:#6b7280;font-size:14px">
          📍 Locație: Aleea Someșul Cald, București<br>
          ⏰ Ora alertei: ${new Date().toLocaleString('ro-RO')}<br>
          🌪️ Viteza vântului: ${payload.windSpeed} km/h
        </div>
      </div>
      <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="margin:0;color:#6b7280;font-size:12px">Powered by OneSignal • Monitor Vânt Aleea Someșul Cald</p>
      </div>
    </div>
  </body></html>`;
}
