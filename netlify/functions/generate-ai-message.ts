// netlify/functions/generate-ai-message.ts
import type { Handler } from '@netlify/functions';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'deepseek/deepseek-chat-v3.1:free'; // DeepSeek v3.1 free, excelent pentru română
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
}

interface WindData {
  windSpeed: number;
  windGust: number;
  windDirection: number;
  location: string;
  alertLevel: 'normal' | 'caution' | 'warning' | 'danger';
  userThreshold: number;
  forecast?: Array<{
    time: string;
    windSpeed: number;
    windGust: number;
  }>;
}

async function generateAiMessage(data: WindData): Promise<string> {
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

  const prompt = `Ești un asistent meteo specializat în avertizări de vânt pentru România. Generează un mesaj scurt, clar și util pentru un utilizator din ${data.location}.

CONTEXT:
- Viteza vântului: ${data.windSpeed} km/h
- Rafale: ${data.windGust} km/h  
- Direcția vântului: ${getWindDirection(data.windDirection)}
- Pragul personal de alertă al utilizatorului: ${data.userThreshold} km/h
- Nivelul de alertă: ${getAlertLevelText(data.alertLevel)}
- Locația: ${data.location}

CERINȚE:
1. Mesajul să fie în română, scurt și direct
2. Să menționeze viteza vântului și că depășește pragul personal
3. Să includă un sfat de siguranță relevant pentru nivelul de alertă
4. Să fie adaptat pentru ${data.location}
5. Să fie util și practic, nu doar informativ
6. NU include în mesaj numărul de caractere sau lungimea textului

EXEMPLE DE SFATURI PE NIVEL:
- CAUTION: "Fixează obiectele ușoare din exterior"
- WARNING: "Evită zonele deschise și fixează obiectele mobile"  
- DANGER: "Rămâi în interior și evită toate activitățile în aer liber"

Generează un mesaj scurt pentru notificări push/SMS (sub 120 caractere), fără să menționezi lungimea.`

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
        max_tokens: 200,
        temperature: 0.7,
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

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(ALLOWED_ORIGIN)
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const windData: WindData = JSON.parse(event.body || '{}');

    // Validare input
    if (!windData.windSpeed || !windData.location || !windData.userThreshold) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
        body: JSON.stringify({ error: 'Missing required fields: windSpeed, location, userThreshold' })
      };
    }

    const aiMessage = await generateAiMessage(windData);

    return {
      statusCode: 200,
      headers: { 
        'content-type': 'application/json; charset=utf-8', 
        ...corsHeaders(ALLOWED_ORIGIN) 
      },
      body: JSON.stringify({ 
        success: true, 
        message: aiMessage,
        messageLength: aiMessage.length,
        data: {
          windSpeed: windData.windSpeed,
          windGust: windData.windGust,
          location: windData.location,
          alertLevel: windData.alertLevel,
          userThreshold: windData.userThreshold
        }
      })
    };

  } catch (error: any) {
    console.error('Error generating AI message:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      body: JSON.stringify({ 
        success: false, 
        error: error?.message ?? 'Unknown error' 
      })
    };
  }
};
