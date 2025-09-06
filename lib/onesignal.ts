// lib/onesignal.ts
// Temporarily empty - OneSignal dependency removed
// Will be refactored later for custom user identification system

// ---- Helper de test prin funcția Netlify (export separat) ----
export async function sendServerTestNotification(payload: {
  include_subscription_ids?: string[];
  title?: string;
  message?: string;
  url?: string;
} = {}) {
  const body: any = {
    title: payload.title ?? 'Test alertă vânt',
    message: payload.message ?? 'Level danger, Wind 32 km/h',
    url: payload.url ?? 'https://wind.qub3.uk',
  };

  if (payload.include_subscription_ids?.length)
    body.include_subscription_ids = payload.include_subscription_ids;

  const res = await fetch('/api/sendTestPush', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`sendTestPush responded ${res.status}: ${text}`);
  }
  return res.json();
}
