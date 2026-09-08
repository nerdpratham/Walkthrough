'use client';

import type { TourConfig } from '@/lib/types';
import type { EffectName } from '@/lib/transition-engine';
import { setTransition } from '@/lib/studio/editor-state';
import { CollapsibleSection } from './CollapsibleSection';

const EFFECT_OPTIONS: { value: EffectName; label: string; description: string }[] = [
  { value: 'crossfade', label: 'Crossfade', description: 'Smooth opacity blend between panoramas.' },
  { value: 'walk-in', label: 'Walk-in', description: 'Gentle zoom-in while fading — feels like stepping forward.' },
  { value: 'fly-in', label: 'Fly-in', description: 'Dramatic zoom toward the hotspot, then reveals new scene.' },
  { value: 'radial-fade', label: 'Radial fade', description: 'Black circle expands from centre, then contracts to reveal new scene.' },
  { value: 'vertical-wipe', label: 'Vertical wipe', description: 'Black panel sweeps top-to-bottom, then off-screen.' },
  { value: 'none', label: 'No transition', description: 'Instant cut — no animation.' },
];

const DURATION_PRESETS = [
  { label: 'Fast', ms: 400 },
  { label: 'Normal', ms: 900 },
  { label: 'Slow', ms: 1600 },
];

const BLEND_PRESETS = [
  { label: 'Off', ms: 0 },
  { label: 'Subtle', ms: 360 },
  { label: 'Smooth', ms: 800 },
];

const ZOOM_EFFECTS: EffectName[] = ['walk-in', 'fly-in'];

interface Props {
  config: TourConfig;
  onConfigChange: (config: TourConfig) => void;
}

export function TransitionInspector({ config, onConfigChange }: Props) {
  const transition = config.meta.transition;
  const patch = (value: Partial<TourConfig['meta']['transition']>) =>
    onConfigChange(setTransition(config, value));

  const selectedOption = EFFECT_OPTIONS.find((o) => o.value === transition.effect) ?? EFFECT_OPTIONS[0];
  const isZoomEffect = ZOOM_EFFECTS.includes(transition.effect);
  const isCustomDuration = !DURATION_PRESETS.some((p) => p.ms === transition.speedMs);
  const isCustomBlend = !BLEND_PRESETS.some((p) => p.ms === transition.blendMs);

  const inputCls = 'mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400';
  const selectCls = 'mt-1 w-full rounded-md border border-white/10 bg-[#111820] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400';

  return (
    <CollapsibleSection id="transition" title="Transition">

      <div className="mb-3">
        <label className="block text-xs text-slate-400">
          Effect
          <select
            value={transition.effect}
            onChange={(e) => patch({ effect: e.target.value as EffectName })}
            className={selectCls}
          >
            {EFFECT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[10px] text-slate-500">{selectedOption.description}</p>
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs text-slate-400">Duration</p>
        <div className="grid grid-cols-4 gap-1">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset.ms}
              type="button"
              onClick={() => patch({ speedMs: preset.ms })}
              className={
                transition.speedMs === preset.ms
                  ? 'rounded-md border border-cyan-400/40 bg-cyan-400/15 py-1.5 text-center text-xs text-cyan-200'
                  : 'rounded-md border border-white/10 bg-white/[0.03] py-1.5 text-center text-xs text-slate-400 hover:text-slate-200'
              }
            >
              {preset.label}<br />
              <span className="text-[10px] opacity-60">{preset.ms}ms</span>
            </button>
          ))}
          <button
            type="button"
            className={
              isCustomDuration
                ? 'rounded-md border border-cyan-400/40 bg-cyan-400/15 py-1.5 text-center text-xs text-cyan-200'
                : 'rounded-md border border-white/10 bg-white/[0.03] py-1.5 text-center text-xs text-slate-400 hover:text-slate-200'
            }
          >
            Custom<br />
            <span className="text-[10px] opacity-60">…ms</span>
          </button>
        </div>
        {isCustomDuration && (
          <input
            type="number"
            value={transition.speedMs}
            onChange={(e) => patch({ speedMs: Number(e.target.value) })}
            min={0}
            max={5000}
            className={inputCls}
          />
        )}
      </div>

      <div className={`mb-3 ${!isZoomEffect ? 'opacity-40' : ''}`}>
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Zoom intensity
            {!isZoomEffect && <span className="ml-1 text-[10px] text-slate-600">(walk-in / fly-in only)</span>}
          </p>
          <span className="text-xs tabular-nums text-slate-400">{transition.zoomLevel}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={transition.zoomLevel}
          disabled={!isZoomEffect}
          onChange={(e) => patch({ zoomLevel: Number(e.target.value) })}
          className="w-full accent-cyan-400 disabled:cursor-not-allowed"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-slate-600">
          <span>Subtle</span>
          <span>Dramatic</span>
        </div>
      </div>

      <div className={`mb-3 ${!isZoomEffect ? 'opacity-40' : ''}`}>
        <p className="mb-1 text-xs text-slate-400">
          Blend between scenes
          {!isZoomEffect && <span className="ml-1 text-[10px] text-slate-600">(walk-in / fly-in only)</span>}
        </p>
        <div className="grid grid-cols-4 gap-1">
          {BLEND_PRESETS.map((preset) => (
            <button
              key={preset.ms}
              type="button"
              disabled={!isZoomEffect}
              onClick={() => patch({ blendMs: preset.ms })}
              className={
                transition.blendMs === preset.ms
                  ? 'rounded-md border border-cyan-400/40 bg-cyan-400/15 py-1.5 text-center text-xs text-cyan-200 disabled:cursor-not-allowed'
                  : 'rounded-md border border-white/10 bg-white/[0.03] py-1.5 text-center text-xs text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed'
              }
            >
              {preset.label}<br />
              <span className="text-[10px] opacity-60">{preset.ms}ms</span>
            </button>
          ))}
          <button
            type="button"
            disabled={!isZoomEffect}
            className={
              isCustomBlend
                ? 'rounded-md border border-cyan-400/40 bg-cyan-400/15 py-1.5 text-center text-xs text-cyan-200 disabled:cursor-not-allowed'
                : 'rounded-md border border-white/10 bg-white/[0.03] py-1.5 text-center text-xs text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed'
            }
          >
            Custom<br />
            <span className="text-[10px] opacity-60">ms</span>
          </button>
        </div>
        {isCustomBlend && (
          <input
            type="number"
            value={transition.blendMs}
            onChange={(e) => patch({ blendMs: Number(e.target.value) })}
            min={0}
            max={1500}
            disabled={!isZoomEffect}
            className={inputCls}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={transition.rotation}
            onChange={(e) => patch({ rotation: e.target.checked })}
          />
          Rotate during transition
          <span className="text-[10px] text-slate-600">(can cause spinning — keep off)</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={transition.zoomToHotspot}
            onChange={(e) => patch({ zoomToHotspot: e.target.checked })}
          />
          Zoom focus
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={transition.lockInput}
            onChange={(e) => patch({ lockInput: e.target.checked })}
          />
          Lock input during transition
        </label>
      </div>
    </CollapsibleSection>
  );
}
