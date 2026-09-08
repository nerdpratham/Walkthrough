'use client';

import type { Scene } from '@/lib/types';

interface Props {
  activeScene: Scene;
  selectedLinkIndex: number | null;
  viewState: { yaw: number; pitch: number; zoom: number };
  onSetSceneDefault: () => void;
  onSetHotspotPosition: () => void;
  onSetArrival: () => void;
}

export function CalibrationStrip({
  activeScene,
  selectedLinkIndex,
  viewState,
  onSetSceneDefault,
  onSetHotspotPosition,
  onSetArrival,
}: Props) {
  const selectedLink = selectedLinkIndex === null ? null : activeScene.links[selectedLinkIndex];

  return (
    <footer className="grid grid-cols-[1fr_auto] items-center border-t border-white/10 bg-[#0f141a] px-4 text-xs text-slate-400">
      <div className="flex min-w-0 items-center gap-4">
        <span className="truncate text-slate-300">{activeScene.label}</span>
        <span>Yaw {viewState.yaw} deg</span>
        <span>Pitch {viewState.pitch} deg</span>
        <span>Zoom {viewState.zoom}</span>
        {selectedLink && (
          <span className="truncate">Selected link: {selectedLink.label || selectedLink.toScene}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSetSceneDefault}
          className="rounded bg-white/[0.04] px-2 py-1 hover:bg-white/[0.08]"
        >
          Set scene default
        </button>
        <button
          type="button"
          onClick={onSetHotspotPosition}
          disabled={selectedLinkIndex === null}
          className="rounded bg-white/[0.04] px-2 py-1 hover:bg-white/[0.08] disabled:opacity-40"
        >
          Set hotspot here
        </button>
        <button
          type="button"
          onClick={onSetArrival}
          disabled={selectedLinkIndex === null}
          className="rounded bg-white/[0.04] px-2 py-1 hover:bg-white/[0.08] disabled:opacity-40"
        >
          Set arrival
        </button>
      </div>
    </footer>
  );
}
