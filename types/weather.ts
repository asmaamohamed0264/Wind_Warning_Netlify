export interface WeatherData {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  visibility: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  description: string;
  icon: string;
  // câmpuri opționale pentru date compilate din mai multe surse
  location?: string;
  sources?: any;
  compilationMethod?: string;
}

export interface ForecastData {
  time: string;
  temperature: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  description: string;
  icon: string;
}