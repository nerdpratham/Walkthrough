import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.STUDIO_SECRET ?? 'dev-secret-not-for-production'
  );
}

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('studio-session')?.value;
  if (token) {
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {}
  }
  const loginUrl = new URL('/studio/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/studio',
    '/studio/((?!login$).*)',
    '/api/studio/((?!auth/).*)',
  ],
};
