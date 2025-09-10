// components/OneSignalInit.tsx
'use client';

import { useEffect } from 'react';

export default function OneSignalInit() {
  useEffect(() => {
    // ne asigurăm că există coada
    (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];

    (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!, // vezi pasul 4
        });
        OneSignal.Debug?.setLogLevel?.('info'); // opțional: loguri
        console.log('[OneSignal] init OK');
      } catch (err) {
        console.error('[OneSignal] init error', err);
      }
    });
  }, []);

  return null;
}
