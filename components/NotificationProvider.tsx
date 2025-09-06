'use client';

import { NotificationAPIProvider } from '@notificationapi/react';
import { useEffect } from 'react';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
  useEffect(() => {
    // Debug: Check if SDK loads
    console.log('NotificationProvider mounted');

    // Check if NotificationAPI is available after component mounts
    const checkSDK = () => {
      if (typeof window !== 'undefined') {
        console.log('Window NotificationAPI:', window.NotificationAPI);
      }
    };

    // Check immediately and after a delay
    checkSDK();
    setTimeout(checkSDK, 2000);
  }, []);

  return (
    <NotificationAPIProvider
      userId="pluscuplus@gmail.com"
      clientId="oeg9fa4v5dq7h8ug0irpau5wua"
      customServiceWorkerPath="/notificationapi-service-worker.js"
    >
      {children}
    </NotificationAPIProvider>
  );
}