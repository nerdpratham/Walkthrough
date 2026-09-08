# Site Tour — Agent & Developer Guide

<!-- Inherited Next.js rule — this is Next.js 16 (not 15). APIs may differ from training data. -->
<!-- BEGIN:nextjs-agent-rules -->
This version has breaking changes — APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
<!-- END:nextjs-agent-rules -->

---

## What This Is

A self-hosted virtual walkthrough system built from 360° panoramas. Matterport-quality free navigation — every capture point has hotspots in all visible directions, direction-aware arrival, smooth zoom+crossfade transitions.

---

## Stack

| Layer | Version | Notes |
|-------|---------|-------|
| Next.js | 16.2.6 | App Router, Turbopack |
| React | 19 | |
| TypeScript | 5 | strict mode |
| Tailwind CSS | 4 | uses `@import "tailwindcss"` — no tailwind.config.ts |
| Photo Sphere Viewer | 5.14 | Virtual Tour + Markers plugins |
| Zod | 4 | schema validation |
| Sharp | dev | image optimization script only |
| Jest | 30 | + ts-jest + Testing Library |

---

## Commands

```bash
npm run dev        # dev server (Turbopack, port 3000)
npm run build      # production build
npm run start      # serve production build
npx jest           # run all tests
npx tsc --noEmit   # type check only
```

---

## Folder Structure

```
app/
  layout.tsx               # root layout
  page.tsx                 # redirects to /tours/office-demo
  tours/[slug]/
    page.tsx               # server component — loads config, metadata
    loading.tsx            # skeleton loading state

components/                # all 'use client'
  TourViewer.tsx           # PSV mount, transitions, arrivalYaw, input lock
  TourShell.tsx            # client state shell (started, scene, zone)
  StartScreen.tsx          # branded intro overlay
  RoomList.tsx             # zone-grouped scene sidebar
  ControlBar.tsx           # back, help, fullscreen
  CurrentZoneLabel.tsx     # active zone display
  FloorPlan.tsx            # Phase 2 stub — renders null
  HotspotStyles.tsx        # reserved slot for custom hotspot elements

lib/
  types.ts                 # Zod schema + inferred TS types
  tour-config.ts           # server-side: read + validate tour.config.json
  psv-adapter.ts           # pure fn: TourConfig → PSV VirtualTourNode[]

scripts/
  optimize-panoramas.js    # resize 8K → 4K JPGs via sharp
  list-panoramas.js        # browser inventory for manual config mapping

public/tours/[slug]/
  tour.config.json         # scene graph (only file that changes per tour)
  panoramas/               # optimized 4096×2048 JPGs (git-ignored)
  logo.svg

__mocks__/
  styleMock.js             # global CSS mock for Jest (all .css imports)
```

---

## Key Conventions

### PSV is browser-only
All PSV imports happen inside `useEffect` with dynamic `import()`. Never import PSV at the module level. TourViewer is always `'use client'`.

### psv-adapter.ts is the PSV boundary
The only file that knows PSV's internal node/link shape. Everything else uses `TourConfig` types from `lib/types.ts`.

### Direction-aware arrival
Each link carries `arrivalYaw`. On `enter-node` event, `TourViewer` reads `fromLink.data.arrivalYaw` and calls `viewer.rotate({ yaw, speed: false })` after the crossfade. Same scene, different arrival angle depending on which scene the user came from.

### Tailwind v4
CSS starts with `@import "tailwindcss"` — no `@tailwind base/components/utilities` directives. No `tailwind.config.ts` file.

### Tests co-located
Unit tests live beside the source file: `lib/types.test.ts`, `lib/psv-adapter.test.ts`. No separate `__tests__/` folder unless for integration/e2e tests.

### Zod v4 API
`z.object`, `z.string`, `z.number`, `z.boolean`, `.default()`, `.optional()` — same as v3 for our schema. `z.infer<typeof Schema>` works as expected.

---

## tour.config.json Schema

One file per tour in `public/tours/[slug]/tour.config.json`. Validated by `TourConfigSchema` at load time.

Key fields:
- `meta.startScene` — first scene to open
- `meta.themeColor` — accent color for start screen button
- `scene.defaultYaw` — camera direction when opened from room list
- `link.hotspotYaw/Pitch` — position of the floor circle in this scene
- `link.arrivalYaw` — camera direction on arrival (per-link, not per-scene)

---

## Image Pipeline

Raw Insta360 captures are 8000×4000 JPG (~9MB). Before adding to `public/`:

```bash
node scripts/optimize-panoramas.js "<input-dir>" "public/tours/office-demo/panoramas"
```

Output: 4096×2048 progressive JPEG (~2MB). Panoramas are git-ignored.

---

## Git & Commit Style

Format: `type(scope): short subject`

Body: short bullet points, skimmable, no jargon unless it's the main point. No `Co-Authored-By`. Not too long.

Examples:
```
feat(viewer): direction-aware arrival via arrivalYaw
feat(types): zod schema for tour config
fix(hotspot): hover label visible on mobile tap
```
