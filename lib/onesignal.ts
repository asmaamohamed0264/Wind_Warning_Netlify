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
      console.log('🔍 OneSignal isSubscribed: Starting check...');
      await waitForSDKReady();
      const os = ensureOS();
      
      console.log('🔍 OneSignal object:', os);
      console.log('🔍 OneSignal.Notifications:', os.Notifications);
      
      // Încarcă mai multe metode pentru a detecta subscribe state
      let isSubscribed = false;
      
      if (os.Notifications && typeof os.Notifications.isSubscribed === 'function') {
        isSubscribed = await os.Notifications.isSubscribed();
        console.log('🔍 Method 1 (isSubscribed()):', isSubscribed);
      } else if (os.User && os.User.PushSubscription) {
        // Fallback pentru v16
        isSubscribed = os.User.PushSubscription.J || false;
        console.log('🔍 Method 2 (User.PushSubscription.J):', isSubscribed);
      }
      
      // De asemenea verifică și browser permission
      if ('Notification' in window) {
        const permission = Notification.permission;
        console.log('🔍 Browser notification permission:', permission);
        if (permission === 'denied') {
          isSubscribed = false;
        }
      }
      
      console.log('🔍 Final isSubscribed result:', isSubscribed);
      return isSubscribed;
    } catch (error) {
      console.error('🔍 OneSignal isSubscribed error:', error);
      return false;
    }
  },

  async subscribe(): Promise<boolean> {
    try {
      console.log('🔧 OneSignal subscribe: Starting process...');
      await waitForSDKReady();
      const os = ensureOS();
      
      console.log('🔧 OneSignal subscribe: SDK ready, checking current permission...');
      
      // Debug: Inspect the actual OneSignal object structure
      console.log('🔧 OneSignal object keys:', Object.keys(os));
      console.log('🔧 OneSignal.Notifications:', os.Notifications);
      if (os.Notifications) {
        console.log('🔧 OneSignal.Notifications keys:', Object.keys(os.Notifications));
      }
      console.log('🔧 OneSignal.User:', os.User);
      if (os.User) {
        console.log('🔧 OneSignal.User keys:', Object.keys(os.User));
        if (os.User.PushSubscription) {
          console.log('🔧 OneSignal.User.PushSubscription:', os.User.PushSubscription);
          console.log('🔧 OneSignal.User.PushSubscription keys:', Object.keys(os.User.PushSubscription));
        }
      }
      
      // Check for common OneSignal methods
      const commonMethods = ['requestPermission', 'registerForPushNotifications', 'showSlidedownPrompt', 'showCategorySlidedown', 'init', 'on', 'off', 'once', 'push'];
      commonMethods.forEach(method => {
        console.log(`🔧 OneSignal.${method}:`, typeof os[method]);
      });
      
      // Check PushSubscription methods
      if (os.User.PushSubscription) {
        const pushSubProps = Object.getOwnPropertyNames(os.User.PushSubscription);
        const pushSubProto = Object.getOwnPropertyNames(Object.getPrototypeOf(os.User.PushSubscription));
        console.log('🔧 OneSignal.User.PushSubscription own properties:', pushSubProps);
        console.log('🔧 OneSignal.User.PushSubscription prototype methods:', pushSubProto);
      }
      
      // Check current permission status first
      const currentPermission = 'Notification' in window ? Notification.permission : 'unsupported';
      console.log('🔧 OneSignal subscribe: Current browser permission:', currentPermission);
      
      if (currentPermission === 'denied') {
        console.log('🔧 OneSignal subscribe: Permission is denied by user');
        return false;
      }
      
      // Check if already subscribed (J property indicates subscription status)
      const alreadySubscribed = os.User.PushSubscription.J;
      console.log('🔧 OneSignal subscribe: Already subscribed?', alreadySubscribed);
      
      if (alreadySubscribed) {
        console.log('🔧 OneSignal subscribe: User is already subscribed');
        return true;
      }
      
      // Try different OneSignal subscription approaches
      console.log('🔧 OneSignal subscribe: Trying multiple subscription approaches...');
      
      try {
        // Approach 1: Try to find OptIn method on PushSubscription
        if (typeof os.User.PushSubscription.optIn === 'function') {
          console.log('🔧 OneSignal subscribe: Trying PushSubscription.optIn()');
          await os.User.PushSubscription.optIn();
        }
        // Approach 2: Try to find subscribe method on PushSubscription  
        else if (typeof os.User.PushSubscription.subscribe === 'function') {
          console.log('🔧 OneSignal subscribe: Trying PushSubscription.subscribe()');
          await os.User.PushSubscription.subscribe();
        }
        // Approach 3: Try setting J property directly
        else {
          console.log('🔧 OneSignal subscribe: Setting J property directly');
          os.User.PushSubscription.J = true;
        }
        
        // Approach 4: If all else fails, use browser native permission and hope OneSignal picks it up
        if (!os.User.PushSubscription.J && 'Notification' in window && Notification.permission === 'default') {
          console.log('🔧 OneSignal subscribe: Fallback to browser native permission');
          const permission = await Notification.requestPermission();
          console.log('🔧 OneSignal subscribe: Browser permission result:', permission);
        }
        
        // Check final subscription status
        const nowSubscribed = os.User.PushSubscription.J;
        console.log('🔧 OneSignal subscribe: Final subscription status:', nowSubscribed);
        
        return nowSubscribed ?? false;
      } catch (permError) {
        console.error('🔧 OneSignal subscribe: Permission/subscription error:', permError);
        return false;
      }
    } catch (e) {
      console.error('🔧 OneSignal subscribe error (detailed):', {
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : 'No stack trace'
      });
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
