#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-}"
APP_ROOT="${APP_ROOT:-/opt/english-profile-generator}"
NODE_VERSION="${NODE_VERSION:-v22.22.0}"

if [[ $EUID -ne 0 ]]; then
  echo "Run this installer with sudo." >&2
  exit 1
fi
if [[ ! "$DOMAIN" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "Usage: sudo bash install.sh profile.example.com" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl nginx certbot python3-certbot-nginx xz-utils

architecture="$(dpkg --print-architecture)"
case "$architecture" in
  amd64) node_arch='linux-x64' ;;
  arm64) node_arch='linux-arm64' ;;
  *) echo "Unsupported server architecture: $architecture" >&2; exit 1 ;;
esac

mkdir -p "$APP_ROOT/runtime" "$APP_ROOT/cache"
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

install -m 0755 "$(dirname "$0")/update.sh" /usr/local/sbin/english-profile-generator-update
SKIP_RESTART=1 /usr/local/sbin/english-profile-generator-update

cat >/etc/systemd/system/english-profile-generator.service <<EOF
[Unit]
Description=English Profile Generator
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_ROOT/current
RuntimeDirectory=english-profile-generator
ExecStart=$APP_ROOT/runtime/node/bin/node $APP_ROOT/current/scripts/local-server.mjs --host 127.0.0.1 --port 6820 --root $APP_ROOT/current/dist --state-file /run/english-profile-generator/server-state.json
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/english-profile-generator-update.service <<EOF
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

cat >/etc/nginx/conf.d/english-profile-generator-rate-limit.conf <<'EOF'
limit_req_zone $binary_remote_addr zone=epg_avatar:10m rate=15r/s;
EOF

cat >/etc/nginx/sites-available/english-profile-generator <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location = /__avatar {
        limit_req zone=epg_avatar burst=15 nodelay;
        proxy_pass http://127.0.0.1:6820;
        proxy_set_header Host 127.0.0.1;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:6820;
        proxy_http_version 1.1;
        proxy_set_header Host 127.0.0.1;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: blob: https://randomuser.me; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' data: blob: https://randomuser.me; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
}
EOF

ln -sfn /etc/nginx/sites-available/english-profile-generator /etc/nginx/sites-enabled/english-profile-generator
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now english-profile-generator.service nginx.service english-profile-generator-update.timer

service_ready=0
for _ in {1..30}; do
  if curl -fsS --max-time 2 http://127.0.0.1:6820/__health; then
    service_ready=1
    break
  fi
  sleep 1
done
if [[ "$service_ready" != "1" ]]; then
  systemctl --no-pager --full status english-profile-generator.service >&2 || true
  journalctl -u english-profile-generator.service -n 50 --no-pager >&2 || true
  echo "Application health check failed before HTTPS setup." >&2
  exit 1
fi
certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email --redirect -d "$DOMAIN"
systemctl reload nginx
echo "Deployment complete: https://$DOMAIN"
