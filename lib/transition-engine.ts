import type { EffectName } from './types';

export type { EffectName };

export interface TransitionParams {
  effect: EffectName;
  speedMs: number;
  zoomLevel: number;
  container: HTMLElement;
  onMidpoint: () => void;
}

export interface FrameHoldSwapParams {
  speedMs: number;
  blendMs?: number;
  frameScale?: number;
  container: HTMLElement;
  captureFrame?: () => string | null;
  onSwap: () => Promise<unknown> | unknown;
  onRevealStart?: () => Promise<unknown> | unknown;
}

const CUSTOM_ENGINE_EFFECTS: EffectName[] = ['radial-fade', 'vertical-wipe'];

export function needsCustomEngine(effect: EffectName): boolean {
  return CUSTOM_ENGINE_EFFECTS.includes(effect);
}

export function playTransition(params: TransitionParams): Promise<void> {
  const { effect } = params;

  if (effect === 'radial-fade') return playRadialFade(params);
  if (effect === 'vertical-wipe') return playVerticalWipe(params);

  params.onMidpoint();
  return Promise.resolve();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createOverlay(container: HTMLElement): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;z-index:999;pointer-events:none;background:#000';
  container.appendChild(overlay);
  return overlay;
}

export function getFrameHoldTiming(speedMs: number, blendMs?: number): { preFadeMs: number; revealMs: number } {
  return {
    preFadeMs: clamp(Math.round(speedMs * 0.133), 80, 140),
    revealMs: blendMs === undefined
      ? clamp(Math.round(speedMs * 0.7), 360, 760)
      : clamp(Math.round(blendMs), 0, 1500),
  };
}

export function captureCurrentFrame(container: HTMLElement): string | null {
  const canvas = container.querySelector('canvas');
  if (!(canvas instanceof HTMLCanvasElement)) return null;

  try {
    return canvas.toDataURL('image/jpeg', 0.86);
  } catch {
    return null;
  }
}

function createFrameHoldOverlay(container: HTMLElement, frameUrl: string | null): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:absolute',
    'inset:0',
    'z-index:999',
    'pointer-events:none',
    'opacity:1',
    'transform:translateZ(0)',
    'transform-origin:center center',
  ].join(';');
  if (frameUrl) {
    overlay.style.backgroundImage = `url("${frameUrl}")`;
    overlay.style.backgroundPosition = 'center';
    overlay.style.backgroundSize = 'cover';
    overlay.style.backgroundRepeat = 'no-repeat';
  }
  container.appendChild(overlay);
  return overlay;
}

export function playFrameHoldSwapTransition({
  speedMs,
  blendMs,
  frameScale = 1,
  container,
  captureFrame,
  onSwap,
  onRevealStart,
}: FrameHoldSwapParams): Promise<void> {
  const { preFadeMs, revealMs } = getFrameHoldTiming(speedMs, blendMs);
  const frameUrl = captureFrame ? captureFrame() : captureCurrentFrame(container);
  const overlay = createFrameHoldOverlay(container, frameUrl);

  overlay.style.transition = `opacity ${preFadeMs}ms ease-in-out, filter ${preFadeMs}ms ease-in-out`;
  overlay.style.filter = 'brightness(0.92)';
  overlay.getBoundingClientRect(); // force reflow before the pre-fade
  overlay.style.opacity = '0.88';

  return Promise.resolve(onSwap())
    .then(() => {
      const reveal = Promise.resolve(onRevealStart?.());
      overlay.style.transition = [
        `opacity ${revealMs}ms ease-in-out`,
        `transform ${revealMs}ms ease-out`,
        `filter ${revealMs}ms ease-in-out`,
      ].join(', ');
      overlay.getBoundingClientRect(); // force reflow before fading
      overlay.style.opacity = '0';
      overlay.style.transform = `scale(${frameScale})`;
      overlay.style.filter = 'brightness(1)';

      const fade = new Promise<void>((resolve) => {
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, revealMs);
      });

      return Promise.all([reveal, fade]).then(() => undefined);
    })
    .catch((error) => {
      overlay.remove();
      throw error;
    });
}

function playRadialFade({ speedMs, container, onMidpoint }: TransitionParams): Promise<void> {
  return new Promise((resolve) => {
    const half = speedMs / 2;
    const overlay = createOverlay(container);

    overlay.style.clipPath = 'circle(0% at 50% 50%)';
    overlay.style.transition = `clip-path ${half}ms ease-in`;
    overlay.getBoundingClientRect(); // force reflow before animating
    overlay.style.clipPath = 'circle(150% at 50% 50%)';

    setTimeout(() => {
      onMidpoint();
      overlay.style.transition = `clip-path ${half}ms ease-out`;
      overlay.style.clipPath = 'circle(0% at 50% 50%)';

      setTimeout(() => {
        overlay.remove();
        resolve();
      }, half);
    }, half);
  });
}

function playVerticalWipe({ speedMs, container, onMidpoint }: TransitionParams): Promise<void> {
  return new Promise((resolve) => {
    const half = speedMs / 2;
    const overlay = createOverlay(container);

    overlay.style.clipPath = 'inset(100% 0 0 0)';
    overlay.style.transition = `clip-path ${half}ms ease-in`;
    overlay.getBoundingClientRect(); // force reflow before animating
    overlay.style.clipPath = 'inset(0 0 0 0)';

    setTimeout(() => {
      onMidpoint();
      overlay.style.transition = `clip-path ${half}ms ease-out`;
      overlay.style.clipPath = 'inset(0 0 100% 0)';

      setTimeout(() => {
        overlay.remove();
        resolve();
      }, half);
    }, half);
  });
}
