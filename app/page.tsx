'use client';

import { useState, useEffect } from 'react';
import { oneSignal } from '@/lib/onesignal';
import { WeatherDashboard } from '@/components/WeatherDashboard';
import { AlertPanel } from '@/components/AlertPanel';
import { ThresholdControl } from '@/components/ThresholdControl';
import { NotificationSettings } from '@/components/NotificationSettings';
import { WeatherData, ForecastData } from '@/types/weather';
import { AlertLevel } from '@/types/alerts';
import { Toaster } from '@/components/ui/sonner';
import { Wind, RefreshCw, Wifi, WifiOff, MapPin } from 'lucide-react';
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
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

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
      toast.success('Conexiunea a fost restabilită');
      fetchWeatherData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Conexiune pierdută');
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
    
    // Inițializează OneSignal doar pe client
    if (isClient) {
      oneSignal.initialize();
    }
    
    return () => clearInterval(interval);
  }, [isClient]);

  useEffect(() => {
    if (forecastData && forecastData.length > 0) {
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
        toast.success('Datele meteo au fost actualizate');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setLoading(false);
      
      if (showRefreshToast) {
        toast.error('Actualizarea datelor meteo a eșuat');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const analyzeForecasts = () => {
    if (!forecastData || forecastData.length === 0) {
      return;
    }
    
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
      if (level === 'caution' || level === 'warning' || level === 'danger') {
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
        return `PERICOL MAJOR DE VÂNT! Se așteaptă vânturi de până la ${Math.round(windSpeed)} km/h. Rămâi în interior și fixează imediat toate obiectele mobile.`;
      case 'warning':
        return `Vânturi puternice prognozate! Vânturi de până la ${Math.round(windSpeed)} km/h. Exercită precauție extremă când ieși afară.`;
      case 'caution':
        return `Se așteaptă vânturi moderate. Vânturi de până la ${Math.round(windSpeed)} km/h. Fii atent la schimbările de condiții.`;
      default:
        return '';
    }
  };

  const triggerNotifications = async (level: AlertLevel, windSpeed: number, time: string) => {
    const alertMessage = generateAlertMessage(level, windSpeed);

    // Toate notificările prin OneSignal (Push, SMS, Email)
    try {
      await fetch('/api/send-alerts-onesignal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          windSpeed: Math.round(windSpeed),
          time,
          message: alertMessage
        }),
      });
      
      console.log(`OneSignal notification sent: Level ${level}, Wind ${Math.round(windSpeed)} km/h`);
    } catch (error) {
      console.error('Failed to send OneSignal alerts:', error);
    }
  };

  const handleManualRefresh = () => {
    fetchWeatherData(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <img src="/1000088934-modified.png" alt="Monitor Vânt" className="h-16 w-16 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-300 text-lg">Se încarcă datele meteo...</p>
          <p className="text-gray-500 text-sm mt-2">Conectare la serviciile meteorologice</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Serviciul Meteo Indisponibil</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Se reîncearcă...' : 'Încearcă din nou'}
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
            <img src="/1000088934-modified.png" alt="Monitor Vânt Grand Arena" className="h-12 w-12 mr-3" />
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent text-center">
              Monitor Vânt Aleea Someșul Cald
            </h1>
          </div>
          <div className="flex items-center justify-center mb-2 text-gray-400">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">Aleea Someșul Cald, București</span>
          </div>
          <p className="text-gray-400 text-lg mb-4">
            Fii cu un pas înaintea condițiilor meteorologice periculoase cu monitorizare în timp real și alerte proactive
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
                {isOnline ? 'Conectat' : 'Deconectat'}
              </span>
            </div>
            
            {lastUpdate && (
              <div className="text-gray-400">
                Ultima actualizare: {lastUpdate.toLocaleTimeString('ro-RO', { 
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
              {refreshing ? 'Se actualizează...' : 'Actualizează'}
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
                forecast={forecastData ? forecastData.slice(0, 8) : []}
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
            🌍 Date furnizate de OpenWeatherMap • Actualizări la fiecare 5 minute
          </p>
          <p className="mb-2">
            🏛️ Construit pentru siguranța și liniștea sufletească în zona Grand Arena, București
          </p>
          <p className="mb-2 text-blue-400 font-medium">
            ⚡ Powered by Bogdan pentru Loredana
          </p>
          <p className="text-xs text-gray-600">
            Urgențe: 112 • Pentru avertizări meteorologice severe vizitează ANM (Administrația Națională de Meteorologie)
          </p>
        </footer>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}