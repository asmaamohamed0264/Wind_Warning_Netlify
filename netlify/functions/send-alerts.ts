// netlify/functions/send-alerts.ts
import type { Handler } from "@netlify/functions";

/**
 * ENV necesare (Netlify → Site settings → Environment variables):
 *  - N8N_WEBHOOK_URL   = https://n8n-coolfy.qub3.uk/webhook/windalert/webhook
 *  - N8N_WEBHOOK_TOKEN = <tokenul din IF token valid din n8n>
 *  - ALLOWED_ORIGIN    = https://admirable-sherbet-bfa64f.netlify.app   (sau * pentru test)
 *
 * IMPORTANT:
 *  - Funcția NU trimite alerte. Doar forward-ează payload-ul către n8n.
 *  - n8n validează tokenul, calculează nivelul (dacă lipsește) și decide dacă trimite email/SMS/push.
 */

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "";
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN || "";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";

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

// Retry + timeout
async function postWithRetry(url: string, init: RequestInit, tries = 2, timeoutMs = 10_000) {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} — ${text.slice(0, 500)}`);
      }
      return res;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1))); // backoff scurt
  }
  throw lastErr;
}

// Normalizează payload minim
function normalizePayload(input: any) {
  const nowISO = new Date().toISOString();
  const wind = Number(input?.windSpeed ?? 0);

  let level = input?.level;
  if (!level) {
    if (wind >= 80) level = "red";
    else if (wind >= 65) level = "orange";
    else if (wind >= 50) level = "yellow";
    else level = "green";
  }

  return {
    level,
    windSpeed: wind,
    time: input?.time || nowISO,
    subject:
      input?.subject ||
      `[WIND MONITOR] ${String(level).toUpperCase()} — vânt ${wind} km/h @ ${nowISO}`,
    message:
      input?.message ||
      `Atenție: ${String(level).toUpperCase()} — vânt ${wind} km/h (${nowISO})`,
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

  if (!N8N_WEBHOOK_URL || !N8N_WEBHOOK_TOKEN) {
    return json(500, {
      ok: false,
      error: "Webhook is not configured on server",
      detail: {
        N8N_WEBHOOK_URL: N8N_WEBHOOK_URL ? "set" : "missing",
        N8N_WEBHOOK_TOKEN: N8N_WEBHOOK_TOKEN ? "set" : "missing",
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
  if (Number.isNaN(wind)) {
    return json(400, { ok: false, error: "windSpeed must be a number" });
  }

  // Forward la n8n
  const payload = normalizePayload(body);

  try {
    const res = await postWithRetry(
      N8N_WEBHOOK_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Token": N8N_WEBHOOK_TOKEN, // verificat de IF-ul din n8n
        },
        body: JSON.stringify(payload),
      },
      2,
      10_000
    );

    const text = await res.text().catch(() => "");
    return json(200, {
      ok: true,
      forwarded: true,
      n8nStatus: res.status,
      n8nResponse: text || "ok",
      sentPayloadPreview: payload,
    });
  } catch (err: any) {
    console.error("Forward to n8n failed:", err?.message || err);
    return json(502, {
      ok: false,
      error: "Forward to n8n failed",
      detail: String(err?.message || err),
      target: N8N_WEBHOOK_URL,
    });
  }
};
