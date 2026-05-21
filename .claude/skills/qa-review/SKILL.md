---
name: qa-review
description: Use this skill when the user asks for a QA review, wants to know what could break, asks to test a change or feature, or uses phrases like "QA review", "test my change", "what could go wrong", "what could break", "review this for bugs", "tester's eye", "qa this".
context: fork
---

Review the code or feature from a tester's perspective. Read the relevant files, then evaluate against each category below. Report only real findings — do not invent issues that are not evidenced by the code.

## What to check

**Validation**
- Inputs accepted without type, length, or format checks
- No rejection of empty, whitespace-only, or null values for required fields
- Server-side validation absent or inconsistent with client-side validation
- Boundary values not guarded (e.g. negative numbers, zero, very large values)

**Error handling**
- Missing try/catch around network calls or async operations
- Errors swallowed silently (caught but not surfaced to the user)
- Generic or missing error messages when an operation fails
- No handling of non-2xx HTTP responses on the client

**User-facing messages**
- Error messages that expose internal details (stack traces, SQL, file paths)
- Messages that are vague ("Something went wrong") when a specific cause is known
- Success or failure states with no feedback to the user
- Field-level validation errors shown at the wrong place or not at all

**Destructive actions**
- Delete, reset, or irreversible operations with no confirmation dialog
- Bulk actions that can affect many records without a warning
- No undo or recovery path after a destructive operation

**Accessibility**
- Form inputs missing associated labels
- Buttons or interactive elements with no accessible name (no text, no aria-label)
- Keyboard navigation broken or untested (click-only interactions)
- Color used as the only indicator of state (e.g. severity badges with no text)

**Consistency with CLAUDE.md**
- API responses not using the `{ success, data, error }` envelope
- Severity values that differ from Critical / Major / Minor / Trivial
- Status values that differ from the defined sets for test cases or bug reports

## Output format

Group all findings under severity headings. Use only the headings that have findings — omit empty sections. Under each heading, write one finding per bullet. Each bullet must state: what the issue is, where it is (file and line or component name), and what a tester would observe.

If no issues are found in a category, do not mention that category.

### Critical
- [issue] — [location] — [what the tester observes]

### Major
- [issue] — [location] — [what the tester observes]

### Minor
- [issue] — [location] — [what the tester observes]

### Trivial
- [issue] — [location] — [what the tester observes]

End with a one-sentence summary: total findings count and the highest severity present.
