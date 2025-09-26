-- Schema pentru Wind Warning Database
-- Rulează acest script în Supabase SQL Editor

-- 1. Tabelul pentru utilizatori și setările lor
CREATE TABLE IF NOT EXISTS wind_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact info
  email TEXT UNIQUE,
  phone TEXT,
  push_subscription_id TEXT,
  
  -- Setări personalizate
  wind_threshold INTEGER NOT NULL DEFAULT 20, -- Pragul de vânt în km/h
  location TEXT NOT NULL DEFAULT 'București, România',
  
  -- Preferințe notificări
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT false,
  
  -- Setări avansate
  alert_frequency TEXT DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate', 'hourly', 'daily')),
  quiet_hours_start TIME,  -- Ex: '22:00'
  quiet_hours_end TIME,    -- Ex: '06:00'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_alert_sent TIMESTAMPTZ,
  
  -- Indexuri pentru performance
  CONSTRAINT valid_threshold CHECK (wind_threshold > 0 AND wind_threshold <= 200),
  CONSTRAINT valid_quiet_hours CHECK (
    (quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
    (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  )
);

-- 2. Tabelul pentru istoricul alertelor
CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES wind_users(id) ON DELETE CASCADE,
  
  -- Date meteo
  wind_speed INTEGER NOT NULL,
  wind_gust INTEGER NOT NULL,
  user_threshold INTEGER NOT NULL,
  alert_level TEXT NOT NULL CHECK (alert_level IN ('caution', 'warning', 'danger')),
  
  -- Mesajul trimis
  message_sent TEXT NOT NULL,
  notification_types TEXT[] DEFAULT '{}', -- ['push', 'sms', 'email']
  
  -- OneSignal tracking IDs
  onesignal_push_id TEXT,
  onesignal_sms_id TEXT,
  onesignal_email_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index pentru queries rapide
  CONSTRAINT valid_wind_speed CHECK (wind_speed > 0),
  CONSTRAINT valid_alert_types CHECK (array_length(notification_types, 1) > 0)
);

-- 3. Tabelul pentru cache-ul datelor meteo (opțional, pentru optimizare)
CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  
  -- Date meteo
  wind_speed INTEGER NOT NULL,
  wind_gust INTEGER NOT NULL,
  wind_direction INTEGER,
  temperature DECIMAL(4,1),
  humidity INTEGER,
  visibility INTEGER,
  
  -- API source
  source TEXT DEFAULT 'openweathermap',
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- TTL - data expirată după 1 oră
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  
  -- Index pentru locație și timp
  CONSTRAINT valid_wind CHECK (wind_speed >= 0 AND wind_gust >= wind_speed)
);

-- 4. Funcție pentru auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Trigger pentru auto-update
CREATE TRIGGER update_wind_users_updated_at 
    BEFORE UPDATE ON wind_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Indexuri pentru performance
CREATE INDEX IF NOT EXISTS idx_wind_users_threshold ON wind_users(wind_threshold);
CREATE INDEX IF NOT EXISTS idx_wind_users_location ON wind_users(location);
CREATE INDEX IF NOT EXISTS idx_wind_users_notifications ON wind_users(push_enabled, sms_enabled, email_enabled);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_created ON alert_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_logs_created ON alert_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weather_cache_location_time ON weather_cache(location, recorded_at DESC);

-- 7. RLS (Row Level Security) - pentru securitate
ALTER TABLE wind_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

-- 8. Politici de securitate (permisive pentru început)
CREATE POLICY "Users can manage their own data" ON wind_users
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own alerts" ON alert_logs
    FOR SELECT USING (true);

CREATE POLICY "Service can insert alerts" ON alert_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Weather cache is readable by all" ON weather_cache
    FOR SELECT USING (true);

CREATE POLICY "Service can manage weather cache" ON weather_cache
    FOR ALL WITH CHECK (true);

-- 9. Comentarii pentru documentație
COMMENT ON TABLE wind_users IS 'Utilizatori Wind Warning cu setările lor personalizate';
COMMENT ON TABLE alert_logs IS 'Istoricul tuturor alertelor trimise';
COMMENT ON TABLE weather_cache IS 'Cache pentru datele meteorologice (TTL 1 oră)';

COMMENT ON COLUMN wind_users.wind_threshold IS 'Pragul personal de vânt în km/h (1-200)';
COMMENT ON COLUMN wind_users.alert_frequency IS 'Cât de des să primească alerte: immediate/hourly/daily';
COMMENT ON COLUMN wind_users.quiet_hours_start IS 'Ora de început pentru quiet hours (ex: 22:00)';
COMMENT ON COLUMN wind_users.quiet_hours_end IS 'Ora de sfârșit pentru quiet hours (ex: 06:00)';

-- 10. Date de test pentru verificare
INSERT INTO wind_users (
    email, 
    wind_threshold, 
    location, 
    push_enabled, 
    email_enabled
) VALUES (
    'test@wind.qub3.uk',
    25,
    'Aleea Someșul Cald, București', 
    true, 
    true
) ON CONFLICT (email) DO NOTHING;

-- Schema completă! ✅