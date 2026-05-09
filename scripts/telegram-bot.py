#!/usr/bin/env python3
"""
Barterkin Telegram Bot
======================
Sends status updates, approval requests, and business metrics
to the Barterkin groupchat. Handles inline button callbacks.

Usage:
  export TELEGRAM_BOT_TOKEN="your-bot-token"
  export TELEGRAM_GROUP_ID="-123456789"   # groupchat ID (negative for groups)
  python3 scripts/telegram-bot.py status    # send status update
  python3 scripts/telegram-bot.py ask       # send approval request
  python3 scripts/telegram-bot.py metrics   # send business metrics
  python3 scripts/telegram-bot.py poll      # start polling for callbacks
"""

import os
import sys
import asyncio
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = PROJECT_ROOT / ".daemon-logs"
HANDOFF = PROJECT_ROOT / ".continue-here.md"

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GROUP_ID = os.environ.get("TELEGRAM_GROUP_ID", "")


def run_cmd(cmd: list[str], cwd: Path = PROJECT_ROOT) -> str:
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=30
        )
        return (result.stdout + result.stderr).strip()
    except Exception as e:
        return f"Error: {e}"


def get_git_status() -> str:
    branch = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    last_commit = run_cmd(["git", "log", "-1", "--format=%h %s (%ar)"])
    uncommitted = run_cmd(["git", "status", "--short"])
    return f"Branch: {branch}\nLast: {last_commit}\nUncommitted: {len(uncommitted.splitlines()) if uncommitted else 0} files"


def get_recent_logs() -> str:
    logs = list(LOG_DIR.glob("task-*.log")) if LOG_DIR.exists() else []
    logs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    lines = []
    for log in logs[:3]:
        name = log.name
        with open(log) as f:
            content = f.read().strip().splitlines()
        # Find exit code
        exit_code = "?"
        for line in reversed(content):
            if "AI session exited with code:" in line:
                exit_code = line.split(":")[-1].strip()
                break
        status = "✅" if exit_code == "0" else "❌" if exit_code != "?" else "⏳"
        lines.append(f"{status} {name} (exit:{exit_code})")
    return "\n".join(lines) if lines else "No recent sessions."


def get_next_tasks() -> str:
    if not HANDOFF.exists():
        return "No handoff file found."
    content = HANDOFF.read_text()
    # Extract next task queue
    in_queue = False
    tasks = []
    for line in content.splitlines():
        if "## Next Task Queue" in line:
            in_queue = True
            continue
        if in_queue:
            if line.startswith("##"):
                break
            if line.strip().startswith(("1.", "2.", "3.", "4.", "5.")):
                tasks.append(line.strip())
    return "\n".join(tasks[:3]) if tasks else "No tasks queued."


def build_status_message() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    git = get_git_status()
    logs = get_recent_logs()
    tasks = get_next_tasks()
    return (
        f"📊 <b>Barterkin Autonomous Status</b>\n"
        f"<i>{now}</i>\n\n"
        f"📝 <b>Git</b>\n<pre>{git}</pre>\n\n"
        f"🤖 <b>Recent Sessions</b>\n<pre>{logs}</pre>\n\n"
        f"📋 <b>Next Up</b>\n<pre>{tasks}</pre>\n\n"
        f"Daemon: {'🟢 running' if (PROJECT_ROOT / '.daemon-pid').exists() else '🔴 stopped'}"
    )


def build_approval_message(task: str, details: str = "") -> str:
    return (
        f"⚠️ <b>Approval Required</b>\n\n"
        f"Task: <code>{task}</code>\n"
        f"{details}\n\n"
        f"Shall I proceed?"
    )


async def send_status(application: Application) -> None:
    if not GROUP_ID:
        print("ERROR: TELEGRAM_GROUP_ID not set")
        return
    msg = build_status_message()
    await application.bot.send_message(
        chat_id=GROUP_ID, text=msg, parse_mode="HTML"
    )


async def send_approval(application: Application, task: str, details: str = "") -> None:
    if not GROUP_ID:
        print("ERROR: TELEGRAM_GROUP_ID not set")
        return
    keyboard = [
        [
            InlineKeyboardButton("✅ Approve", callback_data=f"approve:{task}"),
            InlineKeyboardButton("❌ Reject", callback_data=f"reject:{task}"),
        ],
        [
            InlineKeyboardButton("⏭ Skip", callback_data=f"skip:{task}"),
            InlineKeyboardButton("🔍 Details", callback_data=f"details:{task}"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    msg = build_approval_message(task, details)
    await application.bot.send_message(
        chat_id=GROUP_ID,
        text=msg,
        parse_mode="HTML",
        reply_markup=reply_markup,
    )


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    data = query.data or ""
    action, task = data.split(":", 1) if ":" in data else (data, "")

    user = query.from_user.username or query.from_user.first_name

    if action == "approve":
        await query.edit_message_text(
            f"✅ <b>Approved by {user}</b>\n\nTask: <code>{task}</code>\n\n"
            f"Daemon will pick this up on the next run.",
            parse_mode="HTML",
        )
        # Write approval to a file the daemon can read
        approval_file = PROJECT_ROOT / ".daemon-approvals.json"
        approvals = []
        if approval_file.exists():
            approvals = json.loads(approval_file.read_text())
        approvals.append({
            "task": task,
            "action": "approve",
            "user": user,
            "time": datetime.now(timezone.utc).isoformat(),
        })
        approval_file.write_text(json.dumps(approvals, indent=2))

    elif action == "reject":
        await query.edit_message_text(
            f"❌ <b>Rejected by {user}</b>\n\nTask: <code>{task}</code>\n\n"
            f"Skipped. Will not proceed.",
            parse_mode="HTML",
        )

    elif action == "skip":
        await query.edit_message_text(
            f"⏭ <b>Skipped by {user}</b>\n\nTask: <code>{task}</code>\n\n"
            f"Deferring to later.",
            parse_mode="HTML",
        )

    elif action == "details":
        await query.edit_message_text(
            f"🔍 <b>Task Details</b>\n\n"
            f"Task: <code>{task}</code>\n\n"
            f"See .continue-here.md for full context.",
            parse_mode="HTML",
        )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    msg = build_status_message()
    await update.message.reply_text(msg, parse_mode="HTML")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🤖 <b>Barterkin Bot</b>\n\n"
        "Commands:\n"
        "/status — Current autonomous status\n"
        "/start — Show this help\n"
        "/tasks — Show next task queue\n"
        "/approve — List pending approvals\n",
        parse_mode="HTML",
    )


async def cmd_tasks(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tasks = get_next_tasks()
    await update.message.reply_text(
        f"📋 <b>Next Tasks</b>\n\n<pre>{tasks}</pre>", parse_mode="HTML"
    )


async def cmd_approvals(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    approval_file = PROJECT_ROOT / ".daemon-approvals.json"
    if not approval_file.exists():
        await update.message.reply_text("No pending approvals.")
        return
    approvals = json.loads(approval_file.read_text())
    pending = [a for a in approvals if a.get("action") == "approve"]
    if not pending:
        await update.message.reply_text("No pending approvals.")
        return
    lines = [f"• {a['task']} (approved by {a['user']})" for a in pending[-5:]]
    await update.message.reply_text(
        f"✅ <b>Recent Approvals</b>\n\n" + "\n".join(lines), parse_mode="HTML"
    )


async def main() -> None:
    if not TOKEN:
        print("ERROR: Set TELEGRAM_BOT_TOKEN env var")
        sys.exit(1)

    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("tasks", cmd_tasks))
    application.add_handler(CommandHandler("approvals", cmd_approvals))
    application.add_handler(CallbackQueryHandler(handle_callback))

    mode = sys.argv[1] if len(sys.argv) > 1 else "poll"

    if mode == "status":
        async with application:
            await send_status(application)
    elif mode == "ask":
        task = sys.argv[2] if len(sys.argv) > 2 else "unknown task"
        details = sys.argv[3] if len(sys.argv) > 3 else ""
        async with application:
            await send_approval(application, task, details)
    elif mode == "poll":
        print("Starting polling bot...")
        await application.initialize()
        await application.start()
        await application.updater.start_polling()
        # Keep running
        stop_event = asyncio.Event()
        await stop_event.wait()
    else:
        print(f"Unknown mode: {mode}")
        print("Usage: status | ask <task> [details] | poll")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
