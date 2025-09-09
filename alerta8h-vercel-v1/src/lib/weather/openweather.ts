interface WeatherResponse {
  wind: {
    speed: number
    deg: number
    gust?: number
  }
  main: {
    temp: number
    humidity: number
    pressure: number
  }
  visibility: number
  weather: Array<{
    description: string
    icon: string
  }>
}

export async function fetchOpenWeatherData(
  lat: number,
  lng: number,
  apiKey: string
): Promise<WeatherResponse | null> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lng=${lng}&appid=${apiKey}&units=metric`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('OpenWeather fetch error:', error)
    return null
  }
}

export function convertOpenWeatherData(data: WeatherResponse) {
  return {
    windSpeed: data.wind.speed * 3.6, // m/s to km/h
    windGust: data.wind.gust ? data.wind.gust * 3.6 : undefined,
    windDirection: data.wind.deg,
    temperature: data.main.temp,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    visibility: data.visibility / 1000, // m to km
    description: data.weather[0]?.description || '',
    icon: data.weather[0]?.icon || ''
  }
}

