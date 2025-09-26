// lib/supabase.ts - Client Supabase pentru Wind Warning
import { createClient } from '@supabase/supabase-js';

// Environment variables - adăugate în Netlify
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cpipcetsyllszoouppap.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaXBjZXRzeWxsc3pvb3VwcGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODc5MjAsImV4cCI6MjA3NDQ2MzkyMH0.MB7akpyFJ9wWv8jZjohH_p7xb5EDVbd_uNyP44d7Rbo';

// Client pentru browser (cu RLS - Row Level Security)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Pentru server-side operations (Netlify Functions)
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key');
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
};

// Types pentru TypeScript
export interface WindUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  push_subscription_id?: string | null;
  
  // Setări personale alerte
  wind_threshold: number;           // Pragul de vânt (km/h)
  location: string;                 // Locația utilizatorului
  
  // Preferințe notificări
  push_enabled: boolean;
  sms_enabled: boolean;
  email_enabled: boolean;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  last_alert_sent?: string | null;
  
  // Setări avansate
  alert_frequency?: 'immediate' | 'hourly' | 'daily';
  quiet_hours_start?: string | null;  // Ex: "22:00"
  quiet_hours_end?: string | null;    // Ex: "06:00"
}

export interface AlertLog {
  id: string;
  user_id: string;
  wind_speed: number;
  wind_gust: number;
  user_threshold: number;
  alert_level: 'caution' | 'warning' | 'danger';
  message_sent: string;
  notification_types: string[];  // ['push', 'sms', 'email']
  created_at: string;
  
  // OneSignal metadata
  onesignal_push_id?: string | null;
  onesignal_sms_id?: string | null;
  onesignal_email_id?: string | null;
}

// Helper functions
export const getCurrentUser = async (): Promise<WindUser | null> => {
  // Pentru început, folosim un user mock
  // Later: implement proper auth
  return null;
};

export const saveUserSettings = async (userId: string, settings: Partial<WindUser>): Promise<WindUser | null> => {
  const { data, error } = await supabase
    .from('wind_users')
    .upsert({ 
      id: userId,
      ...settings,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving user settings:', error);
    return null;
  }

  return data;
};

export const getUsersForAlert = async (windSpeed: number): Promise<WindUser[]> => {
  const serverClient = createServerSupabaseClient();
  
  const { data, error } = await serverClient
    .from('wind_users')
    .select('*')
    .lt('wind_threshold', windSpeed)  // Threshold < current wind speed
    .or('push_enabled.eq.true,sms_enabled.eq.true,email_enabled.eq.true'); // At least one notification enabled

  if (error) {
    console.error('Error fetching users for alert:', error);
    return [];
  }

  return data || [];
};

export const logAlert = async (alertData: Omit<AlertLog, 'id' | 'created_at'>): Promise<void> => {
  const serverClient = createServerSupabaseClient();
  
  const { error } = await serverClient
    .from('alert_logs')
    .insert({
      ...alertData,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error logging alert:', error);
  }
};