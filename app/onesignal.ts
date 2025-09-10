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
    // Texte complete pentru butonul OneSignal (legacy notifyButton)
    const notifyText = {
      'tip.state.unsubscribed': 'Subscribe',
      'tip.state.subscribed': 'Subscribed',
      'tip.state.blocked': 'Blocked',

      'message.prenotify': 'Click to subscribe to notifications',
      'message.action.subscribed': 'Thanks for subscribing!',
      'message.action.resubscribed': 'You are subscribed',
      'message.action.unsubscribed': "You won't receive notifications",

      // cheia care îți dădea eroare în tipuri
      'message.action.subscribing': 'Subscribing…',

      'dialog.main.title': 'Manage notifications',
      'dialog.main.button.subscribe': 'SUBSCRIBE',
      'dialog.main.button.unsubscribe': 'UNSUBSCRIBE',
      'dialog.blocked.title': 'Unblock notifications',
      'dialog.blocked.message': 'Follow these instructions to allow notifications:',
    } as const;

    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
      serviceWorkerParam: { scope: '/' },

      // Forțăm tipurile aici ca să nu mai blocheze build-ul
      notifyButton: ({
        enable: true,
        prenotify: true,
        showCredit: false,
        position: 'bottom-right', // 'bottom-right' | 'bottom-left'
        size: 'medium',           // 'small' | 'medium' | 'large'
        text: notifyText,
        // offset: { bottom: '0px', left: '0px', right: '0px' }, // opțional
      } as any),
    });

    // opțional – prompt manual imediat:
    // await OneSignal.registerForPushNotifications();
  } catch (e) {
    console.error('OneSignal init error', e);
  }
}
