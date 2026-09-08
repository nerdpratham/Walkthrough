'use client';

import { useId, useState } from 'react';
import type { FloorPlanConfig, TourConfig } from '@/lib/types';
import { setFloorPlan } from '@/lib/studio/editor-state';
import { useAssetUpload } from '@/lib/studio/use-asset-upload';
import { CollapsibleSection } from './CollapsibleSection';
import { FloorPlanEditor } from './FloorPlanEditor';

interface Props {
  slug: string;
  config: TourConfig;
  activeSceneId: string;
  onConfigChange: (config: TourConfig) => void;
}

export function FloorPlanInspector({ slug, config, activeSceneId, onConfigChange }: Props) {
  const fp = config.meta.floorPlan;
  const patch = (value: Partial<FloorPlanConfig>) => onConfigChange(setFloorPlan(config, value));
  const [editorOpen, setEditorOpen] = useState(false);

  const statusId = useId();
  const { fileInputRef, isUploading, error, upload } = useAssetUpload(
    slug,
    '.jpg,.jpeg,.png,.webp',
    (url) => patch({ image: url }),
  );

  return (
    <CollapsibleSection
      id="floor-plan"
      title="Floor Plan"
      right={
        fp && (
          <span className="text-[11px] text-slate-500">
            {fp.markers.length} marker{fp.markers.length === 1 ? '' : 's'}
          </span>
        )
      }
    >
      <div className="mb-3">
        <span className="block text-xs text-slate-400">Image</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-slate-400">
            {fp ? fp.image.split('/').pop() : 'No file'}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:border-amber-400/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
          {fp && (
            <button
              type="button"
              onClick={() => patch({ image: '' })}
              className="shrink-0 rounded-md border border-white/10 px-2 py-1.5 text-xs text-slate-400 transition-colors hover:border-red-400/30 hover:text-red-300"
            >
              Clear
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          aria-label="Upload floor plan image"
          aria-describedby={statusId}
          onChange={upload}
          disabled={isUploading}
          className="hidden"
        />
        <p
          id={statusId}
          aria-live="polite"
          className={
            error
              ? 'mt-1 min-h-4 truncate text-[11px] leading-4 text-red-300'
              : 'mt-1 min-h-4 truncate text-[11px] leading-4 text-slate-500'
          }
        >
          {error ?? 'JPG, PNG or WebP'}
        </p>
      </div>

      {fp && (
        <button
          type="button"
          onClick={() => setEditorOpen(true)}
          className="w-full rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-medium text-cyan-100 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/20"
        >
          Edit Markers
        </button>
      )}

      {editorOpen && fp && (
        <FloorPlanEditor
          config={config}
          activeSceneId={activeSceneId}
          onConfigChange={onConfigChange}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </CollapsibleSection>
  );
}
