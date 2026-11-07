#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
APP_ROOT="${APP_ROOT:-/opt/english-profile-generator}"
PORT="${PORT:-6820}"
NODE_VERSION="${NODE_VERSION:-v22.22.2}"
CADDY_CONTAINER="${CADDY_CONTAINER:-static-isp-proxy-manager-caddy-1}"
CADDYFILE="${CADDYFILE:-/opt/static-isp-proxy-manager/infrastructure/caddy/Caddyfile}"
DOCKER_GATEWAY="${DOCKER_GATEWAY:-172.18.0.1}"
DOCKER_NETWORK="${DOCKER_NETWORK:-172.18.0.0/16}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/english-profile-generator}"

if [[ $EUID -ne 0 ]]; then
  echo "Run this installer as root." >&2
  exit 1
fi
if [[ ! "$DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "Usage: sudo bash install-existing-caddy.sh profile.example.com" >&2
  exit 1
fi
if ! docker inspect "$CADDY_CONTAINER" >/dev/null 2>&1; then
  echo "Caddy container not found: $CADDY_CONTAINER" >&2
  exit 1
fi
if [[ ! -f "$CADDYFILE" ]]; then
  echo "Caddyfile not found: $CADDYFILE" >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1 || ! command -v python3 >/dev/null 2>&1; then
  echo "curl and python3 are required." >&2
  exit 1
fi

available_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
if (( available_kb < 2097152 )); then
  echo "At least 2 GB free disk space is required." >&2
  exit 1
fi

architecture="$(dpkg --print-architecture)"
case "$architecture" in
  amd64) node_arch='linux-x64' ;;
  arm64) node_arch='linux-arm64' ;;
  *) echo "Unsupported architecture: $architecture" >&2; exit 1 ;;
esac

mkdir -p "$APP_ROOT/runtime" "$APP_ROOT/cache" "$APP_ROOT/profile-store" "$APP_ROOT/avatar-cache" "$BACKUP_ROOT"
install -d -m 0750 -o www-data -g www-data "$APP_ROOT/profile-store"
install -d -m 0755 -o www-data -g www-data "$APP_ROOT/avatar-cache"

node_bin="$APP_ROOT/runtime/node/bin/node"
if [[ ! -x "$node_bin" ]] || [[ "$($node_bin --version 2>/dev/null || true)" != "$NODE_VERSION" ]]; then
  archive="node-$NODE_VERSION-$node_arch.tar.xz"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/$archive" -o "$APP_ROOT/cache/$archive"
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt" -o "$APP_ROOT/cache/SHASUMS256.txt"
  (cd "$APP_ROOT/cache" && grep " $archive\$" SHASUMS256.txt | sha256sum -c -)
  rm -rf "$APP_ROOT/runtime/node.new"
  mkdir -p "$APP_ROOT/runtime/node.new"
  tar -xJf "$APP_ROOT/cache/$archive" -C "$APP_ROOT/runtime/node.new" --strip-components=1
  rm -rf "$APP_ROOT/runtime/node"
  mv "$APP_ROOT/runtime/node.new" "$APP_ROOT/runtime/node"
  rm -f "$APP_ROOT/cache/$archive" "$APP_ROOT/cache/SHASUMS256.txt"
fi

repo_file="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/update.sh"
if [[ -f "$repo_file" ]]; then
  install -m 0755 "$repo_file" /usr/local/sbin/english-profile-generator-update
else
  curl -fsSL "https://raw.githubusercontent.com/qq541253643-art/english-profile-generator/main/deploy/server/update.sh" \
    -o /usr/local/sbin/english-profile-generator-update
  chmod 0755 /usr/local/sbin/english-profile-generator-update
fi

if [[ ! -L "$APP_ROOT/current" ]]; then
  SKIP_RESTART=1 APP_ROOT="$APP_ROOT" /usr/local/sbin/english-profile-generator-update
fi

cat >/etc/systemd/system/english-profile-generator.service <<EOF
[Unit]
Description=English Profile Generator (existing Caddy integration)
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_ROOT/current
RuntimeDirectory=english-profile-generator
ExecStart=$APP_ROOT/runtime/node/bin/node $APP_ROOT/current/scripts/local-server.mjs --host 0.0.0.0 --port $PORT --root $APP_ROOT/current/dist --state-file /run/english-profile-generator/server-state.json
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
ReadWritePaths=$APP_ROOT/avatar-cache $APP_ROOT/profile-store
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
Environment=EPG_AVATAR_CACHE_DIR=$APP_ROOT/avatar-cache
Environment=EPG_PROFILE_STORE_DIR=$APP_ROOT/profile-store
MemoryHigh=320M
MemoryMax=512M
CPUQuota=100%
TasksMax=128

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/english-profile-generator-update.service <<'EOF'
[Unit]
Description=Update English Profile Generator from the latest GitHub release
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/english-profile-generator-update
StandardOutput=null
StandardError=journal
EOF

cat >/etc/systemd/system/english-profile-generator-update.timer <<'EOF'
[Unit]
Description=Check English Profile Generator updates every 15 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=15min
RandomizedDelaySec=90
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable english-profile-generator.service english-profile-generator-update.timer
systemctl restart english-profile-generator.service
systemctl start english-profile-generator-update.timer

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q '^Status: active'; then
  ufw allow from "$DOCKER_NETWORK" to any port "$PORT" proto tcp comment 'English Profile Generator Caddy upstream' >/dev/null
fi

ready=0
for _ in {1..30}; do
  if curl -fsS --max-time 2 "http://127.0.0.1:$PORT/__health" >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  systemctl --no-pager --full status english-profile-generator.service >&2 || true
  journalctl -u english-profile-generator.service -n 50 --no-pager >&2 || true
  exit 1
fi

backup="$BACKUP_ROOT/Caddyfile.$(date +%Y%m%d-%H%M%S)"
cp -a "$CADDYFILE" "$backup"
python3 - "$CADDYFILE" "$DOMAIN" "$DOCKER_GATEWAY" "$PORT" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
domain, gateway, port = sys.argv[2:]
text = path.read_text(encoding="utf-8")
expected = f"{domain} {{"
upstream = f"reverse_proxy {gateway}:{port} {{\n    header_up Host 127.0.0.1\n  }}"
if expected in text:
    old_block = f"""{domain} {{
  encode gzip
  reverse_proxy {gateway}:{port}
}}"""
    new_block = f"""{domain} {{
  encode gzip
  {upstream}
}}"""
    if new_block in text:
        print("CADDY_ROUTE=UNCHANGED")
        raise SystemExit(0)
    if old_block not in text:
        raise SystemExit("Existing site block does not contain the expected upstream")
    path.write_text(text.replace(old_block, new_block), encoding="utf-8")
    print("CADDY_ROUTE=UPDATED")
    raise SystemExit(0)

block = f"""
{domain} {{
  encode gzip
  {upstream}
}}
"""
path.write_text(text.rstrip() + "\n" + block, encoding="utf-8")
print("CADDY_ROUTE=ADDED")
PY

docker cp "$CADDYFILE" "$CADDY_CONTAINER:/config/english-profile-generator.Caddyfile"
docker exec "$CADDY_CONTAINER" caddy validate --config /config/english-profile-generator.Caddyfile --adapter caddyfile >/dev/null
docker exec "$CADDY_CONTAINER" caddy reload --force --config /config/english-profile-generator.Caddyfile --adapter caddyfile >/dev/null

printf 'APP_HEALTH='
curl -fsS --max-time 5 "http://127.0.0.1:$PORT/__health"
printf '\nCADDY_BACKUP=%s\n' "$backup"
printf 'PANEL_HEALTH='
curl -kfsS --max-time 8 --resolve "panel.kaige92.com:443:127.0.0.1" -o /dev/null -w '%{http_code}\n' "https://panel.kaige92.com/"
printf 'PROFILE_HEALTH='
curl -kfsS --max-time 15 --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w '%{http_code}\n' "https://$DOMAIN/__health"
echo "Deployment complete: https://$DOMAIN"
