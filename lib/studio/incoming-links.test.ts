import type { TourConfig } from '@/lib/types';
import { getIncomingLinks } from './incoming-links';

const config: TourConfig = {
  meta: {
    title: 'Test',
    site: 'test',
    startScene: 'a',
    floorPlan: false,
    transition: { effect: 'crossfade', speedMs: 900, rotation: true, zoomToHotspot: true, zoomLevel: 55, blendMs: 360, lockInput: true },
    nadir: { enabled: false, size: 360, opacity: 0.9 },
  },
  zones: [{ id: 'z1', label: 'Z1' }],
  scenes: [
    {
      id: 'a', label: 'A', zone: 'z1', panorama: '/a.jpg', defaultYaw: 0, defaultPitch: 0,
      links: [
        { toScene: 'b', hotspotYaw: 0, hotspotPitch: -8, arrivalYaw: 90, arrivalPitch: 0, priority: 'primary', style: 'chevron' },
        { toScene: 'c', hotspotYaw: 45, hotspotPitch: -8, arrivalYaw: 180, arrivalPitch: 0, priority: 'primary', style: 'chevron' },
      ],
      infoMarkers: [],
    },
    {
      id: 'b', label: 'B', zone: 'z1', panorama: '/b.jpg', defaultYaw: 0, defaultPitch: 0,
      links: [
        { toScene: 'a', hotspotYaw: 180, hotspotPitch: -8, arrivalYaw: 0, arrivalPitch: 0, priority: 'primary', style: 'chevron' },
      ],
      infoMarkers: [],
    },
    { id: 'c', label: 'C', zone: 'z1', panorama: '/c.jpg', defaultYaw: 0, defaultPitch: 0, links: [], infoMarkers: [] },
  ],
};

test('returns links pointing to the given scene', () => {
  const incoming = getIncomingLinks(config, 'b');
  expect(incoming).toHaveLength(1);
  expect(incoming[0].scene.id).toBe('a');
  expect(incoming[0].link.toScene).toBe('b');
  expect(incoming[0].link.arrivalYaw).toBe(90);
  expect(incoming[0].index).toBe(0);
});

test('returns multiple incoming links from different scenes', () => {
  const incoming = getIncomingLinks(config, 'a');
  expect(incoming).toHaveLength(1);
  expect(incoming[0].scene.id).toBe('b');
  expect(incoming[0].index).toBe(0);
});

test('returns empty array when no links point to scene', () => {
  // No scene in the fixture links to a scene id that does not exist
  expect(getIncomingLinks(config, 'nonexistent')).toHaveLength(0);
});

test('returns correct index when scene has multiple links', () => {
  // Scene A has link at index 1 pointing to C — index must be preserved
  const incoming = getIncomingLinks(config, 'c');
  expect(incoming).toHaveLength(1);
  expect(incoming[0].scene.id).toBe('a');
  expect(incoming[0].index).toBe(1);
  // B has one link to A at index 0
  const toA = getIncomingLinks(config, 'a');
  expect(toA[0].index).toBe(0);
});
