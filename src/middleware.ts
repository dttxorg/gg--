// src/middleware.ts — 路由保护
import { auth } from './lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;

  const isLoginPage = nextUrl.pathname === '/login';
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth');
  const isAdminApi = nextUrl.pathname.startsWith('/api/admin');
  const isAdminPage = nextUrl.pathname.startsWith('/admin');
  const isLibrary = nextUrl.pathname.startsWith('/library');
  const isPublic = isLoginPage || isApiAuth;

  if (isPublic) {
    if (isLoginPage && isLoggedIn) {
      return NextResponse.redirect(new URL(user?.role === 'ADMIN' ? '/admin' : '/library', nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', nextUrl);
    if (!isAdminApi) loginUrl.searchParams.set('from', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminPage && user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/library', nextUrl));
  }
  if (isAdminApi && user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
