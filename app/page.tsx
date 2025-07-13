'use client';

import { useState, useEffect } from 'react';
import { WeatherDashboard } from '@/components/WeatherDashboard';
import { AlertPanel } from '@/components/AlertPanel';
import { ThresholdControl } from '@/components/ThresholdControl';
import { NotificationSettings } from '@/components/NotificationSettings';
import { WeatherData, ForecastData } from '@/types/weather';
import { AlertLevel } from '@/types/alerts';
import { Toaster } from '@/components/ui/sonner';
import { Wind, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';

export default function Home() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [alertThreshold, setAlertThreshold] = useState(50); // km/h
  const [alertLevel, setAlertLevel] = useState<AlertLevel>('normal');
  const [currentAlert, setCurrentAlert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load saved threshold from localStorage
  useEffect(() => {
    const savedThreshold = localStorage.getItem('alert_threshold');
    if (savedThreshold) {
      setAlertThreshold(parseInt(savedThreshold, 10));
    }
  }, []);

  // Save threshold to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('alert_threshold', alertThreshold.toString());
  }, [alertThreshold]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
      fetchWeatherData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (forecastData.length > 0) {
      analyzeForecasts();
    }
  }, [forecastData, alertThreshold]);

  const fetchWeatherData = async (showRefreshToast = false) => {
    if (showRefreshToast) {
      setRefreshing(true);
    }

    try {
      setError(null);
      const response = await fetch('/api/weather');
      
      if (!response.ok) {
        throw new Error(`Weather service error: ${response.status}`);
      }
      
      const data = await response.json();
      setWeatherData(data.current);
      setForecastData(data.forecast);
      setLastUpdate(new Date());
      setLoading(false);
      
      if (showRefreshToast) {
        toast.success('Weather data updated');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      
      if (showRefreshToast) {
        toast.error('Failed to update weather data');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const analyzeForecasts = () => {
    const next8Hours = forecastData.slice(0, 8);
    const dangerousWinds = next8Hours.filter(forecast => 
      forecast.windSpeed > alertThreshold || forecast.windGust > alertThreshold
    );

    if (dangerousWinds.length > 0) {
      const maxWind = Math.max(...dangerousWinds.map(f => Math.max(f.windSpeed, f.windGust)));
      const alertTime = dangerousWinds[0].time;
      
      let level: AlertLevel;
      if (maxWind >= alertThreshold * 1.5) {
        level = 'danger';
      } else if (maxWind >= alertThreshold * 1.2) {
        level = 'warning';
      } else {
        level = 'caution';
      }

      setAlertLevel(level);
      setCurrentAlert({
        level,
        maxWindSpeed: maxWind,
        time: alertTime,
        message: generateAlertMessage(level, maxWind)
      });

      // Trigger notifications if this is a new alert
      if (level !== 'normal') {
        triggerNotifications(level, maxWind, alertTime);
      }
    } else {
      setAlertLevel('normal');
      setCurrentAlert(null);
    }
  };

  const generateAlertMessage = (level: AlertLevel, windSpeed: number): string => {
    switch (level) {
      case 'danger':
        return `MAJOR WIND DANGER! Winds up to ${Math.round(windSpeed)} km/h expected. Stay indoors and secure all loose objects immediately.`;
      case 'warning':
        return `Strong winds forecasted! Winds up to ${Math.round(windSpeed)} km/h. Exercise extreme caution when outdoors.`;
      case 'caution':
        return `Moderate winds expected. Winds up to ${Math.round(windSpeed)} km/h. Be aware of changing conditions.`;
      default:
        return '';
    }
  };

  const triggerNotifications = async (level: AlertLevel, windSpeed: number, time: string) => {
    // Browser Push Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🌪️ Wind Warning Alert', {
        body: generateAlertMessage(level, windSpeed),
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'wind-alert',
        requireInteraction: level === 'danger',
        silent: false
      });
    }

    // SMS Notifications via Netlify Function
    try {
      await fetch('/api/send-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          windSpeed: Math.round(windSpeed),
          time,
          message: generateAlertMessage(level, windSpeed)
        }),
      });
    } catch (error) {
      console.error('Failed to send SMS alerts:', error);
    }
  };

  const handleManualRefresh = () => {
    fetchWeatherData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Wind className="h-12 w-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Loading weather data...</p>
          <p className="text-gray-500 text-sm mt-2">Connecting to weather services</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Weather Service Unavailable</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Retrying...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Wind className="h-10 w-10 text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Wind Warning Bucharest
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-4">
            Stay ahead of dangerous wind conditions with real-time monitoring and proactive alerts
          </p>
          
          {/* Status Bar */}
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className="flex items-center">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-400 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400 mr-1" />
              )}
              <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {lastUpdate && (
              <div className="text-gray-400">
                Last update: {lastUpdate.toLocaleTimeString('ro-RO', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
            
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </header>

        {/* Alert Panel */}
        {currentAlert && (
          <div className="mb-8">
            <AlertPanel alert={currentAlert} />
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Weather Dashboard */}
          <div className="lg:col-span-2">
            {weatherData && (
              <WeatherDashboard 
                data={weatherData} 
                alertLevel={alertLevel}
                forecast={forecastData.slice(0, 8)}
                threshold={alertThreshold}
              />
            )}
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            <ThresholdControl
              value={alertThreshold}
              onChange={setAlertThreshold}
            />
            <NotificationSettings />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm border-t border-gray-800 pt-6">
          <p className="mb-2">
            🌍 Data provided by OpenWeatherMap • Updates every 5 minutes
          </p>
          <p className="mb-2">
            🏛️ Built for safety and peace of mind in Bucharest, Romania
          </p>
          <p className="text-xs text-gray-600">
            Emergency: 112 • For severe weather warnings visit ANM (Administrația Națională de Meteorologie)
          </p>
        </footer>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}