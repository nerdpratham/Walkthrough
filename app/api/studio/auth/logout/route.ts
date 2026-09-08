import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete('studio-session');
  return res;
}
