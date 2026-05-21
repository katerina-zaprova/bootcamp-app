# Changelog

## [1.0.0]

### New Features

- Added a Test Cases page where users can create, edit, and delete individual test cases with title, preconditions, numbered steps, expected result, severity, and status fields.
- Added a Test Suites page where users can create, edit, and delete named suites grouped by feature area, each with its own status.
- Added a Test Suite detail page where users can view the cases assigned to a suite, add cases from the full library, remove cases, and reorder them by dragging and dropping.
- Added search by title and filter by status on the Test Cases list.
- Added filter by status on the Test Suites list.
- Added sortable columns (title, severity, last updated) on the Test Cases list with ascending and descending toggle.
- Added pagination to the Test Cases list, showing 20 cases per page with previous and next controls.
- Added color-coded severity badges (Critical, Major, Minor, Trivial) and status badges across the test case views.
- Added a REST API for test cases supporting list with pagination, filtering, and sorting; get by ID; create; update; and delete.
- Added a REST API for test suites supporting list with optional status filter; get by ID with all assigned cases in order; create; update; delete; and a dedicated endpoint to replace and reorder the cases in a suite.
- Added `/new-test` slash command — interactive prompt that collects test case fields one at a time and formats a complete test case ready to log.
- Added `/bug-report` slash command — guided interview that captures all bug report fields and outputs a structured, ready-to-file report.
- Added `/test-summary` slash command — collects session context and produces a concise test execution summary.
- Added `test-generator` skill — generates full test case suites from a feature description using boundary-value analysis and equivalence partitioning.
- Added `qa-review` skill — reviews a feature or change for defects, edge cases, and risk areas from a tester's perspective.
- Added `bug-report-writer` skill — converts an informal bug description into a structured bug report matching the project's field schema.
- Added `test-writer` subagent — autonomous agent that drafts test cases for a given scope without requiring step-by-step prompting.
- Added `qa-reviewer` subagent — autonomous agent that performs a full QA review pass and returns ranked findings.
- Added `release-notes-writer` subagent — autonomous agent that reads the codebase and compiles versioned release notes.

### Improvements

- TestCaseModal inline validation enforces that title, at least one non-blank step, and expected result are all present before submission, surfacing a field-level error message rather than failing silently.
- TestCaseModal manages steps as an ordered list with per-step add and remove controls; blank steps are stripped on save so stored data stays clean.
- TestCaseModal submit button switches to "Saving…" and disables while the request is in flight, preventing duplicate submissions.
- SeverityBadge falls back to the Trivial color scheme for unknown or missing severity values instead of throwing, keeping the UI stable if data is unexpected.
