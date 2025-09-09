import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export { redis }

// Types for stored data
export interface Subscriber {
  id: string
  email?: string
  phone?: string
  pushToken?: string
  threshold: number
  channels: ('email' | 'sms' | 'push' | 'in-app')[]
  consentTimestamp: number
  lastAlertHash?: string
}

export interface WeatherData {
  timestamp: number
  windSpeed: number
  windGust: number
  windDirection: number
  temperature: number
  humidity: number
  pressure: number
  visibility: number
  provider: 'openweather' | 'open-meteo' | 'combined'
}

export interface AlertData {
  hash: string
  timestamp: number
  speed: number
  threshold: number
  provider: string
}

// Redis operations
export async function getSubscriber(id: string): Promise<Subscriber | null> {
  const data = await redis.get(`subscriber:${id}`)
  return data as Subscriber | null
}

export async function setSubscriber(id: string, subscriber: Subscriber): Promise<void> {
  await redis.set(`subscriber:${id}`, subscriber, { ex: 86400 * 30 }) // 30 days
}

export async function getAllSubscribers(): Promise<Subscriber[]> {
  const keys = await redis.keys('subscriber:*')
  const subscribers = await Promise.all(
    keys.map(key => redis.get(key))
  )
  return subscribers.filter(Boolean) as Subscriber[]
}

export async function getWeatherData(): Promise<WeatherData | null> {
  const data = await redis.get('weather:current')
  return data as WeatherData | null
}

export async function setWeatherData(data: WeatherData): Promise<void> {
  await redis.set('weather:current', data, { ex: 300 }) // 5 minutes
}

export async function getAlertHistory(): Promise<AlertData[]> {
  const data = await redis.get('alerts:history')
  return (data as AlertData[]) || []
}

export async function addAlertToHistory(alert: AlertData): Promise<void> {
  const history = await getAlertHistory()
  history.push(alert)
  
  // Keep only last 100 alerts
  if (history.length > 100) {
    history.splice(0, history.length - 100)
  }
  
  await redis.set('alerts:history', history, { ex: 86400 * 7 }) // 7 days
}

export async function isAlertSent(hash: string): Promise<boolean> {
  const exists = await redis.exists(`alert:sent:${hash}`)
  return exists === 1
}

export async function markAlertSent(hash: string): Promise<void> {
  await redis.set(`alert:sent:${hash}`, true, { ex: 7200 }) // 2 hours
}


export async function shouldSendAlert(
  subscriber: Subscriber,
  windSpeed: number,
  threshold: number
): Promise<boolean> {
  // Check if wind speed exceeds threshold
  if (windSpeed < threshold) {
    return false
  }

  // Check if subscriber has any active channels
  if (subscriber.channels.length === 0) {
    return false
  }

  // Check rate limiting (max 1 alert per 30 minutes)
  const now = Date.now()
  const lastAlertTime = subscriber.lastAlertHash ? 
    parseInt(subscriber.lastAlertHash.split('-')[0]) * 1000 : 0
  
  if (now - lastAlertTime < 30 * 60 * 1000) { // 30 minutes
    return false
  }

  return true
}

// Mock function for sendAlertToSubscriber (for demo purposes)
export async function sendAlertToSubscriber(alertData: {
  subscriber: Subscriber
  windSpeed: number
  threshold: number
  location: string
}): Promise<{
  email: boolean
  sms: boolean
  push: boolean
  inApp: boolean
}> {
  // For demo purposes, just return mock results
  return {
    email: alertData.subscriber.channels.includes('email'),
    sms: alertData.subscriber.channels.includes('sms'),
    push: alertData.subscriber.channels.includes('push'),
    inApp: true
  }
}
