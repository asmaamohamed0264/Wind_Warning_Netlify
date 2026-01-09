/**
 * Validare Ajustare Urbană pentru București
 * 
 * Compară date Ventusky (copiate manual) cu Open-Meteo (ECMWF) + ajustare urbană
 * pentru a valida dacă factorul 0.3 e corect pentru zona Dense Urban București
 */

const BUCHAREST_LAT = 44.4268;
const BUCHAREST_LON = 26.1025;

// Factor CONSTANT Dense Urban București (validat empiric)
// Factor 0.1 = MAE 2.98 km/h (optimal)
// Factor dinamic 0.1/0.15 = MAE 3.28 km/h (mai slab)
const URBAN_FACTOR = 0.1; // CONSTANT pentru București (extrem de protejat)

// Date de referință de pe Ventusky (copiate manual de user)
// Source: https://www.ventusky.com/44.436;26.103#forecast (9 Ian 2026)
const ventuskyData = [
  { hour: '02:00', windKmh: 1.6, note: '1 mph' },
  { hour: '05:00', windKmh: 3.0, note: '3 km/h' },
  { hour: '08:00', windKmh: 3.0, note: '3 km/h' },
  { hour: '11:00', windKmh: 3.0, note: '3 km/h' },
  { hour: '14:00', windKmh: 1.6, note: '1 mph' },
  { hour: '17:00', windKmh: 4.8, note: '3 mph' },
  { hour: '20:00', windKmh: 11.0, note: '11 km/h' },
  { hour: '23:00', windKmh: 8.0, note: '8 km/h' }
];

// Colors pentru console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
};

async function fetchOpenMeteoHourly() {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${BUCHAREST_LAT}&` +
    `longitude=${BUCHAREST_LON}&` +
    `hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m&` +
    `timezone=Europe/Bucharest&` +
    `forecast_days=2`;

  console.log(`${colors.blue}📡 Fetching data from Open-Meteo API...${colors.reset}\n`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  return await response.json();
}

function findHourlyData(openMeteoData, targetHour) {
  // targetHour format: "02:00", "05:00", etc.
  const hourNum = parseInt(targetHour.split(':')[0], 10);
  
  // Căutăm în datele hourly
  for (let i = 0; i < openMeteoData.hourly.time.length; i++) {
    const timestamp = openMeteoData.hourly.time[i];
    const hour = new Date(timestamp).getHours();
    
    if (hour === hourNum) {
      return {
        windSpeedMs: openMeteoData.hourly.wind_speed_10m[i],
        windGustMs: openMeteoData.hourly.wind_gusts_10m[i],
        windDirection: openMeteoData.hourly.wind_direction_10m[i],
        timestamp: timestamp
      };
    }
  }
  
  return null;
}

function calculateStatistics(comparisons) {
  let totalError = 0;
  let matchCount = 0;
  const threshold = 2.0; // km/h

  comparisons.forEach(comp => {
    totalError += Math.abs(comp.delta);
    if (Math.abs(comp.delta) <= threshold) {
      matchCount++;
    }
  });

  const mae = totalError / comparisons.length;
  const matchRate = (matchCount / comparisons.length) * 100;

  return { mae, matchRate, matchCount, total: comparisons.length };
}

function findOptimalFactor(comparisons) {
  // Testăm factori între 0.1 și 0.5
  let bestFactor = 0.3;
  let bestMAE = Infinity;

  for (let factor = 0.1; factor <= 0.5; factor += 0.05) {
    let totalError = 0;
    
    comparisons.forEach(comp => {
      const adjustedWind = comp.rawWind * factor;
      const error = Math.abs(adjustedWind - comp.ventusky);
      totalError += error;
    });

    const mae = totalError / comparisons.length;
    
    if (mae < bestMAE) {
      bestMAE = mae;
      bestFactor = factor;
    }
  }

  return { factor: bestFactor, mae: bestMAE };
}

async function main() {
  console.log(`\n${colors.bold}${colors.blue}╔════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}║       VALIDARE AJUSTARE URBANĂ - București (Dense Urban)       ║${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}╚════════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // Fetch data de la Open-Meteo
    const openMeteoData = await fetchOpenMeteoHourly();
    
    console.log(`${colors.green}✓ Date primite de la Open-Meteo (ECMWF model)${colors.reset}\n`);
    console.log(`Timestamp: ${openMeteoData.hourly.time[0]} → ${openMeteoData.hourly.time[openMeteoData.hourly.time.length - 1]}\n`);
    console.log('═'.repeat(90));
    console.log('\n');

    // Tabel de comparație cu factor CONSTANT
    console.log(`${colors.bold}Ora   | Ventusky    | Open-Meteo RAW | Adjusted (×0.1) | Δ        | Status${colors.reset}`);
    console.log('─'.repeat(90));

    const comparisons = [];

    ventuskyData.forEach(vData => {
      const omData = findHourlyData(openMeteoData, vData.hour);
      
      if (!omData) {
        console.log(`${vData.hour} | ${vData.windKmh.toFixed(1).padStart(9)} km/h | ${colors.red}DATA NOT FOUND${colors.reset}`);
        return;
      }

      const rawWindKmh = omData.windSpeedMs * 3.6; // m/s to km/h
      const adjustedWindKmh = rawWindKmh * URBAN_FACTOR;
      const delta = adjustedWindKmh - vData.windKmh;
      const status = Math.abs(delta) <= 2.0 ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;

      comparisons.push({
        hour: vData.hour,
        ventusky: vData.windKmh,
        rawWind: rawWindKmh,
        adjusted: adjustedWindKmh,
        delta: delta
      });

      console.log(
        `${vData.hour} | ` +
        `${vData.windKmh.toFixed(1).padStart(9)} km/h | ` +
        `${rawWindKmh.toFixed(1).padStart(12)} km/h | ` +
        `${adjustedWindKmh.toFixed(1).padStart(13)} km/h | ` +
        `${(delta >= 0 ? '+' : '') + delta.toFixed(1).padStart(6)} km/h | ` +
        `${status}`
      );
    });

    console.log('\n' + '═'.repeat(90) + '\n');

    // Statistici
    const stats = calculateStatistics(comparisons);
    const optimal = findOptimalFactor(comparisons);

    console.log(`${colors.bold}${colors.green}📊 STATISTICI:${colors.reset}\n`);
    console.log(`Mean Absolute Error (MAE):     ${stats.mae.toFixed(2)} km/h`);
    console.log(`Match rate (Δ < 2 km/h):       ${stats.matchRate.toFixed(1)}% (${stats.matchCount}/${stats.total})`);
    console.log(`Factor CONSTANT folosit:       ${URBAN_FACTOR} (toate orele)`);
    console.log(`Factor optimal calculat:       ${optimal.factor.toFixed(2)} (MAE: ${optimal.mae.toFixed(2)} km/h)`);
    
    console.log('\n' + '═'.repeat(90) + '\n');

    // Recomandare
    console.log(`${colors.bold}${colors.yellow}💡 RECOMANDARE:${colors.reset}\n`);

    if (stats.mae <= 3.0 && stats.matchRate >= 50) {
      console.log(`${colors.green}✓ Factorul CONSTANT 0.1 funcționează EXCELENT!${colors.reset}`);
      console.log(`  - MAE sub 3 km/h (acceptabil pentru predicții)`);
      console.log(`  - Match rate peste 50%`);
      console.log(`  - Simplu, fără logică dinamică complexă\n`);
    } else if (stats.mae <= 5.0) {
      console.log(`${colors.yellow}⚠ Factorul 0.1 e OK, dar poate fi îmbunătățit${colors.reset}`);
      console.log(`  - Consideră ajustare la ${optimal.factor.toFixed(2)}`);
      console.log(`  - Diferență acceptabilă pentru predicții meteo\n`);
    } else {
      console.log(`${colors.red}⚠ Factorul 0.1 necesită recalibrare${colors.reset}`);
      console.log(`  - Recomandare: Ajustează la ${optimal.factor.toFixed(2)}`);
      console.log(`  - Îmbunătățire MAE: ${stats.mae.toFixed(2)} → ${optimal.mae.toFixed(2)} km/h`);
      console.log(`  - Posibile cauze: vânt neobișnuit, protecție diferită pe zone\n`);
    }

    // Context
    console.log(`${colors.bold}📍 CONTEXT:${colors.reset}\n`);
    console.log(`Locație:          Aleea Someșul Cald, București`);
    console.log(`Clasificare:      Dense Urban (clădiri înalte, străzi înguste)`);
    console.log(`Factor CONSTANT:  ${colors.green}${colors.bold}0.1${colors.reset} (toate orele)`);
    console.log(`                  Vânt la sol = 10% din vânt la 10m`);
    console.log(`                  București e EXTREM de protejat!`);
    console.log(`Date reference:   Ventusky (ECMWF model, stație meteo)`);
    console.log(`Date testate:     Open-Meteo (ECMWF model, 10m height)\n`);

    console.log('═'.repeat(90) + '\n');

  } catch (error) {
    console.error(`${colors.red}${colors.bold}❌ Eroare:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();
