import type { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    
    if (event.httpMethod === 'POST') {
      // Subscribe to SMS alerts
      const { phoneNumber } = body;
      
      if (!phoneNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Phone number is required' }),
        };
      }

      // Enhanced phone number validation for Romanian and international numbers
      const cleanPhone = phoneNumber.replace(/\s/g, '');
      const romanianRegex = /^(\+40|0040|0)[72-79]\d{8}$/;
      const internationalRegex = /^\+[1-9]\d{1,14}$/;
      
      if (!romanianRegex.test(cleanPhone) && !internationalRegex.test(cleanPhone)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid phone number format. Please use Romanian format (+40XXXXXXXXX) or international format (+XXXXXXXXXXXX)' 
          }),
        };
      }

      // In a production environment, you would store this in a database (e.g., Supabase, FaunaDB)
      // For the MVP, we'll use environment variables and return success
      
      // Check if Twilio is configured
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (!twilioAccountSid || !twilioAuthToken) {
        console.log(`SMS subscription request: ${cleanPhone} (Twilio not configured)`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'SMS subscription received. You will be notified when alerts are configured.',
            phoneNumber: cleanPhone,
            subscribedAt: new Date().toISOString(),
            note: 'SMS service will be activated once Twilio credentials are configured.'
          }),
        };
      }

      // Test Twilio connection with a welcome message
      try {
        const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
        
        await twilio.messages.create({
          body: `🌪️ Bun venit la Monitor Vânt Aleea Someșul Cald!\n\nEști acum abonat la alertele SMS pentru condiții periculoase de vânt. Vei primi notificări când vânturile depășesc pragul tău.\n\nFii în siguranță!`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: cleanPhone,
        });

        console.log(`SMS subscription successful: ${cleanPhone}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Successfully subscribed to SMS alerts',
            phoneNumber: cleanPhone,
            subscribedAt: new Date().toISOString(),
          }),
        };
      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid phone number or SMS service temporarily unavailable. Please check your number and try again.' 
          }),
        };
      }
    }

    if (event.httpMethod === 'DELETE') {
      // Unsubscribe from SMS alerts
      const { phoneNumber } = body;
      
      if (!phoneNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Phone number is required' }),
        };
      }

      const cleanPhone = phoneNumber.replace(/\s/g, '');

      // Send confirmation SMS if Twilio is configured
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (twilioAccountSid && twilioAuthToken) {
        try {
          const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
          
          await twilio.messages.create({
            body: `Ai fost dezabonat de la alertele SMS Monitor Vânt Aleea Someșul Cald. Nu vei mai primi notificări despre condițiile de vânt.\n\nTe poți reabona oricând pe site-ul nostru.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: cleanPhone,
          });
        } catch (error) {
          console.error('Failed to send unsubscription confirmation:', error);
          // Don't fail the unsubscription if SMS fails
        }
      }

      console.log(`SMS unsubscription: ${cleanPhone}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Successfully unsubscribed from SMS alerts',
          phoneNumber: cleanPhone,
          unsubscribedAt: new Date().toISOString(),
        }),
      };
    }

    if (event.httpMethod === 'GET') {
      // Get subscription status (for future use)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Serviciul de abonare SMS este activ',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('SMS subscription error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };