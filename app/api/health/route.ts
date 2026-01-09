import { NextResponse } from 'next/server';

// #region agent log
fetch('http://127.0.0.1:7246/ingest/c6551201-626b-4f04-992d-9b144886a04c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/health/route.ts:3',message:'Health check API called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
// #endregion

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'API routes are working',
    timestamp: new Date().toISOString()
  });
}
