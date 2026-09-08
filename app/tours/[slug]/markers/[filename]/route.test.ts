/** @jest-environment node */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const previousToursDataDir = process.env.TOURS_DATA_DIR;
let temporaryToursDir: string;

async function get(slug: string, filename: string): Promise<Response> {
  const { GET } = await import('./route');
  return GET(
    new Request(`http://localhost/tours/${slug}/markers/${filename}`),
    { params: Promise.resolve({ slug, filename }) }
  );
}

beforeEach(async () => {
  temporaryToursDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'site-tour-marker-files-')
  );
  process.env.TOURS_DATA_DIR = temporaryToursDir;
});

afterEach(async () => {
  await fs.rm(temporaryToursDir, { recursive: true, force: true });

  if (previousToursDataDir === undefined) {
    delete process.env.TOURS_DATA_DIR;
  } else {
    process.env.TOURS_DATA_DIR = previousToursDataDir;
  }
});

describe('GET /tours/[slug]/markers/[filename]', () => {
  test.each([
    ['photo.JPG', 'image/jpeg'],
    ['photo.JPEG', 'image/jpeg'],
    ['diagram.PNG', 'image/png'],
    ['render.WEBP', 'image/webp'],
    ['guide.PDF', 'application/pdf'],
  ])(
    'serves %s with exact bytes, MIME type, and immutable caching',
    async (filename, contentType) => {
      const bytes = Buffer.from([0, 1, 2, 127, 128, 254, 255]);
      const markersDir = path.join(temporaryToursDir, 'office', 'markers');
      await fs.mkdir(markersDir, { recursive: true });
      await fs.writeFile(path.join(markersDir, filename), bytes);

      const response = await get('office', filename);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(contentType);
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable'
      );
      expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    }
  );

  test('rejects an invalid slug', async () => {
    const response = await get('../office', 'photo.jpg');

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Bad request');
  });

  test('rejects an invalid filename', async () => {
    const response = await get('office', 'photo name.jpg');

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Bad request');
  });

  test('returns 404 for an unsupported extension', async () => {
    const markersDir = path.join(temporaryToursDir, 'office', 'markers');
    await fs.mkdir(markersDir, { recursive: true });
    await fs.writeFile(path.join(markersDir, 'notes.txt'), 'not public');

    const response = await get('office', 'notes.txt');

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Not found');
  });

  test('returns 404 for a missing file', async () => {
    const response = await get('office', 'missing.png');

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe('Not found');
  });

  test.each([
    ['../office', 'photo.jpg'],
    ['office', '../photo.jpg'],
    ['office', '..\\photo.jpg'],
    ['office', '/photo.jpg'],
  ])('rejects traversal attempt %s / %s', async (slug, filename) => {
    const response = await get(slug, filename);

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toBe('Bad request');
  });
});
