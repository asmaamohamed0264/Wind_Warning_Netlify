// lib/onesignal.ts
// Wrapper simplu pentru OneSignal Web SDK v16 (Email/SMS)

const APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string;

type OneSignalGlobal = {
  init: (opts: { appId: string }) => Promise<void>;
  User: {
    addEmail(email: string): Promise<void>;
    removeEmail(email: string): Promise<void>;
    addSms(phone: string): Promise<void>;
    removeSms(phone: string): Promise<void>;
  };
  Debug?: { setLogLevel?: (lvl: 'trace'|'info'|'warn'|'error') => void };
};

declare global {
  interface Window {
    OneSignal?: OneSignalGlobal;
    OneSignalDeferred: ((OneSignal: OneSignalGlobal) => void)[];
  }
}

let initialized = false;

// asigură-te că avem acces la OneSignal după ce s-a încărcat SDK-ul
async function getOneSignal(): Promise<OneSignalGlobal> {
  return new Promise<OneSignalGlobal>((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: OneSignalGlobal) => {
      if (!initialized) {
        initialized = true;
        try {
          await OneSignal.init({ appId: APP_ID });
        } catch {
          // poate a inițializat deja OneSignalInit
        }
      }
      resolve(OneSignal);
    });
  });
}

function toE164(input: string) {
  return (input || '').replace(/[^\d+]/g, '');
}

export async function addEmail(email: string): Promise<void> {
  const os = await getOneSignal();
  const value = (email || '').trim();
  if (!value) throw new Error('Email gol');
  await os.User.addEmail(value);
  console.log('[OneSignal] addEmail OK:', value);
}

export async function removeEmail(email: string): Promise<void> {
  const os = await getOneSignal();
  const value = (email || '').trim();
  if (!value) throw new Error('Email gol');
  await os.User.removeEmail(value);
  console.log('[OneSignal] removeEmail OK:', value);
}

export async function addSms(phone: string): Promise<void> {
  const os = await getOneSignal();
  const e164 = toE164(phone);
  if (!e164.startsWith('+')) {
    throw new Error('Telefonul trebuie în format E.164, ex: +40712345678');
  }
  await os.User.addSms(e164);
  console.log('[OneSignal] addSms OK:', e164);
}

export async function removeSms(phone: string): Promise<void> {
  const os = await getOneSignal();
  const e164 = toE164(phone);
  await os.User.removeSms(e164);
  console.log('[OneSignal] removeSms OK:', e164);
}
