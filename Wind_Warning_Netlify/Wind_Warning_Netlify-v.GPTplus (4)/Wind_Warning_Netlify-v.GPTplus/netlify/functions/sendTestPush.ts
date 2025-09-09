// netlify/functions/sendTestPush.ts
import type { Handler } from '@netlify/functions';

type Req = {
  subscriptionId?: string;
  title?: string;
  message?: string;
  url?: string;
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: 'Method Not Allowed',
    };
  }

  // Citește DOAR env-urile server-side (nu folosi NEXT_PUBLIC_* aici)
  const APP_ID  = process.env.ONESIGNAL_APP_ID as string | undefined;
  const RESTKEY = process.env.ONESIGNAL_REST_API_KEY as string | undefined;

  if (!APP_ID || !RESTKEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY' }),
    };
  }

  let body: Req;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { subscriptionId, title, message, url } = body;

  // Payload minim pentru test push
  const payload: Record<string, any> = {
    app_id: APP_ID,
    headings: { en: title || 'Test alertă vânt' },
    contents: { en: message || 'Level danger, Wind 32 km/h' },
    url: url || 'https://wind.qub3.uk',
  };

  if (subscriptionId) {
    payload.include_subscription_ids = [subscriptionId];
  } else {
    payload.included_segments = ['Subscribed Users'];
  }

  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${RESTKEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      headers: CORS_HEADERS,
      body: text,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err?.message || 'Unknown error' }),
    };
  }
};
