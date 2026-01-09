/**
 * Rate limiting utility using in-memory store
 * Pentru production, folosește Upstash Redis sau similar
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  requests: number;
  window: number; // în milisecunde
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limiter simplu în memorie
 * Pentru production cu multiple instanțe, folosește Redis
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { requests: 10, window: 60000 }
): Promise<RateLimitResult> {
  const now = Date.now();
  const entry = store.get(identifier);

  // Dacă nu există sau a expirat, creează nou entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + config.window;
    store.set(identifier, { count: 1, resetTime });
    
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: resetTime,
    };
  }

  // Verifică dacă a depășit limita
  if (entry.count >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Incrementează counter
  entry.count++;
  
  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Helper pentru a obține IP-ul clientului din headers
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'anonymous'
  );
}
