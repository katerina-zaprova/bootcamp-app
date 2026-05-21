#!/usr/bin/env bash
# PostToolUse hook — warns when a JS/TS/JSX/TSX file contains a severity
# word that doesn't belong to the project enum (Critical/Major/Minor/Trivial).
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

# Only check JS / TS / JSX / TSX files
case "$FILE_PATH" in
  *.js|*.jsx|*.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[[ -f "$FILE_PATH" ]] || exit 0

# Write the checker to a temp file so the heredoc is not inside $()
# which avoids bash quote-tracking bugs with complex Python content.
TMPPY=$(mktemp /tmp/sev-check-XXXX.py)
trap 'rm -f "$TMPPY"' EXIT

cat > "$TMPPY" << 'PY'
import sys, re

path = sys.argv[1]
with open(path) as f:
    lines = f.readlines()

# Build the character class using chr() to avoid quote chars in the literal.
q = chr(34) + chr(39)
WRONG = re.compile(r'([' + q + r'])(high|medium|low|blocker|cosmetic)\1', re.IGNORECASE)

bad = []
for i, line in enumerate(lines, 1):
    s = line.strip()
    if s.startswith('//') or s.startswith('*'):
        continue
    m = WRONG.search(s)
    if m:
        bad.append('  line %d: %s  (found: %s)' % (i, s[:120], m.group()))

for b in bad:
    print(b)
PY

VIOLATIONS=$(python3 "$TMPPY" "$FILE_PATH" 2>/dev/null || true)

if [[ -n "$VIOLATIONS" ]]; then
  printf '\n\033[33m⚠  Severity enum warning:\033[0m %s\n' "$FILE_PATH" >&2
  printf '   Non-standard severity word(s) found. Valid values: Critical | Major | Minor | Trivial\n' >&2
  printf '%s\n' "$VIOLATIONS" >&2
  printf '\n' >&2
fi

exit 0
