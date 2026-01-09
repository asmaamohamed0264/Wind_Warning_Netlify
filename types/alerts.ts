import { z } from 'zod';

export const AlertLevelSchema = z.enum(['normal', 'caution', 'warning', 'danger']);
export type AlertLevel = z.infer<typeof AlertLevelSchema>;

export const AlertSchema = z.object({
  level: AlertLevelSchema,
  maxWindSpeed: z.number().min(0).max(300),
  time: z.string(),
  message: z.string().min(1),
  timestamp: z.string(),
});

export type Alert = z.infer<typeof AlertSchema>;

// Schema pentru request-uri de alerte
export const SendAlertRequestSchema = z.object({
  level: AlertLevelSchema.optional(),
  windSpeed: z.number().min(0).max(300),
  time: z.string(),
  message: z.string().optional(),
  place: z.string().optional(),
});

export type SendAlertRequest = z.infer<typeof SendAlertRequestSchema>;
