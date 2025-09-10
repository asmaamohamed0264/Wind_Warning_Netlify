export type AlertLevel = 'normal' | 'caution' | 'warning' | 'danger';

export interface Alert {
  level: AlertLevel;
  maxWindSpeed: number;
  time: string;
  message: string;
  timestamp: string;
}