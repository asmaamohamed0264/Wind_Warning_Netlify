/**
 * OpenWeatherMap Weather Service
 * 
 * Primary weather data provider with urban wind adjustment
 * Provides more accurate ground-level wind data for București
 */

import { WeatherData, ForecastData } from '@/types/weather';
import { adjustWindForUrban, adjustWindGustForUrban, isUrbanAdjustmentEnabled } from './wind-adjustment';

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// București - Aleea Someșul Cald (Popești-Leordeni / București Sud)
const BUCHAREST_LAT = 44.68;
const BUCHAREST_LON = 26.40;

interface OpenWeatherCurrentResponse {
  main: {
    temp: number;
    humidity: number;
    pressure: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt_txt: string;
    main: {
      temp: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    weather: Array<{
      description: string;
      icon: string;
    }>;
  }>;
}

/**
 * Fetch weather data from OpenWeatherMap API
 */
export async function fetchOpenWeatherData(apiKey: string): Promise<{
  current: WeatherData;
  forecast: ForecastData[];
}> {
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key not configured');
  }

  // Fetch current weather
  const currentResponse = await fetch(
    `${OPENWEATHER_BASE_URL}/weather?lat=${BUCHAREST_LAT}&lon=${BUCHAREST_LON}&appid=${apiKey}&units=metric`,
    {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 },
    }
  );

  if (!currentResponse.ok) {
    throw new Error(`OpenWeatherMap API error: ${currentResponse.status} ${currentResponse.statusText}`);
  }

  const currentData: OpenWeatherCurrentResponse = await currentResponse.json();

  // Fetch 5-day forecast (3-hour intervals)
  const forecastResponse = await fetch(
    `${OPENWEATHER_BASE_URL}/forecast?lat=${BUCHAREST_LAT}&lon=${BUCHAREST_LON}&appid=${apiKey}&units=metric`,
    {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 120 },
    }
  );

  if (!forecastResponse.ok) {
    throw new Error(`OpenWeatherMap forecast API error: ${forecastResponse.status} ${forecastResponse.statusText}`);
  }

  const forecastData: OpenWeatherForecastResponse = await forecastResponse.json();

  // Transform current weather data
  const rawWindSpeed = currentData.wind.speed * 3.6; // m/s to km/h
  const rawWindGust = currentData.wind.gust ? currentData.wind.gust * 3.6 : currentData.wind.speed * 3.6;
  
  // NO urban adjustment for Popești-Leordeni / București Sud (open area)
  // Factor 1.0 = RAW API data (validated with TypeWeather: ~11 km/h)
  const urbanAdjustmentEnabled = isUrbanAdjustmentEnabled();
  
  const current: WeatherData = {
    timestamp: new Date().toISOString(),
    temperature: currentData.main.temp,
    humidity: currentData.main.humidity,
    pressure: currentData.main.pressure,
    visibility: currentData.visibility,
    windSpeed: urbanAdjustmentEnabled ? adjustWindForUrban(rawWindSpeed, 'open') : rawWindSpeed,
    windGust: urbanAdjustmentEnabled ? adjustWindGustForUrban(rawWindGust, 'open') : rawWindGust,
    windDirection: currentData.wind.deg || 0,
    description: currentData.weather[0].description,
    icon: currentData.weather[0].icon,
  };

  // Transform forecast data (next 8 data points = 24 hours) - NO adjustment
  // Factor 1.0 = RAW API data for open area
  const forecast: ForecastData[] = forecastData.list.slice(0, 8).map((item) => {
    const rawSpeed = item.wind.speed * 3.6; // m/s to km/h
    const rawGust = item.wind.gust ? item.wind.gust * 3.6 : item.wind.speed * 3.6;
    
    return {
      time: item.dt_txt,
      temperature: item.main.temp,
      windSpeed: urbanAdjustmentEnabled ? adjustWindForUrban(rawSpeed, 'open') : rawSpeed,
      windGust: urbanAdjustmentEnabled ? adjustWindGustForUrban(rawGust, 'open') : rawGust,
      windDirection: item.wind.deg || 0,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
    };
  });

  return { current, forecast };
}

/**
 * Health check for OpenWeatherMap API
 */
export async function checkOpenWeatherHealth(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${OPENWEATHER_BASE_URL}/weather?lat=${BUCHAREST_LAT}&lon=${BUCHAREST_LON}&appid=${apiKey}`,
      {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
