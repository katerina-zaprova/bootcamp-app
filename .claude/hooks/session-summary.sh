#!/usr/bin/env bash
# Stop hook — prints a session summary when Claude Code ends the session.
# Exits 0 always.

set -euo pipefail

INPUT=$(cat)

TMPPY=$(mktemp /tmp/session-summary-XXXX.py)
trap 'rm -f "$TMPPY"' EXIT

cat > "$TMPPY" << 'PY'
import sys, json, os, glob
from datetime import datetime

try:
    data = json.loads(sys.argv[1])
except Exception:
    data = {}

session_id     = data.get('session_id', '')
transcript_path = data.get('transcript_path', '')

# Locate the transcript if not provided directly
if not transcript_path:
    candidates = []
    if session_id:
        candidates = glob.glob(
            os.path.expanduser('~/.claude/projects/*/' + session_id + '.jsonl')
        )
    if not candidates:
        # Fall back to the most recently modified transcript in any project dir
        candidates = glob.glob(
            os.path.expanduser('~/.claude/projects/*/*.jsonl')
        )
    if candidates:
        transcript_path = max(candidates, key=os.path.getmtime)

# Extract Write / Edit file paths from the transcript
files = []
seen  = set()

if transcript_path and os.path.isfile(transcript_path):
    with open(transcript_path, errors='replace') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except Exception:
                continue
            if entry.get('type') != 'assistant':
                continue
            content = entry.get('message', {}).get('content', [])
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict):
                    continue
                if block.get('type') == 'tool_use' and block.get('name') in ('Write', 'Edit'):
                    fp = block.get('input', {}).get('file_path', '')
                    if fp and fp not in seen:
                        seen.add(fp)
                        files.append(fp)

now = datetime.now().strftime('%Y-%m-%d  %H:%M:%S')

print('')
print('  ─────────────────────────────────────────')
print('  Session complete  |  ' + now)
print('  ─────────────────────────────────────────')
if files:
    print('  Files written or edited this session:')
    for f in files:
        print('    ' + f)
else:
    print('  No files written or edited this session.')
print('  ─────────────────────────────────────────')
print('')
PY

python3 "$TMPPY" "$INPUT"
