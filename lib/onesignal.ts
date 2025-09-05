// lib/onesignal.ts
// Wrapper pentru OneSignal Web SDK v16, păstrând API-ul tău existent.
// NOTĂ: Folosește NEXT_PUBLIC_ONESIGNAL_APP_ID pe client.

type OneSignalGlobal = {
  init: (opts: { appId: string }) => Promise<void>;
  Debug?: { setLogLevel?: (lvl: 'trace' | 'debug' | 'info' | 'warn' | 'error') => void };
  Notifications: {
    requestPermission: () => Promise<boolean | undefined>;
    isPushSupported: () => boolean;
    permission: boolean;
    addEventListener?: (event: string, cb: (...args: any[]) => void) => void;
  };
  User: {
    PushSubscription: {
      optIn: () => Promise<void>;
      optOut: () => Promise<void>;
      readonly optedIn: boolean;
      addEventListener?: (event: string, cb: (...args: any[]) => void) => void;
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

declare global {
  interface Window {
    OneSignal?: OneSignalGlobal;
    OneSignalDeferred: ((OneSignal: OneSignalGlobal) => void)[];
  }
}

// -- utilitare interne --

function onReady(): Promise<OneSignalGlobal> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal) => resolve(OneSignal));
  });
}

function toE164(input: string) {
  return (input || '').replace(/[^\d+]/g, '');
}

async function ensureInit(): Promise<OneSignalGlobal> {
  const os = await onReady();
  // OneSignalInit.tsx deja face init; aici doar ne asigurăm că OneSignal există
  return os;
}

// -- API public (menținând numele deja folosite în UI) --

export const oneSignal = {
  async initialize(): Promise<void> {
    await ensureInit();
  },

  async isSubscribed(): Promise<boolean> {
    const os = await ensureInit();
    return !!os.User?.PushSubscription?.optedIn;
  },

  async subscribe(): Promise<boolean> {
    const os = await ensureInit();

    // dacă browserul nu suportă push, întoarce false
    if (!os.Notifications?.isPushSupported?.()) return false;

    // opțional: cere promptul nativ (optIn îl poate lansa oricum la nevoie)
    try {
      await os.Notifications.requestPermission();
    } catch {}

    await os.User.PushSubscription.optIn();
    return !!os.User.PushSubscription.optedIn;
  },

  async unsubscribe(): Promise<boolean> {
    const os = await ensureInit();
    await os.User.PushSubscription.optOut();
    return !os.User.PushSubscription.optedIn;
  },

  // --------- EMAIL ---------
  async setEmail(email: string): Promise<void> {
    const os = await ensureInit();
    const value = (email || '').trim();
    if (!value) throw new Error('Email gol');
    await os.User.addEmail(value);
  },

  async removeEmail(email: string): Promise<void> {
    const os = await ensureInit();
    const value = (email || '').trim();
    if (!value) throw new Error('Email gol');
    await os.User.removeEmail(value);
  },

  // --------- SMS ---------
  async setSMSNumber(phone: string): Promise<void> {
    const os = await ensureInit();
    const e164 = toE164(phone);
    if (!e164.startsWith('+')) throw new Error('Telefonul trebuie în format E.164 (ex: +40712345678)');
    await os.User.addSms(e164);
  },

  async removeSms(phone: string): Promise<void> {
    const os = await ensureInit();
    const e164 = toE164(phone);
    if (!e164) throw new Error('Telefon lipsă');
    await os.User.removeSms(e164);
  },

  // --------- Tags & profil minim ----------
  async configureUser(opts: { email?: string; phoneNumber?: string; location?: string }) {
    const os = await ensureInit();

    if (opts.email) {
      await this.setEmail(opts.email);
    }
    if (opts.phoneNumber) {
      await this.setSMSNumber(opts.phoneNumber);
    }
    if (opts.location && os.User.addTags) {
      await os.User.addTags({ location: opts.location });
    }
  },
};

// ---- Helper de test prin funcția Netlify (export separat) ----
export async function sendServerTestNotification(payload: {
  level?: 'caution' | 'warning' | 'danger';
  windSpeed?: number;
  channels?: Array<'push' | 'email' | 'sms'>;
  include_subscription_ids?: string[];
  include_email_tokens?: string[];
  include_phone_numbers?: string[];
} = {}) {
  const body: any = {
    level: payload.level ?? 'warning',
    windSpeed: payload.windSpeed ?? 30,
  };

  if (payload.channels) body.channels = payload.channels;
  if (payload.include_subscription_ids?.length)
    body.include_subscription_ids = payload.include_subscription_ids;
  if (payload.include_email_tokens?.length)
    body.include_email_tokens = payload.include_email_tokens;
  if (payload.include_phone_numbers?.length)
    body.include_phone_numbers = payload.include_phone_numbers;

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
