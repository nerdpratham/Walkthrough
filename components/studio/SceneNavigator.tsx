'use client';

import { useRef, useState } from 'react';
import type { TourConfig } from '@/lib/types';
import type { TourValidationResult } from '@/lib/studio/tour-validation';
import { moveScene, renameScene } from '@/lib/studio/editor-state';

interface Props {
  config: TourConfig;
  activeSceneId: string;
  validation: TourValidationResult;
  onSelectScene: (sceneId: string) => void;
  onConfigChange?: (config: TourConfig) => void;
  onDeleteScene?: (sceneId: string) => void;
}

export function SceneNavigator({ config, activeSceneId, validation, onSelectScene, onConfigChange, onDeleteScene }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const issuesByScene = new Map<string, number>();
  [...validation.errors, ...validation.warnings].forEach((issue) => {
    if (!issue.sceneId) return;
    issuesByScene.set(issue.sceneId, (issuesByScene.get(issue.sceneId) ?? 0) + 1);
  });

  const globalIndexOf = new Map(config.scenes.map((s, i) => [s.id, i]));

  const groups = config.zones
    .map((zone) => ({
      id: zone.id,
      label: zone.label,
      scenes: config.scenes.filter((s) => s.zone === zone.id),
    }))
    .filter((g) => g.scenes.length > 0);

  const zoneIds = new Set(config.zones.map((z) => z.id));
  const ungrouped = config.scenes.filter((s) => !zoneIds.has(s.zone));
  if (ungrouped.length > 0) {
    groups.push({ id: '__ungrouped__', label: 'Ungrouped', scenes: ungrouped });
  }

  const startEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditValue(label);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitEdit = (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed && onConfigChange) onConfigChange(renameScene(config, id, trimmed));
    setEditingId(null);
  };

  return (
    <aside className="min-h-0 overflow-y-auto border-r border-white/10 bg-[#10161d]">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenes</p>
      </div>

      <div className="px-2 py-3">
        {groups.map((group) => (
          <section key={group.id} className="mb-4">
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {group.label}
            </p>

            {group.scenes.map((scene) => {
              const active = scene.id === activeSceneId;
              const count = issuesByScene.get(scene.id) ?? 0;
              const isDropTarget = dragOverId === scene.id && draggingId !== scene.id;
              const editing = editingId === scene.id;
              const isDragging = draggingId === scene.id;

              return (
                <div key={scene.id} className="relative">
                  {/* Insertion indicator — thin cyan line above the drop target */}
                  {isDropTarget && (
                    <div className="pointer-events-none absolute -top-px left-3 right-3 h-px bg-cyan-400 shadow-[0_0_6px_1px_rgba(34,211,238,0.5)]" />
                  )}

                  <div
                    draggable={!!onConfigChange && !editing}
                    onDragStart={() => {
                      setDraggingId(scene.id);
                      dragIndexRef.current = globalIndexOf.get(scene.id) ?? null;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverId(scene.id);
                    }}
                    onDrop={() => {
                      const from = dragIndexRef.current;
                      const to = globalIndexOf.get(scene.id) ?? null;
                      if (from !== null && to !== null && from !== to && onConfigChange) {
                        onConfigChange(moveScene(config, from, to));
                      }
                      setDragOverId(null);
                      setDraggingId(null);
                      dragIndexRef.current = null;
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                      dragIndexRef.current = null;
                    }}
                    className={[
                      'group mb-0.5 flex items-center gap-1 rounded-md px-1 py-1.5 transition-all duration-100',
                      active
                        ? 'bg-cyan-400/15 ring-1 ring-cyan-400/30 text-cyan-100'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200',
                      isDragging ? 'opacity-30' : 'opacity-100',
                    ].join(' ')}
                  >
                    {/* Drag handle — hidden at rest, appears on hover */}
                    {onConfigChange && (
                      <span
                        className="flex h-6 w-5 shrink-0 cursor-grab select-none items-center justify-center text-[14px] text-slate-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100 active:cursor-grabbing"
                        title="Drag to reorder"
                      >
                        ⠿
                      </span>
                    )}

                    {/* Label / rename input */}
                    {editing ? (
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(scene.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.stopPropagation(); commitEdit(scene.id); }
                          if (e.key === 'Escape') { e.stopPropagation(); setEditingId(null); }
                        }}
                        className="min-w-0 flex-1 border-b border-cyan-400/60 bg-transparent py-px text-sm text-slate-100 outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectScene(scene.id)}
                        onDoubleClick={() => onConfigChange && startEdit(scene.id, scene.label)}
                        className="min-w-0 flex-1 truncate py-px text-left text-sm leading-snug"
                      >
                        {scene.label}
                      </button>
                    )}

                    {/* Validation badge */}
                    {count > 0 && !editing && (
                      <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                        {count}
                      </span>
                    )}

                    {/* Actions — hidden at rest, appear on hover */}
                    {!editing && (onConfigChange || onDeleteScene) && (
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {onConfigChange && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); startEdit(scene.id, scene.label); }}
                            className="flex h-6 w-6 items-center justify-center rounded text-xs text-slate-500 hover:bg-white/10 hover:text-slate-200"
                            aria-label="Rename scene"
                          >
                            ✎
                          </button>
                        )}
                        {onDeleteScene && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }}
                            className="flex h-6 w-6 items-center justify-center rounded text-sm text-slate-500 hover:bg-red-500/15 hover:text-red-400"
                            aria-label="Delete scene"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </aside>
  );
}
