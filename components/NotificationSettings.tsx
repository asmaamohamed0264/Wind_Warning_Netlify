'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Smartphone, Mail, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isEmailSubscribed, setIsEmailSubscribed] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    if ('Notification' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
      setPushEnabled(Notification.permission === 'granted');
    }

    // Load saved SMS preferences
    const savedPhone = localStorage.getItem('sms_phone_number');
    const savedSmsEnabled = localStorage.getItem('sms_enabled') === 'true';
    
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setSmsEnabled(savedSmsEnabled);
    }

    // Load saved Email preferences
    const savedEmail = localStorage.getItem('email_address');
    const savedEmailEnabled = localStorage.getItem('email_enabled') === 'true';
    if (savedEmail) {
      setEmailAddress(savedEmail);
      setIsEmailSubscribed(savedEmailEnabled);
    }
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    if (!pushSupported) {
      toast.error('Push notifications are not supported in your browser');
      return;
    }

    if (enabled) {
      try {
        const permission = await Notification.requestPermission();
        setPushPermission(permission);

        if (permission === 'granted') {
          const registration = await navigator.serviceWorker.register('/sw.js');
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
            ),
          });
          await fetch('/api/push-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription }),
          });
          setPushEnabled(true);
          toast.success('Push notifications enabled successfully!');
        } else {
          setPushEnabled(false);
          toast.error('Push notification permission denied');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast.error('Failed to enable push notifications');
      }
    } else {
      setPushEnabled(false);
      toast.success('Push notifications disabled');
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Enhanced Romanian phone number validation
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parentheses
    
    // Romanian formats: +40XXXXXXXXX, 0040XXXXXXXXX, 07XXXXXXXX, 07XX XXX XXX
    const romanianRegex = /^(\+40|0040|0)[6-79]\d{8}$/;
    
    // International format (more flexible)
    const internationalRegex = /^\+[1-9]\d{8,14}$/;
    
    // Check if it matches Romanian or international format
    const isRomanian = romanianRegex.test(cleanPhone);
    const isInternational = internationalRegex.test(cleanPhone);
    
    console.log('Phone validation:', { 
      original: phone, 
      cleaned: cleanPhone, 
      isRomanian, 
      isInternational 
    });
    
    return isRomanian || isInternational;
  };

  const handleSmsSubscribe = async () => {
    const trimmedPhone = phoneNumber.trim();
    
    if (!trimmedPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(trimmedPhone)) {
      toast.error('Vă rugăm introduceți un număr valid (ex: +40712345678, 0712345678)');
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await fetch('/api/sms-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: trimmedPhone }),
      });

      const data = await response.json();
      
      console.log('SMS subscription response:', { status: response.status, data });

      if (response.ok) {
        setSmsEnabled(true);
        localStorage.setItem('sms_phone_number', trimmedPhone);
        localStorage.setItem('sms_enabled', 'true');
        toast.success('Abonare SMS reușită! Veți primi un mesaj de confirmare.');
      } else {
        // Handle specific error messages
        if (data.error && data.error.includes('Invalid phone number')) {
          toast.error('Numărul de telefon nu este valid sau serviciul SMS este temporar indisponibil');
        } else if (data.error && data.error.includes('Twilio')) {
          toast.error('Serviciul SMS nu este configurat. Contactați administratorul.');
        } else {
          toast.error(data.error || 'Eroare la abonarea SMS. Încercați din nou.');
        }
      }
    } catch (error) {
      console.error('SMS subscription error:', error);
      toast.error('Eroare de conexiune. Verificați internetul și încercați din nou.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSmsUnsubscribe = async () => {
    const trimmedPhone = phoneNumber.trim();
    setIsUnsubscribing(true);

    try {
      const response = await fetch('/api/sms-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: trimmedPhone }),
      });

      const data = await response.json();

      if (response.ok) {
        setSmsEnabled(false);
        localStorage.setItem('sms_enabled', 'false');
        toast.success('Dezabonare SMS reușită');
      } else {
        toast.error(data.error || 'Eroare la dezabonare SMS');
      }
    } catch (error) {
      console.error('SMS unsubscription error:', error);
      toast.error('Eroare la dezabonare. Încercați din nou.');
    } finally {
      setIsUnsubscribing(false);
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
    
    setIsEmailLoading(true);
    
    // Simulare abonare (în aplicația reală s-ar face un apel API)
    setTimeout(() => {
      setIsEmailSubscribed(true);
      localStorage.setItem('email_address', emailAddress.trim());
      localStorage.setItem('email_enabled', 'true');
      toast.success(`Adresa ${emailAddress} a fost abonată cu succes la alertele email!`);
      setIsEmailLoading(false);
    }, 800);
  };

  const handleEmailUnsubscribe = () => {
    setIsEmailLoading(true);
    
    setTimeout(() => {
      setIsEmailSubscribed(false);
      localStorage.setItem('email_enabled', 'false');
      toast.success(`Adresa ${emailAddress} a fost dezabonată de la alertele email.`);
      setIsEmailLoading(false);
    }, 500);
  };

  const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return email;
    
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) return email;
    
    // Păstrează primele 2 caractere și ultimele 2 caractere din partea locală
    const maskedLocal = localPart.substring(0, 2) + '*'.repeat(Math.max(localPart.length - 4, 1)) + localPart.substring(localPart.length - 2);
    
    // Pentru domeniu, păstrează doar prima literă și restul după punct
    const [domainName, ...domainExtension] = domain.split('.');
    const maskedDomain = domainName.charAt(0) + '*'.repeat(Math.max(domainName.length - 1, 1)) + '.' + domainExtension.join('.');
    
    return `${maskedLocal}@${maskedDomain}`;
  };

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
              disabled={!pushSupported}
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
          
          {pushEnabled && (
            <div className="flex items-center text-xs text-green-400">
              <Check className="h-3 w-3 mr-1" />
              Notificările push sunt activate
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
                placeholder="+40712345678 sau 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                disabled={smsEnabled}
              />
              <p className="text-xs text-gray-500 mt-1">
                Acceptăm numere românești (+40) și internaționale
              </p>
            </div>

            {!smsEnabled ? (
              <Button
                onClick={handleSmsSubscribe}
                disabled={isSubscribing || !phoneNumber.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubscribing ? 'Se abonează...' : 'Abonează-te la Alerte SMS'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-green-400 mb-2">
                  <Check className="h-3 w-3 mr-1" />
                  Alertele SMS sunt activate pentru {phoneNumber}
                </div>
                <Button
                  onClick={handleSmsUnsubscribe}
                  disabled={isUnsubscribing}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {isUnsubscribing ? 'Se dezabonează...' : 'Dezabonează-te de la SMS'}
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
                disabled={isEmailSubscribed}
              />
            </div>

            {!isEmailSubscribed ? (
              <Button
                onClick={handleEmailSubscribe}
                disabled={isEmailLoading || !emailAddress.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isEmailLoading ? 'Se abonează...' : 'Abonează-te la Alerte Email'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-green-400 mb-2">
                  <Check className="h-3 w-3 mr-1" />
                  Alertele email sunt activate pentru {maskEmail(emailAddress)}
                </div>
                <Button
                  onClick={handleEmailUnsubscribe}
                  disabled={isEmailLoading}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {isEmailLoading ? 'Se dezabonează...' : 'Dezabonează-te de la Email'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-400">
          <h4 className="text-sm font-semibold text-white mb-1">Notă Importantă</h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            Alertele sunt trimise pentru viteze ale vântului care depășesc pragul configurat. 
            Pentru SMS se pot aplica tarifele standard de mesagerie. Te poți dezabona oricând 
            din orice tip de notificare.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}