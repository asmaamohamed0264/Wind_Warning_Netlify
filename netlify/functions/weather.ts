import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'OpenWeather API key not configured' }),
    };
  }

  try {
    // Bucharest coordinates
    const lat = 44.4268;
    const lon = 26.1025;

    // Fetch current weather
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    if (!currentResponse.ok) {
      throw new Error('Failed to fetch current weather');
    }

    const currentData = await currentResponse.json();

    // Fetch 5-day forecast (3-hour intervals)
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    );

    if (!forecastResponse.ok) {
      throw new Error('Failed to fetch forecast');
    }

    const forecastData = await forecastResponse.json();

    // Transform current weather data
    const current = {
      timestamp: new Date().toISOString(),
      temperature: currentData.main.temp,
      humidity: currentData.main.humidity,
      pressure: currentData.main.pressure,
      visibility: currentData.visibility,
      windSpeed: (currentData.wind.speed * 3.6), // Convert m/s to km/h
      windGust: currentData.wind.gust ? (currentData.wind.gust * 3.6) : (currentData.wind.speed * 3.6),
      windDirection: currentData.wind.deg || 0,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
    };

    // Transform forecast data (next 8 data points = 24 hours)
    const forecast = forecastData.list.slice(0, 8).map((item: any) => ({
      time: item.dt_txt,
      temperature: item.main.temp,
      windSpeed: (item.wind.speed * 3.6), // Convert m/s to km/h
      windGust: item.wind.gust ? (item.wind.gust * 3.6) : (item.wind.speed * 3.6),
      windDirection: item.wind.deg || 0,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        current,
        forecast,
      }),
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch weather data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };