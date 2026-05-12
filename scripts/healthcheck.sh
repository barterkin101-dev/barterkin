#!/usr/bin/env bash
# Cron healthcheck: ensure barterkin-telegram-bot is alive AND working.
# Considers TOOL execution as activity, not just polling. Avoids killing mid-task.
LOG=/root/barterkin/.daemon-logs/healthcheck.log
mkdir -p "$(dirname "$LOG")"
exec >> "$LOG" 2>&1
ts() { date '+%F %T'; }

if ! systemctl is-active --quiet barterkin-telegram-bot.service; then
  echo "[$(ts)] service DEAD → restart"
  systemctl restart barterkin-telegram-bot.service
  exit 0
fi

# Activity = getUpdates polls OR tool executions OR Kimi API calls in last 3 min
recent=$(journalctl -u barterkin-telegram-bot.service --since '3 min ago' --no-pager 2>/dev/null \
  | grep -cE 'getUpdates|TOOL |chat/completions|kimi_reply')

if [[ "$recent" -lt 3 ]]; then
  echo "[$(ts)] NO activity in 3min ($recent events) → restart"
  systemctl restart barterkin-telegram-bot.service
else
  : # healthy (polling or actively working)
fi
