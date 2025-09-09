import webpush from 'web-push'

// Configure VAPID keys
webpush.setVapidDetails(
  'mailto:admin@windmonitor.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushNotificationData {
  subscription: PushSubscription
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

export async function sendPushNotification(data: PushNotificationData): Promise<boolean> {
  try {
    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      icon: data.icon || '/icons/wind-icon-192.png',
      badge: data.badge || '/icons/wind-icon-72.png',
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'Vezi detalii'
        },
        {
          action: 'dismiss',
          title: 'Închide'
        }
      ]
    })

    await webpush.sendNotification(data.subscription, payload)
    return true
  } catch (error) {
    console.error('Push notification error:', error)
    
    // If subscription is invalid, we should remove it
    if (error instanceof Error && error.message.includes('410')) {
      console.log('Subscription expired, should be removed')
    }
    
    return false
  }
}

export function generatePushContent(
  windSpeed: number,
  threshold: number,
  location: string,
  aiMessage?: string
): { title: string; body: string; data: any } {
  const isHighRisk = windSpeed >= threshold
  const riskEmoji = isHighRisk ? '🔴' : '🟡'
  
  const title = `${riskEmoji} Alertă Vânt - ${location}`
  
  let body = `Vânt: ${windSpeed.toFixed(1)} km/h`
  body += ` | Prag: ${threshold} km/h`
  
  if (aiMessage) {
    body += `\n"${aiMessage}"`
  }
  
  const data = {
    windSpeed,
    threshold,
    location,
    isHighRisk,
    timestamp: Date.now(),
    url: process.env.NEXT_PUBLIC_APP_URL
  }

  return { title, body, data }
}

export function validateSubscription(subscription: any): subscription is PushSubscription {
  return (
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  )
}

