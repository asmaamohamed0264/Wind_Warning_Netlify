// netlify/functions/weather-compiled.ts
import type { Handler } from '@netlify/functions';

// Interfețe pentru datele meteo
interface WeatherData {
  windSpeed: number;
  windGust: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  pressure: number;
  visibility: number;
  source: string;
  timestamp: string;
  location: string;
}

interface CompiledWeatherData {
  windSpeed: number;
  windGust: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  pressure: number;
  visibility: number;
  sources: {
    openweathermap: WeatherData | null;
    weatherbit: WeatherData | null;
    openmeteo: WeatherData | null;
  };
  compilationMethod: string;
  timestamp: string;
  location: string;
}

// Funcție pentru a obține datele din OpenWeatherMap (existent)
async function getOpenWeatherMapData(location: string): Promise<WeatherData | null> {
  try {
    // Acceptă ambele nume de variabile de mediu pentru compatibilitate
    const apiKey = process.env.OPENWEATHERMAP_API_KEY || process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return null;

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    return {
      windSpeed: data.wind?.speed ? data.wind.speed * 3.6 : 0, // m/s to km/h
      windGust: data.wind?.gust ? data.wind.gust * 3.6 : data.wind?.speed ? data.wind.speed * 3.6 : 0,
      windDirection: data.wind?.deg || 0,
      temperature: data.main?.temp || 0,
      humidity: data.main?.humidity || 0,
      pressure: data.main?.pressure || 0,
      visibility: data.visibility ? data.visibility / 1000 : 0, // m to km
      source: 'OpenWeatherMap',
      timestamp: new Date().toISOString(),
      location: data.name || location
    };
  } catch (error) {
    console.error('OpenWeatherMap error:', error);
    return null;
  }
}

// Funcție pentru a obține datele din Weatherbit API
async function getWeatherbitData(location: string): Promise<WeatherData | null> {
  try {
    const apiKey = process.env.WEATHERBIT_API_KEY || '82b8bca12b9248f38cada243e4c3647d';
    
    const response = await fetch(
      `https://api.weatherbit.io/v2.0/current?city=${encodeURIComponent(location)}&key=${apiKey}&units=M`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) return null;
    
    const current = data.data[0];
    
    return {
      windSpeed: current.wind_spd || 0, // Already in km/h
      windGust: current.wind_gust_spd || current.wind_spd || 0,
      windDirection: current.wind_dir || 0,
      temperature: current.temp || 0,
      humidity: current.rh || 0,
      pressure: current.pres || 0,
      visibility: current.vis || 0, // Already in km
      source: 'Weatherbit',
      timestamp: new Date().toISOString(),
      location: current.city_name || location
    };
  } catch (error) {
    console.error('Weatherbit error:', error);
    return null;
  }
}

// Funcție pentru a obține datele din Open-Meteo (gratuit)
async function getOpenMeteoData(location: string): Promise<WeatherData | null> {
  try {
    // Pentru Open-Meteo, avem nevoie de coordonatele GPS
    // Vom folosi coordonatele pentru București ca fallback
    const lat = 44.4268;
    const lon = 26.1025;
    
    const response = await fetch(
      `https://api.open-meteo.com/v1/current?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,pressure_msl,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=Europe%2FBucharest`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data.current) return null;
    
    return {
      windSpeed: data.current.wind_speed_10m || 0, // Already in km/h
      windGust: data.current.wind_gusts_10m || data.current.wind_speed_10m || 0,
      windDirection: data.current.wind_direction_10m || 0,
      temperature: data.current.temperature_2m || 0,
      humidity: data.current.relative_humidity_2m || 0,
      pressure: data.current.pressure_msl || 0,
      visibility: data.current.visibility || 0, // Already in km
      source: 'Open-Meteo',
      timestamp: new Date().toISOString(),
      location: location
    };
  } catch (error) {
    console.error('Open-Meteo error:', error);
    return null;
  }
}

// Prognoză fallback: Open‑Meteo (gratuit)
async function getOpenMeteoForecast(): Promise<any[]> {
  try {
    const lat = 44.4268;
    const lon = 26.1025;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m&timezone=Europe%2FBucharest`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    const times: string[] = j.hourly?.time || [];
    const temp: number[] = j.hourly?.temperature_2m || [];
    const ws: number[] = j.hourly?.wind_speed_10m || [];
    const wg: number[] = j.hourly?.wind_gusts_10m || [];
    const wd: number[] = j.hourly?.wind_direction_10m || [];

    // Găsim indexul orei curente (sau cea mai apropiată viitoare)
    const nowIso = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    let startIdx = times.findIndex((t: string) => t.startsWith(nowIso));
    if (startIdx < 0) startIdx = 0;

    const result = [] as any[];
    for (let i = startIdx; i < Math.min(startIdx + 8, times.length); i++) {
      result.push({
        time: times[i].replace('T', ' ') + ':00',
        temperature: temp[i],
        windSpeed: ws[i], // deja km/h
        windGust: (typeof wg[i] === 'number' ? wg[i] : ws[i]),
        windDirection: wd[i],
        description: '',
        icon: '',
      });
    }

    return result;
  } catch (e) {
    console.error('Open‑Meteo forecast error:', e);
    return [];
  }
}

// Funcție pentru a compila datele din toate sursele
function compileWeatherData(sources: {
  openweathermap: WeatherData | null;
  weatherbit: WeatherData | null;
  openmeteo: WeatherData | null;
}): CompiledWeatherData {
  const validSources = Object.values(sources).filter(source => source !== null) as WeatherData[];
  
  if (validSources.length === 0) {
    throw new Error('No valid weather data sources available');
  }
  
  // Calculăm media pentru fiecare parametru din sursele valide
  const compiled = {
    windSpeed: validSources.reduce((sum, source) => sum + source.windSpeed, 0) / validSources.length,
    windGust: validSources.reduce((sum, source) => sum + source.windGust, 0) / validSources.length,
    windDirection: validSources.reduce((sum, source) => sum + source.windDirection, 0) / validSources.length,
    temperature: validSources.reduce((sum, source) => sum + source.temperature, 0) / validSources.length,
    humidity: validSources.reduce((sum, source) => sum + source.humidity, 0) / validSources.length,
    pressure: validSources.reduce((sum, source) => sum + source.pressure, 0) / validSources.length,
    visibility: validSources.reduce((sum, source) => sum + source.visibility, 0) / validSources.length,
    sources,
    compilationMethod: `Compiled from ${validSources.length} sources: ${validSources.map(s => s.source).join(', ')}`,
    timestamp: new Date().toISOString(),
    location: validSources[0].location
  };
  
  return compiled;
}

export const handler: Handler = async (event) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://wind.qub3.uk',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const location = event.queryStringParameters?.q || 'Bucharest';
    
    console.log(`🌤️ Fetching compiled weather data for: ${location}`);
    
    // Obținem datele din toate sursele în paralel
    const [openweathermapData, weatherbitData, openmeteoData] = await Promise.all([
      getOpenWeatherMapData(location),
      getWeatherbitData(location),
      getOpenMeteoData(location)
    ]);
    
    console.log('📊 Weather sources results:', {
      openweathermap: openweathermapData ? '✅' : '❌',
      weatherbit: weatherbitData ? '✅' : '❌',
      openmeteo: openmeteoData ? '✅' : '❌'
    });
    
    // Compilăm datele
    const compiledData = compileWeatherData({
      openweathermap: openweathermapData,
      weatherbit: weatherbitData,
      openmeteo: openmeteoData
    });
    
    console.log('🎯 Compiled weather data:', {
      windSpeed: compiledData.windSpeed,
      windGust: compiledData.windGust,
      sources: compiledData.compilationMethod
    });
    
    // Prognoză: încercăm OWM, apoi cădem pe Open‑Meteo
    let forecastData: any[] = [];
    try {
      const owmKey = process.env.OPENWEATHERMAP_API_KEY || process.env.OPENWEATHER_API_KEY;
      if (owmKey) {
        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${owmKey}&units=metric`
        );
        if (forecastResponse.ok) {
          const forecastJson = await forecastResponse.json();
          forecastData = forecastJson.list?.slice(0, 8).map((item: any) => ({
            time: new Date(item.dt * 1000).toISOString().replace('T', ' ').slice(0, 19),
            temperature: item.main.temp,
            windSpeed: item.wind.speed * 3.6,
            windGust: item.wind.gust ? item.wind.gust * 3.6 : item.wind.speed * 3.6,
            windDirection: item.wind.deg,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
          })) || [];
        } else {
          console.warn('OWM forecast response not ok:', forecastResponse.status);
        }
      }
      if (!forecastData || forecastData.length === 0) {
        console.log('Using Open‑Meteo forecast fallback');
        forecastData = await getOpenMeteoForecast();
      }
    } catch (error) {
      console.error('Forecast fetch error:', error);
      if (!forecastData || forecastData.length === 0) {
        forecastData = await getOpenMeteoForecast();
      }
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...compiledData,
        forecast: forecastData
      }),
    };
  } catch (error: any) {
    console.error('Weather compilation error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
