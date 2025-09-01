// netlify/functions/send-alerts.ts
import type { Handler } from "@netlify/functions";

/** === C O N F I G  === */
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL!;
const N8N_WEBHOOK_TOKEN = process.env.N8N_WEBHOOK_TOKEN!;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*"; // ideal: domeniul tău exact

/** CORS */
const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

/** Helper: răspuns JSON */
const j = (code: number, data: unknown) => ({
  statusCode: code,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

/** Validare minimă payload */
function normalizePayload(input: any) {
  const nowISO = new Date().toISOString();
  const wind = Number(input?.windSpeed ?? 0);

  // Dacă level lipsește, n8n îl poate calcula, dar punem niște defaulturi utile
  const level =
    input?.level ??
    (wind >= 80 ? "red" : wind >= 65 ? "orange" : wind >= 50 ? "yellow" : "green");

  const payload = {
    level,
    windSpeed: wind,
    time: input?.time || nowISO,
    subject:
      input?.subject || `[WIND MONITOR] ${String(level).toUpperCase()} — vânt ${wind} km/h @ ${nowISO}`,
    message:
      input?.message || `Atenție: ${String(level).toUpperCase()} — vânt ${wind} km/h (${nowISO})`,
  };

  return payload;
}

/** Retry simplu cu backoff */
async function postWithRetry(url: string, init: RequestInit, tries = 2) {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000); // 10s timeout
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500 * (i + 1))); // backoff 0.5s, 1s
  }
  throw lastErr;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return j(405, { ok: false, error: "Method Not Allowed" });
  }

  // verifică configurarea
  if (!N8N_WEBHOOK_URL || !N8N_WEBHOOK_TOKEN) {
    return j(500, { ok: false, error: "Webhook is not configured on server" });
  }

  let body: any = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return j(400, { ok: false, error: "Invalid JSON body" });
  }

  // validări rapide
  const wind = Number(body?.windSpeed ?? 0);
  if (Number.isNaN(wind)) {
    return j(400, { ok: false, error: "windSpeed must be a number" });
  }

  // normalizează payload către n8n
  const payload = normalizePayload(body);

  try {
    const res = await postWithRetry(
      N8N_WEBHOOK_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Token": N8N_WEBHOOK_TOKEN, // verificat în workflow (IF token valid)
        },
        body: JSON.stringify(payload),
      },
      2
    );

    const text = await res.text();
    return j(200, { ok: true, forwarded: true, n8nStatus: res.status, n8nResponse: text });
  } catch (err: any) {
    console.error("Forward to n8n failed:", err?.message || err);
    return j(502, { ok: false, error: "Forward to n8n failed" });
  }
};
