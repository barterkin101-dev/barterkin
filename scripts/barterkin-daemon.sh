#!/usr/bin/env bash
# Barterkin Autonomous Daemon
# Runs task sessions in a loop with safety guards.
# Usage:
#   ./scripts/barterkin-daemon.sh start    # start in background
#   ./scripts/barterkin-daemon.sh stop     # stop
#   ./scripts/barterkin-daemon.sh status   # check status
#   ./scripts/barterkin-daemon.sh run      # run one task and exit
#   ./scripts/barterkin-daemon.sh loop     # loop forever (use with launchd/cron)

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PID_FILE="$PROJECT_ROOT/.daemon-pid"
KILL_SWITCH="$PROJECT_ROOT/.daemon-stop"
LOG_DIR="$PROJECT_ROOT/.daemon-logs"
mkdir -p "$LOG_DIR"

# ─── Config ──────────────────────────────────────────────────────────
INTERVAL_MIN="${INTERVAL_MIN:-30}"        # minutes between tasks
MAX_SESSIONS_DAY="${MAX_SESSIONS_DAY:-24}" # safety: max 24 sessions/day
MAX_FAIL_STREAK="${MAX_FAIL_STREAK:-3}"   # pause after N consecutive failures

# ─── Helpers ─────────────────────────────────────────────────────────
log() {
  echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_DIR/daemon.log"
}

count_today_sessions() {
  find "$LOG_DIR" -name "task-*.log" -mtime -1 2>/dev/null | wc -l | tr -d ' '
}

count_recent_failures() {
  # Count failures in last N logs
  local n="${1:-10}"
  find "$LOG_DIR" -name "task-*.log" -mtime -1 2>/dev/null | xargs ls -1t 2>/dev/null | head -"$n" | while read -r f; do
    if tail -5 "$f" 2>/dev/null | grep -q "AI session exited with code: [^0]"; then
      echo "fail"
    fi
  done | wc -l | tr -d ' '
}

# ─── Commands ────────────────────────────────────────────────────────
cmd_start() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log "Daemon already running (PID $(cat "$PID_FILE"))"
    exit 0
  fi
  rm -f "$KILL_SWITCH"
  nohup "$0" loop >> "$LOG_DIR/daemon.log" 2>&1 &
  echo $! > "$PID_FILE"
  log "Daemon started (PID $!)"
  log "Logs: $LOG_DIR"
  log "Stop anytime: ./scripts/barterkin-daemon.sh stop"
}

cmd_stop() {
  touch "$KILL_SWITCH"
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      log "Stopping daemon (PID $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 2
      kill -9 "$pid" 2>/dev/null || true
    fi
  fi
  rm -f "$PID_FILE" "$PROJECT_ROOT/.daemon-lock"
  log "Daemon stopped."
}

cmd_status() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log "Daemon RUNNING (PID $(cat "$PID_FILE"))"
  else
    log "Daemon STOPPED"
  fi
  local today
  today=$(count_today_sessions)
  log "Sessions today: $today / $MAX_SESSIONS_DAY"
  log "Logs: $LOG_DIR"
  ls -1t "$LOG_DIR"/task-*.log 2>/dev/null | head -5 | while read -r f; do
    local name
    name=$(basename "$f")
    local status="OK"
    if tail -5 "$f" 2>/dev/null | grep -q "AI session exited with code: [^0]"; then
      status="FAIL"
    fi
    log "  $name — $status"
  done || true
}

cmd_run() {
  log "Running single task..."
  "$PROJECT_ROOT/scripts/run-task.sh"
}

cmd_loop() {
  log "════════════════════════════════════════"
  log "Barterkin Autonomous Daemon started"
  log "Interval: ${INTERVAL_MIN}m | Max sessions/day: $MAX_SESSIONS_DAY"
  log "Kill switch: $KILL_SWITCH"
  log "════════════════════════════════════════"

  while true; do
    # Check kill switch
    if [[ -f "$KILL_SWITCH" ]]; then
      log "Kill switch detected. Exiting."
      rm -f "$KILL_SWITCH" "$PID_FILE"
      exit 0
    fi

    # Check daily session limit
    local today
    today=$(count_today_sessions)
    if [[ "$today" -ge "$MAX_SESSIONS_DAY" ]]; then
      log "Daily session limit reached ($today/$MAX_SESSIONS_DAY). Sleeping 1 hour."
      sleep 3600
      continue
    fi

    # Check failure streak
    local fails
    fails=$(count_recent_failures "$MAX_FAIL_STREAK")
    if [[ "$fails" -ge "$MAX_FAIL_STREAK" ]]; then
      log "Failure streak detected ($fails/$MAX_FAIL_STREAK). Pausing 2 hours."
      sleep 7200
      continue
    fi

    # Run task
    log "Starting task session ($today/$MAX_SESSIONS_DAY today)..."
    if "$PROJECT_ROOT/scripts/run-task.sh" >> "$LOG_DIR/daemon.log" 2>&1; then
      log "Task completed successfully."
    else
      log "Task failed or timed out."
    fi

    # Send Telegram status every 4th run (every ~2 hours at 30min interval)
    if [[ $((today % 4)) -eq 0 ]]; then
      if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_GROUP_ID:-}" ]]; then
        log "Sending Telegram status update..."
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" -H "Content-Type: application/json" -d "{"chat_id":"${TELEGRAM_GROUP_ID}","text":"📊 Daemon: Task completed/failed. Check logs."}" >> "$LOG_DIR/daemon.log" 2>&1 || true
      fi
    fi

    # Sleep until next interval
    log "Sleeping ${INTERVAL_MIN} minutes..."
    sleep "$((INTERVAL_MIN * 60))"
  done
}

# ─── Main ────────────────────────────────────────────────────────────
case "${1:-status}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  status) cmd_status ;;
  run) cmd_run ;;
  loop) cmd_loop ;;
  *)
    echo "Usage: $0 {start|stop|status|run|loop}"
    echo ""
    echo "  start   — Start daemon in background"
    echo "  stop    — Stop daemon"
    echo "  status  — Show daemon status and recent logs"
    echo "  run     — Run one task and exit"
    echo "  loop    — Run loop forever (for launchd/cron)"
    exit 1
    ;;
esac
