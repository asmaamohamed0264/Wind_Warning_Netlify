# Ghid de Upgrade - Wind Warning App

## ⚠️ Vulnerabilități Cunoscute

### Next.js 13.5.1
Aplicația folosește momentan **Next.js 13.5.1** care are câteva vulnerabilități cunoscute (moderate și critice).

**Recomandare**: Upgrade la **Next.js 14.x** sau **15.x**

### Motivul pentru amânarea upgrade-ului:
- Next.js 14+ introduce breaking changes în App Router
- Necesită refactorizări în:
  - API Routes (migrare la Route Handlers)
  - Static export configuration
  - Image optimization
  - Middleware
  
## 📋 Plan de Upgrade (Viitor)

### Faza 1: Pregătire (1-2 zile)
1. **Backup complet**
   ```bash
   git checkout -b upgrade/nextjs-14
   ```

2. **Documentare breaking changes**
   - Citește [Next.js 14 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-14)
   - Identifică toate componentele afectate

3. **Update dependencies în test branch**
   ```bash
   npm install next@latest react@latest react-dom@latest
   ```

### Faza 2: Refactorizări (3-5 zile)
1. **API Routes → Route Handlers**
   - Convertește `app/api/weather/route.ts` la formatul nou
   - Actualizează `app/api/send-alerts/route.ts`

2. **Static Export Configuration**
   - Verifică dacă `output: 'export'` este compatibil
   - Alternativ: migrare la Netlify Edge Functions

3. **Image Optimization**
   - Update la `next/image` API nou
   - Configurare pentru Netlify

4. **Server Components**
   - Revizuiește toate componentele 'use client'
   - Optimizează pentru Server Components unde e posibil

### Faza 3: Testing (2-3 zile)
1. **Unit Tests**
   ```bash
   npm run test:ci
   ```

2. **Integration Tests**
   - Testează toate flow-urile principale
   - Verifică notificări OneSignal
   - Testează API weather

3. **E2E Tests**
   - Testează pe diferite browsere
   - Verifică responsive design
   - Testează push notifications

### Faza 4: Deployment (1 zi)
1. **Staging Environment**
   - Deploy pe Netlify preview
   - Testează în condiții reale

2. **Production Deployment**
   - Merge în main branch
   - Monitor pentru erori
   - Rollback plan pregătit

## 🔧 Alternative Temporare

Până la upgrade, poți folosi aceste workaround-uri pentru securitate:

### 1. Netlify Edge Functions
Mută logica critică din API Routes în Edge Functions pentru izolare.

### 2. Rate Limiting Agresiv
```typescript
// lib/ratelimit.ts
export const STRICT_RATE_LIMITS = {
  weather: { requests: 10, window: 60000 },
  alerts: { requests: 3, window: 60000 },
};
```

### 3. Input Validation Strict
Zod validation este deja implementat - asigură-te că este folosit peste tot.

### 4. CORS Restrictiv
```toml
# netlify.toml
Access-Control-Allow-Origin = "https://wind.qub3.uk"
```

## 📊 Estimări

| Task | Efort | Risc |
|------|-------|------|
| Pregătire | 1-2 zile | Scăzut |
| Refactorizări | 3-5 zile | Mediu |
| Testing | 2-3 zile | Ridicat |
| Deployment | 1 zi | Mediu |
| **TOTAL** | **7-11 zile** | **Mediu-Ridicat** |

## ✅ Checklist Pre-Upgrade

- [ ] Backup baza de date (dacă există)
- [ ] Documentare API endpoints
- [ ] Liste toate custom configurations
- [ ] Testează local în Next.js 14
- [ ] Verifică compatibilitate toate dependencies
- [ ] Pregătire plan de rollback
- [ ] Notifică stakeholders

## 📝 Note Importante

1. **Nu rula `npm audit fix --force`** - va face upgrade forțat la Next.js 14 fără pregătire
2. **Păstrează branch-ul `main` stabil** - toate upgrade-urile în branch-uri separate
3. **Monitor Netlify logs** după deployment
4. **Testează pe production-like environment** înainte de deploy final

## 🔗 Resurse Utile

- [Next.js 14 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-14)
- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [Netlify Next.js Runtime](https://docs.netlify.com/frameworks/next-js/overview/)
- [React 19 Migration](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)

---

**Ultima actualizare**: 9 ianuarie 2026
**Autor**: Bogdan pentru Loredana
