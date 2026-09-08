/** @jest-environment node */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { GET } from './route';

const prev = process.env.TOURS_DATA_DIR;
let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tour-cfg-'));
  process.env.TOURS_DATA_DIR = dir;
  const tour = path.join(dir, 'demo');
  await fs.mkdir(tour, { recursive: true });
  await fs.writeFile(
    path.join(tour, 'tour.config.json'),
    JSON.stringify({
      meta: { title: 'Demo', site: 'S', startScene: 'a' },
      zones: [{ id: 'z', label: 'Z' }],
      scenes: [{ id: 'a', label: 'A', zone: 'z', panorama: '/tours/demo/panoramas/a.jpg' }],
    }),
  );
});

afterEach(async () => {
  if (prev === undefined) delete process.env.TOURS_DATA_DIR;
  else process.env.TOURS_DATA_DIR = prev;
  await fs.rm(dir, { recursive: true, force: true });
});

function call(slug: string) {
  return GET(new Request('http://t/'), { params: Promise.resolve({ slug }) });
}

test('returns the validated config for a valid slug', async () => {
  const res = await call('demo');
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.meta.title).toBe('Demo');
  expect(body.scenes[0].id).toBe('a');
});

test('rejects an unsafe slug', async () => {
  const res = await call('../etc');
  expect(res.status).toBe(400);
});

test('404s a missing tour', async () => {
  const res = await call('nope');
  expect(res.status).toBe(404);
});
