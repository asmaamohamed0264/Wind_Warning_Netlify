import { NextResponse } from 'next/server';
import { WeatherDataSchema, ForecastDataSchema } from '@/types/weather';
import { z } from 'zod';
import { fetchOpenMeteoWeather } from '@/lib/weather/open-meteo';
import { fetchOpenWeatherData } from '@/lib/weather/openweather';

// Simple in-memory cache
const CACHE_TTL_MS = process.env.WEATHER_CACHE_TTL_MS 
  ? parseInt(process.env.WEATHER_CACHE_TTL_MS) 
  : 120000;

let cacheBody: any = null;
let cacheTime = 0;
let cacheProvider: 'open-meteo' | 'openweather' | null = null;

export async function GET() {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/c6551201-626b-4f04-992d-9b144886a04c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/weather/route.ts:16',message:'Weather API GET called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    // Serve from cache if fresh
    const now = Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/c6551201-626b-4f04-992d-9b144886a04c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/weather/route.ts:20',message:'Cache check',data:{cacheExists:!!cacheBody,cacheTTL:CACHE_TTL_MS,cacheAge:cacheBody ? now - cacheTime : null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    if (cacheBody && (now - cacheTime) < CACHE_TTL_MS) {
      return NextResponse.json(cacheBody, {
        headers: { 
          'X-Cache': 'HIT',
          'X-Weather-Provider': cacheProvider || 'unknown',
        }
      });
    }

    let current, forecast;
    let provider: 'open-meteo' | 'openweather' = 'openweather';
    let error: Error | null = null;

    // 🎯 REVERSIBLE SWITCH: Choose primary provider via ENV variable
    // Set WEATHER_PRIMARY_PROVIDER=open-meteo for hourly data (better for alerts)
    // Set WEATHER_PRIMARY_PROVIDER=openweather for 3h intervals (original)
    const primaryProvider = process.env.WEATHER_PRIMARY_PROVIDER || 'openweather';
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (primaryProvider === 'open-meteo') {
      // ✅ TESTING: Open-Meteo PRIMARY (hourly data for rapid alerts)
      try {
        const data = await fetchOpenMeteoWeather();
        current = data.current;
        forecast = data.forecast;
        provider = 'open-meteo';
        console.log('✅ Weather data fetched from Open-Meteo PRIMARY (ECMWF hourly data)');
      } catch (openMeteoError) {
        error = openMeteoError instanceof Error ? openMeteoError : new Error('Unknown Open-Meteo error');
        console.warn('⚠️ Open-Meteo failed, falling back to OpenWeather:', error.message);

        // Fallback to OpenWeather
        if (apiKey) {
          try {
            const data = await fetchOpenWeatherData(apiKey);
            current = data.current;
            forecast = data.forecast;
            provider = 'openweather';
            console.log('✅ Weather data fetched from OpenWeather (fallback, 3h intervals)');
          } catch (openWeatherError) {
            // Both failed
            throw new Error(
              `All weather providers failed. Open-Meteo: ${error.message}. OpenWeather: ${
                openWeatherError instanceof Error ? openWeatherError.message : 'Unknown error'
              }`
            );
          }
        } else {
          throw error;
        }
      }
    } else {
      // ✅ ORIGINAL: OpenWeather PRIMARY (3h intervals)
      if (apiKey) {
        try {
          const data = await fetchOpenWeatherData(apiKey);
          current = data.current;
          forecast = data.forecast;
          provider = 'openweather';
          console.log('✅ Weather data fetched from OpenWeather PRIMARY (3h intervals)');
        } catch (openWeatherError) {
          error = openWeatherError instanceof Error ? openWeatherError : new Error('Unknown OpenWeather error');
          console.warn('⚠️ OpenWeatherMap failed, falling back to Open-Meteo:', error.message);

          // Fallback to Open-Meteo
          try {
            const data = await fetchOpenMeteoWeather();
            current = data.current;
            forecast = data.forecast;
            provider = 'open-meteo';
            console.log('✅ Weather data fetched from Open-Meteo (ECMWF fallback)');
          } catch (openMeteoError) {
            // Both failed
            throw new Error(
              `All weather providers failed. OpenWeather: ${error.message}. Open-Meteo: ${
                openMeteoError instanceof Error ? openMeteoError.message : 'Unknown error'
              }`
            );
          }
        }
      } else {
        // No API key, use Open-Meteo only
        try {
          const data = await fetchOpenMeteoWeather();
          current = data.current;
          forecast = data.forecast;
          provider = 'open-meteo';
          console.log('✅ Weather data fetched from Open-Meteo (no OpenWeather API key)');
        } catch (openMeteoError) {
          throw new Error('No weather providers available: ' + (openMeteoError instanceof Error ? openMeteoError.message : 'Unknown error'));
        }
      }
    }

    // Validate with Zod
    const parsedCurrent = WeatherDataSchema.parse(current);
    const parsedForecast = z.array(ForecastDataSchema).parse(forecast);

    const responseData = {
      current: parsedCurrent,
      forecast: parsedForecast,
      provider, // Let client know which provider was used
    };

    // Update cache
    cacheBody = responseData;
    cacheTime = now;
    cacheProvider = provider;

    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/c6551201-626b-4f04-992d-9b144886a04c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/weather/route.ts:129',message:'Returning successful response',data:{provider:provider,forecastCount:parsedForecast.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(responseData, {
      headers: {
        'X-Cache': 'MISS',
        'X-Weather-Provider': provider,
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      }
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/c6551201-626b-4f04-992d-9b144886a04c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/weather/route.ts:137',message:'Weather API error',data:{error:error instanceof Error ? error.message : 'Unknown',stack:error instanceof Error ? error.stack : null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.error('❌ Error fetching weather data:', error);
    
    // Return detailed error information
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid weather data received from API',
          details: error.format(),
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
