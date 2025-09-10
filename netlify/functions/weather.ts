// netlify/functions/weather.ts
import type { Handler } from '@netlify/functions';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY!;
const WEATHER_CACHE_TTL_MS = Number(process.env.WEATHER_CACHE_TTL_MS ?? 120000); // 2 min default
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'; // tu ai https://wind.qub3.uk/

export const handler: Handler = async (event) => {
  try {
    if (!OPENWEATHER_API_KEY) {
      return json({ error: 'Missing OPENWEATHER_API_KEY' }, 500);
    }

    // CORS preflight (dacă e chemată direct din browser)
    if (event.httpMethod === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(ALLOWED_ORIGIN),
      });
    }

    const p = event.queryStringParameters || {};
    const { lat, lon, q } = p;

    let url: string;
    if (lat && lon) {
      // One Call 3.0 – current + hourly/daily (în funcție de plan)
      url =
        `https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lon)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    } else if (q) {
      // Current by city name – fallback
      url =
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}` +
        `&units=metric&appid=${OPENWEATHER_API_KEY}`;
    } else {
      return json({ error: 'Missing query. Provide lat & lon or q (city name).' }, 400);
    }

    const r = await fetch(url);
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: 'Upstream error', status: r.status, body: t }), {
        status: 502,
        headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(ALLOWED_ORIGIN) },
      });
    }

    const data = await r.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': `public, max-age=${Math.floor(WEATHER_CACHE_TTL_MS / 1000)}, s-maxage=${Math.floor(
          WEATHER_CACHE_TTL_MS / 1000
        )}`,
        ...corsHeaders(ALLOWED_ORIGIN),
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Unknown error' }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(ALLOWED_ORIGIN) },
    });
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(ALLOWED_ORIGIN) },
  });
}

function corsHeaders(origin: string) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
}
