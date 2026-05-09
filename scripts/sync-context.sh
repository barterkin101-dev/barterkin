#!/usr/bin/env bash
# Barterkin Context Sync
# Pushes .continue-here.md + daemon logs to GitHub so context survives
# local machine crashes and can be resumed from anywhere.
# Usage:
#   ./scripts/sync-context.sh push    # commit and push handoff + logs
#   ./scripts/sync-context.sh pull    # pull latest context from remote

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

BRANCH="${SYNC_BRANCH:-context-sync}"

log() { echo "[sync] $*"; }

cmd_push() {
  # Ensure we're on main, stash any uncommitted changes
  CURRENT=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$CURRENT" != "main" ]]; then
    log "Currently on $CURRENT, switching to main..."
    git stash push -m "sync-context-stash" || true
    git checkout main
  fi

  # Stage handoff file and daemon logs
  git add .continue-here.md .daemon-logs/ 2>/dev/null || true

  if git diff --cached --quiet; then
    log "No context changes to push."
  else
    git commit -m "sync: autonomous context backup $(date -Iseconds)" || true
    log "Pushing context to origin/main..."
    git push origin main || log "Push failed — may need manual resolution."
  fi

  # Restore branch if needed
  if [[ "$CURRENT" != "main" ]]; then
    git checkout "$CURRENT" || true
    git stash pop 2>/dev/null || true
  fi
}

cmd_pull() {
  log "Pulling latest context from origin/main..."
  git fetch origin main
  # Check if .continue-here.md changed
  if ! git diff --quiet HEAD origin/main -- .continue-here.md 2>/dev/null; then
    log "Remote .continue-here.md is newer. Merging..."
    git checkout origin/main -- .continue-here.md .daemon-logs/ 2>/dev/null || true
    log "Context updated from remote."
  else
    log "Local context is up to date."
  fi
}

case "${1:-push}" in
  push) cmd_push ;;
  pull) cmd_pull ;;
  *)
    echo "Usage: $0 {push|pull}"
    exit 1
    ;;
esac
