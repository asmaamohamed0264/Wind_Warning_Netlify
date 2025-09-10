export interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  phoneNumber?: string;
}

export interface SMSSubscription {
  phoneNumber: string;
  isActive: boolean;
  subscribedAt: string;
}