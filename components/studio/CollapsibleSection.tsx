'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  /** Stable id used to remember open/closed state across scene switches and reloads. */
  id: string;
  title: string;
  /** Optional controls or badge shown on the right of the header (clicks don't toggle). */
  right?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Inspector section with a clickable header that collapses its body. Open state
 * is per-id and persisted in localStorage, so tour-wide panels a user closed
 * stay closed while they move between scenes.
 */
export function CollapsibleSection({ id, title, right, defaultOpen = true, children }: Props) {
  const key = `studio.section.${id}`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setOpen(stored === '1');
    } catch {
      // localStorage blocked (private mode): keep the default.
    }
  }, [key]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // ignore write failures
      }
      return next;
    });
  };

  return (
    <section className="border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200"
        >
          <svg
            viewBox="0 0 16 16"
            className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {title}
        </button>
        {right}
      </div>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
