// lib/onesignal.ts
// Wrapper pentru OneSignal Web SDK v16 (fără augmentarea tipurilor globale)

type OS = {
  init: (opts: { appId: string }) => Promise<void>;
  Debug?: { setLogLevel?: (lvl: 'trace' | 'debug' | 'info' | 'warn' | 'error') => void };
  Notifications: {
    requestPermission: () => Promise<boolean | undefined>;
    isPushSupported: () => boolean;
    permission: boolean;
  };
  User: {
    PushSubscription: {
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      readonly optedIn: boolean;
      id?: string | null;
      token?: string | null;
    };
    addEmail: (email: string) => Promise<void>;
    removeEmail: (email: string) => Promise<void>;
    addSms: (phone: string) => Promise<void>;
    removeSms: (phone: string) => Promise<void>;
    addTags?: (tags: Record<string, string>) => Promise<void>;
  };
};

function onReady(): Promise<OS> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OneSignal este disponibil doar în browser.'));
  }
  return new Promise<OS>((resolve) => {
    const w = window as any;
    if (w.OneSignal) return resolve(w.OneSignal as OS); // dacă e deja încărcat
    w.OneSignalDeferred = w.OneSignalDeferred || [];
    w.OneSignalDeferred.push((OneSignal: any) => resolve(OneSignal as OS));
  });
}

function toE164(input: string) {
  return (input || '').replace(/[^\d+]/g, '');
}

export const oneSignal = {
  async initialize(): Promise<void> {
    await onReady(); // OneSignalInit.tsx face deja init
  },

  async isSubscribed(): Promise<boolean> {
    const os = await onReady();
    return !!os.User?.PushSubscription?.optedIn;
  },

  async subscribe(): Promise<boolean> {
    const os = await onReady();
    if (!os.Notifications?.isPushSupported?.()) return false;
    try { await os.Notifications.requestPermission(); } catch {}
    await os.User.PushSubscription.optIn();
    return !!os.User.PushSubscription.optedIn;
  },

  async unsubscribe(): Promise<boolean> {
    const os = await onReady();
    await os.User.PushSubscription.optOut();
    return !os.User.PushSubscription.optedIn;
  },

  // --- Email ---
  async setEmail(email: string): Promise<void> {
    const os = await onReady();
    const value = (email || '').trim();
    if (!value) throw new Error('Email gol');
    await os.User.addEmail(value);
  },
  async removeEmail(email: string): Promise<void> {
    const os = await onReady();
    const value = (email || '').trim();
    if (!value) throw new Error('Email gol');
    await os.User.removeEmail(value);
  },

  // --- SMS ---
  async setSMSNumber(phone: string): Promise<void> {
    const os = await onReady();
    const e164 = toE164(phone);
    if (!e164.startsWith('+')) throw new Error('Telefonul trebuie în format E.164 (ex: +40712345678)');
    await os.User.addSms(e164);
  },
  async removeSms(phone: string): Promise<void> {
    const os = await onReady();
    const e164 = toE164(phone);
    if (!e164) throw new Error('Telefon lipsă');
    await os.User.removeSms(e164);
  },

  // --- Tag-uri (opțional) ---
  async configureUser(opts: { email?: string; phoneNumber?: string; location?: string }) {
    const os = await onReady();
    if (opts.email) await this.setEmail(opts.email);
    if (opts.phoneNumber) await this.setSMSNumber(opts.phoneNumber);
    if (opts.location && os.User.addTags) await os.User.addTags({ location: opts.location });
  },

  // --- Test: trimite Push + Email + SMS prin funcția Netlify ---
  async sendTestNotification(): Promise<void> {
    await fetch('/api/send-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'TEST', wind: 35, place: 'Aleea Someșul Cald' }),
    });
  },
};
