# Scaling To-Do

Target: comfortably handle **~1000 scenes** in a single tour, with as little
added complexity as possible. Most items are "know where the ceiling is," not
"build now" — tackle each once you're actually hitting the wall it addresses.
Prefer the simplest fix that clears the 1000-scene bar over a more "correct"
architecture that isn't needed yet.

## 1. Tour data loading (target: ~1000 scenes per tour)

- [ ] Confirm gzip/brotli compression is actually enabled wherever this
      deploys (Caddy/nginx). At ~1000 scenes the full `tour.config.json` is
      roughly 600KB-900KB raw; gzip should bring that down to somewhere
      around 100-150KB, which is a perfectly normal one-time payload — no
      architecture change needed for this target.
- [ ] Cache the parsed/validated config server-side in `lib/tour-config.ts`
      (in-memory, invalidated on Studio save) instead of re-reading and
      re-validating from disk on every request. Simple, and covers the real
      repeat-request cost at this scale.
- [x] Per-scene deep links (`?scene=`) — done, zero extra cost at any scale
      since it's pure client-side.

**Deliberately not doing (for now):** splitting `tour.config.json` or
switching PSV's virtual-tour-plugin to lazy `server` dataMode. That's real
added complexity — a new data-generation step, cache invalidation, a second
code path to test and maintain — that only pays for itself well past 1000
scenes. Revisit only if a real tour actually grows meaningfully larger than
that.

## 2. Asset delivery

- [ ] Panoramas are served from local disk via
      `app/tours/[slug]/panoramas/[filename]/route.ts` (Node reads the file per
      request). Fine for one server; move to object storage + CDN once there's
      real traffic or multiple app instances.
- [ ] Single fixed resolution (4096x2048) for every panorama regardless of
      device/viewport — revisit only if bandwidth becomes the actual
      bottleneck, not preemptively.

## 3. Studio editing UX at scale

- [ ] If the scene navigator (`SceneNavigator.tsx`) actually feels sluggish at
      ~1000 scenes, virtualize just that one list (react-window or similar).
      A narrow, contained fix — not a rewrite of the editor, and not worth
      doing preemptively before it's actually felt.
- [ ] `editor-state.ts` keeps the full config + undo history in memory —
      fine at this scale, no action needed.

## 4. Infra / deployment

- [ ] Single Node container, single host, tours on local bind-mounted disk
      (`docker-compose.yml`) — no horizontal scaling story today. Needed once
      past one server: shared/networked storage for tour data, multiple app
      replicas behind Caddy.
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
