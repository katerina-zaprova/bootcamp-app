const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_STATUSES = ['draft', 'ready', 'in-progress', 'passed', 'failed'];

function parseCaseRow(row) {
  return { ...row, steps: JSON.parse(row.steps) };
}

function handleGetTestSuites(req, res) {
  const { status } = req.query;
  const conditions = [];
  const params = [];
  if (status) { conditions.push('ts.status = ?'); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT ts.*, COUNT(sc.id) as case_count
    FROM test_suites ts
    LEFT JOIN suite_cases sc ON sc.suite_id = ts.id
    ${where}
    GROUP BY ts.id
    ORDER BY ts.updated_at DESC
  `).all(...params);

  res.json({ success: true, data: rows, error: null });
}

function handleGetTestSuite(req, res) {
  const suite = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  if (!suite) return res.status(404).json({ success: false, data: null, error: 'Test suite not found.' });

  const cases = db.prepare(`
    SELECT tc.*, sc.sort_order
    FROM suite_cases sc
    JOIN test_cases tc ON tc.id = sc.test_case_id
    WHERE sc.suite_id = ?
    ORDER BY sc.sort_order ASC
  `).all(req.params.id).map(parseCaseRow);

  res.json({ success: true, data: { ...suite, cases }, error: null });
}

function handleCreateTestSuite(req, res) {
  const { name, feature, status = 'draft' } = req.body;

  if (!name?.trim() || !feature?.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'name and feature are required.' });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  const result = db.prepare(`
    INSERT INTO test_suites (name, feature, status) VALUES (?, ?, ?)
  `).run(name.trim(), feature.trim(), status);

  const created = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: { ...created, cases: [] }, error: null });
}

function handleUpdateTestSuite(req, res) {
  const existing = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Test suite not found.' });

  const { name, feature, status } = req.body;
  const newStatus = status ?? existing.status;

  if (!VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  db.prepare(`
    UPDATE test_suites SET name = ?, feature = ?, status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(name?.trim() ?? existing.name, feature?.trim() ?? existing.feature, newStatus, req.params.id);

  const updated = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated, error: null });
}

function handleDeleteTestSuite(req, res) {
  const existing = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Test suite not found.' });
  db.prepare('DELETE FROM test_suites WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: null, error: null });
}

function handleUpdateSuiteCases(req, res) {
  const existing = db.prepare('SELECT * FROM test_suites WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Test suite not found.' });

  const { cases } = req.body;
  if (!Array.isArray(cases)) {
    return res.status(400).json({ success: false, data: null, error: 'cases must be an array of test case IDs.' });
  }

  const checkStmt = db.prepare('SELECT id FROM test_cases WHERE id = ?');
  for (const tcId of cases) {
    if (!checkStmt.get(tcId)) {
      return res.status(400).json({ success: false, data: null, error: `Test case with id ${tcId} not found.` });
    }
  }

  try {
    db.transaction(() => {
      db.prepare('DELETE FROM suite_cases WHERE suite_id = ?').run(req.params.id);
      const insert = db.prepare('INSERT INTO suite_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)');
      cases.forEach((tcId, i) => insert.run(req.params.id, tcId, i));
      db.prepare("UPDATE test_suites SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    })();
  } catch {
    return res.status(500).json({ success: false, data: null, error: 'Failed to update suite cases.' });
  }

  const updatedCases = db.prepare(`
    SELECT tc.*, sc.sort_order
    FROM suite_cases sc
    JOIN test_cases tc ON tc.id = sc.test_case_id
    WHERE sc.suite_id = ?
    ORDER BY sc.sort_order ASC
  `).all(req.params.id).map(parseCaseRow);

  res.json({ success: true, data: updatedCases, error: null });
}

router.get('/', handleGetTestSuites);
router.post('/', handleCreateTestSuite);
router.get('/:id', handleGetTestSuite);
router.put('/:id', handleUpdateTestSuite);
router.delete('/:id', handleDeleteTestSuite);
router.put('/:id/cases', handleUpdateSuiteCases);

module.exports = router;
