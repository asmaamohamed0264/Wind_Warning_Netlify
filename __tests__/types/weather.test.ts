import { WeatherDataSchema, ForecastDataSchema, WeatherResponseSchema } from '@/types/weather';

describe('WeatherDataSchema', () => {
  it('should validate correct weather data', () => {
    const validData = {
      timestamp: '2024-01-09T12:00:00Z',
      temperature: 15.5,
      humidity: 65,
      pressure: 1013,
      visibility: 10000,
      windSpeed: 25.5,
      windGust: 35.2,
      windDirection: 180,
      description: 'clear sky',
      icon: '01d',
    };

    const result = WeatherDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid humidity', () => {
    const invalidData = {
      timestamp: '2024-01-09T12:00:00Z',
      temperature: 15.5,
      humidity: 150, // Invalid: > 100
      pressure: 1013,
      visibility: 10000,
      windSpeed: 25.5,
      windGust: 35.2,
      windDirection: 180,
      description: 'clear sky',
      icon: '01d',
    };

    const result = WeatherDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject negative wind speed', () => {
    const invalidData = {
      timestamp: '2024-01-09T12:00:00Z',
      temperature: 15.5,
      humidity: 65,
      pressure: 1013,
      visibility: 10000,
      windSpeed: -10, // Invalid: negative
      windGust: 35.2,
      windDirection: 180,
      description: 'clear sky',
      icon: '01d',
    };

    const result = WeatherDataSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('ForecastDataSchema', () => {
  it('should validate correct forecast data', () => {
    const validData = {
      time: '2024-01-09 15:00:00',
      temperature: 18.3,
      windSpeed: 30.5,
      windGust: 42.1,
      windDirection: 225,
      description: 'few clouds',
      icon: '02d',
    };

    const result = ForecastDataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('WeatherResponseSchema', () => {
  it('should validate complete weather response', () => {
    const validResponse = {
      current: {
        timestamp: '2024-01-09T12:00:00Z',
        temperature: 15.5,
        humidity: 65,
        pressure: 1013,
        visibility: 10000,
        windSpeed: 25.5,
        windGust: 35.2,
        windDirection: 180,
        description: 'clear sky',
        icon: '01d',
      },
      forecast: [
        {
          time: '2024-01-09 15:00:00',
          temperature: 18.3,
          windSpeed: 30.5,
          windGust: 42.1,
          windDirection: 225,
          description: 'few clouds',
          icon: '02d',
        },
      ],
    };

    const result = WeatherResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });
});
