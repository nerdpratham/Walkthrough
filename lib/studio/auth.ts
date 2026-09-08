import { SignJWT, jwtVerify } from 'jose';

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.STUDIO_SECRET ?? 'dev-secret-not-for-production'
  );
}

export async function createSession(): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret());
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}
