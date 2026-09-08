'use client';

import { useEffect, useRef, useState } from 'react';
import type { InfoMarker } from '@/lib/types';
import { PdfViewer } from './PdfViewer';

interface MarkerState {
  marker: InfoMarker;
  x: number;
  y: number;
}

interface Props {
  hoverMarker: MarkerState | null;
  openMarker: MarkerState | null;
  themeColor?: string;
  onClose: () => void;
}

export function InfoMarkerPanel({ hoverMarker, openMarker, themeColor = '#60a5fa', onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const documentCloseRef = useRef<HTMLButtonElement>(null);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const lightboxUrl = openMarker?.marker.imageUrl === failedImageUrl ? undefined : openMarker?.marker.imageUrl;
  const documentUrl = lightboxUrl ? undefined : openMarker?.marker.documentUrl;

  useEffect(() => {
    if (!documentUrl) return;
    documentCloseRef.current?.focus();
  }, [documentUrl]);

  useEffect(() => {
    if (!documentUrl) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [documentUrl, onClose]);

  // Edge-clamp panel (for non-image markers that show the panel)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !openMarker) return;
    const { width, height } = panel.getBoundingClientRect();
    const x = Math.max(12, Math.min(openMarker.x + 20, window.innerWidth - width - 12));
    const y = Math.max(12, Math.min(openMarker.y - 8, window.innerHeight - height - 12));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  }, [openMarker]);

  if (!hoverMarker && !openMarker && !lightboxUrl && !documentUrl) return null;

  if (documentUrl) {
    const markerTitle = openMarker?.marker.title ?? 'Document';
    const closeDocument = onClose;
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={markerTitle}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/[0.94] p-3 sm:p-6"
        onClick={closeDocument}
      >
        <div
          className="h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-white/[0.09] bg-[#090b0e] shadow-[0_32px_96px_rgba(0,0,0,0.9)]"
          onClick={(event) => event.stopPropagation()}
        >
          <PdfViewer
            key={documentUrl}
            url={documentUrl}
            title={markerTitle}
            onClose={closeDocument}
            closeButtonRef={documentCloseRef}
          />
        </div>
      </div>
    );
  }

  // Full-screen lightbox — close clears both lightbox and openMarker
  if (lightboxUrl) {
    const markerTitle = openMarker?.marker.title;
    const closeLightbox = onClose;
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/[0.97]"
        onClick={closeLightbox}
      >
        <img
          src={lightboxUrl}
          alt={markerTitle ?? ''}
          className="max-h-[82vh] max-w-[82vw] object-contain"
          style={{ filter: 'drop-shadow(0 32px 64px rgba(0,0,0,1))' }}
          onError={() => setFailedImageUrl(lightboxUrl)}
          onClick={(e) => e.stopPropagation()}
        />
        {markerTitle && (
          <p className="mt-5 text-[12px] font-medium tracking-wide text-white/30">
            {markerTitle}
          </p>
        )}
        <button
          type="button"
          onClick={closeLightbox}
          className="absolute right-5 top-5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/40 backdrop-blur-sm transition-colors hover:border-white/25 hover:text-white/70"
        >
          Close
        </button>
      </div>
    );
  }

  // Hover state
  if (!openMarker && hoverMarker) {
    const hm = hoverMarker.marker;
    const hasBody = !!hm.body;
    const hasImage = !!hm.imageUrl && failedImageUrl !== hm.imageUrl;

    // Name pill only — no body or image
    if (!hasBody && !hasImage) {
      return (
        <div
          className="pointer-events-none absolute z-40 flex items-center gap-1.5 rounded-md border border-white/[0.09] bg-[#0c0e11]/90 px-2.5 py-1.5 shadow-xl backdrop-blur-xl"
          style={{ left: hoverMarker.x + 14, top: hoverMarker.y - 10 }}
        >
          <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: 'rgb(56 189 248 / 0.75)' }} />
          <span className="text-[11px] font-medium text-white/75">{hm.title ?? 'Info'}</span>
        </div>
      );
    }

    // Expanded hover panel — body text + image thumbnail
    return (
      <div
        className="pointer-events-none absolute z-40 w-[228px] overflow-hidden rounded-xl bg-[#0c0e11]/93 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        style={{
          left: hoverMarker.x + 14,
          top: hoverMarker.y - 10,
          border: '1px solid rgba(255,255,255,0.07)',
          borderTop: '1.5px solid rgba(56,189,248,0.22)',
        }}
      >
        {hm.title && (
          <p className="px-4 pb-2 pt-3.5 text-[13px] font-semibold leading-tight tracking-tight text-white/92">
            {hm.title}
          </p>
        )}
        {(hasBody || hasImage) && <div className="mx-4 border-t border-white/[0.05]" />}
        <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
          {hasImage && (
            <img
              src={hm.imageUrl}
              alt={hm.title ?? ''}
              loading="lazy"
              className="w-full rounded-lg object-cover"
              style={{ maxHeight: '140px' }}
              onError={() => setFailedImageUrl(hm.imageUrl ?? null)}
            />
          )}
          {hasBody && (
            <p className="text-[11px] leading-[1.65] text-white/42">{hm.body}</p>
          )}
        </div>
      </div>
    );
  }

  // Panel — only for markers without an image (body text, document, CTA)
  if (!openMarker || openMarker.marker.imageUrl) return null;

  const m = openMarker.marker;
  const hasContent = m.body || (m.ctaUrl && m.ctaLabel);

  return (
    <>
      {/*
        Backdrop: fixed inset-0, sits below panel (z-39) but above PSV canvas.
        PSV swallows mousedown on the canvas so document listeners don't fire —
        this overlay is the reliable click-outside pattern.
      */}
      <div className="fixed inset-0 z-[39]" onClick={onClose} />

      <div
        ref={panelRef}
        className="absolute z-40 w-[228px] overflow-hidden rounded-xl bg-[#0c0e11]/93 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: '1.5px solid rgba(56,189,248,0.22)' }}
      >
        <div className="flex items-start justify-between gap-2 px-4 pb-2.5 pt-3.5">
          <p className="text-[13px] font-semibold leading-tight tracking-tight text-white/92">
            {m.title ?? 'Info'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-px shrink-0 text-white/20 transition-colors hover:text-white/55"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {hasContent && <div className="mx-4 border-t border-white/[0.05]" />}

        {hasContent && (
          <div className="flex flex-col gap-2.5 px-4 pb-4 pt-3">
            {m.body && (
              <p className="text-[11px] leading-[1.65] text-white/42">{m.body}</p>
            )}
            {m.ctaUrl && m.ctaLabel && (
              <a
                href={m.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-lg py-2 text-center text-[11px] font-semibold text-white transition-opacity hover:opacity-85"
                style={{ background: themeColor }}
              >
                {m.ctaLabel}
              </a>
            )}
          </div>
        )}
      </div>
    </>
  );
}
