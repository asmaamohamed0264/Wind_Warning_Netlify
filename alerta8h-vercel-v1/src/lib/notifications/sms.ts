import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface SMSNotificationData {
  to: string
  message: string
}

export async function sendSMSNotification(data: SMSNotificationData): Promise<boolean> {
  try {
    const result = await client.messages.create({
      body: data.message,
      from: process.env.TWILIO_PHONE_FROM,
      to: data.to
    })

    return !!result.sid
  } catch (error) {
    console.error('SMS send error:', error)
    return false
  }
}

export function generateSMSContent(
  windSpeed: number,
  threshold: number,
  location: string,
  aiMessage?: string
): SMSNotificationData {
  const isHighRisk = windSpeed >= threshold
  const riskEmoji = isHighRisk ? '🔴' : '🟡'
  
  let message = `${riskEmoji} Alertă Vânt ${location}\n`
  message += `Vânt: ${windSpeed.toFixed(1)} km/h\n`
  message += `Prag: ${threshold} km/h\n`
  
  if (aiMessage) {
    message += `\n"${aiMessage}"\n`
  }
  
  if (isHighRisk) {
    message += `\n⚠️ ATENȚIE! Evitați deplasările!`
  } else {
    message += `\n📢 Fiți atenți la condiții!`
  }
  
  message += `\n\nSTOP pentru dezabonare`
  message += `\nUrgențe: 112`

  return {
    to: '',
    message
  }
}

export function isStopMessage(message: string): boolean {
  const stopKeywords = ['stop', 'oprește', 'dezabonează', 'unsubscribe']
  const normalizedMessage = message.toLowerCase().trim()
  
  return stopKeywords.some(keyword => normalizedMessage.includes(keyword))
}

