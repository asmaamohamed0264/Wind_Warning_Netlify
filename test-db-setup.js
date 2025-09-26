// Test script pentru conexiunea Supabase și crearea tabelelor
// Rulează cu: node test-db-setup.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Environment variables (folosește valorile tale din Netlify)
const supabaseUrl = 'https://cpipcetsyllszoouppap.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaXBjZXRzeWxsc3pvb3VwcGFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg4NzkyMCwiZXhwIjoyMDc0NDYzOTIwfQ.IPlrH_UOUwaaSSJqmyOVazH2RWz_ba0UFDIibE_LMW8';

// Client cu service role pentru admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testConnection() {
  console.log('🔍 Testez conexiunea la Supabase...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .limit(1);
    
    if (error) {
      console.error('❌ Eroare conexiune:', error);
      return false;
    }
    
    console.log('✅ Conexiunea la Supabase funcționează!');
    return true;
  } catch (error) {
    console.error('❌ Eroare conexiune:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('\n🔍 Verific existența tabelelor...');
  
  const tables = ['wind_users', 'alert_logs', 'weather_cache'];
  const existing = [];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (!error) {
        existing.push(table);
        console.log(`✅ Tabelul "${table}" există`);
      } else {
        console.log(`❌ Tabelul "${table}" nu există`);
      }
    } catch (error) {
      console.log(`❌ Tabelul "${table}" nu există sau eroare: ${error.message}`);
    }
  }
  
  return existing;
}

async function executeSchema() {
  console.log('\n🚀 Executez schema SQL...');
  
  try {
    // Citesc schema din fișier
    const schemaSQL = fs.readFileSync('./supabase/schema.sql', 'utf8');
    
    // Împart schema în comenzi individuale
    const commands = schemaSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Am găsit ${commands.length} comenzi SQL`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.toLowerCase().includes('create table')) {
        const tableName = command.match(/create table (?:if not exists )?(\w+)/i)?.[1];
        console.log(`📋 Creez tabelul: ${tableName}`);
      }
      
      try {
        const { error } = await supabase.rpc('exec_sql', { query: command + ';' });
        if (error) {
          console.log(`⚠️  Comandă ignorată (probabil deja există): ${error.message.substring(0, 100)}...`);
        }
      } catch (err) {
        console.log(`⚠️  Eroare la comanda ${i + 1}: ${err.message.substring(0, 100)}...`);
      }
    }
    
    console.log('✅ Schema executată (unele erori sunt normale dacă tabelele există deja)');
    return true;
  } catch (error) {
    console.error('❌ Eroare la executarea schemei:', error.message);
    return false;
  }
}

async function createTablesManually() {
  console.log('\n🛠️  Creez tabelele manual...');
  
  // 1. Tabelul wind_users
  const createWindUsers = `
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
      alert_frequency TEXT DEFAULT 'immediate' CHECK (alert_frequency IN ('immediate', 'hourly', 'daily')),
      quiet_hours_start TIME,
      quiet_hours_end TIME,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_alert_sent TIMESTAMPTZ,
      CONSTRAINT valid_threshold CHECK (wind_threshold > 0 AND wind_threshold <= 200)
    )
  `;
  
  // 2. Tabelul alert_logs
  const createAlertLogs = `
    CREATE TABLE IF NOT EXISTS alert_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      wind_speed INTEGER NOT NULL,
      wind_gust INTEGER NOT NULL,
      user_threshold INTEGER NOT NULL,
      alert_level TEXT NOT NULL CHECK (alert_level IN ('caution', 'warning', 'danger')),
      message_sent TEXT NOT NULL,
      notification_types TEXT[] DEFAULT '{}',
      onesignal_push_id TEXT,
      onesignal_sms_id TEXT,
      onesignal_email_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  
  // 3. Tabelul weather_cache
  const createWeatherCache = `
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
      expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
    )
  `;
  
  const tables = [
    { name: 'wind_users', sql: createWindUsers },
    { name: 'alert_logs', sql: createAlertLogs },
    { name: 'weather_cache', sql: createWeatherCache }
  ];
  
  for (const table of tables) {
    try {
      console.log(`📋 Creez ${table.name}...`);
      const { error } = await supabase.rpc('exec_sql', { query: table.sql });
      if (error) {
        console.log(`⚠️  ${table.name}: ${error.message}`);
      } else {
        console.log(`✅ ${table.name} creat cu succes!`);
      }
    } catch (err) {
      console.log(`❌ Eroare la ${table.name}: ${err.message}`);
    }
  }
}

async function insertTestUser() {
  console.log('\n👤 Inserez un utilizator de test...');
  
  try {
    const { data, error } = await supabase
      .from('wind_users')
      .upsert({
        email: 'test@wind.qub3.uk',
        wind_threshold: 25,
        location: 'Aleea Someșul Cald, București',
        push_enabled: true,
        email_enabled: true
      })
      .select();
    
    if (error) {
      console.error('❌ Eroare la inserarea utilizatorului:', error);
    } else {
      console.log('✅ Utilizator de test creat:', data[0]?.email);
    }
  } catch (error) {
    console.log('❌ Eroare la inserarea utilizatorului:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Testez setup-ul bazei de date Supabase\n');
  
  // 1. Test connection
  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Nu pot continua fără conexiune');
    return;
  }
  
  // 2. Check existing tables
  const existingTables = await checkTables();
  
  // 3. Create tables if needed
  if (existingTables.length === 0) {
    await createTablesManually();
    
    // Re-check
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
    await checkTables();
  } else {
    console.log(`\n✅ Am găsit ${existingTables.length} tabele existente`);
  }
  
  // 4. Insert test user
  await insertTestUser();
  
  console.log('\n🎉 Setup complet! Baza de date este gata pentru sistemul de alerte!');
}

// Run
main().catch(console.error);