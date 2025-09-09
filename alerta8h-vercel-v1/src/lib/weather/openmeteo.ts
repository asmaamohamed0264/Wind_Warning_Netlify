interface OpenMeteoResponse {
  current: {
    wind_speed: number
    wind_gusts?: number
    wind_direction: number
    temperature_2m: number
    relative_humidity_2m: number
    surface_pressure: number
    visibility: number
    weather_code: number
  }
  current_units: {
    wind_speed: string
    wind_gusts: string
    wind_direction: string
    temperature_2m: string
    relative_humidity_2m: string
    surface_pressure: string
    visibility: string
  }
}

export async function fetchOpenMeteoData(
  lat: number,
  lng: number
): Promise<OpenMeteoResponse | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed,wind_gusts,wind_direction,temperature_2m,relative_humidity_2m,surface_pressure,visibility,weather_code&timezone=Europe/Bucharest`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Open-Meteo fetch error:', error)
    return null
  }
}

export function convertOpenMeteoData(data: OpenMeteoResponse) {
  return {
    windSpeed: data.current.wind_speed * 3.6, // m/s to km/h
    windGust: data.current.wind_gusts ? data.current.wind_gusts * 3.6 : undefined,
    windDirection: data.current.wind_direction,
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.surface_pressure,
    visibility: data.current.visibility / 1000, // m to km
    weatherCode: data.current.weather_code
  }
}

// Weather code to description mapping
export function getWeatherDescription(code: number): string {
  const descriptions: { [key: number]: string } = {
    0: 'Cer senin',
    1: 'Cer în mare parte senin',
    2: 'Parțial înnorat',
    3: 'Înnorat',
    45: 'Ceață',
    48: 'Ceață înghețată',
    51: 'Burniță ușoară',
    53: 'Burniță moderată',
    55: 'Burniță densă',
    56: 'Burniță înghețată ușoară',
    57: 'Burniță înghețată densă',
    61: 'Ploaie ușoară',
    63: 'Ploaie moderată',
    65: 'Ploaie puternică',
    66: 'Ploaie înghețată ușoară',
    67: 'Ploaie înghețată puternică',
    71: 'Ninsoare ușoară',
    73: 'Ninsoare moderată',
    75: 'Ninsoare puternică',
    77: 'Grindină',
    80: 'Averse de ploaie ușoare',
    81: 'Averse de ploaie moderate',
    82: 'Averse de ploaie puternice',
    85: 'Averse de ninsoare ușoare',
    86: 'Averse de ninsoare puternice',
    95: 'Furtună',
    96: 'Furtună cu grindină ușoară',
    99: 'Furtună cu grindină puternică'
  }
  
  return descriptions[code] || 'Condiții necunoscute'
}

