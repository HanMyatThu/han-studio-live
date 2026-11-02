# Deploying Zat to a server (Hetzner)

## Quick way: one command

SSH into the server as root and run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/HanMyatThu/han-studio-live/main/deploy/install.sh)
```

It asks for your domain, admin login and keys, then sets up swap, the database, the app and HTTPS.
If another project's Caddy already uses ports 80/443, Zat shares it automatically.
Run the same command again to update after a new push.

The manual steps below do the same thing by hand.

One server runs everything with Docker: the app, PostgreSQL and Caddy (automatic HTTPS).
Videos are served by Bunny Stream, so the server mostly handles pages, uploads and processing.

Recommended server: Hetzner **CPX31** (4 vCPU, 8 GB RAM) or bigger. Video splitting uses a lot of CPU.
Ubuntu 24.04.

## 1. Point your domain at the server

At your domain registrar (or Cloudflare), add DNS records:

| Type | Name | Value |
|---|---|---|
| A | `@` | your server's IPv4 |
| A | `www` | your server's IPv4 |

If you use Cloudflare, set them to **DNS only** (grey cloud) until HTTPS works.

## 2. Prepare the server

SSH in as root and run:

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
git clone https://github.com/HanMyatThu/han-studio-live.git /opt/zat
cd /opt/zat
cp .env.example .env
nano .env
```

## 3. Fill in `.env`

| Key | Value |
|---|---|
| `DOMAIN` | your domain, e.g. `zat.com` (no https://) |
| `POSTGRES_PASSWORD` | a long random password (`openssl rand -hex 24`) |
| `AUTH_SECRET` | a long random string (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | your admin login. Use a strong password |
| `STORAGE_DRIVER` | `bunny` |
| `BUNNY_*` | from the Bunny dashboard (see README) |
| `OPENAI_API_KEY` | for real subtitles (optional, `mock` otherwise) |
| `TRANSLATION_PROVIDER` / `GEMINI_API_KEY` | `gemini` + key for free translation (optional) |

`DATABASE_URL` is set by Docker automatically, so you can leave it.

## 4. Start

```bash
docker compose --profile prod up -d --build
docker compose logs -f app      # Ctrl+C to stop watching
```

The first build takes a few minutes. Then open `https://your-domain` and log in at `/admin`.

## Updating after a new push

```bash
cd /opt/zat
git pull
docker compose --profile prod up -d --build
```

## Backups

Daily database backup at 3am, kept for 14 days in `/opt/zat/backups`:

```bash
crontab -e
# add this line:
0 3 * * * /opt/zat/deploy/backup.sh
```

Hetzner's own **Backups** option (+20% of the server price) also snapshots the whole server.

## Useful commands

```bash
docker compose ps                         # what's running
docker compose logs -f app                # app logs
docker compose restart app                # restart after editing .env
docker compose exec db psql -U zat zat    # database shell
```

## Sharing a server with another project

If another project's Caddy already uses ports 80/443, don't start Zat's Caddy:

```bash
cp deploy/shared-proxy.yml docker-compose.override.yml
echo 'PROXY_NETWORK="han-studio_default"' >> .env    # the other project's network (docker network ls)
docker compose --profile prod up -d --build db app
```

Then add a block for the Zat domain to the other project's Caddyfile and reload it:

```
zat-domain.com, www.zat-domain.com {
	encode zstd gzip
	request_body {
		max_size 3GB
	}
	reverse_proxy zat-app-1:3000
}
```
