import { NextResponse } from 'next/server'
import { getSubscriber, setSubscriber } from '@/lib/redis'
import { z } from 'zod'

const settingsSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  threshold: z.number().min(0).max(100),
  channels: z.array(z.enum(['email', 'sms', 'push', 'in-app']))
})

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // For demo purposes, return default settings
    // In a real app, you'd get the user ID from session/auth
    const subscriberId = 'demo-user'
    const subscriber = await getSubscriber(subscriberId)
    
    if (subscriber) {
      return NextResponse.json({
        email: subscriber.email || '',
        phone: subscriber.phone || '',
        threshold: subscriber.threshold,
        channels: subscriber.channels
      })
    }

    // Return default settings
    return NextResponse.json({
      email: '',
      phone: '',
      threshold: 50,
      channels: ['in-app']
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = settingsSchema.parse(body)

    // For demo purposes, use a fixed user ID
    // In a real app, you'd get the user ID from session/auth
    const subscriberId = 'demo-user'
    
    const subscriber = {
      id: subscriberId,
      email: validatedData.email,
      phone: validatedData.phone,
      threshold: validatedData.threshold,
      channels: validatedData.channels,
      consentTimestamp: Date.now()
    }

    await setSubscriber(subscriberId, subscriber)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}

