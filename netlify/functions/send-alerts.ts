import type { Handler } from "@netlify/functions";
import * as OneSignal from "@onesignal/node-onesignal";

/**
 * ENV necesare (Netlify):
 *  - VITE_ONESIGNAL_API_KEY  = <cheie REST OneSignal>
 *  - VITE_ONESIGNAL_APP_ID   = <app id OneSignal>
 *  - ONESIGNAL_SMS_FROM      = <ID/număr SMS din OneSignal> (opțional; necesar pentru SMS)
 *  - ALLOWED_ORIGIN          = https://wind.qub3.uk (sau "*" pentru test)
 *  - URL                     = https://wind.qub3.uk (URL pentru click pe push)
 *
 * OneSignal unifică canalele, dar pentru livrare corectă trimitem câte o
 * notificare per canal: "Subscribed Users" (push), "Email Subscribed Users",
 * "SMS Subscribed Users".
 */

// Accesăm variabilele de mediu dinamic; evităm literalii "process.env"
const getEnv = (key: string) =>
  ((globalThis as any)?.["process"]?.["env"]?.[key] as string | undefined);

const ONESIGNAL_API_KEY = getEnv("VITE_ONESIGNAL_API_KEY") || "";
const ONESIGNAL_APP_ID = getEnv("VITE_ONESIGNAL_APP_ID") || "";
const ONESIGNAL_SMS_FROM = getEnv("ONESIGNAL_SMS_FROM") || "";
const ALLOWED_ORIGIN = getEnv("ALLOWED_ORIGIN") || "*";
const APP_URL = getEnv("URL") || "https://wind.qub3.uk";

// CORS
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
};

const json = (statusCode: number, data: unknown) => ({
  statusCode,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

// Configurare client OneSignal
const configuration = OneSignal.createConfiguration({
  authMethods: {
    rest_api_key: {
      tokenProvider: {
        getToken() {
          return ONESIGNAL_API_KEY;
        },
      },
    },
  },
});
const onesignalClient = new OneSignal.DefaultApi(configuration);

// Mapare niveluri de alertă
function getAlertConfig(level: string) {
  const configs = {
    danger: {
      priority: 10,
      color: "#ef4444",
      emoji: "🚨",
    },
    warning: {
      priority: 8,
      color: "#f59e0b",
      emoji: "⚠️",
    },
    caution: {
      priority: 6,
      color: "#f97316",
      emoji: "💨",
    },
    default: {
      priority: 4,
      color: "#3b82f6",
      emoji: "🌪️",
    },
  };
  return configs[(level as keyof typeof configs) || "default"] || configs.default;
}

function formatAlertTitle(level: string, windSpeed: number): string {
  const c = getAlertConfig(level);
  switch (level) {
    case "danger":
      return `${c.emoji} PERICOL MAJOR - Vânt ${windSpeed} km/h`;
    case "warning":
      return `${c.emoji} AVERTIZARE VÂNT - ${windSpeed} km/h`;
    case "caution":
      return `${c.emoji} ATENȚIE VÂNT - ${windSpeed} km/h`;
    default:
      return `${c.emoji} Monitor Vânt - ${windSpeed} km/h`;
  }
}

function formatAlertMessage(level: string, windSpeed: number): string {
  const base = `Aleea Someșul Cald, București`;
  switch (level) {
    case "danger":
      return `${base}\n\n🚨 PERICOL MAJOR! Vânturi de până la ${windSpeed} km/h. Rămâi în interior și fixează obiectele mobile.`;
    case "warning":
      return `${base}\n\n⚠️ Vânturi puternice prognozate! Până la ${windSpeed} km/h. Exercită precauție sporită.`;
    case "caution":
      return `${base}\n\n💨 Vânturi moderate. Până la ${windSpeed} km/h. Fii atent la schimbările de condiții.`;
    default:
      return `${base}\n\nMonitorizare vânt: ${windSpeed} km/h`;
  }
}

// Normalizează payload
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
  };
}

// Text SMS scurt (160 caractere)
const smsText = (p: { level: string; windSpeed: number; message: string }) =>
  `[${formatAlertTitle(p.level, p.windSpeed)}] ${p.message}`
    .replace(/\s+/g, " ")
    .slice(0, 160);

export const handler: Handler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method Not Allowed" });
  }

  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    return json(500, {
      ok: false,
      error: "OneSignal nu este configurat pe server",
      detail: {
        ONESIGNAL_API_KEY: ONESIGNAL_API_KEY ? "set" : "missing",
        ONESIGNAL_APP_ID: ONESIGNAL_APP_ID ? "set" : "missing",
      },
    });
  }

  // Parse body
  let body: any = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  // Validare minimă
  const wind = Number(body?.windSpeed ?? 0);
  if (!Number.isFinite(wind) || wind <= 0) {
    return json(400, { ok: false, error: "windSpeed must be a positive number" });
  }

  const payload = normalizePayload(body);
  const cfg = getAlertConfig(payload.level);

  const channelsInput = Array.isArray(body?.channels)
    ? body.channels.map((c: any) => String(c).toLowerCase())
    : null;

  const wantPush = !channelsInput || channelsInput.includes("push");
  const wantEmail = !channelsInput || channelsInput.includes("email");
  const wantSMS = !channelsInput || channelsInput.includes("sms");

  try {
    const jobs: Promise<any>[] = [];

    // --- PUSH: Subscribed Users ---
    if (wantPush) {
      const n = new OneSignal.Notification();
      n.app_id = ONESIGNAL_APP_ID;
      n.included_segments = ["Subscribed Users"];
      n.headings = { en: formatAlertTitle(payload.level, payload.windSpeed) } as any;
      n.contents = { en: payload.message } as any;

      // setări vizuale
      n.priority = cfg.priority;
      n.android_accent_color = cfg.color;
      n.chrome_web_badge = "/1000088934-modified.png";
      n.chrome_web_icon = "/1000088934-modified.png";
      n.firefox_icon = "/1000088934-modified.png";
      n.url = APP_URL;

      if (payload.level === "danger") {
        n.android_sound = "alarm";
        n.ios_sound = "alarm.wav";
        n.android_led_color = "FFFF0000";
        n.android_visibility = 1; // PUBLIC
      }

      n.data = {
        type: "wind_alert",
        level: payload.level,
        windSpeed: payload.windSpeed,
        location: "Aleea Someșul Cald",
        timestamp: payload.time,
      };

      jobs.push(onesignalClient.createNotification(n));
    }

    // --- EMAIL: Email Subscribed Users ---
    if (wantEmail && payload.level !== "normal") {
      const n = new OneSignal.Notification();
      n.app_id = ONESIGNAL_APP_ID;
      n.included_segments = ["Email Subscribed Users"];
      (n as any).target_channel = "email";

      n.email_subject = formatAlertTitle(payload.level, payload.windSpeed);
      n.email_body = generateEmailHTML(payload);

      jobs.push(onesignalClient.createNotification(n));
    }

    // --- SMS: SMS Subscribed Users ---
    if (wantSMS && payload.level !== "normal") {
      if (!ONESIGNAL_SMS_FROM) {
        console.warn("ONESIGNAL_SMS_FROM nu este setat — omit SMS.");
      } else {
        const n = new OneSignal.Notification();
        n.app_id = ONESIGNAL_APP_ID;
        n.included_segments = ["SMS Subscribed Users"];
        (n as any).target_channel = "sms";
        (n as any).sms_from = ONESIGNAL_SMS_FROM;
        n.contents = { en: smsText(payload) } as any;

        jobs.push(onesignalClient.createNotification(n));
      }
    }

    if (!jobs.length) {
      return json(400, { ok: false, error: "Niciun canal selectat pentru trimitere" });
    }

    console.log(
      `OneSignal send: push=${wantPush} email=${wantEmail} sms=${wantSMS} (${payload.level} ${payload.windSpeed}km/h)`
    );

    const responses = await Promise.all(jobs);

    return json(200, {
      ok: true,
      provider: "OneSignal",
      ids: responses.map((r: any) => r?.id ?? r?.data?.id ?? null),
      level: payload.level,
      windSpeed: payload.windSpeed,
      message: "Alerte trimise prin OneSignal",
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
      provider: "OneSignal",
    });
  }
};

// Generează HTML pentru email
function generateEmailHTML(payload: any): string {
  const c = getAlertConfig(payload.level);
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alertă Vânt - Monitor Aleea Someșul Cald</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <div style="background:linear-gradient(135deg,#1f2937 0%,#374151 100%);padding:20px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:24px;">
        ${c.emoji} Monitor Vânt Aleea Someșul Cald
      </h1>
      <p style="color:#d1d5db;margin:8px 0 0 0;font-size:14px;">
        Alertă ${payload.level.toUpperCase()} - ${payload.windSpeed} km/h
      </p>
    </div>

    <div style="background-color:${c.color};color:#ffffff;padding:20px;text-align:center;">
      <h2 style="margin:0;font-size:18px;">
        ${formatAlertTitle(payload.level, payload.windSpeed)}
      </h2>
    </div>

    <div style="padding:20px;">
      <p style="color:#374151;line-height:1.6;white-space:pre-line;">
        ${payload.message}
      </p>
      <div style="margin-top:20px;padding:16px;background-color:#f9fafb;border-radius:6px;">
        <p style="margin:0;color:#6b7280;font-size:14px;">
          📍 Locație: Aleea Someșul Cald, București<br/>
          ⏰ Ora alertei: ${new Date().toLocaleString("ro-RO")}<br/>
          🌪️ Viteza vântului: ${payload.windSpeed} km/h
        </p>
      </div>
    </div>

    <div style="background-color:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#6b7280;font-size:12px;">
        Powered by OneSignal • Monitor Vânt Aleea Someșul Cald
      </p>
    </div>
  </div>
</body>
</html>`;
}
