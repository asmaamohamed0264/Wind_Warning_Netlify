// Funcție pentru obținerea datelor meteo actuale
// GET /api/get-weather

const { createClient } = require('@supabase/supabase-js');

// Rate limiting pentru API-ul meteo
const weatherRequestTimes = [];
const WEATHER_RATE_LIMIT = 10; // max 10 requests 
const WEATHER_RATE_WINDOW = 60 * 1000; // per minute

function checkWeatherRateLimit() {
  const now = Date.now();
  const validRequests = weatherRequestTimes.filter(time => now - time < WEATHER_RATE_WINDOW);
  
  if (validRequests.length >= WEATHER_RATE_LIMIT) {
    return false;
  }
  
  weatherRequestTimes.push(now);
  // Keep only recent requests
  weatherRequestTimes.splice(0, weatherRequestTimes.length - WEATHER_RATE_LIMIT);
  return true;
}

async function getWeatherFromAPI(location = 'București, România') {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric&lang=ro`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    location: data.name + ', ' + data.sys.country,
    wind_speed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    wind_gust: data.wind.gust ? Math.round(data.wind.gust * 3.6) : Math.round(data.wind.speed * 3.6 * 1.3),
    wind_direction: data.wind.deg || 0,
    temperature: Math.round(data.main.temp * 10) / 10, // Round to 1 decimal
    humidity: data.main.humidity,
    visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    recorded_at: new Date().toISOString()
  };
}

async function getCachedWeather(supabase, location) {
  const { data, error } = await supabase
    .from('weather_cache')
    .select('*')
    .eq('location', location)
    .gt('expires_at', new Date().toISOString())
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return {
    location: data.location,
    wind_speed: data.wind_speed,
    wind_gust: data.wind_gust,
    wind_direction: data.wind_direction,
    temperature: data.temperature,
    humidity: data.humidity,
    visibility: data.visibility,
    recorded_at: data.recorded_at
  };
}

async function cacheWeatherData(supabase, weatherData) {
  try {
    await supabase
      .from('weather_cache')
      .insert({
        location: weatherData.location,
        wind_speed: weatherData.wind_speed,
        wind_gust: weatherData.wind_gust,
        wind_direction: weatherData.wind_direction,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        visibility: weatherData.visibility,
        source: 'openweathermap'
      });
  } catch (error) {
    console.warn('Failed to cache weather data:', error);
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed. Use GET.' 
      })
    };
  }

  try {
    // Get location from query params or use default
    const location = event.queryStringParameters?.location || 'București, România';
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Try to get cached data first
    let weatherData = await getCachedWeather(supabase, location);
    let dataSource = 'cache';
    
    if (!weatherData) {
      // Check rate limit before making API call
      if (!checkWeatherRateLimit()) {
        return {
          statusCode: 429,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Weather API rate limit exceeded. Try again later.'
          })
        };
      }
      
      // Get fresh data from API
      weatherData = await getWeatherFromAPI(location);
      dataSource = 'api';
      
      // Cache the new data
      await cacheWeatherData(supabase, weatherData);
    }
    
    // Add metadata
    weatherData.data_source = dataSource;
    weatherData.cache_age = dataSource === 'cache' ? 
      Math.round((new Date() - new Date(weatherData.recorded_at)) / 1000 / 60) : 0;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        weather: weatherData,
        meta: {
          location: location,
          source: dataSource,
          cached: dataSource === 'cache',
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Weather function error:', error);
    
    // Return a fallback response for development/demo
    const fallbackWeather = {
      location: 'București, România',
      wind_speed: Math.floor(Math.random() * 30) + 10, // Random 10-40 km/h
      wind_gust: Math.floor(Math.random() * 40) + 15,  // Random 15-55 km/h
      wind_direction: Math.floor(Math.random() * 360),
      temperature: Math.floor(Math.random() * 25) + 5, // Random 5-30°C
      humidity: Math.floor(Math.random() * 40) + 40,   // Random 40-80%
      visibility: 10,
      recorded_at: new Date().toISOString(),
      data_source: 'fallback'
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        weather: fallbackWeather,
        meta: {
          location: 'București, România',
          source: 'fallback',
          cached: false,
          timestamp: new Date().toISOString(),
          note: 'Using demo data due to API error'
        },
        warning: 'This is demo/fallback data. Real weather API is temporarily unavailable.'
      })
    };
  }
};