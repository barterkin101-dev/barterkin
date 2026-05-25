#!/usr/bin/env python3
"""
Send approval-request messages with inline buttons to the Barterkin Telegram group.
Called by Hermes when it needs human approval before executing a task.

Usage:
  export TELEGRAM_BOT_TOKEN="..."
  export TELEGRAM_GROUP_ID="-1003785064808"
  python3 scripts/send-approval.py "deploy-to-prod" "Deploy current main to Vercel" "git push origin main && vercel --prod"

Buttons:
  ✅ Approve  → executes the registered task
  ❌ Reject   → cancels
  🔍 Details  → shows task details
"""

import os
import sys
import json
import asyncio
import urllib.request
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GROUP_ID = os.environ.get("TELEGRAM_GROUP_ID", "-1003785064808")

# Where pending tasks are stored (bot reads this on startup)
TASKS_FILE = PROJECT_ROOT / ".pending-tasks.json"


def _api(method: str, payload: dict) -> dict:
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read().decode())
    except Exception as e:
        print(f"API error: {e}", file=sys.stderr)
        return {"ok": False, "error": str(e)}


def register_task(task_id: str, title: str, command: str, details: str = "") -> None:
    """Register a task in the pending-tasks registry."""
    tasks = {}
    if TASKS_FILE.exists():
        tasks = json.loads(TASKS_FILE.read_text())
    tasks[task_id] = {
        "title": title,
        "command": command,
        "details": details,
        "status": "pending",
        "created": datetime.now(timezone.utc).isoformat(),
    }
    TASKS_FILE.write_text(json.dumps(tasks, indent=2))
    print(f"Registered task: {task_id}")


def send_approval(task_id: str, title: str, details: str = "") -> dict:
    """Send an approval request message with inline buttons."""
    if not TOKEN:
        print("ERROR: TELEGRAM_BOT_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    keyboard = {
        "inline_keyboard": [
            [
                {"text": "✅ Approve", "callback_data": f"approve:{task_id}"},
                {"text": "❌ Reject", "callback_data": f"reject:{task_id}"},
            ],
            [
                {"text": "🔍 Details", "callback_data": f"details:{task_id}"},
            ],
        ]
    }

    text = f"⚠️ <b>Approval Required</b>\n\n<b>Task:</b> <code>{title}</code>\n"
    if details:
        text += f"\n<i>{details[:500]}</i>\n"
    text += "\nTap ✅ to execute immediately."

    payload = {
        "chat_id": GROUP_ID,
        "text": text,
        "parse_mode": "HTML",
        "reply_markup": json.dumps(keyboard),
    }

    result = _api("sendMessage", payload)
    if result.get("ok"):
        msg_id = result["result"]["message_id"]
        print(f"Sent approval request (msg_id={msg_id})")
    else:
        print(f"Failed to send: {result}", file=sys.stderr)
    return result


def main():
    if len(sys.argv) < 3:
        print("Usage: send-approval.py <task-id> <title> [command] [details]", file=sys.stderr)
        print("Example: send-approval.py deploy-prod 'Deploy to Vercel' 'git push && vercel --prod' 'Production deploy'", file=sys.stderr)
        sys.exit(1)

    task_id = sys.argv[1]
    title = sys.argv[2]
    command = sys.argv[3] if len(sys.argv) > 3 else ""
    details = sys.argv[4] if len(sys.argv) > 4 else ""

    # Register the task so the bot knows what to execute
    register_task(task_id, title, command, details)

    # Send the approval message
    result = send_approval(task_id, title, details)
    sys.exit(0 if result.get("ok") else 1)


if __name__ == "__main__":
    main()
