import { z } from 'zod';

// Zod Schemas pentru validare runtime
export const WeatherDataSchema = z.object({
  timestamp: z.string(),
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  pressure: z.number().positive(),
  visibility: z.number().nonnegative(),
  windSpeed: z.number().min(0).max(200),
  windGust: z.number().min(0).max(250),
  windDirection: z.number().min(0).max(360),
  description: z.string(),
  icon: z.string(),
});

export const ForecastDataSchema = z.object({
  time: z.string(),
  temperature: z.number(),
  windSpeed: z.number().min(0).max(200),
  windGust: z.number().min(0).max(250),
  windDirection: z.number().min(0).max(360),
  description: z.string(),
  icon: z.string(),
});

// Type inference din Zod schemas
export type WeatherData = z.infer<typeof WeatherDataSchema>;
export type ForecastData = z.infer<typeof ForecastDataSchema>;

// API Response schema
export const WeatherResponseSchema = z.object({
  current: WeatherDataSchema,
  forecast: z.array(ForecastDataSchema),
});

export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;
