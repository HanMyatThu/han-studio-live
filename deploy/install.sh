#!/usr/bin/env bash
# Zat one-command server setup (Ubuntu/Debian, run as root):
#   bash <(curl -fsSL https://raw.githubusercontent.com/HanMyatThu/han-studio-live/main/deploy/install.sh)
# Safe to run again: it keeps your .env and only updates the app.
set -euo pipefail

REPO="https://github.com/HanMyatThu/han-studio-live.git"
DIR="/opt/zat"
green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$*"; }
red() { printf "\033[1;31m%s\033[0m\n" "$*"; }
ask() { # ask VAR "Question" [default] [secret]
  local __v="$1" __q="$2" __d="${3:-}" __s="${4:-}" __a
  if [ -n "$__s" ]; then read -r -s -p "$__q: " __a; echo; else read -r -p "$__q${__d:+ [$__d]}: " __a; fi
  printf -v "$__v" "%s" "${__a:-$__d}"
}

[ "$(id -u)" = 0 ] || { red "Please run as root."; exit 1; }

# 1. Docker
if ! command -v docker >/dev/null; then
  green "Installing Docker…"
  curl -fsSL https://get.docker.com | sh
fi
command -v git >/dev/null || { apt-get update -qq && apt-get install -y -qq git; }

# 2. Code
if [ -d "$DIR/.git" ]; then
  green "Updating code in $DIR…"
  git -C "$DIR" pull --ff-only
else
  green "Downloading Zat to $DIR…"
  git clone "$REPO" "$DIR"
fi
cd "$DIR"

# 3. Settings (.env)
if [ -f .env ] && grep -q '^DOMAIN=' .env && ! grep -q '^DOMAIN="example.com"' .env; then
  green "Keeping your existing .env (edit it with: nano $DIR/.env)"
else
  green "A few questions. Press Enter to skip optional ones."
  ask DOMAIN "Your domain for Zat (e.g. zat.com, no https)"
  [ -n "$DOMAIN" ] || { red "A domain is required."; exit 1; }
  ask ADMIN_EMAIL "Admin email"
  ask ADMIN_PASSWORD "Admin password (hidden)" "" secret
  ask ADMIN_PASSWORD2 "Type the admin password again (hidden)" "" secret
  [ "$ADMIN_PASSWORD" = "$ADMIN_PASSWORD2" ] || { red "Passwords do not match."; exit 1; }
  [ ${#ADMIN_PASSWORD} -ge 8 ] || { red "Use at least 8 characters."; exit 1; }
  [ "$ADMIN_PASSWORD" != "admin1234" ] || { red "Choose a different password than the demo one."; exit 1; }
  ask BUNNY_LIB "Bunny Video Library ID (optional)"
  ask BUNNY_KEY "Bunny API Key (optional, hidden)" "" secret
  ask BUNNY_CDN "Bunny CDN Hostname, e.g. vz-xxxx.b-cdn.net (optional)"
  ask BUNNY_TOKEN "Bunny Token Authentication key (optional, hidden)" "" secret
  ask OPENAI "OpenAI API key (optional, hidden)" "" secret
  ask GEMINI "Gemini API key (optional, hidden)" "" secret

  for v in "$ADMIN_PASSWORD" "$BUNNY_KEY" "$BUNNY_TOKEN" "$OPENAI" "$GEMINI"; do
    case "$v" in *"'"*) red "Values can't contain a ' character."; exit 1 ;; esac
  done
  STORAGE="local"; [ -n "$BUNNY_LIB" ] && [ -n "$BUNNY_KEY" ] && [ -n "$BUNNY_CDN" ] && STORAGE="bunny"
  BUNNY_CDN="${BUNNY_CDN#https://}"; BUNNY_CDN="${BUNNY_CDN#http://}"; BUNNY_CDN="${BUNNY_CDN%/}"
  TRANSLATE="mock"; [ -n "$OPENAI" ] && TRANSLATE="openai"; [ -n "$GEMINI" ] && TRANSLATE="gemini"

  cat > .env <<EOF
DOMAIN="$DOMAIN"
POSTGRES_PASSWORD="$(openssl rand -hex 24)"
AUTH_SECRET="$(openssl rand -hex 32)"
ADMIN_EMAIL="$ADMIN_EMAIL"
ADMIN_PASSWORD='$ADMIN_PASSWORD'

STORAGE_DRIVER="$STORAGE"
BUNNY_STREAM_LIBRARY_ID="${BUNNY_LIB:-mock-library-id}"
BUNNY_STREAM_API_KEY='${BUNNY_KEY:-mock-bunny-api-key}'
BUNNY_STREAM_CDN_URL="${BUNNY_CDN:+https://$BUNNY_CDN}"
BUNNY_TOKEN_KEY='${BUNNY_TOKEN:-mock}'

OPENAI_API_KEY='${OPENAI:-mock}'
TRANSLATION_PROVIDER="$TRANSLATE"
OPENAI_TRANSLATE_MODEL="gpt-5.4-mini"
GEMINI_API_KEY='${GEMINI:-mock}'
GEMINI_MODEL="gemini-2.5-flash"

PAYMENT_PROVIDER="mock"
DINGER_API_KEY="mock"
NEXT_PUBLIC_ADSENSE_CLIENT=""
NEXT_PUBLIC_IMA_AD_TAG_URL=""
EOF
  chmod 600 .env
  green "Saved settings to $DIR/.env (storage: $STORAGE, translation: $TRANSLATE)"
fi
DOMAIN="$(grep '^DOMAIN=' .env | cut -d'"' -f2)"
# Add www. only for a main domain (zat.com), not for a subdomain (zat.example.com).
SITES="$DOMAIN"; [ "$(tr -cd '.' <<<"$DOMAIN" | wc -c)" -eq 1 ] && SITES="$DOMAIN, www.$DOMAIN"

# 4. Swap, so building and video processing don't run out of memory
SWAP_MB=$(free -m | awk '/^Swap:/ {print $2}')
if [ "${SWAP_MB:-0}" -lt 4000 ] && [ ! -f /swap-zat ]; then
  green "Adding 4 GB swap…"
  fallocate -l 4G /swap-zat && chmod 600 /swap-zat && mkswap /swap-zat >/dev/null && swapon /swap-zat
  echo '/swap-zat none swap sw 0 0' >> /etc/fstab
fi

# 5. Is another proxy already using port 80?
PROXY=""
for c in $(docker ps --format '{{.Names}}'); do
  case "$c" in zat-*) continue ;; esac
  if docker port "$c" 2>/dev/null | grep -qE '^80/tcp'; then PROXY="$c"; break; fi
done

if [ -n "$PROXY" ]; then
  NET=$(docker inspect "$PROXY" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
  CADDYFILE=$(docker inspect "$PROXY" --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')
  green "Found $PROXY on port 80. Zat will share it (network: $NET)."
  cp deploy/shared-proxy.yml docker-compose.override.yml
  if grep -q '^PROXY_NETWORK=' .env; then sed -i "s|^PROXY_NETWORK=.*|PROXY_NETWORK=\"$NET\"|" .env; else echo "PROXY_NETWORK=\"$NET\"" >> .env; fi
  green "Building and starting Zat (first time takes 5–10 minutes)…"
  docker compose --profile prod up -d --build db app
else
  rm -f docker-compose.override.yml
  green "Building and starting Zat with its own HTTPS (first time takes 5–10 minutes)…"
  docker compose --profile prod up -d --build
fi

# 6. Wait for the app
printf "Waiting for Zat to start"
for _ in $(seq 1 90); do
  if curl -fs -o /dev/null http://127.0.0.1:3010/; then echo; green "Zat is running."; break; fi
  printf "."; sleep 2
done
curl -fs -o /dev/null http://127.0.0.1:3010/ || { echo; red "Zat didn't start. Last log lines:"; docker compose logs --tail 40 app; exit 1; }

# 7. Hook the domain into the existing Caddy
if [ -n "$PROXY" ]; then
  if [ -n "$CADDYFILE" ] && [ -f "$CADDYFILE" ]; then
    if grep -q "zat-app-1:3000" "$CADDYFILE"; then
      green "Caddy already knows about Zat."
    else
      cp "$CADDYFILE" "$CADDYFILE.bak-$(date +%s)"
      cat >> "$CADDYFILE" <<EOF

# Zat (added by zat install.sh)
$SITES {
	encode zstd gzip
	request_body {
		max_size 3GB
	}
	reverse_proxy zat-app-1:3000
}
EOF
      green "Added $DOMAIN to $CADDYFILE"
    fi
    docker exec "$PROXY" caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || docker restart "$PROXY" >/dev/null
    yellow "Note: $CADDYFILE belongs to your other project. Commit the Zat block there too, or a future deploy of that project may remove it."
  else
    yellow "$PROXY isn't a Caddy I can edit. Point $DOMAIN to zat-app-1:3000 (network $NET) in its config."
  fi
fi

echo
green "Done! Open https://$DOMAIN (admin: https://$DOMAIN/admin)"
echo "Make sure your domain's DNS A record points to this server: $(curl -fs4 https://ifconfig.me || echo 'your server IP')"
echo "Update later by running this same command again."
