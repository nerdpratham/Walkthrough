'use client';

import { useEffect, useRef } from 'react';

interface Props {
  route: string[];
  labels?: Record<string, string>;
  currentSceneId: string;
  onGoToScene: (id: string) => void;
}

// Guided next/prev bar riding on top of free navigation. Optional per tour
// (meta.guidedTour is an ordered list of scene ids). It never locks input:
// position is derived from the current scene, so if a visitor navigates on
// their own and then hits Next, it continues along the route. When off-route,
// it resumes from the last in-route step.
export function GuidedTourBar({ route, labels = {}, currentSceneId, onGoToScene }: Props) {
  const lastIndexRef = useRef(-1);
  const currentIndex = route.indexOf(currentSceneId);

  useEffect(() => {
    if (currentIndex >= 0) lastIndexRef.current = currentIndex;
  }, [currentIndex]);

  if (route.length === 0) return null;

  const base = currentIndex >= 0 ? currentIndex : lastIndexRef.current;
  const prevDisabled = base <= 0;
  const nextDisabled = base >= route.length - 1;
  const pos = Math.max(base, 0);

  const btn =
    'rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
    'disabled:cursor-default disabled:opacity-30 enabled:hover:text-white/90 enabled:text-white/60';

  return (
    <div
      className="absolute bottom-16 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3
        rounded-full bg-black/55 px-2 py-1 backdrop-blur-sm ring-1 ring-white/10"
    >
      <button
        type="button"
        disabled={prevDisabled}
        onClick={() => onGoToScene(route[base - 1])}
        className={btn}
        aria-label="Previous step"
      >
        ‹ Prev
      </button>
      <span className="max-w-56 truncate px-1 text-sm font-medium text-white/40">
        {labels[route[pos]]
          ? labels[route[pos]]
          : <span className="tabular-nums">{pos + 1} / {route.length}</span>}
      </span>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => onGoToScene(route[base + 1])}
        className={btn}
        aria-label="Next step"
      >
        Next ›
      </button>
    </div>
  );
}
