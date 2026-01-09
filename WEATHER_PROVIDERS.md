# Weather Data Providers

## Overview

Aplicația folosește **multiple surse** de date meteo pentru precizie maximă și redundanță.

---

## 🎯 Provider Principal: **Open-Meteo (ECMWF)**

### De ce Open-Meteo?

- ✅ **GRATUIT** - 10,000+ requests/zi fără API key
- ✅ **ECMWF Model** - Același model folosit de Ventusky.com
- ✅ **Precizie ridicată** - European Centre for Medium-Range Weather Forecasts
- ✅ **Actualizări frecvente** - Hourly forecasts
- ✅ **Fără rate limiting** - Foarte generos pentru uz personal
- ✅ **Legal și stabil** - API oficial, open-source friendly

### Date furnizate:
- Temperatură (°C)
- Umiditate (%)
- Presiune atmosferică (hPa)
- Viteză vânt (km/h)
- Rafale vânt (km/h)
- Direcție vânt (grade)
- Prognoză hourly pentru următoarele 48h

### API Endpoint:
```
https://api.open-meteo.com/v1/forecast?
  latitude=44.4268&
  longitude=26.1025&
  current=temperature_2m,wind_speed_10m,wind_gusts_10m&
  hourly=temperature_2m,wind_speed_10m,wind_gusts_10m&
  timezone=Europe/Bucharest
```

**Documentație**: https://open-meteo.com/en/docs

---

## 🔄 Fallback Provider: **OpenWeatherMap**

### Când se folosește?

Open-Meteo este provider-ul principal. OpenWeatherMap se folosește **DOAR** dacă:
- Open-Meteo API este indisponibil (downtime)
- Open-Meteo returnează erori de validare
- Network timeout la Open-Meteo

### Date furnizate:
- Toate datele de la Open-Meteo
- Plus: Visibility (vizibilitate în metri)

### API Endpoints:
```
Current Weather:
https://api.openweathermap.org/data/2.5/weather?lat=44.4268&lon=26.1025&appid=YOUR_KEY&units=metric

5-Day Forecast:
https://api.openweathermap.org/data/2.5/forecast?lat=44.4268&lon=26.1025&appid=YOUR_KEY&units=metric
```

**API Key**: Configurat în `.env.local` → `OPENWEATHER_API_KEY`

**Limite**: 1,000 requests/day (free tier)

---

## 📊 Comparație Ventusky vs. Open-Meteo

| Metric | Ventusky (UI) | Open-Meteo (API) | Source |
|--------|--------------|------------------|--------|
| Model | ECMWF | ECMWF | Same |
| Update Frequency | Hourly | Hourly | Same |
| Forecast Range | 10 days | 7 days | Similar |
| Data Quality | High | High | Same |
| **Legal Status** | ❌ No API | ✅ Official API | - |
| **Cost** | - | FREE | - |

**Concluzie**: Open-Meteo oferă acces **LEGAL și GRATUIT** la aceleași date ECMWF ca Ventusky.

---

## 🔍 Detectarea Provider-ului în Răspunsuri

API-ul nostru `/api/weather` adaugă câmpul `provider` în răspuns:

```json
{
  "current": { ... },
  "forecast": [ ... ],
  "provider": "open-meteo"  // sau "openweather"
}
```

HTTP Headers:
- `X-Weather-Provider: open-meteo` (sau `openweather`)
- `X-Cache: HIT` sau `MISS`

---

## 🛠️ Implementare Tehnică

### Fallback Logic

```typescript
// 1. Încearcă Open-Meteo (primary)
try {
  data = await fetchOpenMeteoWeather();
  provider = 'open-meteo';
} catch (error) {
  console.warn('Open-Meteo failed, using OpenWeatherMap');
  
  // 2. Fallback la OpenWeatherMap
  data = await fetchOpenWeatherData(apiKey);
  provider = 'openweather';
}
```

### Caching

Ambii provideri folosesc **același cache in-memory** (120 secunde TTL):
- Reduce numărul de requests la API-uri upstream
- Îmbunătățește performance (< 10ms pentru cache hits)
- Economisește rate limits

---

## 🚀 Viitor: Provideri Adițional

### Weatherbit.io (AI deja cheia!)

```env
WEATHERBIT_API_KEY=82b8bca12b9248f38cada243e4c3647d
```

**Avantaje**:
- 500 requests/day free
- Foarte precis
- Hourly + Daily forecasts
- Air quality data

**Când să integrăm**: Dacă vrem:
- Date de calitate aer (AQI)
- Forecast mai lung (16 zile)
- Triple-redundancy

---

## 📝 Monitorizare și Logs

### Console Logs:

**Succes Open-Meteo**:
```
✅ Weather data fetched from Open-Meteo (ECMWF)
```

**Fallback OpenWeatherMap**:
```
⚠️ Open-Meteo failed, falling back to OpenWeatherMap: [error details]
✅ Weather data fetched from OpenWeatherMap (fallback)
```

**Total failure**:
```
❌ Error fetching weather data: All weather providers failed...
```

---

## 🎯 Best Practices

1. **Cache agresiv** - 2 minute cache reduce load-ul dramatic
2. **Fallback rapid** - Timeout 5 secunde pentru fiecare provider
3. **Validare Zod** - Toate răspunsurile validate cu schema-uri stricte
4. **Logging transparent** - Știm mereu care provider a fost folosit

---

## 🔗 Resurse

- **Open-Meteo**: https://open-meteo.com/
- **ECMWF**: https://www.ecmwf.int/
- **OpenWeatherMap**: https://openweathermap.org/api
- **Ventusky**: https://www.ventusky.com/ (doar referință UI)

---

**Ultima actualizare**: 9 Ianuarie 2026
