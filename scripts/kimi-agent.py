#!/usr/bin/env python3
"""
Barterkin Kimi Autonomous Agent
Uses Moonshot AI (Kimi) API for autonomous coding tasks.
OpenAI-compatible API with function calling.
"""

import os
import sys
import json
import subprocess
import time
from pathlib import Path
from openai import OpenAI

PROJECT_ROOT = Path(__file__).resolve().parent.parent
HANDOFF = PROJECT_ROOT / ".continue-here.md"

API_KEY = os.environ.get('KIMI_API_KEY') or os.environ.get('MOONSHOT_API_KEY')
if not API_KEY:
    # Try to read from .env files
    for env_file in ['/root/.clawdbot/.env', '/root/.hermes-hv/.env', '/root/.openclaw/.env']:
        if Path(env_file).exists():
            with open(env_file) as f:
                for line in f:
                    if line.startswith('KIMI_API_KEY=') or line.startswith('MOONSHOT_API_KEY='):
                        API_KEY = line.split('=', 1)[1].strip().strip('"').strip("'")
                        break
        if API_KEY:
            break

if not API_KEY:
    print("ERROR: No KIMI_API_KEY or MOONSHOT_API_KEY found")
    sys.exit(1)

MODEL = os.environ.get('KIMI_MODEL', 'kimi-k2-5')
BASE_URL = os.environ.get('KIMI_BASE_URL', 'https://api.moonshot.cn/v1')

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)


def run_cmd(cmd: list[str], cwd: Path = PROJECT_ROOT, timeout: int = 60) -> dict:
    try:
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return {
            'exit_code': result.returncode,
            'stdout': result.stdout[:5000],
            'stderr': result.stderr[:2000],
        }
    except Exception as e:
        return {'exit_code': -1, 'stdout': '', 'stderr': str(e)}


def read_file(path: str) -> str:
    try:
        full = PROJECT_ROOT / path
        with open(full) as f:
            return f.read()
    except Exception as e:
        return f'Error reading {path}: {e}'


def write_file(path: str, content: str) -> str:
    try:
        full = PROJECT_ROOT / path
        full.parent.mkdir(parents=True, exist_ok=True)
        with open(full, 'w') as f:
            f.write(content)
        return f'Wrote {path} ({len(content)} chars)'
    except Exception as e:
        return f'Error writing {path}: {e}'


def git_commit(message: str) -> str:
    r1 = run_cmd(['git', 'add', '-A'])
    r2 = run_cmd(['git', 'commit', '-m', message])
    return f'add: {r1["stdout"]}\ncommit: {r2["stdout"]}'


def build_system_prompt() -> str:
    return '''You are an autonomous coding agent working on the Barterkin project.

Your job: read the handoff file, pick the highest priority task, implement it, test it, and commit it.

You have access to these tools:
- read_file(path) — read a file's contents
- write_file(path, content) — write content to a file
- run_cmd(command_list) — run a shell command and see output
- git_commit(message) — stage all changes and commit

Rules:
1. Only modify files inside the project root.
2. Run "pnpm build" after making changes. If it fails, fix the errors.
3. Run tests if available (pnpm test, pnpm e2e).
4. Use clean conventional commit messages (feat:, fix:, refactor:).
5. Never commit .env files or secrets.
6. Be conservative. If unsure, leave a note and move on.
7. STOP after one task is complete. Do not start another.

Respond with a JSON object containing:
- "thought": your reasoning
- "action": one of ["read_file", "write_file", "run_cmd", "git_commit", "done"]
- "params": parameters for the action
- "note": any notes for the handoff file (optional)
'''


def execute_action(action: str, params: dict) -> str:
    if action == 'read_file':
        return read_file(params.get('path', ''))
    elif action == 'write_file':
        return write_file(params.get('path', ''), params.get('content', ''))
    elif action == 'run_cmd':
        cmd = params.get('command', [])
        if isinstance(cmd, str):
            cmd = cmd.split()
        result = run_cmd(cmd, timeout=params.get('timeout', 60))
        return json.dumps(result)
    elif action == 'git_commit':
        return git_commit(params.get('message', 'autonomous commit'))
    elif action == 'done':
        return 'Task complete.'
    else:
        return f'Unknown action: {action}'


def main():
    if not HANDOFF.exists():
        print('ERROR: .continue-here.md not found')
        sys.exit(1)

    handoff_content = HANDOFF.read_text()

    messages = [
        {'role': 'system', 'content': build_system_prompt()},
        {'role': 'user', 'content': f'Here is the current handoff file:\n\n{handoff_content}\n\nPick the highest priority task and start working. Respond with JSON only.'},
    ]

    max_iterations = 30
    for i in range(max_iterations):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                response_format={'type': 'json_object'},
                max_tokens=4096,
                temperature=0.2,
            )
            content = response.choices[0].message.content
            print(f'\n--- Iteration {i+1} ---')
            print(f'Raw response: {content[:500]}...')

            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                print(f'Failed to parse JSON: {content[:200]}')
                messages.append({'role': 'assistant', 'content': content})
                messages.append({'role': 'user', 'content': 'Please respond with valid JSON only.'})
                continue

            action = parsed.get('action', 'done')
            params = parsed.get('params', {})
            thought = parsed.get('thought', '')
            note = parsed.get('note', '')

            print(f'Action: {action}')
            print(f'Thought: {thought[:200]}')

            if action == 'done':
                print('Agent reports task complete.')
                if note:
                    print(f'Note: {note}')
                break

            result = execute_action(action, params)
            print(f'Result: {result[:300]}')

            messages.append({'role': 'assistant', 'content': content})
            messages.append({'role': 'user', 'content': f'Action result: {result}'})

        except Exception as e:
            print(f'Error: {e}')
            break

    print('\nAgent loop finished.')


if __name__ == '__main__':
    main()
