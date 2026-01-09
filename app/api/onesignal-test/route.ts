import { NextResponse } from 'next/server';
import { sendWindAlertNotification, getAppStats } from '@/lib/onesignal-mcp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, level, windSpeed, time } = body;

    if (action === 'send-test') {
      const response = await sendWindAlertNotification(
        level || 'caution',
        windSpeed || 50,
        time || new Date().toISOString()
      );

      const data = await response.json();

      return NextResponse.json({
        success: true,
        message: 'Test notification sent',
        data,
      });
    }

    if (action === 'get-stats') {
      const stats = await getAppStats();

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('OneSignal test error:', error);
    return NextResponse.json(
      {
        error: 'Failed to execute OneSignal action',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const stats = await getAppStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get app stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
