/**
 * Weather Providers Comparison Script
 * 
 * Compară datele meteo de la:
 * - Open-Meteo (ECMWF) - FREE
 * - OpenWeatherMap - Existing API key
 * - Weatherbit.io - Existing API key
 * 
 * Usage: node scripts/compare-providers.js
 */

const BUCHAREST_LAT = 44.4268;
const BUCHAREST_LON = 26.1025;

// API Keys (din .env.local)
const OPENWEATHER_API_KEY = 'a598891f04705d1dd8fe857d15b1f655';
const WEATHERBIT_API_KEY = '82b8bca12b9248f38cada243e4c3647d';

// Colors pentru console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

async function fetchOpenMeteo() {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${BUCHAREST_LAT}&` +
    `longitude=${BUCHAREST_LON}&` +
    `current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m&` +
    `hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m&` +
    `timezone=Europe/Bucharest&` +
    `forecast_days=1`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Open-Meteo: ${response.status}`);
  
  const data = await response.json();
  
  return {
    provider: 'Open-Meteo (ECMWF)',
    timestamp: data.current.time,
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.pressure_msl,
    windSpeed: data.current.wind_speed_10m * 3.6, // m/s to km/h
    windGust: data.current.wind_gusts_10m * 3.6,
    windDirection: data.current.wind_direction_10m,
    maxWindNext24h: Math.max(...data.hourly.wind_gusts_10m.map(g => g * 3.6)),
    forecast: data.hourly.wind_gusts_10m.slice(0, 8).map((gust, i) => ({
      hour: data.hourly.time[i],
      windSpeed: data.hourly.wind_speed_10m[i] * 3.6,
      windGust: gust * 3.6,
    })),
  };
}

async function fetchOpenWeather() {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?` +
    `lat=${BUCHAREST_LAT}&` +
    `lon=${BUCHAREST_LON}&` +
    `appid=${OPENWEATHER_API_KEY}&` +
    `units=metric`;

  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?` +
    `lat=${BUCHAREST_LAT}&` +
    `lon=${BUCHAREST_LON}&` +
    `appid=${OPENWEATHER_API_KEY}&` +
    `units=metric`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);

  if (!currentRes.ok) throw new Error(`OpenWeather: ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`OpenWeather Forecast: ${forecastRes.status}`);

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  const windGusts = forecast.list.slice(0, 8).map(item => 
    (item.wind.gust || item.wind.speed) * 3.6
  );

  return {
    provider: 'OpenWeatherMap',
    timestamp: new Date().toISOString(),
    temperature: current.main.temp,
    humidity: current.main.humidity,
    pressure: current.main.pressure,
    windSpeed: current.wind.speed * 3.6,
    windGust: (current.wind.gust || current.wind.speed) * 3.6,
    windDirection: current.wind.deg || 0,
    maxWindNext24h: Math.max(...windGusts),
    forecast: forecast.list.slice(0, 8).map(item => ({
      hour: item.dt_txt,
      windSpeed: item.wind.speed * 3.6,
      windGust: (item.wind.gust || item.wind.speed) * 3.6,
    })),
  };
}

async function fetchWeatherbit() {
  const currentUrl = `https://api.weatherbit.io/v2.0/current?` +
    `lat=${BUCHAREST_LAT}&` +
    `lon=${BUCHAREST_LON}&` +
    `key=${WEATHERBIT_API_KEY}`;

  const forecastUrl = `https://api.weatherbit.io/v2.0/forecast/hourly?` +
    `lat=${BUCHAREST_LAT}&` +
    `lon=${BUCHAREST_LON}&` +
    `key=${WEATHERBIT_API_KEY}&` +
    `hours=24`;

  const [currentRes, forecastRes] = await Promise.all([
    fetch(currentUrl),
    fetch(forecastUrl),
  ]);

  if (!currentRes.ok) throw new Error(`Weatherbit: ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`Weatherbit Forecast: ${forecastRes.status}`);

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  const currentData = current.data[0];
  const windGusts = forecast.data.slice(0, 8).map(item => 
    item.gust_spd * 3.6
  );

  return {
    provider: 'Weatherbit.io',
    timestamp: currentData.ob_time,
    temperature: currentData.temp,
    humidity: currentData.rh,
    pressure: currentData.pres,
    windSpeed: currentData.wind_spd * 3.6,
    windGust: currentData.gust * 3.6,
    windDirection: currentData.wind_dir,
    maxWindNext24h: Math.max(...windGusts),
    forecast: forecast.data.slice(0, 8).map(item => ({
      hour: item.timestamp_local,
      windSpeed: item.wind_spd * 3.6,
      windGust: item.gust_spd * 3.6,
    })),
  };
}

function printTable(data) {
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║          COMPARAȚIE PROVIDERI METEO - BUCUREȘTI          ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const metrics = [
    { key: 'provider', label: 'Provider', unit: '' },
    { key: 'timestamp', label: 'Timestamp', unit: '', format: (v) => v.substring(0, 16) },
    { key: 'temperature', label: 'Temperatură', unit: '°C', format: (v) => v.toFixed(1) },
    { key: 'humidity', label: 'Umiditate', unit: '%', format: (v) => v.toFixed(0) },
    { key: 'pressure', label: 'Presiune', unit: 'hPa', format: (v) => v.toFixed(1) },
    { key: 'windSpeed', label: 'Vânt sustained', unit: 'km/h', format: (v) => v.toFixed(1) },
    { key: 'windGust', label: 'Rafale acum', unit: 'km/h', format: (v) => v.toFixed(1), highlight: true },
    { key: 'windDirection', label: 'Direcție vânt', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'maxWindNext24h', label: 'MAX Rafale (24h)', unit: 'km/h', format: (v) => v.toFixed(1), highlight: true },
  ];

  // Header
  const headers = data.map(d => d.provider.split(' ')[0].padEnd(15)).join(' | ');
  console.log(`${colors.bold}${'Metric'.padEnd(20)} | ${headers}${colors.reset}`);
  console.log('─'.repeat(20 + data.length * 18));

  // Rows
  metrics.forEach(metric => {
    const values = data.map(d => {
      let value = d[metric.key];
      if (metric.format) value = metric.format(value);
      else if (typeof value === 'number') value = value.toFixed(1);
      return value ? value.toString() : 'N/A';
    });

    const color = metric.highlight ? colors.yellow : colors.reset;
    const label = `${metric.label}${metric.unit ? ` (${metric.unit})` : ''}`;
    
    const row = values.map(v => v.padEnd(15)).join(' | ');
    console.log(`${color}${label.padEnd(20)}${colors.reset} | ${row}`);
  });

  console.log('\n' + '─'.repeat(20 + data.length * 18));
  
  // Analysis
  console.log(`\n${colors.bold}${colors.green}📊 ANALIZĂ COMPARATIVĂ:${colors.reset}\n`);
  
  const winds = data.map(d => d.windGust);
  const maxWindIdx = winds.indexOf(Math.max(...winds));
  const minWindIdx = winds.indexOf(Math.min(...winds));
  
  console.log(`${colors.yellow}⚠️  Cel mai MARE vânt detectat:${colors.reset} ${data[maxWindIdx].provider} → ${winds[maxWindIdx].toFixed(1)} km/h`);
  console.log(`${colors.green}✓  Cel mai MIC vânt detectat:${colors.reset} ${data[minWindIdx].provider} → ${winds[minWindIdx].toFixed(1)} km/h`);
  
  const windDiff = Math.max(...winds) - Math.min(...winds);
  console.log(`${colors.red}Δ  Diferență între provideri:${colors.reset} ${windDiff.toFixed(1)} km/h (${((windDiff / Math.max(...winds)) * 100).toFixed(0)}%)`);
  
  // Max wind in next 24h
  const maxWinds24h = data.map(d => d.maxWindNext24h);
  const maxWind24hIdx = maxWinds24h.indexOf(Math.max(...maxWinds24h));
  
  console.log(`\n${colors.bold}${colors.red}🚨 ALERTĂ VÂNT (următoarele 24h):${colors.reset}`);
  console.log(`   ${data[maxWind24hIdx].provider} prevede rafale MAX de ${colors.bold}${colors.red}${maxWinds24h[maxWind24hIdx].toFixed(1)} km/h${colors.reset}`);
  
  // Threshold check
  const THRESHOLD = 50; // km/h
  const dangerous = maxWinds24h.filter(w => w > THRESHOLD);
  if (dangerous.length > 0) {
    console.log(`\n${colors.red}${colors.bold}⚠️  ${dangerous.length} provider(i) prevăd vânturi PESTE ${THRESHOLD} km/h!${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✓  Toate prognozele sub ${THRESHOLD} km/h (Normal)${colors.reset}`);
  }

  console.log('\n' + '═'.repeat(20 + data.length * 18) + '\n');
}

function printForecastComparison(data) {
  console.log(`${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║              PROGNOZĂ VÂNT - URMĂTOARELE 24h (rafale)              ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  const validForecasts = data.filter(d => d.forecast && d.forecast.length > 0);
  if (validForecasts.length === 0) {
    console.log(`${colors.red}Nicio prognoză disponibilă${colors.reset}\n`);
    return;
  }

  const maxLength = Math.max(...validForecasts.map(d => d.forecast.length));
  
  for (let i = 0; i < Math.min(maxLength, 8); i++) {
    const forecasts = validForecasts.map(d => d.forecast[i]);
    const hour = forecasts[0] ? forecasts[0].hour.substring(11, 16) : 'N/A';
    
    console.log(`${colors.bold}Ora ${hour}:${colors.reset}`);
    
    validForecasts.forEach((provider, idx) => {
      const forecast = forecasts[idx];
      const gustValue = (forecast?.windGust || 0).toFixed(1).padStart(6);
      console.log(`  ${provider.provider.padEnd(20)}: ${gustValue} km/h`);
    });
    console.log('');
  }

  console.log('═'.repeat(85) + '\n');
}

async function main() {
  console.log(`\n${colors.bold}🌍 Fetching weather data from all providers...${colors.reset}\n`);

  try {
    const [openMeteo, openWeather, weatherbit] = await Promise.all([
      fetchOpenMeteo().catch(err => ({ provider: 'Open-Meteo', error: err.message })),
      fetchOpenWeather().catch(err => ({ provider: 'OpenWeatherMap', error: err.message })),
      fetchWeatherbit().catch(err => ({ provider: 'Weatherbit', error: err.message })),
    ]);

    // Check for errors
    const errors = [openMeteo, openWeather, weatherbit].filter(d => d.error);
    if (errors.length > 0) {
      console.log(`${colors.red}${colors.bold}⚠️  ERORI:${colors.reset}`);
      errors.forEach(e => console.log(`   ${e.provider}: ${e.error}`));
      console.log('');
    }

    const validData = [openMeteo, openWeather, weatherbit].filter(d => !d.error);

    if (validData.length === 0) {
      console.log(`${colors.red}${colors.bold}❌ Toate providerele au eșuat!${colors.reset}\n`);
      return;
    }

    if (validData.length < 3) {
      console.log(`${colors.yellow}⚠️  Doar ${validData.length}/3 provideri disponibili${colors.reset}\n`);
    }

    printTable(validData);
    printForecastComparison(validData);

    // Recommendation
    console.log(`${colors.bold}${colors.green}💡 RECOMANDARE:${colors.reset}\n`);
    console.log(`   1. ${colors.bold}Open-Meteo${colors.reset}: FREE, ECMWF model, cel mai precis pentru Europa`);
    console.log(`   2. ${colors.bold}Weatherbit${colors.reset}: 500 req/day, date foarte precise, include AQI`);
    console.log(`   3. ${colors.bold}OpenWeatherMap${colors.reset}: Fallback OK, dar underreports wind gusts\n`);

  } catch (error) {
    console.error(`${colors.red}${colors.bold}❌ Eroare:${colors.reset}`, error.message);
  }
}

main();
