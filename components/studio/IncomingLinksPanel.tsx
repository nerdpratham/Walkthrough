'use client';

import { useEffect, useState } from 'react';
import type { Scene, TourConfig } from '@/lib/types';
import { updateLink } from '@/lib/studio/editor-state';
import { getIncomingLinks } from '@/lib/studio/incoming-links';

interface Props {
  config: TourConfig;
  activeScene: Scene;
  viewState: { yaw: number; pitch: number; zoom: number };
  onConfigChange: (config: TourConfig) => void;
  onSelectScene: (sceneId: string) => void;
  onSelectSceneWithArrival: (sceneId: string, arrivalYaw: number, arrivalPitch: number) => void;
}

function NumericInput({ value, onChange, className }: { value: number; onChange: (v: number) => void; className?: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = parseFloat(draft);
        if (Number.isFinite(n)) onChange(n);
        else setDraft(String(value));
      }}
      className={className}
    />
  );
}

export function IncomingLinksPanel({ config, activeScene, viewState, onConfigChange, onSelectScene, onSelectSceneWithArrival }: Props) {
  const incoming = getIncomingLinks(config, activeScene.id);

  const inputCls = 'mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400';

  if (incoming.length === 0) {
    return (
      <section className="p-4">
        <p className="text-sm text-slate-500">No other scenes link to this scene yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 p-4">
      <p className="text-xs text-slate-400">
        Rotate to face where you want visitors to arrive from each source, then click "Use view".
      </p>
      {incoming.map(({ scene, link, index }) => (
        <div
          key={`${scene.id}-${index}`}
          className="space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-200">{scene.label}</span>
            <button
              type="button"
              onClick={() => onSelectSceneWithArrival(scene.id, scene.defaultYaw, scene.defaultPitch)}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:text-white"
            >
              Go to scene →
            </button>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="block text-xs text-slate-400">
              Yaw
              <NumericInput
                value={link.arrivalYaw}
                onChange={(v) => onConfigChange(updateLink(config, scene.id, index, { arrivalYaw: v }))}
                className={inputCls}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Pitch
              <NumericInput
                value={link.arrivalPitch ?? 0}
                onChange={(v) => onConfigChange(updateLink(config, scene.id, index, { arrivalPitch: v }))}
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => onConfigChange(updateLink(config, scene.id, index, {
                arrivalYaw: viewState.yaw,
                arrivalPitch: viewState.pitch,
              }))}
              className="mt-5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 text-xs text-cyan-100 hover:bg-cyan-400/20"
            >
              Use view
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
