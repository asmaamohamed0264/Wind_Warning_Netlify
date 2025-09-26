// netlify/functions/test-supabase.ts - Test conexiune Supabase
import type { Handler } from '@netlify/functions';
import { createServerSupabaseClient } from '../../lib/supabase';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(ALLOWED_ORIGIN)
    };
  }

  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    console.log('Environment variables:', envCheck);
    
    // Test Supabase connection
    const supabase = createServerSupabaseClient();
    
    // Test 1: Simple query to check connection
    const { data: testConnection, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);

    if (connectionError) {
      throw new Error(`Connection test failed: ${connectionError.message}`);
    }

    console.log('✅ Supabase connection successful');
    console.log('Available tables:', testConnection?.map(t => t.table_name));

    // Test 2: Check if our tables exist
    const { data: ourTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['wind_users', 'alert_logs', 'weather_cache']);

    const existingTables = ourTables?.map(t => t.table_name) || [];
    const missingTables = ['wind_users', 'alert_logs', 'weather_cache'].filter(
      table => !existingTables.includes(table)
    );

    // Test 3: If tables exist, test a simple query
    let sampleData = null;
    if (existingTables.includes('wind_users')) {
      const { data: users, error: usersError } = await supabase
        .from('wind_users')
        .select('id, email, wind_threshold, location')
        .limit(3);
      
      if (!usersError) {
        sampleData = users;
        console.log('✅ Sample users data:', users);
      }
    }

    return {
      statusCode: 200,
      headers: { 
        'content-type': 'application/json; charset=utf-8', 
        ...corsHeaders(ALLOWED_ORIGIN) 
      },
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        environment: envCheck,
        connection: {
          status: 'connected',
          availableTables: testConnection?.length || 0,
          allTables: testConnection?.map(t => t.table_name) || []
        },
        schema: {
          existingTables,
          missingTables,
          needsSchemaSetup: missingTables.length > 0
        },
        sampleData: sampleData || 'No users table or no data yet',
        message: missingTables.length > 0 
          ? '⚠️ Tables missing - please run the schema.sql script in Supabase SQL Editor'
          : '✅ All tables exist and connection is working!'
      })
    };

  } catch (error: any) {
    console.error('❌ Supabase test failed:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'content-type': 'application/json; charset=utf-8', 
        ...corsHeaders(ALLOWED_ORIGIN) 
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          checkEnvironmentVariables: 'Verify SUPABASE_* variables are set in Netlify',
          checkSupabaseProject: 'Verify project is active in Supabase dashboard',
          checkApiKeys: 'Verify API keys are correct and not expired',
          runSchema: 'Run the schema.sql script in Supabase SQL Editor'
        }
      })
    };
  }
};