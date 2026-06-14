// src/middleware.ts — 路由保护（精简版）
// 关键：不在 Edge Runtime 跑 bcryptjs，只用 JWT 解码判断登录态
// 实际的"账号密码验证"交给 Auth.js 在 Node Runtime 里做
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: any) {
  const { nextUrl } = req;
  const isLoginPage = nextUrl.pathname === '/login';
  const isApiAuth = nextUrl.pathname.startsWith('/api/auth');
  const isApiSeed = nextUrl.pathname === '/api/seed';
  const isAdminApi = nextUrl.pathname.startsWith('/api/admin');
  const isAdminPage = nextUrl.pathname.startsWith('/admin');
  const isPublic = isLoginPage || isApiAuth;
  const secureCookie =
    nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

  if (isApiSeed) {
    const seedToken = process.env.SEED_TOKEN;
    const requestToken = req.headers.get('x-seed-token') || nextUrl.searchParams.get('token');
    if (!seedToken || requestToken !== seedToken) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.next();
  }

  // 拿 JWT token（不解析密码 hash，只看 token 本身）
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  const isLoggedIn = !!token;
  const user = token as any;

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
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
