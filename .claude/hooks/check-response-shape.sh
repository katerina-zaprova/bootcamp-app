#!/usr/bin/env bash
# PostToolUse hook — warns when a server/routes/ file has a res.json() call
# that appears to be missing the {success, data, error} envelope from CLAUDE.md.
# Exits 0 always; never blocks the tool use.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    pass
" 2>/dev/null || true)

# Only act on server/routes/*.js files
[[ "$FILE_PATH" == */server/routes/*.js ]] || exit 0
[[ -f "$FILE_PATH" ]] || exit 0

VIOLATIONS=$(python3 - "$FILE_PATH" <<'PY'
import sys, re

path = sys.argv[1]
with open(path) as f:
    lines = f.readlines()

REQUIRED = ('success', 'data', 'error')
bad = []

for i, line in enumerate(lines, 1):
    stripped = line.strip()
    # Match any res[.status(...)].json( call
    if re.search(r'\bres(?:\.\w+(?:\([^)]*\))?)*\.json\s*\(', stripped):
        # Skip comment lines
        if stripped.startswith('//') or stripped.startswith('*'):
            continue
        if not all(k in stripped for k in REQUIRED):
            bad.append(f"  line {i}: {stripped[:120]}")

for b in bad:
    print(b)
PY
)

if [[ -n "$VIOLATIONS" ]]; then
  printf '\n\033[33m⚠  Response shape warning:\033[0m %s\n' "$FILE_PATH" >&2
  printf '   The following res.json() calls may be missing {success, data, error}:\n' >&2
  printf '%s\n' "$VIOLATIONS" >&2
  printf '   Expected shape: { success: bool, data: <any>, error: string|null }\n\n' >&2
fi

exit 0
