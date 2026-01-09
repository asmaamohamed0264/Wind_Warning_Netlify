/**
 * Analytics & Monitoring utility
 * Tracked cu Google Analytics, Plausible sau alt serviciu
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    plausible?: (...args: any[]) => void;
  }
}

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }

  // Plausible Analytics
  if (window.plausible) {
    window.plausible(eventName, { props: properties });
  }

  // Console log pentru development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Analytics Event:', eventName, properties);
  }
}

/**
 * Track page view
 */
export function trackPageView(url: string) {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
      page_path: url,
    });
  }

  if (window.plausible) {
    window.plausible('pageview', { props: { url } });
  }
}

/**
 * Track weather alert sent
 */
export function trackAlertSent(level: string, windSpeed: number, time: string) {
  trackEvent('alert_sent', {
    category: 'alerts',
    level,
    windSpeed,
    time,
  });
}

/**
 * Track notification subscription
 */
export function trackSubscription(type: 'push' | 'sms' | 'email', action: 'subscribe' | 'unsubscribe') {
  trackEvent('notification_subscription', {
    category: 'notifications',
    type,
    action,
  });
}

/**
 * Track weather data fetch
 */
export function trackWeatherFetch(success: boolean, cacheHit: boolean) {
  trackEvent('weather_fetch', {
    category: 'api',
    success,
    cacheHit,
  });
}

/**
 * Track error occurrence
 */
export function trackError(error: Error, context?: string) {
  trackEvent('error_occurred', {
    category: 'errors',
    message: error.message,
    context,
    stack: error.stack?.substring(0, 200), // Limitat pentru a nu trimite prea multe date
  });
}

/**
 * Track performance metric
 */
export function trackPerformance(metric: string, value: number, unit: string) {
  trackEvent('performance_metric', {
    category: 'performance',
    metric,
    value,
    unit,
  });
}

/**
 * Track user threshold change
 */
export function trackThresholdChange(oldValue: number, newValue: number) {
  trackEvent('threshold_changed', {
    category: 'settings',
    oldValue,
    newValue,
    delta: newValue - oldValue,
  });
}
