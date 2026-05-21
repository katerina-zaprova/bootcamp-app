# Test Suites — Manual Test Cases

---
**Title:** Create a suite with all valid inputs

**Steps:**
1. Navigate to the Test Suites page.
2. Click "+ New suite".
3. Enter "Login Regression" in the Name field.
4. Enter "login" in the Feature field.
5. Leave Status as "draft" (the default).
6. Click "Create".

**Expected result:** The modal closes, the browser navigates to the new suite's detail page, and the suite is listed with name "Login Regression", feature "login", status "draft", and 0 cases.

**Severity:** Critical

**Status:** draft

---
**Title:** Create suite with status set to each valid value

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter "Suite Alpha" in the Name field.
2. Enter "checkout" in the Feature field.
3. Select "ready" from the Status dropdown.
4. Click "Create".
5. Repeat steps 1–4 for each remaining status value: "in-progress", "passed", "failed".

**Expected result:** Each suite is created successfully and its detail page shows the status that was selected at creation time.

**Severity:** Major

**Status:** draft

---
**Title:** List page shows all suites unfiltered

**Preconditions:** At least two test suites with different statuses exist.

**Steps:**
1. Navigate to the Test Suites page.
2. Confirm the Status filter dropdown shows "All statuses".

**Expected result:** All existing suites appear in the table, ordered by most recently updated first. The count in the heading matches the number of rows.

**Severity:** Major

**Status:** draft

---
**Title:** Filter suites by a specific status

**Preconditions:** At least one suite with status "ready" and one with status "draft" exist.

**Steps:**
1. Navigate to the Test Suites page.
2. Select "ready" from the Status dropdown.

**Expected result:** Only suites with status "ready" appear in the table. Suites with any other status are not shown.

**Severity:** Major

**Status:** draft

---
**Title:** Open suite detail page from the list

**Preconditions:** At least one test suite exists.

**Steps:**
1. Navigate to the Test Suites page.
2. Click any row in the suite list.

**Expected result:** The browser navigates to that suite's detail page, showing the suite name, feature, status, and case count.

**Severity:** Critical

**Status:** draft

---
**Title:** Edit a suite name and feature

**Preconditions:** A test suite exists.

**Steps:**
1. Navigate to the suite's detail page.
2. Click "Edit suite".
3. Change the Name field to "Updated Suite Name".
4. Change the Feature field to "updated-feature".
5. Click "Save changes".

**Expected result:** The modal closes, the detail page header reflects the updated name and feature without a full page reload.

**Severity:** Major

**Status:** draft

---
**Title:** Edit a suite status to every valid value

**Preconditions:** A test suite exists with status "draft".

**Steps:**
1. Navigate to the suite's detail page.
2. Click "Edit suite".
3. Change Status to "in-progress".
4. Click "Save changes".
5. Reopen "Edit suite" and change Status to each remaining value ("ready", "passed", "failed") in turn, saving after each change.

**Expected result:** After each save the suite status displayed on the detail page matches the value that was selected.

**Severity:** Major

**Status:** draft

---
**Title:** Add a test case to a suite

**Preconditions:** A suite exists with 0 cases. At least one test case exists in the system.

**Steps:**
1. Navigate to the suite's detail page.
2. Click "+ Add cases".
3. Locate a test case in the available cases panel.
4. Click "Add" next to that test case.

**Expected result:** The test case appears in the suite's case table with position 1. The case count in the suite header increments to 1. The case is no longer listed in the available cases panel.

**Severity:** Critical

**Status:** draft

---
**Title:** Remove a test case from a suite

**Preconditions:** A suite exists with at least one test case linked to it.

**Steps:**
1. Navigate to the suite's detail page.
2. Click "×" next to a test case in the case table.

**Expected result:** The test case is removed from the suite table immediately. The case count decrements by 1. The removed case reappears in the available cases panel when "+ Add cases" is open.

**Severity:** Critical

**Status:** draft

---
**Title:** Reorder cases by drag and drop

**Preconditions:** A suite exists with at least two test cases linked in a known order.

**Steps:**
1. Navigate to the suite's detail page.
2. Drag the row handle (⠿) of the first case and drop it below the second case.

**Expected result:** The two cases swap positions immediately. After the page is refreshed, the new order is preserved.

**Severity:** Major

**Status:** draft

---
**Title:** Delete a suite from the list page

**Preconditions:** At least one test suite exists.

**Steps:**
1. Navigate to the Test Suites page.
2. Click the delete (🗑️) icon on a suite row.
3. Click "OK" in the confirmation dialog.

**Expected result:** The suite is removed from the list. It cannot be retrieved by navigating directly to its former URL.

**Severity:** Critical

**Status:** draft

---
**Title:** Cancel suite deletion from the list page

**Preconditions:** At least one test suite exists.

**Steps:**
1. Navigate to the Test Suites page.
2. Click the delete (🗑️) icon on a suite row.
3. Click "Cancel" in the confirmation dialog.

**Expected result:** The suite remains in the list unchanged.

**Severity:** Minor

**Status:** draft

---
**Title:** Navigate back to suite list from detail page

**Preconditions:** A test suite exists and its detail page is open.

**Steps:**
1. Click "← Test Suites" at the top of the detail page.

**Expected result:** The browser navigates to the Test Suites list page without errors.

**Severity:** Minor

**Status:** draft

---
**Title:** Create suite — name field empty

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Leave the Name field empty.
2. Enter "login" in the Feature field.
3. Click "Create".

**Expected result:** The modal stays open and displays an error message stating that name and feature are required. No suite is created.

**Severity:** Critical

**Status:** draft

---
**Title:** Create suite — feature field empty

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter "My Suite" in the Name field.
2. Leave the Feature field empty.
3. Click "Create".

**Expected result:** The modal stays open and displays an error message stating that name and feature are required. No suite is created.

**Severity:** Critical

**Status:** draft

---
**Title:** Create suite — both required fields empty

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Leave both Name and Feature fields empty.
2. Click "Create".

**Expected result:** The modal stays open and displays an error message stating that name and feature are required. No suite is created.

**Severity:** Critical

**Status:** draft

---
**Title:** Create suite — name is whitespace only

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter three spaces in the Name field.
2. Enter "login" in the Feature field.
3. Click "Create".

**Expected result:** The modal stays open and displays a validation error. No suite is created.

**Severity:** Major

**Status:** draft

---
**Title:** Create suite — feature is whitespace only

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter "My Suite" in the Name field.
2. Enter three spaces in the Feature field.
3. Click "Create".

**Expected result:** The modal stays open and displays a validation error. No suite is created.

**Severity:** Major

**Status:** draft

---
**Title:** Create suite — name at 1 character (minimum valid length)

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter a single character "A" in the Name field.
2. Enter "login" in the Feature field.
3. Click "Create".

**Expected result:** The suite is created successfully and the detail page displays the name "A".

**Severity:** Minor

**Status:** draft

---
**Title:** Create suite — name is a very long string

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Paste a 500-character string into the Name field.
2. Enter "login" in the Feature field.
3. Click "Create".

**Expected result:** Either the suite is created and the full name is stored and displayed without truncation, or a clear validation error is shown if a length limit exists. The application does not crash or produce a 500 error.

**Severity:** Major

**Status:** draft

---
**Title:** Create suite — feature is a very long string

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter "My Suite" in the Name field.
2. Paste a 500-character string into the Feature field.
3. Click "Create".

**Expected result:** Either the suite is created and the full feature value is stored and displayed, or a clear validation error is shown. The application does not crash or produce a 500 error.

**Severity:** Major

**Status:** draft

---
**Title:** Create two suites with the same name

**Preconditions:** A suite named "Duplicate Suite" exists.

**Steps:**
1. Click "+ New suite".
2. Enter "Duplicate Suite" in the Name field.
3. Enter "login" in the Feature field.
4. Click "Create".

**Expected result:** A second suite named "Duplicate Suite" is created and both appear in the list (names are not required to be unique), OR a clear error message is displayed if duplicate names are rejected by the system.

**Severity:** Minor

**Status:** draft

---
**Title:** Update suite with empty name via direct API call

**Preconditions:** A test suite exists. Its ID is known.

**Steps:**
1. Send a PUT request to `/api/test-suites/{id}` with body `{"name": "", "feature": "login"}`.

**Expected result:** The server returns HTTP 400 with `success: false` and an error message. The suite is not updated.

**Severity:** Critical

**Status:** draft

---
**Title:** Create suite with invalid status via direct API call

**Preconditions:** None.

**Steps:**
1. Send a POST request to `/api/test-suites` with body `{"name": "Suite", "feature": "login", "status": "active"}`.

**Expected result:** The server returns HTTP 400 with `success: false` and an error message listing the valid status values.

**Severity:** Major

**Status:** draft

---
**Title:** Update suite status to invalid value via direct API call

**Preconditions:** A test suite exists. Its ID is known.

**Steps:**
1. Send a PUT request to `/api/test-suites/{id}` with body `{"status": "unknown-status"}`.

**Expected result:** The server returns HTTP 400 with `success: false` and an error message listing the valid status values. The suite's existing status is unchanged.

**Severity:** Major

**Status:** draft

---
**Title:** Fetch a suite with a non-existent ID

**Preconditions:** None.

**Steps:**
1. Navigate to `/test-suites/999999` in the browser.

**Expected result:** The detail page displays "Suite not found." with a link back to the Test Suites list. No unhandled error or blank page is shown.

**Severity:** Major

**Status:** draft

---
**Title:** Delete a suite with a non-existent ID via direct API call

**Preconditions:** None.

**Steps:**
1. Send a DELETE request to `/api/test-suites/999999`.

**Expected result:** The server returns HTTP 404 with `success: false` and the error message "Test suite not found."

**Severity:** Minor

**Status:** draft

---
**Title:** Update suite cases with a non-existent test case ID

**Preconditions:** A test suite exists. Its ID is known.

**Steps:**
1. Send a PUT request to `/api/test-suites/{id}/cases` with body `{"cases": [999999]}`.

**Expected result:** The server returns HTTP 400 with `success: false` and an error stating that the test case was not found. The suite's existing case list is not modified.

**Severity:** Major

**Status:** draft

---
**Title:** Update suite cases with a non-array body

**Preconditions:** A test suite exists. Its ID is known.

**Steps:**
1. Send a PUT request to `/api/test-suites/{id}/cases` with body `{"cases": "not-an-array"}`.

**Expected result:** The server returns HTTP 400 with `success: false` and an error message stating that cases must be an array of test case IDs.

**Severity:** Major

**Status:** draft

---
**Title:** Filter suites with an invalid status value via direct API call

**Preconditions:** None.

**Steps:**
1. Send a GET request to `/api/test-suites?status=bogus`.

**Expected result:** The server returns HTTP 200 with `success: true` and an empty data array (no suites match the invalid status), or returns HTTP 400 with a validation error. The server does not crash.

**Severity:** Minor

**Status:** draft

---
**Title:** Suite list shows empty state when no suites exist

**Preconditions:** No test suites exist in the system.

**Steps:**
1. Navigate to the Test Suites page.

**Expected result:** The table is not rendered. A message "No test suites found." is displayed. The heading shows a count of 0.

**Severity:** Minor

**Status:** draft

---
**Title:** Available cases panel shows empty state when all cases are linked

**Preconditions:** A suite exists. All test cases in the system are already linked to this suite.

**Steps:**
1. Navigate to the suite's detail page.
2. Click "+ Add cases".

**Expected result:** The available cases panel displays "All test cases are already in this suite." and no rows are shown.

**Severity:** Minor

**Status:** draft

---
**Title:** Close "New suite" modal without saving

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Enter text in the Name and Feature fields.
2. Click "Cancel".

**Expected result:** The modal closes. No new suite is created. The Test Suites list is unchanged.

**Severity:** Minor

**Status:** draft

---
**Title:** Close "New suite" modal by clicking the overlay

**Preconditions:** The "+ New suite" modal is open.

**Steps:**
1. Click anywhere on the dark overlay outside the modal dialog.

**Expected result:** The modal closes. No new suite is created.

**Severity:** Trivial

**Status:** draft
