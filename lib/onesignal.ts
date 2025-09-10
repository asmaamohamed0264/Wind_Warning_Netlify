// lib/onesignal.ts
// Wrapper sigur pentru OneSignal Web SDK v16, compatibil cu Next/Netlify (SSR)

declare global {
  interface Window {
    OneSignal?: any;
    OneSignalDeferred?: any[];
  }
}

const isClient = () => typeof window !== 'undefined';

function getOS() {
  if (!isClient()) return undefined;
  return window.OneSignal;
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

  // Util – buton de test
  async sendTestNotification() {
    try {
      await waitForSDKReady();
      const os = ensureOS();
      // trimite o local notification (doar ca demo)
      if (os.Notifications?.isSubscribed()) {
        await os.Notifications.showSlidedownPrompt?.(); // fallback: arată promptul
      }
    } catch (e) {
      console.warn('sendTestNotification warning:', e);
    }
  },
};

export default oneSignal;
