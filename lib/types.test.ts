import { TourConfigSchema } from '@/lib/types';

const minimal: unknown = {
  meta: { title: 'Test', site: 'test', startScene: 'a' },
  zones: [{ id: 'z1', label: 'Zone 1' }],
  scenes: [{
    id: 'a', label: 'A', zone: 'z1',
    panorama: '/p.jpg', defaultYaw: 0, defaultPitch: 0,
    links: [{ toScene: 'b', hotspotYaw: 45, hotspotPitch: -15, arrivalYaw: -135 }],
  }],
};

test('parses valid config', () => {
  expect(() => TourConfigSchema.parse(minimal)).not.toThrow();
});

test('rejects missing meta.title', () => {
  const bad = { ...minimal as any, meta: { site: 'x', startScene: 'a' } };
  expect(() => TourConfigSchema.parse(bad)).toThrow();
});

test('defaults floorPlan to false', () => {
  const result = TourConfigSchema.parse(minimal);
  expect(result.meta.floorPlan).toBe(false);
});

test('accepts floorPlan as object with image and markers', () => {
  const result = TourConfigSchema.parse({
    ...minimal as any,
    meta: {
      ...(minimal as any).meta,
      floorPlan: {
        image: '/tours/test/floorplan.png',
        markers: [
          { sceneId: 'a', x: 10, y: 20, label: '1', size: 24 },
          { sceneId: 'a', x: 50, y: 80 },
        ],
      },
    },
  });
  const fp = result.meta.floorPlan;
  expect(fp).not.toBe(false);
  if (fp === false) return;
  expect(fp.image).toBe('/tours/test/floorplan.png');
  expect(fp.markers).toHaveLength(2);
  expect(fp.markers[0].label).toBe('1');
  expect(fp.markers[0].size).toBe(24);
  expect(fp.markers[1].size).toBe(20);
  expect(fp.markers[1].label).toBeUndefined();
});

test('accepts floorPlan with image only, defaults markers to empty', () => {
  const result = TourConfigSchema.parse({
    ...minimal as any,
    meta: { ...(minimal as any).meta, floorPlan: { image: '/fp.png' } },
  });
  const fp = result.meta.floorPlan;
  if (fp === false) { expect(fp).not.toBe(false); return; }
  expect(fp.markers).toEqual([]);
});

test('rejects floorPlan marker with x out of range', () => {
  expect(() => TourConfigSchema.parse({
    ...minimal as any,
    meta: {
      ...(minimal as any).meta,
      floorPlan: { image: '/fp.png', markers: [{ sceneId: 'a', x: 105, y: 20 }] },
    },
  })).toThrow();
});

test('defaults links to empty array', () => {
  const noLinks = {
    ...minimal as any,
    scenes: [{ id: 'a', label: 'A', zone: 'z1', panorama: '/p.jpg', defaultYaw: 0 }],
  };
  const result = TourConfigSchema.parse(noLinks);
  expect(result.scenes[0].links).toEqual([]);
});

test('defaults link priority, style, and label fields', () => {
  const result = TourConfigSchema.parse(minimal);
  expect(result.scenes[0].links[0].priority).toBe('primary');
  expect(result.scenes[0].links[0].style).toBe('dot');
  expect(result.scenes[0].links[0].label).toBeUndefined();
});

test('defaults transition and nadir settings', () => {
  const result = TourConfigSchema.parse(minimal);
  expect(result.meta.transition).toEqual({
    effect: 'crossfade',
    speedMs: 900,
    rotation: true,
    zoomToHotspot: true,
    zoomLevel: 55,
    blendMs: 360,
    lockInput: true,
  });
  expect(result.meta.nadir).toEqual({
    enabled: false,
    size: 360,
    opacity: 0.9,
  });
});

describe('EffectSchema backwards compat', () => {
  it('coerces legacy "fade" to "crossfade"', () => {
    const raw = { effect: 'fade', speedMs: 900, rotation: false, zoomToHotspot: true, zoomLevel: 55, blendMs: 240, lockInput: true };
    const result = TourConfigSchema.shape.meta.shape.transition.parse(raw);
    expect(result.effect).toBe('crossfade');
  });

  it('accepts all 6 new effect values', () => {
    const effects = ['crossfade', 'walk-in', 'fly-in', 'radial-fade', 'vertical-wipe', 'none'];
    for (const effect of effects) {
      const raw = { effect, speedMs: 900, rotation: false, zoomToHotspot: true, zoomLevel: 55, blendMs: 240, lockInput: true };
      expect(() => TourConfigSchema.shape.meta.shape.transition.parse(raw)).not.toThrow();
    }
  });

  it('rejects unknown effect values', () => {
    const raw = { effect: 'dissolve', speedMs: 900, rotation: false, zoomToHotspot: true, zoomLevel: 55, blendMs: 240, lockInput: true };
    expect(() => TourConfigSchema.shape.meta.shape.transition.parse(raw)).toThrow();
  });

  it('accepts blendMs for walk-in and fly-in handoff fade', () => {
    const raw = { effect: 'walk-in', speedMs: 900, rotation: false, zoomToHotspot: true, zoomLevel: 55, blendMs: 800, lockInput: true };
    const result = TourConfigSchema.shape.meta.shape.transition.parse(raw);
    expect(result.blendMs).toBe(800);
  });
});

describe('transitionOverride in LinkSchema', () => {
  const baseConfig = (linkPatch: object) => TourConfigSchema.parse({
    meta: { title: 'T', site: 'S', startScene: 'a' },
    zones: [{ id: 'z', label: 'Z' }],
    scenes: [{ id: 'a', label: 'A', zone: 'z', panorama: '/a.jpg',
      links: [{ toScene: 'b', hotspotYaw: 0, hotspotPitch: -45, arrivalYaw: 0, ...linkPatch }] }],
  }).scenes[0].links[0];

  it('accepts a link with no transitionOverride', () => {
    expect(() => baseConfig({})).not.toThrow();
  });

  it('accepts a partial transitionOverride', () => {
    const link = baseConfig({ transitionOverride: { speedMs: 1400 } });
    expect(link.transitionOverride?.speedMs).toBe(1400);
    expect(link.transitionOverride?.effect).toBeUndefined();
  });

  it('accepts a full transitionOverride', () => {
    const link = baseConfig({ transitionOverride: { effect: 'crossfade', speedMs: 1400, zoomLevel: 70 } });
    expect(link.transitionOverride).toEqual({ effect: 'crossfade', speedMs: 1400, zoomLevel: 70 });
  });
});

test('accepts secondary and hidden link priorities', () => {
  const config = {
    ...minimal as any,
    scenes: [{
      id: 'a',
      label: 'A',
      zone: 'z1',
      panorama: '/p.jpg',
      links: [
        { toScene: 'b', hotspotYaw: 0, hotspotPitch: -8, arrivalYaw: 0, priority: 'secondary' },
        { toScene: 'c', hotspotYaw: 90, hotspotPitch: -8, arrivalYaw: 90, priority: 'hidden' },
      ],
    }],
  };

  const result = TourConfigSchema.parse(config);
  expect(result.scenes[0].links[0].priority).toBe('secondary');
  expect(result.scenes[0].links[1].priority).toBe('hidden');
});

describe('ThemeSchema', () => {
  it('meta.theme is absent by default', () => {
    const result = TourConfigSchema.parse(minimal);
    expect(result.meta.theme).toBeUndefined();
  });

  it('accepts a minimal theme (all optional/defaulted)', () => {
    const result = TourConfigSchema.parse({
      ...minimal as any,
      meta: { ...(minimal as any).meta, theme: {} },
    });
    expect(result.meta.theme).toEqual({
      overlayOpacity: 0.88,
      uiDensity: 'default',
      logoPosition: 'bottom-left',
    });
  });

  it('preserves accentColor when provided', () => {
    const result = TourConfigSchema.parse({
      ...minimal as any,
      meta: { ...(minimal as any).meta, theme: { accentColor: '#ff5500' } },
    });
    expect(result.meta.theme?.accentColor).toBe('#ff5500');
  });

  it('accepts compact uiDensity', () => {
    const result = TourConfigSchema.parse({
      ...minimal as any,
      meta: { ...(minimal as any).meta, theme: { uiDensity: 'compact' } },
    });
    expect(result.meta.theme?.uiDensity).toBe('compact');
  });

  it('rejects unknown uiDensity values', () => {
    expect(() => TourConfigSchema.parse({
      ...minimal as any,
      meta: { ...(minimal as any).meta, theme: { uiDensity: 'loose' } },
    })).toThrow();
  });

  it('rejects overlayOpacity outside 0-1', () => {
    expect(() => TourConfigSchema.parse({
      ...minimal as any,
      meta: { ...(minimal as any).meta, theme: { overlayOpacity: 1.5 } },
    })).toThrow();
  });
});

test('defaults infoMarkers to empty array', () => {
  const result = TourConfigSchema.parse(minimal);
  expect(result.scenes[0].infoMarkers).toEqual([]);
});

describe('InfoMarkerSchema', () => {
  it('accepts a minimal marker (id, yaw, pitch only)', () => {
    const result = TourConfigSchema.parse({
      ...minimal as any,
      scenes: [{ id: 'a', label: 'A', zone: 'z1', panorama: '/p.jpg',
        infoMarkers: [{ id: 'mk1', yaw: 45, pitch: -10 }] }],
    });
    const m = result.scenes[0].infoMarkers[0];
    expect(m.id).toBe('mk1');
    expect(m.enabled).toBe(true);
    expect(m.title).toBeUndefined();
    expect(m.body).toBeUndefined();
  });

  it('accepts a fully populated marker', () => {
    const raw = {
      id: 'mk1', yaw: 45, pitch: -10, enabled: false,
      title: 'T', tabTitle: 'Custom tab', body: 'B', imageUrl: '/img.jpg',
      imageDisplay: 'lightbox' as const, showLabel: false,
      documentUrl: '/doc.pdf', ctaLabel: 'Go', ctaUrl: 'https://x.com',
    };
    const result = TourConfigSchema.parse({
      ...minimal as any,
      scenes: [{ id: 'a', label: 'A', zone: 'z1', panorama: '/p.jpg', infoMarkers: [raw] }],
    });
    expect(result.scenes[0].infoMarkers[0]).toEqual(raw);
  });

  it('rejects a marker missing id', () => {
    expect(() => TourConfigSchema.parse({
      ...minimal as any,
      scenes: [{ id: 'a', label: 'A', zone: 'z1', panorama: '/p.jpg',
        infoMarkers: [{ yaw: 45, pitch: -10 }] }],
    })).toThrow();
  });
});

test('scene caption is optional and parses when present', () => {
  const withCaption = {
    ...(minimal as any),
    scenes: [{ id: 'a', label: 'A', zone: 'z1', panorama: '/p.jpg', caption: 'Front desk' }],
  };
  expect(TourConfigSchema.parse(minimal).scenes[0].caption).toBeUndefined();
  expect(TourConfigSchema.parse(withCaption).scenes[0].caption).toBe('Front desk');
});

test('meta.guidedTour is optional and normalizes strings to step objects', () => {
  expect(TourConfigSchema.parse(minimal).meta.guidedTour).toBeUndefined();
  const withStrings = { ...(minimal as any), meta: { ...(minimal as any).meta, guidedTour: ['a', 'b'] } };
  expect(TourConfigSchema.parse(withStrings).meta.guidedTour).toEqual([
    { sceneId: 'a' }, { sceneId: 'b' },
  ]);
  const withObjects = { ...(minimal as any), meta: { ...(minimal as any).meta, guidedTour: [
    { sceneId: 'a', label: 'Entrance' }, { sceneId: 'b' },
  ] } };
  expect(TourConfigSchema.parse(withObjects).meta.guidedTour).toEqual([
    { sceneId: 'a', label: 'Entrance' }, { sceneId: 'b' },
  ]);
});
