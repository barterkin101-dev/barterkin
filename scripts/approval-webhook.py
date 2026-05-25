#!/usr/bin/env python3
"""
Barterkin Approval Webhook Server
==================================
Receives Telegram callback queries via webhook, executes approved tasks,
and updates messages with results.

Usage:
  export TELEGRAM_BOT_TOKEN="..."
  export WEBHOOK_SECRET="random-secret"
  python3 scripts/approval-webhook.py

Then set webhook:
  curl -F "url=https://your-server:8443/webhook" \
       -F "secret_token=$WEBHOOK_SECRET" \
       "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
"""

import os
import sys
import json
import asyncio
import subprocess
import hmac
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SECRET = os.environ.get("WEBHOOK_SECRET", "barterkin-webhook-secret")
PORT = int(os.environ.get("WEBHOOK_PORT", "8443"))
TASKS_FILE = PROJECT_ROOT / ".pending-tasks.json"
APPROVALS_FILE = PROJECT_ROOT / ".daemon-approvals.json"
LOG_FILE = PROJECT_ROOT / ".daemon-logs" / "approval-webhook.log"

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
    import urllib.request
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        return json.loads(resp.read().decode())
    except Exception as e:
        log(f"API error: {e}")
        return {"ok": False}


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


class WebhookHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log(f"{self.client_address[0]} - {format % args}")

    def do_POST(self):
        if self.path != "/webhook":
            self.send_error(404)
            return

        # Verify secret token
        secret_header = self.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if secret_header != SECRET:
            log(f"Invalid secret: {secret_header[:20]}...")
            self.send_error(403)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            update = json.loads(body.decode())
        except Exception:
            self.send_error(400)
            return

        self.send_response(200)
        self.end_headers()

        # Handle callback query
        cb = update.get("callback_query")
        if not cb:
            return

        data = cb.get("data", "")
        if ":" not in data:
            return

        action, task_id = data.split(":", 1)
        user = cb.get("from", {}).get("username") or cb.get("from", {}).get("first_name", "unknown")
        chat_id = cb.get("message", {}).get("chat", {}).get("id")
        message_id = cb.get("message", {}).get("message_id")

        log(f"Callback: action={action}, task={task_id}, user={user}, chat={chat_id}")

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

            # Load task and execute
            tasks = load_json(TASKS_FILE, {})
            task = tasks.get(task_id, {})
            command = task.get("command", "")

            if command:
                result = asyncio.run(execute_command(command))
                # Update task status
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


def run_server():
    if not TOKEN:
        log("ERROR: TELEGRAM_BOT_TOKEN not set")
        sys.exit(1)

    server = HTTPServer(("0.0.0.0", PORT), WebhookHandler)
    log(f"Webhook server started on port {PORT}")
    log(f"Set webhook: curl -F 'url=http://YOUR_SERVER:{PORT}/webhook' -F 'secret_token={SECRET}' https://api.telegram.org/bot<TOKEN>/setWebhook")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log("Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    run_server()
