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
      toast.success('Conexiunea a fost restabilită!');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Conexiunea a fost pierdută!');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch weather data (simulat aici, înlocuiește cu API real)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Simulare date meteo (înlocuiește cu fetch real către OpenWeatherMap)
        const mockWeather: WeatherData = {
          temperature: 22,
          windSpeed: 45, // Schimbă pentru a testa alerte
          windGust: 55,
          humidity: 60,
          pressure: 1013,
          visibility: 10000,
          windDirection: 270,
          description: 'Cer senin',
          icon: '01d',
          location: 'Aleea Someșul Cald',
          timestamp: new Date().toISOString(),
        };
        const mockForecast: ForecastData[] = Array(8).fill(0).map((_, i) => ({
          time: new Date(Date.now() + i * 3600000).toISOString(),
          temperature: 22 + i,
          windSpeed: 40 + i * 2,
          windGust: 50 + i * 2,
          windDirection: 270,
          description: 'Cer senin',
          icon: '01d',
        }));

        setWeatherData(mockWeather);
        setForecastData(mockForecast);
        setLastUpdate(new Date());
      } catch (err) {
        setError('Eroare la încărcarea datelor meteo');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Update la 5 minute
    return () => clearInterval(interval);
  }, []);

  // Check for alerts based on wind speed
  useEffect(() => {
    if (!weatherData) return;

    let maxWind = weatherData.windSpeed;
    let maxGust = weatherData.windGust;
    forecastData.forEach((item) => {
      maxWind = Math.max(maxWind, item.windSpeed);
      maxGust = Math.max(maxGust, item.windGust);
    });

    let newLevel: AlertLevel = 'normal';
    let message = '';
    let maxWindSpeed = Math.max(maxWind, maxGust);

    if (maxWindSpeed > alertThreshold + 30) {
      newLevel = 'danger';
      message = 'DANGER: Vânt extrem prognozat! Viteze peste ' + Math.round(maxWindSpeed) + ' km/h. Evitați zonele expuse și securizați proprietățile.';
    } else if (maxWindSpeed > alertThreshold + 10) {
      newLevel = 'warning';
      message = 'WARNING: Vânt puternic prognozat! Viteze până la ' + Math.round(maxWindSpeed) + ' km/h. Atenție la obiecte libere și structuri instabile.';
    } else if (maxWindSpeed > alertThreshold) {
      newLevel = 'caution';
      message = 'CAUTION: Vânt moderat prognozat. Viteze până la ' + Math.round(maxWindSpeed) + ' km/h. Fiți pregătiți pentru rafale.';
    }

    setAlertLevel(newLevel);
    setCurrentAlert(newLevel !== 'normal' ? { level: newLevel, message, timestamp: new Date().toISOString() } : null);

    // Trimite alertă automată dacă nivelul nu este normal
    if (newLevel !== 'normal') {
      fetch('/api/send-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: newLevel,
          windSpeed: Math.round(maxWindSpeed),
          channels: ['push', 'sms', 'email'],
        }),
      }).catch((err) => console.error('Eroare la trimitere alertă automată:', err));
    }
  }, [weatherData, forecastData, alertThreshold]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Datele au fost actualizate!');
    }, 1000); // Simulare refresh
  };

  if (!isClient) return null;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <Toaster position="top-right" />

      <header className="mb-8 flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center mb-4 md:mb-0">
          <Wind className="h-8 w-8 text-blue-400 mr-2" />
          <h1 className="text-2xl font-bold text-white">
            Monitor Vânt Aleea Someșul Cald
          </h1>
          <MapPin className="h-5 w-5 text-gray-400 ml-2" />
        </div>

        <div className="flex items-center space-x-4">
          {isOnline ? (
            <span className="flex items-center text-green-400 text-sm">
              <Wifi className="h-4 w-4 mr-1" /> Online
            </span>
          ) : (
            <span className="flex items-center text-red-400 text-sm">
              <WifiOff className="h-4 w-4 mr-1" /> Offline
            </span>
          )}
          <span className="text-gray-500 text-sm">
            {lastUpdate ? `Ultima actualizare: ${lastUpdate.toLocaleTimeString()}` : 'Fără date'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
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
  );
}
