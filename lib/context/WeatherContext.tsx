'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { WeatherData, ForecastData, WeatherResponseSchema } from '@/types/weather';
import { AlertLevel, Alert } from '@/types/alerts';
import { toast } from 'sonner';
import { trackAlertSent, trackWeatherFetch, trackThresholdChange, trackError } from '@/lib/analytics';

// State shape
interface WeatherState {
  current: WeatherData | null;
  forecast: ForecastData[];
  alertLevel: AlertLevel;
  currentAlert: Alert | null;
  threshold: number;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  isOnline: boolean;
  refreshing: boolean;
  weatherProvider: 'open-meteo' | 'openweather' | null;
}

// Action types
type WeatherAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'SET_WEATHER_DATA'; payload: { current: WeatherData; forecast: ForecastData[]; provider?: 'open-meteo' | 'openweather' } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ALERT'; payload: { level: AlertLevel; alert: Alert | null } }
  | { type: 'SET_THRESHOLD'; payload: number }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: WeatherState = {
  current: null,
  forecast: [],
  alertLevel: 'normal',
  currentAlert: null,
  threshold: 50,
  loading: true,
  error: null,
  lastUpdate: null,
  isOnline: true,
  refreshing: false,
  weatherProvider: null,
};

// Reducer
function weatherReducer(state: WeatherState, action: WeatherAction): WeatherState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_REFRESHING':
      return { ...state, refreshing: action.payload };
    
    case 'SET_WEATHER_DATA':
      return {
        ...state,
        current: action.payload.current,
        forecast: action.payload.forecast,
        weatherProvider: action.payload.provider || null,
        lastUpdate: new Date(),
        loading: false,
        error: null,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
        refreshing: false,
      };
    
    case 'SET_ALERT':
      return {
        ...state,
        alertLevel: action.payload.level,
        currentAlert: action.payload.alert,
      };
    
    case 'SET_THRESHOLD':
      return { ...state, threshold: action.payload };
    
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    default:
      return state;
  }
}

// Context type
interface WeatherContextType {
  state: WeatherState;
  fetchWeatherData: (showRefreshToast?: boolean) => Promise<void>;
  setThreshold: (threshold: number) => void;
  analyzeForecasts: () => void;
}

// Create context
const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

// Provider props
interface WeatherProviderProps {
  children: React.ReactNode;
}

// Provider component
export function WeatherProvider({ children }: WeatherProviderProps) {
  const [state, dispatch] = useReducer(weatherReducer, initialState);
  const lastNotificationRef = useRef<{ level: string; time: number } | null>(null);

  // Load threshold from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedThreshold = localStorage.getItem('alert_threshold');
    if (savedThreshold) {
      dispatch({ type: 'SET_THRESHOLD', payload: parseInt(savedThreshold, 10) });
    }
  }, []);

  // Save threshold to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('alert_threshold', state.threshold.toString());
  }, [state.threshold]);

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      toast.success('Conexiunea a fost restabilită');
      fetchWeatherData();
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
      toast.error('Conexiune pierdută');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch weather data
  const fetchWeatherData = useCallback(async (showRefreshToast = false) => {
    if (showRefreshToast) {
      dispatch({ type: 'SET_REFRESHING', payload: true });
    }

    try {
      dispatch({ type: 'CLEAR_ERROR' });
      const response = await fetch('/api/weather');

      if (!response.ok) {
        throw new Error(`Weather service error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate with Zod
      const validatedData = WeatherResponseSchema.parse(data);

      dispatch({
        type: 'SET_WEATHER_DATA',
        payload: {
          current: validatedData.current,
          forecast: validatedData.forecast,
          provider: (data.provider as 'open-meteo' | 'openweather') || undefined,
        },
      });

      // Track successful fetch
      const cacheHit = response.headers.get('X-Cache') === 'HIT';
      trackWeatherFetch(true, cacheHit);

      if (showRefreshToast) {
        toast.success('Datele meteo au fost actualizate');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });

      // Track failed fetch
      trackWeatherFetch(false, false);
      if (err instanceof Error) {
        trackError(err, 'fetchWeatherData');
      }

      if (showRefreshToast) {
        toast.error('Actualizarea datelor meteo a eșuat');
      }
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, []);

  // Generate alert message
  const generateAlertMessage = useCallback((level: AlertLevel, windSpeed: number): string => {
    switch (level) {
      case 'danger':
        return `PERICOL MAJOR DE VÂNT! Se așteaptă vânturi de până la ${Math.round(windSpeed)} km/h. Rămâi în interior și fixează imediat toate obiectele mobile.`;
      case 'warning':
        return `Vânturi puternice prognozate! Vânturi de până la ${Math.round(windSpeed)} km/h. Exercită precauție extremă când ieși afară.`;
      case 'caution':
        return `Se așteaptă vânturi moderate. Vânturi de până la ${Math.round(windSpeed)} km/h. Fii atent la schimbările de condiții.`;
      default:
        return '';
    }
  }, []);

  // Trigger notifications with debounce
  const triggerNotifications = useCallback(async (level: AlertLevel, windSpeed: number, time: string) => {
    const now = Date.now();
    const last = lastNotificationRef.current;

    // Debounce: max 1 notificare / 5 min pentru același nivel
    if (last && last.level === level && now - last.time < 5 * 60 * 1000) {
      console.log('Notification suppressed (debounced):', { level, windSpeed });
      return;
    }

    lastNotificationRef.current = { level, time: now };

    const alertMessage = generateAlertMessage(level, windSpeed);

    try {
      await fetch('/api/send-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          windSpeed: Math.round(windSpeed),
          time,
          message: alertMessage,
        }),
      });

      console.log(`Alert sent: Level ${level}, Wind ${Math.round(windSpeed)} km/h`);
      
      // Track alert sent
      trackAlertSent(level, Math.round(windSpeed), time);
    } catch (error) {
      console.error('Failed to send alerts:', error);
      if (error instanceof Error) {
        trackError(error, 'triggerNotifications');
      }
    }
  }, [generateAlertMessage]);

  // Analyze forecasts
  const analyzeForecasts = useCallback(() => {
    if (!state.forecast || state.forecast.length === 0) {
      return;
    }

    const next8Hours = state.forecast.slice(0, 8);
    const dangerousWinds = next8Hours.filter(
      (forecast) => forecast.windSpeed > state.threshold || forecast.windGust > state.threshold
    );

    if (dangerousWinds.length > 0) {
      const maxWind = Math.max(
        ...dangerousWinds.map((f) => Math.max(f.windSpeed, f.windGust))
      );
      const alertTime = dangerousWinds[0].time;

      let level: AlertLevel;
      if (maxWind >= state.threshold * 1.5) {
        level = 'danger';
      } else if (maxWind >= state.threshold * 1.2) {
        level = 'warning';
      } else {
        level = 'caution';
      }

      const alert: Alert = {
        level,
        maxWindSpeed: maxWind,
        time: alertTime,
        message: generateAlertMessage(level, maxWind),
        timestamp: new Date().toISOString(),
      };

      dispatch({ type: 'SET_ALERT', payload: { level, alert } });

      // Trigger notifications
      if (level === 'caution' || level === 'warning' || level === 'danger') {
        triggerNotifications(level, maxWind, alertTime);
      }
    } else {
      dispatch({ type: 'SET_ALERT', payload: { level: 'normal', alert: null } });
    }
  }, [state.forecast, state.threshold, generateAlertMessage, triggerNotifications]);

  // Auto-analyze when forecast or threshold changes
  useEffect(() => {
    if (state.forecast && state.forecast.length > 0) {
      analyzeForecasts();
    }
  }, [state.forecast, state.threshold, analyzeForecasts]);

  // Auto-fetch weather data every 5 minutes
  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(() => fetchWeatherData(), 300000);
    return () => clearInterval(interval);
  }, [fetchWeatherData]);

  // Set threshold
  const setThreshold = useCallback((threshold: number) => {
    const oldThreshold = state.threshold;
    dispatch({ type: 'SET_THRESHOLD', payload: threshold });
    
    // Track threshold change
    if (oldThreshold !== threshold) {
      trackThresholdChange(oldThreshold, threshold);
    }
  }, [state.threshold]);

  const value: WeatherContextType = {
    state,
    fetchWeatherData,
    setThreshold,
    analyzeForecasts,
  };

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

// Custom hook
export function useWeather() {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
}
