/** @jest-environment node */
import { createSession, verifySession } from './auth';

const originalSecret = process.env.STUDIO_SECRET;
afterEach(() => {
  process.env.STUDIO_SECRET = originalSecret;
});

test('createSession returns a non-empty string', async () => {
  const token = await createSession();
  expect(typeof token).toBe('string');
  expect(token.length).toBeGreaterThan(0);
});

test('verifySession returns true for a token from createSession', async () => {
  const token = await createSession();
  expect(await verifySession(token)).toBe(true);
});

test('verifySession returns false for a garbage string', async () => {
  expect(await verifySession('not-a-jwt')).toBe(false);
});

test('verifySession returns false for a token signed with a different secret', async () => {
  process.env.STUDIO_SECRET = 'secret-A';
  const token = await createSession();
  process.env.STUDIO_SECRET = 'secret-B';
  expect(await verifySession(token)).toBe(false);
});
