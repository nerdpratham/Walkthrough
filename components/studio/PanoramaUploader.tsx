'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface UploadResult {
  filename: string;
  size?: number;
  error?: string;
}

interface Props {
  slug: string;
  onUploaded: (filenames: string[]) => void;
  /** When set, files dropped anywhere on the page are uploaded (creation page). */
  dropAnywhere?: boolean;
}

export function PanoramaUploader({ slug, onUploaded, dropAnywhere = false }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    setResults([]);

    // One request per file. Raw captures are 20-30MB each, so sending them all
    // in a single body would buffer hundreds of MB in the proxy and process
    // every image at once. Sequential keeps each request small and steady.
    const collected: UploadResult[] = [];
    const ok: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append('files', file);
        const res = await fetch(`/api/studio/tours/${slug}/panoramas`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const data: { files: UploadResult[] } = await res.json();
        const result = data.files[0] ?? { filename: file.name, error: 'Upload failed' };
        collected.push(result);
        if (!result.error) ok.push(result.filename);
      } catch {
        collected.push({ filename: file.name, error: 'Upload failed' });
      }
      setResults([...collected]);
    }

    if (ok.length > 0) onUploaded(ok);
    else setError('Upload failed. Try again.');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  // Keep a live reference so the window listeners always call the latest upload.
  const uploadRef = useRef(upload);
  useEffect(() => { uploadRef.current = upload; });

  // Creation page: the whole window is a drop target, and stray drops are
  // swallowed so the browser never opens the image instead of uploading it.
  useEffect(() => {
    if (!dropAnywhere) return;
    const onOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const onLeave = (e: DragEvent) => { if (e.relatedTarget === null) setDragging(false); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      uploadRef.current(e.dataTransfer?.files ?? null);
    };
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [dropAnywhere]);

  return (
    <div className="border-t border-white/10 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Add panoramas
      </p>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg"
        multiple
        disabled={uploading}
        onChange={(e) => upload(e.target.files)}
        className="sr-only"
      />
      <label
        htmlFor={inputId}
        className={`block w-full rounded-md bg-cyan-400 px-3 py-2 text-center text-xs font-semibold text-slate-950 ${uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-cyan-300'}`}
      >
        {uploading ? 'Uploading…' : 'Choose images'}
      </label>
      {uploading && <p className="mt-2 text-xs text-slate-400">Uploading and optimizing…</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {results.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {results.map((r) => (
            <li
              key={r.filename}
              className={r.error ? 'text-xs text-red-400' : 'text-xs text-emerald-300'}
            >
              {r.error ? `${r.filename}: ${r.error}` : `✓ ${r.filename}`}
            </li>
          ))}
        </ul>
      )}

      {dropAnywhere && dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-cyan-950/40 backdrop-blur-sm">
          <div className="rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-400/10 px-10 py-8 text-sm font-semibold text-cyan-100">
            Drop images anywhere to upload
          </div>
        </div>
      )}
    </div>
  );
}
