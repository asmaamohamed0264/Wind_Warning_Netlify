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

const getEnv = (key: string) => (globalThis as any)?.['process']?.['env']?.[key] as string | undefined;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  const APP_ID = getEnv('ONESIGNAL_APP_ID') || '';
  const RESTKEY = getEnv('ONESIGNAL_REST_API_KEY') || '';

  if (!APP_ID || !RESTKEY) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY' }) };
  }

  let body: Req;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { subscriptionId, title, message, url } = body;

  // Configurează clientul OneSignal (ca în send-alerts.ts)
  const configuration = OneSignal.createConfiguration({
    authMethods: {
      rest_api_key: {
        tokenProvider: { getToken() { return RESTKEY; } },
      },
    },
  });
  const onesignalClient = new OneSignal.DefaultApi(configuration);

  // Construiește notificarea
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

  try {
    const response = await onesignalClient.createNotification(notification);
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(response) };
  } catch (err: any) {
    console.error('OneSignal error:', err);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err?.message || 'Unknown error' }) };
  }
};
