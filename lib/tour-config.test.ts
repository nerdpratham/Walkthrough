import fs from 'fs/promises';
import { loadTourConfig } from '@/lib/tour-config';

jest.mock('fs/promises');

const mockConfig = {
  meta: { title: 'Test', site: 'test', startScene: 'scene-1' },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: [{ id: 'scene-1', label: 'Scene 1', zone: 'z1', panorama: '/p.jpg', defaultYaw: 0, defaultPitch: 0, links: [] }],
};

beforeEach(() => {
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
