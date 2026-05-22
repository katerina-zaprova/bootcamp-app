#!/usr/bin/env bash
# batch-review.sh — QA review each changed file headlessly and emit a GitHub PR comment.
#
# Usage:
#   scripts/batch-review.sh <file> [file ...]
#
# Example (from git diff):
#   git diff --name-only HEAD~1 | xargs scripts/batch-review.sh
#
# Output: Markdown formatted for a GitHub PR comment (stdout).
# Errors per-file are captured inline; the script never exits non-zero
# due to a single file failure so CI can still post partial results.

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $(basename "$0") <file> [file ...]" >&2
  echo "Example: $(basename "$0") server/routes/settings.js client/src/pages/Settings.jsx" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

REVIEWED_AT="$(date -u '+%Y-%m-%d %H:%M UTC')"

# ── PR comment header ──────────────────────────────────────────────────────────
cat <<HEADER
## QA Review

> **Tool:** \`scripts/batch-review.sh\` &nbsp;·&nbsp; **Generated:** ${REVIEWED_AT}
> **Files:** $#

HEADER

pass=0
fail=0
skip=0

for file in "$@"; do
  # Resolve to absolute path — accept both absolute and project-relative inputs
  if [[ "$file" = /* ]]; then
    abs_path="$file"
    rel_path="${file#"$PROJECT_ROOT/"}"
  else
    abs_path="$PROJECT_ROOT/$file"
    rel_path="$file"
  fi

  echo "<details>"
  echo "<summary><code>${rel_path}</code></summary>"
  echo ""

  if [[ ! -f "$abs_path" ]]; then
    echo "> **⚠ Skipped** — file not found: \`${rel_path}\`"
    echo ""
    echo "</details>"
    echo ""
    (( skip++ )) || true
    continue
  fi

  # Build the prompt — starts with /qa-review to invoke the skill, then
  # gives Claude explicit scope so reviews stay focused and comparable.
  read -r -d '' PROMPT <<PROMPT || true
/qa-review

Review the file \`${rel_path}\` from a QA perspective. Cover:
1. Potential bugs or logic errors (reference specific line numbers)
2. Missing input validation or error-handling gaps
3. Edge cases not currently handled
4. What test cases should exist to cover this code

Keep the review concrete and actionable. Skip praise — only flag issues and gaps.
PROMPT

  # Run claude headlessly.
  # --allowedTools: Read + Grep are enough for a file review; no writes needed.
  # --add-dir: ensure the project root is in scope regardless of CWD.
  # 2>&1: merge stderr so failures are visible inline rather than lost.
  review_output=$(
    cd "$PROJECT_ROOT" && \
    claude -p "$PROMPT" \
      --allowedTools "Read,Grep,Bash" \
      --add-dir "$PROJECT_ROOT" \
      2>&1
  ) && review_exit=0 || review_exit=$?

  if [[ $review_exit -eq 0 ]]; then
    echo "$review_output"
    (( pass++ )) || true
  else
    echo "> **❌ Review failed** (exit ${review_exit})"
    echo '```'
    echo "$review_output"
    echo '```'
    (( fail++ )) || true
  fi

  echo ""
  echo "</details>"
  echo ""
done

# ── Summary footer ─────────────────────────────────────────────────────────────
echo "---"
summary="${pass}/$# file(s) reviewed"
[[ $skip -gt 0 ]] && summary+=" · ${skip} skipped"
[[ $fail -gt 0 ]] && summary+=" · **${fail} failed**"
echo "_${summary}_"
