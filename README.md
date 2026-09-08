# 360walkthrough

Virtual walkthroughs from 360° panoramas. Self-hosted: panoramas and tours run on your own server, no third-party platform in between.

---

## What's built

- Direction-aware arrival — each link carries its own `arrivalYaw`, so the camera faces the direction you came from
- Per-link transition overrides — crossfade, walk-in, fly-in, radial-fade, vertical-wipe, or none, configurable per scene or per link
- Floor-circle and dot hotspot styles, with `primary`, `secondary`, and `hidden` priority tiers
- Info markers — tap-to-open panels with title, body copy, image, document, and CTA
- Zone-grouped scene sidebar with drag-to-reorder and inline rename
- Studio — password-gated editor for creating tours, placing hotspots, and managing scenes
- Panorama upload in-browser, with server-side optimisation (8K → 4K)
- Two-stage Docker build, CI on push to `master`, Caddy reverse proxy

---

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Tours live in `public/tours/[slug]/` — add panoramas and a `tour.config.json` for each one. Panoramas are git-ignored; optimise raw captures before adding them:

```bash
node scripts/optimize-panoramas.js "<input-dir>" "public/tours/<slug>/panoramas"
```

---

## Studio

Password-gated at `/studio`. Set credentials in `.env.local`:

```env
STUDIO_PASSWORD=your-password
STUDIO_SECRET=any-long-random-string
```

---

## Deploy

The app ships as a Docker image. Pushes to `master` that change application or production-build files publish it to GHCR. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full runbook — Portainer stack, Caddy config, and update flow.

---

## Standalone viewer delivery

Production tours live on the VPS and remain the source of truth. When a client needs a standalone delivery, pull an optional local snapshot and build it into a static nginx image with no Studio, API, authentication, shared volume, or Node runtime.

Snapshots are isolated under `deliverables/tours/<delivery-slug>/` and ignored by Git. A friendly delivery slug may differ from the source server's slug:

```bash
npm run pull:viewer -- <source-slug> <base-url> [delivery-slug]
```

Build any saved snapshot. If the image tag is omitted, it defaults to `site-tour-viewer:latest`:

```bash
npm run build:viewer -- <delivery-slug> [image-tag]
docker run --rm -p 8090:80 <image-tag>
```

Pulling and building are separate so a saved snapshot can still produce an image when the source server is unavailable. Multiple tours can coexist locally without sharing configs, panoramas, or markers.

---

## Stack

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Photo Sphere Viewer 5 · Zod 4 · Docker

---

## Tour config

Each tour is a single `tour.config.json`, validated by Zod at load time.

```json
{
  "meta": {
    "title": "Office HQ",
    "startScene": "reception",
    "transition": { "effect": "walk-in", "speedMs": 900 }
  },
  "zones": [
    { "id": "ground", "label": "Ground Floor" }
  ],
  "scenes": [
    {
      "id": "reception",
      "label": "Reception",
      "zone": "ground",
      "panorama": "/tours/office-hq/panoramas/reception.jpg",
      "links": [
        { "toScene": "corridor", "hotspotYaw": 45, "hotspotPitch": -15, "arrivalYaw": -135 }
      ]
    }
  ]
}
```

Full schema: [`lib/types.ts`](lib/types.ts)

---

## Commands

```text
npm run dev        # dev server, port 3000
npm run build      # production build
npx jest           # run all tests
npx tsc --noEmit   # type check
```
