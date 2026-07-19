import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if it's the login page
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // Next.js middleware runs on edge, can't easily read localStorage.
  // In a real app, tokens should be in httpOnly cookies for better security & SSR.
  // Since we are using localStorage in this scaffold, we'll let a client-side wrapper handle true redirection,
  // or we can look for a cookie if we modify authStore to set cookies.
  
  // For now, this is a placeholder where cookie checking would go.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
