# Monitor Vânt - Aleea Someșul Cald

Aplicație web modernă pentru monitorizarea vântului și alerte personalizate în zona Aleea Someșul Cald, București.

## 🌪️ Funcționalități

- **Monitorizare în timp real** - Date meteo actualizate la 5 minute
- **Prognoză 8 ore** - Grafic interactiv cu viteza vântului și rafalele
- **Alerte personalizate** - Prag configurable (0-100 km/h)
- **Notificări multi-canal** - Email, SMS, Push Web, In-App
- **AI Messages** - Mesaje generate cu Mistral 7B prin OpenRouter
- **Dark Mode** - Interfață modernă și intuitivă
- **PWA Ready** - Instalabilă pe mobile și desktop

## 🚀 Deploy pe Vercel

### Pasul 1: Import Repository

1. Mergi la [vercel.com](https://vercel.com)
2. Click pe **"New Project"**
3. Import repository-ul din GitHub
4. Selectează **"alerta8h-vercel-v1"**

### Pasul 2: Configurează Environment Variables

În dashboard-ul Vercel, mergi la **Settings > Environment Variables** și adaugă:

```bash
# Location Configuration
LOCATION_LAT=44.4268
LOCATION_LNG=26.1025
LOCATION_NAME="Aleea Someșul Cald, București"

# Weather API Keys
OPENWEATHER_API_KEY=your_openweather_api_key_here
USE_MOCK_WEATHER=false

# Notification Services
RESEND_API_KEY=your_resend_api_key_here
RESEND_EMAIL_DOMAIN=your_domain.com

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_FROM=your_twilio_phone_number

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# AI Service
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Pasul 3: Configurează Cron Job

1. În dashboard-ul Vercel, mergi la **Functions**
2. Click pe **"Create Cron Job"**
3. Configurează:
   - **Schedule**: `*/5 * * * *` (la fiecare 5 minute)
   - **Endpoint**: `/api/cron`
   - **Method**: GET

### Pasul 4: Deploy

1. Click pe **"Deploy"**
2. Așteaptă ca build-ul să se termine
3. Testează aplicația la URL-ul generat

## 🔧 Servicii Externe Necesare

### 1. OpenWeatherMap API
- Mergi la [openweathermap.org](https://openweathermap.org/api)
- Creează cont gratuit
- Obține API key

### 2. Resend (Email)
- Mergi la [resend.com](https://resend.com)
- Creează cont
- Obține API key și configurează domeniul

### 3. Twilio (SMS)
- Mergi la [twilio.com](https://twilio.com)
- Creează cont
- Obține Account SID, Auth Token și număr de telefon

### 4. OpenRouter (AI)
- Mergi la [openrouter.ai](https://openrouter.ai)
- Creează cont
- Obține API key pentru Mistral 7B

### 5. Upstash Redis
- Mergi la [upstash.com](https://upstash.com)
- Creează cont
- Creează database Redis
- Obține URL și token

### 6. VAPID Keys (Web Push)
Generează VAPID keys local:

```bash
npx web-push generate-vapid-keys
```

## 📱 Testare

### 1. Testează Datele Meteo
- Verifică că se încarcă datele în timp real
- Testează graficul cu prognoza 8 ore

### 2. Testează Notificările
- **Email**: Configurează email și testează alerta
- **SMS**: Configurează telefon și testează alerta
- **Push**: Permite notificările în browser
- **In-App**: Verifică banner-ul de alertă

### 3. Testează Cron Job
- Verifică în Vercel Functions că cron job-ul rulează
- Verifică logurile pentru erori

## 🎨 Personalizare

### Logo și Favicon
Înlocuiește fișierele din `/public/icons/` cu logo-ul tău:
- `wind-icon-72.png`
- `wind-icon-192.png`
- `wind-icon-512.png`
- `favicon.ico`

### Culori și Stiluri
Modifică în `src/app/globals.css`:
- Culorile de risc (verde/galben/roșu)
- Gradient-ul vântului
- Efectele de sticlă

### Mesaje AI
Modifică în `src/lib/notifications/ai.ts`:
- Prompt-ul pentru generarea mesajelor
- Mesajele de fallback

## 🐛 Debugging

### Loguri Vercel
- Mergi la **Functions** în dashboard
- Click pe `/api/cron`
- Verifică logurile pentru erori

### Testare Locală
```bash
npm run dev
```

### Environment Variables
Verifică că toate variabilele sunt setate corect în Vercel.

## 📞 Suport

Pentru probleme sau întrebări:
- Verifică logurile Vercel
- Testează serviciile externe individual
- Verifică configurația cron job-ului

---

**Construit cu ❤️ de Bogdan pentru Loredana**

🌍 Pentru siguranța și liniștea sufletească în zona Grand Arena, București