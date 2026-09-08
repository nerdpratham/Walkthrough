import type { FloorPlanMarker, InfoMarker, TourConfig } from '@/lib/types';
import {
  addFloorPlanMarker,
  addInfoMarker,
  addLink,
  removeFloorPlanMarker,
  removeInfoMarker,
  removeLink,
  setFloorPlan,
  setGuidedTour,
  setNadir,
  setTransition,
  updateFloorPlanMarker,
  updateInfoMarker,
  updateLink,
  updateLinkTransitionOverride,
  updateScene,
} from './editor-state';

const config: TourConfig = {
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
      links: [{
        toScene: 'b',
        hotspotYaw: 0,
        hotspotPitch: -8,
        arrivalYaw: 180,
        arrivalPitch: 0,
        priority: 'primary',
        style: 'chevron',
      }],
      infoMarkers: [],
    },
    {
      id: 'b',
      label: 'B',
      zone: 'z1',
      panorama: '/b.jpg',
      defaultYaw: 0, defaultPitch: 0,
      links: [],
      infoMarkers: [],
    },
  ],
};

test('updates a scene immutably', () => {
  const next = updateScene(config, 'a', { label: 'Entrance', defaultYaw: 45 });
  expect(next.scenes[0].label).toBe('Entrance');
  expect(next.scenes[0].defaultYaw).toBe(45);
  expect(config.scenes[0].label).toBe('A');
});

test('updates a link immutably', () => {
  const next = updateLink(config, 'a', 0, { hotspotYaw: 90, priority: 'secondary' });
  expect(next.scenes[0].links[0].hotspotYaw).toBe(90);
  expect(next.scenes[0].links[0].priority).toBe('secondary');
  expect(config.scenes[0].links[0].hotspotYaw).toBe(0);
});

test('adds and removes links', () => {
  const added = addLink(config, 'b', {
    toScene: 'a',
    hotspotYaw: 180,
    hotspotPitch: -8,
    arrivalYaw: 0,
    arrivalPitch: 0,
    priority: 'primary',
    style: 'chevron',
  });
  expect(added.scenes[1].links).toHaveLength(1);

  const removed = removeLink(added, 'b', 0);
  expect(removed.scenes[1].links).toHaveLength(0);
});

describe('updateLinkTransitionOverride', () => {
  it('sets a new transitionOverride from scratch', () => {
    const result = updateLinkTransitionOverride(config, 'a', 0, { speedMs: 1400 });
    expect(result.scenes[0].links[0].transitionOverride?.speedMs).toBe(1400);
  });

  it('merges into an existing override without losing other fields', () => {
    const withOverride: TourConfig = {
      ...config,
      scenes: [{
        ...config.scenes[0],
        links: [{
          ...config.scenes[0].links[0],
          transitionOverride: { effect: 'crossfade', speedMs: 1400 },
        }],
      }, config.scenes[1]],
    };
    const result = updateLinkTransitionOverride(withOverride, 'a', 0, { zoomLevel: 70 });
    expect(result.scenes[0].links[0].transitionOverride).toEqual({
      effect: 'crossfade',
      speedMs: 1400,
      zoomLevel: 70,
    });
  });

  it('does not mutate the original config', () => {
    updateLinkTransitionOverride(config, 'a', 0, { speedMs: 1400 });
    expect(config.scenes[0].links[0].transitionOverride).toBeUndefined();
  });
});

test('updates transition and nadir settings', () => {
  const withTransition = setTransition(config, { speedMs: 1200, rotation: false });
  expect(withTransition.meta.transition.speedMs).toBe(1200);
  expect(withTransition.meta.transition.rotation).toBe(false);

  const withNadir = setNadir(config, { enabled: true, image: '/logo.svg', opacity: 0.7 });
  expect(withNadir.meta.nadir.enabled).toBe(true);
  expect(withNadir.meta.nadir.image).toBe('/logo.svg');
  expect(withNadir.meta.nadir.opacity).toBe(0.7);
});

const marker: InfoMarker = { id: 'mk1', yaw: 45, pitch: -10, enabled: true, imageDisplay: 'lightbox', showLabel: false, title: 'Desk' };

describe('addInfoMarker', () => {
  it('appends marker to scene infoMarkers', () => {
    const result = addInfoMarker(config, 'a', marker);
    expect(result.scenes[0].infoMarkers).toHaveLength(1);
    expect(result.scenes[0].infoMarkers[0]).toEqual(marker);
  });

  it('does not mutate input config', () => {
    addInfoMarker(config, 'a', marker);
    expect(config.scenes[0].infoMarkers).toHaveLength(0);
  });

  it('leaves other scenes unchanged', () => {
    const result = addInfoMarker(config, 'a', marker);
    expect(result.scenes[1].infoMarkers).toHaveLength(0);
  });
});

describe('updateInfoMarker', () => {
  const withMarker = addInfoMarker(config, 'a', marker);

  it('patches a single field by marker id', () => {
    const result = updateInfoMarker(withMarker, 'a', 'mk1', { title: 'Updated' });
    expect(result.scenes[0].infoMarkers[0].title).toBe('Updated');
    expect(result.scenes[0].infoMarkers[0].yaw).toBe(45);
  });

  it('preserves id even if patch includes id', () => {
    const result = updateInfoMarker(withMarker, 'a', 'mk1', { id: 'hacked' } as any);
    expect(result.scenes[0].infoMarkers[0].id).toBe('mk1');
  });

  it('does not touch other markers', () => {
    const m2: InfoMarker = { id: 'mk2', yaw: 90, pitch: 0, enabled: true, imageDisplay: 'lightbox', showLabel: false };
    const twoMarkers = addInfoMarker(addInfoMarker(config, 'a', marker), 'a', m2);
    const result = updateInfoMarker(twoMarkers, 'a', 'mk1', { title: 'X' });
    expect(result.scenes[0].infoMarkers[1].id).toBe('mk2');
    expect(result.scenes[0].infoMarkers[1].title).toBeUndefined();
  });
});

describe('removeInfoMarker', () => {
  const withMarker = addInfoMarker(config, 'a', marker);

  it('removes marker by id', () => {
    const result = removeInfoMarker(withMarker, 'a', 'mk1');
    expect(result.scenes[0].infoMarkers).toHaveLength(0);
  });

  it('does not mutate input config', () => {
    removeInfoMarker(withMarker, 'a', 'mk1');
    expect(withMarker.scenes[0].infoMarkers).toHaveLength(1);
  });
});

test('setGuidedTour stores step objects and clears when empty', () => {
  const next = setGuidedTour(config, [{ sceneId: 'b' }, { sceneId: 'a', label: 'Lobby' }]);
  expect(next.meta.guidedTour).toEqual([{ sceneId: 'b' }, { sceneId: 'a', label: 'Lobby' }]);
  expect(config.meta.guidedTour).toBeUndefined();
  expect(setGuidedTour(next, []).meta.guidedTour).toBeUndefined();
});

function markersOf(cfg: TourConfig): FloorPlanMarker[] {
  const fp = cfg.meta.floorPlan;
  return fp === false ? [] : fp.markers;
}

test('setFloorPlan turns on a floor plan from off', () => {
  const next = setFloorPlan(config, { image: '/tours/office/floorplan.png' });
  expect(next.meta.floorPlan).toEqual({ image: '/tours/office/floorplan.png', markers: [] });
  expect(config.meta.floorPlan).toBe(false);
});

test('setFloorPlan merges a patch onto an existing floor plan', () => {
  const withPlan = setFloorPlan(config, { image: '/floorplan.png' });
  const next = setFloorPlan(withPlan, { image: '/floorplan-v2.png' });
  expect(next.meta.floorPlan).toEqual({ image: '/floorplan-v2.png', markers: [] });
});

test('setFloorPlan clears back to false when the image is emptied', () => {
  const withPlan = setFloorPlan(config, { image: '/floorplan.png' });
  const next = setFloorPlan(withPlan, { image: '' });
  expect(next.meta.floorPlan).toBe(false);
});

test('addFloorPlanMarker appends a marker', () => {
  const withPlan = setFloorPlan(config, { image: '/floorplan.png' });
  const next = addFloorPlanMarker(withPlan, { sceneId: 'a', x: 10, y: 20, size: 20 });
  expect(markersOf(next)).toEqual([{ sceneId: 'a', x: 10, y: 20, size: 20 }]);
});

test('addFloorPlanMarker is a no-op when there is no floor plan', () => {
  const next = addFloorPlanMarker(config, { sceneId: 'a', x: 10, y: 20, size: 20 });
  expect(next).toBe(config);
});

test('updateFloorPlanMarker patches the marker at the given index', () => {
  const withPlan = setFloorPlan(config, { image: '/floorplan.png' });
  const withMarker = addFloorPlanMarker(withPlan, { sceneId: 'a', x: 10, y: 20, size: 20 });
  const next = updateFloorPlanMarker(withMarker, 0, { label: '1', x: 15 });
  expect(markersOf(next)).toEqual([{ sceneId: 'a', x: 15, y: 20, size: 20, label: '1' }]);
});

test('removeFloorPlanMarker removes the marker at the given index', () => {
  const withPlan = setFloorPlan(config, { image: '/floorplan.png' });
  const withTwo = addFloorPlanMarker(
    addFloorPlanMarker(withPlan, { sceneId: 'a', x: 10, y: 20, size: 20 }),
    { sceneId: 'b', x: 30, y: 40, size: 20 },
  );
  const next = removeFloorPlanMarker(withTwo, 0);
  expect(markersOf(next)).toEqual([{ sceneId: 'b', x: 30, y: 40, size: 20 }]);
});
