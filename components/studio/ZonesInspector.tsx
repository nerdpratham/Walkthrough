'use client';

import { useState } from 'react';
import type { TourConfig } from '@/lib/types';
import { addZone, assignSceneZone, removeZone, renameZone } from '@/lib/studio/editor-state';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  config: TourConfig;
  onConfigChange: (config: TourConfig) => void;
}

function slugify(label: string): string {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'zone';
}

export function ZonesInspector({ config, onConfigChange }: Props) {
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddZone = () => {
    const label = newLabel.trim();
    if (!label) return;
    const existingIds = new Set(config.zones.map((z) => z.id));
    const base = slugify(label);
    let id = base;
    let n = 2;
    while (existingIds.has(id)) id = `${base}-${n++}`;
    onConfigChange(addZone(config, { id, label }));
    setNewLabel('');
  };

  return (
    <CollapsibleSection
      id="zones"
      title="Zones"
      right={<span className="text-[11px] text-slate-500">{config.zones.length}</span>}
    >
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        Zones group scenes under a heading in the Rooms list and the Scenes
        panel. Create a zone, then add scenes to it below.
      </p>

      {config.zones.length > 0 && (
        <ol className="mb-3 space-y-2">
          {config.zones.map((zone) => {
            const scenesInZone = config.scenes.filter((s) => s.zone === zone.id);
            const available = config.scenes.filter((s) => s.zone !== zone.id);
            const editing = editingId === zone.id;
            const otherZone = config.zones.find((z) => z.id !== zone.id);

            return (
              <li key={zone.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                <div className="flex items-center gap-2">
                  {editing ? (
                    <input
                      autoFocus
                      value={zone.label}
                      onChange={(e) => onConfigChange(renameZone(config, zone.id, e.target.value))}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                      }}
                      className="min-w-0 flex-1 rounded border border-cyan-400/40 bg-[#111820] px-2 py-1 text-sm text-white outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(zone.id)}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-100 hover:text-cyan-300"
                    >
                      {zone.label}
                    </button>
                  )}
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {scenesInZone.length} scene{scenesInZone.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onConfigChange(removeZone(config, zone.id))}
                    disabled={scenesInZone.length > 0}
                    aria-label={`Delete zone ${zone.label}`}
                    title={scenesInZone.length > 0 ? 'Move its scenes out before deleting' : 'Delete zone'}
                    className="shrink-0 rounded px-1 text-slate-500 hover:text-red-300 disabled:opacity-20 disabled:hover:text-slate-500"
                  >
                    ✕
                  </button>
                </div>

                {scenesInZone.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {scenesInZone.map((scene) => (
                      <li key={scene.id} className="flex items-center justify-between gap-2 pl-1 text-xs text-slate-400">
                        <span className="truncate">{scene.label}</span>
                        {otherZone && (
                          <button
                            type="button"
                            onClick={() => onConfigChange(assignSceneZone(config, scene.id, otherZone.id))}
                            aria-label={`Move ${scene.label} out of ${zone.label}`}
                            title={`Move to ${otherZone.label}`}
                            className="shrink-0 text-slate-600 hover:text-slate-300"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {available.length > 0 && (
                  <select
                    value=""
                    aria-label={`Add scene to ${zone.label}`}
                    onChange={(e) => {
                      if (e.target.value) onConfigChange(assignSceneZone(config, e.target.value, zone.id));
                    }}
                    className="mt-2 w-full rounded-md border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    <option value="">Add scene…</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddZone(); } }}
          placeholder="New zone name"
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
        />
        <button
          type="button"
          onClick={handleAddZone}
          disabled={!newLabel.trim()}
          className="shrink-0 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </CollapsibleSection>
  );
}
