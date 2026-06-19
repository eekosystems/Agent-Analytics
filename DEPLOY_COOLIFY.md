# Deploying Active Trace to Coolify

This is a white-labeled fork of Langfuse (MIT core). The web + worker images are
**prebuilt by GitHub Actions** (`.github/workflows/build-images.yml`) on GitHub's
16 GB runners and pushed to GHCR. Coolify only **pulls** them.

> ⚠️ **Do NOT build these images on the Coolify server.** The Next.js monorepo
> build asks for up to 75% of system RAM (`web/Dockerfile`) and, alongside
> ClickHouse/Postgres/Redis/MinIO, will OOM-kill and lock up small/medium boxes.
> Keep the compose on `image:` references, never `build:`.

## Prerequisites
- A Coolify server with Docker (pulling images is light — **2 GB RAM** is fine
  for runtime; no build headroom needed).
- This repo connected to Coolify (GitHub source).
- A domain/subdomain pointed at your Coolify server (e.g. `analytics.yourdomain.com`).
- The image build workflow has run at least once on `main` (GitHub → **Actions**
  → *Build Active Trace images* is green, and the two packages appear under
  your GitHub **Packages**).

## Image registry auth (one-time)

Coolify must be able to pull `ghcr.io/eekosystems/agent-analytics-{web,worker}`.
Pick one:

- **A. Make the packages public (simplest).** GitHub → your profile/org →
  **Packages** → `agent-analytics-web` → *Package settings* → *Change visibility*
  → **Public**. Repeat for `agent-analytics-worker`. No credentials on the server.
  (The images hold only application code — runtime secrets are injected by Coolify,
  not baked in.)
- **B. Keep them private + add a credential.** Create a GitHub PAT (classic) with
  `read:packages`. In Coolify, add a Docker registry (`ghcr.io`, your GitHub
  username, the PAT as password) so the server can authenticate the pull.

## Steps

1. **Create the resource**
   - In Coolify: *+ New* → *Resource* → **Docker Compose** (Public/Private Git).
   - Repository: this repo. Branch: `main`.
   - **Compose file path:** `docker-compose.coolify.yml`

2. **Set environment variables** (Resource → *Environment Variables*)
   Generate fresh secrets and paste them in (see `.env.coolify.example`):
   ```bash
   echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
   echo "SALT=$(openssl rand -base64 32)"
   echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"   # must be 64 hex chars
   echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
   echo "CLICKHOUSE_PASSWORD=$(openssl rand -hex 16)"
   echo "REDIS_AUTH=$(openssl rand -hex 16)"
   echo "MINIO_ROOT_PASSWORD=$(openssl rand -hex 16)"
   ```
   Also set `NEXTAUTH_URL=https://<your-domain>` (must match the domain below, https).

3. **Assign the domain to the web service**
   - On the `langfuse-web` service, set the domain to your FQDN and **port `3000`**.
   - Only `langfuse-web` is exposed; postgres/clickhouse/redis/minio stay internal.

4. **Deploy.** Coolify pulls the prebuilt images (no compile) and starts the
   stack; the web/worker containers run DB migrations on boot. When healthy, open
   your domain — you should see the **Active Trace** sign-in page.
   - To ship code changes: push to `main`, wait for the *Build Active Trace
     images* workflow to go green, then **Redeploy** in Coolify (enable
     *Force pull* / "pull latest images" so it fetches the new `:latest`).

5. **Create the first account**
   - The first user to sign up becomes the instance owner. Then create an
     Organization → Project → API keys, and you have a working multi-tenant SaaS.

## Notes
- **Persistence:** Postgres, ClickHouse, Redis, and MinIO use named Docker volumes,
  so data survives redeploys. Back these up before major changes.
- **Media uploads:** to enable media (images in traces), `minio` must be reachable
  from the browser. Expose a `minio` subdomain and set
  `LANGFUSE_S3_MEDIA_UPLOAD_ENDPOINT` to that public URL. Basic tracing works without it.
- **Updating from upstream:** `git fetch upstream && git merge upstream/main`, resolve
  conflicts (mostly in `web/public/` assets and rebranded strings), then redeploy.
- **Enterprise features** (audit logs, RBAC, data masking, retention) are NOT in the
  MIT core — those are built in Phase 5 of this project.
