'use client';

import { useId } from 'react';
import type { TourConfig } from '@/lib/types';
import { setNadir } from '@/lib/studio/editor-state';
import { useAssetUpload } from '@/lib/studio/use-asset-upload';
import { CollapsibleSection } from './CollapsibleSection';

interface Props {
  slug: string;
  config: TourConfig;
  onConfigChange: (config: TourConfig) => void;
}

export function NadirInspector({ slug, config, onConfigChange }: Props) {
  const nadir = config.meta.nadir;
  const patch = (value: Partial<TourConfig['meta']['nadir']>) => {
    onConfigChange(setNadir(config, value));
  };

  const statusId = useId();
  const { fileInputRef, isUploading, error, upload } = useAssetUpload(
    slug,
    '.jpg,.jpeg,.png,.webp',
    (url) => patch({ image: url || undefined }),
  );

  return (
    <CollapsibleSection
      id="nadir"
      title="Nadir Patch"
      right={
        <label className="text-xs text-slate-300">
          <input
            type="checkbox"
            checked={nadir.enabled}
            onChange={(event) => patch({ enabled: event.target.checked })}
          />{' '}
          Enabled
        </label>
      }
    >
      <div className="mb-3">
        <span className="block text-xs text-slate-400">Image</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-slate-400">
            {nadir.image ? nadir.image.split('/').pop() : 'No file'}
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:border-amber-400/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
          {nadir.image && (
            <button
              type="button"
              onClick={() => patch({ image: undefined })}
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
          aria-label="Upload nadir image"
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
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-slate-400">
          Size
          <input
            type="number"
            value={nadir.size}
            onChange={(event) => patch({ size: Number(event.target.value) })}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Opacity
          <input
            type="number"
            step="0.05"
            value={nadir.opacity}
            onChange={(event) => patch({ opacity: Number(event.target.value) })}
            className="mt-1 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400"
          />
        </label>
      </div>
    </CollapsibleSection>
  );
}
