# Deploying Agent-Analytics to Coolify

This is a white-labeled fork of Langfuse (MIT core). The web + worker images are
built **from source** on the Coolify server so the Agent-Analytics branding is
baked in.

## Prerequisites
- A Coolify server with Docker (the build is heavy — give it **at least 4 GB RAM
  free** for the Next.js build, ideally 8 GB).
- This repo connected to Coolify (GitHub source).
- A domain/subdomain pointed at your Coolify server (e.g. `analytics.yourdomain.com`).

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

4. **Deploy.** First build takes several minutes (compiles the Next.js app + worker).
   When healthy, open your domain — you should see the **Agent-Analytics** sign-in page.

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
