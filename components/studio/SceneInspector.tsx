'use client';

import type { Scene, TourConfig } from '@/lib/types';
import { updateScene } from '@/lib/studio/editor-state';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  config: TourConfig;
  scene: Scene;
  currentYaw: number;
  currentPitch: number;
  onConfigChange: (config: TourConfig) => void;
}

export function SceneInspector({ config, scene, currentYaw, currentPitch, onConfigChange }: Props) {
  return (
    <CollapsibleSection id="scene" title="Scene">
      <label className="mb-3 block text-xs text-slate-400">
        Label
        <input
          value={scene.label}
          onChange={(event) => onConfigChange(updateScene(config, scene.id, { label: event.target.value }))}
          className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="mb-3 block text-xs text-slate-400">
        Caption
        <textarea
          value={scene.caption ?? ''}
          onChange={(event) =>
            onConfigChange(updateScene(config, scene.id, { caption: event.target.value || undefined }))
          }
          rows={2}
          placeholder="Shown as a banner when visitors arrive"
          className="mt-1 w-full resize-y rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
        />
      </label>
      <label className="mb-3 block text-xs text-slate-400">
        Zone
        <select
          value={scene.zone}
          onChange={(event) => onConfigChange(updateScene(config, scene.id, { zone: event.target.value }))}
          className="mt-1 w-full rounded-md border border-white/10 bg-[#111820] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
        >
          {config.zones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.label}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <label className="block text-xs text-slate-400">
          Default yaw
          <input
            type="number"
            value={scene.defaultYaw}
            onChange={(event) => onConfigChange(updateScene(config, scene.id, { defaultYaw: Number(event.target.value) }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Default pitch
          <input
            type="number"
            value={scene.defaultPitch}
            onChange={(event) => onConfigChange(updateScene(config, scene.id, { defaultPitch: Number(event.target.value) }))}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>
        <button
          type="button"
          onClick={() => onConfigChange(updateScene(config, scene.id, { defaultYaw: currentYaw, defaultPitch: currentPitch }))}
          className="mt-5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
        >
          Use view
        </button>
      </div>
    </CollapsibleSection>
  );
}
