import { fetchOpenWeatherData, convertOpenWeatherData } from './openweather'
import { fetchOpenMeteoData, convertOpenMeteoData, getWeatherDescription } from './openmeteo'
import { WeatherData } from '../redis'

export interface WeatherServiceData {
  windSpeed: number
  windGust?: number
  windDirection: number
  temperature: number
  humidity: number
  pressure: number
  visibility: number
  description: string
  icon?: string
  provider: 'openweather' | 'open-meteo' | 'combined'
}

export async function fetchWeatherData(
  lat: number,
  lng: number,
  apiKey?: string,
  useMock: boolean = false
): Promise<WeatherServiceData | null> {
  if (useMock) {
    return generateMockWeatherData()
  }

  const results: WeatherServiceData[] = []

  // Fetch OpenWeatherMap data
  if (apiKey) {
    const openWeatherData = await fetchOpenWeatherData(lat, lng, apiKey)
    if (openWeatherData) {
      const converted = convertOpenWeatherData(openWeatherData)
      results.push({
        ...converted,
        provider: 'openweather'
      })
    }
  }

  // Fetch Open-Meteo data
  const openMeteoData = await fetchOpenMeteoData(lat, lng)
  if (openMeteoData) {
    const converted = convertOpenMeteoData(openMeteoData)
    results.push({
      ...converted,
      description: getWeatherDescription(converted.weatherCode),
      provider: 'open-meteo'
    })
  }

  if (results.length === 0) {
    return null
  }

  // If we have both providers, return combined data
  if (results.length === 2) {
    return {
      windSpeed: (results[0].windSpeed + results[1].windSpeed) / 2,
      windGust: results[0].windGust && results[1].windGust 
        ? (results[0].windGust + results[1].windGust) / 2 
        : results[0].windGust || results[1].windGust,
      windDirection: (results[0].windDirection + results[1].windDirection) / 2,
      temperature: (results[0].temperature + results[1].temperature) / 2,
      humidity: (results[0].humidity + results[1].humidity) / 2,
      pressure: (results[0].pressure + results[1].pressure) / 2,
      visibility: (results[0].visibility + results[1].visibility) / 2,
      description: results[0].description, // Use OpenWeather description
      icon: results[0].icon,
      provider: 'combined'
    }
  }

  // Return single provider data
  return results[0]
}

export async function fetchWeatherForecast(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<WeatherServiceData[]> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lng=${lng}&appid=${apiKey}&units=metric&cnt=8`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Forecast API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    return data.list.map((item: any) => ({
      windSpeed: item.wind.speed * 3.6,
      windGust: item.wind.gust ? item.wind.gust * 3.6 : undefined,
      windDirection: item.wind.deg,
      temperature: item.main.temp,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      visibility: item.visibility / 1000,
      description: item.weather[0]?.description || '',
      icon: item.weather[0]?.icon || '',
      provider: 'openweather' as const
    }))
  } catch (error) {
    console.error('Forecast fetch error:', error)
    return []
  }
}

function generateMockWeatherData(): WeatherServiceData {
  const baseSpeed = 15 + Math.random() * 20 // 15-35 km/h
  const gustMultiplier = 1.2 + Math.random() * 0.6 // 1.2-1.8x
  
  return {
    windSpeed: baseSpeed,
    windGust: baseSpeed * gustMultiplier,
    windDirection: Math.random() * 360,
    temperature: 15 + Math.random() * 15, // 15-30°C
    humidity: 40 + Math.random() * 40, // 40-80%
    pressure: 1000 + Math.random() * 50, // 1000-1050 hPa
    visibility: 5 + Math.random() * 10, // 5-15 km
    description: 'Condiții demo - Date simulate',
    provider: 'combined'
  }
}

export function convertToWeatherData(serviceData: WeatherServiceData): WeatherData {
  return {
    timestamp: Math.floor(Date.now() / 1000),
    windSpeed: serviceData.windSpeed,
    windGust: serviceData.windGust || 0,
    windDirection: serviceData.windDirection,
    temperature: serviceData.temperature,
    humidity: serviceData.humidity,
    pressure: serviceData.pressure,
    visibility: serviceData.visibility,
    provider: serviceData.provider
  }
}

