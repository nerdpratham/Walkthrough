'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TourSummary {
  slug: string;
  title: string;
  sceneCount: number;
}

export default function StudioHomePage() {
  const router = useRouter();
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/studio/tours');
        if (!res.ok) throw new Error('Failed to load tours');
        const data: TourSummary[] = await res.json();
        if (active) setTours(data);
      } catch {
        if (active) setError('Could not load tours.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // No tour is written to disk here — we just open the creation page on a fresh
  // id. The folder and config are created on the first panorama upload, so an
  // abandoned "New tour" never leaves an empty project behind. The name is set
  // on that page (defaults to "New Tour").
  function handleNewTour() {
    router.push(`/studio/tours/${crypto.randomUUID()}`);
  }

  async function handleLogout() {
    await fetch('/api/studio/auth/logout', { method: 'POST' });
    router.push('/studio/login');
  }

  async function handleDelete(slug: string, title: string) {
    if (!confirm(`Delete "${title}"? This removes the tour and its panoramas, and cannot be undone.`)) return;
    const prev = tours;
    setTours((t) => t.filter((x) => x.slug !== slug));
    const res = await fetch(`/api/studio/tours/${slug}`, { method: 'DELETE' });
    if (!res.ok) {
      setTours(prev);
      setError('Could not delete the tour.');
    }
  }

  function startRename(slug: string, title: string) {
    setEditingSlug(slug);
    setEditValue(title);
    setError('');
  }

  async function commitRename(slug: string) {
    const title = editValue.trim();
    setEditingSlug(null);
    if (!title) return;
    const prev = tours;
    setTours((t) => t.map((x) => (x.slug === slug ? { ...x, title } : x)));
    const res = await fetch(`/api/studio/tours/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      setTours(prev);
      setError('Could not rename the tour.');
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f14] text-slate-100">
      <aside className="flex w-60 shrink-0 flex-col gap-6 border-r border-white/10 bg-[#0f141a] p-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Site Tour</p>
          <h1 className="text-lg font-semibold text-slate-100">Studio</h1>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleNewTour}
            className="rounded-md bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            New tour
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.08]"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <h2 className="mb-6 text-sm font-medium text-slate-400">
          {loading ? 'Loading tours…' : `${tours.length} ${tours.length === 1 ? 'tour' : 'tours'}`}
        </h2>

        {error && (
          <p className="mb-4 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {!loading && tours.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-white/10 p-10 text-center">
            <p className="text-sm text-slate-400">No tours yet.</p>
            <p className="mt-1 text-xs text-slate-500">
              Click “New tour” to create your first one.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <div key={tour.slug} className="group relative">
              {editingSlug === tour.slug ? (
                <div className="flex flex-col gap-3 rounded-lg border border-cyan-400/40 bg-[#0f141a] p-4">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename(tour.slug);
                      if (e.key === 'Escape') setEditingSlug(null);
                    }}
                    className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => commitRename(tour.slug)}
                      className="flex-1 rounded-md bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-300"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSlug(null)}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.08]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    href={`/studio/tours/${tour.slug}`}
                    className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#0f141a] p-4 transition hover:border-cyan-400/40 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 pr-12">
                      <h3 className="truncate text-base font-semibold text-slate-100 group-hover:text-cyan-300">
                        {tour.title}
                      </h3>
                      <p className="truncate font-mono text-xs text-slate-500">{tour.slug}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {tour.sceneCount} {tour.sceneCount === 1 ? 'scene' : 'scenes'}
                      </span>
                      <span className="text-xs font-medium text-slate-500 group-hover:text-cyan-300">
                        Open →
                      </span>
                    </div>
                  </Link>
                  <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => startRename(tour.slug, tour.title)}
                      aria-label="Rename tour"
                      className="rounded p-1 text-sm text-slate-500 hover:bg-white/10 hover:text-slate-200"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tour.slug, tour.title)}
                      aria-label="Delete tour"
                      className="rounded p-1 text-sm text-slate-500 hover:bg-red-400/10 hover:text-red-400"
                    >
                      🗑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
