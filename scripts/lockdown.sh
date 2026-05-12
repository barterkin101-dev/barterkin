#!/usr/bin/env bash
# Apply chattr +i to protected files so no agent (running as root) can modify them.
# Run after any intentional update to a protected file. To edit:
#   chattr -i scripts/telegram-bot.py
#   <edit>
#   ./scripts/lockdown.sh
set -e
cd "$(dirname "$0")/.."
files=(
  scripts/telegram-bot.py
  scripts/barterkin-daemon.sh
  .hermes-do-not-touch
  /etc/systemd/system/barterkin-telegram-bot.service
  /etc/systemd/system/barterkin-agent.service
)
for f in "${files[@]}"; do
  if [[ -f "$f" ]]; then
    chattr +i "$f" 2>/dev/null && echo "locked: $f" || echo "WARN: chattr failed on $f"
  fi
done
