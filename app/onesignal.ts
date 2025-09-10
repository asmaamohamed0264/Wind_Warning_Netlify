'use client';
import OneSignal from 'react-onesignal';

const APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
  process.env.VITE_ONESIGNAL_APP_ID ||
  process.env.ONESIGNAL_APP_ID;

export async function initOneSignal() {
  if (!APP_ID) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Missing OneSignal App ID');
    }
    return;
  }
  try {
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
      serviceWorkerParam: { scope: '/' },
      notifyButton: { enable: true },
    });
    // opțional:
    // await OneSignal.registerForPushNotifications();
  } catch (e) {
    console.error('OneSignal init error', e);
  }
}
