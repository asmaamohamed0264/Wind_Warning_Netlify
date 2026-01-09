/**
 * Debug Open-Meteo API Response
 * 
 * Investigăm de ce Open-Meteo returnează rafale de 93-119 km/h
 * când Ventusky (același ECMWF model) arată doar 7-11 km/h
 */

const BUCHAREST_LAT = 44.4268;
const BUCHAREST_LON = 26.1025;

async function debugOpenMeteo() {
  console.log('🔍 Debugging Open-Meteo API...\n');
  
  // Test 1: Current weather
  const currentUrl = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${BUCHAREST_LAT}&` +
    `longitude=${BUCHAREST_LON}&` +
    `current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&` +
    `timezone=Europe/Bucharest`;

  console.log('📡 Request URL:', currentUrl, '\n');

  const response = await fetch(currentUrl);
  const data = await response.json();

  console.log('📦 RAW API Response (current):');
  console.log(JSON.stringify(data.current, null, 2));
  console.log('\n');

  // Test 2: Hourly data (next 24h)
  const hourlyUrl = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${BUCHAREST_LAT}&` +
    `longitude=${BUCHAREST_LON}&` +
    `hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m&` +
    `timezone=Europe/Bucharest&` +
    `forecast_days=1`;

  const hourlyResponse = await fetch(hourlyUrl);
  const hourlyData = await hourlyResponse.json();

  console.log('📦 RAW API Response (hourly - first 8 hours):');
  for (let i = 0; i < 8; i++) {
    console.log(`${hourlyData.hourly.time[i]}: Wind ${hourlyData.hourly.wind_speed_10m[i]} m/s, Gust ${hourlyData.hourly.wind_gusts_10m[i]} m/s`);
  }
  console.log('\n');

  // Conversii
  console.log('🔄 CONVERSII (m/s → km/h):');
  console.log(`Current wind speed: ${data.current.wind_speed_10m} m/s = ${(data.current.wind_speed_10m * 3.6).toFixed(1)} km/h`);
  console.log(`Current wind gust:  ${data.current.wind_gusts_10m} m/s = ${(data.current.wind_gusts_10m * 3.6).toFixed(1)} km/h`);
  console.log('\n');

  // MAX values in next 24h
  const maxGust = Math.max(...hourlyData.hourly.wind_gusts_10m);
  const maxSpeed = Math.max(...hourlyData.hourly.wind_speed_10m);

  console.log('📊 MAXIMUMS (next 24h):');
  console.log(`MAX Wind Speed:  ${maxSpeed} m/s = ${(maxSpeed * 3.6).toFixed(1)} km/h`);
  console.log(`MAX Wind Gust:   ${maxGust} m/s = ${(maxGust * 3.6).toFixed(1)} km/h`);
  console.log('\n');

  // Compare with Ventusky values
  console.log('🆚 COMPARAȚIE cu Ventusky:');
  console.log('Ventusky current:  7 km/h');
  console.log(`Open-Meteo current: ${(data.current.wind_speed_10m * 3.6).toFixed(1)} km/h`);
  console.log('Ventusky max 24h:  11 km/h');
  console.log(`Open-Meteo max 24h: ${(maxSpeed * 3.6).toFixed(1)} km/h`);
  console.log('\n');

  // Diagnosis
  console.log('🔍 DIAGNOSTIC:');
  if (data.current.wind_gusts_10m > 25) {
    console.log('⚠️  WARNING: Open-Meteo returnează rafale > 25 m/s (90 km/h)');
    console.log('   Posibile cauze:');
    console.log('   1. Bug în API-ul Open-Meteo pentru regiunea București');
    console.log('   2. Date pentru altitudine diferită (nu ground level)');
    console.log('   3. Cache vechi sau date corupte');
  } else {
    console.log('✅ Valorile par corecte (< 25 m/s)');
  }
  console.log('\n');

  // Test 3: Check API metadata
  console.log('📋 API Metadata:');
  console.log(`Elevation: ${data.elevation}m`);
  console.log(`Timezone: ${data.timezone}`);
  console.log(`Lat/Lon: ${data.latitude}, ${data.longitude}`);
  console.log(`Generation time: ${data.generationtime_ms}ms`);
}

debugOpenMeteo().catch(console.error);
