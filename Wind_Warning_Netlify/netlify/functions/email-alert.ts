import type { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const {
    RESEND_API_KEY,
    EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME,
    EMAIL_SUBSCRIBERS,
  } = process.env;

  if (!RESEND_API_KEY || !EMAIL_FROM_ADDRESS || !EMAIL_FROM_NAME || !EMAIL_SUBSCRIBERS) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Email provider credentials are not configured.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { level, windSpeed, message } = body;

    if (!level || !windSpeed || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing alert data.' }) };
    }
    
    const resend = new Resend(RESEND_API_KEY);
    const subscribers = EMAIL_SUBSCRIBERS.split(',').map(email => email.trim());

    const getAlertEmoji = (level: string) => {
      switch (level) {
        case 'danger': return '🚨';
        case 'warning': return '⚠️';
        case 'caution': return '💨';
        default: return '🌪️';
      }
    };

    const getAlertColor = (level: string) => {
      switch (level) {
        case 'danger': return '#ef4444';
        case 'warning': return '#f59e0b';
        case 'caution': return '#f97316';
        default: return '#3b82f6';
      }
    };

    const alertColor = getAlertColor(level);
    const alertEmoji = getAlertEmoji(level);

    const emailPromises = subscribers.map(email => 
      resend.emails.send({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
        to: email,
        subject: `${alertEmoji} Alertă Vânt (${level.toUpperCase()}) - ${Math.round(windSpeed)} km/h`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Alertă Vânt - Monitor Vânt Aleea Someșul Cald</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">
                  ${alertEmoji} Monitor Vânt Aleea Someșul Cald
                </h1>
                <p style="color: #d1d5db; margin: 8px 0 0 0; font-size: 14px;">
                  Alertă de Vânt - Nivel ${level.toUpperCase()}
                </p>
              </div>
              
              <!-- Alert Banner -->
              <div style="background-color: ${alertColor}; color: #ffffff; padding: 16px; text-align: center;">
                <h2 style="margin: 0; font-size: 20px; font-weight: bold;">
                  ALERTĂ DE VÂNT ACTIVĂ
                </h2>
                <p style="margin: 8px 0 0 0; font-size: 16px;">
                  Viteza maximă prognozată: <strong>${Math.round(windSpeed)} km/h</strong>
                </p>
              </div>
              
              <!-- Content -->
              <div style="padding: 24px;">
                <div style="background-color: #f9fafb; border-left: 4px solid ${alertColor}; padding: 16px; margin-bottom: 20px; border-radius: 4px;">
                  <h3 style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">📍 Locația monitorizată:</h3>
                  <p style="margin: 0; color: #6b7280; font-size: 14px;">Aleea Someșul Cald, București</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                  <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px;">📢 Mesajul alertei:</h3>
                  <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                    ${message}
                  </p>
                </div>
                
                <!-- Safety Recommendations -->
                <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                  <h3 style="margin: 0 0 12px 0; color: #92400e; font-size: 16px;">🛡️ Recomandări de siguranță:</h3>
                  <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.5;">
                    ${level === 'danger' ? `
                      <li>Rămâi în interior și evită toate activitățile în aer liber</li>
                      <li>Fixează sau îndepărtează toate obiectele mobile din exterior</li>
                      <li>Evită conducerea, în special a vehiculelor înalte</li>
                      <li>Stai departe de ferestre și copaci</li>
                    ` : level === 'warning' ? `
                      <li>Exercită precauție extremă când ieși afară</li>
                      <li>Fixează obiectele mobile din curte</li>
                      <li>Evită mersul pe jos lângă copaci sau structuri înalte</li>
                      <li>Conduce cu atenție și fii conștient de vânturile laterale</li>
                    ` : `
                      <li>Fii atent la schimbările condițiilor de vânt</li>
                      <li>Fixează obiectele ușoare din exterior</li>
                      <li>Exercită precauție normală când ieși afară</li>
                    `}
                  </ul>
                </div>
                
                <!-- Alert Details -->
                <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6b7280; font-size: 14px;">Nivel de alertă:</span>
                    <span style="color: ${alertColor}; font-weight: bold; font-size: 14px; text-transform: uppercase;">${level}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #6b7280; font-size: 14px;">Viteza vântului:</span>
                    <span style="color: #374151; font-weight: bold; font-size: 14px;">${Math.round(windSpeed)} km/h</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #6b7280; font-size: 14px;">Ora alertei:</span>
                    <span style="color: #374151; font-weight: bold; font-size: 14px;">${new Date().toLocaleString('ro-RO')}</span>
                  </div>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                  Acest email a fost trimis automat de sistemul Monitor Vânt Aleea Someșul Cald
                </p>
                <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                  Pentru urgențe: 112 • Pentru modificarea setărilor de notificare, vizitați aplicația
                </p>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #3b82f6; font-size: 12px; font-weight: bold;">
                    ⚡ Powered by Bogdan pentru Loredana
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
      })
    );
    
    const results = await Promise.all(emailPromises);
    const successCount = results.filter(result => result.data).length;

    console.log(`Email alerts sent successfully to ${successCount}/${subscribers.length} subscribers`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: `Email alerts sent to ${successCount}/${subscribers.length} subscribers.`,
        details: results.map(result => ({
          success: !!result.data,
          id: result.data?.id || null,
          error: result.error || null
        }))
      }),
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending email alert:', errorMessage);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to send email alert.', details: errorMessage }),
    };
  }
};

export { handler };