import { toPsvNodes } from '@/lib/psv-adapter';
import type { TourConfig } from '@/lib/types';

const config: TourConfig = {
  meta: {
    title: 'T',
    site: 's',
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
      id: 'a', label: 'Scene A', zone: 'z1',
      panorama: '/tours/t/panoramas/a.jpg', defaultYaw: 30, defaultPitch: 0,
      links: [
        {
          toScene: 'b',
          hotspotYaw: 45,
          hotspotPitch: -15,
          arrivalYaw: -135,
          arrivalPitch: 0,
          priority: 'primary',
          style: 'chevron',
        },
      ],
      infoMarkers: [],
    },
    {
      id: 'b', label: 'Scene B', zone: 'z1',
      panorama: '/tours/t/panoramas/b.jpg', defaultYaw: 0, defaultPitch: 0,
      links: [],
      infoMarkers: [],
    },
  ],
};

test('produces one node per scene', () => {
  expect(toPsvNodes(config)).toHaveLength(2);
});

test('node id and panorama match scene', () => {
  const nodes = toPsvNodes(config);
  expect(nodes[0].id).toBe('a');
  expect(nodes[0].panorama).toBe('/tours/t/panoramas/a.jpg');
});

test('link nodeId maps to toScene', () => {
  expect(toPsvNodes(config)[0].links[0].nodeId).toBe('b');
});

test('link position uses degree strings', () => {
  const pos = toPsvNodes(config)[0].links[0].position as { yaw: string; pitch: string };
  expect(pos.yaw).toBe('45deg');
  expect(pos.pitch).toBe('-15deg');
});

test('arrivalYaw is stored in link data', () => {
  expect(toPsvNodes(config)[0].links[0].data?.arrivalYaw).toBe(-135);
});

test('defaultYaw is stored in node data', () => {
  expect(toPsvNodes(config)[0].data?.defaultYaw).toBe(30);
});

test('node with no links produces empty links array', () => {
  expect(toPsvNodes(config)[1].links).toEqual([]);
});

test('link metadata includes editor priority, style, and label', () => {
  const richConfig: TourConfig = {
    ...config,
    scenes: [{
      ...config.scenes[0],
      links: [{
        toScene: 'b',
        hotspotYaw: 45,
        hotspotPitch: -15,
        arrivalYaw: -135,
        arrivalPitch: 0,
        priority: 'secondary',
        style: 'dot',
        label: 'Go deeper',
      }],
    }, config.scenes[1]],
  };

  expect(toPsvNodes(richConfig)[0].links[0].data).toEqual({
    arrivalYaw: -135,
    arrivalPitch: 0,
    priority: 'secondary',
    style: 'dot',
    label: 'Go deeper',
    transitionOverride: null,
  });
});

test('nadir marker is added when enabled', () => {
  const richConfig: TourConfig = {
    ...config,
    meta: {
      ...config.meta,
      nadir: { enabled: true, image: '/logo.svg', size: 420, opacity: 0.8 },
    },
  };

  const node = toPsvNodes(richConfig)[0] as any;
  expect(node.markers[0]).toMatchObject({
    id: 'nadir-patch',
    imageLayer: '/logo.svg',
    opacity: 0.8,
  });
});

test('transitionOverride is passed through to link data when set', () => {
  const withOverride: TourConfig = {
    ...config,
    scenes: [{
      ...config.scenes[0],
      links: [{
        toScene: 'b',
        hotspotYaw: 45,
        hotspotPitch: -15,
        arrivalYaw: -135,
        arrivalPitch: 0,
        priority: 'primary',
        style: 'dot',
        transitionOverride: { effect: 'crossfade', speedMs: 1400, zoomLevel: 70, blendMs: 420 },
      }],
    }, config.scenes[1]],
  };
  expect(toPsvNodes(withOverride)[0].links[0].data.transitionOverride).toEqual({
    effect: 'crossfade', speedMs: 1400, zoomLevel: 70, blendMs: 420,
  });
});

test('transitionOverride is null in link data when not specified', () => {
  expect(toPsvNodes(config)[0].links[0].data.transitionOverride).toBeNull();
});

test('hidden priority links are omitted from PSV nodes', () => {
  const richConfig: TourConfig = {
    ...config,
    scenes: [{
      ...config.scenes[0],
      links: [{
        toScene: 'b',
        hotspotYaw: 45,
        hotspotPitch: -15,
        arrivalYaw: -135,
        arrivalPitch: 0,
        priority: 'hidden',
        style: 'chevron',
      }],
    }, config.scenes[1]],
  };

  expect(toPsvNodes(richConfig)[0].links).toEqual([]);
});

test('info markers are included in node markers array', () => {
  const withMarkers: TourConfig = {
    ...config,
    scenes: [{
      ...config.scenes[0],
      infoMarkers: [{ id: 'mk1', yaw: 45, pitch: -10, enabled: true, imageDisplay: 'lightbox' as const, showLabel: false, title: 'Desk' }],
    }, config.scenes[1]],
  };
  const node = toPsvNodes(withMarkers)[0] as any;
  expect(node.markers).toHaveLength(1);
  expect(node.markers[0].id).toBe('info-mk1');
  expect(node.markers[0].data.infoMarker.title).toBe('Desk');
});

test('disabled info markers are excluded from node markers', () => {
  const withDisabled: TourConfig = {
    ...config,
    scenes: [{
      ...config.scenes[0],
      infoMarkers: [{ id: 'mk1', yaw: 45, pitch: -10, enabled: false, imageDisplay: 'lightbox' as const, showLabel: false }],
    }, config.scenes[1]],
  };
  const node = toPsvNodes(withDisabled)[0] as any;
  expect(node.markers).toHaveLength(0);
});

test('info marker position uses degree strings', () => {
  const withMarkers: TourConfig = {
    ...config,
    scenes: [{
      ...config.scenes[0],
      infoMarkers: [{ id: 'mk1', yaw: 90, pitch: -20, enabled: true, imageDisplay: 'lightbox' as const, showLabel: false }],
    }, config.scenes[1]],
  };
  const m = (toPsvNodes(withMarkers)[0] as any).markers[0];
  expect(m.position.yaw).toBe('90deg');
  expect(m.position.pitch).toBe('-20deg');
});
