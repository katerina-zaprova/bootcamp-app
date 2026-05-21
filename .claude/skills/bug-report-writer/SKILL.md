---
name: bug-report-writer
description: Use this skill when the user wants to write up a bug, log an issue, or turn an informal description into a structured bug report. Triggers on phrases like "write up this bug", "log this issue", "create a bug report for", "found a bug where", "can you write a bug report", "file a bug".
---

Turn the user's informal description into a structured bug report. Infer missing details where reasonable — do not ask clarifying questions unless the description contains no actionable information at all.

## Rules

**Title**
- One short sentence describing what is broken.
- Under 12 words.
- If the issue could be environment-specific, append the browser and OS (e.g. `— Chrome 124 / macOS`).
- Do not start with "Bug:" or "Issue:".

**Steps to Reproduce**
- Numbered list.
- Each step is a single direct action: what to open, what to enter, what to click.
- Strip out anything that is not a user action (observations, expected outcomes).
- Minimal — remove steps that are not needed to reproduce the issue.
- Exact — if the user mentioned specific values, keep them.

**Expected result**
- One sentence. What should have happened.
- Active voice.

**Actual result**
- One sentence. What did happen instead.
- Active voice.

**Severity**
Assign using these definitions:
- **Critical** — the feature is completely broken or causes data loss
- **Major** — the feature fails but a workaround exists
- **Minor** — behaviour is wrong or unexpected but impact is low
- **Trivial** — cosmetic or negligible issue with no functional impact

**Status**
Always `open`.

## Output format

Output only the bug report — no preamble, no explanation, no closing comment.

**Title:** <title>

**Steps to Reproduce:**
1. <step>
2. <step>
...

**Expected:** <expected result>

**Actual:** <actual result>

**Severity:** <Critical / Major / Minor / Trivial>

**Status:** open
