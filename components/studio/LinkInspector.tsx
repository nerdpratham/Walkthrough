'use client';

import { useEffect, useState } from 'react';
import type { Link, Scene, TourConfig } from '@/lib/types';
import type { EffectName } from '@/lib/transition-engine';
import { removeLink, updateLink, updateLinkTransitionOverride } from '@/lib/studio/editor-state';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  config: TourConfig;
  scene: Scene;
  selectedLinkIndex: number | null;
  currentYaw: number;
  currentPitch: number;
  onConfigChange: (config: TourConfig) => void;
  onSelectLink: (index: number | null) => void;
  onStartPlaceLink: (destinationSceneId: string) => void;
  onStartMoveHotspot: () => void;
}

const priorities: Link['priority'][] = ['primary', 'secondary', 'hidden'];
const styles: Link['style'][] = ['chevron', 'dot', 'floor-circle'];

const EFFECT_OPTIONS: { value: EffectName; label: string }[] = [
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'walk-in', label: 'Walk-in' },
  { value: 'fly-in', label: 'Fly-in' },
  { value: 'radial-fade', label: 'Radial fade' },
  { value: 'vertical-wipe', label: 'Vertical wipe' },
  { value: 'none', label: 'No transition' },
];

const ZOOM_EFFECTS: EffectName[] = ['walk-in', 'fly-in'];

function NumericInput({ value, onChange, disabled, className }: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (disabled) return;
        const n = parseFloat(draft);
        if (Number.isFinite(n)) onChange(n);
        else setDraft(String(value));
      }}
      className={className}
    />
  );
}

export function LinkInspector({
  config,
  scene,
  selectedLinkIndex,
  currentYaw,
  currentPitch,
  onConfigChange,
  onSelectLink,
  onStartPlaceLink,
  onStartMoveHotspot,
}: Props) {
  const selectedLink = selectedLinkIndex === null ? null : scene.links[selectedLinkIndex];
  const otherScenes = config.scenes.filter((s) => s.id !== scene.id);
  const [pickingScene, setPickingScene] = useState<string | null>(null);

  const inputCls = 'mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400';
  const selectCls = 'mt-1 w-full rounded-md border border-white/10 bg-[#111820] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400';
  const useViewCls = 'mt-5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 text-xs text-cyan-100 hover:bg-cyan-400/20';

  return (
    <CollapsibleSection
      id="links"
      title="Links"
      right={
        <div className="flex items-center gap-2">
          {selectedLinkIndex !== null && (
            <button
              type="button"
              onClick={() => {
                onConfigChange(removeLink(config, scene.id, selectedLinkIndex));
                onSelectLink(null);
              }}
              className="rounded-md border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs text-red-100 hover:bg-red-400/20"
            >
              Delete
            </button>
          )}
          {pickingScene === null ? (
            <button
              type="button"
              onClick={() => setPickingScene(otherScenes[0]?.id ?? null)}
              disabled={otherScenes.length === 0}
              className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-40"
            >
              Add link
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <select
                value={pickingScene}
                onChange={(e) => setPickingScene(e.target.value)}
                className="rounded-md border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
              >
                {otherScenes.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  onStartPlaceLink(pickingScene);
                  setPickingScene(null);
                }}
                className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-400/20"
              >
                Place →
              </button>
              <button
                type="button"
                onClick={() => setPickingScene(null)}
                className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      }
    >

      <div className="mb-4 space-y-2">
        {scene.links.length === 0 && pickingScene === null && (
          <p className="text-sm text-slate-500">No links in this scene yet.</p>
        )}
        {scene.links.map((link, index) => (
          <button
            key={`${link.toScene}-${index}`}
            type="button"
            onClick={() => onSelectLink(index)}
            className={
              selectedLinkIndex === index
                ? 'flex w-full items-center justify-between rounded-md border border-cyan-400/30 bg-cyan-400/12 px-2 py-2 text-left text-xs text-cyan-100'
                : 'flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-left text-xs text-slate-300 hover:border-white/20'
            }
          >
            <span className="truncate">{link.label || link.toScene}</span>
            <span className="ml-auto flex items-center gap-1.5">
              {link.transitionOverride?.effect && (
                <span className="rounded border border-amber-400/30 bg-amber-400/15 px-1 py-0.5 text-[10px] text-amber-200">override</span>
              )}
              <span className="shrink-0 text-slate-400">{Math.round(link.hotspotYaw)}°</span>
            </span>
          </button>
        ))}
      </div>

      {!selectedLink || selectedLinkIndex === null ? (
        <p className="text-sm text-slate-500">Select a link above to edit its placement and arrival direction.</p>
      ) : (
        <>
          <label className="mb-3 block text-xs text-slate-400">
            Destination
            <select
              value={selectedLink.toScene}
              onChange={(e) => {
                const target = config.scenes.find((s) => s.id === e.target.value);
                onConfigChange(updateLink(config, scene.id, selectedLinkIndex, {
                  toScene: e.target.value,
                  label: target?.label ?? selectedLink.label,
                }));
              }}
              className={selectCls}
            >
              {config.scenes.filter((s) => s.id !== scene.id).map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>

          <label className="mb-3 block text-xs text-slate-400">
            Label
            <input
              value={selectedLink.label ?? ''}
              onChange={(e) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, {
                label: e.target.value || undefined,
              }))}
              className={inputCls}
            />
          </label>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-400">
              Priority
              <select
                value={selectedLink.priority}
                onChange={(e) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, {
                  priority: e.target.value as Link['priority'],
                }))}
                className={selectCls}
              >
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              Style
              <select
                value={selectedLink.style}
                onChange={(e) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, {
                  style: e.target.value as Link['style'],
                }))}
                className={selectCls}
              >
                {styles.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>

          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={onStartMoveHotspot}
              className="rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-400/20"
            >
              Move hotspot
            </button>
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Arrow placement in this scene</p>
          <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="block text-xs text-slate-400">
              Yaw
              <NumericInput
                value={selectedLink.hotspotYaw}
                onChange={(v) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, { hotspotYaw: v }))}
                className={inputCls}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Pitch
              <NumericInput
                value={selectedLink.hotspotPitch}
                onChange={(v) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, { hotspotPitch: v }))}
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, {
                hotspotYaw: currentYaw,
                hotspotPitch: currentPitch,
              }))}
              className={useViewCls}
            >
              Use view
            </button>
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Arrival direction in destination</p>
          <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="block text-xs text-slate-400">
              Yaw
              <NumericInput
                value={selectedLink.arrivalYaw}
                onChange={(v) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, { arrivalYaw: v }))}
                className={inputCls}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Pitch
              <NumericInput
                value={selectedLink.arrivalPitch ?? 0}
                onChange={(v) => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, { arrivalPitch: v }))}
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => onConfigChange(updateLink(config, scene.id, selectedLinkIndex, {
                arrivalYaw: currentYaw,
                arrivalPitch: currentPitch,
              }))}
              className={useViewCls}
            >
              Use view
            </button>
          </div>

          {(() => {
            const override = selectedLink.transitionOverride;
            const overrideEffect = override?.effect;
            const zoomEnabled = overrideEffect === 'walk-in' || overrideEffect === 'fly-in';
            const globalEffectLabel = EFFECT_OPTIONS.find((o) => o.value === config.meta.transition.effect)?.label ?? config.meta.transition.effect;
            return (
              <div className="border-t border-white/10 pt-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Transition override</p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block text-xs text-slate-400">
                    Effect
                    <select
                      value={overrideEffect ?? ''}
                      onChange={(e) => {
                        const val = e.target.value as EffectName | '';
                        if (!val) {
                          onConfigChange(updateLink(config, scene.id, selectedLinkIndex, { transitionOverride: undefined }));
                        } else {
                          onConfigChange(updateLinkTransitionOverride(config, scene.id, selectedLinkIndex, { effect: val }));
                        }
                      }}
                      className={selectCls}
                    >
                      <option value="">Default (= {globalEffectLabel})</option>
                      {EFFECT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className={`block text-xs text-slate-400 ${!overrideEffect ? 'opacity-40' : ''}`}>
                    Duration ms
                    <NumericInput
                      value={override?.speedMs ?? config.meta.transition.speedMs}
                      onChange={(v) => onConfigChange(updateLinkTransitionOverride(config, scene.id, selectedLinkIndex, { speedMs: v }))}
                      disabled={!overrideEffect}
                      className={inputCls}
                    />
                  </label>
                  <label className={`block text-xs text-slate-400 ${!zoomEnabled ? 'opacity-40' : ''}`}>
                    Zoom
                    <NumericInput
                      value={override?.zoomLevel ?? config.meta.transition.zoomLevel}
                      onChange={(v) => onConfigChange(updateLinkTransitionOverride(config, scene.id, selectedLinkIndex, { zoomLevel: v }))}
                      disabled={!zoomEnabled}
                      className={inputCls}
                    />
                  </label>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </CollapsibleSection>
  );
}
