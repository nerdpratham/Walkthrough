import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { discoverTourSlugs } from './smoke-test.mjs';

test('discoverTourSlugs lists only directories', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smoke-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));

  await fs.mkdir(path.join(dir, 'tour-a'));
  await fs.mkdir(path.join(dir, 'tour-b'));
  await fs.writeFile(path.join(dir, 'README.md'), 'not a tour', 'utf-8');

  const slugs = await discoverTourSlugs(dir);

  assert.deepEqual(slugs.sort(), ['tour-a', 'tour-b']);
});

test('discoverTourSlugs returns an empty array when the dir is missing', async () => {
  assert.deepEqual(await discoverTourSlugs('/does/not/exist'), []);
});
