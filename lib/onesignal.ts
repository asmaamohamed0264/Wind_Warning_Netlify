// lib/onesignal.ts
// Wrapper sigur pentru OneSignal Web SDK v16, compatibil cu Next/Netlify (SSR)

// TypeScript types pentru OneSignal se gestionează prin casting

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
    ((window as any).OneSignalDeferred = (window as any).OneSignalDeferred || []).push(() => {
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
      
      try {
        await waitForSDKReady();
      } catch (sdkError) {
        console.warn('🔍 OneSignal SDK not ready:', sdkError);
        return false;
      }
      
      let os;
      try {
        os = ensureOS();
      } catch (osError) {
        console.warn('🔍 OneSignal not available:', osError);
        return false;
      }
      
      console.log('🔍 OneSignal object available:', !!os);
      
      if (!os) {
        console.warn('🔍 OneSignal object is null/undefined');
        return false;
      }
      
      console.log('🔍 OneSignal.Notifications available:', !!os.Notifications);
      console.log('🔍 OneSignal.User available:', !!os.User);
      
      // Încarcă mai multe metode pentru a detecta subscribe state
      let isSubscribed = false;
      
      try {
        if (os.Notifications && typeof os.Notifications.isSubscribed === 'function') {
          isSubscribed = await os.Notifications.isSubscribed();
          console.log('🔍 Method 1 (isSubscribed()):', isSubscribed);
        } else if (os.User && os.User.PushSubscription) {
          // Fallback pentru v16
          isSubscribed = os.User.PushSubscription.J || false;
          console.log('🔍 Method 2 (User.PushSubscription.J):', isSubscribed);
        } else {
          console.log('🔍 No subscription detection method available');
        }
      } catch (subscribeCheckError) {
        console.warn('🔍 Error checking subscription status:', subscribeCheckError);
        isSubscribed = false;
      }
      
      // De asemenea verifică și browser permission
      try {
        if ('Notification' in window) {
          const permission = Notification.permission;
          console.log('🔍 Browser notification permission:', permission);
          if (permission === 'denied') {
            isSubscribed = false;
          }
        }
      } catch (permError) {
        console.warn('🔍 Error checking browser permission:', permError);
      }
      
      console.log('🔍 Final isSubscribed result:', isSubscribed);
      return isSubscribed;
    } catch (error) {
      console.error('🔍 OneSignal isSubscribed unexpected error:', error);
      return false;
    }
  },

  async subscribe(): Promise<boolean> {
    try {
      console.log('🔧 OneSignal subscribe: Starting process...');
      
      // Prinde toate erorile în waitForSDKReady
      try {
        await waitForSDKReady();
      } catch (sdkError) {
        console.warn('🔧 OneSignal SDK not ready for subscription:', sdkError);
        return false;
      }
      
      // Prinde erorile în ensureOS
      let os;
      try {
        os = ensureOS();
      } catch (osError) {
        console.warn('🔧 OneSignal not available for subscription:', osError);
        return false;
      }
      
      if (!os) {
        console.warn('🔧 OneSignal object is null/undefined during subscription');
        return false;
      }
      
      console.log('🔧 OneSignal subscribe: SDK ready, checking current permission...');
      
      // Debug în mod sigur - prindem și aici erorile
      try {
        console.log('🔧 OneSignal object available:', !!os);
        console.log('🔧 OneSignal.Notifications available:', !!os?.Notifications);
        console.log('🔧 OneSignal.User available:', !!os?.User);
        
        if (os.User?.PushSubscription) {
          console.log('🔧 OneSignal.User.PushSubscription available:', true);
        }
      } catch (debugError) {
        console.warn('🔧 Error during debug logging:', debugError);
        // Nu ieșim, continuăm cu subscribe
      }
      
      // Check current permission status first
      let currentPermission = 'unsupported';
      try {
        currentPermission = 'Notification' in window ? Notification.permission : 'unsupported';
        console.log('🔧 OneSignal subscribe: Current browser permission:', currentPermission);
      } catch (permCheckError) {
        console.warn('🔧 Error checking browser permission:', permCheckError);
      }
      
      if (currentPermission === 'denied') {
        console.log('🔧 OneSignal subscribe: Permission is denied by user');
        return false;
      }
      
      // Check if already subscribed în mod sigur
      let alreadySubscribed = false;
      try {
        if (os?.User?.PushSubscription) {
          alreadySubscribed = os.User.PushSubscription.J || false;
          console.log('🔧 OneSignal subscribe: Already subscribed?', alreadySubscribed);
        }
      } catch (checkSubError) {
        console.warn('🔧 Error checking current subscription:', checkSubError);
      }
      
      if (alreadySubscribed) {
        console.log('🔧 OneSignal subscribe: User is already subscribed');
        return true;
      }
      
      // Try different OneSignal subscription approaches
      console.log('🔧 OneSignal subscribe: Trying subscription approaches...');
      
      let subscriptionSuccess = false;
      
      // Approach 1: Try OneSignal API methods
      if (os?.User?.PushSubscription) {
        try {
          if (typeof os.User.PushSubscription.optIn === 'function') {
            console.log('🔧 OneSignal subscribe: Trying PushSubscription.optIn()');
            await Promise.resolve(os.User.PushSubscription.optIn()).catch(err => {
              console.warn('🔧 optIn failed:', err);
            });
          } else if (typeof os.User.PushSubscription.subscribe === 'function') {
            console.log('🔧 OneSignal subscribe: Trying PushSubscription.subscribe()');
            await Promise.resolve(os.User.PushSubscription.subscribe()).catch(err => {
              console.warn('🔧 subscribe failed:', err);
            });
          } else {
            console.log('🔧 OneSignal subscribe: No subscription method available, trying direct property');
            os.User.PushSubscription.J = true;
          }
        } catch (apiError) {
          console.warn('🔧 Error calling OneSignal API:', apiError);
        }
      }
      
      // Approach 2: Fallback to browser native permission
      if (!subscriptionSuccess) {
        try {
          if ('Notification' in window && Notification.permission === 'default') {
            console.log('🔧 OneSignal subscribe: Fallback to browser native permission');
            const permission = await Notification.requestPermission();
            console.log('🔧 OneSignal subscribe: Browser permission result:', permission);
            subscriptionSuccess = permission === 'granted';
          }
        } catch (nativePermError) {
          console.warn('🔧 Error requesting native browser permission:', nativePermError);
        }
      }
      
      // Check final subscription status safely
      let finalSubscribed = false;
      try {
        if (os?.User?.PushSubscription) {
          finalSubscribed = os.User.PushSubscription.J || false;
        }
        console.log('🔧 OneSignal subscribe: Final subscription status:', finalSubscribed);
      } catch (finalCheckError) {
        console.warn('🔧 Error checking final subscription status:', finalCheckError);
      }
      
      return finalSubscribed;
    } catch (e) {
      console.error('🔧 OneSignal subscribe unexpected error:', {
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : 'No stack trace'
      });
      return false;
    }
  },

  async unsubscribe(): Promise<boolean> {
    try {
      console.log('🔧 OneSignal unsubscribe: Starting process...');
      
      try {
        await waitForSDKReady();
      } catch (sdkError) {
        console.warn('🔧 OneSignal SDK not ready for unsubscription:', sdkError);
        return false;
      }
      
      let os;
      try {
        os = ensureOS();
      } catch (osError) {
        console.warn('🔧 OneSignal not available for unsubscription:', osError);
        return false;
      }
      
      if (!os) {
        console.warn('🔧 OneSignal object is null/undefined during unsubscription');
        return false;
      }
      
      console.log('🔧 OneSignal unsubscribe: Checking available methods...');
      
      // Debug available methods
      try {
        console.log('🔧 OneSignal.Notifications available:', !!os.Notifications);
        console.log('🔧 OneSignal.User.PushSubscription available:', !!os.User?.PushSubscription);
        
        if (os.Notifications) {
          const notificationMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(os.Notifications));
          console.log('🔧 Available Notifications methods:', notificationMethods);
        }
        
        if (os.User?.PushSubscription) {
          const pushSubMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(os.User.PushSubscription));
          console.log('🔧 Available PushSubscription methods:', pushSubMethods);
        }
      } catch (debugError) {
        console.warn('🔧 Error during unsubscribe debugging:', debugError);
      }
      
      let unsubscribeSuccess = false;
      
      // Approach 1: Try PushSubscription optOut
      if (os.User?.PushSubscription) {
        try {
          if (typeof os.User.PushSubscription.optOut === 'function') {
            console.log('🔧 OneSignal unsubscribe: Trying PushSubscription.optOut()');
            await Promise.resolve(os.User.PushSubscription.optOut()).catch(err => {
              console.warn('🔧 optOut failed:', err);
            });
          } else if (typeof os.User.PushSubscription.unsubscribe === 'function') {
            console.log('🔧 OneSignal unsubscribe: Trying PushSubscription.unsubscribe()');
            await Promise.resolve(os.User.PushSubscription.unsubscribe()).catch(err => {
              console.warn('🔧 unsubscribe failed:', err);
            });
          } else {
            console.log('🔧 OneSignal unsubscribe: No unsubscribe method available, setting J property to false');
            os.User.PushSubscription.J = false;
          }
        } catch (pushSubError) {
          console.warn('🔧 Error calling PushSubscription unsubscribe:', pushSubError);
        }
      }
      
      // Approach 2: Try direct property manipulation
      try {
        if (os.User?.PushSubscription && os.User.PushSubscription.J) {
          console.log('🔧 OneSignal unsubscribe: Setting J property directly to false');
          os.User.PushSubscription.J = false;
          unsubscribeSuccess = true;
        }
      } catch (directError) {
        console.warn('🔧 Error setting J property:', directError);
      }
      
      // Check final status
      let finalUnsubscribed = false;
      try {
        if (os.User?.PushSubscription) {
          const stillSubscribed = os.User.PushSubscription.J || false;
          finalUnsubscribed = !stillSubscribed;
          console.log('🔧 OneSignal unsubscribe: Final subscription status (should be false):', stillSubscribed);
          console.log('🔧 OneSignal unsubscribe: Successfully unsubscribed:', finalUnsubscribed);
        }
      } catch (finalCheckError) {
        console.warn('🔧 Error checking final unsubscription status:', finalCheckError);
      }
      
      return finalUnsubscribed;
    } catch (e) {
      console.error('🔧 OneSignal unsubscribe unexpected error:', {
        error: e,
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : 'No stack trace'
      });
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
