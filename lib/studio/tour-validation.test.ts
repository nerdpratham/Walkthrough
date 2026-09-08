import type { TourConfig } from '@/lib/types';
import { validateTourDraft } from './tour-validation';

function baseConfig(): TourConfig {
  return {
    meta: {
      title: 'Office',
      site: 'office',
      startScene: 'a',
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
      nadir: {
        enabled: false,
        size: 360,
        opacity: 0.9,
      },
    },
    zones: [{ id: 'z1', label: 'Zone 1' }],
    scenes: [
      {
        id: 'a',
        label: 'A',
        zone: 'z1',
        panorama: '/a.jpg',
        defaultYaw: 0, defaultPitch: 0,
        links: [
          { toScene: 'b', hotspotYaw: 0, hotspotPitch: -8, arrivalYaw: 0, arrivalPitch: 0, priority: 'primary', style: 'chevron' },
        ],
        infoMarkers: [],
      },
      {
        id: 'b',
        label: 'B',
        zone: 'z1',
        panorama: '/b.jpg',
        defaultYaw: 0, defaultPitch: 0,
        links: [
          { toScene: 'a', hotspotYaw: 180, hotspotPitch: -8, arrivalYaw: 0, arrivalPitch: 0, priority: 'primary', style: 'chevron' },
        ],
        infoMarkers: [],
      },
    ],
  };
}

test('accepts a valid draft with warnings for all-zero arrival yaw', () => {
  const result = validateTourDraft(baseConfig());
  expect(result.errors).toEqual([]);
  expect(result.warnings.some((warning) => warning.code === 'all-arrival-yaw-zero')).toBe(true);
});

test('reports missing start scene', () => {
  const config = baseConfig();
  config.meta.startScene = 'missing';
  const result = validateTourDraft(config);
  expect(result.errors.some((error) => error.code === 'missing-start-scene')).toBe(true);
});

test('reports broken link targets and missing zones', () => {
  const config = baseConfig();
  config.scenes[0].zone = 'missing-zone';
  config.scenes[0].links[0].toScene = 'missing-scene';
  const result = validateTourDraft(config);
  expect(result.errors.some((error) => error.code === 'missing-zone')).toBe(true);
  expect(result.errors.some((error) => error.code === 'broken-link-target')).toBe(true);
});

test('warns when too many visible links exist in one scene', () => {
  const config = baseConfig();
  config.scenes[0].links = [0, 20, 40, 60, 80].map((yaw) => ({
    toScene: 'b',
    hotspotYaw: yaw,
    hotspotPitch: -8,
    arrivalYaw: 0,
    arrivalPitch: 0,
    priority: 'primary' as const,
    style: 'chevron' as const,
  }));
  const result = validateTourDraft(config);
  expect(result.warnings.some((warning) => warning.code === 'too-many-visible-links')).toBe(true);
});

test('warns when visible links are clustered in yaw', () => {
  const config = baseConfig();
  config.scenes[0].links = [0, 8].map((yaw) => ({
    toScene: 'b',
    hotspotYaw: yaw,
    hotspotPitch: -8,
    arrivalYaw: 0,
    arrivalPitch: 0,
    priority: 'primary' as const,
    style: 'chevron' as const,
  }));
  const result = validateTourDraft(config);
  expect(result.warnings.some((warning) => warning.code === 'clustered-visible-links')).toBe(true);
});
