import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7246/ingest/c6551201-626b-4f04-992d-9b144886a04c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:6',message:'Request intercepted',data:{path:request.nextUrl.pathname,method:request.method,url:request.url},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
