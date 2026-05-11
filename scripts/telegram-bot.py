#!/usr/bin/env python3
"""Barterkin Telegram Bot — Full system access."""
import os
import sys
import asyncio
import json
import subprocess
import logging
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = PROJECT_ROOT / ".daemon-logs"
HANDOFF = PROJECT_ROOT / ".continue-here.md"

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
GROUP_ID = os.environ.get("TELEGRAM_GROUP_ID", "")

# All API keys loaded from .env.bot
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
CLOUDFLARE_TOKEN = os.environ.get("CLOUDFLARE_API_TOKEN", "")
CLOUDFLARE_ZONE = os.environ.get("CLOUDFLARE_ZONE_ID", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
SITE_URL = os.environ.get("NEXT_PUBLIC_SITE_URL", "https://www.barterkin.com")


def run_cmd(cmd: list[str], cwd: Path = PROJECT_ROOT) -> str:
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=30)
        return (result.stdout + result.stderr).strip()
    except Exception as e:
        return f"Error: {e}"


def api_get(url: str, headers: dict | None = None) -> dict:
    try:
        req = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return {"status": resp.status, "data": json.loads(resp.read())}
    except Exception as e:
        return {"error": str(e)}


def get_git_status() -> str:
    branch = run_cmd(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    last_commit = run_cmd(["git", "log", "-1", "--format=%h %s (%ar)"])
    ahead = run_cmd(["git", "rev-list", "--count", "origin/main..main"])
    uncommitted = run_cmd(["git", "status", "--short"])
    return f"Branch: {branch}\nLast: {last_commit}\nAhead of origin: {ahead}\nUncommitted: {len(uncommitted.splitlines()) if uncommitted else 0} files"


def get_github_status() -> str:
    if not GITHUB_TOKEN:
        return "No GITHUB_TOKEN"
    result = api_get(
        "https://api.github.com/repos/barterkin101-dev/barterkin/commits?per_page=1",
        {"Authorization": f"token {GITHUB_TOKEN}"}
    )
    if "error" in result:
        return f"GitHub API error: {result['error']}"
    commits = result.get("data", [])
    if commits:
        sha = commits[0].get("sha", "")[:7]
        msg = commits[0].get("commit", {}).get("message", "")[:50]
        return f"Latest on origin: {sha} {msg}"
    return "No commits found"


def get_supabase_metrics() -> str:
    if not SUPABASE_URL or not SUPABASE_ANON:
        return "No Supabase credentials"
    base = f"{SUPABASE_URL}/rest/v1"
    headers = {"apikey": SUPABASE_ANON, "Authorization": f"Bearer {SUPABASE_ANON}"}
    tables = ["profiles", "listings", "conversations", "messages", "tickets"]
    lines = []
    for table in tables:
        try:
            req = urllib.request.Request(
                f"{base}/{table}?select=count()&limit=1",
                headers=headers, method="HEAD"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                cr = resp.headers.get("content-range", "")
                count = cr.split("/")[-1] if "/" in cr else "?"
                lines.append(f"{table}: {count}")
        except Exception as e:
            lines.append(f"{table}: err")
    return "\n".join(lines)


def get_cloudflare_dns() -> str:
    if not CLOUDFLARE_TOKEN or not CLOUDFLARE_ZONE:
        return "No Cloudflare credentials"
    result = api_get(
        f"https://api.cloudflare.com/client/v4/zones/{CLOUDFLARE_ZONE}/dns_records",
        {"Authorization": f"Bearer {CLOUDFLARE_TOKEN}"}
    )
    if "error" in result:
        return f"Cloudflare API error: {result['error']}"
    records = result.get("data", {}).get("result", [])
    lines = []
    for r in records:
        if r.get("name") in ("barterkin.com", "www.barterkin.com"):
            lines.append(f"{r['type']} {r['name']} → {r['content']}")
    return "\n".join(lines) if lines else "No DNS records found"


def get_site_health() -> str:
    try:
        req = urllib.request.Request(SITE_URL, headers={"User-Agent": "Barterkin-Bot/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            return f"Status: {resp.status}\nURL: {resp.url}"
    except Exception as e:
        return f"Site check failed: {e}"


def get_recent_logs() -> str:
    logs = list(LOG_DIR.glob("task-*.log")) if LOG_DIR.exists() else []
    logs.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    lines = []
    for log in logs[:3]:
        name = log.name
        with open(log) as f:
            content = f.read().strip().splitlines()
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
    in_queue = False
    tasks = []
    for line in content.splitlines():
        if "## Next Task Queue" in line:
            in_queue = True
            continue
        if in_queue:
            if line.startswith("##"):
                break
            if line.strip().startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.", "9.")):
                tasks.append(line.strip())
    return "\n".join(tasks[:5]) if tasks else "No tasks queued."


def build_status_message() -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    git = get_git_status()
    logs = get_recent_logs()
    tasks = get_next_tasks()
    site = get_site_health()
    return (
        f"📊 <b>Barterkin Autonomous Status</b>\n"
        f"<i>{now}</i>\n\n"
        f"🌐 <b>Site</b>\n<pre>{site}</pre>\n\n"
        f"📝 <b>Git</b>\n<pre>{git}</pre>\n\n"
        f"🤖 <b>Recent Sessions</b>\n<pre>{logs}</pre>\n\n"
        f"📋 <b>Next Up</b>\n<pre>{tasks}</pre>\n\n"
        f"Daemon: {'🟢 running' if (PROJECT_ROOT / '.daemon-pid').exists() else '🔴 stopped'}"
    )


async def send_status(application: Application) -> None:
    if not GROUP_ID:
        print("ERROR: TELEGRAM_GROUP_ID not set")
        return
    msg = build_status_message()
    await application.bot.send_message(chat_id=GROUP_ID, text=msg, parse_mode="HTML")


async def send_approval(application: Application, task: str, details: str = "") -> None:
    if not GROUP_ID:
        print("ERROR: TELEGRAM_GROUP_ID not set")
        return
    keyboard = [
        [InlineKeyboardButton("✅ Approve", callback_data=f"approve:{task}"),
         InlineKeyboardButton("❌ Reject", callback_data=f"reject:{task}")],
        [InlineKeyboardButton("⏭ Skip", callback_data=f"skip:{task}"),
         InlineKeyboardButton("🔍 Details", callback_data=f"details:{task}")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    msg = (f"⚠️ <b>Approval Required</b>\n\nTask: <code>{task}</code>\n{details}\n\nShall I proceed?")
    await application.bot.send_message(chat_id=GROUP_ID, text=msg, parse_mode="HTML", reply_markup=reply_markup)


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    data = query.data or ""
    action, task = data.split(":", 1) if ":" in data else (data, "")
    user = query.from_user.username or query.from_user.first_name

    if action == "approve":
        await query.edit_message_text(
            f"✅ <b>Approved by {user}</b>\n\nTask: <code>{task}</code>\n\nDaemon will pick this up on the next run.",
            parse_mode="HTML",
        )
        approval_file = PROJECT_ROOT / ".daemon-approvals.json"
        approvals = json.loads(approval_file.read_text()) if approval_file.exists() else []
        approvals.append({"task": task, "action": "approve", "user": user, "time": datetime.now(timezone.utc).isoformat()})
        approval_file.write_text(json.dumps(approvals, indent=2))
    elif action == "reject":
        await query.edit_message_text(f"❌ <b>Rejected by {user}</b>\n\nTask: <code>{task}</code>\n\nSkipped.", parse_mode="HTML")
    elif action == "skip":
        await query.edit_message_text(f"⏭ <b>Skipped by {user}</b>\n\nTask: <code>{task}</code>\n\nDeferring.", parse_mode="HTML")
    elif action == "details":
        await query.edit_message_text(f"🔍 <b>Task Details</b>\n\nTask: <code>{task}</code>\n\nSee .continue-here.md for full context.", parse_mode="HTML")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(build_status_message(), parse_mode="HTML")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🤖 <b>Barterkin Ops Bot</b>\n\n"
        "Commands:\n"
        "/status — Full system status\n"
        "/metrics — Supabase business metrics\n"
        "/dns — Cloudflare DNS records\n"
        "/github — GitHub repo sync status\n"
        "/health — All health checks\n"
        "/tasks — Next task queue\n"
        "/approvals — Pending approvals",
        parse_mode="HTML",
    )


async def cmd_tasks(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(f"📋 <b>Next Tasks</b>\n\n<pre>{get_next_tasks()}</pre>", parse_mode="HTML")


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
    await update.message.reply_text(f"✅ <b>Recent Approvals</b>\n\n" + "\n".join(lines), parse_mode="HTML")


async def cmd_metrics(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    metrics = get_supabase_metrics()
    await update.message.reply_text(f"📊 <b>Supabase Metrics</b>\n\n<pre>{metrics}</pre>", parse_mode="HTML")


async def cmd_dns(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    dns = get_cloudflare_dns()
    await update.message.reply_text(f"🌐 <b>Cloudflare DNS</b>\n\n<pre>{dns}</pre>", parse_mode="HTML")


async def cmd_github(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    gh = get_github_status()
    await update.message.reply_text(f"🐙 <b>GitHub Status</b>\n\n<pre>{gh}</pre>", parse_mode="HTML")


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    site = get_site_health()
    dns = get_cloudflare_dns()
    gh = get_github_status()
    metrics = get_supabase_metrics()
    msg = (
        f"🏥 <b>Full Health Check</b>\n\n"
        f"<b>Site</b>\n<pre>{site}</pre>\n\n"
        f"<b>DNS</b>\n<pre>{dns}</pre>\n\n"
        f"<b>GitHub</b>\n<pre>{gh}</pre>\n\n"
        f"<b>Database</b>\n<pre>{metrics}</pre>"
    )
    await update.message.reply_text(msg, parse_mode="HTML")


def run_poll() -> None:
    if not TOKEN:
        print("ERROR: Set TELEGRAM_BOT_TOKEN env var"); sys.exit(1)
    logger.info("Starting polling bot with full API access...")
    application = Application.builder().token(TOKEN).build()
    application.add_handler(CommandHandler("start", cmd_start))
    application.add_handler(CommandHandler("status", cmd_status))
    application.add_handler(CommandHandler("tasks", cmd_tasks))
    application.add_handler(CommandHandler("approvals", cmd_approvals))
    application.add_handler(CommandHandler("metrics", cmd_metrics))
    application.add_handler(CommandHandler("dns", cmd_dns))
    application.add_handler(CommandHandler("github", cmd_github))
    application.add_handler(CommandHandler("health", cmd_health))
    application.add_handler(CallbackQueryHandler(handle_callback))
    application.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)


async def run_once() -> None:
    if not TOKEN:
        print("ERROR: Set TELEGRAM_BOT_TOKEN env var"); sys.exit(1)
    application = Application.builder().token(TOKEN).build()
    mode = sys.argv[1] if len(sys.argv) > 1 else "status"
    async with application:
        if mode == "status":
            await send_status(application)
        elif mode == "ask":
            task = sys.argv[2] if len(sys.argv) > 2 else "unknown task"
            details = sys.argv[3] if len(sys.argv) > 3 else ""
            await send_approval(application, task, details)
        else:
            print(f"Unknown mode: {mode}")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "poll"
    if mode == "poll":
        run_poll()
    else:
        asyncio.run(run_once())
