// Traduceri pentru descrierile meteo de la OpenWeatherMap
export const weatherTranslations: Record<string, string> = {
  // Clear sky
  'clear sky': 'cer senin',
  
  // Clouds
  'few clouds': 'câteva nori',
  'scattered clouds': 'nori împrăștiați',
  'broken clouds': 'nori fragmentați',
  'overcast clouds': 'cer acoperit',
  
  // Rain
  'light rain': 'ploaie ușoară',
  'moderate rain': 'ploaie moderată',
  'heavy intensity rain': 'ploaie torențială',
  'very heavy rain': 'ploaie foarte abundentă',
  'extreme rain': 'ploaie extremă',
  'freezing rain': 'ploaie înghețată',
  'light intensity shower rain': 'averse ușoare',
  'shower rain': 'averse',
  'heavy intensity shower rain': 'averse puternice',
  'ragged shower rain': 'averse neregulate',
  
  // Drizzle
  'light intensity drizzle': 'burniță ușoară',
  'drizzle': 'burniță',
  'heavy intensity drizzle': 'burniță abundentă',
  'light intensity drizzle rain': 'burniță cu ploaie ușoară',
  'drizzle rain': 'burniță cu ploaie',
  'heavy intensity drizzle rain': 'burniță cu ploaie abundentă',
  'shower rain and drizzle': 'averse cu burniță',
  'heavy shower rain and drizzle': 'averse puternice cu burniță',
  'shower drizzle': 'averse de burniță',
  
  // Thunderstorm
  'thunderstorm with light rain': 'furtună cu ploaie ușoară',
  'thunderstorm with rain': 'furtună cu ploaie',
  'thunderstorm with heavy rain': 'furtună cu ploaie abundentă',
  'light thunderstorm': 'furtună ușoară',
  'thunderstorm': 'furtună',
  'heavy thunderstorm': 'furtună puternică',
  'ragged thunderstorm': 'furtună neregulată',
  'thunderstorm with light drizzle': 'furtună cu burniță ușoară',
  'thunderstorm with drizzle': 'furtună cu burniță',
  'thunderstorm with heavy drizzle': 'furtună cu burniță abundentă',
  
  // Snow
  'light snow': 'ninsoare ușoară',
  'snow': 'ninsoare',
  'heavy snow': 'ninsoare abundentă',
  'sleet': 'lapoviță',
  'light shower sleet': 'averse ușoare de lapoviță',
  'shower sleet': 'averse de lapoviță',
  'light rain and snow': 'ploaie ușoară cu ninsoare',
  'rain and snow': 'ploaie cu ninsoare',
  'light shower snow': 'averse ușoare de zăpadă',
  'shower snow': 'averse de zăpadă',
  'heavy shower snow': 'averse abundente de zăpadă',
  
  // Atmosphere
  'mist': 'ceață ușoară',
  'smoke': 'fum',
  'haze': 'ceață de căldură',
  'sand/dust whirls': 'vârtejuri de nisip/praf',
  'fog': 'ceață',
  'sand': 'nisip',
  'dust': 'praf',
  'volcanic ash': 'cenușă vulcanică',
  'squalls': 'rafale',
  'tornado': 'tornadă',
  
  // Additional common descriptions
  'partly cloudy': 'parțial înnorat',
  'mostly cloudy': 'predominant înnorat',
  'sunny': 'însorit',
  'windy': 'vântos',
  'calm': 'calm',
  'breezy': 'cu briză',
  'humid': 'umed',
  'dry': 'uscat'
};

export function translateWeatherDescription(description: string): string {
  const lowerDescription = description.toLowerCase().trim();
  return weatherTranslations[lowerDescription] || description;
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}