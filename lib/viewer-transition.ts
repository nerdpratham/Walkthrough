import type { EffectName } from './types';

type TransitionOverride = {
  effect?: EffectName;
  speedMs?: number;
  zoomLevel?: number;
  blendMs?: number;
} | null | undefined;

export interface GlobalTransitionSettings {
  effect: EffectName;
  speedMs: number;
  rotation: boolean;
  zoomLevel: number;
  blendMs: number;
}

export interface ResolvedTransition {
  effect: EffectName;
  speedMs: number;
  zoomLevel: number;
  blendMs: number;
}

export interface WalkMotion {
  sourceEndZoom: number;
  sourceSpeed: number;
  arrivalStartZoom: number;
  revealSpeed: number;
  settleZoom: number;
  frameScale: number;
}

export interface PsvTransitionInput {
  effect: EffectName;
  speedMs: number;
  rotation: boolean;
  rotateTo: { yaw: string; pitch: string } | null;
  customEngine: boolean;
  zoomTo?: number | null;
}

type RenderReadyViewer = {
  state?: { ready?: boolean };
  addEventListener?: (type: string, callback: () => void) => void;
  removeEventListener?: (type: string, callback: () => void) => void;
  needsUpdate?: () => void;
};

export function resolveLinkTransition(
  global: GlobalTransitionSettings,
  override: TransitionOverride,
): ResolvedTransition {
  return {
    effect: override?.effect ?? global.effect,
    speedMs: override?.speedMs ?? global.speedMs,
    zoomLevel: override?.zoomLevel ?? global.zoomLevel,
    blendMs: override?.blendMs ?? global.blendMs,
  };
}

export function isWalkEffect(effect: EffectName): effect is 'walk-in' | 'fly-in' {
  return effect === 'walk-in' || effect === 'fly-in';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

function waitAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitBrowserFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await waitAnimationFrame();
  }
}

function waitViewerReady(viewer: RenderReadyViewer): Promise<void> {
  if (viewer.state?.ready) return Promise.resolve();

  return new Promise((resolve) => {
    const onReady = () => {
      viewer.removeEventListener?.('ready', onReady);
      resolve();
    };
    viewer.addEventListener?.('ready', onReady);
  });
}

export async function waitForViewerReadyFrame(viewer: RenderReadyViewer): Promise<void> {
  await waitViewerReady(viewer);

  await new Promise<void>((resolve) => {
    const onRender = () => {
      viewer.removeEventListener?.('render', onRender);
      resolve();
    };

    viewer.addEventListener?.('render', onRender);
    viewer.needsUpdate?.();
  });

  await waitBrowserFrames(2);
}

export function getWalkMotion(
  effect: 'walk-in' | 'fly-in',
  currentZoom: number,
  zoomLevel: number,
  speedMs: number,
): WalkMotion {
  const maxSourceZoom = effect === 'fly-in' ? 50 : 38;
  const maxArrivalWide = effect === 'fly-in' ? 30 : 22;
  const sourceFactor = effect === 'fly-in' ? 0.7 : 0.6;
  const maxFrameScale = effect === 'fly-in' ? 0.32 : 0.22;
  return {
    sourceEndZoom: Math.min(95, Math.round(currentZoom + (zoomLevel / 100) * maxSourceZoom)),
    sourceSpeed: clamp(Math.round(speedMs * sourceFactor), 320, 960),
    arrivalStartZoom: Math.max(0, Math.round(currentZoom - (zoomLevel / 100) * maxArrivalWide)),
    revealSpeed: clamp(Math.round(speedMs * 0.7), 360, 920),
    settleZoom: currentZoom,
    frameScale: roundTo(1 + (zoomLevel / 100) * maxFrameScale, 2),
  };
}

export function getPsvTransitionOptions({
  effect,
  speedMs,
  rotation,
  rotateTo,
  customEngine,
  zoomTo,
}: PsvTransitionInput) {
  if (customEngine) {
    return {
      effect: 'none',
      speed: 0,
      rotation: false,
      showLoader: false,
      rotateTo,
      ...(zoomTo != null ? { zoomTo } : {}),
    };
  }

  if (isWalkEffect(effect)) {
    return {
      effect: 'fade',
      speed: speedMs,
      rotation: true,
      showLoader: false,
      rotateTo,
    };
  }

  return {
    effect: effect === 'crossfade' ? 'fade' : 'none',
    speed: speedMs,
    rotation,
    showLoader: true,
    rotateTo,
  };
}
