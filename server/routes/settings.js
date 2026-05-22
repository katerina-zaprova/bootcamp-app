const express = require('express');
const router = express.Router();
const db = require('../db');

db.exec(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id   INTEGER PRIMARY KEY DEFAULT 1,
    theme                          TEXT    NOT NULL DEFAULT 'system'
                                   CHECK(theme IN ('light','dark','system')),
    default_severity_for_new_bugs  TEXT    NOT NULL DEFAULT 'Minor'
                                   CHECK(default_severity_for_new_bugs IN ('Critical','Major','Minor','Trivial')),
    default_page_size              INTEGER NOT NULL DEFAULT 20
                                   CHECK(default_page_size IN (10,20,50,100)),
    timezone                       TEXT    NOT NULL DEFAULT 'UTC',
    auto_generate_report_after_run INTEGER NOT NULL DEFAULT 1
  )
`);

// Ensure seed row exists
if (!db.prepare('SELECT user_id FROM user_preferences WHERE user_id = 1').get()) {
  const browserTz = 'UTC';
  db.prepare(
    'INSERT INTO user_preferences (user_id,theme,default_severity_for_new_bugs,default_page_size,timezone,auto_generate_report_after_run) VALUES (1,?,?,?,?,?)'
  ).run('system', 'Minor', 20, browserTz, 1);
}

function toDto(row) {
  return {
    theme:                         row.theme,
    default_severity_for_new_bugs: row.default_severity_for_new_bugs,
    default_page_size:             row.default_page_size,
    timezone:                      row.timezone,
    auto_generate_report_after_run: row.auto_generate_report_after_run === 1,
  };
}

router.get('/', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
    res.json({ success: true, data: toDto(row), error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

router.put('/', express.json(), (req, res) => {
  try {
    const current = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
    const b = req.body ?? {};

    const theme    = b.theme    ?? current.theme;
    const severity = b.default_severity_for_new_bugs ?? current.default_severity_for_new_bugs;
    const pageSize = b.default_page_size != null ? Number(b.default_page_size) : current.default_page_size;
    const timezone = b.timezone ?? current.timezone;
    const autoRpt  = b.auto_generate_report_after_run != null
      ? (b.auto_generate_report_after_run ? 1 : 0)
      : current.auto_generate_report_after_run;

    db.prepare(`
      UPDATE user_preferences
      SET theme=?, default_severity_for_new_bugs=?, default_page_size=?, timezone=?, auto_generate_report_after_run=?
      WHERE user_id = 1
    `).run(theme, severity, pageSize, timezone, autoRpt);

    const updated = db.prepare('SELECT * FROM user_preferences WHERE user_id = 1').get();
    res.json({ success: true, data: toDto(updated), error: null });
  } catch (err) {
    // SQLite CHECK constraint failures come back as SQLITE_CONSTRAINT
    const msg = err.message?.includes('CHECK constraint') ? 'Invalid value for one or more fields.' : err.message;
    res.status(400).json({ success: false, data: null, error: msg });
  }
});

module.exports = router;
