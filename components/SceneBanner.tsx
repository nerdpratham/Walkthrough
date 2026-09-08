'use client';

import type { Scene } from '@/lib/types';

// Scene-level caption shown top-center on arrival. Optional per scene: renders
// only when the active scene has a `caption`. Keyed on scene id so it replays
// the slide-in on every scene change. Distinct from info markers, which are
// positioned points the user must find and click.
export function SceneBanner({ scene }: { scene: Scene | null }) {
  if (!scene?.caption) return null;

  return (
    <div
      key={scene.id}
      className="scene-banner pointer-events-none absolute inset-x-0 top-6 z-40
        flex justify-center"
    >
      <div className="max-w-[min(90vw,32rem)] rounded-2xl bg-black/55 px-5 py-3 text-center backdrop-blur-sm ring-1 ring-white/10">
        <p className="text-base font-semibold leading-snug text-white/90">{scene.caption}</p>
      </div>
    </div>
  );
}
