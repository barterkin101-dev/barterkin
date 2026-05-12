#!/usr/bin/env bash
# Emergency restore: re-applies the locked bot script from .LOCKED backup.
# Run if the bot file was somehow modified despite protections.
set -e
SRC=/root/barterkin/scripts/telegram-bot.py.LOCKED
DST=/root/barterkin/scripts/telegram-bot.py
if [[ ! -f "$SRC" ]]; then
  echo "ERROR: locked backup missing at $SRC"
  exit 1
fi
echo "Removing immutable bit on $DST..."
chattr -i "$DST" 2>/dev/null || true
echo "Restoring from $SRC..."
cp "$SRC" "$DST"
chmod +x "$DST"
echo "Re-locking..."
/root/barterkin/scripts/lockdown.sh
echo "Restarting service..."
systemctl restart barterkin-telegram-bot.service
sleep 3
systemctl is-active barterkin-telegram-bot.service && echo "✅ bot restored"
