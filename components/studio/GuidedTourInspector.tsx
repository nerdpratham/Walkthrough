'use client';

import { useState } from 'react';
import type { TourConfig, GuidedTourStep } from '@/lib/types';
import { setGuidedTour } from '@/lib/studio/editor-state';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  config: TourConfig;
  onConfigChange: (config: TourConfig) => void;
}

export function GuidedTourInspector({ config, onConfigChange }: Props) {
  const steps: GuidedTourStep[] = [];
  {
    const seen = new Set<string>();
    for (const step of config.meta.guidedTour ?? []) {
      if (seen.has(step.sceneId) || !config.scenes.some((s) => s.id === step.sceneId)) continue;
      seen.add(step.sceneId);
      steps.push(step);
    }
  }

  const sceneLabelOf = (id: string) => config.scenes.find((s) => s.id === id)?.label ?? id;
  const available = config.scenes.filter((s) => !steps.some((st) => st.sceneId === s.id));

  const commit = (next: GuidedTourStep[]) => onConfigChange(setGuidedTour(config, next));

  const add = (id: string) => commit([...steps, { sceneId: id }]);
  const remove = (index: number) => commit(steps.filter((_, i) => i !== index));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };
  const updateLabel = (index: number, label: string) => {
    const next = [...steps];
    next[index] = label ? { ...next[index], label } : { sceneId: next[index].sceneId };
    commit(next);
  };

  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <CollapsibleSection
      id="guided-tour"
      title="Guided Tour"
      right={
        <span className="text-[11px] text-slate-500">
          {steps.length > 0 ? `${steps.length} steps` : 'off'}
        </span>
      }
    >

      {steps.length === 0 ? (
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Add scenes to build a next/prev path visitors can step through. Leave empty for free explore only.
        </p>
      ) : (
        <ol className="mb-3 space-y-1">
          {steps.map((step, index) => (
            <li
              key={step.sceneId}
              className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 shrink-0 text-[11px] tabular-nums text-slate-500">{index + 1}</span>
                <span className="flex-1 truncate text-sm text-slate-100">
                  {step.label || sceneLabelOf(step.sceneId)}
                  {step.label && (
                    <span className="ml-1 text-[10px] text-slate-500">({sceneLabelOf(step.sceneId)})</span>
                  )}
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setEditingId(editingId === step.sceneId ? null : step.sceneId);
                  }}
                  aria-label={`Rename step ${sceneLabelOf(step.sceneId)}`}
                  className="rounded px-1 text-slate-400 hover:text-cyan-300"
                  title="Custom label for this step"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${sceneLabelOf(step.sceneId)} up`}
                  className="rounded px-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === steps.length - 1}
                  aria-label={`Move ${sceneLabelOf(step.sceneId)} down`}
                  className="rounded px-1 text-slate-400 hover:text-white disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingId === step.sceneId) setEditingId(null);
                    remove(index);
                  }}
                  aria-label={`Remove ${sceneLabelOf(step.sceneId)}`}
                  className="rounded px-1 text-slate-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
              {editingId === step.sceneId && (
                <input
                  type="text"
                  value={step.label ?? ''}
                  onChange={(e) => updateLabel(index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setEditingId(null);
                    }
                  }}
                  onBlur={() => setEditingId(null)}
                  placeholder={sceneLabelOf(step.sceneId)}
                  className="ml-6 rounded border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
                  autoFocus
                />
              )}
            </li>
          ))}
        </ol>
      )}

      <label className="block text-xs text-slate-400">
        Add scene
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) add(event.target.value);
          }}
          disabled={available.length === 0}
          className="mt-1 w-full rounded-md border border-white/10 bg-[#111820] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400 disabled:opacity-40"
        >
          <option value="">{available.length === 0 ? 'All scenes added' : 'Select a scene…'}</option>
          {available.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </label>
    </CollapsibleSection>
  );
}
