import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import {
  panoramaFilenames,
  replaceSnapshot,
  rewriteTourAssetUrls,
  tourAssetPaths,
  tourSnapshotDir,
  validateSlug,
} from './pull-tour.mjs';

test('derives unique decoded panorama filenames from scene URLs', () => {
  const config = {
    scenes: [
      { panorama: '/tours/demo/panoramas/Front%20Office.jpg' },
      { panorama: '/tours/demo/panoramas/hall.jpg' },
      { panorama: '/tours/demo/panoramas/Front%20Office.jpg' },
    ],
  };

  assert.deepEqual(panoramaFilenames(config), ['Front Office.jpg', 'hall.jpg']);
});

test('returns no filenames when scenes are absent', () => {
  assert.deepEqual(panoramaFilenames({}), []);
});

test('collects referenced tour-local assets and skips external URLs', () => {
  const config = {
    meta: {
      logo: '/tours/demo/logo.svg',
      nadir: { image: 'nadir/patch.png' },
      floorPlan: { image: '/tours/demo/markers/floorplan.png' },
    },
    scenes: [{
      panorama: '/tours/demo/panoramas/room.jpg',
      infoMarkers: [{
        imageUrl: '/tours/demo/markers/photo.webp',
        documentUrl: 'https://example.com/brochure.pdf',
        ctaUrl: '/tours/demo/documents/contact.pdf',
      }],
    }],
  };

  assert.deepEqual(tourAssetPaths(config, 'demo'), [
    'logo.svg',
    'nadir/patch.png',
    'markers/floorplan.png',
    'panoramas/room.jpg',
    'markers/photo.webp',
    'documents/contact.pdf',
  ]);
});

test('rewrites source tour asset URLs to the delivery slug', () => {
  const config = {
    meta: {
      logo: '/tours/source-id/logo.svg',
      nadir: { image: '/tours/source-id/nadir/patch.png' },
      floorPlan: { image: '/tours/source-id/markers/floorplan.png' },
    },
    scenes: [{
      panorama: '/tours/source-id/panoramas/room.jpg',
      infoMarkers: [{
        imageUrl: '/tours/source-id/markers/photo.webp',
        documentUrl: 'https://example.com/brochure.pdf',
        ctaUrl: '/tours/source-id/documents/contact.pdf',
      }],
    }],
  };

  assert.deepEqual(rewriteTourAssetUrls(config, 'source-id', 'client-tour'), {
    meta: {
      logo: '/tours/client-tour/logo.svg',
      nadir: { image: '/tours/client-tour/nadir/patch.png' },
      floorPlan: { image: '/tours/client-tour/markers/floorplan.png' },
    },
    scenes: [{
      panorama: '/tours/client-tour/panoramas/room.jpg',
      infoMarkers: [{
        imageUrl: '/tours/client-tour/markers/photo.webp',
        documentUrl: 'https://example.com/brochure.pdf',
        ctaUrl: '/tours/client-tour/documents/contact.pdf',
      }],
    }],
  });
  assert.equal(config.scenes[0].panorama, '/tours/source-id/panoramas/room.jpg');
});

test('rewrites UUID-backed assets to a friendly public alias', () => {
  const source = 'b492fcaa-1d6a-4433-8756-010b0229c487';
  const config = { scenes: [{ panorama: `/tours/${source}/panoramas/room.jpg` }] };

  assert.equal(
    rewriteTourAssetUrls(config, source, 'sixdx').scenes[0].panorama,
    '/tours/sixdx/panoramas/room.jpg',
  );
  assert.deepEqual(tourAssetPaths(config, source), ['panoramas/room.jpg']);
});

test('restores the previous snapshot when the final rename fails', async () => {
  const calls = [];
  const operations = {
    async rename(from, to) {
      calls.push(['rename', from, to]);
      if (from === 'stage') throw new Error('locked');
    },
    async rm(target) {
      calls.push(['rm', target]);
    },
  };

  await assert.rejects(() => replaceSnapshot('live', 'stage', operations), /locked/);
  assert.deepEqual(calls, [
    ['rename', 'live', 'live.previous'],
    ['rename', 'stage', 'live'],
    ['rename', 'live.previous', 'live'],
  ]);
});

test('keeps snapshot paths independent by delivery slug', () => {
  assert.equal(tourSnapshotDir('tour-one'), path.join('deliverables', 'tours', 'tour-one'));
  assert.equal(tourSnapshotDir('tour-two'), path.join('deliverables', 'tours', 'tour-two'));
});

test('rejects unsafe source and delivery slugs', () => {
  assert.equal(validateSlug('office_hq-2'), 'office_hq-2');
  assert.throws(() => validateSlug('../office'), /invalid tour slug/);
  assert.throws(() => validateSlug('office/two'), /invalid tour slug/);
});

test('can be imported when the host process has no script argument', () => {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', "import './scripts/pull-tour.mjs'"],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
});
