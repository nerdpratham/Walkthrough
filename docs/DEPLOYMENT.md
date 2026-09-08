# Deployment Runbook

Next.js 16 app (standalone) serving 360° tours. Single container, no database. The only stateful thing is the tours data dir on disk. This doc is self-contained: you need nothing else to deploy and run it.

## Architecture
- **App**: `ghcr.io/<org>/360walkthrough:latest` (GHCR, private). Listens on `127.0.0.1:3000` only.
- **Tour data**: `/var/360walkthrough/tours` on the host, bind-mounted to `/data/tours` in the container.
- **Caddy**: on the host, terminates TLS and reverse-proxies to `localhost:3000`.
- **CI**: pushes to `master` that change application or production-build files build and publish a fresh image to GHCR.

## Image & runtime
- Prebuilt: runs `node server.js` on Node 22 alpine. No build at deploy time.
- CI rebuilds and pushes on every push to `master`.
- Registry is private. Auth once: `echo <PAT> | docker login ghcr.io -u <github-username> --password-stdin` (PAT needs `read:packages`). In Portainer, also add the registry under Registries.

## Ports
- Container listens on `3000` (`HOSTNAME=0.0.0.0`, `PORT=3000`).
- Compose publishes to `127.0.0.1:3000` only (loopback, not internet-facing by design).
- Caddy terminates TLS and proxies to `localhost:3000`. If Caddy runs as a container, target `app:3000` instead.

## Environment variables (all required in prod)
Set these in a `.env` file next to `docker-compose.yml` on the server (compose reads `${STUDIO_PASSWORD}` / `${STUDIO_SECRET}`).

| Var | Purpose / failure if unset |
| --- | --- |
| `NODE_ENV=production` | standard |
| `TOURS_DATA_DIR` | tours location. Set to `/data/tours`. Falls back to `./public/tours` if unset (wrong for prod). |
| `STUDIO_PASSWORD` | password for `/studio/login`. Login returns HTTP 500 if unset. |
| `STUDIO_SECRET` | signs the session cookie. Falls back to an insecure dev default if unset. Generate: `openssl rand -base64 32`. |
| `APP_IMAGE` | image ref used by `docker-compose.yml`. Defaults to `360walkthrough:latest`; set to the full GHCR path in prod. |

The repo's `.env.example` is a template only. Do not reuse any dev `.env.local`; generate fresh secrets on the server.

## One-time setup
1. Create the data dir: `mkdir -p /var/360walkthrough/tours`
2. Create `/opt/360walkthrough/.env`:

   ```env
   STUDIO_PASSWORD=your-chosen-password
   STUDIO_SECRET=$(openssl rand -base64 32)
   APP_IMAGE=ghcr.io/<org>/360walkthrough:latest
   ```

3. Place `docker-compose.yml` in `/opt/360walkthrough/`.
4. Log in to the registry: `echo <PAT> | docker login ghcr.io -u <github-username> --password-stdin`
5. Deploy via Portainer → Stacks → Add stack, or run `docker compose up -d`.
6. Point DNS A record at the server IP.
7. Install the proxy config: `cp Caddyfile /etc/caddy/Caddyfile && systemctl reload caddy`

## Updating
Push to `master`, then pull and redeploy: Portainer → Pull and redeploy, or `docker compose pull && docker compose up -d`. Tour data is untouched.

## State & backups
- `/var/360walkthrough/tours` is the only stateful data. Back it up. Image redeploys never touch it.
- To delete a tour: remove its subfolder over SSH.

## Gotchas
- The session cookie is `secure` in prod, so studio login only persists over HTTPS. The proxy must serve TLS or login silently fails to stick.
- App binds loopback only; not reachable from outside except through the proxy. Expected.
- No migrations, no external services, no DB. An unhealthy container is almost always env vars or the data mount.
