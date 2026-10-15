# Changelog

Record of what changed and its impact, kept so a fresh session (or a
compacted context) can catch up by reading this file instead of needing
the full conversation history replayed. Newest first. See `git log` for
exact diffs — this file explains *why it matters*, which a diff doesn't.

## 2026-10-15 — Fixed: opening-scene flicker (infinite viewer remount loop)

**What**: `components/TourViewer.tsx`'s main mount effect listed `config`
and `onSceneChange` as dependencies. `onSceneChange` (`handleSceneChange`
in `TourShell.tsx`) gets a new identity on every call because it depends
on `router`/`pathname` and calls `router.replace` as part of the
2026-09 scene-deep-linking work — and separately, `config` was also
arriving with a fresh reference on every re-render in the static-export
build. Either one alone was enough to re-run the effect, which tears
down and reconstructs the entire PSV viewer (a WebGL context). Together
they fed back into each other: the viewer's own first `node-changed`
event changes the URL, which changes the dependency, which destroys and
rebuilds the viewer, which fires `node-changed` again — an infinite loop,
confirmed via instrumented tracing against the actual Docker image
(dozens of destroy/recreate cycles per second from page load, well
before any user interaction). Browsers cap simultaneous WebGL contexts;
once the loop blew past that, the viewer got stuck showing PSV's native
"Loading…" screen instead of the panorama — this is what the client saw
as flickering.

**Fix**: `onSceneChange` is now read through a ref
(`onSceneChangeRef`), matching the existing pattern already used for
`onHoverInfoMarker`/`onOpenInfoMarker` in the same file. `config` is now
deliberately *not* a dependency of this effect — nothing in the app
mutates it during an active viewing session (Studio's live preview uses
a separate component, not this one), and a real navigation to a
different tour already remounts this component via the route change, so
nothing relied on the reactivity. Both omissions are commented in place.

**Impact**: Confirmed fixed by rebuilding the actual `jamnagar-*`
Docker image and re-running the same frame-by-frame reproduction: the
opening scene now renders once and stays stable, with zero "Too many
active WebGL contexts" warnings (previously 2-50+ depending on how long
the page sat open). Added a regression test in
`components/TourViewer.test.tsx` that asserts the viewer is not
destroyed when `onSceneChange`'s identity changes between renders —
verified it fails without the fix before confirming it passes with it.
This bug shipped in every build made after the scene-deep-linking
feature landed. `jamnagar-viewer.tar` and `jamnagar-version2.0.tar` both
predate that feature and are unaffected; `jamnagar-latest.tar` (built
2026-10-12) was the first deliverable built with it active, and is the
one the client reported flickering on.

## 2026-09-22 — Smoke test script

**What**: Added `scripts/smoke-test.mjs` (`npm run smoke`). Runs
`tsc --noEmit` -> full Jest suite -> production build -> boots the real
standalone server and hits it like a client, checking gzip compression,
`?scene=` deep-linking (including the invalid-scene fallback), and the
tour config API route.

**Impact**: One command to confirm the app actually works end-to-end
after a change, not just that it compiles. Discovers tours dynamically
from `public/tours/`, so it keeps working as tours are added/removed.

## 2026-09-09 — Scaling item 1: tour data loading

**What**: `lib/tour-config.ts` gained a 10s TTL in-memory cache keyed by
slug, with `invalidateTourConfig(slug)` wired into the three places that
write `tour.config.json` (`app/api/studio/tours/[slug]/config` PUT,
`renameTour`/`deleteTour` in `lib/studio/tours.ts`). `renameTour`
invalidates *before* its read too, since it's a read-modify-write and a
stale cached read there could silently clobber a very recent Studio
save. Gzip compression was verified as already on by default (no code
change needed).

**Impact**: Fewer redundant disk reads + Zod re-validations per tour
under repeat traffic. Trade-off worth knowing: this introduces
per-process cached state where there was none before — fine at today's
single-instance deployment, but will need revisiting if the app ever
runs multiple replicas (see TODO.md item 4), since one replica's cache
wouldn't see another replica's Studio save.

**Deliberately not done**: splitting `tour.config.json` or switching PSV's
virtual-tour-plugin to a lazy `server` dataMode. Real added complexity
that only pays off well past ~1000 scenes; see `TODO.md`.

## 2026-09-08 — Scaling to-do list established

**What**: `TODO.md` created — target ~1000 scenes per tour, explicit bias
toward the simplest fix that clears that bar over a "more correct"
architecture that isn't needed yet.

**Impact**: Sets the scope and pace for further scaling work. Items 2-6
(asset delivery/CDN, Studio list virtualization, multi-instance infra,
auth/multi-tenancy, observability) are intentionally left undone until a
real signal (actual traffic, an actual huge tour, an actual second
editor) — not worked down as a speculative queue.

## Undated — Scene deep-linking

**What**: `components/TourShell.tsx` reads `?scene=<id>` on mount
(validated against the tour's scene list, falls back to
`meta.startScene` if missing/invalid) and calls `router.replace` to keep
the URL in sync on every scene change (replace, not push — doesn't spam
browser back-button history per hotspot click). `components/TourViewer.tsx`
gained an `initialSceneId` prop so the PSV viewer boots on the
deep-linked scene. `app/tours/[slug]/page.tsx` wraps `<TourShell>` in
`<Suspense>`, required by Next for any client component using
`useSearchParams()`.

**Impact**: Every scene in a tour now has a shareable URL
(`/tours/<slug>?scene=<sceneId>`) that loads directly to that scene.
Pure client-side — zero cost at any scene count, works identically in
the standalone static viewer export (no server-side routing changes
needed, since it's just a query string against the same static file).

## Undated — Deployable single-tour Docker builds

**What**: Fixed a real bug in `scripts/pull-tour.mjs` — `meta.floorPlan.image`
was never included when collecting/rewriting a tour's asset references
(only `meta.logo` and `meta.nadir.image` were), so any tour using the
floor plan overlay would produce a snapshot silently missing that image.
Now covered by `scripts/pull-tour.test.mjs`.

**Impact**: `pull-tour.mjs` + `build-viewer.mjs` (the existing
viewer-only single-tour Docker image pipeline) now produces correct,
complete standalone deployables for tours that use the floor plan —
previously those would have shipped with a 404'ing floor plan image.

## Reverted — not currently active

Direct click-through info markers (clicking a marker with a `ctaUrl`
navigating straight to that URL, bypassing the info panel) was
implemented, then explicitly reverted at request. Current behavior is
back to the original: `ctaLabel` + `ctaUrl` open the info panel, which
shows a labeled CTA button. Noted here only so this idea isn't
rediscovered and re-proposed without knowing it was already tried.

## Known issues — not yet fixed

- `.github/workflows/docker.yml` triggers on push to `master`, but this
  repo's actual branch is `main`. The documented CI image-build/publish
  flow in `docs/DEPLOYMENT.md` currently never fires as a result.
