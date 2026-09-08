'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { TourConfig, FloorPlanConfig } from '@/lib/types';

interface Props {
  config: TourConfig;
  currentSceneId: string;
  onGoToScene: (id: string) => void;
}

export function FloorPlan({ config, currentSceneId, onGoToScene }: Props) {
  const fp = config.meta.floorPlan;
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setExpanded(false), []);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      prev?.focus();
    };
  }, [expanded, close]);

  if (fp === false || !fp || typeof fp !== 'object') return null;
  const { image, markers } = fp as FloorPlanConfig;
  if (!image) return null;

  const accentColor = config.meta.theme?.accentColor ?? config.meta.themeColor ?? '#7c83fd';

  return (
    <>
      {/* Collapsed thumbnail */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setExpanded(true)}
        className="absolute bottom-6 left-4 z-40 overflow-hidden rounded-lg
          bg-black/60 backdrop-blur-sm ring-1 ring-white/10
          transition hover:ring-white/30"
        style={{ width: 180 }}
        aria-label="Open floor plan"
      >
        <div className="relative">
          <img src={image} alt="Floor plan" className="w-full opacity-70" draggable={false} />
          <Dots
            markers={markers}
            currentSceneId={currentSceneId}
            accentColor={accentColor}
            dotScale={0.5}
          />
        </div>
      </button>

      {/* Expanded overlay */}
      {expanded && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Floor plan navigation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === overlayRef.current) close(); }}
        >
          <div className="relative max-h-[85vh] max-w-[85vw]">
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center
                rounded-full bg-black/80 text-white/70 ring-1 ring-white/20
                transition hover:text-white"
              aria-label="Close floor plan"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative overflow-hidden rounded-xl bg-black/80 ring-1 ring-white/10">
              <img
                src={image}
                alt="Floor plan"
                className="block max-h-[80vh] max-w-[80vw]"
                draggable={false}
              />
              <Dots
                markers={markers}
                currentSceneId={currentSceneId}
                accentColor={accentColor}
                dotScale={1}
                interactive
                onDotClick={onGoToScene}
                onNavigate={close}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface DotsProps {
  markers: FloorPlanConfig['markers'];
  currentSceneId: string;
  accentColor: string;
  dotScale: number;
  interactive?: boolean;
  onDotClick?: (sceneId: string) => void;
  onNavigate?: () => void;
}

function dotStyle(size: number, isCurrent: boolean, accentColor: string, interactive: boolean): React.CSSProperties {
  return {
    width: size,
    height: size,
    backgroundColor: isCurrent ? accentColor : 'rgba(255,255,255,0.35)',
    border: isCurrent ? '2px solid rgba(255,255,255,0.9)' : '1px solid rgba(255,255,255,0.3)',
    boxShadow: isCurrent ? `0 0 8px ${accentColor}` : undefined,
    cursor: interactive ? 'pointer' : 'default',
  };
}

function Dots({ markers, currentSceneId, accentColor, dotScale, interactive, onDotClick, onNavigate }: DotsProps) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {markers.map((marker, i) => {
        const isCurrent = marker.sceneId === currentSceneId;
        const size = (marker.size ?? 20) * dotScale;
        const fontSize = Math.max(8, size * 0.55);
        return (
          <div
            key={`${marker.sceneId}-${i}`}
            className={interactive ? 'pointer-events-auto' : undefined}
            style={{
              position: 'absolute',
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {interactive ? (
              <button
                type="button"
                onClick={() => {
                  onDotClick?.(marker.sceneId);
                  onNavigate?.();
                }}
                className="flex items-center justify-center rounded-full transition-transform hover:scale-110"
                style={dotStyle(size, isCurrent, accentColor, true)}
                aria-label={marker.label ? `Go to ${marker.label}` : `Go to scene`}
              >
                {marker.label && (
                  <span className="select-none font-semibold leading-none" style={{ fontSize, color: isCurrent ? '#000' : '#fff' }}>
                    {marker.label}
                  </span>
                )}
              </button>
            ) : (
              <div
                className="flex items-center justify-center rounded-full"
                style={dotStyle(size, isCurrent, accentColor, false)}
              >
                {marker.label && (
                  <span className="select-none font-semibold leading-none" style={{ fontSize, color: isCurrent ? '#000' : '#fff' }}>
                    {marker.label}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
