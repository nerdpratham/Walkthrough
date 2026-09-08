import type { TourConfig } from '@/lib/types';
import { addScenesFromPanoramas } from './editor-state';

function blankConfig(overrides: Partial<TourConfig> = {}): TourConfig {
  return {
    meta: {
      title: 'New Tour',
      site: '',
      startScene: '',
      floorPlan: false,
      transition: {
        effect: 'crossfade',
        speedMs: 900,
        rotation: true,
        zoomToHotspot: true,
        zoomLevel: 55,
        blendMs: 360,
        lockInput: true,
      },
      nadir: { enabled: false, size: 360, opacity: 0.9 },
    },
    zones: [{ id: 'main', label: 'Main' }],
    scenes: [],
    ...overrides,
  };
}

test('creates one scene per panorama with the served URL and filename label', () => {
  const next = addScenesFromPanoramas(blankConfig(), 'tour-1', ['a.jpg', 'b.jpg']);

  expect(next.scenes).toHaveLength(2);
  expect(next.scenes[0]).toMatchObject({
    id: 'a',
    label: 'a',
    zone: 'main',
    panorama: '/tours/tour-1/panoramas/a.jpg',
    links: [],
    infoMarkers: [],
  });
  expect(next.scenes[1].panorama).toBe('/tours/tour-1/panoramas/b.jpg');
});

test('keeps the original filename as the label and url-encodes the path', () => {
  const next = addScenesFromPanoramas(blankConfig(), 'tour-1', ['Conference Room.jpg']);
  expect(next.scenes[0].label).toBe('Conference Room');
  expect(next.scenes[0].panorama).toBe('/tours/tour-1/panoramas/Conference%20Room.jpg');
});

test('sets startScene to the first scene when it was empty', () => {
  const next = addScenesFromPanoramas(blankConfig(), 'tour-1', ['a.jpg']);
  expect(next.meta.startScene).toBe('a');
});

test('keeps an existing startScene', () => {
  const cfg = blankConfig({
    meta: { ...blankConfig().meta, startScene: 'existing' },
    scenes: [{ id: 'existing', label: 'E', zone: 'main', panorama: '/tours/tour-1/panoramas/e.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] }],
  });
  const next = addScenesFromPanoramas(cfg, 'tour-1', ['a.jpg']);
  expect(next.meta.startScene).toBe('existing');
});

test('does not create a duplicate scene for an already-referenced panorama', () => {
  const cfg = blankConfig({
    scenes: [{ id: 'a', label: 'A', zone: 'main', panorama: '/tours/tour-1/panoramas/a.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] }],
    meta: { ...blankConfig().meta, startScene: 'a' },
  });
  const next = addScenesFromPanoramas(cfg, 'tour-1', ['a.jpg', 'b.jpg']);
  expect(next.scenes.map((s) => s.id)).toEqual(['a', 'b']);
});

test('disambiguates an id that collides with an existing scene id', () => {
  const cfg = blankConfig({
    scenes: [{ id: 'a', label: 'A', zone: 'main', panorama: '/tours/tour-1/panoramas/other.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] }],
    meta: { ...blankConfig().meta, startScene: 'a' },
  });
  const next = addScenesFromPanoramas(cfg, 'tour-1', ['a.jpg']);
  expect(next.scenes.map((s) => s.id)).toEqual(['a', 'a-2']);
});

test('uses the first zone id for new scenes', () => {
  const cfg = blankConfig({ zones: [{ id: 'floor1', label: 'Floor 1' }] });
  const next = addScenesFromPanoramas(cfg, 'tour-1', ['a.jpg']);
  expect(next.scenes[0].zone).toBe('floor1');
});

test('returns the same config when there is nothing new to add', () => {
  const cfg = blankConfig({
    scenes: [{ id: 'a', label: 'A', zone: 'main', panorama: '/tours/tour-1/panoramas/a.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] }],
    meta: { ...blankConfig().meta, startScene: 'a' },
  });
  const next = addScenesFromPanoramas(cfg, 'tour-1', ['a.jpg']);
  expect(next).toBe(cfg);
});
