// lib/notificationapi.ts - Migrat de la OneSignal la NotificationAPI
import notificationapi from 'notificationapi-node-server-sdk';

// Inițializare NotificationAPI
const CLIENT_ID = process.env.NEXT_PUBLIC_NOTIFICATIONAPI_CLIENT_ID;
const CLIENT_SECRET = process.env.NOTIFICATIONAPI_CLIENT_SECRET;

if (CLIENT_ID && CLIENT_SECRET) {
  notificationapi.init(CLIENT_ID, CLIENT_SECRET);
}

// Funcție pentru înregistrarea utilizatorului cu token-uri push via API direct
export async function registerUser(userId: string, email?: string, phoneNumber?: string, webPushToken?: any) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('NotificationAPI credentials not configured');
    }

    const userData: any = {};
    if (email) userData.email = email;
    if (phoneNumber) userData.number = phoneNumber;
    if (webPushToken) {
      userData.webPushTokens = [webPushToken];
    }

    // Folosim API direct pentru înregistrarea utilizatorului
    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Failed to register user: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error registering user:', error);
    return { success: false, error };
  }
}

// Funcție pentru trimiterea notificărilor push
export async function sendPushNotification(userId: string, title: string, message: string, url?: string) {
  try {
    await notificationapi.send({
      type: 'push_notification',
      to: { id: userId },
      web_push: {
        title,
        message,
        url: url || 'https://wind.qub3.uk'
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

// Funcție pentru configurarea SMS
export async function setSMSNumber(userId: string, phoneNumber: string) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('NotificationAPI credentials not configured');
    }

    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: phoneNumber }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set SMS number: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting SMS number:', error);
    return { success: false, error };
  }
}

// Funcție pentru configurarea email
export async function setEmail(userId: string, email: string) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('NotificationAPI credentials not configured');
    }

    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set email: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting email:', error);
    return { success: false, error };
  }
}

// Funcție pentru dezabonarea de la SMS
export async function removeSMS(userId: string) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('NotificationAPI credentials not configured');
    }

    // Pentru dezabonare, trimitem null pentru number
    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number: null }),
    });

    if (!response.ok) {
      throw new Error(`Failed to remove SMS: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing SMS:', error);
    return { success: false, error };
  }
}

// Funcție pentru dezabonarea de la email
export async function removeEmail(userId: string) {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('NotificationAPI credentials not configured');
    }

    const response = await fetch(`https://api.notificationapi.com/${CLIENT_ID}/users/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: null }),
    });

    if (!response.ok) {
      throw new Error(`Failed to remove email: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing email:', error);
    return { success: false, error };
  }
}

// Funcție pentru verificarea stării abonamentelor
export async function getUserSubscriptions(userId: string) {
  // NotificationAPI nu oferă endpoint direct pentru verificarea stării
  // Vom returna un obiect mock bazat pe localStorage
  return {
    push: localStorage.getItem('push_enabled') === 'true',
    sms: localStorage.getItem('sms_enabled') === 'true',
    email: localStorage.getItem('email_enabled') === 'true'
  };
}

// Helper pentru test notifications (folosește funcția Netlify existentă)
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
