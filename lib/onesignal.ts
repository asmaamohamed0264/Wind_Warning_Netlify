// lib/onesignal.ts
// Wrapper sigur pentru OneSignal Web SDK v16, compatibil cu Next/Netlify (SSR)

// Nu mai declarăm nimic global - folosim tipurile existente din OneSignal SDK

const isClient = () => typeof window !== 'undefined';

function getOS() {
  if (!isClient()) return undefined;
  return (window as any).OneSignal;
}

function ensureOS(): any {
  const os = getOS();
  if (!os) throw new Error('OneSignal SDK nu este încă disponibil.');
  return os;
}

async function waitForSDKReady(timeoutMs = 8000) {
  if (!isClient()) return;
  if (getOS()) return;

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout așteptând OneSignal SDK')), timeoutMs);
    (window.OneSignalDeferred = window.OneSignalDeferred || []).push(() => {
      clearTimeout(t);
      resolve();
    });
  });
}

export const oneSignal = {
  // Inițializare – chemată o singură dată în app
  async initialize() {
    if (!isClient()) return;
    // Dacă SDK-ul e deja injectat, e okay. Dacă nu, așteptăm OneSignalDeferred.
    await waitForSDKReady().catch(() => {}); // nu blocăm UI-ul
  },

  // Push subscribe/unsubscribe
  async isSubscribed(): Promise<boolean> {
    try {
      await waitForSDKReady();
      const os = ensureOS();
      return os.Notifications?.isSubscribed() ?? false;
    } catch {
      return false;
    }
  },

  async subscribe(): Promise<boolean> {
    try {
      await waitForSDKReady();
      const os = ensureOS();
      // Cere permisiunea și se abonează
      const perm = await os.Notifications.requestPermission(); // 'granted' | 'denied' | 'default'
      if (perm !== 'granted') return false;
      await os.Notifications.subscribe();
      return await os.Notifications.isSubscribed();
    } catch (e) {
      console.error('OneSignal subscribe error:', e);
      return false;
    }
  },

  async unsubscribe(): Promise<boolean> {
    try {
      await waitForSDKReady();
      const os = ensureOS();
      await os.Notifications.unsubscribe();
      return !(await os.Notifications.isSubscribed());
    } catch (e) {
      console.error('OneSignal unsubscribe error:', e);
      return false;
    }
  },

  // Email (v16)
  async setEmail(email: string) {
    await waitForSDKReady();
    const os = ensureOS();
    return os.User.addEmail(email); // v16: addEmail/removeEmail
  },

  async removeEmail(email: string) {
    await waitForSDKReady();
    const os = ensureOS();
    return os.User.removeEmail(email);
  },

  // SMS (v16)
  async setSMSNumber(phoneE164: string) {
    await waitForSDKReady();
    const os = ensureOS();
    return os.User.addSms(phoneE164); // v16: addSms/removeSms
  },

  async removeSms(phoneE164: string) {
    await waitForSDKReady();
    const os = ensureOS();
    return os.User.removeSms(phoneE164);
  },

  // Metadata utilizator (opțional)
  async configureUser(opts: { email?: string; phoneNumber?: string; location?: string }) {
    try {
      await waitForSDKReady();
      const os = ensureOS();

      if (opts.email) await os.User.addEmail(opts.email);
      if (opts.phoneNumber) await os.User.addSms(opts.phoneNumber);

      if (opts.location) {
        // Etichete simple (Properties)
        await os.User.addTag('location', opts.location);
      }
    } catch (e) {
      console.warn('configureUser warning:', e);
    }
  },

  // Util – buton de test cu AI personalizat
  async sendTestNotification() {
    try {
      // Obține pragul personalizat al utilizatorului
      const userThreshold = parseInt(localStorage.getItem('wind_alert_threshold') || '20', 10);
      
      // Trimite notificare de test prin API-ul nostru cu AI
      const response = await fetch('/api/send-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          windSpeed: 32, // Viteza de test
          windGust: 38, // Rafale de test
          windDirection: 180, // Sud
          location: 'Aleea Someșul Cald, București',
          alertLevel: 'danger', // Nivel de test
          userThreshold: userThreshold,
          userId: 'test_user_' + Date.now(),
          forecast: [
            { time: new Date().toISOString(), windSpeed: 32, windGust: 38 },
            { time: new Date(Date.now() + 3600000).toISOString(), windSpeed: 28, windGust: 35 },
            { time: new Date(Date.now() + 7200000).toISOString(), windSpeed: 25, windGust: 30 }
          ]
        }),
      });

      const result = await response.json();
      
      if (result.ok) {
        console.log('Test notification sent with AI:', result.data);
        return true;
      } else {
        console.error('Failed to send test notification:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
  },
};

export default oneSignal;
