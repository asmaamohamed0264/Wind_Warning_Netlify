import { NextResponse } from 'next/server'
import { getAllSubscribers, getWeatherData, shouldSendAlert, sendAlertToSubscriber, markAlertSent, isAlertSent } from '@/lib/redis'
import { generateAlertHash } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Cron job started at:', new Date().toISOString())

    // Get current weather data
    const weatherData = await getWeatherData()
    if (!weatherData) {
      console.log('No weather data available')
      return NextResponse.json({ message: 'No weather data available' })
    }

    // Get all subscribers
    const subscribers = await getAllSubscribers()
    console.log(`Found ${subscribers.length} subscribers`)

    const alerts = []
    let sentCount = 0
    let skippedCount = 0

    for (const subscriber of subscribers) {
      // Check if alert should be sent
      if (!shouldSendAlert(subscriber, weatherData.windSpeed, subscriber.threshold)) {
        skippedCount++
        continue
      }

      // Generate alert hash for deduplication
      const alertHash = generateAlertHash(
        Math.floor(Date.now() / 1000),
        weatherData.windSpeed,
        subscriber.threshold,
        weatherData.provider
      )

      // Check if this alert was already sent
      if (await isAlertSent(alertHash)) {
        console.log(`Alert already sent for hash: ${alertHash}`)
        skippedCount++
        continue
      }

      // Send alert
      try {
        const results = await sendAlertToSubscriber({
          windSpeed: weatherData.windSpeed,
          threshold: subscriber.threshold,
          location: process.env.LOCATION_NAME || 'Aleea Someșul Cald, București',
          subscriber
        })

        // Mark alert as sent
        await markAlertSent(alertHash)

        // Update subscriber's last alert hash
        subscriber.lastAlertHash = alertHash
        await setSubscriber(subscriber.id, subscriber)

        alerts.push({
          subscriberId: subscriber.id,
          windSpeed: weatherData.windSpeed,
          threshold: subscriber.threshold,
          channels: subscriber.channels,
          results
        })

        sentCount++
        console.log(`Alert sent to subscriber ${subscriber.id}`)
      } catch (error) {
        console.error(`Failed to send alert to subscriber ${subscriber.id}:`, error)
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      weatherData: {
        windSpeed: weatherData.windSpeed,
        provider: weatherData.provider
      },
      subscribers: subscribers.length,
      alertsSent: sentCount,
      alertsSkipped: skippedCount,
      alerts: alerts
    }

    console.log('Cron job completed:', summary)

    return NextResponse.json({
      success: true,
      message: `Processed ${subscribers.length} subscribers, sent ${sentCount} alerts, skipped ${skippedCount}`,
      summary
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Import setSubscriber from redis
import { setSubscriber } from '@/lib/redis'
