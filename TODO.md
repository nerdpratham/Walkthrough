# Scaling To-Do

Ordered by what actually gates scale in this codebase. Most items are "know where
the ceiling is," not "build now" — tackle each once you're actually hitting the
wall it addresses.

## 1. Tour data loading (biggest lever for "thousands of scenes")

- [ ] Split `tour.config.json` or lazy-load scene data. The entire scene graph
      (links, markers, floor-plan markers) currently ships as one JSON blob on
      first load and gets fully parsed into `VirtualTourPlugin` nodes upfront
      (`psv-adapter.ts` -> `vt.setNodes`). Fine at hundreds of scenes; worth
      splitting into per-scene fetch or a lighter index + on-demand detail past
      ~1-2k scenes.
- [ ] Confirm gzip/brotli is actually enabled wherever this deploys
      (Caddy/nginx). JSON compresses 5-10x — may buy a lot of headroom before
      any code change is needed.
- [x] Per-scene deep links (`?scene=`) — done, zero extra cost at any scale
      since it's pure client-side.

## 2. Asset delivery

- [ ] Panoramas are served from local disk via
      `app/tours/[slug]/panoramas/[filename]/route.ts` (Node reads the file per
      request). Fine for one server; move to object storage + CDN once there's
      real traffic or multiple app instances.
- [ ] Single fixed resolution (4096x2048) for every panorama regardless of
      device/viewport — revisit only if bandwidth becomes the actual
      bottleneck, not preemptively.

## 3. Studio editing UX at scale

- [ ] Scene navigator / floor-plan marker list / link inspector are plain
      unvirtualized lists (`SceneNavigator.tsx`, `FloorPlanInspector.tsx`,
      etc.). A tour with a few thousand scenes will make these sluggish in the
      DOM well before the viewer itself struggles — virtualize
      (react-window or similar) if/when someone builds a tour that big.
- [ ] `editor-state.ts` keeps the full config + undo history in memory
      client-side — check whether undo history needs a cap for very large
      configs.

## 4. Infra / deployment

- [ ] Single Node container, single host, tours on local bind-mounted disk
      (`docker-compose.yml`) — no horizontal scaling story today. Needed once
      past one server: shared/networked storage for tour data, multiple app
      replicas behind Caddy.
- [ ] No caching in front of `/tours/[slug]` — `lib/tour-config.ts` re-reads
      and re-validates the JSON from disk on every request. Cheap fix
      (in-memory cache with invalidation on Studio save) before reaching for
      anything heavier.
- [ ] Viewer-only per-tour Docker builds are a fully manual local process. If
      "export a deployable per tour" becomes a recurring product feature
      rather than a one-off, move it into CI, not a dev machine.

## 5. Auth / multi-tenancy

- [ ] Single shared `STUDIO_PASSWORD` for all editors, no per-user accounts,
      no login rate-limiting — fine for one person, not for a team or many
      clients managing their own tours.

## 6. Observability

- [ ] No logging/error tracking anywhere in the codebase. At current scale
      you'd find out about a broken tour from a client email. Worth basic
      request logging + something like Sentry before scale makes
      debugging-by-guessing untenable.
