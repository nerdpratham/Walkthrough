'use client';

import { useId } from 'react';
import { useAssetUpload } from '@/lib/studio/use-asset-upload';

interface Props {
  slug: string;
  label: string;
  value: string;
  accept: string;
  helper: string;
  onChange: (url: string) => void;
}

export function MarkerAssetField({
  slug,
  label,
  value,
  accept,
  helper,
  onChange,
}: Props) {
  const inputId = useId();
  const statusId = useId();
  const { fileInputRef, isUploading, error, upload } = useAssetUpload(slug, accept, onChange);

  return (
    <div className="mb-3">
      <label htmlFor={inputId} className="block text-xs text-slate-400">
        {label}
      </label>
      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={isUploading}
          aria-describedby={statusId}
          className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none transition-colors focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:border-amber-400/50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        aria-label={`Upload ${label}`}
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
        {error ?? helper}
      </p>
    </div>
  );
}
