import {
  getPsvTransitionOptions,
  getWalkMotion,
  resolveLinkTransition,
  waitForViewerReadyFrame,
} from './viewer-transition';

describe('resolveLinkTransition', () => {
  const global = {
    effect: 'walk-in' as const,
    speedMs: 900,
    rotation: false,
    zoomLevel: 55,
    blendMs: 360,
  };

  it('uses global transition values when a link has no override', () => {
    expect(resolveLinkTransition(global, null)).toEqual({
      effect: 'walk-in',
      speedMs: 900,
      zoomLevel: 55,
      blendMs: 360,
    });
  });

  it('merges partial per-link transition overrides with global values', () => {
    expect(resolveLinkTransition(global, { speedMs: 1400 })).toEqual({
      effect: 'walk-in',
      speedMs: 1400,
      zoomLevel: 55,
      blendMs: 360,
    });
  });
});

describe('getWalkMotion', () => {
  it('computes a visible walk-in overlay and wide arrival zoom at the default HQ zoom intensity', () => {
    expect(getWalkMotion('walk-in', 50, 55, 900)).toEqual({
      sourceEndZoom: 71,
      sourceSpeed: 540,
      arrivalStartZoom: 38,
      revealSpeed: 630,
      settleZoom: 50,
      frameScale: 1.12,
    });
  });

  it('computes a stronger fly-in overlay than walk-in', () => {
    expect(getWalkMotion('fly-in', 50, 55, 900)).toEqual({
      sourceEndZoom: 78,
      sourceSpeed: 630,
      arrivalStartZoom: 34,
      revealSpeed: 630,
      settleZoom: 50,
      frameScale: 1.18,
    });
  });

  it('clamps the wide arrival zoom to PSV zoom bounds', () => {
    expect(getWalkMotion('walk-in', 10, 100, 900).arrivalStartZoom).toBe(0);
  });

  it('uses transition duration to scale camera animation speeds', () => {
    expect(getWalkMotion('walk-in', 50, 55, 400).sourceSpeed).toBe(320);
    expect(getWalkMotion('walk-in', 50, 55, 1600).sourceSpeed).toBe(960);
    expect(getWalkMotion('walk-in', 50, 55, 1600).revealSpeed).toBe(920);
  });
});

describe('getPsvTransitionOptions', () => {
  const rotateTo = { yaw: '90deg', pitch: '-10deg' };

  it('uses a native fade with arrival rotation for walk-in and fly-in', () => {
    expect(getPsvTransitionOptions({
      effect: 'walk-in',
      speedMs: 900,
      rotation: false,
      rotateTo,
      customEngine: false,
    })).toEqual({
      effect: 'fade',
      speed: 900,
      rotation: true,
      showLoader: false,
      rotateTo,
    });
  });

  it('forces instant PSV swapping for overlay effects', () => {
    expect(getPsvTransitionOptions({
      effect: 'radial-fade',
      speedMs: 900,
      rotation: false,
      rotateTo,
      customEngine: true,
    })).toEqual({
      effect: 'none',
      speed: 0,
      rotation: false,
      showLoader: false,
      rotateTo,
    });
  });

  it('forces instant PSV swapping for covered walk-in and fly-in swaps', () => {
    expect(getPsvTransitionOptions({
      effect: 'walk-in',
      speedMs: 900,
      rotation: false,
      rotateTo,
      customEngine: true,
      zoomTo: 38,
    })).toEqual({
      effect: 'none',
      speed: 0,
      rotation: false,
      showLoader: false,
      rotateTo,
      zoomTo: 38,
    });
  });
});

describe('waitForViewerReadyFrame', () => {
  const originalRaf = global.requestAnimationFrame;

  beforeEach(() => {
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => (
      callback(performance.now()), 1
    ));
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRaf;
  });

  it('waits for a render event after the viewer is ready before resolving', async () => {
    const listeners = new Map<string, () => void>();
    const viewer = {
      state: { ready: true },
      addEventListener: jest.fn((type: string, callback: () => void) => listeners.set(type, callback)),
      removeEventListener: jest.fn((type: string) => listeners.delete(type)),
      needsUpdate: jest.fn(),
    };

    let resolved = false;
    const promise = waitForViewerReadyFrame(viewer).then(() => { resolved = true; });

    await Promise.resolve();
    expect(viewer.needsUpdate).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);

    listeners.get('render')?.();
    await promise;

    expect(resolved).toBe(true);
    expect(viewer.removeEventListener).toHaveBeenCalledWith('render', expect.any(Function));
  });
});
