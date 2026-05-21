const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    preconditions TEXT,
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('Critical','Major','Minor','Trivial')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','passed','failed','skipped')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL CHECK(severity IN ('Critical','Major','Minor','Trivial')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in-progress','resolved','closed','reopened')),
    steps TEXT NOT NULL DEFAULT '[]',
    expected TEXT,
    actual TEXT,
    environment TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS test_suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    feature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','ready','in-progress','passed','failed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS suite_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(suite_id, test_case_id)
  )
`);

const { count } = db.prepare('SELECT COUNT(*) as count FROM test_cases').get();
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
    VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status)
  `);
  db.transaction(() => {
    insert.run({
      title: 'User login with valid credentials',
      preconditions: 'A registered user account exists.',
      steps: JSON.stringify(['Navigate to the login page', 'Enter a registered email and correct password', 'Click the Login button']),
      expected_result: 'The user is redirected to the dashboard and their session is active.',
      severity: 'Major',
      status: 'ready',
    });
    insert.run({
      title: 'Registration form submission',
      preconditions: null,
      steps: JSON.stringify(['Navigate to the registration page', 'Fill in all required fields', 'Click the Submit button']),
      expected_result: 'A new user account is created and the user is redirected to the dashboard.',
      severity: 'Critical',
      status: 'failed',
    });
    insert.run({
      title: 'Password reset email is sent',
      preconditions: 'A registered user account exists.',
      steps: JSON.stringify(['Navigate to the login page', 'Click "Forgot password"', 'Enter the registered email address', 'Click Send Reset Link']),
      expected_result: 'A password reset email is delivered to the provided address within 2 minutes.',
      severity: 'Major',
      status: 'draft',
    });
    insert.run({
      title: 'User profile update',
      preconditions: 'User is logged in.',
      steps: JSON.stringify(['Navigate to the profile page', 'Update the display name field', 'Click Save']),
      expected_result: 'The new display name is saved and shown on the profile page.',
      severity: 'Minor',
      status: 'passed',
    });
    insert.run({
      title: 'User logout',
      preconditions: 'User is logged in.',
      steps: JSON.stringify(['Click the user avatar or menu', 'Click Logout']),
      expected_result: 'The session is ended and the user is redirected to the login page.',
      severity: 'Trivial',
      status: 'ready',
    });
  })();
}

const { count: suiteCount } = db.prepare('SELECT COUNT(*) as count FROM test_suites').get();
if (suiteCount === 0) {
  const insertSuite = db.prepare(`INSERT INTO test_suites (name, feature, status) VALUES (@name, @feature, @status)`);
  const insertCase = db.prepare(`INSERT INTO suite_cases (suite_id, test_case_id, sort_order) VALUES (@suite_id, @test_case_id, @sort_order)`);
  db.transaction(() => {
    const s1 = insertSuite.run({ name: 'Login Flow', feature: 'login', status: 'ready' });
    [1, 3, 5].forEach((tcId, i) => insertCase.run({ suite_id: s1.lastInsertRowid, test_case_id: tcId, sort_order: i }));

    const s2 = insertSuite.run({ name: 'Registration Flow', feature: 'registration', status: 'draft' });
    [2, 4, 3].forEach((tcId, i) => insertCase.run({ suite_id: s2.lastInsertRowid, test_case_id: tcId, sort_order: i }));
  })();
}

const { count: bugCount } = db.prepare('SELECT COUNT(*) as count FROM bugs').get();
if (bugCount === 0) {
  const insertBug = db.prepare(`
    INSERT INTO bugs (title, description, severity, status, steps, expected, actual, environment)
    VALUES (@title, @description, @severity, @status, @steps, @expected, @actual, @environment)
  `);
  const insertActivity = db.prepare(`
    INSERT INTO bug_activity (bug_id, action, old_value, new_value, message) VALUES (@bug_id, @action, @old_value, @new_value, @message)
  `);

  db.transaction(() => {
    insertBug.run({
      title: 'Login button unresponsive — Chrome 124 / macOS',
      description: 'Clicking the login button on the login page does nothing. No network request is made and no error is shown.',
      severity: 'Critical',
      status: 'open',
      steps: JSON.stringify(['Navigate to the login page', 'Enter valid credentials', 'Click the Login button']),
      expected: 'The user is redirected to the dashboard.',
      actual: 'Nothing happens. The button registers the click but no action follows.',
      environment: 'Chrome 124 / macOS 14.4',
    });

    const b2 = insertBug.run({
      title: 'Registration form accepts whitespace-only username',
      description: 'Entering only spaces in the username field passes validation and creates an account with a blank display name.',
      severity: 'Major',
      status: 'in-progress',
      steps: JSON.stringify(['Navigate to the registration page', 'Enter spaces only in the username field', 'Fill in valid values for all other fields', 'Click Submit']),
      expected: 'Submission is blocked and an error states the username cannot be blank.',
      actual: 'The form submits and an account is created with a whitespace-only username.',
      environment: null,
    });
    insertActivity.run({ bug_id: b2.lastInsertRowid, action: 'status_change', old_value: 'open', new_value: 'in-progress', message: null });

    const b3 = insertBug.run({
      title: 'Sort order resets to default after navigating away and back',
      description: 'Changing the sort column on the test cases list then navigating away loses the selection when you return.',
      severity: 'Minor',
      status: 'resolved',
      steps: JSON.stringify(['Navigate to Test Cases', 'Click the Severity column header', 'Navigate to Test Suites', 'Navigate back to Test Cases']),
      expected: 'The sort order is preserved.',
      actual: 'Sort resets to updated_at descending.',
      environment: null,
    });
    insertActivity.run({ bug_id: b3.lastInsertRowid, action: 'status_change', old_value: 'open', new_value: 'in-progress', message: null });
    insertActivity.run({ bug_id: b3.lastInsertRowid, action: 'status_change', old_value: 'in-progress', new_value: 'resolved', message: null });
    insertActivity.run({ bug_id: b3.lastInsertRowid, action: 'comment', old_value: null, new_value: null, message: 'Sort state should be persisted in URL params so it survives navigation.' });
  })();
}

module.exports = db;
