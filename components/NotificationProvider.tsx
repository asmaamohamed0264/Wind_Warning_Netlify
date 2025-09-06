'use client';

import { NotificationAPIProvider } from '@notificationapi/react';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export default function NotificationProvider({ children }: NotificationProviderProps) {
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