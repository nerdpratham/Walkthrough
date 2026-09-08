'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

interface Props {
  url: string;
  title: string;
  onClose: () => void;
  closeButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

const MIN_SCALE = 0.75;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

export function PdfViewer({ url, title, onClose, closeButtonRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [renderedKey, setRenderedKey] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let loadedDocument: PDFDocumentProxy | null = null;

    void import('pdfjs-dist').then(async (pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      const loadingTask = pdfjs.getDocument(url);
      loadedDocument = await loadingTask.promise;
      if (disposed) {
        await loadedDocument.destroy();
        return;
      }
      setDocument(loadedDocument);
      setStatus('ready');
    }).catch(() => {
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      setDocument(null);
      void loadedDocument?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!document || !canvasRef.current) return;

    let disposed = false;
    let renderTask: RenderTask | null = null;
    const renderKey = `${pageNumber}:${scale}`;

    void document.getPage(pageNumber).then(async (page) => {
      if (disposed || !canvasRef.current) return;
      const viewport = page.getViewport({ scale });
      const outputScale = window.devicePixelRatio || 1;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable');

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      });
      await renderTask.promise;
      if (!disposed) {
        setRenderedKey(renderKey);
        setStatus('ready');
      }
    }).catch((error: unknown) => {
      if (!disposed && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
        setStatus('error');
      }
    });

    return () => {
      disposed = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber, scale]);

  const pageCount = document?.numPages ?? 0;
  const isRendered = renderedKey === `${pageNumber}:${scale}`;
  const controlClass = 'grid h-8 w-8 place-items-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white disabled:pointer-events-none disabled:opacity-20';

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#090b0e]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] px-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-white/88">{title}</p>
          <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/25">Document viewer</p>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={url}
            download
            aria-label="Download document"
            className={controlClass}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
            </svg>
          </a>
          <button ref={closeButtonRef} type="button" aria-label="Close document" onClick={onClose} className={controlClass}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 5l14 14M19 5 5 19" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.055),transparent_42%)] p-5 sm:p-8">
        <div className="flex min-h-full min-w-max items-center justify-center">
          {(status === 'loading' || (status === 'ready' && !isRendered)) && (
            <div role="status" className="flex flex-col items-center gap-3 text-white/35">
              <span className="h-5 w-5 animate-spin rounded-full border border-white/15 border-t-white/60" />
              <span className="text-[10px] uppercase tracking-[0.18em]">Rendering document</span>
            </div>
          )}
          {status === 'error' && (
            <div role="alert" className="max-w-xs text-center">
              <p className="text-sm font-semibold text-white/80">This document could not be rendered.</p>
              <a href={url} download className="mt-3 inline-block text-[11px] text-sky-300/70 hover:text-sky-200">Download PDF</a>
            </div>
          )}
          <canvas
            ref={canvasRef}
            aria-label={`${title}, page ${pageNumber}`}
            data-rendered={isRendered ? 'true' : undefined}
            className={`bg-white shadow-[0_28px_90px_rgba(0,0,0,0.55)] transition-opacity duration-200 ${status === 'ready' && isRendered ? 'opacity-100' : 'absolute opacity-0'}`}
          />
        </div>
      </div>

      <footer className="flex h-14 shrink-0 items-center justify-center border-t border-white/[0.07] px-3">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1 shadow-xl">
          <button type="button" aria-label="Previous page" disabled={pageNumber <= 1} onClick={() => setPageNumber((page) => page - 1)} className={controlClass}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span className="min-w-16 px-1 text-center text-[10px] tabular-nums text-white/45">
            {pageCount ? `${pageNumber} / ${pageCount}` : '...'}
          </span>
          <button type="button" aria-label="Next page" disabled={!pageCount || pageNumber >= pageCount} onClick={() => setPageNumber((page) => page + 1)} className={controlClass}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
          <span className="mx-1 h-4 w-px bg-white/[0.08]" />
          <button type="button" aria-label="Zoom out" disabled={scale <= MIN_SCALE} onClick={() => setScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))} className={controlClass}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <span className="min-w-10 text-center text-[9px] tabular-nums text-white/35">{Math.round(scale * 100)}%</span>
          <button type="button" aria-label="Zoom in" disabled={scale >= MAX_SCALE} onClick={() => setScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))} className={controlClass}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </footer>
    </div>
  );
}
