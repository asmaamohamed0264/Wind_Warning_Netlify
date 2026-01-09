import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // #region agent log
  // Log to console for now (middleware runs on edge, file I/O not available)
  console.log('[MIDDLEWARE]', {
    path: request.nextUrl.pathname,
    method: request.method,
    url: request.url,
    timestamp: Date.now(),
    hypothesisId: 'H4'
  });
  // #endregion
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
