'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Smartphone, Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationSettings() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

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
    // Romanian phone number formats
    const romanianRegex = /^(\+40|0040|0)[72-79]\d{8}$/;
    // International format
    const internationalRegex = /^\+[1-9]\d{1,14}$/;
    
    const cleanPhone = phone.replace(/\s/g, '');
    return romanianRegex.test(cleanPhone) || internationalRegex.test(cleanPhone);
  };

  const handleSmsSubscribe = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error('Please enter a valid phone number (Romanian: +40XXXXXXXXX or 07XXXXXXXX)');
      return;
    }

    setIsSubscribing(true);

    try {
      const response = await fetch('/api/sms-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSmsEnabled(true);
        localStorage.setItem('sms_phone_number', phoneNumber.trim());
        localStorage.setItem('sms_enabled', 'true');
        toast.success('Successfully subscribed to SMS alerts!');
      } else {
        toast.error(data.error || 'Failed to subscribe to SMS alerts');
      }
    } catch (error) {
      console.error('SMS subscription error:', error);
      toast.error('Failed to subscribe to SMS alerts. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSmsUnsubscribe = async () => {
    setIsUnsubscribing(true);

    try {
      const response = await fetch('/api/sms-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSmsEnabled(false);
        localStorage.setItem('sms_enabled', 'false');
        toast.success('Successfully unsubscribed from SMS alerts');
      } else {
        toast.error(data.error || 'Failed to unsubscribe from SMS alerts');
      }
    } catch (error) {
      console.error('SMS unsubscription error:', error);
      toast.error('Failed to unsubscribe. Please try again.');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Bell className="mr-2 h-5 w-5 text-blue-400" />
          Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium text-white">Browser Push Notifications</Label>
              <p className="text-xs text-gray-400">
                Get instant alerts in your browser when dangerous winds are forecasted
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
              Push notifications not supported in this browser
            </div>
          )}
          
          {pushSupported && pushPermission === 'denied' && (
            <div className="flex items-center text-xs text-red-400">
              <X className="h-3 w-3 mr-1" />
              Push notifications blocked. Please enable in browser settings.
            </div>
          )}
          
          {pushEnabled && (
            <div className="flex items-center text-xs text-green-400">
              <Check className="h-3 w-3 mr-1" />
              Push notifications enabled
            </div>
          )}
        </div>

        {/* SMS Notifications */}
        <div className="space-y-4 border-t border-gray-700 pt-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium text-white flex items-center">
              <Smartphone className="h-4 w-4 mr-2 text-blue-400" />
              SMS Alerts
            </Label>
            <p className="text-xs text-gray-400">
              Receive text message alerts even when you're not online
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="phone" className="text-xs text-gray-400">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+40712345678 or 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                disabled={smsEnabled}
              />
            </div>

            {!smsEnabled ? (
              <Button
                onClick={handleSmsSubscribe}
                disabled={isSubscribing || !phoneNumber.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubscribing ? 'Subscribing...' : 'Subscribe to SMS Alerts'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-xs text-green-400 mb-2">
                  <Check className="h-3 w-3 mr-1" />
                  SMS alerts enabled for {phoneNumber}
                </div>
                <Button
                  onClick={handleSmsUnsubscribe}
                  disabled={isUnsubscribing}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  {isUnsubscribing ? 'Unsubscribing...' : 'Unsubscribe from SMS'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-400">
          <h4 className="text-sm font-semibold text-white mb-1">Important Notice</h4>
          <p className="text-xs text-gray-300 leading-relaxed">
            SMS alerts are sent for wind speeds exceeding your configured threshold. 
            Standard messaging rates may apply. You can unsubscribe at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}