// Funcție pentru abonarea automată la notificări push
// POST /api/subscribe-notifications

const { createClient } = require('@supabase/supabase-js');

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 10; // max 10 subscriptions per IP
const RATE_WINDOW = 5 * 60 * 1000; // per 5 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const requests = requestCounts.get(ip) || [];
  
  // Remove old requests outside the window
  const validRequests = requests.filter(time => now - time < RATE_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT) {
    return false;
  }
  
  validRequests.push(now);
  requestCounts.set(ip, validRequests);
  return true;
}

exports.handler = async (event, context) => {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed. Use POST.' 
      })
    };
  }

  try {
    // Rate limiting
    const clientIP = event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Max 10 subscriptions per 5 minutes.'
        })
      };
    }

    // Parse request body
    let subscriptionData;
    try {
      subscriptionData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        })
      };
    }

    const { push_subscription, wind_threshold, location } = subscriptionData;
    
    if (!push_subscription || !push_subscription.endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing push subscription data'
        })
      };
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Create unique ID from push subscription endpoint
    const subscriptionHash = Buffer.from(push_subscription.endpoint).toString('base64').substring(0, 20);
    const userId = `push_${subscriptionHash}`;

    // Prepare user data with defaults
    const userRecord = {
      id: userId,
      email: null, // No email for push-only subscriptions
      phone: null,
      push_subscription_id: push_subscription.endpoint,
      
      // Default settings for auto-subscription
      wind_threshold: wind_threshold || 25,
      location: location || 'București, România',
      
      // Notification preferences - only push enabled by default
      push_enabled: true,
      sms_enabled: false,
      email_enabled: false,
      
      // Advanced settings
      alert_frequency: subscriptionData.alert_frequency || 'immediate',
      quiet_hours_start: subscriptionData.quiet_hours_start || null,
      quiet_hours_end: subscriptionData.quiet_hours_end || null,
      
      // Store the full push subscription for later use
      push_subscription_data: JSON.stringify(push_subscription),
      
      // Timestamps
      updated_at: new Date().toISOString()
    };

    // Insert or update user
    const { data, error } = await supabase
      .from('wind_users')
      .upsert(userRecord, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Database error: ' + error.message
        })
      };
    }

    // Store subscription in OneSignal (optional, for better push management)
    try {
      if (process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY) {
        const oneSignalResponse = await fetch('https://onesignal.com/api/v1/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
          },
          body: JSON.stringify({
            app_id: process.env.ONESIGNAL_APP_ID,
            device_type: 5, // Chrome/Firefox
            identifier: push_subscription.endpoint,
            notification_types: 1, // Subscribed
            web_auth: push_subscription.keys?.auth || null,
            web_p256: push_subscription.keys?.p256dh || null,
            tags: {
              wind_threshold: userRecord.wind_threshold,
              location: userRecord.location,
              user_id: userId
            }
          })
        });
        
        const oneSignalResult = await oneSignalResponse.json();
        if (oneSignalResult.success && oneSignalResult.id) {
          // Update user with OneSignal player ID
          await supabase
            .from('wind_users')
            .update({ push_subscription_id: oneSignalResult.id })
            .eq('id', userId);
        }
      }
    } catch (oneSignalError) {
      console.warn('OneSignal registration failed:', oneSignalError.message);
      // Don't fail the whole process if OneSignal fails
    }

    // Success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Subscription successful!',
        user: {
          id: data.id,
          wind_threshold: data.wind_threshold,
          location: data.location,
          push_enabled: data.push_enabled,
          alert_frequency: data.alert_frequency,
          created_at: data.created_at
        },
        settings: {
          wind_threshold: data.wind_threshold,
          location: data.location,
          notifications: ['push'],
          message: `Vei primi alerte când vântul depășește ${data.wind_threshold} km/h în ${data.location}`
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error: ' + error.message
      })
    };
  }
};