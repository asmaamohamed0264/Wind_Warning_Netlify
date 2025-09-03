import type { Handler } from "@netlify/functions";
import * as OneSignal from '@onesignal/node-onesignal';

/**
 * ENV necesare (Netlify):
 *  - VITE_ONESIGNAL_API_KEY = <cheie REST OneSignal>
 *  - VITE_ONESIGNAL_APP_ID = <app id OneSignal>
 *
 * OneSignal unifică toate notificările: Push, SMS, Email
 */

// Accesăm variabilele de mediu dinamic; evităm literalii "process.env" ca să nu fie înlocuiți de plugin
const getEnv = (key: string) => (
  (globalThis as any)?.['process']?.['env']?.[key] as string | undefined
);
const ONESIGNAL_API_KEY = getEnv('VITE_ONESIGNAL_API_KEY') || "";
const ONESIGNAL_APP_ID = getEnv('VITE_ONESIGNAL_APP_ID') || "";
const ALLOWED_ORIGIN = getEnv('ALLOWED_ORIGIN') || "*";

// CORS
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

// Configurare OneSignal
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

// Mapare niveluri de alertă la culori și priorități
function getAlertConfig(level: string) {
  const configs = {
    danger: {
      priority: 10,
      color: "#ef4444",
      emoji: "🚨",
      urgency: "high" as const,
      sound: "alarm"
    },
    warning: {
      priority: 8,
      color: "#f59e0b", 
      emoji: "⚠️",
      urgency: "high" as const,
      sound: "notification"
    },
    caution: {
      priority: 6,
      color: "#f97316",
      emoji: "💨",
      urgency: "normal" as const,
      sound: "notification"
    },
    default: {
      priority: 4,
      color: "#3b82f6",
      emoji: "🌪️",
      urgency: "normal" as const,
      sound: "default"
    }
  };
  
  return configs[level as keyof typeof configs] || configs.default;
}

function formatAlertTitle(level: string, windSpeed: number): string {
  const config = getAlertConfig(level);
  switch (level) {
    case 'danger':
      return `${config.emoji} PERICOL MAJOR - Vânt ${windSpeed} km/h`;
    case 'warning':
      return `${config.emoji} AVERTIZARE VÂNT - ${windSpeed} km/h`;
    case 'caution':
      return `${config.emoji} ATENȚIE VÂNT - ${windSpeed} km/h`;
    default:
      return `${config.emoji} Monitor Vânt - ${windSpeed} km/h`;
  }
}

function formatAlertMessage(level: string, windSpeed: number): string {
  const baseMessage = `Aleea Someșul Cald, București`;
  
  switch (level) {
    case 'danger':
      return `${baseMessage}\n\n🚨 PERICOL MAJOR! Vânturi de până la ${windSpeed} km/h. Rămâi în interior și fixează toate obiectele mobile.`;
    case 'warning':
      return `${baseMessage}\n\n⚠️ Vânturi puternice prognozate! Până la ${windSpeed} km/h. Exercită precauție extremă.`;
    case 'caution':
      return `${baseMessage}\n\n💨 Vânturi moderate. Până la ${windSpeed} km/h. Fii atent la schimbările de condiții.`;
    default:
      return `${baseMessage}\n\nMonitorizare vânt: ${windSpeed} km/h`;
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
      error: "OneSignal is not configured on server",
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

  // Validare
  const wind = Number(body?.windSpeed ?? 0);
  if (Number.isNaN(wind) || wind <= 0) {
    return json(400, { ok: false, error: "windSpeed must be a positive number" });
  }

  const payload = normalizePayload(body);
  const config = getAlertConfig(payload.level);

  try {
    // Construiește notificarea OneSignal
    const notification = new OneSignal.Notification();
    notification.app_id = ONESIGNAL_APP_ID;
    
    // Conținut notificare
    notification.headings = { en: formatAlertTitle(payload.level, payload.windSpeed) };
    notification.contents = { en: payload.message };
    
    // Configurări avansate
    notification.priority = config.priority;
    notification.android_accent_color = config.color;
    notification.chrome_web_badge = "/1000088934-modified.png";
    notification.chrome_web_icon = "/1000088934-modified.png";
    notification.firefox_icon = "/1000088934-modified.png";
    
    // URL pentru click
    notification.url = getEnv('URL') || "https://admirable-sherbet-bfa64f.netlify.app";
    
    // Sound și vibrație
    if (payload.level === 'danger') {
      notification.android_sound = "alarm";
      notification.ios_sound = "alarm.wav";
      notification.android_led_color = "FFFF0000";
      notification.android_visibility = 1; // PUBLIC
    }

    // Target: Toți utilizatorii abonați
    notification.included_segments = ["Subscribed Users"];

    // Template pentru email (dacă utilizatorul are email configurat)
    if (payload.level !== 'normal') {
      notification.email_subject = formatAlertTitle(payload.level, payload.windSpeed);
      notification.email_body = generateEmailHTML(payload);
    }

    // Template pentru SMS (dacă utilizatorul are SMS configurat) 
    if (payload.level !== 'normal') {
      notification.sms_from = "WindAlert";
      notification.sms_media_urls = [];
    }

    // Custom data pentru aplicație
    notification.data = {
      type: "wind_alert",
      level: payload.level,
      windSpeed: payload.windSpeed,
      location: "Aleea Someșul Cald",
      timestamp: payload.time
    };

    // Trimite notificarea
    console.log(`Sending OneSignal notification for ${payload.level} alert (${payload.windSpeed} km/h)`);
    
    const response = await onesignalClient.createNotification(notification);
    
    return json(200, {
      ok: true,
      provider: "OneSignal",
      notificationId: response.id,
      recipients: response.recipients,
      level: payload.level,
      windSpeed: payload.windSpeed,
      message: "Alert sent successfully via OneSignal"
    });

  } catch (err: any) {
    console.error("OneSignal notification failed:", err?.message || err);
    
    // Log detaliat pentru debugging
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

// Generează HTML pentru email
function generateEmailHTML(payload: any): string {
  const config = getAlertConfig(payload.level);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Alertă Vânt - Monitor Aleea Someșul Cald</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
            ${config.emoji} Monitor Vânt Aleea Someșul Cald
          </h1>
          <p style="color: #d1d5db; margin: 8px 0 0 0; font-size: 14px;">
            Alertă ${payload.level.toUpperCase()} - ${payload.windSpeed} km/h
          </p>
        </div>
        
        <!-- Alert Content -->
        <div style="background-color: ${config.color}; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px;">
            ${formatAlertTitle(payload.level, payload.windSpeed)}
          </h2>
        </div>
        
        <!-- Message -->
        <div style="padding: 20px;">
          <p style="color: #374151; line-height: 1.6; white-space: pre-line;">
            ${payload.message}
          </p>
          
          <div style="margin-top: 20px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              📍 Locație: Aleea Someșul Cald, București<br>
              ⏰ Ora alertei: ${new Date().toLocaleString('ro-RO')}<br>
              🌪️ Viteza vântului: ${payload.windSpeed} km/h
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            Powered by OneSignal • Monitor Vânt Aleea Someșul Cald
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
