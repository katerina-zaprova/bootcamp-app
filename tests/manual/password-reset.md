# Password Reset

---
**Title:** Successful password reset with valid email

**Preconditions:** A registered account exists for the email address used.

**Steps:**
1. Navigate to the login page
2. Click "Forgot password"
3. Enter the registered email address
4. Click Send Reset Link
5. Open the password reset email
6. Click the reset link
7. Enter a new valid password
8. Confirm the new password
9. Submit the form

**Expected result:** The password is updated and the user is redirected to the login page with a success message.

**Severity:** Critical

**Status:** draft

---
**Title:** Reset request with unregistered email

**Steps:**
1. Navigate to the login page
2. Click "Forgot password"
3. Enter an email address that has no account
4. Click Send Reset Link

**Expected result:** The form shows a neutral confirmation message (e.g. "If that address is registered, you will receive an email") without revealing whether the account exists.

**Severity:** Major

**Status:** draft

---
**Title:** Reset request with empty email field

**Steps:**
1. Navigate to the login page
2. Click "Forgot password"
3. Leave the email field empty
4. Click Send Reset Link

**Expected result:** Submission is blocked and an error indicates the email field is required.

**Severity:** Critical

**Status:** draft

---
**Title:** Reset request with whitespace-only email

**Steps:**
1. Navigate to the login page
2. Click "Forgot password"
3. Enter spaces only in the email field
4. Click Send Reset Link

**Expected result:** Submission is blocked and an error indicates the email is invalid.

**Severity:** Major

**Status:** draft

---
**Title:** Reset request with invalid email format

**Steps:**
1. Navigate to the login page
2. Click "Forgot password"
3. Enter a string without a valid email format (e.g. "notanemail")
4. Click Send Reset Link

**Expected result:** Submission is blocked and an error indicates the email format is invalid.

**Severity:** Major

**Status:** draft

---
**Title:** Reset request with very long email address

**Steps:**
1. Navigate to the login page
2. Click "Forgot password"
3. Enter an email address 300 characters long with a valid format
4. Click Send Reset Link

**Expected result:** Submission is blocked and an error indicates the email is too long, or the field does not accept input beyond the maximum length.

**Severity:** Minor

**Status:** draft

---
**Title:** New password at minimum valid length

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Enter a new password exactly 8 characters long
3. Enter the same value in the confirm password field
4. Submit the form

**Expected result:** The password is accepted and updated successfully.

**Severity:** Major

**Status:** draft

---
**Title:** New password one character below minimum length

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Enter a new password exactly 7 characters long
3. Enter the same value in the confirm password field
4. Submit the form

**Expected result:** Submission is blocked and an error states the password is too short.

**Severity:** Major

**Status:** draft

---
**Title:** New password at maximum valid length

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Enter a new password exactly 128 characters long
3. Enter the same value in the confirm password field
4. Submit the form

**Expected result:** The password is accepted and updated successfully.

**Severity:** Major

**Status:** draft

---
**Title:** New password exceeds maximum length

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Enter a new password 129 characters long
3. Enter the same value in the confirm password field
4. Submit the form

**Expected result:** Submission is blocked and an error states the password is too long.

**Severity:** Minor

**Status:** draft

---
**Title:** Confirm password does not match new password

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Enter a valid new password
3. Enter a different value in the confirm password field
4. Submit the form

**Expected result:** Submission is blocked and an error states the passwords do not match.

**Severity:** Critical

**Status:** draft

---
**Title:** New password is whitespace only

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Enter spaces only in the new password field
3. Enter the same spaces in the confirm password field
4. Submit the form

**Expected result:** Submission is blocked and an error indicates the password is invalid.

**Severity:** Major

**Status:** draft

---
**Title:** Reset link used a second time after first use

**Preconditions:** A password reset link has already been used once to change the password.

**Steps:**
1. Open the same reset link again
2. Enter a new password
3. Submit the form

**Expected result:** The link is rejected with an error stating it has already been used or has expired.

**Severity:** Critical

**Status:** draft

---
**Title:** Reset link accessed after expiry window

**Preconditions:** A password reset link was generated more than 24 hours ago and has not been used.

**Steps:**
1. Open the expired reset link
2. Enter a new password
3. Submit the form

**Expected result:** The link is rejected with an error stating it has expired, and the user is prompted to request a new one.

**Severity:** Critical

**Status:** draft

---
**Title:** Reset form submitted with all fields empty

**Preconditions:** A valid password reset link has been received and opened.

**Steps:**
1. Open the password reset link
2. Leave all fields empty
3. Submit the form

**Expected result:** Submission is blocked and errors are shown for each required field.

**Severity:** Critical

**Status:** draft

---
**Title:** Reset link accessed by a different logged-in user

**Preconditions:** User A requested a reset link. User B is logged into a different account in the same browser.

**Steps:**
1. Open User A's reset link while logged in as User B
2. Complete the reset form with a new password
3. Submit the form

**Expected result:** The reset applies only to User A's account. User B's session and password are unaffected.

**Severity:** Critical

**Status:** draft
