// netlify/functions/weather.ts
import type { Handler } from '@netlify/functions';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY!;
const WEATHER_CACHE_TTL_MS = Number(process.env.WEATHER_CACHE_TTL_MS ?? 120000);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

// Transformă răspunsul OpenWeather într-un format simplificat
function simplifyOneCall(data: any) {
  const cur = data.current ?? {};
  const w = (cur.weather && cur.weather[0]) || {};
  const current = {
    timestamp: new Date((cur.dt ?? Date.now()) * 1000).toISOString(),
    temperature: cur.temp,
    humidity: cur.humidity,
    pressure: cur.pressure,
    visibility: cur.visibility,
    windSpeed: cur.wind_speed,
    windGust: cur.wind_gust ?? cur.wind_speed,
    windDirection: cur.wind_deg,
    description: w.description,
    icon: w.icon,
  };

  // Luăm ~8 intrări din hourly, la ~3h (0,3,6,9,12,15,18,21)
  const hourly: any[] = Array.isArray(data.hourly) ? data.hourly : [];
  const forecast = hourly
    .filter((_, i) => i % 3 === 0) // din oră în oră -> din 3 în 3 ore
    .slice(0, 8)
    .map((h) => {
      const wh = (h.weather && h.weather[0]) || {};
      return {
        time: new Date((h.dt ?? Date.now()) * 1000).toISOString().replace('T', ' ').slice(0, 19),
        temperature: h.temp,
        windSpeed: h.wind_speed,
        windGust: h.wind_gust ?? h.wind_speed,
        windDirection: h.wind_deg,
        description: wh.description,
        icon: wh.icon,
      };
    });

  return { current, forecast };
}

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
}

export const handler: Handler = async (event) => {
  try {
    if (!OPENWEATHER_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
        body: JSON.stringify({ error: 'Missing OPENWEATHER_API_KEY' })
      };
    }

    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: corsHeaders(ALLOWED_ORIGIN)
      };
    }

    const p = event.queryStringParameters || {};
    const { lat, lon, q } = p;

    let url = '';
    if (lat && lon) {
      url =
        `https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lon)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    } else if (q) {
      // Dacă vine doar numele orașului, luăm /weather (current) și îl adaptăm minimal
      const cw =
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}` +
        `&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const r = await fetch(cw);
      if (!r.ok) {
        return {
          statusCode: 502,
          headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
          body: JSON.stringify({ error: 'Upstream error', status: r.status, body: await r.text() })
        };
      }
      const d = await r.json();
      const w = (d.weather && d.weather[0]) || {};
      const simplified = {
        current: {
          timestamp: new Date(((d.dt ?? Date.now()) as number) * 1000).toISOString(),
          temperature: d.main?.temp,
          humidity: d.main?.humidity,
          pressure: d.main?.pressure,
          visibility: d.visibility,
          windSpeed: d.wind?.speed,
          windGust: d.wind?.gust ?? d.wind?.speed,
          windDirection: d.wind?.deg,
          description: w.description,
          icon: w.icon,
        },
        forecast: [],
      };
      return {
        statusCode: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${Math.floor(WEATHER_CACHE_TTL_MS / 1000)}, s-maxage=${Math.floor(
            WEATHER_CACHE_TTL_MS / 1000
          )}`,
          ...corsHeaders(ALLOWED_ORIGIN),
        },
        body: JSON.stringify(simplified)
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
        body: JSON.stringify({ error: 'Missing query. Provide lat & lon or q (city name).' })
      };
    }

    const r = await fetch(url);
    if (!r.ok) {
      return {
        statusCode: 502,
        headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
        body: JSON.stringify({ error: 'Upstream error', status: r.status, body: await r.text() })
      };
    }

    const data = await r.json();
    const simplified = simplifyOneCall(data);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${Math.floor(WEATHER_CACHE_TTL_MS / 1000)}, s-maxage=${Math.floor(
          WEATHER_CACHE_TTL_MS / 1000
        )}`,
        ...corsHeaders(ALLOWED_ORIGIN),
      },
      body: JSON.stringify(simplified)
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...corsHeaders(ALLOWED_ORIGIN) },
      body: JSON.stringify({ error: err?.message ?? 'Unknown error' })
    };
  }
};
