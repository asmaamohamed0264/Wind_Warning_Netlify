import { Handler } from '@netlify/functions';

const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Twilio credentials not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { level, windSpeed, time, message } = body;

    // Get SMS subscribers from environment variable or database
    // For MVP, we'll use a simple environment variable approach
    const subscribers = process.env.SMS_SUBSCRIBERS?.split(',') || [];

    if (subscribers.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'No SMS subscribers found' }),
      };
    }

    // Initialize Twilio client
    const twilio = require('twilio')(twilioAccountSid, twilioAuthToken);

    const smsPromises = subscribers.map(async (phoneNumber: string) => {
      const cleanPhoneNumber = phoneNumber.trim();
      if (!cleanPhoneNumber) return null;

      try {
        const smsMessage = await twilio.messages.create({
          body: `🌪️ WIND ALERT - ${level.toUpperCase()}\n\n${message}\n\nWind Warning Bucharest`,
          from: twilioPhoneNumber,
          to: cleanPhoneNumber,
        });

        return {
          phoneNumber: cleanPhoneNumber,
          messageSid: smsMessage.sid,
          success: true,
        };
      } catch (error) {
        console.error(`Failed to send SMS to ${cleanPhoneNumber}:`, error);
        return {
          phoneNumber: cleanPhoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        };
      }
    });

    const results = await Promise.all(smsPromises);
    const successfulSends = results.filter(result => result && result.success).length;
    const failedSends = results.filter(result => result && !result.success).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'SMS alerts processed',
        totalSubscribers: subscribers.length,
        successfulSends,
        failedSends,
        results: results.filter(Boolean),
      }),
    };
  } catch (error) {
    console.error('Error sending SMS alerts:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send SMS alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };