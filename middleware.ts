import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Block access to temp directory
  if (pathname.startsWith('/temp')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // API routes that don't require authentication
  const publicApiRoutes = ['/api/auth'];
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Skip auth check for public routes
  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/history/:path*',
    '/analytics/:path*',
    '/passwords/:path*',
    '/api/unlock-pdf',
    '/api/download-pdf/:path*',
    '/api/pdfs/:path*',
    '/api/statements/:path*',
    '/api/analytics/:path*',
    '/api/passwords/:path*',
    '/temp/:path*',
  ],
};

