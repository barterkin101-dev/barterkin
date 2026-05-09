#!/usr/bin/env bash
# Barterkin Autonomous Task Runner (Codex Edition)
# Runs a SINGLE task via Codex non-interactively, then exits.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

DRY_RUN="${DRY_RUN:-false}"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# ─── Config ──────────────────────────────────────────────────────────
AI_CLI="${AI_CLI:-codex}"
MAX_DURATION="${MAX_DURATION:-900}"
LOG_DIR="${PROJECT_ROOT}/.daemon-logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/task-$TIMESTAMP.log"

# ─── Telegram Helpers ────────────────────────────────────────────────
tg_notify() {
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_GROUP_ID:-}" ]]; then
    python3 scripts/telegram-bot.py status >> "$LOG_FILE" 2>&1 || true
  fi
}

tg_ask() {
  local task="${1:-unknown task}"
  local details="${2:-}"
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_GROUP_ID:-}" ]]; then
    python3 scripts/telegram-bot.py ask "$task" "$details" >> "$LOG_FILE" 2>&1 || true
  fi
}

# ─── Safety Checks ───────────────────────────────────────────────────
if [[ ! -f ".continue-here.md" ]]; then
  echo "ERROR: .continue-here.md missing" | tee -a "$LOG_FILE"
  exit 1
fi

LOCK_FILE="$PROJECT_ROOT/.daemon-lock"
if [[ -f "$LOCK_FILE" ]]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
  if [[ -n "$LOCK_PID" ]] && kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "SKIP: Another task running (PID $LOCK_PID)" | tee -a "$LOG_FILE"
    exit 0
  else
    rm -f "$LOCK_FILE"
  fi
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: Uncommitted changes. Aborting." | tee -a "$LOG_FILE"
  exit 1
fi

echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

CONTEXT=$(cat .continue-here.md)

PROMPT=$(cat <<'PROMPT_EOF'
You are an autonomous agent resuming work on the Barterkin project.

First, read .continue-here.md to understand the current state.

Then follow these steps EXACTLY:

1. Pick ONE task from the Next Task Queue section — always pick #1.
2. Implement it. Edit files, run tests, fix bugs. Be conservative.
3. Verify: pnpm build (must pass), pnpm test or pnpm e2e if applicable.
4. Commit with a clean conventional commit message. Do NOT use WIP: prefix.
5. Update .continue-here.md. Mark completed task as done.
6. STOP. Do not start another task. Exit after updating the handoff file.

Rules:
- Only touch files inside the project root.
- Never commit .env* files or secrets.
- Never run git push. The daemon handles pushing.
- Never run destructive commands on production (no supabase db push unless EXPLICITLY the task).
- If stuck for more than 5 minutes, leave a note and exit.
PROMPT_EOF
)

echo "════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "Barterkin Autonomous Task Runner" | tee -a "$LOG_FILE"
echo "Started: $(date -Iseconds)" | tee -a "$LOG_FILE"
echo "AI CLI: $AI_CLI" | tee -a "$LOG_FILE"
echo "Max Duration: ${MAX_DURATION}s" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════" | tee -a "$LOG_FILE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN" | tee -a "$LOG_FILE"
  exit 0
fi

timeout "$MAX_DURATION" "$AI_CLI" exec   --dangerously-bypass-approvals-and-sandbox   "$PROMPT"   2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

echo "" | tee -a "$LOG_FILE"
echo "AI session exited with code: $EXIT_CODE" | tee -a "$LOG_FILE"

NEW_COMMITS=$(git rev-list HEAD...HEAD@{1} 2>/dev/null | wc -l | tr -d ' ' || echo "0")
if [[ "$NEW_COMMITS" -gt 0 ]]; then
  echo "Commits made: $NEW_COMMITS" | tee -a "$LOG_FILE"
  tg_notify
else
  echo "No new commits." | tee -a "$LOG_FILE"
fi

if ! git diff --quiet .continue-here.md 2>/dev/null; then
  echo ".continue-here.md updated." | tee -a "$LOG_FILE"
  git add .continue-here.md
  git commit -m "docs: update continue-here handoff [autonomous]" || true
else
  echo ".continue-here.md NOT updated." | tee -a "$LOG_FILE"
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: Uncommitted changes remain. Stashing." | tee -a "$LOG_FILE"
  git stash push -m "autonomous-stash-$TIMESTAMP" || true
fi

echo "Finished: $(date -Iseconds)" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE"

exit "$EXIT_CODE"
