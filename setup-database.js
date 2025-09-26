// setup-database.js - Creează tabelele direct prin API
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cpipcetsyllszoouppap.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaXBjZXRzeWxsc3pvb3VwcGFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg4NzkyMCwiZXhwIjoyMDc0NDYzOTIwfQ.IPlrH_UOUwaaSSJqmyOVazH2RWz_ba0UFDIibE_LMW8';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function createTables() {
  console.log('🚀 Creating Supabase tables...');
  
  try {
    // Test connection first
    console.log('🔍 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (testError) {
      throw new Error(`Connection failed: ${testError.message}`);
    }
    
    console.log('✅ Connection successful!');
    
    // SQL pentru crearea tabelelor
    const createTablesSQL = `
      -- 1. Tabelul wind_users
      CREATE TABLE IF NOT EXISTS wind_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        phone TEXT,
        push_subscription_id TEXT,
        wind_threshold INTEGER NOT NULL DEFAULT 20,
        location TEXT NOT NULL DEFAULT 'București, România',
        push_enabled BOOLEAN DEFAULT true,
        sms_enabled BOOLEAN DEFAULT false,
        email_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        last_alert_sent TIMESTAMPTZ,
        CONSTRAINT valid_threshold CHECK (wind_threshold > 0 AND wind_threshold <= 200)
      );

      -- 2. Tabelul alert_logs  
      CREATE TABLE IF NOT EXISTS alert_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES wind_users(id) ON DELETE CASCADE,
        wind_speed INTEGER NOT NULL,
        wind_gust INTEGER NOT NULL,
        user_threshold INTEGER NOT NULL,
        alert_level TEXT NOT NULL CHECK (alert_level IN ('caution', 'warning', 'danger')),
        message_sent TEXT NOT NULL,
        notification_types TEXT[] DEFAULT '{}',
        onesignal_push_id TEXT,
        onesignal_sms_id TEXT,
        onesignal_email_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT valid_wind_speed CHECK (wind_speed > 0)
      );

      -- 3. Tabelul weather_cache
      CREATE TABLE IF NOT EXISTS weather_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location TEXT NOT NULL,
        wind_speed INTEGER NOT NULL,
        wind_gust INTEGER NOT NULL,
        wind_direction INTEGER,
        temperature DECIMAL(4,1),
        humidity INTEGER,
        visibility INTEGER,
        source TEXT DEFAULT 'openweathermap',
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
        CONSTRAINT valid_wind CHECK (wind_speed >= 0 AND wind_gust >= wind_speed)
      );

      -- 4. Indexuri pentru performance
      CREATE INDEX IF NOT EXISTS idx_wind_users_threshold ON wind_users(wind_threshold);
      CREATE INDEX IF NOT EXISTS idx_wind_users_location ON wind_users(location);
      CREATE INDEX IF NOT EXISTS idx_alert_logs_user_created ON alert_logs(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_weather_cache_location_time ON weather_cache(location, recorded_at DESC);

      -- 5. RLS policies (permisive)
      ALTER TABLE wind_users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY; 
      ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

      CREATE POLICY "wind_users_policy" ON wind_users FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "alert_logs_policy" ON alert_logs FOR ALL USING (true) WITH CHECK (true);
      CREATE POLICY "weather_cache_policy" ON weather_cache FOR ALL USING (true) WITH CHECK (true);

      -- 6. Insert test user
      INSERT INTO wind_users (email, wind_threshold, location, push_enabled, email_enabled) 
      VALUES ('test@wind.qub3.uk', 25, 'Aleea Someșul Cald, București', true, true) 
      ON CONFLICT (email) DO NOTHING;
    `;

    console.log('🔨 Creating tables with SQL...');
    
    // Execute SQL
    const { data, error } = await supabase.rpc('exec', { 
      sql: createTablesSQL 
    });

    if (error) {
      console.error('❌ RPC Error:', error);
      
      // Fallback: try direct SQL execution
      console.log('🔄 Trying alternative approach...');
      const { error: altError } = await supabase
        .from('_realtime.messages') // This might not work, but let's try
        .insert({ payload: { sql: createTablesSQL } });
      
      if (altError) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }
    }

    console.log('✅ Tables creation attempted!');
    
    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['wind_users', 'alert_logs', 'weather_cache']);

    if (tableError) {
      console.error('❌ Verification error:', tableError);
      return;
    }

    const createdTables = tables?.map(t => t.table_name) || [];
    console.log('📊 Created tables:', createdTables);

    if (createdTables.includes('wind_users')) {
      console.log('✅ SUCCESS: Tables created successfully!');
      
      // Test insert
      const { data: testUser, error: insertError } = await supabase
        .from('wind_users')
        .insert({
          email: 'setup-test@wind.qub3.uk',
          wind_threshold: 30,
          location: 'Test Location',
          push_enabled: true
        })
        .select()
        .single();

      if (!insertError && testUser) {
        console.log('✅ Test user created:', testUser.email);
      }
    } else {
      console.log('⚠️ Tables may not have been created. Manual setup required.');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('💡 Please run the SQL manually in Supabase SQL Editor');
  }
}

// Run the setup
createTables();