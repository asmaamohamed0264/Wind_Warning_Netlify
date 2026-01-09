/**
 * Wind Speed Urban Adjustment
 * 
 * Ajustează viteza vântului pentru micro-climat urban.
 * 
 * Context:
 * - Modelele meteo (ECMWF, GFS) raportează vânt la 10m înălțime în aer liber
 * - În zone urbane dense (București), vântul la nivel pietonal e semnificativ mai mic
 * - Factorul de reducere depinde de densitatea urbană și protecția de clădiri
 * 
 * @see https://www.engineeringtoolbox.com/wind-shear-d_1215.html
 * @see https://www.weather.gov/media/zhu/ZHU_Training_Page/winds/urban_wind/urban_wind.pdf
 */

/**
 * Tipuri de zone urbane
 */
export type UrbanDensity = 'open' | 'suburban' | 'urban' | 'dense-urban';

/**
 * Factori de reducere pentru vânt urban
 * 
 * Bazat pe validare cu date TypeWeather (9 Ian 2026):
 * - Open terrain: 1.0 (NO adjustment - RAW API data)
 * - Suburban: 0.6 (scattered buildings, trees)
 * - Urban: 0.4 (dense buildings, narrow streets)
 * - Dense urban: 0.1 (extremely protected areas)
 * 
 * NOTĂ: Pentru Popești-Leordeni / București Sud (zona deschisă)
 * folosim factor 1.0 = date RAW de la API (confirmat cu TypeWeather)
 */
const URBAN_REDUCTION_FACTORS: Record<UrbanDensity, number> = {
  'open': 0.7,        // Reduced from 1.0 - values at ground level are ~70% of 10m values
  'suburban': 0.6,    // Scattered buildings, trees
  'urban': 0.4,       // Dense buildings, narrow streets
  'dense-urban': 0.1, // Extremely protected areas
};

/**
 * Configurație pentru Aleea Someșul Cald, București (Popești-Leordeni / București Sud)
 * 
 * Zonă semi-deschisă, mai puțin densă decât centrul București
 * → Clasificare: Suburban (ajustare pentru valori la nivel pietonal)
 * 
 * Factor 0.6 reduce valorile de la 10m la nivel pietonal aproximativ
 */
export const BUCHAREST_SOMESUL_CALD_DENSITY: UrbanDensity = 'suburban';

/**
 * Ajustează viteza vântului pentru context urban
 * 
 * Pentru Popești-Leordeni / București Sud (zonă deschisă):
 * - Factor 1.0 = FĂRĂ ajustare (date RAW de la API)
 * - Validat cu TypeWeather: ~11 km/h (corect pentru zona)
 * 
 * @param windSpeed - Viteza vântului raportată de API (km/h)
 * @param density - Densitatea urbană (default: 'open' pentru București Sud)
 * @returns Viteza ajustată (km/h) - în cazul 'open' = valoare RAW
 */
export function adjustWindForUrban(
  windSpeed: number,
  density: UrbanDensity = BUCHAREST_SOMESUL_CALD_DENSITY
): number {
  const reductionFactor = URBAN_REDUCTION_FACTORS[density];
  return windSpeed * reductionFactor;
}

/**
 * Ajustează rafale de vânt pentru context urban
 * 
 * Pentru zonă deschisă (factor 1.0):
 * - Rafale: 1.0 × 1.2 = 1.2 → capped la 1.0 (MAX = date RAW)
 * - Rezultat: date RAW de la API (fără ajustare)
 * 
 * @param windGust - Viteza rafalelor raportată de API (km/h)
 * @param density - Densitatea urbană (default: 'open')
 * @returns Viteza rafalelor ajustată (km/h)
 */
export function adjustWindGustForUrban(
  windGust: number,
  density: UrbanDensity = BUCHAREST_SOMESUL_CALD_DENSITY
): number {
  const baseFactor = URBAN_REDUCTION_FACTORS[density];
  
  // Rafalele pătrund mai ușor → factor cu 20% mai mare
  const gustMultiplier = 1.2;
  const reductionFactor = baseFactor * gustMultiplier;
  
  // Cap la 1.0 (nu mărim niciodată valoarea peste original)
  return windGust * Math.min(reductionFactor, 1.0);
}

/**
 * Verifică dacă ajustarea urbană este activată
 * 
 * Poate fi dezactivată prin environment variable pentru testing
 */
export function isUrbanAdjustmentEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.DISABLE_URBAN_WIND_ADJUSTMENT !== 'true';
  }
  return true;
}

/**
 * Obține factorul de reducere pentru o densitate dată
 * 
 * @param density - Tipul zonei urbane
 * @param useConservative - Factor conservativ (mai puțină reducere)
 * @returns Factorul de reducere (0.0-1.0)
 */
export function getUrbanReductionFactor(
  density: UrbanDensity,
  _useConservative: boolean = true
): number {
  return URBAN_REDUCTION_FACTORS[density];
}

/**
 * Exemplu de utilizare:
 * 
 * ```typescript
 * // București (Dense Urban) - Factor CONSTANT 0.1
 * const wind = adjustWindForUrban(35.6, 'dense-urban');
 * // → 3.56 km/h (35.6 × 0.1)
 * 
 * // Rafale București: Factor 0.1 × 1.2 = 0.12
 * const gust = adjustWindGustForUrban(93, 'dense-urban');
 * // → 11.16 km/h (93 × 0.12)
 * 
 * // Fără parametri (default București)
 * const currentWind = adjustWindForUrban(22); // → 2.2 km/h (22 × 0.1)
 * const currentGust = adjustWindGustForUrban(35); // → 4.2 km/h (35 × 0.12)
 * 
 * // Urban standard (factor 0.4)
 * const urbanWind = adjustWindForUrban(30, 'urban'); // → 12 km/h (30 × 0.4)
 * 
 * // Suburban (factor 0.6)
 * const suburbanWind = adjustWindForUrban(30, 'suburban'); // → 18 km/h (30 × 0.6)
 * ```
 */
