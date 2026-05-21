const express = require('express');
const db = require('../db');

const router = express.Router();

const VALID_SEVERITIES = ['Critical', 'Major', 'Minor', 'Trivial'];
const VALID_STATUSES = ['draft', 'ready', 'passed', 'failed', 'skipped'];
const VALID_SORT_FIELDS = ['updated_at', 'created_at', 'title', 'severity', 'status'];

function parseRow(row) {
  return { ...row, steps: JSON.parse(row.steps) };
}

function handleGetTestCases(req, res) {
  const { page = 1, limit = 20, status, search, sortBy = 'updated_at', sortOrder = 'desc' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const sort = VALID_SORT_FIELDS.includes(sortBy) ? sortBy : 'updated_at';
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  if (search) { conditions.push('title LIKE ?'); params.push(`%${search}%`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderClause = sort === 'severity'
    ? `CASE severity WHEN 'Critical' THEN 1 WHEN 'Major' THEN 2 WHEN 'Minor' THEN 3 WHEN 'Trivial' THEN 4 END ${order}`
    : `${sort} ${order}`;

  const total = db.prepare(`SELECT COUNT(*) as count FROM test_cases ${where}`).get(...params).count;
  const rows = db.prepare(`SELECT * FROM test_cases ${where} ORDER BY ${orderClause} LIMIT ? OFFSET ?`)
    .all(...params, Number(limit), offset);

  res.json({
    success: true,
    data: {
      items: rows.map(parseRow),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
    error: null,
  });
}

function handleGetTestCase(req, res) {
  const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
  res.json({ success: true, data: parseRow(row), error: null });
}

function handleCreateTestCase(req, res) {
  const { title, preconditions, steps, expected_result, severity, status = 'draft' } = req.body;

  if (!title?.trim() || !steps?.length || !expected_result?.trim() || !severity) {
    return res.status(400).json({ success: false, data: null, error: 'title, steps, expected_result, and severity are required.' });
  }
  if (!VALID_SEVERITIES.includes(severity)) {
    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
  }
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  const result = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    preconditions?.trim() || null,
    JSON.stringify(Array.isArray(steps) ? steps.filter(s => s.trim()) : [steps]),
    expected_result.trim(),
    severity,
    status,
  );

  const created = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: parseRow(created), error: null });
}

function handleUpdateTestCase(req, res) {
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });

  const { title, preconditions, steps, expected_result, severity, status } = req.body;
  const newSeverity = severity ?? existing.severity;
  const newStatus = status ?? existing.status;

  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'title cannot be empty.' });
  }
  if (expected_result !== undefined && !expected_result.trim()) {
    return res.status(400).json({ success: false, data: null, error: 'expected_result cannot be empty.' });
  }
  if (steps !== undefined && (!Array.isArray(steps) || !steps.filter(s => s.trim()).length)) {
    return res.status(400).json({ success: false, data: null, error: 'steps cannot be empty.' });
  }
  if (!VALID_SEVERITIES.includes(newSeverity)) {
    return res.status(400).json({ success: false, data: null, error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}.` });
  }
  if (!VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  db.prepare(`
    UPDATE test_cases
    SET title = ?, preconditions = ?, steps = ?, expected_result = ?, severity = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title !== undefined ? title.trim() : existing.title,
    preconditions !== undefined ? (preconditions?.trim() || null) : existing.preconditions,
    steps ? JSON.stringify(Array.isArray(steps) ? steps.filter(s => s.trim()) : [steps]) : existing.steps,
    expected_result !== undefined ? expected_result.trim() : existing.expected_result,
    newSeverity,
    newStatus,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: parseRow(updated), error: null });
}

function handleDeleteTestCase(req, res) {
  const existing = db.prepare('SELECT * FROM test_cases WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, data: null, error: 'Test case not found.' });
  db.prepare('DELETE FROM test_cases WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: null, error: null });
}

router.get('/', handleGetTestCases);
router.get('/:id', handleGetTestCase);
router.post('/', handleCreateTestCase);
router.put('/:id', handleUpdateTestCase);
router.delete('/:id', handleDeleteTestCase);

module.exports = router;
