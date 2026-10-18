#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/english-profile-generator}"
REPOSITORY="${REPOSITORY:-qq541253643-art/english-profile-generator}"
NODE_BIN="$APP_ROOT/runtime/node/bin/node"
NPM_BIN="$APP_ROOT/runtime/node/bin/npm"
CURRENT_VERSION_FILE="$APP_ROOT/current-version"
export PATH="$APP_ROOT/runtime/node/bin:$PATH"

mkdir -p "$APP_ROOT"
exec 9>"$APP_ROOT/update.lock"
if ! flock -n 9; then
  echo "Another update is already running."
  exit 0
fi

cleanup_storage() {
  mkdir -p "$APP_ROOT/releases" "$APP_ROOT/cache"
  find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -name '.*.staging' -mtime +0 -exec rm -rf -- {} +

  local current_path previous_kept release_path
  current_path="$(readlink -f "$APP_ROOT/current" 2>/dev/null || true)"
  previous_kept=0
  while IFS= read -r release_path; do
    [[ -z "$release_path" || "$release_path" == "$current_path" ]] && continue
    if [[ "$previous_kept" -eq 0 ]]; then
      previous_kept=1
    else
      rm -rf -- "$release_path"
    fi
  done < <(find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -name 'v*' -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2-)

  find "$APP_ROOT/cache" -maxdepth 1 -type f \( -name 'v*.tar.gz' -o -name 'node-*.tar.xz' -o -name 'SHASUMS256.txt' \) -delete
  rm -rf "$APP_ROOT/cache/npm"
}

configure_avatar_cache() {
  mkdir -p "$APP_ROOT/avatar-cache" /etc/systemd/system/english-profile-generator.service.d
  chown www-data:www-data "$APP_ROOT/avatar-cache"
  cat > /etc/systemd/system/english-profile-generator.service.d/avatar-cache.conf <<EOF
[Service]
Environment=EPG_AVATAR_CACHE_DIR=$APP_ROOT/avatar-cache
ReadWritePaths=$APP_ROOT/avatar-cache
EOF
  systemctl daemon-reload
}

if [[ ! -x "$NODE_BIN" || ! -x "$NPM_BIN" ]]; then
  echo "Node.js runtime is missing under $APP_ROOT/runtime/node." >&2
  exit 1
fi

latest_tag="$(curl -fsSL --connect-timeout 8 --max-time 20 \
  -H 'Accept: application/vnd.github+json' \
  -H 'User-Agent: EnglishProfileGenerator-ServerUpdater' \
  "https://api.github.com/repos/$REPOSITORY/releases/latest" \
  | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\(v[0-9][0-9.]*\)".*/\1/p' \
  | head -n 1)"

if [[ ! "$latest_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "GitHub latest release did not return a semantic version tag." >&2
  exit 1
fi

current_tag="$(cat "$CURRENT_VERSION_FILE" 2>/dev/null || true)"
configure_avatar_cache
if [[ "$current_tag" == "$latest_tag" && -L "$APP_ROOT/current" ]]; then
  cleanup_storage
  echo "Already current: $latest_tag"
  exit 0
fi

mkdir -p "$APP_ROOT/releases" "$APP_ROOT/cache"
release_path="$APP_ROOT/releases/$latest_tag"
stage_path="$APP_ROOT/releases/.${latest_tag}.staging"
archive_path="$APP_ROOT/cache/$latest_tag.tar.gz"
rm -rf "$stage_path"
mkdir -p "$stage_path"
trap 'rm -rf "$stage_path"' EXIT

curl -fsSL --connect-timeout 8 --max-time 120 \
  "https://codeload.github.com/$REPOSITORY/tar.gz/refs/tags/$latest_tag" \
  -o "$archive_path"
tar -xzf "$archive_path" -C "$stage_path" --strip-components=1

expected_version="${latest_tag#v}"
actual_version="$(cd "$stage_path" && "$NODE_BIN" -p "require('./package.json').version")"
if [[ "$actual_version" != "$expected_version" ]]; then
  echo "Release package version mismatch: expected $expected_version, got $actual_version." >&2
  exit 1
fi

cd "$stage_path"
NPM_CONFIG_CACHE="$APP_ROOT/cache/npm" "$NPM_BIN" ci --no-audit --no-fund
"$NPM_BIN" audit --omit=dev --audit-level=high
"$NPM_BIN" test
"$NPM_BIN" run build

rm -rf "$release_path"
mv "$stage_path" "$release_path"
trap - EXIT
ln -sfn "$release_path" "$APP_ROOT/current.next"
mv -Tf "$APP_ROOT/current.next" "$APP_ROOT/current"
printf '%s\n' "$latest_tag" > "$CURRENT_VERSION_FILE"
install -m 0755 "$release_path/deploy/server/update.sh" /usr/local/sbin/english-profile-generator-update
cleanup_storage

if [[ "${SKIP_RESTART:-0}" != "1" ]] && systemctl cat english-profile-generator.service >/dev/null 2>&1; then
  systemctl restart english-profile-generator.service
  for _ in {1..30}; do
    if curl -fsS --max-time 2 http://127.0.0.1:6820/__health | grep -q "\"version\":\"$expected_version\""; then
      echo "Updated and verified: $latest_tag"
      exit 0
    fi
    sleep 1
  done
  echo "Service health check failed after updating to $latest_tag." >&2
  exit 1
fi

echo "Prepared release: $latest_tag"
