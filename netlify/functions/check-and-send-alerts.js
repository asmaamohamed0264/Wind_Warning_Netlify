// Funcție pentru verificarea automată a condițiilor meteo și trimiterea alertelor personalizate
// GET /api/check-and-send-alerts (poate fi apelată prin cron job sau manual)

const { createClient } = require('@supabase/supabase-js');

// Rate limiting pentru API-ul meteo
const weatherRequestTimes = [];
const WEATHER_RATE_LIMIT = 2; // max 2 requests
const WEATHER_RATE_WINDOW = 60 * 1000; // per minute

function checkWeatherRateLimit() {
  const now = Date.now();
  const validRequests = weatherRequestTimes.filter(time => now - time < WEATHER_RATE_WINDOW);
  
  if (validRequests.length >= WEATHER_RATE_LIMIT) {
    return false;
  }
  
  weatherRequestTimes.push(now);
  // Keep only recent requests
  weatherRequestTimes.splice(0, weatherRequestTimes.length - WEATHER_RATE_LIMIT);
  return true;
}

async function getWeatherData(location = 'București, România') {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }
  
  // Check rate limit
  if (!checkWeatherRateLimit()) {
    throw new Error('Weather API rate limit exceeded');
  }
  
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    location: data.name + ', ' + data.sys.country,
    wind_speed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    wind_gust: data.wind.gust ? Math.round(data.wind.gust * 3.6) : Math.round(data.wind.speed * 3.6 * 1.3),
    wind_direction: data.wind.deg || 0,
    temperature: data.main.temp,
    humidity: data.main.humidity,
    visibility: data.visibility ? Math.round(data.visibility / 1000) : null
  };
}

function determineAlertLevel(windSpeed, userThreshold) {
  const ratio = windSpeed / userThreshold;
  
  if (ratio >= 1.5) return 'danger';   // 50% over threshold
  if (ratio >= 1.2) return 'warning';  // 20% over threshold
  return 'caution';  // At or just over threshold
}

function createAlertMessage(windData, userThreshold, alertLevel) {
  const { wind_speed, wind_gust, location } = windData;
  
  const icons = {
    caution: '⚠️',
    warning: '🌪️', 
    danger: '🚨'
  };
  
  const levels = {
    caution: 'ATENȚIE',
    warning: 'AVERTISMENT', 
    danger: 'PERICOL'
  };
  
  return `${icons[alertLevel]} ${levels[alertLevel]} - VÂNT PUTERNIC

📍 Locația: ${location}
💨 Viteză vânt: ${wind_speed} km/h
🌪️ Rafale: ${wind_gust} km/h
📊 Pragul tău: ${userThreshold} km/h

Vântul a depășit pragul tău setat. Te rugăm să iei măsurile necesare de precauție.

🕒 ${new Date().toLocaleString('ro-RO')}`;
}

function isInQuietHours(quietStart, quietEnd) {
  if (!quietStart || !quietEnd) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  // Parse quiet hours (format: "HH:MM")
  const [startHour, startMin] = quietStart.split(':').map(Number);
  const [endHour, endMin] = quietEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight quiet hours (e.g., 22:00 to 06:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

async function sendNotifications(user, message, alertLevel, windData) {
  const notifications = [];
  const notificationTypes = [];
  
  // Skip if in quiet hours
  if (isInQuietHours(user.quiet_hours_start, user.quiet_hours_end)) {
    console.log(`Skipping notifications for ${user.email} - in quiet hours`);
    return { notifications: [], notificationTypes: [] };
  }
  
  try {
    // OneSignal setup
    const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
    const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;
    
    if (!oneSignalAppId || !oneSignalApiKey) {
      throw new Error('OneSignal not configured');
    }
    
    // Push notification
    if (user.push_enabled && user.push_subscription_id) {
      try {
        const pushResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${oneSignalApiKey}`
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            include_player_ids: [user.push_subscription_id],
            headings: { en: `🌪️ Wind Alert - ${alertLevel.toUpperCase()}` },
            contents: { en: message },
            data: {
              alert_level: alertLevel,
              wind_speed: windData.wind_speed,
              user_threshold: user.wind_threshold
            }
          })
        });
        
        const pushResult = await pushResponse.json();
        if (pushResult.id) {
          notifications.push({ type: 'push', id: pushResult.id });
          notificationTypes.push('push');
        }
      } catch (pushError) {
        console.error('Push notification error:', pushError);
      }
    }
    
    // SMS notification
    if (user.sms_enabled && user.phone) {
      try {
        const smsResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${oneSignalApiKey}`
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            include_phone_numbers: [user.phone],
            contents: { en: message.substring(0, 160) }, // SMS limit
            sms_from: process.env.ONESIGNAL_SMS_FROM || 'WindAlert'
          })
        });
        
        const smsResult = await smsResponse.json();
        if (smsResult.id) {
          notifications.push({ type: 'sms', id: smsResult.id });
          notificationTypes.push('sms');
        }
      } catch (smsError) {
        console.error('SMS notification error:', smsError);
      }
    }
    
    // Email notification
    if (user.email_enabled && user.email) {
      try {
        const emailResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${oneSignalApiKey}`
          },
          body: JSON.stringify({
            app_id: oneSignalAppId,
            include_email_tokens: [user.email],
            template_id: process.env.ONESIGNAL_EMAIL_TEMPLATE_ID, // Optional template
            subject: `🌪️ Wind Alert - ${alertLevel.toUpperCase()}`,
            contents: { en: message.replace(/\n/g, '<br>') }
          })
        });
        
        const emailResult = await emailResponse.json();
        if (emailResult.id) {
          notifications.push({ type: 'email', id: emailResult.id });
          notificationTypes.push('email');
        }
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }
    }
    
  } catch (error) {
    console.error('Notification error:', error);
  }
  
  return { notifications, notificationTypes };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Method not allowed. Use GET.' 
      })
    };
  }

  try {
    console.log('🚀 Starting automated weather check and alert system...');
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get current weather data
    const weatherData = await getWeatherData();
    console.log('🌪️ Weather data:', weatherData);
    
    // Cache weather data
    await supabase
      .from('weather_cache')
      .insert({
        location: weatherData.location,
        wind_speed: weatherData.wind_speed,
        wind_gust: weatherData.wind_gust,
        wind_direction: weatherData.wind_direction,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        visibility: weatherData.visibility
      });
    
    // Get users who should receive alerts (wind speed > their threshold)
    const { data: users, error: usersError } = await supabase
      .from('wind_users')
      .select('*')
      .lte('wind_threshold', weatherData.wind_speed) // threshold <= current wind speed
      .or('push_enabled.eq.true,sms_enabled.eq.true,email_enabled.eq.true'); // at least one notification enabled
    
    if (usersError) {
      throw new Error('Error fetching users: ' + usersError.message);
    }
    
    console.log(`👥 Found ${users.length} users who should receive alerts`);
    
    const results = {
      weather: weatherData,
      alerts_sent: 0,
      users_notified: [],
      errors: []
    };
    
    // Check alert frequency and last alert time for each user
    for (const user of users) {
      try {
        // Check if we should send alert based on frequency
        const now = new Date();
        const lastAlert = user.last_alert_sent ? new Date(user.last_alert_sent) : null;
        
        let shouldSend = true;
        
        if (lastAlert && user.alert_frequency !== 'immediate') {
          const timeDiff = now - lastAlert;
          
          if (user.alert_frequency === 'hourly' && timeDiff < 60 * 60 * 1000) {
            shouldSend = false;
          } else if (user.alert_frequency === 'daily' && timeDiff < 24 * 60 * 60 * 1000) {
            shouldSend = false;
          }
        }
        
        if (!shouldSend) {
          console.log(`⏭️ Skipping ${user.email} - alert frequency not met`);
          continue;
        }
        
        const alertLevel = determineAlertLevel(weatherData.wind_speed, user.wind_threshold);
        const message = createAlertMessage(weatherData, user.wind_threshold, alertLevel);
        
        // Send notifications
        const { notifications, notificationTypes } = await sendNotifications(user, message, alertLevel, weatherData);
        
        if (notificationTypes.length > 0) {
          // Log alert in database
          await supabase
            .from('alert_logs')
            .insert({
              user_id: user.id,
              wind_speed: weatherData.wind_speed,
              wind_gust: weatherData.wind_gust,
              user_threshold: user.wind_threshold,
              alert_level: alertLevel,
              message_sent: message,
              notification_types: notificationTypes,
              onesignal_push_id: notifications.find(n => n.type === 'push')?.id || null,
              onesignal_sms_id: notifications.find(n => n.type === 'sms')?.id || null,
              onesignal_email_id: notifications.find(n => n.type === 'email')?.id || null
            });
          
          // Update user's last alert time
          await supabase
            .from('wind_users')
            .update({ last_alert_sent: now.toISOString() })
            .eq('id', user.id);
          
          results.alerts_sent++;
          results.users_notified.push({
            email: user.email,
            wind_threshold: user.wind_threshold,
            alert_level: alertLevel,
            notifications: notificationTypes
          });
          
          console.log(`✅ Alert sent to ${user.email} via ${notificationTypes.join(', ')}`);
        }
        
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
        results.errors.push({
          user: user.email,
          error: userError.message
        });
      }
    }
    
    console.log(`🎉 Process complete: ${results.alerts_sent} alerts sent`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Weather check complete. ${results.alerts_sent} alerts sent.`,
        results
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