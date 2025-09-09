// netlify/functions/send-alerts-onesignal.ts
import type { Handler } from '@netlify/functions';

/**
 * Accesor "rezistent" pentru variabilele de mediu.
 * Folosește indexing dinamic pe globalThis ca să evite constant folding-ul la build,
 * care altfel ar transforma `process.env.KEY` în string literal și ar strica `??`/`||`.
 */
const getEnv = (key: string) =>
  (globalThis as any)?.['process']?.['env']?.[key] as string | undefined

// === Config din environment (injected la runtime pentru Netlify Functions) ===
const APP_ID =
  getEnv('VITE_ONESIGNAL_APP_ID') ||
  getEnv('NEXT_PUBLIC_ONESIGNAL_APP_ID') ||
  ''

const API_KEY =
  getEnv('VITE_ONESIGNAL_API_KEY') ||
  getEnv('NEXT_PUBLIC_ONESIGNAL_API_KEY') || // fallback, dacă e setată public
  ''

const ALLOWED_ORIGIN = getEnv('ALLOWED_ORIGIN') || '*'
const EMAIL_FROM_NAME = getEnv('EMAIL_FROM_NAME') || 'Wind Alert'
const EMAIL_FROM_ADDRESS = getEnv('EMAIL_FROM_ADDRESS') // ex: alerts@domeniu.ro
const SMS_FROM = getEnv('ONESIGNAL_SMS_FROM') || getEnv('TWILIO_PHONE_NUMBER') || ''

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
}

// ===== Tipuri utile pentru request =====
type BasePayload = {
  title?: string
  message?: string
  url?: string
  data?: Record<string, unknown>
  included_external_user_ids?: string[]
  segments?: string[]
}

type WindAlert = {
  place: string
  wind: number
  gust?: number
  level: 'VERDE' | 'GALBEN' | 'PORTOCALIU' | 'ROȘU' | 'ROS U' | string
  text?: string
}

type Incoming =
  | (BasePayload & { alerts?: WindAlert[]; channel?: ('push'|'email'|'sms'|'all') })
  | BasePayload

// Helper: OneSignal call
async function callOneSignal(body: Record<string, any>) {
  const fetchAny: any = (globalThis as any).fetch
  const resp = await fetchAny('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await resp.text()
  const isJson = text.trim().startsWith('{') || text.trim().startsWith('[')
  const result = isJson ? JSON.parse(text) : { raw: text }

  return { ok: resp.ok, status: resp.status, result }
}

// Helper: construiește body standard pentru push
function buildPushBody(input: BasePayload) {
  const body: Record<string, any> = {
    app_id: APP_ID,
  }
  if (input.message) body.contents = { en: input.message, ro: input.message }
  if (input.title) body.headings = { en: input.title, ro: input.title }
  if (input.url) body.url = input.url
  if (input.data) body.data = input.data

  if (input.included_external_user_ids?.length) {
    body.include_external_user_ids = input.included_external_user_ids
  } else if (input.segments?.length) {
    body.included_segments = input.segments
  } else {
    body.included_segments = ['All']
  }
  return body
}

// Helper: email (OneSignal Email). Presupune că ai activat canalul email în OneSignal.
function buildEmailBody(input: BasePayload & { email_subject?: string; email_body?: string }) {
  const body = buildPushBody(input)
  body.target_channel = 'email'
  if (!body.included_segments) body.included_segments = ['All']

  // Subiect/Body email — folosește title/message dacă nu sunt setate câmpuri dedicate
  const subject = (input as any).email_subject || input.title || 'Alertă'
  const message = (input as any).email_body || input.message || ''

  body.email_subject = subject
  body.email_body = message
  if (EMAIL_FROM_NAME) body.email_from_name = EMAIL_FROM_NAME
  if (EMAIL_FROM_ADDRESS) body.email_from_address = EMAIL_FROM_ADDRESS
  return body
}

// Helper: SMS (OneSignal SMS). Presupune canal SMS configurat.
function buildSmsBody(input: BasePayload & { sms_body?: string }) {
  const body = buildPushBody(input)
  body.target_channel = 'sms'
  if (!body.included_segments) body.included_segments = ['All']
  if (SMS_FROM) body.sms_from = SMS_FROM
  body.sms_body = (input as any).sms_body || input.message || ''
  return body
}

export const handler: Handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  if (!APP_ID || !API_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing OneSignal configuration (APP_ID sau API_KEY lipsă).' }),
    }
  }

  let payload: Incoming
  try {
    payload = JSON.parse(event.body ?? '{}')
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  // Dacă avem "alerts" (mai multe avertizări vânt), construim mesaje default.
  if ((payload as any).alerts?.length) {
    const alerts: WindAlert[] = (payload as any).alerts
    const promises: Promise<any>[] = []

    for (const a of alerts) {
      const level = a.level || 'ALERTĂ'
      const title = `【${level}】 Vânt puternic în ${a.place}`
      const text =
        a.text ||
        `Rafale de ${a.wind}${a.gust ? ' (până la ' + a.gust + ')' : ''} km/h. Rămâneți în siguranță.`

      // PUSH
      const pushBody = buildPushBody({
        title,
        message: text,
        url: (payload as any).url,
        data: { type: 'wind', level, place: a.place, wind: a.wind, gust: a.gust },
        included_external_user_ids: (payload as any).included_external_user_ids,
        segments: (payload as any).segments || ['Total Subscriptions'],
      })
      promises.push(callOneSignal(pushBody))

      // EMAIL
      const emailBody = buildEmailBody({
        title,
        message: text,
        url: (payload as any).url,
        data: { type: 'wind', level, place: a.place, wind: a.wind, gust: a.gust },
        included_external_user_ids: (payload as any).included_external_user_ids,
        segments: (payload as any).segments || ['Total Subscriptions'],
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
      })
      promises.push(callOneSignal(emailBody))

      // SMS
      if (SMS_FROM) {
        const smsBody = buildSmsBody({
          message: `ALERTĂ VÂNT ${level}: ${a.wind} km/h în ${a.place}. Rămâneți în siguranță.`,
          data: { type: 'wind', level, place: a.place, wind: a.wind, gust: a.gust },
          included_external_user_ids: (payload as any).included_external_user_ids,
          segments: (payload as any).segments || ['Total Subscriptions'],
        })
        promises.push(callOneSignal(smsBody))
      }
    }

    const results = await Promise.all(promises)
    const ok = results.every(r => r.ok)
    return {
      statusCode: ok ? 200 : 207,
      headers: corsHeaders,
      body: JSON.stringify({ ok, results }),
    }
  }

  // Caz simplu: un singur mesaj generic (push/email/sms/all)
  const channel = (payload as any).channel as ('push'|'email'|'sms'|'all') | undefined
  const base: BasePayload = {
    title: (payload as any).title,
    message: (payload as any).message,
    url: (payload as any).url,
    data: (payload as any).data,
    included_external_user_ids: (payload as any).included_external_user_ids,
    segments: (payload as any).segments,
  }

  const results: any[] = []
  try {
    if (!channel || channel === 'push' || channel === 'all') {
      results.push(await callOneSignal(buildPushBody(base)))
    }
    if (channel === 'email' || channel === 'all') {
      results.push(await callOneSignal(buildEmailBody(base as any)))
    }
    if ((channel === 'sms' || channel === 'all') && SMS_FROM) {
      results.push(await callOneSignal(buildSmsBody(base as any)))
    }

    const ok = results.every(r => r.ok)
    return {
      statusCode: ok ? 200 : 207,
      headers: corsHeaders,
      body: JSON.stringify({ ok, results }),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[send-alerts-onesignal] error:', message)
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: message }),
    }
  }
}
