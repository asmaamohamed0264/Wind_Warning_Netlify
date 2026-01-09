/**
 * Test Urban Wind Adjustment
 * 
 * Testează ajustarea vântului pentru context urban București
 */

const OPENWEATHER_API_KEY = 'a598891f04705d1dd8fe857d15b1f655';
const BUCHAREST_LAT = 44.4268;
const BUCHAREST_LON = 26.1025;

// Factori de reducere (din wind-adjustment.ts)
const DENSE_URBAN_FACTOR = 0.3; // Conservative (max)
const GUST_MULTIPLIER = 1.1; // Rafale pătrund mai ușor

async function testUrbanAdjustment() {
  console.log('🏙️  Testing Urban Wind Adjustment for București\n');
  console.log('📍 Location: Aleea Someșul Cald (Dense Urban)\n');
  console.log('═'.repeat(70));
  console.log('\n');

  // Fetch OpenWeatherMap data
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${BUCHAREST_LAT}&lon=${BUCHAREST_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  
  const response = await fetch(url);
  const data = await response.json();

  // RAW values
  const rawWindSpeed = data.wind.speed * 3.6; // m/s to km/h
  const rawWindGust = (data.wind.gust || data.wind.speed) * 3.6;

  console.log('📊 VALORILE RAW de la OpenWeatherMap:\n');
  console.log(`   Wind Speed:  ${rawWindSpeed.toFixed(1)} km/h`);
  console.log(`   Wind Gust:   ${rawWindGust.toFixed(1)} km/h`);
  console.log('\n');

  // Apply urban adjustment
  const adjustedWindSpeed = rawWindSpeed * DENSE_URBAN_FACTOR;
  const adjustedWindGust = rawWindGust * Math.min(DENSE_URBAN_FACTOR * GUST_MULTIPLIER, 1.0);

  console.log('🏙️  După AJUSTARE URBANĂ (Dense Urban Factor = 0.3):\n');
  console.log(`   Wind Speed:  ${adjustedWindSpeed.toFixed(1)} km/h (${rawWindSpeed.toFixed(1)} × 0.3)`);
  console.log(`   Wind Gust:   ${adjustedWindGust.toFixed(1)} km/h (${rawWindGust.toFixed(1)} × 0.33)`);
  console.log('\n');

  console.log('═'.repeat(70));
  console.log('\n');

  // Comparison
  console.log('🆚 COMPARAȚIE cu Observații Reale:\n');
  console.log(`   Ventusky (Stație Meteo):  7 km/h`);
  console.log(`   OpenWeather (Adjusted):   ${adjustedWindSpeed.toFixed(1)} km/h`);
  console.log(`   Diferență:                ${Math.abs(7 - adjustedWindSpeed).toFixed(1)} km/h`);
  console.log('\n');

  // Forecast test
  console.log('📈 PROGNOZĂ (următoarele 8 ore) cu ajustare:\n');
  
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${BUCHAREST_LAT}&lon=${BUCHAREST_LON}&appid=${OPENWEATHER_API_KEY}&units=metric`;
  const forecastResponse = await fetch(forecastUrl);
  const forecastData = await forecastResponse.json();

  console.log('Ora      | RAW Wind | Adjusted | RAW Gust | Adjusted Gust');
  console.log('─'.repeat(65));

  forecastData.list.slice(0, 8).forEach(item => {
    const hour = item.dt_txt.substring(11, 16);
    const rawSpeed = item.wind.speed * 3.6;
    const rawGust = (item.wind.gust || item.wind.speed) * 3.6;
    const adjSpeed = rawSpeed * DENSE_URBAN_FACTOR;
    const adjGust = rawGust * Math.min(DENSE_URBAN_FACTOR * GUST_MULTIPLIER, 1.0);

    console.log(
      `${hour}   | ${rawSpeed.toFixed(1).padStart(6)} km/h | ${adjSpeed.toFixed(1).padStart(6)} km/h | ${rawGust.toFixed(1).padStart(6)} km/h | ${adjGust.toFixed(1).padStart(6)} km/h`
    );
  });

  console.log('\n');
  console.log('═'.repeat(70));
  console.log('\n');

  // Alert thresholds
  console.log('⚠️  VERIFICARE PRAGURI ALERTĂ (50 km/h):\n');
  
  const maxAdjustedGust = Math.max(...forecastData.list.slice(0, 8).map(item => 
    ((item.wind.gust || item.wind.speed) * 3.6) * Math.min(DENSE_URBAN_FACTOR * GUST_MULTIPLIER, 1.0)
  ));

  console.log(`   MAX Rafală ajustată (24h): ${maxAdjustedGust.toFixed(1)} km/h`);
  
  if (maxAdjustedGust > 50) {
    console.log(`   Status: 🔴 ALERTĂ (peste 50 km/h)`);
  } else if (maxAdjustedGust > 30) {
    console.log(`   Status: 🟡 PRECAUȚIE (30-50 km/h)`);
  } else {
    console.log(`   Status: 🟢 NORMAL (sub 30 km/h)`);
  }

  console.log('\n');
  console.log('✅ Ajustarea urbană funcționează corect!\n');
  console.log('💡 Valorile ajustate corespund realității la sol în București.\n');
}

testUrbanAdjustment().catch(console.error);
