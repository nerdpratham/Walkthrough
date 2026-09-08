'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { TourConfig } from '@/lib/types';
import { exportTourConfig } from '@/lib/studio/export-config';
import type { TourValidationResult } from '@/lib/studio/tour-validation';

interface Props {
  slug: string;
  config: TourConfig;
  mode: 'edit' | 'preview';
  validation: TourValidationResult;
  historyCount: number;
  saveStatus: 'idle' | 'saving' | 'saved' | 'failed' | 'dev-only';
  onSave: () => Promise<void>;
  onModeChange: (mode: 'edit' | 'preview') => void;
  onTitleChange?: (title: string) => void;
}

export function StudioTopBar({ slug, config, mode, validation, historyCount, saveStatus, onSave, onModeChange, onTitleChange }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  const startTitleEdit = () => {
    if (!onTitleChange) return;
    setTitleValue(config.meta.title);
    setEditingTitle(true);
  };
  const commitTitle = () => {
    const trimmed = titleValue.trim();
    if (trimmed && onTitleChange) onTitleChange(trimmed);
    setEditingTitle(false);
  };

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const qualityLabel = hasErrors
    ? `${validation.errors.length} errors`
    : hasWarnings
      ? `${validation.warnings.length} warnings`
      : 'Ready';

  const statusLabel = saveStatus === 'saved'
    ? 'Saved'
    : saveStatus === 'failed'
      ? 'Save failed'
      : saveStatus === 'dev-only'
        ? 'Development save only'
        : saveStatus === 'saving'
          ? 'Saving...'
          : '';

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 bg-[#0f141a] px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/studio"
          className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-300 hover:bg-white/[0.08]"
        >
          ← Tours
        </Link>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">Studio / {slug}</p>
          {editingTitle ? (
            <input
              value={titleValue}
              autoFocus
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              className="w-full border-b border-cyan-400/60 bg-transparent text-sm font-semibold text-slate-100 outline-none"
            />
          ) : (
            <h1
              onDoubleClick={startTitleEdit}
              title={onTitleChange ? 'Double-click to rename' : undefined}
              className="truncate text-sm font-semibold text-slate-100"
            >
              {config.meta.title}
            </h1>
          )}
        </div>
      </div>

      <div className="flex rounded-md border border-white/10 bg-black/30 p-0.5">
        {(['edit', 'preview'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onModeChange(item)}
            className={
              item === mode
                ? 'rounded bg-cyan-400 px-3 py-1 text-xs font-semibold text-slate-950'
                : 'rounded px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-100'
            }
          >
            {item === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2">
        {historyCount > 0 && (
          <span className="rounded border border-white/10 px-2 py-1 text-xs text-slate-500">
            ↩ {historyCount}
          </span>
        )}
        <span
          className={
            hasErrors
              ? 'rounded border border-red-400/30 bg-red-400/10 px-2 py-1 text-xs text-red-200'
              : hasWarnings
                ? 'rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-xs text-amber-200'
                : 'rounded border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-200'
          }
        >
          {qualityLabel}
        </span>
        <button
          type="button"
          onClick={() => exportTourConfig(config, `${slug}.tour.config.json`)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.08]"
        >
          Export
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Save
        </button>
        {statusLabel && <span className="text-xs text-slate-400">{statusLabel}</span>}
      </div>
    </header>
  );
}
