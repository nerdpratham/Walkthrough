import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createBuildSpec } from './build-viewer.mjs';

test('builds Docker arguments for a selected tour snapshot', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'site-tour-build-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'deliverables', 'tours', 'office'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'deliverables', 'tours', 'office', 'tour.config.json'),
    '{}',
  );

  assert.deepEqual(await createBuildSpec('office', undefined, root), {
    tag: 'site-tour-viewer:latest',
    args: [
      'build',
      '-f', 'Dockerfile.viewer',
      '--build-arg', 'SLUG=office',
      '--build-context', `tour=${path.join(root, 'deliverables', 'tours', 'office')}`,
      '-t', 'site-tour-viewer:latest',
      '.',
    ],
  });
  assert.equal((await createBuildSpec('office', 'client/office:v2', root)).tag, 'client/office:v2');
});

test('rejects unsafe slugs and image tags', async () => {
  await assert.rejects(() => createBuildSpec('../office'), /invalid tour slug/);
  await assert.rejects(() => createBuildSpec('office', 'bad tag'), /invalid image tag/);
});

test('fails when the selected local snapshot is missing', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'site-tour-build-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));

  await assert.rejects(
    () => createBuildSpec('missing', undefined, root),
    /snapshot not found.*missing/,
  );
});
