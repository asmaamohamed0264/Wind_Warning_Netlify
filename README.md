# Wind Warning Bucharest 🌪️

A production-ready wind monitoring and early warning system for Bucharest, Romania. Built with Next.js and deployed on Netlify with serverless functions. Notifications (Push, SMS, Email) are unified via OneSignal.

## 🚀 Features

### Core Functionality (MVP)
- ✅ **Real-time Wind Monitoring** - Current conditions for Bucharest
- ✅ **8-Hour Forecast Analysis** - Proactive wind risk detection
- ✅ **Multi-level Alert System** - Normal, Caution, Warning, Danger levels
- ✅ **Custom Alert Thresholds** - User-configurable wind speed limits
- ✅ **Browser Push Notifications** - Instant alerts in your browser
- ✅ **SMS Alert System** - Text message notifications via Twilio
- ✅ **Interactive Forecast Chart** - Visual wind speed predictions
- ✅ **Responsive Design** - Works on all devices

### Technical Highlights
- ⚡ **Next.js 13** with App Router and SSG optimization
- 🔧 **Netlify Functions** for serverless API endpoints
- 🎨 **Tailwind CSS** with shadcn/ui components
- 📊 **Recharts** for data visualization
- 🔔 **Unified Notifications** with OneSignal (Push, SMS, Email)
- 🌡️ **OpenWeatherMap API** for weather data
- 💾 **Local Storage** for user preferences

## 🛠️ Setup & Deployment

### Prerequisites
- Node.js 18+ 
- Netlify account
- OpenWeatherMap API key
- OneSignal account (App ID + REST API Key)

### Environment Variables

Set these environment variables in your Netlify site settings (All contexts):

```bash
# Weather API (server)
OPENWEATHER_API_KEY=your_openweather_api_key
# Optional: Server-side cache TTL for weather (ms)
WEATHER_CACHE_TTL_MS=120000

# OneSignal (server)
VITE_ONESIGNAL_API_KEY=your_onesignal_rest_api_key
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id

# OneSignal (client)
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id

# CORS for send-alerts function (optional, default "*")
ALLOWED_ORIGIN=https://your-live-domain.example

# Site URL used in notifications (optional)
URL=https://your-live-domain.example
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Netlify Deployment

1. **Connect Repository**: Link your Git repository to Netlify
2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `out`
3. **Set Environment Variables**: Add the variables listed above
4. **Deploy**: Push to main branch for automatic deployment

### Notifications (OneSignal)

1. Create a OneSignal app and copy the App ID and REST API Key.
2. Add `VITE_ONESIGNAL_APP_ID`, `VITE_ONESIGNAL_API_KEY` and `NEXT_PUBLIC_ONESIGNAL_APP_ID` to Netlify env vars.
3. In the UI (Settings → Notifications), enable "Notificări Push Browser" to subscribe and grant permission.
4. Use the "Trimite Notificare de Test" button to validate delivery.
5. Optional: configure Email and SMS via OneSignal in the same settings panel.

## 📡 API Endpoints

### Weather Data
```
GET /api/weather
```
Returns current weather and 8 data points (24h) forecast for Bucharest.

### Send Alerts (OneSignal)
```
POST /api/send-alerts
Body: {
  "level": "caution" | "warning" | "danger" | "normal" (optional),
  "windSpeed": number,  # km/h
  "time": string,       # ISO timestamp
  "message": string     # custom message (optional)
}
```
Note: `/api/send-alerts` is redirected to the Netlify function `send-alerts-onesignal`.

## 🎯 User Guide

### Getting Started
1. **Visit the Application** - Open windwarning.ro
2. **Set Alert Threshold** - Adjust the wind speed slider (20-100 km/h)
3. **Enable Notifications**:
   - **Browser**: Toggle push notifications and grant permission
   - **SMS**: Enter your phone number and subscribe

### Understanding Alerts

| Level | Wind Speed | Color | Action |
|-------|------------|--------|---------|
| Normal | Below threshold | 🟢 Green | No action needed |
| Caution | Threshold exceeded | 🟡 Yellow | Be aware |
| Warning | 1.2x threshold | 🟠 Orange | Exercise caution |
| Danger | 1.5x threshold | 🔴 Red | Stay indoors |

### Safety Recommendations

**🟡 Caution Level:**
- Be aware of changing wind conditions
- Secure lightweight outdoor items

**🟠 Warning Level:**
- Exercise extreme caution when outdoors
- Avoid walking near trees or tall structures
- Drive carefully and be aware of crosswinds

**🔴 Danger Level:**
- Stay indoors and avoid all outdoor activities
- Secure or remove all loose outdoor objects
- Avoid driving, especially high-profile vehicles
- Stay away from windows and trees

## 🏗️ Architecture

### Frontend (Next.js)
```
app/
├── page.tsx              # Main application
├── layout.tsx            # App layout and metadata
└── globals.css           # Global styles

components/
├── WeatherDashboard.tsx  # Current conditions display
├── AlertPanel.tsx        # Alert notifications
├── ForecastChart.tsx     # 8-hour wind chart
├── ThresholdControl.tsx  # Alert threshold slider
└── NotificationSettings.tsx # Push/SMS preferences
```

### Backend (Netlify Functions)
```
netlify/functions/
├── weather.ts                # OpenWeatherMap integration (with simple in-memory cache)
└── send-alerts-onesignal.ts  # Unified alerts via OneSignal
```

### Data Types
```
types/
├── weather.ts            # Weather data interfaces
├── alerts.ts             # Alert level definitions
└── notifications.ts      # Notification preferences
```

## 📊 Performance & Analytics

### Core Web Vitals Targets
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms  
- **CLS** (Cumulative Layout Shift): < 0.1

### Monitoring Metrics
- Weekly Active Users (WAU)
- Push Notification Opt-in Rate
- SMS Subscription Rate
- Netlify Function Execution Time
- Weather API Response Time

## 🔒 Security & Privacy

### Data Protection
- **No Personal Data Storage** - Phone numbers handled via secure Netlify Functions
- **API Key Security** - All secrets stored as environment variables
- **HTTPS Only** - All communications encrypted
- **No Tracking** - No analytics or user tracking implemented

### Privacy Policy
This application:
- Does not store personal information
- Only sends notifications for subscribed users
- Allows easy unsubscription from all services
- Uses weather data solely for alert purposes

## 🚧 Roadmap

### Version 2.0 (Planned)
- [ ] **Multi-location Support** - Multiple Romanian cities
- [ ] **User Accounts** - Persistent preferences and alert history
- [ ] **Advanced Forecasting** - 24-48 hour predictions
- [ ] **Weather Maps** - Interactive wind visualization
- [ ] **Mobile App** - Native iOS/Android applications

### Future Enhancements
- [ ] **Machine Learning** - Improved prediction accuracy
- [ ] **Severe Weather Integration** - Tornado and storm warnings
- [ ] **Community Features** - User-reported conditions
- [ ] **API for Developers** - Public weather alert API

## 🤝 Contributing

### Development Guidelines
1. **Code Quality** - Follow TypeScript best practices
2. **Component Structure** - Keep components under 200 lines
3. **Accessibility** - Maintain WCAG AA compliance
4. **Performance** - Optimize for Lighthouse scores 90+
5. **Testing** - Add tests for critical functionality

### Reporting Issues
Please report bugs and feature requests via GitHub Issues with:
- Clear problem description
- Steps to reproduce
- Expected vs actual behavior
- Browser/device information

## 📄 License

MIT License - See LICENSE file for details.

## 🆘 Support

For technical support or questions:
- **Documentation**: Check this README and code comments
- **Issues**: Create a GitHub issue
- **Emergency Weather**: Contact ANM or call 112

---

**Built with ❤️ for the safety of Bucharest residents**

*Stay informed, stay safe* 🌪️
