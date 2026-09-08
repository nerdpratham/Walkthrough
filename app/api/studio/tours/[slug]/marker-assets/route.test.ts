/** @jest-environment node */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { POST } from './route';

const previousToursDataDir = process.env.TOURS_DATA_DIR;
let temporaryToursDir: string;

function uploadRequest(files: File[]): Request {
  const formData = new FormData();
  for (const file of files) {
    formData.append('file', file);
  }

  return new Request('http://localhost/api/studio/tours/office/marker-assets', {
    method: 'POST',
    body: formData,
  });
}

async function post(files: File[], slug = 'office') {
  return POST(uploadRequest(files), { params: Promise.resolve({ slug }) });
}

beforeEach(async () => {
  temporaryToursDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'site-tour-marker-assets-')
  );
  process.env.TOURS_DATA_DIR = temporaryToursDir;
});

afterEach(async () => {
  jest.restoreAllMocks();
  await fs.rm(temporaryToursDir, { recursive: true, force: true });

  if (previousToursDataDir === undefined) {
    delete process.env.TOURS_DATA_DIR;
  } else {
    process.env.TOURS_DATA_DIR = previousToursDataDir;
  }
});

describe('POST /api/studio/tours/[slug]/marker-assets', () => {
  test.each([
    ['JPG', 'Lobby Photo.JPG', 'image/jpeg', '.jpg'],
    ['JPEG', 'Lobby Photo.JPEG', 'image/jpeg', '.jpeg'],
    ['PNG', 'Floor Plan.png', 'image/png', '.png'],
    ['WebP', 'Product View.webp', 'image/webp', '.webp'],
    ['PDF', 'Safety Guide.pdf', 'application/pdf', '.pdf'],
  ])(
    'stores a %s without changing its bytes',
    async (_label, originalName, mimeType, extension) => {
      const bytes = new Uint8Array([0, 1, 2, 127, 128, 254, 255]);
      const response = await post([
        new File([bytes], originalName, { type: mimeType }),
      ]);

      expect(response.status).toBe(200);
      const result = (await response.json()) as {
        url: string;
        filename: string;
      };
      expect(result.filename).toMatch(
        new RegExp(`^${path.parse(originalName).name.toLowerCase().replaceAll(' ', '-')}-[a-f0-9]{6}\\${extension}$`)
      );
      expect(result.url).toBe(
        `/tours/office/markers/${result.filename}`
      );
      await expect(
        fs.readFile(
          path.join(temporaryToursDir, 'office', 'markers', result.filename)
        )
      ).resolves.toEqual(Buffer.from(bytes));
    }
  );

  test('sanitizes and limits the generated basename', async () => {
    const originalName = `${'A'.repeat(90)} !!!.PNG`;
    const response = await post([
      new File([new Uint8Array([1])], originalName, { type: 'image/png' }),
    ]);

    const { filename } = (await response.json()) as { filename: string };
    expect(filename).toMatch(/^[a-z0-9-]+-[a-f0-9]{6}\.png$/);
    expect(filename.split('-').slice(0, -1).join('-')).toHaveLength(80);
  });

  test('uses asset when the sanitized basename is empty', async () => {
    const response = await post([
      new File([new Uint8Array([1])], '!!!.png', { type: 'image/png' }),
    ]);

    const { filename } = (await response.json()) as { filename: string };
    expect(filename).toMatch(/^asset-[a-f0-9]{6}\.png$/);
  });

  test('rejects an unsafe tour slug', async () => {
    const response = await post(
      [new File([new Uint8Array([1])], 'photo.jpg', { type: 'image/jpeg' })],
      '../office'
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid tour' });
  });

  test('rejects a missing file', async () => {
    const response = await post([]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Choose one file',
    });
  });

  test('rejects multiple files', async () => {
    const response = await post([
      new File([new Uint8Array([1])], 'one.jpg', { type: 'image/jpeg' }),
      new File([new Uint8Array([2])], 'two.jpg', { type: 'image/jpeg' }),
    ]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Choose one file',
    });
  });

  test('rejects an empty file', async () => {
    const response = await post([
      new File([], 'empty.png', { type: 'image/png' }),
    ]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'File is empty' });
  });

  test('rejects files larger than 20 MB', async () => {
    const response = await post([
      new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.webp', {
        type: 'image/webp',
      }),
    ]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'File must be 20 MB or smaller',
    });
  });

  test('accepts a file that is exactly 20 MB', async () => {
    const response = await post([
      new File([new Uint8Array(20 * 1024 * 1024)], 'maximum.pdf', {
        type: 'application/pdf',
      }),
    ]);

    expect(response.status).toBe(200);
  });

  test('returns Choose one file for malformed multipart data', async () => {
    const request = new Request(
      'http://localhost/api/studio/tours/office/marker-assets',
      {
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data; boundary=missing-boundary',
        },
        body: 'not valid multipart data',
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ slug: 'office' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Choose one file',
    });
  });

  test('rejects an unsupported extension', async () => {
    const response = await post([
      new File([new Uint8Array([1])], 'notes.txt', { type: 'text/plain' }),
    ]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Use JPG, PNG, WebP, or PDF',
    });
  });

  test('rejects a MIME type that does not match the extension', async () => {
    const response = await post([
      new File([new Uint8Array([1])], 'photo.jpg', { type: 'image/png' }),
    ]);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'File type does not match its extension',
    });
  });

  test('returns a server error when the file cannot be stored', async () => {
    await fs.writeFile(path.join(temporaryToursDir, 'blocked'), 'not a folder');

    const response = await post(
      [new File([new Uint8Array([1])], 'photo.jpg', { type: 'image/jpeg' })],
      'blocked'
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Could not store file',
    });
  });

  test('retries a filename collision without overwriting the existing file', async () => {
    const originalWriteFile = fs.writeFile.bind(fs);
    const existingBytes = Buffer.from('existing marker asset');
    const uploadedBytes = new Uint8Array([7, 8, 9]);
    let collidedPath = '';

    const writeFileSpy = jest
      .spyOn(fs, 'writeFile')
      .mockImplementationOnce(async (target) => {
        collidedPath = target.toString();
        await originalWriteFile(target, existingBytes, { flag: 'wx' });
        throw Object.assign(new Error('file exists'), { code: 'EEXIST' });
      });

    const response = await post([
      new File([uploadedBytes], 'collision.png', { type: 'image/png' }),
    ]);

    expect(response.status).toBe(200);
    const result = (await response.json()) as { filename: string };
    expect(writeFileSpy).toHaveBeenCalledTimes(2);
    expect(writeFileSpy).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.anything(),
      { flag: 'wx' }
    );
    expect(writeFileSpy).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      { flag: 'wx' }
    );
    expect(result.filename).not.toBe(path.basename(collidedPath));
    await expect(fs.readFile(collidedPath)).resolves.toEqual(existingBytes);
    await expect(
      fs.readFile(
        path.join(temporaryToursDir, 'office', 'markers', result.filename)
      )
    ).resolves.toEqual(Buffer.from(uploadedBytes));
  });

  test('returns a server error after five filename collisions', async () => {
    const writeFileSpy = jest.spyOn(fs, 'writeFile').mockImplementation(
      async () => {
        throw Object.assign(new Error('file exists'), { code: 'EEXIST' });
      }
    );

    const response = await post([
      new File([new Uint8Array([1])], 'collision.png', { type: 'image/png' }),
    ]);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Could not store file',
    });
    expect(writeFileSpy).toHaveBeenCalledTimes(5);
    for (const call of writeFileSpy.mock.calls) {
      expect(call[2]).toEqual({ flag: 'wx' });
    }
  });
});
