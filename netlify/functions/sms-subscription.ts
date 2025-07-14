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
      const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, ''); // Remove formatting
      
      // Romanian phone validation (more flexible)
      const romanianRegex = /^(\+40|0040|0)[72-79]\d{8}$/;
      
      // International validation (8-15 digits after country code)
      const internationalRegex = /^\+[1-9]\d{8,14}$/;
      
      const isValidRomanian = romanianRegex.test(cleanedPhone);
      const isValidInternational = internationalRegex.test(cleanedPhone);
      
      console.log('Server phone validation:', {
        original: phoneNumber,
        cleaned: cleanedPhone,
        isValidRomanian,
        isValidInternational
      });
      
      if (!isValidRomanian && !isValidInternational) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Formatul numărului de telefon nu este valid. Folosiți formatul românesc (+40XXXXXXXXX) sau internațional (+XXXXXXXXXXXX)' 
          }),
        };
      }

      // In a production environment, you would store this in a database (e.g., Supabase, FaunaDB)
      // For the MVP, we'll use environment variables and return success
      
      // Check if Twilio is configured
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        console.log(`SMS subscription request: ${cleanedPhone} (Twilio not configured)`);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Cererea de abonare SMS a fost primită. Veți fi notificat când serviciul va fi configurat.',
            phoneNumber: cleanedPhone,
            subscribedAt: new Date().toISOString(),
            note: 'Serviciul SMS va fi activat odată ce credențialele Twilio sunt configurate.'
          }),
        };
      }

      // Test Twilio connection with a welcome message
      try {
        const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);
        
        await twilio.messages.create({
          body: `🌪️ Bun venit la Monitor Vânt Aleea Someșul Cald!\n\nEști acum abonat la alertele SMS pentru condiții periculoase de vânt. Vei primi notificări când vânturile depășesc pragul tău.\n\nFii în siguranță!`,
          from: twilioPhoneNumber,
          to: cleanedPhone,
        });

        console.log(`SMS subscription successful: ${cleanedPhone}`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Abonare SMS reușită',
            phoneNumber: cleanedPhone,
            subscribedAt: new Date().toISOString(),
          }),
        };
      } catch (twilioError) {
        console.error('Twilio error:', twilioError);
        
        // More specific error handling
        let errorMessage = 'Numărul de telefon nu este valid sau serviciul SMS este temporar indisponibil.';
        
        if (twilioError.code === 21211) {
          errorMessage = 'Numărul de telefon nu este valid.';
        } else if (twilioError.code === 21614) {
          errorMessage = 'Numărul de telefon nu poate primi SMS-uri.';
        } else if (twilioError.message && twilioError.message.includes('phone number')) {
          errorMessage = 'Numărul de telefon nu este valid pentru serviciul SMS.';
        }
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: errorMessage }),
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