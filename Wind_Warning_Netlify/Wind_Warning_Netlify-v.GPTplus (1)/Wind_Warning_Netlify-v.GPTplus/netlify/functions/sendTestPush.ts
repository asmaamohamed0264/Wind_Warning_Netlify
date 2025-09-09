// netlify/functions/sendTestPush.ts
import type { Handler } from '@netlify/functions';

type Req = {
  subscriptionId?: string;    // dacă e prezent -> trimitem doar către acest abonat
  title?: string;             // override titlu
  message?: string;           // override conținut
  url?: string;               // click-through
};

export const handler: Handler = async (event) => {
  // CORS basic (în caz că apelezi din browser)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const APP_ID = process.env.ONESIGNAL_APP_ID;
    const REST_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!APP_ID || !REST_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY' }),
      };
    }

    const { subscriptionId, title, message, url }: Req = JSON.parse(event.body || '{}');

    // payload minim pentru test push
    const payload: any = {
      app_id: APP_ID,
      headings: { en: title || 'Test alertă vânt' },
      contents: { en: message || 'Level danger, Wind 32 km/h' },
      url: url || 'https://wind.qub3.uk',
    };

    // dacă avem subscriptionId, targetăm device-ul curent; altfel, broadcast către Subscribed Users
    if (subscriptionId) {
      payload.include_subscription_ids = [subscriptionId];
    } else {
      payload.included_segments = ['Subscribed Users'];
    }

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${REST_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    return {
      statusCode: res.status,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: text,
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err?.message || 'Unknown error' }),
    };
  }
};
