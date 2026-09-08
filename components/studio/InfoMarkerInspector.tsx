'use client';

import type { InfoMarker, TourConfig } from '@/lib/types';
import { removeInfoMarker, updateInfoMarker } from '@/lib/studio/editor-state';
import { CollapsibleSection } from './CollapsibleSection';
import { MarkerAssetField } from './MarkerAssetField';

interface Props {
  slug: string;
  config: TourConfig;
  sceneId: string;
  selectedMarkerId: string | null;
  currentYaw: number;
  currentPitch: number;
  isPlacingInfoMarker: boolean;
  onConfigChange: (config: TourConfig) => void;
  onSelectMarker: (id: string | null) => void;
  onStartPlace: () => void;
  onMarkerAssetChange: (
    sceneId: string,
    markerId: string,
    field: 'imageUrl' | 'documentUrl',
    url: string,
  ) => void;
}

export function InfoMarkerInspector({
  slug,
  config,
  sceneId,
  selectedMarkerId,
  currentYaw,
  currentPitch,
  isPlacingInfoMarker,
  onConfigChange,
  onSelectMarker,
  onStartPlace,
  onMarkerAssetChange,
}: Props) {
  const scene = config.scenes.find((s) => s.id === sceneId);
  const markers = scene?.infoMarkers ?? [];
  const selected = markers.find((m) => m.id === selectedMarkerId) ?? null;

  const inputCls = 'mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-amber-400';
  const useViewCls = 'mt-5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 text-xs text-amber-100 hover:bg-amber-400/20';

  const update = (patch: Partial<InfoMarker>) => {
    if (!selectedMarkerId) return;
    onConfigChange(updateInfoMarker(config, sceneId, selectedMarkerId, patch));
  };

  return (
    <CollapsibleSection
      id="info-markers"
      title="Info Markers"
      right={
        <div className="flex items-center gap-2">
          {selected && (
            <button
              type="button"
              onClick={() => {
                onConfigChange(removeInfoMarker(config, sceneId, selectedMarkerId!));
                onSelectMarker(null);
              }}
              className="rounded-md border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs text-red-100 hover:bg-red-400/20"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={onStartPlace}
            disabled={isPlacingInfoMarker}
            className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-100 hover:bg-amber-400/20 disabled:opacity-40"
          >
            {isPlacingInfoMarker ? 'Click panorama…' : 'Add marker'}
          </button>
        </div>
      }
    >

      <div className="mb-4 space-y-2">
        {markers.length === 0 && !isPlacingInfoMarker && (
          <p className="text-sm text-slate-500">No info markers in this scene.</p>
        )}
        {markers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelectMarker(m.id)}
            className={
              selectedMarkerId === m.id
                ? 'flex w-full items-center justify-between rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-2 text-left text-xs text-amber-100'
                : 'flex w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-left text-xs text-slate-300 hover:border-white/20'
            }
          >
            <span className="truncate">{m.title || m.id}</span>
            <span className="ml-auto flex items-center gap-2">
              {!m.enabled && (
                <span className="rounded border border-slate-600 bg-slate-700 px-1 text-[10px] text-slate-400">off</span>
              )}
              <span className="shrink-0 text-slate-400">{Math.round(m.yaw)}°</span>
            </span>
          </button>
        ))}
      </div>

      {!selected ? (
        <p className="text-sm text-slate-500">Select a marker above to edit its content.</p>
      ) : (
        <>
          <label className="mb-3 block text-xs text-slate-400">
            Title
            <input
              value={selected.title ?? ''}
              onChange={(e) => update({ title: e.target.value || undefined })}
              placeholder="Marker title"
              className={inputCls}
            />
          </label>

          <label className="mb-3 flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={selected.showLabel ?? false}
              onChange={(e) => update({ showLabel: e.target.checked })}
            />
            Always show label
          </label>

          <label className="mb-3 block text-xs text-slate-400">
            Tab title
            <input
              value={selected.tabTitle ?? ''}
              onChange={(e) => update({ tabTitle: e.target.value || undefined })}
              placeholder="Optional browser tab title"
              className={inputCls}
            />
          </label>

          <label className="mb-3 block text-xs text-slate-400">
            Body
            <textarea
              value={selected.body ?? ''}
              onChange={(e) => update({ body: e.target.value || undefined })}
              rows={3}
              placeholder="Description text"
              className={`${inputCls} resize-none`}
            />
          </label>

          <MarkerAssetField
            slug={slug}
            label="Image URL"
            value={selected.imageUrl ?? ''}
            accept=".jpg,.jpeg,.png,.webp"
            helper="JPG, PNG or WebP"
            onChange={(url) => onMarkerAssetChange(sceneId, selected.id, 'imageUrl', url)}
          />


          <MarkerAssetField
            slug={slug}
            label="Document URL"
            value={selected.documentUrl ?? ''}
            accept=".pdf"
            helper="PDF only"
            onChange={(url) => onMarkerAssetChange(sceneId, selected.id, 'documentUrl', url)}
          />

          <div className="mb-3 grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-400">
              CTA Label
              <input
                value={selected.ctaLabel ?? ''}
                onChange={(e) => update({ ctaLabel: e.target.value || undefined })}
                placeholder="Book now"
                className={inputCls}
              />
            </label>
            <label className="block text-xs text-slate-400">
              CTA URL
              <input
                value={selected.ctaUrl ?? ''}
                onChange={(e) => update({ ctaUrl: e.target.value || undefined })}
                placeholder="https://…"
                className={inputCls}
              />
            </label>
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Position</p>
          <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2">
            <label className="block text-xs text-slate-400">
              Yaw
              <input
                type="number"
                value={selected.yaw}
                onChange={(e) => update({ yaw: Number(e.target.value) })}
                className={inputCls}
              />
            </label>
            <label className="block text-xs text-slate-400">
              Pitch
              <input
                type="number"
                value={selected.pitch}
                onChange={(e) => update({ pitch: Number(e.target.value) })}
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => update({ yaw: currentYaw, pitch: currentPitch })}
              className={useViewCls}
            >
              Use view
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={selected.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Enabled
          </label>
        </>
      )}
    </CollapsibleSection>
  );
}
