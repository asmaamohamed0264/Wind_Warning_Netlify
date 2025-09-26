// Test simplificat pentru conexiunea la Supabase
// Rulează cu: node test-simple-connection.js

const { createClient } = require('@supabase/supabase-js');

// Environment variables (valorile tale din Netlify)
const supabaseUrl = 'https://cpipcetsyllszoouppap.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaXBjZXRzeWxsc3pvb3VwcGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODc5MjAsImV4cCI6MjA3NDQ2MzkyMH0.MB7akpyFJ9wWv8jZjohH_p7xb5EDVbd_uNyP44d7Rbo';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwaXBjZXRzeWxsc3pvb3VwcGFwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg4NzkyMCwiZXhwIjoyMDc0NDYzOTIwfQ.IPlrH_UOUwaaSSJqmyOVazH2RWz_ba0UFDIibE_LMW8';

// Creez clienții
const anonClient = createClient(supabaseUrl, anonKey);
const adminClient = createClient(supabaseUrl, serviceKey);

async function testBasicConnection() {
  console.log('🔍 Testez conexiunea de bază la Supabase...');
  
  try {
    // Test cu anon key
    const { data, error } = await anonClient.auth.getSession();
    
    if (error) {
      console.log('⚠️  Auth session error (normal pentru anon key):', error.message);
    } else {
      console.log('✅ Conexiunea anonimă funcționează!');
    }
    
    console.log('🔗 URL Supabase:', supabaseUrl);
    console.log('🔑 Anon key active:', anonKey.substring(0, 50) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ Eroare conexiune:', error.message);
    return false;
  }
}

async function checkTables() {
  console.log('\n🔍 Verific existența tabelelor...');
  
  const tables = ['wind_users', 'alert_logs', 'weather_cache'];
  const results = [];
  
  for (const tableName of tables) {
    try {
      console.log(`  📋 Testez tabelul: ${tableName}`);
      
      // Încerc să fac select cu limit 0 pentru a testa existența
      const { data, error } = await adminClient
        .from(tableName)
        .select('*')
        .limit(0);
      
      if (error) {
        console.log(`    ❌ ${tableName}: ${error.message}`);
        results.push({ table: tableName, exists: false, error: error.message });
      } else {
        console.log(`    ✅ ${tableName}: există și este accesibil`);
        results.push({ table: tableName, exists: true });
      }
    } catch (err) {
      console.log(`    ❌ ${tableName}: eroare catch - ${err.message}`);
      results.push({ table: tableName, exists: false, error: err.message });
    }
  }
  
  const existingTables = results.filter(r => r.exists).map(r => r.table);
  const missingTables = results.filter(r => !r.exists).map(r => r.table);
  
  console.log(`\n📊 Rezultat: ${existingTables.length}/${tables.length} tabele există`);
  if (existingTables.length > 0) {
    console.log(`   ✅ Există: ${existingTables.join(', ')}`);
  }
  if (missingTables.length > 0) {
    console.log(`   ❌ Lipsesc: ${missingTables.join(', ')}`);
  }
  
  return { existing: existingTables, missing: missingTables };
}

async function testUserOperations() {
  console.log('\n🧪 Testez operațiile pe utilizatori...');
  
  try {
    // Încerc să citesc utilizatorii existenți
    const { data: users, error } = await adminClient
      .from('wind_users')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('   ❌ Eroare la citirea utilizatorilor:', error.message);
      return false;
    }
    
    console.log(`   ✅ Găsit ${users.length} utilizatori în baza de date`);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`   👤 Primul utilizator: ${user.email} (prag: ${user.wind_threshold} km/h)`);
    }
    
    return true;
  } catch (error) {
    console.log('   ❌ Eroare la testarea operațiilor:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test conexiune simplificată la Supabase\n');
  console.log('=' .repeat(50));
  
  // 1. Test conexiune de bază
  const basicOk = await testBasicConnection();
  if (!basicOk) {
    console.log('\n❌ Testul de conexiune a eșuat. Verifică URL-ul și cheile.');
    return;
  }
  
  // 2. Verific tabelele
  const tableResult = await checkTables();
  
  // 3. Testez operațiile pe utilizatori (doar dacă tabelul există)
  if (tableResult.existing.includes('wind_users')) {
    await testUserOperations();
  } else {
    console.log('\n⚠️  Tabelul wind_users nu există încă.');
    console.log('   📝 Folosește instrucțiunile din "instrucțiuni-setup-bază-de-date.md"');
    console.log('   🔧 pentru a crea tabelele în Supabase SQL Editor.');
  }
  
  // 4. Rezumat
  console.log('\n' + '=' .repeat(50));
  console.log('📋 REZUMAT:');
  console.log(`   🔗 URL: ${supabaseUrl}`);
  console.log(`   ✅ Conexiune: OK`);
  console.log(`   📊 Tabele: ${tableResult.existing.length}/3 configurate`);
  
  if (tableResult.missing.length > 0) {
    console.log(`   🔧 ACȚIUNE NECESARĂ: Creează tabelele: ${tableResult.missing.join(', ')}`);
    console.log('   📄 Vezi "instrucțiuni-setup-bază-de-date.md" pentru pașii detaliați.');
  } else {
    console.log('   🎉 Toate tabelele sunt configurate! Gata pentru sistemul de alerte!');
  }
}

// Run the test
main().catch(console.error);