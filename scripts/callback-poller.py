#!/usr/bin/env python3
"""
Callback Poller — Short-polls Telegram for approval button clicks.
Designed to NOT conflict with Hermes gateway's long-polling.
Uses getUpdates with offset tracking, processes callbacks, exits.

Run via cron every 10-30 seconds:
  * * * * * /usr/bin/python3 /root/barterkin/scripts/callback-poller.py

Or run in a loop:
  while true; do python3 callback-poller.py; sleep 10; done
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
TASKS_FILE = PROJECT_ROOT / ".pending-tasks.json"
APPROVALS_FILE = PROJECT_ROOT / ".daemon-approvals.json"
OFFSET_FILE = PROJECT_ROOT / ".callback-offset"
LOG_FILE = PROJECT_ROOT / ".daemon-logs" / "callback-poller.log"

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)


def log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def load_json(path: Path, default=None):
    if not path.exists():
        return default if default is not None else {}
    try:
        return json.loads(path.read_text())
    except Exception:
        return default if default is not None else {}


def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2))


def tg_api(method: str, payload: dict) -> dict:
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except Exception as e:
        log(f"API error: {e}")
        return {"ok": False}

def get_updates(offset: int = 0) -> list:
    """Fetch updates from Telegram. Uses short timeout to avoid conflicts."""
    url = f"https://api.telegram.org/bot{TOKEN}/getUpdates?offset={offset}&limit=10&timeout=5&allowed_updates=[%22callback_query%22]"
    try:
        resp = urllib.request.urlopen(url, timeout=15)
        data = json.loads(resp.read().decode())
        if data.get("ok"):
            return data.get("result", [])
    except Exception as e:
        log(f"getUpdates error: {e}")
    return []


async def execute_command(cmd: str, cwd: Path = PROJECT_ROOT) -> str:
    log(f"Executing: {cmd[:200]}")
    try:
        proc = await asyncio.create_subprocess_shell(
            cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=cwd,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=300)
        out = stdout.decode("utf-8", errors="replace")
        log(f"Exit code: {proc.returncode}, output: {len(out)} chars")
        return f"exit={proc.returncode}\n{out[:4000]}"
    except asyncio.TimeoutError:
        proc.kill()
        return "TIMEOUT after 300s"
    except Exception as e:
        return f"ERROR: {e}"


async def process_callback(cb: dict):
    """Process a single callback query."""
    data = cb.get("data", "")
    if ":" not in data:
        return

    action, task_id = data.split(":", 1)
    user = cb.get("from", {}).get("username") or cb.get("from", {}).get("first_name", "unknown")
    chat_id = cb.get("message", {}).get("chat", {}).get("id")
    message_id = cb.get("message", {}).get("message_id")

    log(f"Processing: action={action}, task={task_id}, user={user}")

    # Answer callback to stop loading spinner
    tg_api("answerCallbackQuery", {"callback_query_id": cb.get("id")})

    if action == "approve":
        # Update message to show executing
        tg_api("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": f"🚀 <b>Approved by {user} — Executing...</b>\n\nTask: <code>{task_id}</code>",
            "parse_mode": "HTML",
        })

        # Load and execute task
        tasks = load_json(TASKS_FILE, {})
        task = tasks.get(task_id, {})
        command = task.get("command", "")

        if command:
            result = await execute_command(command)
            task["status"] = "completed"
            task["result"] = result
            task["executed_at"] = datetime.now(timezone.utc).isoformat()
            tasks[task_id] = task
            save_json(TASKS_FILE, tasks)

            # Send result
            result_text = result[:3000] if len(result) > 3000 else result
            tg_api("sendMessage", {
                "chat_id": chat_id,
                "text": f"✅ <b>Task Complete: {task.get('title', task_id)}</b>\n\n<pre>{result_text}</pre>",
                "parse_mode": "HTML",
            })
        else:
            tg_api("editMessageText", {
                "chat_id": chat_id,
                "message_id": message_id,
                "text": f"✅ <b>Approved by {user}</b>\n\nTask: <code>{task_id}</code>\n\n(No command to execute)",
                "parse_mode": "HTML",
            })

        # Log approval
        approvals = load_json(APPROVALS_FILE, [])
        approvals.append({
            "task": task_id,
            "action": "approve",
            "user": user,
            "time": datetime.now(timezone.utc).isoformat(),
        })
        save_json(APPROVALS_FILE, approvals)

    elif action == "reject":
        tg_api("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": f"❌ <b>Rejected by {user}</b>\n\nTask: <code>{task_id}</code>\n\nSkipped.",
            "parse_mode": "HTML",
        })

    elif action == "details":
        tasks = load_json(TASKS_FILE, {})
        task = tasks.get(task_id, {})
        details = task.get("details", "No details available.")
        tg_api("editMessageText", {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": f"🔍 <b>Task Details</b>\n\nTask: <code>{task_id}</code>\n\n<pre>{details[:1500]}</pre>",
            "parse_mode": "HTML",
        })


async def main():
    if not TOKEN:
        log("ERROR: TELEGRAM_BOT_TOKEN not set")
        sys.exit(1)

    # Load last processed offset
    offset = 0
    if OFFSET_FILE.exists():
        try:
            offset = int(OFFSET_FILE.read_text().strip())
        except ValueError:
            offset = 0

    # Fetch updates
    updates = get_updates(offset)
    if not updates:
        return

    log(f"Received {len(updates)} updates")

    for update in updates:
        update_id = update.get("update_id", 0)
        cb = update.get("callback_query")
        if cb:
            await process_callback(cb)
        # Update offset to mark as processed
        offset = update_id + 1

    # Save offset
    OFFSET_FILE.write_text(str(offset))
    log(f"Saved offset: {offset}")


if __name__ == "__main__":
    asyncio.run(main())
