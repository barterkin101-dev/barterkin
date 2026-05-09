#!/usr/bin/env bash
# Barterkin Autonomous Task Runner
# Runs a SINGLE task via Claude Code non-interactively, then exits.
# Usage: ./scripts/run-task.sh [--dry-run]

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

DRY_RUN="${DRY_RUN:-false}"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
fi

# ─── Config ──────────────────────────────────────────────────────────
AI_CLI="${AI_CLI:-claude}"           # 'claude' or 'kimi'
MAX_BUDGET="${MAX_BUDGET:-5.00}"     # USD per session
MAX_DURATION="${MAX_DURATION:-1800}" # seconds (30 min)
PERMISSION_MODE="${PERMISSION_MODE:-bypassPermissions}" # or 'dontAsk'
LOG_DIR="${PROJECT_ROOT}/.daemon-logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/task-$TIMESTAMP.log"

# ─── Safety Checks ───────────────────────────────────────────────────
if [[ ! -f ".continue-here.md" ]]; then
  echo "ERROR: .continue-here.md missing. Run gsd-pause-work or create it first." | tee -a "$LOG_FILE"
  exit 1
fi

# Don't run if another task is running
LOCK_FILE="$PROJECT_ROOT/.daemon-lock"
if [[ -f "$LOCK_FILE" ]]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
  if [[ -n "$LOCK_PID" ]] && kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "SKIP: Another task is running (PID $LOCK_PID)" | tee -a "$LOG_FILE"
    exit 0
  else
    echo "STALE LOCK: Removing old lock file" | tee -a "$LOG_FILE"
    rm -f "$LOCK_FILE"
  fi
fi

# Don't run if there are uncommitted changes (unless they're expected)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: Uncommitted changes detected. Stashing or aborting." | tee -a "$LOG_FILE"
  # In autonomous mode, we could stash, work, then restore. But safer to abort.
  exit 1
fi

# ─── Write Lock ──────────────────────────────────────────────────────
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# ─── Read Context ────────────────────────────────────────────────────
CONTEXT=$(cat .continue-here.md)

# ─── Build Prompt ────────────────────────────────────────────────────
# We tell the AI exactly what to do, step by step, and when to stop.
PROMPT=$(cat <<'PROMPT_EOF'
You are an autonomous agent resuming work on the Barterkin project.

First, read `.continue-here.md` to understand the current state.

Then follow these steps EXACTLY:

1. **Pick ONE task** from the "Next Task Queue" section — always pick the highest priority item (#1).
2. **Implement it.** Edit files, run tests, fix bugs. Be conservative. If something feels risky, leave a note instead of changing it.
3. **Verify.** Run the relevant tests or build commands:
   - `pnpm build` (must pass)
   - `pnpm test` or `pnpm e2e` if applicable
   - If tests fail, fix them before proceeding.
4. **Commit.** Use a clean, descriptive commit message. Do NOT use "WIP:" prefix — use proper conventional commits (e.g., `feat:`, `fix:`, `refactor:`).
5. **Update `.continue-here.md`.** Mark the completed task as done, add any new findings, and re-prioritize the remaining queue.
6. **STOP.** Do not start another task. Exit after updating the handoff file.

Rules:
- Only touch files inside the project root.
- Never commit `.env*` files or secrets.
- Never run `git push`. The daemon handles pushing.
- Never run destructive commands on production (no `supabase db push` unless EXPLICITLY the task).
- If you get stuck for more than 5 minutes on one step, leave a detailed note in `.continue-here.md` and exit.
- Cost limit: stop if you are approaching budget limits.
PROMPT_EOF
)

# ─── Run AI Session ──────────────────────────────────────────────────
echo "════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "Barterkin Autonomous Task Runner" | tee -a "$LOG_FILE"
echo "Started: $(date -Iseconds)" | tee -a "$LOG_FILE"
echo "AI CLI: $AI_CLI" | tee -a "$LOG_FILE"
echo "Max Budget: \$${MAX_BUDGET}" | tee -a "$LOG_FILE"
echo "Max Duration: ${MAX_DURATION}s" | tee -a "$LOG_FILE"
echo "════════════════════════════════════════" | tee -a "$LOG_FILE"

if [[ "$DRY_RUN" == "true" ]]; then
  echo "DRY RUN: Would execute:" | tee -a "$LOG_FILE"
  echo "  $AI_CLI -p \"$PROMPT\" --permission-mode $PERMISSION_MODE --max-budget-usd $MAX_BUDGET" | tee -a "$LOG_FILE"
  exit 0
fi

# Run with timeout so we don't hang forever
timeout "$MAX_DURATION" "$AI_CLI" \
  -p \
  --permission-mode "$PERMISSION_MODE" \
  --max-budget-usd "$MAX_BUDGET" \
  --output-format text \
  "$PROMPT" \
  2>&1 | tee -a "$LOG_FILE"

EXIT_CODE=${PIPESTATUS[0]}

# ─── Post-Run Checks ─────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo "AI session exited with code: $EXIT_CODE" | tee -a "$LOG_FILE"

# Check if we made commits
NEW_COMMITS=$(git rev-list HEAD...HEAD@{1} 2>/dev/null | wc -l | tr -d ' ' || echo "0")
if [[ "$NEW_COMMITS" -gt 0 ]]; then
  echo "Commits made: $NEW_COMMITS" | tee -a "$LOG_FILE"
else
  echo "No new commits." | tee -a "$LOG_FILE"
fi

# Check if .continue-here.md was modified
if ! git diff --quiet .continue-here.md 2>/dev/null; then
  echo ".continue-here.md was updated." | tee -a "$LOG_FILE"
  # Stage and commit the handoff file separately
  git add .continue-here.md
  git commit -m "docs: update continue-here handoff [autonomous]" || true
else
  echo ".continue-here.md NOT updated. Manual check recommended." | tee -a "$LOG_FILE"
fi

# Check for uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "WARNING: Uncommitted changes remain. Stashing for safety." | tee -a "$LOG_FILE"
  git stash push -m "autonomous-stash-$TIMESTAMP" || true
fi

echo "Finished: $(date -Iseconds)" | tee -a "$LOG_FILE"
echo "Log: $LOG_FILE"

exit "$EXIT_CODE"
