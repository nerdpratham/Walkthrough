import fs from 'fs/promises';
import { loadTourConfig, invalidateTourConfig, clearTourConfigCache } from '@/lib/tour-config';

jest.mock('fs/promises');

const mockConfig = {
  meta: { title: 'Test', site: 'test', startScene: 'scene-1' },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: [{ id: 'scene-1', label: 'Scene 1', zone: 'z1', panorama: '/p.jpg', defaultYaw: 0, defaultPitch: 0, links: [] }],
};

beforeEach(() => {
  clearTourConfigCache();
  (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
});

test('loads and parses valid config', async () => {
  const config = await loadTourConfig('test-tour');
  expect(config.meta.title).toBe('Test');
  expect(config.scenes).toHaveLength(1);
});

test('throws on invalid config', async () => {
  (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({ invalid: true }));
  await expect(loadTourConfig('test-tour')).rejects.toThrow();
});

test('caches a config so a second load skips the disk read', async () => {
  const before = (fs.readFile as jest.Mock).mock.calls.length;
  await loadTourConfig('cache-test-tour');
  await loadTourConfig('cache-test-tour');
  expect((fs.readFile as jest.Mock).mock.calls.length - before).toBe(1);
});

test('invalidateTourConfig forces the next load to hit disk again', async () => {
  const before = (fs.readFile as jest.Mock).mock.calls.length;
  await loadTourConfig('invalidate-test-tour');
  invalidateTourConfig('invalidate-test-tour');
  await loadTourConfig('invalidate-test-tour');
  expect((fs.readFile as jest.Mock).mock.calls.length - before).toBe(2);
});

test('caches each slug independently', async () => {
  const before = (fs.readFile as jest.Mock).mock.calls.length;
  await loadTourConfig('independent-tour-a');
  await loadTourConfig('independent-tour-b');
  expect((fs.readFile as jest.Mock).mock.calls.length - before).toBe(2);
});
