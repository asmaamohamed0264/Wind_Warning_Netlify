/**
 * Open-Meteo Weather Service
 * 
 * Provides FREE access to ECMWF weather data (same model used by Ventusky)
 * - No API key required
 * - 10,000+ requests/day free tier
 * - High-resolution ECMWF model
 * - Hourly forecasts up to 7 days
 * 
 * @see https://open-meteo.com/
 */

import { WeatherData, ForecastData } from '@/types/weather';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// București - Aleea Someșul Cald (Popești-Leordeni / București Sud)
const BUCHAREST_LAT = 44.68;
const BUCHAREST_LON = 26.40;

interface OpenMeteoCurrentResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    weather_code: number[];
  };
}

/**
 * Maps WMO Weather Code to OpenWeatherMap icon format
 * @see https://open-meteo.com/en/docs
 */
function getWeatherIcon(wmoCode: number, isDay: boolean = true): string {
  const suffix = isDay ? 'd' : 'n';
  
  // WMO Weather interpretation codes
  if (wmoCode === 0) return `01${suffix}`; // Clear sky
  if (wmoCode <= 3) return `02${suffix}`; // Partly cloudy
  if (wmoCode <= 48) return `50${suffix}`; // Fog
  if (wmoCode <= 67) return `09${suffix}`; // Rain
  if (wmoCode <= 77) return `13${suffix}`; // Snow
  if (wmoCode <= 82) return `09${suffix}`; // Rain showers
  if (wmoCode <= 86) return `13${suffix}`; // Snow showers
  if (wmoCode <= 99) return `11${suffix}`; // Thunderstorm
  
  return `01${suffix}`; // Default
}

/**
 * Maps WMO Weather Code to description
 */
function getWeatherDescription(wmoCode: number): string {
  const descriptions: Record<number, string> = {
    0: 'clear sky',
    1: 'mainly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'fog',
    48: 'depositing rime fog',
    51: 'light drizzle',
    53: 'moderate drizzle',
    55: 'dense drizzle',
    61: 'slight rain',
    63: 'moderate rain',
    65: 'heavy rain',
    71: 'slight snow',
    73: 'moderate snow',
    75: 'heavy snow',
    77: 'snow grains',
    80: 'slight rain showers',
    81: 'moderate rain showers',
    82: 'violent rain showers',
    85: 'slight snow showers',
    86: 'heavy snow showers',
    95: 'thunderstorm',
    96: 'thunderstorm with slight hail',
    99: 'thunderstorm with heavy hail',
  };
  
  return descriptions[wmoCode] || 'unknown';
}

/**
 * Fetch weather data from Open-Meteo API
 */
export async function fetchOpenMeteoWeather(): Promise<{
  current: WeatherData;
  forecast: ForecastData[];
}> {
  const params = new URLSearchParams({
    latitude: BUCHAREST_LAT.toString(),
    longitude: BUCHAREST_LON.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
      'weather_code',
    ].join(','),
    timezone: 'Europe/Bucharest',
    forecast_days: '2', // Current + next 24h
  });

  const url = `${OPEN_METEO_BASE_URL}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    // Cache for 2 minutes
    next: { revalidate: 120 },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoCurrentResponse = await response.json();

  // Determine if it's day or night (simple check based on hour)
  const currentHour = new Date(data.current.time).getHours();
  const isDay = currentHour >= 6 && currentHour < 20;

  // Transform current weather
  const current: WeatherData = {
    timestamp: data.current.time,
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.pressure_msl,
    visibility: 10000, // Open-Meteo doesn't provide visibility, use default
    windSpeed: data.current.wind_speed_10m * 3.6, // Convert m/s to km/h
    windGust: data.current.wind_gusts_10m * 3.6, // Convert m/s to km/h
    windDirection: data.current.wind_direction_10m,
    description: getWeatherDescription(data.hourly.weather_code[0]),
    icon: getWeatherIcon(data.hourly.weather_code[0], isDay),
  };

  // Transform hourly forecast (next 8 hours = 24h coverage with 3h intervals)
  const forecast: ForecastData[] = [];
  for (let i = 1; i <= 8 && i < data.hourly.time.length; i++) {
    const forecastHour = new Date(data.hourly.time[i]).getHours();
    const isForecastDay = forecastHour >= 6 && forecastHour < 20;
    
    forecast.push({
      time: data.hourly.time[i],
      temperature: data.hourly.temperature_2m[i],
      windSpeed: data.hourly.wind_speed_10m[i] * 3.6, // Convert m/s to km/h
      windGust: data.hourly.wind_gusts_10m[i] * 3.6, // Convert m/s to km/h
      windDirection: data.hourly.wind_direction_10m[i],
      description: getWeatherDescription(data.hourly.weather_code[i]),
      icon: getWeatherIcon(data.hourly.weather_code[i], isForecastDay),
    });
  }

  return { current, forecast };
}

/**
 * Health check for Open-Meteo API
 */
export async function checkOpenMeteoHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${OPEN_METEO_BASE_URL}?latitude=0&longitude=0&current=temperature_2m`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
