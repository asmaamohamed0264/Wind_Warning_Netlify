// netlify/functions/sendTestPush.ts
import type { Handler } from '@netlify/functions';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

export const handler: Handler = async (event) => {
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
      body: 'Metodă nepermisă',
    };
  }

  const CLIENT_ID = process.env.NOTIFICATIONAPI_CLIENT_ID as string | undefined;
  const CLIENT_SECRET = process.env.NOTIFICATIONAPI_CLIENT_SECRET as string | undefined;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Lipsește NOTIFICATIONAPI_CLIENT_ID sau NOTIFICATIONAPI_CLIENT_SECRET' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Corp JSON invalid' }),
    };
  }

  const { subscriptionId, title, message, url } = body;

  const payload = {
    notificationId: 'test-notification', // Definit în dashboard-ul NotificationAPI
    user: {
      id: 'pluscuplus@gmail.com', // User ID specific
      email: 'pluscuplus@gmail.com'
    },
    mergeTags: {
      title: title || 'Test alertă vânt',
      message: message || 'Level danger, Wind 32 km/h',
      url: url || 'https://wind.qub3.uk'
    }
  };

  try {
    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/sender`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Eroare NotificationAPI: ${text}`);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: true, response: await response.json() }),
    };
  } catch (err: any) {
    console.error('Eroare NotificationAPI:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        ok: false,
        error: 'Eroare la trimiterea notificării de test via NotificationAPI',
        detail: err.message || 'Eroare necunoscută',
      }),
    };
  }
};
