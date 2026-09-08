import type { Scene, TourConfig } from '@/lib/types';
import { removeScene } from './editor-state';

function scene(id: string, links: { toScene: string }[] = []): Scene {
  return {
    id,
    label: id,
    zone: 'main',
    panorama: `/tours/t/panoramas/${id}.jpg`,
    defaultYaw: 0,
    defaultPitch: 0,
    links: links.map((l) => ({
      toScene: l.toScene,
      hotspotYaw: 0,
      hotspotPitch: 0,
      arrivalYaw: 0,
      arrivalPitch: 0,
      priority: 'primary',
      style: 'chevron',
    })),
    infoMarkers: [],
  };
}

function config(scenes: Scene[], startScene: string): TourConfig {
  return {
    meta: {
      title: 'T',
      site: '',
      startScene,
      floorPlan: false,
      transition: { effect: 'crossfade', speedMs: 900, rotation: true, zoomToHotspot: true, zoomLevel: 55, blendMs: 360, lockInput: true },
      nadir: { enabled: false, size: 360, opacity: 0.9 },
    },
    zones: [{ id: 'main', label: 'Main' }],
    scenes,
  };
}

test('removes the scene', () => {
  const next = removeScene(config([scene('a'), scene('b')], 'a'), 'b');
  expect(next.scenes.map((s) => s.id)).toEqual(['a']);
});

test('removes dangling links that pointed to the deleted scene', () => {
  const cfg = config([scene('a', [{ toScene: 'b' }, { toScene: 'a' }]), scene('b')], 'a');
  const next = removeScene(cfg, 'b');
  expect(next.scenes[0].links.map((l) => l.toScene)).toEqual(['a']);
});

test('updates startScene when the start scene is removed', () => {
  const next = removeScene(config([scene('a'), scene('b')], 'a'), 'a');
  expect(next.meta.startScene).toBe('b');
});

test('keeps startScene when a different scene is removed', () => {
  const next = removeScene(config([scene('a'), scene('b')], 'a'), 'b');
  expect(next.meta.startScene).toBe('a');
});

test('removing the last scene leaves an empty tour with no startScene', () => {
  const next = removeScene(config([scene('a')], 'a'), 'a');
  expect(next.scenes).toEqual([]);
  expect(next.meta.startScene).toBe('');
});
