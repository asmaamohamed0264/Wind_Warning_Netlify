'use client';

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeatherData, ForecastData } from '@/types/weather';
import { AlertLevel } from '@/types/alerts';
import { Wind, Navigation, Thermometer, Droplets, Eye, Gauge } from 'lucide-react';
import { ForecastChart } from './ForecastChart';
import { translateWeatherDescription, capitalizeFirst } from '@/lib/weatherTranslations';

interface WeatherDashboardProps {
  data: WeatherData;
  alertLevel: AlertLevel;
  forecast: ForecastData[];
  threshold?: number;
}

export const WeatherDashboard = memo(function WeatherDashboard({ data, alertLevel, forecast, threshold = 50 }: WeatherDashboardProps) {
  const getAlertColor = (level: AlertLevel) => {
    switch (level) {
      case 'danger': return 'border-red-500 bg-red-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'caution': return 'border-orange-500 bg-orange-500/10';
      default: return 'border-green-500 bg-green-500/10';
    }
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degrees / 22.5) % 16];
  };

  const getWindSpeedColor = (speed: number) => {
    if (speed >= threshold * 1.5) return 'text-red-400';
    if (speed >= threshold * 1.2) return 'text-orange-400';
    if (speed >= threshold) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getWindDescription = (speed: number) => {
    // Beaufort Scale - adapted for Romanian
    // More precise for low wind speeds (important for alerts)
    if (speed < 2) return 'Calm';
    if (speed < 6) return 'Aer ușor';
    if (speed < 12) return 'Briză ușoară';      // Beaufort 3
    if (speed < 20) return 'Briză slabă';       // Beaufort 4
    if (speed < 29) return 'Briză moderată';    // Beaufort 5
    if (speed < 39) return 'Briză vie';         // Beaufort 6
    if (speed < 50) return 'Vânt moderat';      // Beaufort 7
    if (speed < 62) return 'Vânt tare';         // Beaufort 8
    if (speed < 75) return 'Vânt foarte tare';  // Beaufort 9
    if (speed < 89) return 'Furtună';           // Beaufort 10
    return 'Furtună violentă';                  // Beaufort 11+
  };

  return (
    <div className="space-y-6">
      {/* Current Conditions */}
      <Card className={`border-2 transition-all duration-300 bg-gray-800/50 backdrop-blur-sm ${getAlertColor(alertLevel)}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center">
              <img src="/1000088934-modified.png" alt="Monitor Vânt" className="mr-2 h-6 w-6" />
              Condiții Actuale de Vânt
            </div>
            <div className="text-sm font-normal text-gray-400">
              📍 Aleea Someșul Cald • {new Date(data.timestamp).toLocaleTimeString('ro-RO', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Wind Speed */}
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${getWindSpeedColor(data.windSpeed)}`}>
                {Math.round(data.windSpeed)}
              </div>
              <div className="text-sm text-gray-400 mb-1">Viteza Vântului (km/h)</div>
              <div className="text-xs text-gray-500">{getWindDescription(data.windSpeed)}</div>
            </div>

            {/* Wind Gusts */}
            <div className="text-center">
              <div className={`text-4xl font-bold mb-1 ${getWindSpeedColor(data.windGust)}`}>
                {Math.round(data.windGust)}
              </div>
              <div className="text-sm text-gray-400 mb-1">Rafale (km/h)</div>
              <div className="text-xs text-gray-500">
                {data.windGust > data.windSpeed * 1.2 ? 'Condiții cu rafale' : 'Vânt constant'}
              </div>
            </div>

            {/* Wind Direction */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Navigation 
                  className="h-10 w-10 text-green-400 transition-transform duration-500" 
                  style={{ transform: `rotate(${data.windDirection}deg)` }}
                  aria-label={`Direcție vânt: ${getWindDirection(data.windDirection)} la ${data.windDirection} grade`}
                  role="img"
                />
              </div>
              <div className="text-2xl font-semibold text-green-400 mb-1">
                {getWindDirection(data.windDirection)}
              </div>
              <div className="text-sm text-gray-400">{data.windDirection}°</div>
            </div>
          </div>

          {/* Weather Description */}
        </CardContent>
      </Card>

      {/* Additional Weather Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-800/70 transition-colors">
          <CardContent className="p-4 text-center">
            <Thermometer className="h-6 w-6 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{Math.round(data.temperature)}°C</div>
            <div className="text-sm text-gray-400">Temperatură</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-800/70 transition-colors">
          <CardContent className="p-4 text-center">
            <Droplets className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{data.humidity}%</div>
            <div className="text-sm text-gray-400">Umiditate</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-800/70 transition-colors">
          <CardContent className="p-4 text-center">
            <Gauge className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{Math.round(data.pressure)}</div>
            <div className="text-sm text-gray-400">Presiune (hPa)</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700 hover:bg-gray-800/70 transition-colors">
          <CardContent className="p-4 text-center">
            <Eye className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{Math.round(data.visibility / 1000)}</div>
            <div className="text-sm text-gray-400">Vizibilitate (km)</div>
          </CardContent>
        </Card>
      </div>

      {/* 8-Hour Forecast Chart */}
      <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <img src="/1000088934-modified.png" alt="Prognoză" className="mr-2 h-5 w-5" />
              Prognoză Vânt 8 Ore
            </div>
            <div className="text-sm font-normal text-gray-400">
              Următoarele {forecast.length} ore • Actualizări la fiecare 3 ore
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ForecastChart data={forecast} threshold={threshold} />
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison pentru shallow equality
  return (
    prevProps.data.timestamp === nextProps.data.timestamp &&
    prevProps.alertLevel === nextProps.alertLevel &&
    prevProps.threshold === nextProps.threshold &&
    prevProps.forecast.length === nextProps.forecast.length
  );
});