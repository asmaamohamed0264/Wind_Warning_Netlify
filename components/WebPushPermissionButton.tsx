'use client';

import { NotificationAPIProvider } from '@notificationapi/react';

const WebPushPermissionButton: React.FC = () => {
  const notificationapi = NotificationAPIProvider.useNotificationAPIContext();

  return (
    <button
      onClick={() => {
        notificationapi.setWebPushOptIn(true);
      }}
      style={{
        padding: '10px 20px',
        fontSize: '16px',
        backgroundColor: '#0070f3',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        margin: '10px'
      }}
    >
      Enable Web Push Notifications
    </button>
  );
};

export default WebPushPermissionButton;