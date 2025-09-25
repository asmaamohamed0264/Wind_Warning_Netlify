// netlify/functions/send-alerts.ts - Updated for AI debugging
import type { Handler } from '@netlify/functions';

const REST_KEY = process.env.ONESIGNAL_REST_API_KEY!;
const APP_ID =
  process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
  process.env.VITE_ONESIGNAL_APP_ID ||
  process.env.ONESIGNAL_APP_ID;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'anthropic/claude-3-haiku:beta'; // Claude Haiku free, mai bun pentru română
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
}

interface WindAlertData {
  windSpeed: number;
  windGust: number;
  windDirection: number;
  location: string;
  alertLevel: 'normal' | 'caution' | 'warning' | 'danger';
  userThreshold: number;
  userId?: string;
  forecast?: Array<{
    time: string;
    windSpeed: number;
    windGust: number;
  }>;
}

// Analytics & Tracking System
interface NotificationAnalytics {
  id: string;
  timestamp: string;
  type: 'push' | 'sms' | 'email';
  alertLevel: string;
  windSpeed: number;
  userThreshold: number;
  location: string;
  aiMessageLength: number;
  deliveryStatus: 'sent' | 'failed' | 'delayed';
  oneSignalResponse?: any;
  errors?: string[];
  processingTime: number;
  smartTimingApplied: boolean;
}

// Generate unique tracking ID
function generateTrackingId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Track notification attempt
function trackNotificationAttempt(analytics: NotificationAnalytics): void {
  console.log('📊 ANALYTICS:', JSON.stringify({
    trackingId: analytics.id,
    timestamp: analytics.timestamp,
    alertLevel: analytics.alertLevel,
    windSpeed: analytics.windSpeed,
    location: analytics.location,
    deliveryStatus: analytics.deliveryStatus,
    processingTime: `${analytics.processingTime}ms`,
    smartTimingApplied: analytics.smartTimingApplied,
    aiMessageLength: analytics.aiMessageLength,
    errors: analytics.errors && analytics.errors.length > 0 ? analytics.errors : null
  }, null, 2));
  
  // În viitor, aceste date pot fi trimise către un analytics service:
  // await sendToAnalytics(analytics);
}

// Generate analytics summary
function generateAnalyticsSummary(analytics: NotificationAnalytics[]) {
  const total = analytics.length;
  const sent = analytics.filter(a => a.deliveryStatus === 'sent').length;
  const failed = analytics.filter(a => a.deliveryStatus === 'failed').length;
  const delayed = analytics.filter(a => a.deliveryStatus === 'delayed').length;
  const avgProcessingTime = analytics.reduce((sum, a) => sum + a.processingTime, 0) / total;
  
  return {
    totalAlerts: total,
    deliveryRate: `${((sent / total) * 100).toFixed(1)}%`,
    sentCount: sent,
    failedCount: failed,
    delayedCount: delayed,
    averageProcessingTime: `${avgProcessingTime.toFixed(0)}ms`,
    smartTimingUsage: `${((analytics.filter(a => a.smartTimingApplied).length / total) * 100).toFixed(1)}%`
  };
}

// Smart Timing: verifică dacă este momentul potrivit pentru notificări
function isAppropriateTimeForAlert(alertLevel: string): { shouldSend: boolean, reason: string } {
  // Utilizează timezone-ul României (UTC+2/UTC+3)
  const now = new Date();
  const romanianTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Bucharest"}));
  const hour = romanianTime.getHours();
  
  // Alertele DANGER se trimit întotdeauna imediat
  if (alertLevel === 'danger') {
    return {
      shouldSend: true,
      reason: `DANGER alert - sent immediately at ${hour}:${romanianTime.getMinutes().toString().padStart(2, '0')}`
    };
  }
  
  // Pentru alte nivele, evită orele de odihnă (22:00 - 06:00)
  const isNightTime = hour >= 22 || hour <= 6;
  
  if (isNightTime) {
    const nextMorningHour = hour <= 6 ? `0${6 + (6 - hour)}:00` : '06:00';
    return {
      shouldSend: false,
      reason: `Non-critical alert delayed - night time (${hour}:${romanianTime.getMinutes().toString().padStart(2, '0')}). Would be scheduled for ${nextMorningHour}`
    };
  }
  
  return {
    shouldSend: true,
    reason: `Appropriate time for alert (${hour}:${romanianTime.getMinutes().toString().padStart(2, '0')})`
  };
}

// Funcție pentru generarea mesajelor AI personalizate
async function generateAiMessage(data: WindAlertData): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set.');
    return `Avertizare vânt: ${data.windSpeed} km/h în ${data.location}. Depășește pragul de ${data.userThreshold} km/h. Fii precaut!`;
  }

  const getAlertLevelText = (level: string) => {
    switch (level) {
      case 'danger': return 'PERICOL MAJOR';
      case 'warning': return 'AVERTIZARE';
      case 'caution': return 'ATENȚIE';
      default: return 'NORMAL';
    }
  };

  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  // Seed pentru varietatea umorului bazat pe oră (schimbă la fiecare oră)
  const humorSeed = Math.floor(Date.now() / (1000 * 60 * 60)); // Schimbă la fiecare oră
  
  const prompt = `Scrie un mesaj amuzant de alertă vreme pentru LOREDANA (pe care o poți chema "Lori dragă"). Trebuie să fie în română perfectă, amuzant și prietenos.

INFO METEO:
• Vânt: ${data.windSpeed} km/h (pragul ei: ${data.userThreshold} km/h)
• Rafale: ${data.windGust} km/h
• Locația: ${data.location}
• Nivel: ${getAlertLevelText(data.alertLevel)}

CUM SĂ SCRII:
• Începe cu "Lori dragă" sau "Dragă Lori"
• Folosește română naturală, nu traduceri ciudate
• Fă-o să râdă, dar să înțeleagă că e periculos
• Menționează ${data.windSpeed} km/h și că a depășit ${data.userThreshold} km/h
• Dă-i un sfat de siguranță amuzant
• Maxim 100 caractere!

EXEMPLE BUNE:
"Lori dragă, vântul de ${data.windSpeed} km/h ți-a rupt pragul de ${data.userThreshold}! Ține-te de pălărie 😉🌬️"

Scrie DOAR mesajul, nimic altceva:`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.9, // Temperatura mai mare pentru creativitate și umor
      }),
    });

    const responseData = await response.json();
    
    if (response.ok && responseData.choices && responseData.choices.length > 0) {
      let message = responseData.choices[0].message.content.trim();
      // Curăță mesajul de orice referință la numărul de caractere
      message = message.replace(/\s*\([0-9]+\s+caractere\)/gi, '');
      message = message.replace(/\s*\(Exact [0-9]+\s+caractere[^)]*\)/gi, '');
      message = message.replace(/\s*\([0-9]+\s*chars?\)/gi, '');
      message = message.replace(/\s*\([0-9]+\s*ch\)/gi, '');
      return message.trim();
    } else {
      console.error('OpenRouter API error:', responseData);
      return `Avertizare vânt: ${data.windSpeed} km/h în ${data.location}. Depășește pragul de ${data.userThreshold} km/h. Fii precaut!`;
    }
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return `Avertizare vânt: ${data.windSpeed} km/h în ${data.location}. Depășește pragul de ${data.userThreshold} km/h. Fii precaut!`;
  }
}

// Template-uri pentru mesaje
function createPushTemplate(data: WindAlertData, aiMessage: string) {
  const getAlertEmoji = (level: string) => {
    switch (level) {
      case 'danger': return '🚨';
      case 'warning': return '⚠️';
      case 'caution': return '💨';
      default: return '✅';
    }
  };

  // Creează un titlu personalizat cu AI
  const personalizedTitle = `${getAlertEmoji(data.alertLevel)} ${data.windSpeed} km/h - Prag ${data.userThreshold} km/h`;

  return {
    app_id: APP_ID,
    // Trimăte push doar către push subscriber specific
    include_player_ids: [
      'b0c31784-f232-4333-abcf-3525c2d9ebdc'  // Push subscriber doar (Windows)
    ],
    headings: { 
      en: personalizedTitle
    },
    contents: { 
      en: aiMessage 
    },
    url: 'https://wind.qub3.uk/',
    data: {
      windSpeed: data.windSpeed,
      windGust: data.windGust,
      windDirection: data.windDirection,
      alertLevel: data.alertLevel,
      userThreshold: data.userThreshold,
      location: data.location,
      aiMessage: aiMessage // Adaugă mesajul AI în data pentru debugging
    },
    // Icon personalizat cu logo-ul aplicației
    chrome_web_icon: 'https://wind.qub3.uk/1000088934-modified.png',
    chrome_web_badge: 'https://wind.qub3.uk/1000088934-modified.png'
  };
}

function createSmsTemplate(data: WindAlertData, aiMessage: string): string {
  const getAlertEmoji = (level: string) => {
    switch (level) {
      case 'danger': return '🚨';
      case 'warning': return '⚠️';
      case 'caution': return '💨';
      default: return '✅';
    }
  };

  const baseTemplate = `${getAlertEmoji(data.alertLevel)} {MESSAGE} - Wind Warning: https://wind.qub3.uk`;
  const staticParts = baseTemplate.replace('{MESSAGE}', '');
  const maxMessageLength = 160 - staticParts.length;
  
  // Trunchează mesajul AI dacă este prea lung pentru SMS
  let truncatedMessage = aiMessage;
  if (aiMessage.length > maxMessageLength) {
    truncatedMessage = aiMessage.substring(0, maxMessageLength - 3) + '...';
    console.warn(`SMS message truncated from ${aiMessage.length} to ${truncatedMessage.length} characters`);
  }
  
  const finalSms = `${getAlertEmoji(data.alertLevel)} ${truncatedMessage} - Wind Warning: https://wind.qub3.uk`;
  console.log(`SMS length: ${finalSms.length}/160 characters`);
  
  return finalSms;
}

function createEmailTemplate(data: WindAlertData, aiMessage: string): string {
  const getAlertLevelText = (level: string) => {
    switch (level) {
      case 'danger': return 'PERICOL MAJOR';
      case 'warning': return 'AVERTIZARE';
      case 'caution': return 'ATENȚIE';
      default: return 'NORMAL';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'danger': return '#dc2626';
      case 'warning': return '#d97706';
      case 'caution': return '#ea580c';
      default: return '#16a34a';
    }
  };

  const getSafetyRecommendations = (level: string) => {
    switch (level) {
      case 'danger':
        return [
          'Rămâi în interior și evită toate activitățile în aer liber',
          'Fixează sau îndepărtează toate obiectele mobile din exterior',
          'Evită conducerea, în special a vehiculelor înalte',
          'Stai departe de ferestre și copaci'
        ];
      case 'warning':
        return [
          'Exercită precauție extremă când ieși afară',
          'Fixează obiectele mobile din curte',
          'Evită mersul pe jos lângă copaci sau structuri înalte',
          'Conduce cu atenție și fii conștient de vânturile laterale'
        ];
      case 'caution':
        return [
          'Fii atent la schimbările condițiilor de vânt',
          'Fixează obiectele ușoare din exterior',
          'Exercită precauție normală când ieși afară'
        ];
      default:
        return [];
    }
  };

  const recommendations = getSafetyRecommendations(data.alertLevel);
  const alertColor = getAlertColor(data.alertLevel);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alertă Vânt - Wind Warning</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            padding: 0; 
            background-color: #ffffff; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white; 
            text-align: center; 
            padding: 30px 20px; 
        }
        .logo { 
            max-width: 80px; 
            height: auto; 
            margin-bottom: 15px;
            border-radius: 50%;
        }
        .alert-level { 
            font-size: 1.4em; 
            font-weight: bold; 
            color: ${alertColor}; 
            margin: 20px 0; 
            padding: 15px;
            background-color: ${alertColor}15;
            border-left: 4px solid ${alertColor};
            border-radius: 8px;
        }
        .message { 
            margin: 25px 20px; 
            font-size: 1.1em;
        }
        .wind-info {
            background-color: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin: 20px;
            border: 1px solid #e2e8f0;
        }
        .wind-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 10px;
            background-color: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #1e3a8a;
        }
        .stat-label {
            font-size: 0.9em;
            color: #64748b;
            margin-top: 5px;
        }
        .recommendations {
            margin: 25px 20px;
        }
        .recommendations h3 {
            color: #1e3a8a;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .recommendations ul {
            list-style: none;
            padding: 0;
        }
        .recommendations li {
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: flex-start;
        }
        .recommendations li:last-child {
            border-bottom: none;
        }
        .recommendations li::before {
            content: "🛡️";
            margin-right: 10px;
            margin-top: 2px;
        }
        .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .footer { 
            text-align: center; 
            font-size: 0.9em; 
            color: #64748b; 
            margin-top: 30px; 
            padding: 20px;
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        .footer a {
            color: #3b82f6;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://wind.qub3.uk/1000088934-modified.png" alt="Wind Warning Logo" class="logo">
            <h1>Alertă Vânt Personalizată</h1>
            <p>Wind Warning - Sistem de Monitorizare Vânt</p>
        </div>
        
        <div class="alert-level">
            Grad de alertă: ${getAlertLevelText(data.alertLevel)}
        </div>
        
        <div class="message">
            <p>${aiMessage}</p>
        </div>

        <div class="wind-info">
            <h3 style="margin-top: 0; color: #1e3a8a;">📊 Informații Vânt</h3>
            <div class="wind-stats">
                <div class="stat-item">
                    <div class="stat-value">${data.windSpeed} km/h</div>
                    <div class="stat-label">Viteza Vântului</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.windGust} km/h</div>
                    <div class="stat-label">Rafale</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.userThreshold} km/h</div>
                    <div class="stat-label">Pragul Tău</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${data.location}</div>
                    <div class="stat-label">Locația</div>
                </div>
            </div>
        </div>

        ${recommendations.length > 0 ? `
        <div class="recommendations">
            <h3>🛡️ Recomandări de Siguranță</h3>
            <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 20px;">
            <a href="https://wind.qub3.uk" class="button">Accesează Wind Warning</a>
        </div>
        
        <div class="footer">
            <p>Acest email a fost trimis de <strong>Wind Warning</strong>.</p>
            <p>Te poți dezabona oricând din <a href="https://wind.qub3.uk">setările aplicației</a>.</p>
            <p style="margin-top: 15px; font-size: 0.8em;">
                Wind Warning - Sistem inteligent de monitorizare vânt pentru România<br>
                <a href="https://wind.qub3.uk">wind.qub3.uk</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        ...corsHeaders(ALLOWED_ORIGIN),
        'Content-Type': 'application/json; charset=utf-8'
      }
    };
  }

  if (!REST_KEY || !APP_ID) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      body: JSON.stringify({ error: 'Missing OneSignal keys' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    console.log('📥 Received request body:', body);
    console.log('🔍 Checking conditions:', {
      hasWindSpeed: body.windSpeed !== undefined,
      hasLocation: !!body.location,
      hasUserThreshold: !!body.userThreshold
    });

    // Mod 1: Alerte personalizate cu AI pentru date meteo
    if (body.windSpeed !== undefined && body.location && body.userThreshold) {
      console.log('🎯 AI Mode triggered with data:', body);
      
      // Start analytics tracking
      const startTime = Date.now();
      const trackingId = generateTrackingId();
      console.log('🏷️ Tracking ID:', trackingId);
      
      const windData: WindAlertData = {
        windSpeed: Number(body.windSpeed),
        windGust: Number(body.windGust) || Number(body.windSpeed),
        windDirection: Number(body.windDirection) || 0,
        location: body.location,
        alertLevel: body.alertLevel || 'caution',
        userThreshold: Number(body.userThreshold),
        userId: body.userId,
        forecast: body.forecast
      };

      console.log('📊 Wind Data processed:', windData);

      // Validare input
      if (!Number.isFinite(windData.windSpeed) || windData.windSpeed <= 0) {
        console.log('❌ Validation failed: windSpeed invalid');
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(ALLOWED_ORIGIN) },
          body: JSON.stringify({ ok: false, error: 'windSpeed must be a positive number' })
        };
      }

      // Smart Timing Check
      const timingCheck = isAppropriateTimeForAlert(windData.alertLevel);
      console.log('🕰 Smart Timing Check:', timingCheck.reason);
      
      if (!timingCheck.shouldSend) {
        console.log('🌙 Alert delayed due to night time - non-critical alert');
        
        // Track delayed notification
        const delayedAnalytics: NotificationAnalytics = {
          id: trackingId,
          timestamp: new Date().toISOString(),
          type: 'push',
          alertLevel: windData.alertLevel,
          windSpeed: windData.windSpeed,
          userThreshold: windData.userThreshold,
          location: windData.location,
          aiMessageLength: 0, // Nu s-a generat AI message
          deliveryStatus: 'delayed',
          processingTime: Date.now() - startTime,
          smartTimingApplied: true,
          errors: []
        };
        
        trackNotificationAttempt(delayedAnalytics);
        
        return {
          statusCode: 200,
          headers: { 
            'content-type': 'application/json; charset=utf-8', 
            ...corsHeaders(ALLOWED_ORIGIN) 
          },
          body: JSON.stringify({
            ok: true,
            delayed: true,
            trackingId: trackingId,
            reason: timingCheck.reason,
            message: 'Alert scheduled for appropriate time',
            data: {
              alertLevel: windData.alertLevel,
              currentTime: new Date().toLocaleString("ro-RO", {timeZone: "Europe/Bucharest"}),
              suggestedDeliveryTime: 'Tomorrow at 06:00'
            },
            analytics: {
              deliveryStatus: 'delayed',
              processingTime: `${delayedAnalytics.processingTime}ms`,
              smartTimingApplied: true
            }
          })
        };
      }

      // Generează mesajul personalizat cu AI
      const aiMessage = await generateAiMessage(windData);
      
      // Log pentru debugging
      console.log('Generated AI Message:', aiMessage);
      console.log('Wind Data:', windData);

      // Creează template-urile pentru fiecare tip de notificare
      const pushTemplate = createPushTemplate(windData, aiMessage);
      const smsTemplate = createSmsTemplate(windData, aiMessage);
      const emailTemplate = createEmailTemplate(windData, aiMessage);
      
      // Log template-urile pentru debugging
      console.log('Push Template:', pushTemplate);

      // Trimite notificarea push prin OneSignal
      const pushResponse = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${REST_KEY}`,
        },
        body: JSON.stringify(pushTemplate),
      });

      const pushData = await pushResponse.json();
      
      if (!pushResponse.ok) {
        console.error('OneSignal push error:', pushData);
      }

      // Trimâte SMS separat către subscriber-ul SMS
      console.log('📱 Trimit SMS notification...');
      const smsResponse = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${REST_KEY}`,
        },
        body: JSON.stringify({
          app_id: APP_ID,
          include_player_ids: ['059c692c-44d6-4a9a-b06f-e0da91a22376'], // SMS subscriber specific
          name: `Wind SMS Alert ${Date.now()}`,
          contents: { en: smsTemplate }
        }),
      });
      
      const smsData = await smsResponse.json();
      console.log('📱 SMS Response:', smsData);
      
      // Trimâte Email separat către subscriber-ul Email
      console.log('📧 Trimit Email notification...');
      const emailResponse = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Authorization: `Bearer ${REST_KEY}`,
        },
        body: JSON.stringify({
          app_id: APP_ID,
          // Revert la modul simplu - folosește ALL users ca înainte
          included_segments: ['All'],
          headings: { en: 'Alertă Vânt Personalizată' },
          contents: { en: aiMessage },
          // Email specific fields ca înainte
          email_subject: `Alertă Vânt: ${windData.windSpeed} km/h - ${windData.location}`,
          email_body: emailTemplate,
          // Specific email targeting
          send_after: new Date().toISOString()
        }),
      });
      
      const emailData = await emailResponse.json();
      console.log('📧 Email Response:', emailData);

      // Generate complete analytics for sent notification
      const sentAnalytics: NotificationAnalytics = {
        id: trackingId,
        timestamp: new Date().toISOString(),
        type: 'push',
        alertLevel: windData.alertLevel,
        windSpeed: windData.windSpeed,
        userThreshold: windData.userThreshold,
        location: windData.location,
        aiMessageLength: aiMessage.length,
        deliveryStatus: pushResponse.ok ? 'sent' : 'failed',
        oneSignalResponse: pushData,
        errors: pushData?.errors || [],
        processingTime: Date.now() - startTime,
        smartTimingApplied: false // Nu s-a aplicat smart timing dacă am ajuns aici
      };
      
      trackNotificationAttempt(sentAnalytics);
      
      // Returnează răspunsul cu template-urile generate
      const responseData = {
        ok: true, 
        trackingId: trackingId,
        data: {
          push: {
            sent: pushResponse.ok,
            data: pushData
          },
          sms: {
            sent: smsResponse.ok,
            data: smsData
          },
          email: {
            sent: emailResponse.ok,
            data: emailData
          },
          templates: {
            push: pushTemplate,
            sms: smsTemplate,
            email: emailTemplate
          },
          aiMessage: aiMessage,
          windData: windData,
          analytics: {
            deliveryStatus: sentAnalytics.deliveryStatus,
            processingTime: `${sentAnalytics.processingTime}ms`,
            aiMessageLength: sentAnalytics.aiMessageLength,
            smartTimingApplied: sentAnalytics.smartTimingApplied,
            oneSignalErrors: sentAnalytics.errors && sentAnalytics.errors.length > 0 ? sentAnalytics.errors : null
          }
        }
      };
      
      console.log('📤 Returning response with analytics:', responseData);
      
      return {
        statusCode: 200,
        headers: { 
          'content-type': 'application/json; charset=utf-8', 
          ...corsHeaders(ALLOWED_ORIGIN) 
        },
        body: JSON.stringify(responseData)
      };
    }

    // Mod 2: Funcționalitatea existentă pentru compatibilitate
    if (body.windSpeed !== undefined) {
      console.log('🔄 Fallback Mode triggered (old functionality)');
      const ws = Number(body.windSpeed);
      if (!Number.isFinite(ws) || ws <= 0) {
        console.log('❌ Fallback validation failed');
        return {
          statusCode: 400,
          headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
          body: JSON.stringify({ ok: false, error: 'windSpeed must be a positive number' })
        };
      }
    }

    const heading = body.heading ?? (body.windSpeed ? 'Weather Alert' : 'Notification');
    const content =
      body.content ??
      (body.windSpeed
        ? `Wind ${body.windSpeed} m/s${body.windGust ? `, gust ${body.windGust} m/s` : ''}`
        : 'Check the latest update');
    const url = body.url ?? 'https://wind.qub3.uk/';

    const resp = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${REST_KEY}`,
      },
      body: JSON.stringify({
        app_id: APP_ID,
        included_segments: ['Subscribed Users'],
        headings: { en: heading },
        contents: { en: content },
        url,
        data: {
          windSpeed: body.windSpeed,
          windGust: body.windGust,
          windDirection: body.windDirection,
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
        body: JSON.stringify({ ok: false, error: 'OneSignal error', data })
      };
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      body: JSON.stringify({ ok: true, data })
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      body: JSON.stringify({ ok: false, error: e?.message ?? 'Unknown error' })
    };
  }
};
