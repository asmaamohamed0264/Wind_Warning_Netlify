'use client';

import { useEffect, useState } from 'react';
import { useWeather } from '@/lib/context/WeatherContext';
import { oneSignal } from '@/lib/onesignal';
import { WeatherDashboard } from '@/components/WeatherDashboard';
import { AlertPanel } from '@/components/AlertPanel';
import { ThresholdControl } from '@/components/ThresholdControl';
import { NotificationSettings } from '@/components/NotificationSettings';
import { Toaster } from '@/components/ui/sonner';
import { RefreshCw, Wifi, WifiOff, MapPin } from 'lucide-react';

export default function Home() {
  const { state, fetchWeatherData, setThreshold } = useWeather();
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize OneSignal
  useEffect(() => {
    if (isClient) {
      oneSignal.initialize();
    }
  }, [isClient]);

  const handleManualRefresh = () => {
    fetchWeatherData(true);
  };

  if (state.loading && !state.current) {
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

  if (state.error && !state.current) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">Serviciul Meteo Indisponibil</h2>
          <p className="text-gray-400 mb-4">{state.error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleManualRefresh}
              disabled={state.refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg transition-colors flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${state.refreshing ? 'animate-spin' : ''}`} />
              {state.refreshing ? 'Se reîncearcă...' : 'Încearcă din nou'}
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
              {state.isOnline ? (
                <Wifi className="h-4 w-4 text-green-400 mr-1" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-400 mr-1" />
              )}
              <span className={state.isOnline ? 'text-green-400' : 'text-red-400'}>
                {state.isOnline ? 'Conectat' : 'Deconectat'}
              </span>
            </div>
            
                   {state.lastUpdate && (
                     <div className="text-gray-400">
                       Ultima actualizare: {state.lastUpdate.toLocaleTimeString('ro-RO', {
                         hour: '2-digit',
                         minute: '2-digit'
                       })}
                       {state.weatherProvider && (
                         <span className="ml-2 text-xs text-blue-400">
                           ({state.weatherProvider === 'open-meteo' ? '📡 ECMWF' : '🌦️ OpenWeather'})
                         </span>
                       )}
                     </div>
                   )}
            
            <button
              onClick={handleManualRefresh}
              disabled={state.refreshing}
              className="flex items-center text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${state.refreshing ? 'animate-spin' : ''}`} />
              {state.refreshing ? 'Se actualizează...' : 'Actualizează'}
            </button>
          </div>
        </header>

        {/* Alert Panel */}
        {state.currentAlert && (
          <div className="mb-8">
            <AlertPanel alert={state.currentAlert} />
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Weather Dashboard */}
          <div className="lg:col-span-2">
            {state.current && (
              <WeatherDashboard 
                data={state.current} 
                alertLevel={state.alertLevel}
                forecast={state.forecast.slice(0, 8)}
                threshold={state.threshold}
              />
            )}
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            <ThresholdControl
              value={state.threshold}
              onChange={setThreshold}
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
