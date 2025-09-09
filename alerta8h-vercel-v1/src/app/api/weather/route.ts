import { NextResponse } from 'next/server'
import { fetchWeatherData, fetchWeatherForecast, convertToWeatherData } from '@/lib/weather'
import { setWeatherData, getWeatherData } from '@/lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const lat = parseFloat(process.env.LOCATION_LAT || '44.4268')
    const lng = parseFloat(process.env.LOCATION_LNG || '26.1025')
    const useMock = process.env.USE_MOCK_WEATHER === 'true'
    const apiKey = process.env.OPENWEATHER_API_KEY

    // Check if we have recent data in cache
    const cachedData = await getWeatherData()
    if (cachedData && Date.now() - cachedData.timestamp * 1000 < 5 * 60 * 1000) {
      return NextResponse.json({
        current: {
          windSpeed: cachedData.windSpeed,
          windGust: cachedData.windGust,
          windDirection: cachedData.windDirection,
          temperature: cachedData.temperature,
          humidity: cachedData.humidity,
          pressure: cachedData.pressure,
          visibility: cachedData.visibility,
          description: 'Date din cache',
          provider: cachedData.provider,
          timestamp: cachedData.timestamp
        },
        forecast: await generateForecastData(lat, lng, apiKey, useMock)
      })
    }

    // Fetch fresh data
    const weatherData = await fetchWeatherData(lat, lng, apiKey, useMock)
    if (!weatherData) {
      throw new Error('Failed to fetch weather data')
    }

    // Convert and cache the data
    const redisData = convertToWeatherData(weatherData)
    await setWeatherData(redisData)

    // Generate forecast data
    const forecast = await generateForecastData(lat, lng, apiKey, useMock)

    return NextResponse.json({
      current: {
        windSpeed: weatherData.windSpeed,
        windGust: weatherData.windGust,
        windDirection: weatherData.windDirection,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        visibility: weatherData.visibility,
        description: weatherData.description,
        provider: weatherData.provider,
        timestamp: Math.floor(Date.now() / 1000)
      },
      forecast
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    )
  }
}

async function generateForecastData(
  lat: number,
  lng: number,
  apiKey?: string,
  useMock: boolean = false
) {
  if (useMock) {
    return generateMockForecast()
  }

  try {
    const forecast = await fetchWeatherForecast(lat, lng, apiKey)
    return forecast.slice(0, 8).map((item, index) => ({
      time: new Date(Date.now() + (index + 1) * 3 * 60 * 60 * 1000).toLocaleTimeString('ro-RO', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      windSpeed: item.windSpeed,
      windGust: item.windGust || item.windSpeed * 1.3,
      threshold: 50 // Default threshold
    }))
  } catch (error) {
    console.error('Forecast error:', error)
    return generateMockForecast()
  }
}

function generateMockForecast() {
  const baseSpeed = 15 + Math.random() * 20
  return Array.from({ length: 8 }, (_, index) => ({
    time: new Date(Date.now() + (index + 1) * 3 * 60 * 60 * 1000).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    windSpeed: baseSpeed + (Math.random() - 0.5) * 10,
    windGust: baseSpeed + (Math.random() - 0.5) * 10 + Math.random() * 15,
    threshold: 50
  }))
}

