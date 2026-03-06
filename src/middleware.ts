import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/viewer',
  '/ar',
  '/qr',
  '/demo',
  '/embed',
  '/launch',
  '/product',
  '/api/analytics/track',
  '/api/public',
  '/api/v1',
  '/sdk',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/uploads') || pathname.startsWith('/assets') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  // Check auth for dashboard and API routes
  const token = request.cookies.get('auth-token')?.value;
  if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/api/'))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
