'use client';

import { useState, useEffect } from 'react';
import { oneSignal } from '@/lib/onesignal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { sendServerTestNotification } from '@/lib/onesignal';

// ==== util: maschează o adresă de email (scos în afara componentei ca să evităm confuzii de acolade) ====
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) return email;

  const maskedLocal =
    localPart.slice(0, 2) +
    '*'.repeat(Math.max(localPart.length - 4, 1)) +
    localPart.slice(-2);

  const [domainName, ...domainExtension] = domain.split('.');
  const maskedDomain =
    (domainName[0] ?? '') +
    '*'.repeat(Math.max(domainName.length - 1, 1)) +
    (domainExtension.length ? `.${domainExtension.join('.')}` : '');

  return `${maskedLocal}@${maskedDomain}`;
}

export function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [isEmailSubscribed, setIsEmailSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initOneSignal = async () => {
      await oneSignal.initialize();
      const supported =
        typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
      setPushSupported(supported);

      const isSubscribed = await oneSignal.isSubscribed();
      setPushEnabled(isSubscribed);

      if ('Notification' in window) {
        setPushPermission(Notification.permission);
      }
    };

    initOneSignal();

    // SMS saved prefs
    const savedPhone = localStorage.getItem('sms_phone_number');
    const savedSmsEnabled = localStorage.getItem('sms_enabled') === 'true';
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setSmsEnabled(savedSmsEnabled);
    }

    // Email saved prefs
    const savedEmail = localStorage.getItem('email_address');
    const savedEmailEnabled = localStorage.getItem('email_enabled') === 'true';
    if (savedEmail) {
      setEmailAddress(savedEmail);
      setIsEmailSubscribed(savedEmailEnabled);
    }
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    if (!pushSupported) {
      toast.error('Notificările push nu sunt suportate în acest browser');
      return;
    }

    setIsLoading(true);
    if (enabled) {
      try {
        const success = await oneSignal.subscribe();
        if (success) {
          setPushEnabled(true);
          toast.success('Notificările push au fost activate cu succes!');
          await oneSignal.configureUser({
            email: emailAddress || undefined,
            phoneNumber: phoneNumber || undefined,
            location: 'Aleea Someșul Cald',
          });
        } else {
          setPushEnabled(false);
          toast.error('Permisiunea pentru notificări a fost refuzată');
        }
      } catch (error) {
        console.error('Error enabling OneSignal notifications:', error);
        toast.error('Eroare la activarea notificărilor push');
      }
    } else {
      try {
        const success = await oneSignal.unsubscribe();
        if (success) {
          setPushEnabled(false);
          toast.success('Notificările push au fost dezactivate');
        } else {
          toast.error('Eroare la dezactivarea notificărilor');
        }
      } catch (error) {
        console.error('Error disabling OneSignal notifications:', error);
        toast.error('Eroare la dezactivarea notificărilor push');
      }
    }
    setIsLoading(false);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const roE164 = /^\+40\d{9}$/;
    return roE164.test(cleanPhone);
  };

  const handleSmsSubscribe = async () => {
    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      toast.error('Vă rugăm introduceți un număr de telefon');
      return;
    }
    if (!validatePhoneNumber(trimmedPhone)) {
      toast.error('Vă rugăm introduceți un număr valid în format +40 (ex: +40712345678)');
      return;
    }

    setIsLoading(true);
    try {
      await oneSignal.setSMSNumber(trimmedPhone);
      setSmsEnabled(true);
      localStorage.setItem('sms_phone_number', trimmedPhone);
      localStorage.setItem('sms_enabled', 'true');

      await oneSignal.configureUser({
        email: emailAddress || undefined,
        phoneNumber: trimmedPhone,
        location: 'Aleea Someșul Cald',
      });

      toast.success('Abonare SMS reușită!');
    } catch (error) {
      console.error('OneSignal SMS subscription error:', error);
      toast.error('Eroare la configurarea SMS-ului. Încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmsUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await oneSignal.removeSms(phoneNumber.trim());
      setSmsEnabled(false);
      localStorage.setItem('sms_enabled', 'false');
      toast.success('Dezabonare SMS reușită');
    } catch (error) {
      console.error('OneSignal SMS unsubscription error:', error);
      toast.error('Eroare la dezabonare. Încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubscribe = async () => {
    if (!emailAddress.trim() || !validateEmail(emailAddress)) {
      toast.error('Vă rugăm introduceți o adresă de email validă.');
      return;
    }

    setIsLoading(true);
    try {
      await oneSignal.setEmail(emailAddress.trim());
      setIsEmailSubscribed(true);
      localStorage.setItem('email_address', emailAddress.trim());
      localStorage.setItem('email_enabled', 'true');

      await oneSignal.configureUser({
        email: emailAddress.trim(),
        phoneNumber: phoneNumber || undefined,
        location: 'Aleea Someșul Cald',
      });

      toast.success(`Adresa ${emailAddress} a fost configurată!`);
    } catch (error) {
      console.error('OneSignal email configuration error:', error);
      toast.error('Eroare la configurarea email-ului. Încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await oneSignal.removeEmail(emailAddress.trim());
      setIsEmailSubscribed(false);
      localStorage.setItem('email_enabled', 'false');
      toast.success('Email dezactivat pentru alerte.');
    } catch (error) {
      console.error('OneSignal email unsubscription error:', error);
      toast.error('Eroare la dezactivare email. Încercați din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  // ======================= JSX =======================
  return (
    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <img src="/1000088934-modified.png" alt="Notificări" className="mr-2 h-5 w-5" />
          Setări Notificări
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-white">Notificări Push Browser</Label>
              <p className="text-xs text-gray-400">
                Primește alerte instantanee în browser când sunt prognozate vânturi periculoase
              </p>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={handlePushToggle}
              disabled={isLoading}
            />
          </div>

          {!pushSupported && (
            <div className="flex items-center text-xs text-yellow-400">
              <AlertCircle className="h-3 w-3 mr-1" />
              Notificările push nu sunt suportate în acest browser
            </div>
          )}

          {pushSupported && pushPermission === 'denied' && (
            <div className="flex items-center text-xs text-red-400">
              <X className="h-3 w-3 mr-1" />
              Notificările push sunt blocate. Te rog activează-le în setările browserului.
            </div>
          )}

          {/* Status când push e activ */}
          {pushEnabled ? (
            <div className="flex items-center text-xs text-green-400">
              <Check className="h-3 w-3 mr-1" />
              <span>Notificările push sunt activate</span>
            </div>
          ) : null}

          {/* Test Notification Button */}
          {pushEnabled && (
            <div className="pt-4 border-t border-gray-700">
              <Button
                onClick={async () => {
                  try {
                    await sendServerTestNotification();
                    console.log('✅ Notificare de test trimisă');
                  } catch (e) {
                    console.error('❌ Eroare la trimitere', e);
                  }
                }}
                className="w-full mt-3"
                variant="secondary"
              >
                🧪 Trimite Notificare de Test
              </Button>
            </div>
          )}
        </div>

        {/* SMS Notifications */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-white flex items-center">
              <img src="/1000088934-modified.png" alt="SMS" className="h-4 w-4 mr-2" />
              Alerte SMS
            </Label>
            <p className="text-xs text-gray-400">
              Primește alerte prin mesaje text chiar și când nu ești online
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="phone" className="text-xs text-gray-400">
                Număr de Telefon
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+40712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                disabled={smsEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Introduceți numărul în format românesc cu prefix +40 (ex: +40712345678)
              </p>
            </div>

            {!smsEnabled ? (
              <Button
                onClick={handleSmsSubscribe}
                disabled={isLoading || !phoneNumber.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Se configurează...' : 'Configurează SMS'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-green-400 mb-2">
                  <Check className="h-3 w-3 mr-1" />
                  SMS configurat: {phoneNumber}
                </div>
                <Button
                  onClick={handleSmsUnsubscribe}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {isLoading ? 'Se dezactivează...' : 'Dezactivează SMS'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-white flex items-center">
              <Mail className="h-4 w-4 mr-2 text-green-400" />
              Alerte Email
            </Label>
            <p className="text-xs text-gray-400">
              Primește alerte detaliate prin email cu recomandări de siguranță
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="email" className="text-xs text-gray-400">
                Adresă de Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nume@exemplu.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                disabled={!pushSupported || isLoading}
              />
            </div>

            {!isEmailSubscribed ? (
              <Button
                onClick={handleEmailSubscribe}
                disabled={isLoading || !emailAddress.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? 'Se configurează...' : 'Configurează Email'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-green-400 mb-2">
                  <Check className="h-3 w-3 mr-1" />
                  Email configurat: {maskEmail(emailAddress)}
                </div>
                <Button
                  onClick={handleEmailUnsubscribe}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {isLoading ? 'Se dezactivează...' : 'Dezactivează Email'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="space-y-2 border-t border-gray-700 pt-4">
          {!pushSupported && (
            <div className="flex items-center text-xs text-yellow-400 mb-2">
              <AlertCircle className="h-3 w-3 mr-1" />
              Notificările push nu sunt disponibile în acest browser
            </div>
          )}
          <p className="text-xs text-gray-500">
            Alertele sunt trimise când vitezele vântului depășesc pragul configurat.
            Te poți dezabona oricând din orice tip de notificare.
          </p>
          {pushEnabled && (
            <div className="flex items-center text-xs text-green-400">
              <Check className="h-3 w-3 mr-1" />
              Notificări Push activate
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
