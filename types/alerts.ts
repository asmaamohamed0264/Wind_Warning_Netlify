export type AlertLevel = 'normal' | 'caution' | 'warning' | 'danger';

export interface Alert {
  level: AlertLevel;
  maxWindSpeed: number;
  time: string;
  message: string;
  timestamp?: string;
  isCurrent?: boolean;    // true pentru alerte bazate pe condiții actuale
  isForecast?: boolean;   // true pentru alerte bazate pe prognoză
}
