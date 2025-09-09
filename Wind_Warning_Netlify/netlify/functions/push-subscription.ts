import type { Handler } from '@netlify/functions';
import webPush from 'web-push';

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'VAPID keys are not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { subscription } = body;
    webPush.setVapidDetails('mailto:example@example.com', publicKey, privateKey);
    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'Wind Warning',
        message: 'Push notifications enabled!',
        url: '/',
      })
    );

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error('Push subscription error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to send push message' }) };
  }
};

export { handler };
