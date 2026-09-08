import { NextResponse } from 'next/server';
import { createSession } from '@/lib/studio/auth';

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.STUDIO_PASSWORD) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (body.password !== process.env.STUDIO_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }
  const token = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set('studio-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
