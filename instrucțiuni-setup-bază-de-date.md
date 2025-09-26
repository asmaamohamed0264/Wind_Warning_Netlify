# Instrucțiuni pentru configurarea bazei de date Supabase

Acest document conține pașii pentru configurarea manuală a bazei de date Supabase pentru aplicația Wind Warning.

## 1. Accesează SQL Editor

1. Deschide [Supabase Dashboard](https://app.supabase.com) și autentifică-te
2. Selectează proiectul "Wind Warning" 
3. În meniul din stânga, apasă pe "SQL Editor"
4. Apasă pe "New Query" pentru a deschide un editor nou

## 2. Creează tabelul pentru utilizatori

Copiază și rulează următorul SQL pentru a crea tabelul `wind_users`:

```sql
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
  
  -- Constrângeri
  CONSTRAINT valid_threshold CHECK (wind_threshold > 0 AND wind_threshold <= 200),
  CONSTRAINT valid_quiet_hours CHECK (
    (quiet_hours_start IS NULL AND quiet_hours_end IS NULL) OR
    (quiet_hours_start IS NOT NULL AND quiet_hours_end IS NOT NULL)
  )
);

-- Trigger pentru auto-update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pentru auto-update
CREATE TRIGGER update_wind_users_updated_at 
    BEFORE UPDATE ON wind_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Indexuri
CREATE INDEX IF NOT EXISTS idx_wind_users_threshold ON wind_users(wind_threshold);
CREATE INDEX IF NOT EXISTS idx_wind_users_location ON wind_users(location);
CREATE INDEX IF NOT EXISTS idx_wind_users_notifications ON wind_users(push_enabled, sms_enabled, email_enabled);

-- RLS și politici
ALTER TABLE wind_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own data" ON wind_users
    FOR ALL USING (true) WITH CHECK (true);

-- Utilizator de test
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
```

## 3. Creează tabelul pentru istoricul alertelor

Copiază și rulează următorul SQL pentru a crea tabelul `alert_logs`:

```sql
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
  
  -- Constrângeri
  CONSTRAINT valid_wind_speed CHECK (wind_speed > 0)
);

-- Indexuri
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_created ON alert_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_logs_created ON alert_logs(created_at DESC);

-- RLS și politici
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own alerts" ON alert_logs
    FOR SELECT USING (true);
CREATE POLICY "Service can insert alerts" ON alert_logs
    FOR INSERT WITH CHECK (true);
```

## 4. Creează tabelul pentru cache meteo

Copiază și rulează următorul SQL pentru a crea tabelul `weather_cache`:

```sql
-- 3. Tabelul pentru cache-ul datelor meteo
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
  
  -- Constrângeri
  CONSTRAINT valid_wind CHECK (wind_speed >= 0 AND wind_gust >= wind_speed)
);

-- Indexuri
CREATE INDEX IF NOT EXISTS idx_weather_cache_location_time ON weather_cache(location, recorded_at DESC);

-- RLS și politici
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Weather cache is readable by all" ON weather_cache
    FOR SELECT USING (true);
CREATE POLICY "Service can manage weather cache" ON weather_cache
    FOR ALL WITH CHECK (true);
```

## 5. Verificare

După ce ai creat toate tabelele, poți verifica dacă acestea există executând:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('wind_users', 'alert_logs', 'weather_cache');
```

Ar trebui să vezi toate cele 3 tabele.

## 6. Testează inserarea unui utilizator

Dacă vrei să inserezi un utilizator de test:

```sql
INSERT INTO wind_users (
    email,
    wind_threshold,
    location,
    push_enabled,
    sms_enabled,
    email_enabled
) VALUES (
    'utilizator_test@example.com',
    30,
    'București, România',
    true,
    true,
    true
) ON CONFLICT (email) DO NOTHING;
```

## 7. Verifică utilizatorul

```sql
SELECT * FROM wind_users WHERE email = 'utilizator_test@example.com';
```

## 8. Următorii pași

După ce ai configurat baza de date, urmează să implementezi funcționalitățile:

1. Funcție pentru înregistrarea utilizatorilor și setarea pragurilor personalizate
2. Funcție pentru verificarea datelor meteo și compararea cu pragurile utilizatorilor
3. Funcție pentru trimiterea alertelor personalizate 
4. Implementarea sistemului de throttling pentru a preveni spam-ul

## Notă finală

Aceste scripturi sunt create pentru a fi rulate manual în SQL Editor, unul câte unul. Dacă întâmpini erori, verifică mesajele și ajustează după necesitate.