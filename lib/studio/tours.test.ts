import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { listTours, deleteTour, renameTour } from '@/lib/studio/tours';

let tmpDir: string;
const prevDataDir = process.env.TOURS_DATA_DIR;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tours-test-'));
  process.env.TOURS_DATA_DIR = tmpDir;
});

afterEach(async () => {
  if (prevDataDir === undefined) {
    delete process.env.TOURS_DATA_DIR;
  } else {
    process.env.TOURS_DATA_DIR = prevDataDir;
  }
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeTour(slug: string, config: unknown) {
  const dir = path.join(tmpDir, slug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'tour.config.json'), JSON.stringify(config), 'utf-8');
}

describe('listTours', () => {
  test('returns empty array when the data dir does not exist', async () => {
    process.env.TOURS_DATA_DIR = path.join(tmpDir, 'does-not-exist');
    await expect(listTours()).resolves.toEqual([]);
  });

  test('summarises each tour with slug, title and scene count', async () => {
    await writeTour('tour-a', {
      meta: { title: 'Tour A', site: '', startScene: 's1' },
      zones: [{ id: 'main', label: 'Main' }],
      scenes: [
        { id: 's1', label: 'S1', zone: 'main', panorama: 'a.jpg' },
        { id: 's2', label: 'S2', zone: 'main', panorama: 'b.jpg' },
      ],
    });

    const tours = await listTours();

    expect(tours).toEqual([{ slug: 'tour-a', title: 'Tour A', sceneCount: 2 }]);
  });

  test('falls back to slug and zero scenes for an unreadable config', async () => {
    const dir = path.join(tmpDir, 'broken');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'tour.config.json'), 'not json', 'utf-8');

    const tours = await listTours();

    expect(tours).toEqual([{ slug: 'broken', title: 'broken', sceneCount: 0 }]);
  });

  test('ignores files that are not directories', async () => {
    await fs.writeFile(path.join(tmpDir, 'README.md'), 'hi', 'utf-8');
    await writeTour('tour-a', {
      meta: { title: 'Tour A', site: '', startScene: '' },
      zones: [],
      scenes: [],
    });

    const tours = await listTours();

    expect(tours.map((t) => t.slug)).toEqual(['tour-a']);
  });
});

describe('deleteTour', () => {
  test('removes the tour folder and everything in it', async () => {
    await writeTour('tour-a', {
      meta: { title: 'Tour A', site: '', startScene: '' },
      zones: [],
      scenes: [],
    });
    await deleteTour('tour-a');
    const tours = await listTours();
    expect(tours.find((t) => t.slug === 'tour-a')).toBeUndefined();
    await expect(fs.stat(path.join(tmpDir, 'tour-a'))).rejects.toThrow();
  });

  test('does not throw when the tour does not exist', async () => {
    await expect(deleteTour('nope')).resolves.toBeUndefined();
  });

  test('rejects a slug with path separators', async () => {
    await expect(deleteTour('../secrets')).rejects.toThrow();
  });
});

describe('renameTour', () => {
  test('changes the tour title on disk', async () => {
    await writeTour('tour-a', {
      meta: { title: 'Tour A', site: '', startScene: '' },
      zones: [],
      scenes: [],
    });
    await renameTour('tour-a', 'My Office');
    const tours = await listTours();
    expect(tours.find((t) => t.slug === 'tour-a')?.title).toBe('My Office');
  });

  test('rejects a slug with path separators', async () => {
    await expect(renameTour('../x', 'Hi')).rejects.toThrow();
  });
});
