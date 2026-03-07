#!/usr/bin/env bash
# Sync apps/yoga from the asini monorepo to the standalone nomideusz/yoga repo.
# Usage: bash scripts/sync-yoga.sh [commit message]

set -euo pipefail

REPO_URL="https://github.com/nomideusz/yoga.git"
SYNC_DIR="/tmp/yoga-sync"
SOURCE_DIR="$(cd "$(dirname "$0")/../apps/yoga" && pwd)"
CALENDAR_VERSION=$(npm view @nomideusz/svelte-calendar version 2>/dev/null || echo "0.6.3")

MSG="${1:-sync from monorepo}"

# Clone
rm -rf "$SYNC_DIR"
echo "Cloning $REPO_URL..."
git clone "$REPO_URL" "$SYNC_DIR"

# Preserve standalone-only files
for f in .gitignore .gitattributes CLAUDE.md; do
  if [ -f "$SYNC_DIR/$f" ]; then
    cp "$SYNC_DIR/$f" "/tmp/_yoga_preserve_$f"
  fi
done

# Remove old source files (keep .git, db, lock, preserved files)
find "$SYNC_DIR" -maxdepth 1 \
  -not -name '.git' \
  -not -name '.' \
  -not -name 'local.db' \
  -not -name 'local.db-shm' \
  -not -name 'local.db-wal' \
  -not -name 'pnpm-lock.yaml' \
  -exec rm -rf {} +

# Copy source
cp -r "$SOURCE_DIR"/* "$SYNC_DIR"/
# Copy dotfiles that exist in source
for f in .npmrc .env.example; do
  [ -f "$SOURCE_DIR/$f" ] && cp "$SOURCE_DIR/$f" "$SYNC_DIR/"
done

# Restore preserved files
for f in .gitignore .gitattributes CLAUDE.md; do
  if [ -f "/tmp/_yoga_preserve_$f" ]; then
    cp "/tmp/_yoga_preserve_$f" "$SYNC_DIR/$f"
    rm "/tmp/_yoga_preserve_$f"
  fi
done

# Clean build artifacts
rm -rf "$SYNC_DIR/node_modules" "$SYNC_DIR/.svelte-kit"

# Fix workspace reference
sed -i "s/\"@nomideusz\/svelte-calendar\": \"workspace:\*\"/\"@nomideusz\/svelte-calendar\": \"^${CALENDAR_VERSION}\"/" "$SYNC_DIR/package.json"

# Regenerate lockfile
echo "Installing dependencies to update lockfile..."
(cd "$SYNC_DIR" && pnpm install --no-frozen-lockfile)

# Clean build artifacts again after install
rm -rf "$SYNC_DIR/node_modules" "$SYNC_DIR/.svelte-kit"

# Show status and commit
cd "$SYNC_DIR"
git add -A
echo ""
echo "=== Changes ==="
git status --short
echo ""

CHANGES=$(git status --porcelain)
if [ -z "$CHANGES" ]; then
  echo "No changes to push."
  rm -rf "$SYNC_DIR"
  exit 0
fi

git commit -m "$MSG"
echo ""
echo "Ready to push. Run:"
echo "  cd $SYNC_DIR && git push origin main"
