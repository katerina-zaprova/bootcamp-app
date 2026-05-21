Collect the following information interactively, one question at a time:

1. **Title**: Ask "What is the bug? (short description of what is broken — if environment-specific, include browser and OS, e.g. 'Login button unresponsive — Chrome 124 / macOS')"
2. **Steps to reproduce**: Ask "What are the steps to reproduce? (numbered, minimal, exact — one per line or separated by commas)"
3. **Expected**: Ask "What should have happened?"
4. **Actual**: Ask "What did happen?"
5. **Severity**: Ask "What is the severity? (Critical / Major / Minor / Trivial)"
6. **Status**: Ask "What is the status? (open / in-progress / resolved / closed / reopened)"

Use these severity definitions:
- **Critical** — the feature is completely broken or causes data loss
- **Major** — the feature fails but a workaround exists
- **Minor** — behaviour is wrong or unexpected but impact is low
- **Trivial** — cosmetic or negligible issue with no functional impact

Then:
- Get the current date in YYYY-MM-DD format.
- Generate a short slug from the title (lowercase, spaces → hyphens).
- Use the filename pattern: `tests/bugs/YYYY-MM-DD-<title-slug>.md`

Create the file with this exact format:

```
# <Title>

**Date:** YYYY-MM-DD
**Severity:** <severity>
**Status:** <status>

## Steps to Reproduce
1. <step 1>
2. <step 2>
...

## Expected
<expected>

## Actual
<actual>

## Timestamp
YYYY-MM-DDT00:00:00
```

For the Timestamp field use ISO 8601 format with the current date and the real current time if available, otherwise use 00:00:00.

After writing the file, display its full contents and confirm the path where it was saved.
