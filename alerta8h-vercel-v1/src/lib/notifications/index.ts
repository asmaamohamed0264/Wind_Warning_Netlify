import { Subscriber } from '../redis'
import { sendEmailNotification, generateEmailContent } from './email'
import { sendSMSNotification, generateSMSContent } from './sms'
import { sendPushNotification, generatePushContent } from './push'
import { generateAlertMessage, getFallbackMessage } from './ai'

export interface AlertData {
  windSpeed: number
  threshold: number
  location: string
  subscriber: Subscriber
}

export async function sendAlertToSubscriber(alertData: AlertData): Promise<{
  email: boolean
  sms: boolean
  push: boolean
  inApp: boolean
}> {
  const { windSpeed, threshold, location, subscriber } = alertData
  const isHighRisk = windSpeed >= threshold
  
  // Generate AI message
  const aiMessage = await generateAlertMessage(windSpeed, threshold, location, isHighRisk)
  const finalMessage = aiMessage || getFallbackMessage(windSpeed, threshold, location, isHighRisk)
  
  const results = {
    email: false,
    sms: false,
    push: false,
    inApp: true // In-app notifications are always "sent" (displayed in UI)
  }

  // Send email notification
  if (subscriber.channels.includes('email') && subscriber.email) {
    try {
      const emailContent = generateEmailContent(windSpeed, threshold, location, finalMessage)
      emailContent.to = subscriber.email
      results.email = await sendEmailNotification(emailContent)
    } catch (error) {
      console.error('Email notification failed:', error)
    }
  }

  // Send SMS notification
  if (subscriber.channels.includes('sms') && subscriber.phone) {
    try {
      const smsContent = generateSMSContent(windSpeed, threshold, location, finalMessage)
      smsContent.to = subscriber.phone
      results.sms = await sendSMSNotification(smsContent)
    } catch (error) {
      console.error('SMS notification failed:', error)
    }
  }

  // Send push notification
  if (subscriber.channels.includes('push') && subscriber.pushToken) {
    try {
      const pushContent = generatePushContent(windSpeed, threshold, location, finalMessage)
      results.push = await sendPushNotification({
        subscription: JSON.parse(subscriber.pushToken),
        ...pushContent
      })
    } catch (error) {
      console.error('Push notification failed:', error)
    }
  }

  return results
}

export async function sendBulkAlerts(
  alerts: AlertData[]
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // Process alerts in batches to avoid overwhelming the services
  const batchSize = 5
  for (let i = 0; i < alerts.length; i += batchSize) {
    const batch = alerts.slice(i, i + batchSize)
    
    const promises = batch.map(async (alert) => {
      try {
        await sendAlertToSubscriber(alert)
        success++
      } catch (error) {
        console.error('Bulk alert failed:', error)
        failed++
      }
    })

    await Promise.allSettled(promises)
    
    // Small delay between batches
    if (i + batchSize < alerts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return { success, failed }
}

export function shouldSendAlert(
  subscriber: Subscriber,
  windSpeed: number,
  threshold: number
): boolean {
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

