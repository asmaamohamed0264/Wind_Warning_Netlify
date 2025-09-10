// components/OneSignalInit.tsx
'use client';

import { useEffect } from 'react';

const APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
  process.env.VITE_ONESIGNAL_APP_ID ||
  process.env.ONESIGNAL_APP_ID;

export default function OneSignalInit() {
  useEffect(() => {
    if (!APP_ID) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('OneSignal App ID missing');
      }
      return;
    }

    // Folosim coada injectată în <head> (v16)
    // vezi Script-urile deja prezente în app/layout.tsx
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
    (window as any).OneSignalDeferred.push(async function (OneSignal: any) {
      try {
        await OneSignal.init({
          appId: APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerPath: '/OneSignalSDKWorker.js',
          serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
          serviceWorkerParam: { scope: '/' },
          notifyButton: { enable: true },
        });
        // Prompt manual (opțional):
        // await OneSignal.registerForPushNotifications();
      } catch (e) {
        console.error('OneSignal init error', e);
      }
    });
  }, []);

  return null;
}
