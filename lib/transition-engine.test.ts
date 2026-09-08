import {
  getFrameHoldTiming,
  needsCustomEngine,
  playFrameHoldSwapTransition,
  playTransition,
} from './transition-engine';

describe('needsCustomEngine', () => {
  it('returns false for crossfade', () => expect(needsCustomEngine('crossfade')).toBe(false));
  it('returns false for none', () => expect(needsCustomEngine('none')).toBe(false));
  it('returns false for walk-in (handled by viewer camera flow)', () => expect(needsCustomEngine('walk-in')).toBe(false));
  it('returns false for fly-in (handled by viewer camera flow)', () => expect(needsCustomEngine('fly-in')).toBe(false));
  it('returns true for radial-fade', () => expect(needsCustomEngine('radial-fade')).toBe(true));
  it('returns true for vertical-wipe', () => expect(needsCustomEngine('vertical-wipe')).toBe(true));
});

describe('playTransition passthrough effects', () => {
  it('calls onMidpoint immediately for crossfade', async () => {
    const onMidpoint = jest.fn();
    const container = document.createElement('div');
    await playTransition({ effect: 'crossfade', speedMs: 0, zoomLevel: 55, container, onMidpoint });
    expect(onMidpoint).toHaveBeenCalledTimes(1);
  });

  it('calls onMidpoint immediately for none', async () => {
    const onMidpoint = jest.fn();
    const container = document.createElement('div');
    await playTransition({ effect: 'none', speedMs: 0, zoomLevel: 55, container, onMidpoint });
    expect(onMidpoint).toHaveBeenCalledTimes(1);
  });
});

describe('playTransition walk-in and fly-in', () => {
  it('calls onMidpoint immediately for walk-in', async () => {
    const onMidpoint = jest.fn();
    const container = document.createElement('div');
    await playTransition({ effect: 'walk-in', speedMs: 400, zoomLevel: 55, container, onMidpoint });
    expect(onMidpoint).toHaveBeenCalledTimes(1);
  });

  it('calls onMidpoint immediately for fly-in', async () => {
    const onMidpoint = jest.fn();
    const container = document.createElement('div');
    await playTransition({ effect: 'fly-in', speedMs: 400, zoomLevel: 55, container, onMidpoint });
    expect(onMidpoint).toHaveBeenCalledTimes(1);
  });
});

describe('playTransition overlay effects', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('creates and removes overlay div for radial-fade', async () => {
    const onMidpoint = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const promise = playTransition({ effect: 'radial-fade', speedMs: 400, zoomLevel: 55, container, onMidpoint });
    expect(container.children.length).toBe(1);
    jest.advanceTimersByTime(400);
    await promise;
    expect(container.children.length).toBe(0);
    document.body.removeChild(container);
  });

  it('calls onMidpoint at halfway for vertical-wipe', async () => {
    const onMidpoint = jest.fn();
    const container = document.createElement('div');
    const promise = playTransition({ effect: 'vertical-wipe', speedMs: 400, zoomLevel: 55, container, onMidpoint });
    expect(onMidpoint).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(onMidpoint).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(200);
    await promise;
  });
});

describe('playFrameHoldSwapTransition', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('uses most of transition speed for revealing the new scene', () => {
    expect(getFrameHoldTiming(900)).toEqual({ preFadeMs: 120, revealMs: 630 });
  });

  it('uses blendMs when provided for the visual handoff', () => {
    expect(getFrameHoldTiming(900, 800)).toEqual({ preFadeMs: 120, revealMs: 800 });
    expect(getFrameHoldTiming(900, 0)).toEqual({ preFadeMs: 120, revealMs: 0 });
  });

  it('holds the captured old frame while swapping, then fades it away during reveal', async () => {
    const onSwap = jest.fn(() => Promise.resolve());
    const onRevealStart = jest.fn(() => Promise.resolve());
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = playFrameHoldSwapTransition({
      speedMs: 900,
      blendMs: 800,
      frameScale: 1.14,
      container,
      captureFrame: () => 'data:image/png;base64,old-frame',
      onSwap,
      onRevealStart,
    });

    expect(container.children.length).toBe(1);
    const overlay = container.children[0] as HTMLElement;
    expect(overlay.style.backgroundImage).toContain('old-frame');
    expect(overlay.style.backgroundColor).toBe('');
    expect(overlay.style.transform).toBe('translateZ(0)');
    expect(onSwap).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(120);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(onRevealStart).toHaveBeenCalledTimes(1);
    expect(overlay.style.transform).toBe('scale(1.14)');

    jest.advanceTimersByTime(800);
    await promise;
    expect(container.children.length).toBe(0);

    document.body.removeChild(container);
  });
});
