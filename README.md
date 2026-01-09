# Wind Warning Bucharest 🌪️

> Sistem proactiv de monitorizare și alertă timpurie pentru vânturi pe Aleea Someșul Cald, București

[![Next.js](https://img.shields.io/badge/Next.js-13.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3-38bdf8)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Funcționalități

### Core MVP
- ✅ **Monitorizare în timp real** - Condiții meteorologice actuale pentru București
- ✅ **Prognoză 8 ore** - Analiză proactivă a riscului de vânt
- ✅ **Sistem multi-nivel de alerte** - Normal, Caution, Warning, Danger
- ✅ **Praguri personalizabile** - Configurare limite viteză vânt
- ✅ **Notificări Push Browser** - Alerte instantanee
- ✅ **Alerte SMS** - Mesaje text via OneSignal
- ✅ **Alerte Email** - Notificări detaliate
- ✅ **Grafice interactive** - Vizualizare prognoză vânt
- ✅ **Design Responsiv** - Funcționează pe toate dispozitivele

### Îmbunătățiri Recente
- ✅ **State Management cu Context API** - Gestionare centralizată a stării
- ✅ **Rate Limiting** - Protecție împotriva spam-ului de API
- ✅ **Validare Runtime cu Zod** - Type safety complet
- ✅ **Error Boundary** - Recuperare elegantă din erori
- ✅ **React.memo** - Optimizări performance
- ✅ **Debounce Notificări** - Prevenire duplicate
- ✅ **Analytics Integration** - Tracking evenimente
- ✅ **Accessibility (A11y)** - ARIA labels și screen reader support
- ✅ **PWA Manifest** - Instalare ca aplicație
- ✅ **Security Hardening** - CSP, CORS, rate limiting

## 🛠️ Stack Tehnologic

### Frontend
- **Framework**: Next.js 13 (App Router)
- **Limbaj**: TypeScript 5.8
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Context API + useReducer
- **Validare**: Zod
- **Grafice**: Recharts
- **Icons**: Lucide React

### Backend
- **API Routes**: Next.js API Routes
- **Serverless**: Netlify Functions
- **Weather API**: OpenWeatherMap
- **Notificări**: OneSignal (Push, SMS, Email)
- **Rate Limiting**: In-memory (production: Redis/Upstash)

### DevOps
- **Deployment**: Netlify
- **CI/CD**: Netlify auto-deploy
- **Environment**: `.env.local` pentru development

## 📦 Instalare & Setup

### Prerequisite
```bash
Node.js 18+
npm sau yarn
```

### 1. Clone Repository
```bash
git clone https://github.com/asmaamohamed0264/Wind_Warning_Netlify.git
cd Wind_Warning_Netlify
```

### 2. Instalare Dependințe
```bash
npm install
```

### 3. Configurare Environment Variables
Creează `.env.local` în directorul root:

```env
# Weather API
OPENWEATHER_API_KEY=your_openweather_api_key

# OneSignal
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id
VITE_ONESIGNAL_API_KEY=your_onesignal_rest_api_key
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id

# Optional: Cache TTL (ms)
WEATHER_CACHE_TTL_MS=120000

# Optional: CORS
ALLOWED_ORIGIN=http://localhost:3000
```

### 4. Rulare Development Server
```bash
npm run dev
```

Deschide [http://localhost:3000](http://localhost:3000) în browser.

### 5. Build pentru Production
```bash
npm run build
npm run start
```

## 🧪 Testing

### Rulare Teste
```bash
# Watch mode
npm test

# CI mode
npm run test:ci

# Type checking
npm run type-check
```

### Coverage
```bash
npm test -- --coverage
```

Target coverage: 70% (branches, functions, lines, statements)

## 📊 Structura Proiectului

```
Wind_Warning_Netlify/
├── app/
│   ├── api/
│   │   ├── weather/          # Weather API route
│   │   └── send-alerts/      # Alerts API route
│   ├── layout.tsx            # Root layout cu providers
│   ├── page.tsx              # Homepage
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── WeatherDashboard.tsx  # Main dashboard
│   ├── AlertPanel.tsx        # Alert display
│   ├── ForecastChart.tsx     # Wind forecast chart
│   ├── NotificationSettings.tsx
│   ├── ThresholdControl.tsx
│   └── ErrorBoundary.tsx     # Error handling
├── lib/
│   ├── context/
│   │   └── WeatherContext.tsx # State management
│   ├── onesignal.ts          # OneSignal wrapper
│   ├── ratelimit.ts          # Rate limiting
│   ├── analytics.ts          # Analytics tracking
│   └── utils.ts              # Utility functions
├── types/
│   ├── weather.ts            # Weather types + Zod schemas
│   ├── alerts.ts             # Alert types + Zod schemas
│   └── notifications.ts      # Notification types
├── netlify/
│   └── functions/            # Netlify serverless functions
├── public/
│   ├── manifest.json         # PWA manifest
│   └── *.png                 # Icons & images
├── __tests__/                # Jest tests
├── .env.local                # Local environment variables
├── netlify.toml              # Netlify configuration
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Dependencies
```

## 🔒 Securitate

### Headers de Securitate
- ✅ **Content Security Policy (CSP)**
- ✅ **X-Frame-Options: DENY**
- ✅ **X-Content-Type-Options: nosniff**
- ✅ **Referrer-Policy: strict-origin-when-cross-origin**
- ✅ **Strict-Transport-Security**

### Rate Limiting
- API `/api/send-alerts`: 5 requests / minut / IP
- In-memory store (pentru production: Redis/Upstash)

### Validare
- Runtime validation cu Zod
- Input sanitization
- TypeScript strict mode

## 📈 Performance

### Core Web Vitals Targets
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### Optimizări
- ✅ React.memo pentru componente
- ✅ API caching (2 minute TTL)
- ✅ Lazy loading
- ✅ Image optimization
- ✅ Code splitting

## 🌐 Deployment

### Netlify
1. Connect repository la Netlify
2. Set environment variables în Netlify dashboard
3. Deploy automat la push pe `main` branch

### Build Settings
```toml
[build]
  command = "npm run build"
  publish = "out"
  functions = "netlify/functions"
```

## 🤝 Contributing

Contribuțiile sunt binevenite! Te rog:
1. Fork repository-ul
2. Creează branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push la branch (`git push origin feature/AmazingFeature`)
5. Deschide Pull Request

### Guidelines
- Urmează convenția de cod existentă
- Adaugă teste pentru funcționalități noi
- Actualizează documentația
- Rulează linter înainte de commit

## 🔧 OneSignal MCP Integration

Acest proiect folosește OneSignal MCP server pentru gestionarea notificărilor.

### Configurare MCP

Serverul MCP OneSignal este configurat în `.mcp/config.json` și poate fi utilizat direct din Cursor/Claude.

### Comenzi disponibile:

```bash
# Rulează serverul MCP OneSignal
npm run mcp:onesignal

# Testează notificări via API
curl -X POST http://localhost:3000/api/onesignal-test \
  -H "Content-Type: application/json" \
  -d '{"action":"send-test","level":"warning","windSpeed":60,"time":"14:30"}'

# Obține statistici aplicație
curl http://localhost:3000/api/onesignal-test
```

### Funcționalități MCP:

- 📤 **Trimitere notificări push** - Teste rapide ale notificărilor
- 📊 **Statistici aplicație** - Număr utilizatori abonați, rate de deschidere
- 👥 **Gestionare segmente** - Creează segmente pentru diferite zone/niveluri
- 📝 **Template-uri** - Șabloane reutilizabile pentru notificări
- 🔍 **Debugging** - Verifică livrarea notificărilor în timp real

### API Endpoints pentru Testing:

**POST `/api/onesignal-test`** - Trimite notificare test
```json
{
  "action": "send-test",
  "level": "warning",
  "windSpeed": 60,
  "time": "14:30"
}
```

**GET `/api/onesignal-test`** - Obține statistici aplicație

### Integrare în Workflow:

1. **Development**: Testează notificările rapid din Cursor
2. **Debugging**: Verifică dacă notificările sunt trimise corect
3. **Monitoring**: Monitorizează numărul de utilizatori abonați
4. **Segmentare**: Creează segmente pentru alerte targetate

## 📝 License

MIT License - Vezi [LICENSE](LICENSE) pentru detalii.

## 👤 Autor

**Bogdan pentru Loredana**

- GitHub: [@asmaamohamed0264](https://github.com/asmaamohamed0264)

## 🙏 Acknowledgments

- Weather data: [OpenWeatherMap](https://openweathermap.org/)
- Notifications: [OneSignal](https://onesignal.com/)
- UI Components: [shadcn/ui](https://ui.shadcn.com/)
- Icons: [Lucide](https://lucide.dev/)

## 📞 Support

Pentru probleme tehnice sau întrebări:
- Creează un [GitHub Issue](https://github.com/asmaamohamed0264/Wind_Warning_Netlify/issues)
- Pentru urgențe meteo: **112** sau **ANM** (Administrația Națională de Meteorologie)

---

**Stay informed, stay safe** 🌪️
