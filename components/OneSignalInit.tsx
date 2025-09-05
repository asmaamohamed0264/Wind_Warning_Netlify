// components/OneSignalInit.tsx
'use client';

import { useEffect } from 'react';

export default function OneSignalInit() {
  useEffect(() => {
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];

    (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
          serviceWorkerPath: '/OneSignalSDKWorker.js', // Calea explicită
          serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
          allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development', // Pentru test local
        });
        OneSignal.Debug?.setLogLevel?.('info');
        console.log('[OneSignal] init OK');
      } catch (err) {
        console.error('[OneSignal] init error', err);
      }
    });
  }, []);

  return null;
}
