// netlify/functions/sendTestPush.ts
import type { Handler } from '@netlify/functions';
import * as OneSignal from '@onesignal/node-onesignal';

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

  // Citește DOAR env-urile server-side
  const APP_ID = process.env.ONESIGNAL_APP_ID as string | undefined;
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

  // Construiește notificarea de test
  const notification = new OneSignal.Notification();
  notification.app_id = APP_ID;
  notification.headings = { en: title || 'Test alertă vânt' };
  notification.contents = { en: message || 'Level danger, Wind 32 km/h' };
  notification.url = url || 'https://wind.qub3.uk';

  if (subscriptionId) {
    notification.include_subscription_ids = [subscriptionId];
  } else {
    notification.included_segments = ['Subscribed Users'];
  }

  const configuration = OneSignal.createConfiguration({
    restApiKey: RESTKEY,
  });
  const client = new OneSignal.DefaultApi(configuration);

  try {
    const response = await client.createNotification(notification);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true, response }),
    };
  } catch (err: any) {
    console.error('OneSignal error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Failed to send test notification via OneSignal',
        detail: err.message || 'Unknown error',
      }),
    };
  }
};
