Collect the following information interactively, one question at a time:

1. **Tested**: Ask "What did you test today?"
2. **Result**: Ask "What was the overall result? (Pass / Fail / Blocked)"
3. **Notes**: Ask "Any additional notes? (Press Enter to skip)"

Then:
- Get the current date in YYYY-MM-DD format.
- Use the filename: `tests/summaries/YYYY-MM-DD.md`

Create the file with this exact format:

```
# Test Summary: YYYY-MM-DD

**Date:** YYYY-MM-DD  
**Overall Result:** <result>

## What Was Tested
<tested>

## Notes
<notes, or "None" if skipped>
```

After writing the file, display its full contents and confirm the path where it was saved.
