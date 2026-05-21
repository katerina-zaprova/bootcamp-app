---
name: test-generator
description: Use this skill when the user asks to generate test cases, write ISTQB tests, apply boundary-value analysis or equivalence partitioning, or create a test suite for a feature, field, or form. Triggers on phrases like "generate test cases", "write tests for", "ISTQB tests", "BVA", "equivalence classes", "test suite for".
---

Generate a complete set of test cases for the described feature or field using ISTQB techniques. Apply every technique below — do not skip any category unless it genuinely does not apply to the subject.

## Techniques to apply

**Boundary-value analysis (BVA)**
For every numeric or length-constrained input, produce cases for:
- Minimum valid value
- Maximum valid value
- One below minimum (min − 1)
- One above maximum (max + 1)
- Empty input (zero-length / null)
- Whitespace-only input
- Value at or near a system limit (very long string, very large number)

**Equivalence partitioning (EP)**
Identify valid and invalid partitions. Write at least one representative case per partition. Do not write multiple cases that test the same partition.

**Happy path**
One end-to-end case with all inputs valid and all preconditions met. This is the baseline passing case.

**Negative cases**
Cover at minimum:
- Wrong data type (e.g. text in a numeric field)
- Missing required field
- Duplicate submission (same unique value submitted twice)
- Unauthorised access (if the feature is access-controlled)

## Output format

Output each test case using exactly this structure, with no extra sections or metadata:

---
**Title:** [plain-language description of what is being tested]

**Preconditions:** [what must be true before the test runs — omit this line if none]

**Steps:**
1. [step]
2. [step]
...

**Expected result:** [what correct behaviour looks like]

**Severity:** [Critical / Major / Minor / Trivial]

**Status:** draft
---

## Severity rules

Assign severity using the definitions from CLAUDE.md:
- **Critical** — the feature is completely broken or causes data loss
- **Major** — the feature fails but a workaround exists
- **Minor** — behaviour is wrong or unexpected but impact is low
- **Trivial** — cosmetic or negligible issue with no functional impact

Boundary and negative cases that would corrupt data or block the user entirely are Critical or Major. Cases testing edge formatting or cosmetic feedback are Minor or Trivial.

## Style rules

- Titles are plain English, under 10 words, no buzzwords.
- Steps are direct imperative statements ("Enter", "Click", "Submit").
- Expected results state observable outcomes only — not internal behaviour.
- Status is always `draft` for generated cases.
- Do not add introductory or closing prose — output only the test cases.
