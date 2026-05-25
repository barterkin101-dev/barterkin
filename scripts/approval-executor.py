#!/usr/bin/env python3
"""
Approval Executor — watches .daemon-approvals.json and executes approved tasks.
Runs alongside telegram-bot.py (or as a separate process).

Usage:
  python3 scripts/approval-executor.py poll    # watch for new approvals
  python3 scripts/approval-executor.py once    # process current approvals once
"""

import os
import sys
import json
import time
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent
APPROVALS_FILE = PROJECT_ROOT / ".daemon-approvals.json"
TASKS_FILE = PROJECT_ROOT / ".pending-tasks.json"
LOG_FILE = PROJECT_ROOT / ".daemon-logs" / "approval-executor.log"

# Ensure log dir exists
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


async def execute_command(cmd: str, cwd: Path = PROJECT_ROOT) -> str:
    """Execute a shell command and return output."""
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


async def process_approvals():
    """Process any new approvals in .daemon-approvals.json."""
    approvals = load_json(APPROVALS_FILE, [])
    tasks = load_json(TASKS_FILE, {})

    # Track which approvals we've already processed
    state_file = PROJECT_ROOT / ".approval-executor-state.json"
    state = load_json(state_file, {"processed": []})
    processed = set(state.get("processed", []))

    new_processed = []
    for approval in approvals:
        # Create a unique key for this approval
        key = f"{approval.get('time','')}|{approval.get('task','')}|{approval.get('user','')}"
        if key in processed:
            continue

        if approval.get("action") == "approve":
            task_id = approval.get("task", "")
            task = tasks.get(task_id, {})
            command = task.get("command", "")

            log(f"Processing approval: {task_id} by {approval.get('user')}")

            if command:
                result = await execute_command(command)
                # Update task status
                task["status"] = "completed"
                task["result"] = result
                task["executed_at"] = datetime.now(timezone.utc).isoformat()
                tasks[task_id] = task
                save_json(TASKS_FILE, tasks)
                log(f"Task {task_id} completed")
            else:
                log(f"No command for task {task_id}, marking approved only")

        new_processed.append(key)

    if new_processed:
        state["processed"].extend(new_processed)
        save_json(state_file, state)
        log(f"Processed {len(new_processed)} new approvals")


async def poll_loop():
    """Continuously watch for new approvals."""
    log("Approval executor started (poll mode)")
    while True:
        try:
            await process_approvals()
        except Exception as e:
            log(f"Error in poll loop: {e}")
        await asyncio.sleep(5)  # Check every 5 seconds


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "once"

    if mode == "poll":
        asyncio.run(poll_loop())
    elif mode == "once":
        asyncio.run(process_approvals())
    else:
        print(f"Unknown mode: {mode}. Use 'poll' or 'once'")
        sys.exit(1)


if __name__ == "__main__":
    main()
