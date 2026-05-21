Collect the following information interactively, one question at a time:

1. **Title**: Ask "What does this test cover? (plain language title)"
2. **Preconditions**: Ask "Any preconditions before the test starts? (Press Enter to skip)"
3. **Steps**: Ask "What steps does the tester perform? (List them one per line, or separated by commas)"
4. **Expected result**: Ask "What is the expected result?"
5. **Severity**: Ask "What is the severity? (Critical / Major / Minor / Trivial)"
6. **Status**: Ask "What is the status? (draft / ready / passed / failed / skipped)"

Use these severity definitions:
- **Critical** — the feature is completely broken or causes data loss
- **Major** — the feature fails but a workaround exists
- **Minor** — behaviour is wrong or unexpected but impact is low
- **Trivial** — cosmetic or negligible issue with no functional impact

Then generate a filename by converting the title to lowercase, replacing spaces with hyphens, and appending `.md` (e.g. `user-login.md`).

Create the file at `tests/manual/<filename>` with this exact format:

```
# <Title>

## Preconditions
<preconditions, or omit this section entirely if skipped>

## Steps
1. <step 1>
2. <step 2>
...

## Expected Result
<expected result>

## Severity
<severity>

## Status
<status>
```

Omit the Preconditions section entirely if the user skipped it.

After writing the file, display its full contents and confirm the path where it was saved.
