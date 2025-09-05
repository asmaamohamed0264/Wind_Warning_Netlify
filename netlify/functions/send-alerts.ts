// netlify/functions/send-alerts.ts
import type { Handler } from '@netlify/functions';
import * as OneSignal from '@onesignal/node-onesignal';

type Req = {
  level?: 'caution' | 'warning' | 'danger';
  windSpeed?: number;
  channels?: Array<'push' | 'email' | 'sms'>;
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

  const { level, windSpeed, channels } = body;

  if (!level || !windSpeed) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing level or windSpeed' }),
    };
  }

  // Construiește notificarea de alertă meteo
  const notification = new OneSignal.Notification();
  notification.app_id = APP_ID;
  notification.headings = { en: `Alertă ${level.toUpperCase()}` };
  notification.contents = {
    en: `${level.toUpperCase()}: Vânt de ${windSpeed} km/h detectat. Luați măsuri de siguranță!`,
  };
  notification.url = 'https://wind.qub3.uk';

  if (channels?.length) {
    notification.channel_for_external_user_ids = channels;
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
        error: 'Failed to send alert notification via OneSignal',
        detail: err.message || 'Unknown error',
      }),
    };
  }
};
