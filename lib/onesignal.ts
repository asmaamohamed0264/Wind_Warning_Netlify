// OneSignal SDK pentru frontend (React wrapper)
// Folosim importul implicit corect pentru versiunea instalată
import OneSignal from 'react-onesignal';

export class OneSignalManager {
  private static instance: OneSignalManager;
  private initialized = false;

  static getInstance(): OneSignalManager {
    if (!OneSignalManager.instance) {
      OneSignalManager.instance = new OneSignalManager();
    }
    return OneSignalManager.instance;
  }

  async initialize() {
    if (this.initialized) return;

    // Verifică dacă suntem pe client
    if (typeof window === 'undefined') {
      return;
    }

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || process.env.VITE_ONESIGNAL_APP_ID;
    
    if (!appId) {
      console.warn('OneSignal App ID not found in environment variables');
      return;
    }

    try {
      // API-ul react-onesignal expune un obiect implicit cu metode precum init/on/etc.
      await OneSignal.init({
        appId,
        safari_web_id: 'web.onesignal.auto.18140b17-b78f-4328-83f2-0a73b3bd766f',
        notifyButton: { enable: false },
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
      } as any);

      this.initialized = true;
      console.log('OneSignal initialized successfully');

      // Configurează event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('OneSignal initialization failed:', error);
    }
  }

  private setupEventListeners() {
    // Evenimente clasice din react-onesignal (SDK v2)
    // Dacă librăria este actualizată la SDK v16, aceste evenimente pot să nu mai existe.
    // În acest caz, pur și simplu vor fi ignorate.
    try {
      (OneSignal as any).on?.('subscriptionChange', (isSubscribed: boolean) => {
        console.log('OneSignal subscription changed:', isSubscribed);
        localStorage.setItem('onesignal_subscribed', String(isSubscribed));
      });

      (OneSignal as any).on?.('notificationReceived', (event: any) => {
        console.log('OneSignal notification received:', event);
        if (event?.data?.type === 'wind_alert') {
          this.handleWindAlert(event.data);
        }
      });

      (OneSignal as any).on?.('notificationClicked', (event: any) => {
        console.log('OneSignal notification clicked:', event);
        if (window.focus) window.focus();
      });
    } catch (e) {
      console.warn('OneSignal event listeners not available:', e);
    }
  }

  private handleWindAlert(data: any) {
    // Logică customizată pentru alertele de vânt
    console.log(`Wind alert received: Level ${data.level}, Speed: ${data.windSpeed} km/h`);
    
    // Poți actualiza UI-ul aplicației aici
    const event = new CustomEvent('windAlert', { detail: data });
    window.dispatchEvent(event);
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const permission = await (OneSignal as any).getNotificationPermission?.();
      if (permission === 'granted') return true;

      // Solicită permisiune clasică (SDK v2)
      if ((OneSignal as any).showSlidedownPrompt) {
        await (OneSignal as any).showSlidedownPrompt();
        const newPermission = await (OneSignal as any).getNotificationPermission?.();
        return newPermission === 'granted';
      }

      // Fallback: încearcă API-ul browser
      if (Notification && Notification.requestPermission) {
        const res = await Notification.requestPermission();
        return res === 'granted';
      }

      return false;
    } catch (error) {
      console.error('OneSignal permission request failed:', error);
      return false;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }
    
    if (!this.initialized) {
      return false;
    }

    try {
      if ((OneSignal as any).isPushNotificationsEnabled) {
        return await (OneSignal as any).isPushNotificationsEnabled();
      }
      // Fallback: verifică localStorage setat la subscriptionChange
      return localStorage.getItem('onesignal_subscribed') === 'true';
    } catch (error) {
      console.error('OneSignal subscription check failed:', error);
      return false;
    }
  }

  async subscribe(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return false;
      }

      if ((OneSignal as any).setSubscription) {
        await (OneSignal as any).setSubscription(true);
      }
      return await this.isSubscribed();
    } catch (error) {
      console.error('OneSignal subscription failed:', error);
      return false;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }

    try {
      if ((OneSignal as any).setSubscription) {
        await (OneSignal as any).setSubscription(false);
      }
      return !(await this.isSubscribed());
    } catch (error) {
      console.error('OneSignal unsubscription failed:', error);
      return false;
    }
  }

  async getUserId(): Promise<string | null> {
    if (!this.initialized) {
      return null;
    }

    try {
      if ((OneSignal as any).getUserId) {
        return await (OneSignal as any).getUserId();
      }
      return null;
    } catch (error) {
      console.error('OneSignal getUserId failed:', error);
      return null;
    }
  }

  async setEmail(email: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if ((OneSignal as any).setEmail) {
        await (OneSignal as any).setEmail(email);
      }
      console.log('OneSignal email set:', email);
    } catch (error) {
      console.error('OneSignal setEmail failed:', error);
      throw error;
    }
  }

  async setSMSNumber(phoneNumber: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if ((OneSignal as any).setSMSNumber) {
        await (OneSignal as any).setSMSNumber(phoneNumber);
      }
      console.log('OneSignal SMS number set:', phoneNumber);
    } catch (error) {
      console.error('OneSignal setSMSNumber failed:', error);
      throw error;
    }
  }

  async setTags(tags: Record<string, string>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if ((OneSignal as any).sendTags) {
        await (OneSignal as any).sendTags(tags);
      }
      console.log('OneSignal tags set:', tags);
    } catch (error) {
      console.error('OneSignal setTags failed:', error);
      throw error;
    }
  }

  // Configurează utilizatorul cu toate datele
  async configureUser(options: {
    email?: string;
    phoneNumber?: string;
    alertThreshold?: number;
    location?: string;
  }): Promise<void> {
    const tags: Record<string, string> = {
      location: options.location || 'Aleea Someșul Cald',
      alertThreshold: options.alertThreshold?.toString() || '50',
      userType: 'wind_monitor',
    };

    await this.setTags(tags);

    if (options.email) {
      await this.setEmail(options.email);
    }

    if (options.phoneNumber) {
      await this.setSMSNumber(options.phoneNumber);
    }
  }

  // Testează notificarea
  async sendTestNotification(): Promise<void> {
    const userId = await this.getUserId();
    if (!userId) {
      throw new Error('User not subscribed to OneSignal');
    }

    // Trimite prin API-ul nostru
    await fetch('/api/send-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'caution',
        windSpeed: 25,
        message: 'Aceasta este o notificare de test pentru Monitor Vânt Aleea Someșul Cald.',
        test: true,
      }),
    });
  }
}

// Export singleton instance
export const oneSignal = OneSignalManager.getInstance();
