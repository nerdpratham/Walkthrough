'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FloorPlanMarker, TourConfig } from '@/lib/types';
import { addFloorPlanMarker, removeFloorPlanMarker, updateFloorPlanMarker } from '@/lib/studio/editor-state';

interface Props {
  config: TourConfig;
  activeSceneId: string;
  onConfigChange: (config: TourConfig) => void;
  onClose: () => void;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function FloorPlanEditor({ config, activeSceneId, onConfigChange, onClose }: Props) {
  const fp = config.meta.floorPlan;
  const imgRef = useRef<HTMLImageElement>(null);
  const sizeId = useId();

  const [newMarkerSceneId, setNewMarkerSceneId] = useState(activeSceneId);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const dragIndexRef = useRef<number | null>(null);
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  const justDraggedRef = useRef(false);

  // Drag needs to read the latest config/onConfigChange on mouseup without
  // resubscribing the window listener on every mousemove-driven re-render.
  const configRef = useRef(config);
  const onConfigChangeRef = useRef(onConfigChange);
  useEffect(() => {
    configRef.current = config;
    onConfigChangeRef.current = onConfigChange;
  }, [config, onConfigChange]);

  const posFromEvent = (clientX: number, clientY: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
    };
  };

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (dragIndexRef.current === null) return;
      const pos = posFromEvent(event.clientX, event.clientY);
      if (!pos) return;
      dragPosRef.current = pos;
      justDraggedRef.current = true;
      setDragPos(pos);
    };
    const handleUp = () => {
      if (dragIndexRef.current !== null && dragPosRef.current) {
        onConfigChangeRef.current(updateFloorPlanMarker(configRef.current, dragIndexRef.current, dragPosRef.current));
      }
      dragIndexRef.current = null;
      dragPosRef.current = null;
      setDragPos(null);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIndex !== null) {
        event.preventDefault();
        event.stopPropagation();
        onConfigChange(removeFloorPlanMarker(config, selectedIndex));
        setSelectedIndex(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [config, onConfigChange, onClose, selectedIndex]);

  if (!fp) return null;
  const markers = fp.markers;
  const selected = selectedIndex !== null ? markers[selectedIndex] : null;

  const handleImageClick = (event: React.MouseEvent) => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    const pos = posFromEvent(event.clientX, event.clientY);
    if (!pos) return;
    const marker: FloorPlanMarker = { sceneId: newMarkerSceneId, x: pos.x, y: pos.y, size: 20 };
    onConfigChange(addFloorPlanMarker(config, marker));
    setSelectedIndex(markers.length);
  };

  const handleMarkerMouseDown = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    dragIndexRef.current = index;
    setSelectedIndex(index);
  };

  const handleMarkerClick = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    justDraggedRef.current = false;
    setSelectedIndex(index);
  };

  const update = (patch: Partial<FloorPlanMarker>) => {
    if (selectedIndex === null) return;
    onConfigChange(updateFloorPlanMarker(config, selectedIndex, patch));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Floor plan marker editor"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close floor plan editor"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white/70 ring-1 ring-white/20 transition hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-slate-900/90 px-4 py-2 text-xs text-slate-200 shadow-lg backdrop-blur-sm">
        <label className="flex items-center gap-2">
          New marker scene
          <select
            value={newMarkerSceneId}
            onChange={(event) => setNewMarkerSceneId(event.target.value)}
            className="rounded border border-white/10 bg-[#111820] px-2 py-1 text-xs text-white outline-none focus:border-cyan-400"
          >
            {config.scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>{scene.label}</option>
            ))}
          </select>
        </label>
        <span className="text-slate-500">{markers.length} marker{markers.length === 1 ? '' : 's'}</span>
      </div>

      <div className="relative max-h-[85vh] max-w-[85vw]" onClick={handleImageClick}>
        <img
          ref={imgRef}
          src={fp.image}
          alt="Floor plan"
          className="block max-h-[85vh] max-w-[85vw] select-none"
          draggable={false}
        />
        {markers.map((marker, index) => {
          const pos = selectedIndex === index && dragPos ? dragPos : { x: marker.x, y: marker.y };
          const isSelected = selectedIndex === index;
          return (
            <button
              key={index}
              type="button"
              onMouseDown={(event) => handleMarkerMouseDown(event, index)}
              onClick={(event) => handleMarkerClick(event, index)}
              aria-label={marker.label ? `Marker ${marker.label}` : `Marker ${index + 1}`}
              className="absolute flex cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: marker.size,
                height: marker.size,
                transform: 'translate(-50%, -50%)',
                backgroundColor: isSelected ? '#22d3ee' : 'rgba(255,255,255,0.85)',
                border: isSelected ? '2px solid white' : '1px solid rgba(0,0,0,0.4)',
              }}
            >
              {marker.label && (
                <span className="select-none text-[10px] font-semibold text-black">{marker.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {selected && selectedIndex !== null && (
        <div className="absolute bottom-4 right-4 z-10 w-64 rounded-lg border border-white/10 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-lg backdrop-blur-sm">
          <label className="mb-2 block text-slate-400">
            Scene
            <select
              value={selected.sceneId}
              onChange={(event) => update({ sceneId: event.target.value })}
              className="mt-1 w-full rounded border border-white/10 bg-[#111820] px-2 py-1 text-white outline-none focus:border-cyan-400"
            >
              {config.scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>{scene.label}</option>
              ))}
            </select>
          </label>

          <label className="mb-2 block text-slate-400">
            Label
            <input
              value={selected.label ?? ''}
              onChange={(event) => update({ label: event.target.value || undefined })}
              className="mt-1 w-full rounded border border-white/10 bg-[#111820] px-2 py-1 text-white outline-none focus:border-cyan-400"
            />
          </label>

          <div className="mb-3">
            <div className="flex items-center justify-between">
              <label htmlFor={sizeId} className="text-slate-400">Size</label>
              <span className="text-slate-500">{selected.size}px</span>
            </div>
            <input
              id={sizeId}
              type="range"
              min={8}
              max={48}
              value={selected.size}
              onChange={(event) => update({ size: Number(event.target.value) })}
              className="mt-1 w-full"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onConfigChange(removeFloorPlanMarker(config, selectedIndex));
              setSelectedIndex(null);
            }}
            className="w-full rounded-md border border-red-400/30 bg-red-400/10 px-2 py-1.5 text-red-100 transition-colors hover:bg-red-400/20"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
